import type { Game } from '@/core/game';
import { EGGS, PET_MAP, PET_MAX_LEVEL, PET_MAX_STARS, PETS, petStarCost, petXpToNext } from '@/data/pets';
import { GEM_SHOP } from '@/data/shop';

export function hatchingCount(g: Game) {
  return g.state.pets.eggs.filter(e => e.readyAt !== null).length;
}

export function startHatch(g: Game, uid: number) {
  const s = g.state;
  const egg = s.pets.eggs.find(e => e.uid === uid);
  if (!egg || egg.readyAt !== null) return;
  if (hatchingCount(g) >= s.pets.slots) return g.toast('孵化槽已滿', 'warn');
  egg.readyAt = g.now() + EGGS[egg.tier].hatchMs;
  g.touch();
}

export function speedHatch(g: Game, uid: number) {
  const egg = g.state.pets.eggs.find(e => e.uid === uid);
  if (!egg || egg.readyAt === null) return;
  const left = egg.readyAt - g.now();
  const gems = Math.max(1, Math.ceil(left / 60_000 / 3));
  if (g.state.cur.gems < gems) return g.toast('寶石不足', 'warn');
  g.state.cur.gems -= gems;
  egg.readyAt = g.now();
  g.touch();
}

export function hatchCost(g: Game, uid: number) {
  const egg = g.state.pets.eggs.find(e => e.uid === uid);
  if (!egg || egg.readyAt === null) return 0;
  return Math.max(1, Math.ceil((egg.readyAt - g.now()) / 60_000 / 3));
}

export function claimEgg(g: Game, uid: number) {
  const s = g.state;
  const egg = s.pets.eggs.find(e => e.uid === uid);
  if (!egg || egg.readyAt === null || egg.readyAt > g.now()) return;
  s.pets.eggs.splice(s.pets.eggs.indexOf(egg), 1);
  const rarity = g.rng.weightedIndex(EGGS[egg.tier].weights);
  const pool = PETS.filter(p => p.rarity === rarity);
  const def = g.rng.pick(pool.length ? pool : PETS);
  const owned = s.pets.owned[def.id];
  if (owned) {
    owned.dupes++;
    g.toast(`孵出 ${def.name}（重複，可用來升星）`, 'good', '🐣');
  } else {
    s.pets.owned[def.id] = { id: def.id, level: 1, xp: 0, stars: 0, dupes: 0 };
    if (!s.pets.active) { s.pets.active = def.id; g.petChanged(); }
    g.toast(`孵出新寵物：${def.name}！`, def.rarity >= 3 ? 'legend' : 'epic', '🐣');
  }
  g.count('petsHatched');
  g.ev.emit('pet:hatch', { petId: def.id, isNew: !owned });
  g.heroChanged();
}

export function setActivePet(g: Game, id: string | null) {
  if (id && !g.state.pets.owned[id]) return;
  g.state.pets.active = id;
  g.heroChanged();
  g.petChanged();
}

export function petLevelUps(g: Game, id: string) {
  const ps = g.state.pets.owned[id];
  if (!ps) return;
  let ups = 0;
  while (ps.level < PET_MAX_LEVEL && ps.xp >= petXpToNext(ps.level)) {
    ps.xp -= petXpToNext(ps.level);
    ps.level++;
    ups++;
  }
  if (ps.level >= PET_MAX_LEVEL) ps.xp = 0;
  if (ups) { g.toast(`${PET_MAP.get(id)!.name} 升到 ${ps.level} 級`, 'good', '🐾'); g.heroChanged(); }
}

export const FOOD_XP = 60;
export function feedPet(g: Game, id: string, n: number) {
  const ps = g.state.pets.owned[id];
  if (!ps) return;
  n = Math.min(n, g.state.cur.petFood);
  if (n <= 0) return g.toast('寵物飼料不足', 'warn');
  if (ps.level >= PET_MAX_LEVEL) return g.toast('已達等級上限', 'warn');
  g.state.cur.petFood -= n;
  ps.xp += n * FOOD_XP * (1 + ps.level / 8);
  g.count('petFeeds');
  petLevelUps(g, id);
  g.touch();
}

export function starUp(g: Game, id: string) {
  const ps = g.state.pets.owned[id];
  if (!ps) return;
  if (ps.stars >= PET_MAX_STARS) return g.toast('已達星級上限', 'warn');
  const cost = petStarCost(ps.stars);
  if (ps.dupes < cost) return g.toast(`需要 ${cost} 隻重複寵物`, 'warn');
  ps.dupes -= cost;
  ps.stars++;
  g.toast(`${PET_MAP.get(id)!.name} 升到 ${ps.stars} 星！`, 'epic', '⭐');
  g.heroChanged();
}

export function buyEgg(g: Game, tier: 0 | 1 | 2) {
  const cost = GEM_SHOP.eggs[tier].gems;
  if (g.state.cur.gems < cost) return g.toast('寶石不足', 'warn');
  if (g.state.pets.eggs.length >= 30) return g.toast('蛋太多了，先孵一些吧', 'warn');
  g.state.cur.gems -= cost;
  g.state.pets.eggs.push({ uid: g.nextUid(), tier, readyAt: null });
  g.touch();
}

export function buyHatchSlot(g: Game) {
  const s = g.state;
  if (s.pets.slots >= GEM_SHOP.petSlot.max) return;
  if (s.cur.gems < GEM_SHOP.petSlot.gems) return g.toast('寶石不足', 'warn');
  s.cur.gems -= GEM_SHOP.petSlot.gems;
  s.pets.slots++;
  g.touch();
}

/** 擊殺給的寵物經驗累積後檢查升級（低頻呼叫） */
export function checkPetLevels(g: Game) {
  const id = g.state.pets.active;
  if (id) petLevelUps(g, id);
}
