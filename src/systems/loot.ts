import type { Game } from '@/core/game';
import { jewelDrop, returnJewels } from './jewels';
import { DIFFICULTIES, mobGold, mobXp, sellPrice } from '@/core/formulas';
import type { Item, Rarity } from '@/core/types';
import type { Unit } from '@/core/unit';
import { ELITE_REWARD } from '@/data/elites';
import { RARITIES } from '@/data/items';
import { STAR_NODES } from '@/data/meta';
import { heroStats, upgradeDelta } from './hero';
import { canEquip, generateItem, pickSet, rollRarity, itemDisplayName } from './items';
import { gainXp } from './progression';

export interface KillMods {
  xp?: number;
  gold?: number;
  drop?: number;
  stones?: number;
  noItems?: boolean;
}

const BOSS_REWARD = 15;

export function itemCtx(g: Game) {
  return { rng: g.rng, nextUid: g.nextUid, classId: g.state.hero.classId };
}

/** 一般擊殺獎勵：經驗、金幣、裝備、材料、圖鑑 */
export function rewardKill(g: Game, u: Unit, killer: Unit | null, m: KillMods = {}) {
  const s = g.state;
  const st = g.battle.hero?.stats ?? heroStats(s);
  const L = u.level;
  const diff = s.progress.difficulty;
  const tier = u.boss ? BOSS_REWARD : u.elite.length ? ELITE_REWARD : 1;
  const diffMult = 1 + diff * 0.6;

  const xp = mobXp(L) * tier * diffMult * (1 + st.xpGain / 100) * (m.xp ?? 1);
  let gold = mobGold(L) * tier * diffMult * (1 + st.goldFind / 100) * (m.gold ?? 1) * g.rng.float(0.85, 1.15);
  if (killer?.powers.goldTouch && g.rng.chance(killer.powers.goldTouch / 100)) gold *= 2;
  gold = Math.round(gold);

  gainXp(g, xp);
  g.count('xpEarned', xp);
  s.cur.gold += gold;
  g.count('goldEarned', gold);
  g.ev.emit('loot:gold', { amount: gold, unit: u });
  g.count('kills');
  if (u.elite.length) g.count('eliteKills');
  if (u.boss) g.count('bossKills');
  s.codex[u.defId] = (s.codex[u.defId] ?? 0) + 1;
  if (!m.noItems) jewelDrop(g, u);
  petXpFromKill(g, L, tier);

  // 材料
  const stoneChance = u.boss ? 1 : u.elite.length ? 0.2 : 0.02;
  if (g.rng.chance(stoneChance * (m.stones ?? 1))) {
    const n = u.boss ? g.rng.int(1, 3) + diff * 2 : 1;
    s.cur.stones += n;
    g.ev.emit('loot:currency', { key: 'stones', amount: n, unit: u });
  }
  if (u.boss || (u.elite.length && g.rng.chance(0.15))) {
    const n = u.boss ? g.rng.int(2, 5) : 1;
    s.cur.petFood += n;
    g.ev.emit('loot:currency', { key: 'petFood', amount: n, unit: u });
  }
  if (u.boss && s.progress.best[0] >= 19 && g.rng.chance(0.08 + diff * 0.04)) {
    addEgg(g, diff >= 2 ? 2 : diff >= 1 || L >= 50 ? 1 : 0);
  }

  if (m.noItems) return;
  // 裝備
  const mf = st.magicFind + DIFFICULTIES[diff].dropBonus;
  const dropChance = (u.boss ? 1 : u.elite.length ? 0.5 : 0.055) * (m.drop ?? 1);
  let drops = g.rng.chance(Math.min(1, dropChance)) ? 1 : 0;
  if (u.boss && g.rng.chance(0.5)) drops++;
  for (let i = 0; i < drops; i++) {
    const source = u.boss ? 'boss' : u.elite.length ? 'elite' : 'normal';
    const rarity = rollRarity(g.rng, source, mf, diff);
    const ilvl = L + (u.boss ? 2 : g.rng.int(-1, 1));
    const setDrop = u.boss && L >= 35 && g.rng.chance(0.04 + diff * 0.03);
    const item = generateItem(itemCtx(g), { ilvl, rarity, setId: setDrop ? pickSet(g.rng, s.hero.classId).id : undefined });
    receiveItem(g, item);
  }
}

function petXpFromKill(g: Game, L: number, tier: number) {
  const id = g.state.pets.active;
  if (!id) return;
  const ps = g.state.pets.owned[id];
  if (!ps) return;
  ps.xp += Math.max(1, Math.floor(L / 6)) * Math.min(tier, 5);
}

export function addEgg(g: Game, tier: 0 | 1 | 2) {
  if (g.state.pets.eggs.length >= 30) return;
  g.state.pets.eggs.push({ uid: g.nextUid(), tier, readyAt: null });
  g.toast(['獲得普通寵物蛋', '獲得稀有寵物蛋', '獲得傳說寵物蛋'][tier], 'epic', '🥚');
}

// ---------------------------------------------------------------------
// 裝備入袋規則
// ---------------------------------------------------------------------
export function invCapacity(g: Game) {
  const bag = STAR_NODES.find(n => n.special === 'inventory')!;
  return g.state.invCapacity + (g.state.rebirth.ranks[bag.id] ?? 0) * (bag.per ?? 0);
}

/** 換裝時把舊裝備上的魔晶搬到新裝備的空孔；鑲不下的留在舊裝備上 */
function moveJewels(from: Item, to: Item) {
  if (!from.sockets?.some(Boolean) || !to.sockets?.includes(null)) return;
  to.sockets = [...to.sockets];
  from.sockets = [...from.sockets];
  for (let i = 0; i < from.sockets.length; i++) {
    const k = from.sockets[i];
    const j = to.sockets.indexOf(null);
    if (!k || j < 0) continue;
    to.sockets[j] = k;
    from.sockets[i] = null;
  }
}

export function receiveItem(g: Game, item: Item): 'kept' | 'salvaged' | 'equipped' {
  const s = g.state;
  g.count('itemsFound');
  if (item.rarity >= 4) {
    g.count('legendaries');
    if (item.unique && !s.uniquesFound.includes(item.unique)) s.uniquesFound.push(item.unique);
    g.toast(`${RARITIES[item.rarity].name}！${item.name}`, 'legend', '🌟');
  } else if (item.set) {
    g.toast(`套裝！${item.name}`, 'epic', '🟢');
  }

  const equipable = canEquip(item, s.hero.classId, s.hero.level);
  let delta = 0;
  if (equipable && (s.settings.autoEquip || s.settings.keepUpgrades)) delta = upgradeDelta(s, item).delta;

  const special = (it: Item) => it.rarity >= 4 || !!it.set;
  const allowSpecial = s.settings.autoEquipSpecial;
  const target = equipable && s.settings.autoEquip && delta > 0 ? upgradeDelta(s, item).slot : null;
  const current = target ? s.equipment[target] : null;
  if (target && (allowSpecial || (!special(item) && !(current && special(current))))) {
    const slot = target;
    const old = s.equipment[slot];
    const next: Item = { ...item, isNew: false };
    if (old) moveJewels(old, next);
    s.equipment[slot] = next;
    g.heroChanged();
    g.ev.emit('loot:item', { item, auto: 'kept' });
    g.log(`自動裝備 ${itemDisplayName(item)}`, 'good');
    if (old) receiveItem(g, { ...old, isNew: false });
    return 'equipped';
  }

  const protectedItem = special(item) || (s.settings.keepUpgrades && delta > 0);
  if (!protectedItem && item.rarity <= s.settings.autoSalvage) {
    salvageOne(g, item);
    g.ev.emit('loot:item', { item, auto: 'salvaged' });
    return 'salvaged';
  }
  if (s.inventory.length >= invCapacity(g)) {
    // 背包滿了：分解背包裡最差的非保護裝備，騰出位子
    const worst = s.inventory
      .filter(i => !i.locked && i.rarity < 4 && !i.set)
      .sort((a, b) => a.rarity - b.rarity || a.ilvl - b.ilvl)[0];
    if (worst && (worst.rarity < item.rarity || (worst.rarity === item.rarity && worst.ilvl < item.ilvl))) {
      s.inventory.splice(s.inventory.indexOf(worst), 1);
      salvageOne(g, worst);
    } else {
      salvageOne(g, item);
      g.ev.emit('loot:item', { item, auto: 'salvaged' });
      return 'salvaged';
    }
  }
  s.inventory.push(item);
  if (item.rarity >= 2) g.log(`獲得 ${RARITIES[item.rarity].name}・${itemDisplayName(item)}`, ['', '', 'epic', 'epic', 'legend', 'legend'][item.rarity]);
  g.ev.emit('loot:item', { item, auto: 'kept' });
  g.touch();
  return 'kept';
}

// ---------------------------------------------------------------------
// 分解與販售
// ---------------------------------------------------------------------
export function salvageValue(it: Item) {
  const r = it.rarity;
  const essence = Math.round([1, 3, 8, 20, 45, 100][r] * (1 + it.ilvl / 25));
  const stones = (r >= 3 ? r - 2 : 0) + Math.floor(it.enh * 0.5);
  const shards = r >= 5 ? 15 : r >= 4 ? 5 : 0;
  return { essence, stones, shards };
}

function salvageOne(g: Game, it: Item) {
  returnJewels(g, it);
  const v = salvageValue(it);
  g.state.cur.essence += v.essence;
  g.state.cur.stones += v.stones;
  g.state.cur.shards += v.shards;
  g.count('salvaged');
}

export function salvageItems(g: Game, uids: number[]) {
  const s = g.state;
  let n = 0;
  const total = { essence: 0, stones: 0, shards: 0 };
  s.inventory = s.inventory.filter(it => {
    if (!uids.includes(it.uid) || it.locked) return true;
    const v = salvageValue(it);
    total.essence += v.essence; total.stones += v.stones; total.shards += v.shards;
    salvageOne(g, it);
    n++;
    return false;
  });
  if (n) g.toast(`分解 ${n} 件：精華 +${total.essence}${total.stones ? `、強化石 +${total.stones}` : ''}${total.shards ? `、傳說碎片 +${total.shards}` : ''}`, 'good', '♻️');
  g.touch();
}

export function sellItems(g: Game, uids: number[]) {
  const s = g.state;
  let gold = 0, n = 0;
  s.inventory = s.inventory.filter(it => {
    if (!uids.includes(it.uid) || it.locked) return true;
    gold += sellPrice(it.ilvl, it.rarity);
    returnJewels(g, it);
    n++;
    return false;
  });
  s.cur.gold += gold;
  if (n) g.toast(`賣出 ${n} 件，獲得 ${gold.toLocaleString()} 金幣`, 'good', '💰');
  g.touch();
}

export function bulkFilter(g: Game, maxRarity: Rarity): number[] {
  const s = g.state;
  return s.inventory
    .filter(it => !it.locked && it.rarity <= maxRarity && !it.set && !(canEquip(it, s.hero.classId, s.hero.level) && upgradeDelta(s, it).delta > 0))
    .map(it => it.uid);
}
