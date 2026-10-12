import type { GameState } from '@/core/types';
import { BOSS_MECHS } from '@/data/bossMechanics';
import { getMonster } from '@/data/monsters';
import { REGIONS } from '@/data/regions';
import { rich } from './emoji';

/** 某個區域首領的機制說明與提示（解法讓玩家自己摸索，不列出逐條教學） */
export function BossIntel({ bossId }: { bossId: string }) {
  const boss = getMonster(bossId);
  const mech = boss.mech ? BOSS_MECHS[boss.mech] : undefined;
  if (!mech) return null;
  return (
    <div class="boss-intel">
      <div class="bi-h">{rich('👑')} <b>{boss.name}</b>・<span class="gold">{mech.name}</span></div>
      <div class="small">{mech.desc}</div>
      <div class="small muted" style={{ marginTop: '4px' }}>{rich('💡')} {mech.hint}</div>
    </div>
  );
}

/** 目前難度下，下一個還沒打倒的區域首領 */
export function nextBossId(s: GameState): string | null {
  const p = s.progress;
  const z = Math.floor((p.best[p.difficulty] + 1) / 10);
  return REGIONS[z]?.boss ?? null;
}
