export interface DungeonDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  monsters: string[];
  durationMs: number;
  /** 擊殺獎勵倍率 */
  mods: { xp?: number; gold?: number; stones?: number; drop?: number };
  extra: 'gold' | 'stones' | 'xp';
  color: string;
}

export const DUNGEONS: DungeonDef[] = [
  { id: 'gold', name: '黃金洞窟', icon: '💰', desc: '滿是寶藏哥布林的洞窟，擊殺獲得大量金幣。', monsters: ['gold_goblin'], durationMs: 60_000, mods: { gold: 12, xp: 0.5, drop: 0.5 }, extra: 'gold', color: '#f0c85a' },
  { id: 'stones', name: '精煉礦脈', icon: '💎', desc: '晶石魔像出沒的礦脈，擊殺掉落強化石與精華。', monsters: ['crystal_golem'], durationMs: 60_000, mods: { gold: 1, xp: 0.5, stones: 12, drop: 0.5 }, extra: 'stones', color: '#7a9aff' },
  { id: 'xp', name: '試煉神殿', icon: '📘', desc: '光之靈的試煉，擊殺獲得大量經驗。', monsters: ['trial_spirit'], durationMs: 60_000, mods: { xp: 8, gold: 0.5, drop: 0.5 }, extra: 'xp', color: '#8affc8' },
];
export const DUNGEON_MAP = new Map(DUNGEONS.map(d => [d.id, d]));
export const DUNGEON_DAILY = 2;

export const TOWER_TIME_MS = 45_000;
export const TOWER_BOSSES = ['goblin_king', 'treant', 'troll', 'pharaoh', 'frost_dragon', 'balrog', 'storm_king', 'nox'];
export const towerLevel = (floor: number) => Math.round(6 + floor * 1.6);
export const towerHpMult = (floor: number) => 0.55 + floor * 0.012;
export const towerGems = (floor: number) => 3 + Math.floor(floor / 5);
