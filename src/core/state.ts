import type { ClassId, GameState, Settings } from './types';
import { classSkills } from '@/data/skills';

export const SAVE_VERSION = 2;
export const LOADOUT_UNLOCK = [1, 5, 15, 30];
export const BASE_INV = 60;

export function defaultSettings(): Settings {
  return {
    sfx: 0.6, music: 0.35, particles: 'high', dmgNumbers: true, shake: true, numberStyle: 'zh',
    potionAt: 45, autoBuyPotions: true, autoSalvage: 1, keepUpgrades: true, autoEquip: true, autoEquipSpecial: false, autoBoss: true, speedUi: false, useArt: true,
  };
}

export function newGameState(name: string, classId: ClassId, now = Date.now(), seed = (Math.random() * 2 ** 32) >>> 0): GameState {
  const first = classSkills(classId).find(s => !s.advId && s.unlock === 1)!;
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastSeen: now,
    playMs: 0,
    seed,
    nextUid: 1,
    hero: {
      name, classId, advId: null, level: 1, xp: 0,
      statPoints: 0, alloc: { str: 0, dex: 0, int: 0, vit: 0 }, autoAlloc: true,
      skillPoints: 0, skillRanks: { [first.id]: 1 }, skillSpecs: {}, loadout: [first.id, null, null, null],
      loadoutHold: [false, false, false, false], loadoutManual: false, maxLevel: 1,
      talentRanks: {}, hp: 0, mp: 0,
    },
    equipment: { weapon: null, offhand: null, helmet: null, armor: null, gloves: null, belt: null, boots: null, amulet: null, ring1: null, ring2: null },
    inventory: [],
    invCapacity: BASE_INV,
    cur: { gold: 0, gems: 50, stones: 2, essence: 0, shards: 0, petFood: 0, protect: 0, starSouls: 0, keys: 0 },
    potions: [8, 0, 0],
    progress: { difficulty: 0, stage: 0, wave: 0, mode: 'push', best: [-1, -1, -1], unlockedDifficulty: 0 },
    dungeons: { date: '', used: {}, bought: {}, best: {} },
    tower: { floor: 1, best: 0 },
    pets: { owned: {}, active: null, eggs: [], slots: 2 },
    quests: { main: 0, mainProgress: 0, daily: [], dailyDate: '', dailyChest: false },
    achievements: {},
    jewels: {},
    title: null,
    counters: {},
    codex: {},
    uniquesFound: [],
    rebirth: { count: 0, ranks: {}, bestStageEver: -1, soulsEarned: 0 },
    buffs: [],
    merchant: { items: [], refreshAt: 0 },
    settings: defaultSettings(),
    story: [],
    rate: { xp: 0, gold: 0, kills: 0, samples: 0 },
  };
}
