-- =====================================================================
-- 晨曦大陸 排行榜（Supabase / PostgreSQL）
-- 用法：Supabase 專案 → SQL Editor → 貼上整份執行。可以重複執行（會覆蓋函式）。
--
-- 安全設計：
-- - 兩張表都開啟 RLS 且不給任何直接讀寫權限，瀏覽器只能呼叫下面兩個函式。
-- - 玩家身分是存檔裡的一組隨機 token，伺服器只存它的 SHA-256。
-- - 伺服器檢查數值範圍、名稱長度、送出頻率；本週塔層的週次由伺服器決定。
-- - 防作弊（全自動，不需要人工審核；網頁遊戲無法百分之百防止，目標是讓作弊比正常玩更麻煩）：
--   1. 成長速度：用「伺服器時間」比對兩次上傳之間的等級、進度、戰力、本週塔層，
--      漲得比正常玩家快的部分自動壓回上限（被誤判的正常玩家之後會自然補上）。
--   2. 合理性：關卡比曾達到的最高等級高太多、戰力超過依等級與轉生次數的上限 → 這筆不採計，記一次違規；
--      首領速通必須是在不高於首領等級時打出來的。
--   3. 違規累積 3 次自動隱藏。每次上傳都記在 lb_history（想看可以 select * from lb_review;）。
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists lb_players (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  name text not null,
  class_id text not null,
  adv_id text,
  level int not null default 1,
  rebirths int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  last_submit timestamptz not null default 'epoch'
);

create table if not exists lb_scores (
  player_id uuid not null references lb_players(id) on delete cascade,
  board text not null,          -- progress / power / tower / boss
  key text not null,            -- progress、power：'all'；tower：週次 2026-W41；boss：'0:goblin_king'
  score double precision not null,
  extra jsonb not null default '{}',
  achieved_at timestamptz not null default now(),
  primary key (player_id, board, key)
);
create index if not exists lb_scores_board_idx on lb_scores (board, key, score);

alter table lb_players add column if not exists max_level int not null default 1;
alter table lb_players add column if not exists best_progress double precision not null default -1;
alter table lb_players add column if not exists best_power double precision not null default 0;
alter table lb_players add column if not exists tower_week text;
alter table lb_players add column if not exists tower_best int not null default 0;
alter table lb_players add column if not exists flag text;
alter table lb_players add column if not exists flagged_at timestamptz;
alter table lb_players add column if not exists strikes int not null default 0;
-- 舊版規則（標記就隱藏、等人工審核）改成自動處理：把舊規則隱藏的玩家放回來
update lb_players set hidden = false where hidden and flag is not null and strikes < 3;

-- 每次上傳的紀錄（稽核用）
create table if not exists lb_history (
  id bigserial primary key,
  player_id uuid not null references lb_players(id) on delete cascade,
  at timestamptz not null default now(),
  level int,
  max_level int,
  rebirths int,
  scores jsonb,
  verdict text
);
create index if not exists lb_history_player_idx on lb_history (player_id, at desc);
alter table lb_history enable row level security;
revoke all on lb_history from anon, authenticated;

alter table lb_players enable row level security;
alter table lb_scores enable row level security;
revoke all on lb_players, lb_scores from anon, authenticated;

-- 目前週次（台灣時間，週一開始）
create or replace function lb_week() returns text language sql stable as $$
  select to_char(now() at time zone 'Asia/Taipei', 'IYYY-"W"IW');
$$;

-- 進度值（難度 × 80 + 關卡）對應的關卡怪物等級
create or replace function lb_stage_level(p_eff double precision) returns int language sql immutable as $$
  select (p_eff::int % 80) + 1 + (array[0, 30, 60])[least(2, p_eff::int / 80) + 1];
$$;

-- 首領等級（'難度:首領 id'）；未知首領回傳 null
create or replace function lb_boss_level(p_key text) returns int language sql immutable as $$
  select (array[0, 30, 60])[split_part(p_key, ':', 1)::int + 1]
       + 10 * (array_position(array['goblin_king','treant','troll','pharaoh','frost_dragon','balrog','storm_king','nox'], split_part(p_key, ':', 2)) - 1)
       + 11;
$$;

-- ---------------------------------------------------------------------
-- 送出成績
-- p_scores 例如：{"progress": 57, "power": 52310, "tower": 34, "boss": {"0:troll": {"ms": 30500, "lv": 28}}}
-- 回傳 {"ok": true}；有成績被自動調整時多一個 "adjusted": true；因多次違規被隱藏時 "hidden": true
-- ---------------------------------------------------------------------
drop function if exists lb_submit(text, text, text, text, int, int, jsonb);
create or replace function lb_submit(
  p_token text, p_name text, p_class text, p_adv text, p_level int, p_rebirths int, p_scores jsonb, p_max_level int default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
  v_player lb_players%rowtype;
  v_new boolean := false;
  v_name text := left(btrim(coalesce(p_name, '')), 12);
  v_max int := greatest(coalesce(p_max_level, p_level), p_level);
  v_hours double precision;
  v_flags text[] := '{}';
  v_key text;
  v_val double precision;
  v_lv int;
  v_entry jsonb;
  v_progress double precision := (p_scores->>'progress')::double precision;
  v_power double precision := (p_scores->>'power')::double precision;
  v_tower double precision := (p_scores->>'tower')::double precision;
  v_week text := lb_week();
  v_strike boolean := false;
begin
  if p_token is null or length(p_token) < 24 or length(p_token) > 128 then raise exception 'bad token'; end if;
  if v_name = '' then v_name := '無名的守護者'; end if;
  if p_class not in ('warrior', 'ranger', 'mage', 'cleric') then raise exception 'bad class'; end if;
  if p_adv is not null and p_adv not in ('berserker', 'paladin', 'marksman', 'assassin', 'elementalist', 'warlock', 'archbishop', 'inquisitor') then raise exception 'bad adv'; end if;
  if p_level < 1 or p_level > 120 or v_max > 120 or p_rebirths < 0 or p_rebirths > 100000 then raise exception 'bad level'; end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  select * into v_player from lb_players where token_hash = v_hash;
  if found then
    if v_player.last_submit > now() - interval '30 seconds' then
      return jsonb_build_object('ok', false, 'reason', 'too_fast');
    end if;
    v_hours := extract(epoch from now() - v_player.last_submit) / 3600.0;
  else
    v_new := true;
  end if;

  -- 1. 成長速度：跟上一次上傳比（伺服器時間），超過正常玩家可能的漲幅就「壓回上限」，不採計多出來的部分
  if not v_new then
    if v_max > v_player.max_level + 30 * v_hours + 5 then
      v_max := greatest(p_level, floor(v_player.max_level + 30 * v_hours + 5)::int); v_flags := array_append(v_flags, 'level_speed');
    end if;
    if v_progress is not null and v_progress > v_player.best_progress + 30 * v_hours + 5 then
      v_progress := floor(v_player.best_progress + 30 * v_hours + 5); v_flags := array_append(v_flags, 'progress_speed');
    end if;
    if v_power is not null and v_player.best_power > 0 and v_power > v_player.best_power * (2 + 3 * v_hours) + 2000 then
      v_power := floor(v_player.best_power * (2 + 3 * v_hours) + 2000); v_flags := array_append(v_flags, 'power_speed');
    end if;
    if v_tower is not null and v_tower > (case when v_player.tower_week = v_week then v_player.tower_best else 0 end) + 120 * v_hours + 10 then
      v_tower := floor((case when v_player.tower_week = v_week then v_player.tower_best else 0 end) + 120 * v_hours + 10); v_flags := array_append(v_flags, 'tower_speed');
    end if;
  end if;

  -- 2. 合理性：不可能的數值直接不採計，並記一次違規
  if v_progress is not null and lb_stage_level(v_progress) > v_max + 6 then
    v_progress := null; v_strike := true; v_flags := array_append(v_flags, 'progress_vs_level');
  end if;
  if v_power is not null and v_power > (10000 + 3000 * v_max) * (1 + sqrt(p_rebirths)) then
    v_power := null; v_strike := true; v_flags := array_append(v_flags, 'power_cap');
  end if;

  insert into lb_players (token_hash, name, class_id, adv_id, level, rebirths, last_submit)
  values (v_hash, v_name, p_class, p_adv, p_level, p_rebirths, now())
  on conflict (token_hash) do update set
    name = excluded.name, class_id = excluded.class_id, adv_id = excluded.adv_id,
    level = excluded.level, rebirths = excluded.rebirths, last_submit = now()
  returning * into v_player;

  -- 3. 連續 3 次送出不可能的數值：明顯在改存檔，自動隱藏
  update lb_players set
    max_level = greatest(max_level, v_max),
    best_progress = greatest(best_progress, coalesce(v_progress, -1)),
    best_power = greatest(best_power, coalesce(v_power, 0)),
    tower_best = case when tower_week = v_week then greatest(tower_best, coalesce(v_tower, 0)::int) else coalesce(v_tower, 0)::int end,
    tower_week = v_week,
    strikes = case when v_strike then strikes + 1 else strikes end,
    hidden = hidden or (v_strike and strikes + 1 >= 3),
    flag = case when cardinality(v_flags) > 0 then array_to_string(v_flags, ',') else flag end,
    flagged_at = case when cardinality(v_flags) > 0 then now() else flagged_at end
  where id = v_player.id
  returning * into v_player;

  insert into lb_history (player_id, level, max_level, rebirths, scores, verdict)
  values (v_player.id, p_level, v_max, p_rebirths, p_scores, nullif(array_to_string(v_flags, ','), ''));

  -- 冒險進度：只會往上
  if v_progress is not null and v_progress >= 0 and v_progress <= 239 then
    insert into lb_scores (player_id, board, key, score) values (v_player.id, 'progress', 'all', v_progress)
    on conflict (player_id, board, key) do update set score = excluded.score, achieved_at = now()
    where lb_scores.score < excluded.score;
  end if;

  -- 戰力：取目前值
  if v_power is not null and v_power >= 0 and v_power < 1e12 then
    insert into lb_scores (player_id, board, key, score) values (v_player.id, 'power', 'all', v_power)
    on conflict (player_id, board, key) do update set score = excluded.score, achieved_at = now();
  end if;

  -- 本週塔層：週次由伺服器決定
  if v_tower is not null and v_tower >= 1 and v_tower <= 100000 then
    insert into lb_scores (player_id, board, key, score) values (v_player.id, 'tower', v_week, v_tower)
    on conflict (player_id, board, key) do update set score = excluded.score, achieved_at = now()
    where lb_scores.score < excluded.score;
  end if;

  -- 首領速通（毫秒，越低越好）：必須是在不高於首領等級時打出來的
  if jsonb_typeof(p_scores->'boss') = 'object' then
    for v_key, v_entry in select key, value from jsonb_each(p_scores->'boss') loop
      if v_key !~ '^[0-2]:[a-z_]{2,20}$' or lb_boss_level(v_key) is null then continue; end if;
      if jsonb_typeof(v_entry) = 'object' then
        v_val := (v_entry->>'ms')::double precision;
        v_lv := (v_entry->>'lv')::int;
      else
        v_val := v_entry::text::double precision;
        v_lv := p_level; -- 舊版只送秒數：用目前等級檢查
      end if;
      if v_val is null or v_val < 2000 or v_val > 60000 then continue; end if;
      if v_lv is null or v_lv > lb_boss_level(v_key) or v_lv > v_max then continue; end if;
      insert into lb_scores (player_id, board, key, score, extra) values (v_player.id, 'boss', v_key, v_val, jsonb_build_object('lv', v_lv))
      on conflict (player_id, board, key) do update set score = excluded.score, extra = excluded.extra, achieved_at = now()
      where lb_scores.score > excluded.score;
    end loop;
  end if;

  if v_player.hidden then return jsonb_build_object('ok', true, 'hidden', true); end if;
  if cardinality(v_flags) > 0 then return jsonb_build_object('ok', true, 'adjusted', true); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- 讀取排行榜：前 p_limit 名，加上自己（有帶 token 時）的名次
-- p_key 留空時：progress/power 用 'all'，tower 用本週
-- ---------------------------------------------------------------------
drop function if exists lb_board(text, text, text, int, text);
create or replace function lb_board(
  p_board text, p_key text default null, p_class text default null, p_limit int default 50, p_token text default null
) returns table (pos bigint, name text, class_id text, adv_id text, level int, rebirths int, score double precision, achieved_at timestamptz, is_me boolean, under_review boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_key text := coalesce(nullif(p_key, ''), case when p_board = 'tower' then lb_week() else 'all' end);
  v_hash text := case when p_token is null then null else encode(digest(p_token, 'sha256'), 'hex') end;
  v_asc boolean := p_board = 'boss';
begin
  if p_board not in ('progress', 'power', 'tower', 'boss') then raise exception 'bad board'; end if;
  return query
  with ranked as (
    select
      case when v_asc then rank() over (order by s.score asc, s.achieved_at asc)
           else rank() over (order by s.score desc, s.achieved_at asc) end as rnk,
      p.name, p.class_id, p.adv_id, p.level, p.rebirths, s.score, s.achieved_at,
      (v_hash is not null and p.token_hash = v_hash) as me,
      p.hidden as rev
    from lb_scores s join lb_players p on p.id = s.player_id
    where s.board = p_board and s.key = v_key
      and (not p.hidden or (v_hash is not null and p.token_hash = v_hash))
      and (p_class is null or p.class_id = p_class)
  )
  select r.rnk, r.name, r.class_id, r.adv_id, r.level, r.rebirths, r.score, r.achieved_at, r.me, r.rev
  from ranked r
  where r.rnk <= least(greatest(p_limit, 1), 100) or r.me
  order by r.rnk
  limit least(greatest(p_limit, 1), 100) + 1;
end $$;

-- 改名或刪除自己的紀錄（退出排行榜）
create or replace function lb_leave(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from lb_players where token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

-- 審核用（只有你在 Supabase 後台看得到，瀏覽器讀不到）
drop view if exists lb_review;
create view lb_review as
  select p.name, p.class_id, p.level, p.max_level, p.rebirths, p.strikes, p.flag, p.flagged_at, p.hidden,
         (select jsonb_agg(h order by h.at desc) from (select at, level, max_level, scores, verdict from lb_history where player_id = p.id order by at desc limit 10) h) as recent
  from lb_players p
  where p.flag is not null or p.hidden
  order by p.flagged_at desc nulls last;
revoke all on lb_review from anon, authenticated;

revoke all on function lb_submit, lb_board, lb_leave, lb_week, lb_stage_level, lb_boss_level from public;
grant execute on function lb_submit, lb_board, lb_leave to anon, authenticated;
