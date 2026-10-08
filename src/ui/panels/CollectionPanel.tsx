import { useState } from 'preact/hooks';
import { rich } from '../emoji';
import { fmt, fmtDuration } from '@/core/format';
import { ShareCardButton } from '../ShareCard';
import { describeMod } from '@/core/stats';
import { ACHIEVEMENTS, ACHIEVEMENT_GEMS, CODEX_BONUS_PER_TIER, CODEX_TIERS } from '@/data/meta';
import { MONSTERS } from '@/data/monsters';
import { UNIQUES } from '@/data/items';
import { describePower } from '@/data/powers';
import { CLASSES } from '@/data/classes';
import { itemIcon, monsterThumb } from '@/render/icons';
import { codexTiers } from '@/systems/hero';
import { g } from '../store';
import { NpcHeader, SkillIcon } from '../common';
import { getSkill } from '@/data/skills';

type Sub = 'ach' | 'codex' | 'legend' | 'records';

export function CollectionPanel() {
  const [sub, setSub] = useState<Sub>('ach');
  return (
    <div>
      <NpcHeader npc="mila" lines={['每種怪物打倒得夠多，我就能分析出牠們的弱點。', '傳說裝備都有自己的故事，你收集了幾件呢？', '成就帶來的加成是永久的，轉生也不會消失。']} />
      <div class="subtabs">
        {([['ach', '🏆 成就'], ['codex', '📖 怪物圖鑑'], ['legend', '🌟 傳說收藏'], ['records', '📊 紀錄']] as [Sub, string][]).map(([id, n]) => (
          <button class={'btn sm' + (sub === id ? ' primary' : '')} onClick={() => setSub(id)}>{rich(n)}</button>
        ))}
      </div>
      {sub === 'ach' ? <Achievements /> : sub === 'codex' ? <Codex /> : sub === 'legend' ? <Legends /> : <Records />}
    </div>
  );
}

function Achievements() {
  const s = g().state;
  const done = Object.values(s.achievements).reduce((a, b) => a + b, 0);
  return (
    <>
      <div class="small muted" style={{ marginBottom: '10px' }}>已達成 {done}/{ACHIEVEMENTS.length * 5} 階。每一階都會給永久加成與寶石。</div>
      <div class="ach">
        {ACHIEVEMENTS.map(a => {
          const tier = s.achievements[a.id] ?? 0;
          const v = s.counters[a.counter] ?? 0;
          const next = a.tiers[tier];
          return (
            <div class="a">
              <div class="row"><span style={{ fontSize: '20px' }}>{rich(a.icon)}</span><b>{a.name}</b></div>
              <div class="tiers">{a.tiers.map((_, i) => <i class={i < tier ? 'on' : ''} />)}</div>
              <div class="tiny">{next !== undefined ? `${a.desc(next)}（${fmt(v)}/${fmt(next)}）` : '已全部達成！'}</div>
              <div class="tiny" style={{ color: '#9ad0ff' }}>每階 {describeMod(a.reward, 1)}{tier ? `（目前 ${describeMod({ ...a.reward, value: a.reward.value * tier }, 1)}）` : ''}</div>
              {next !== undefined && <div class="tiny dim">下一階寶石 +{ACHIEVEMENT_GEMS[tier]}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Codex() {
  const s = g().state;
  const tiers = codexTiers(s);
  return (
    <>
      <div class="small muted" style={{ marginBottom: '10px' }}>
        每種怪物擊殺 {CODEX_TIERS.join(' / ')} 隻會點亮一顆星：對該怪物傷害 +2%，且每顆星讓全傷害與生命 +{CODEX_BONUS_PER_TIER}%。目前 {tiers} 顆星（全傷害與生命 +{(tiers * CODEX_BONUS_PER_TIER).toFixed(1)}%）。
      </div>
      <div class="codex">
        {MONSTERS.map(m => {
          const n = s.codex[m.id] ?? 0;
          const stars = CODEX_TIERS.filter(t => n >= t).length;
          return (
            <div class={'m' + (n ? '' : ' unknown')} title={n ? m.lore : '尚未遭遇'}>
              <img src={monsterThumb(m, 64)} alt="" />
              <div class="nm">{n ? m.name : '？？？'}</div>
              <div class="stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
              <div class="tiny muted">{fmt(n)}</div>
              {n > 0 && m.skills && m.skills.length > 0 && (
                <div class="msk">{m.skills.map(id => <span title={getSkill(id).name + '：' + getSkill(id).desc}><SkillIcon def={getSkill(id)} size={18} /></span>)}</div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Legends() {
  const s = g().state;
  return (
    <>
      <div class="small muted" style={{ marginBottom: '10px' }}>已發現 {s.uniquesFound.length}/{UNIQUES.length} 件傳說裝備。</div>
      <div class="list">
        {UNIQUES.map(u => {
          const found = s.uniquesFound.includes(u.id);
          return (
            <div class="li" style={{ opacity: found ? 1 : 0.45 }}>
              <div class="ic"><img src={itemIcon(u.slot, u.classId, Math.min(12, Math.floor(u.minIlvl / 10) + 2), u.id)} alt="" style={{ filter: found ? 'none' : 'brightness(0) opacity(.5)' }} /></div>
              <div class="grow">
                <div class="t" style={{ color: found ? 'var(--r4)' : undefined }}>{found ? u.name : '？？？'}{u.classId && <span class="tiny muted">（{CLASSES[u.classId].name}）</span>}</div>
                <div class="d">{found ? describePower(u.power.id, u.power.value) : `物品等級 ${u.minIlvl} 以上可能掉落`}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Records() {
  const s = g().state;
  const c = s.counters;
  const rows: [string, string][] = [
    ['遊玩時間', fmtDuration(s.playMs)],
    ['擊殺怪物', fmt(c.kills ?? 0)],
    ['擊殺精英', fmt(c.eliteKills ?? 0)],
    ['擊敗首領', fmt(c.bossKills ?? 0)],
    ['打倒寶藏哥布林', fmt(c.goblins ?? 0)],
    ['倒下次數', fmt(c.deaths ?? 0)],
    ['最高單次傷害', fmt(c.maxHit ?? 0)],
    ['暴擊次數', fmt(c.crits ?? 0)],
    ['施放技能', fmt(c.skillsCast ?? 0)],
    ['累積金幣', fmt(c.goldEarned ?? 0)],
    ['累積經驗', fmt(c.xpEarned ?? 0)],
    ['獲得裝備', fmt(c.itemsFound ?? 0)],
    ['傳說以上裝備', fmt(c.legendaries ?? 0)],
    ['分解裝備', fmt(c.salvaged ?? 0)],
    ['強化次數', fmt(c.enhanceTries ?? 0)],
    ['最高強化', '+' + (c.enhanceMax ?? 0)],
    ['通關關卡', fmt(c.stagesCleared ?? 0)],
    ['每日副本', fmt(c.dungeonRuns ?? 0)],
    ['無盡之塔最高', `${s.tower.best} 層`],
    ['孵化寵物', fmt(c.petsHatched ?? 0)],
    ['轉生次數', fmt(s.rebirth.count)],
    ['完成任務', fmt((c.questsDone ?? 0) + (c.dailiesDone ?? 0))],
  ];
  return (
    <>
      <div class="statgrid">{rows.map(([k, v]) => <div class="s"><span>{k}</span><b>{v}</b></div>)}</div>
      <div style={{ marginTop: '14px' }}><ShareCardButton /></div>
    </>
  );
}
