import type { Game } from '@/core/game';
import type { GameState, Item, SlotId } from '@/core/types';
import { SLOTS } from '@/data/items';
import { reqLevel } from './items';

/**
 * 兩套配裝（參考 Diablo II、Path of Exile 的武器切換 / Weapon Set）：
 * 例如一套主輸出、一套針對首領機制（冰抗、護盾、多段攻擊）。
 * 玩家隨時可以切換「想用哪一套」，但真正換裝發生在每一波戰鬥開始前，
 * 不能在戰鬥中途換裝來閃避機制。
 */
export const GEAR_NAMES = ['A', 'B'] as const;

/** 某一套配裝目前的內容（正在用的那套就是 state.equipment） */
export function gearOf(s: GameState, set: 0 | 1): Record<SlotId, Item | null> {
  return set === s.gear.active ? s.equipment : s.gear.alt;
}

/** 指定下一波要用哪一套 */
export function requestGear(g: Game, set: 0 | 1) {
  const s = g.state;
  if (s.gear.want === set) return;
  s.gear.want = set;
  g.touch();
  if (set !== s.gear.active) g.toast(`下一波戰鬥開始時換上配裝 ${GEAR_NAMES[set]}`, 'info', '🔁');
}

/** 每一波戰鬥開始前呼叫：如果玩家要求換裝，這時才真正換 */
export function applyGearSwap(g: Game): boolean {
  const s = g.state;
  if (s.gear.want === s.gear.active) return false;
  const cur = s.equipment;
  s.equipment = s.gear.alt;
  s.gear.alt = cur;
  s.gear.active = s.gear.want;
  g.heroChanged();
  g.toast(`已換上配裝 ${GEAR_NAMES[s.gear.active]}`, 'good', '🔁');
  return true;
}

/** 把背包裡的裝備穿到指定配裝（不是正在用的那套時，放進另一套，下次換裝才生效） */
export function equipToGear(g: Game, uid: number, set: 0 | 1, slot?: SlotId) {
  const s = g.state;
  const idx = s.inventory.findIndex(i => i.uid === uid);
  if (idx < 0) return;
  const it = s.inventory[idx];
  if ((it.slot === 'weapon' || it.slot === 'offhand') && it.classId !== s.hero.classId) return g.toast('職業不符', 'warn');
  if (s.hero.level < reqLevel(it)) return g.toast(`需要等級 ${reqLevel(it)}`, 'warn');
  const eq = gearOf(s, set);
  let target: SlotId;
  if (it.slot === 'ring') target = slot === 'ring1' || slot === 'ring2' ? slot : !eq.ring1 ? 'ring1' : !eq.ring2 ? 'ring2' : 'ring1';
  else target = it.slot as SlotId;
  s.inventory.splice(idx, 1);
  const old = eq[target];
  eq[target] = { ...it, isNew: false };
  if (old) s.inventory.push(old);
  if (set === s.gear.active) g.heroChanged(); else g.touch();
}

export function unequipFromGear(g: Game, set: 0 | 1, slot: SlotId) {
  const s = g.state;
  const eq = gearOf(s, set);
  const it = eq[slot];
  if (!it) return;
  eq[slot] = null;
  s.inventory.push(it);
  if (set === s.gear.active) g.heroChanged(); else g.touch();
}

/** 這套配裝穿了幾件 */
export function gearCount(s: GameState, set: 0 | 1) {
  const eq = gearOf(s, set);
  return SLOTS.filter(sl => eq[sl]).length;
}
