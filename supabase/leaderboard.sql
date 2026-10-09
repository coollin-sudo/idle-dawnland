-- =====================================================================
-- 晨曦大陸 排行榜（Supabase / PostgreSQL）
-- 用法：Supabase 專案 → SQL Editor → 貼上整份執行。可以重複執行（會覆蓋函式）。
--
-- 安全設計：
-- - 兩張表都開啟 RLS 且不給任何直接讀寫權限，瀏覽器只能呼叫下面兩個函式。
-- - 玩家身分是存檔裡的一組隨機 token，伺服器只存它的 SHA-256。
-- - 伺服器檢查數值範圍、名稱長度、送出頻率；本週塔層的週次由伺服器決定。
-- - 網頁遊戲的數值都在玩家的瀏覽器裡，無法完全防止修改存檔作弊；
--   看到可疑紀錄可以把 lb_players.hidden 設成 true 隱藏。
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

alter table lb_players enable row level security;
alter table lb_scores enable row level security;
revoke all on lb_players, lb_scores from anon, authenticated;

-- 目前週次（台灣時間，週一開始）
create or replace function lb_week() returns text language sql stable as $$
  select to_char(now() at time zone 'Asia/Taipei', 'IYYY-"W"IW');
$$;

-- ---------------------------------------------------------------------
-- 送出成績
-- p_scores 例如：{"progress": 57, "power": 52310, "tower": 34, "boss": {"0:goblin_king": 8123}}
-- ---------------------------------------------------------------------
create or replace function lb_submit(
  p_token text, p_name text, p_class text, p_adv text, p_level int, p_rebirths int, p_scores jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
  v_player lb_players%rowtype;
  v_name text := left(btrim(coalesce(p_name, '')), 12);
  v_key text;
  v_val double precision;
begin
  if p_token is null or length(p_token) < 24 or length(p_token) > 128 then raise exception 'bad token'; end if;
  if v_name = '' then v_name := '無名的守護者'; end if;
  if p_class not in ('warrior', 'ranger', 'mage', 'cleric') then raise exception 'bad class'; end if;
  if p_adv is not null and p_adv not in ('berserker', 'paladin', 'marksman', 'assassin', 'elementalist', 'warlock', 'archbishop', 'inquisitor') then raise exception 'bad adv'; end if;
  if p_level < 1 or p_level > 120 or p_rebirths < 0 or p_rebirths > 100000 then raise exception 'bad level'; end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  select * into v_player from lb_players where token_hash = v_hash;
  if found and v_player.last_submit > now() - interval '30 seconds' then
    return jsonb_build_object('ok', false, 'reason', 'too_fast');
  end if;

  insert into lb_players (token_hash, name, class_id, adv_id, level, rebirths, last_submit)
  values (v_hash, v_name, p_class, p_adv, p_level, p_rebirths, now())
  on conflict (token_hash) do update set
    name = excluded.name, class_id = excluded.class_id, adv_id = excluded.adv_id,
    level = excluded.level, rebirths = excluded.rebirths, last_submit = now()
  returning * into v_player;

  -- 冒險進度：難度 × 80 + 關卡（0～239），越高越好
  if p_scores ? 'progress' then
    v_val := (p_scores->>'progress')::double precision;
    if v_val >= 0 and v_val <= 239 then
      insert into lb_scores (player_id, board, key, score) values (v_player.id, 'progress', 'all', v_val)
      on conflict (player_id, board, key) do update set score = excluded.score, achieved_at = now()
      where lb_scores.score < excluded.score;
    end if;
  end if;

  -- 戰力：取目前值（可升可降）
  if p_scores ? 'power' then
    v_val := (p_scores->>'power')::double precision;
    if v_val >= 0 and v_val < 1e12 then
      insert into lb_scores (player_id, board, key, score) values (v_player.id, 'power', 'all', v_val)
      on conflict (player_id, board, key) do update set score = excluded.score, achieved_at = now();
    end if;
  end if;

  -- 本週塔層：週次由伺服器決定
  if p_scores ? 'tower' then
    v_val := (p_scores->>'tower')::double precision;
    if v_val >= 1 and v_val <= 100000 then
      insert into lb_scores (player_id, board, key, score) values (v_player.id, 'tower', lb_week(), v_val)
      on conflict (player_id, board, key) do update set score = excluded.score, achieved_at = now()
      where lb_scores.score < excluded.score;
    end if;
  end if;

  -- 首領速通（毫秒，越低越好；只接受 1～60 秒）
  if jsonb_typeof(p_scores->'boss') = 'object' then
    for v_key, v_val in select key, value::text::double precision from jsonb_each(p_scores->'boss') loop
      if v_key ~ '^[0-2]:[a-z_]{2,20}$' and v_val >= 1000 and v_val <= 60000 then
        insert into lb_scores (player_id, board, key, score) values (v_player.id, 'boss', v_key, v_val)
        on conflict (player_id, board, key) do update set score = excluded.score, achieved_at = now()
        where lb_scores.score > excluded.score;
      end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- 讀取排行榜：前 p_limit 名，加上自己（有帶 token 時）的名次
-- p_key 留空時：progress/power 用 'all'，tower 用本週
-- ---------------------------------------------------------------------
create or replace function lb_board(
  p_board text, p_key text default null, p_class text default null, p_limit int default 50, p_token text default null
) returns table (pos bigint, name text, class_id text, adv_id text, level int, rebirths int, score double precision, achieved_at timestamptz, is_me boolean)
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
      (v_hash is not null and p.token_hash = v_hash) as me
    from lb_scores s join lb_players p on p.id = s.player_id
    where s.board = p_board and s.key = v_key and not p.hidden
      and (p_class is null or p.class_id = p_class)
  )
  select r.rnk, r.name, r.class_id, r.adv_id, r.level, r.rebirths, r.score, r.achieved_at, r.me
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

revoke all on function lb_submit, lb_board, lb_leave, lb_week from public;
grant execute on function lb_submit, lb_board, lb_leave to anon, authenticated;
