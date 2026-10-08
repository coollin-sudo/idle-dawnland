import { useState } from 'preact/hooks';
import { rich } from '../emoji';
import { DIFFICULTIES, stageLevel } from '@/core/formulas';
import { getMonster } from '@/data/monsters';
import { REGIONS } from '@/data/regions';
import { monsterThumb } from '@/render/icons';
import { travel } from '@/systems/activities';
import { g, refresh } from '../store';

export function MapPanel() {
  const gm = g();
  const p = gm.state.progress;
  const [diff, setDiff] = useState(p.difficulty);
  const [open, setOpen] = useState<number | null>(Math.floor(p.stage / 10));
  const best = p.best[diff];
  return (
    <div>
      <div class="diffs">
        {DIFFICULTIES.map(d => (
          <button class={'btn sm' + (diff === d.id ? ' primary' : '')} disabled={d.id > p.unlockedDifficulty} onClick={() => setDiff(d.id)} style={{ color: diff === d.id ? undefined : d.color }}>
            {rich(d.id > p.unlockedDifficulty ? '🔒 ' : '')}{d.name}
          </button>
        ))}
      </div>
      <div class="small muted" style={{ marginBottom: '10px' }}>
        {DIFFICULTIES[diff].name}難度：怪物等級 +{DIFFICULTIES[diff].lvOffset}、能力 ×{DIFFICULTIES[diff].mult}、掉寶 +{DIFFICULTIES[diff].dropBonus}%。每關 5 波，第 10 關是首領戰（限時 60 秒）。
      </div>
      <div class="regions">
        {REGIONS.map((r, ri) => {
          const first = ri * 10;
          const unlocked = first <= best + 1;
          const cleared = best >= first + 9;
          const boss = getMonster(r.boss);
          const lvl = `Lv.${stageLevel(diff, first)}–${stageLevel(diff, first + 9) + 1}`;
          return (
            <div class={'region' + (unlocked ? '' : ' locked')}>
              <div class="rh" style={{ background: `linear-gradient(90deg, ${r.bg.sky[0]}, ${r.bg.mid} 70%, ${r.bg.near})` }} onClick={() => unlocked && setOpen(open === ri ? null : ri)}>
                <img src={monsterThumb(boss, 48)} style={{ width: '44px', height: '44px' }} alt="" />
                <div class="grow">
                  <div class="rn">{ri + 1}. {r.name} {cleared && rich('✅')}</div>
                  <div class="rs">{r.subtitle}・{lvl}</div>
                </div>
                <span class="small" style={{ textShadow: '0 1px 3px #000' }}>{unlocked ? (open === ri ? '▲' : '▼') : rich('🔒')}</span>
              </div>
              {open === ri && unlocked && (
                <div class="stages">
                  {Array.from({ length: 10 }, (_, i) => {
                    const idx = first + i;
                    const isClear = idx <= best;
                    const isNext = idx === best + 1;
                    const here = p.difficulty === diff && p.stage === idx;
                    const locked = idx > best + 1;
                    return (
                      <div
                        class={'stg' + (isClear ? ' clear' : '') + (isNext ? ' next' : '') + (here ? ' here' : '') + (locked ? ' locked' : '') + (i === 9 ? ' boss' : '')}
                        title={`${ri + 1}-${i + 1}（Lv.${stageLevel(diff, idx)}）`}
                        onClick={() => { if (!locked) { travel(gm, idx, diff); refresh(); } }}
                      >
                        {i === 9 ? rich('👑') : i + 1}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
