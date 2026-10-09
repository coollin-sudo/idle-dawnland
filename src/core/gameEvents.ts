import type { Element } from './stats';
import type { FxKey, Item, SkillDef, StatusId } from './types';
import type { Unit } from './unit';

export interface GameEvents extends Record<string, unknown> {
  // ---- 戰鬥 ----
  'unit:spawn': { unit: Unit };
  'unit:act': { src: Unit; targets: Unit[]; fx: FxKey; skill?: SkillDef; element: Element };
  'unit:cast': { src: Unit; skill: SkillDef; time: number };
  'unit:interrupt': { src: Unit };
  'unit:hit': { src: Unit | null; tgt: Unit; amount: number; crit: boolean; element: Element; dot: boolean; absorbed: number; proc: boolean };
  'unit:miss': { src: Unit; tgt: Unit };
  'unit:heal': { tgt: Unit; amount: number };
  'unit:shield': { tgt: Unit; amount: number };
  'unit:status': { tgt: Unit; status: StatusId; stacks: number };
  'unit:buff': { tgt: Unit; name: string };
  'unit:death': { unit: Unit; killer: Unit | null };
  'unit:revive': { unit: Unit };
  'unit:proc': { src: Unit; name: string; fx: FxKey; targets: Unit[]; element: Element };
  // ---- 關卡 ----
  'battle:start': { units: Unit[]; boss: boolean; kind: 'stage' | 'dungeon' | 'tower' };
  'battle:clear': Record<string, never>;
  'stage:enter': { stage: number; difficulty: number };
  'stage:clear': { stage: number; first: boolean };
  'boss:fail': { reason: 'time' | 'death' };
  'record:boss': { key: string; ms: number };
  'hero:death': Record<string, never>;
  'hero:revive': Record<string, never>;
  // ---- 成長與獎勵 ----
  'hero:level': { level: number };
  'loot:item': { item: Item; auto: 'kept' | 'salvaged' | 'sold' };
  'loot:gold': { amount: number; unit?: Unit };
  'loot:currency': { key: string; amount: number; unit?: Unit };
  'toast': { text: string; kind?: 'info' | 'good' | 'warn' | 'bad' | 'epic' | 'legend'; icon?: string };
  'log': { text: string; kind?: string };
  'quest:complete': { name: string };
  'achievement': { name: string; tier: number };
  'story': { id: string };
  'forge:enhance': { item: Item; result: 'success' | 'fail' | 'down' | 'break' | 'protected' };
  'pet:hatch': { petId: string; isNew: boolean };
  'state:changed': Record<string, never>;
}
