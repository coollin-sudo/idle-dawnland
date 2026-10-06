import { useState } from 'preact/hooks';
import { fmt } from '@/core/format';
import { describeMod } from '@/core/stats';
import { ACHIEVEMENTS, ACHIEVEMENT_GEMS, CODEX_BONUS_PER_TIER, CODEX_TIERS } from '@/data/meta';
import { MONSTERS } from '@/data/monsters';
import { UNIQUES } from '@/data/items';
import { describePower } from '@/data/powers';
import { CLASSES } from '@/data/classes';
import { creaturePortrait, itemIcon } from '@/render/icons';
import { codexTiers } from '@/systems/hero';
import { g } from '../store';

type Sub = 'ach' | 'codex' | 'legend';

export function CollectionPanel() {
  const [sub, setSub] = useState<Sub>('ach');
  return (
    <div>
      <div class="subtabs">
        {([['ach', '🏆 成就'], ['codex', '📖 怪物圖鑑'], ['legend', '🌟 傳說收藏']] as [Sub, string][]).map(([id, n]) => (
          <button class={'btn sm' + (sub === id ? ' primary' : '')} onClick={() => setSub(id)}>{n}</button>
        ))}
      </div>
      {sub === 'ach' ? <Achievements /> : sub === 'codex' ? <Codex /> : <Legends />}
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
              <div class="row"><span style={{ fontSize: '20px' }}>{a.icon}</span><b>{a.name}</b></div>
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
              <img src={creaturePortrait(m.archetype, m.palette, m.features, 64)} alt="" />
              <div class="nm">{n ? m.name : '？？？'}</div>
              <div class="stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
              <div class="tiny muted">{fmt(n)}</div>
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
              <div class="ic"><img src={itemIcon(u.slot, u.classId, Math.min(12, Math.floor(u.minIlvl / 10) + 2))} alt="" style={{ filter: found ? 'none' : 'brightness(0) opacity(.5)' }} /></div>
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
