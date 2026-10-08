import type { BossMechId, ClassId } from '@/core/types';

/**
 * 首領機制：每個區域首領都有一個「機制弱點」，要用對應的技能、專精、天賦、裝備或施放順序才好打。
 * 設計參考：
 * - Slay the Spire：每個首領考驗牌組的不同面向，玩家事先知道首領是誰，可以針對它調整。
 * - WoW 團隊副本：打斷、清小怪、狂暴計時器（DPS 檢定）、承受大招（減傷／護盾時機）。
 * - 放置遊戲的「首領牆」：卡關時要靠策略突破，但多練一陣子也一定打得過（軟性門檻）。
 */

/** 解法類型：用來在介面上檢查玩家是否已經具備 */
export type CounterReq =
  | { kind: 'skill'; id: string }
  | { kind: 'spec'; id: string; spec: number }
  | { kind: 'talent'; id: string }
  | { kind: 'hold'; id: string }
  | { kind: 'first'; id: string };

export interface Counter {
  text: string;
  /** 轉職限定 */
  adv?: string;
  req: CounterReq[];
}

export interface BossMech {
  id: BossMechId;
  name: string;
  /** 一句話說明機制 */
  desc: string;
  /** 卡關時的提示：要找什麼樣的手段 */
  hint: string;
  counters: Record<ClassId, Counter[]>;
}

const sk = (id: string): CounterReq => ({ kind: 'skill', id });
const sp = (id: string, spec: number): CounterReq => ({ kind: 'spec', id, spec });
const tl = (id: string): CounterReq => ({ kind: 'talent', id });
const hold = (id: string): CounterReq => ({ kind: 'hold', id });
const first = (id: string): CounterReq => ({ kind: 'first', id });

// ---------------------------------------------------------------------
// 機制數值（戰鬥引擎讀取）
// ---------------------------------------------------------------------
export const MECH = {
  /** 手下護駕：每隻手下讓首領受到的傷害降低 */
  guardPer: 0.25,
  guardMax: 0.5,
  /** 終焉第一階段的護駕更強 */
  finaleGuardPer: 0.3,
  finaleGuardMax: 0.6,
  guardSummonEvery: 12,
  /** 腐根再生：每秒回復最大生命 */
  regenPct: 0.02,
  /** 岩膚：減傷；被暈眩／冰凍後碎裂的秒數與碎裂時的易傷 */
  skinDR: 0.7,
  skinBreak: 6,
  skinBreakTaken: 0.2,
  /** 滅魂咒：詠唱秒數、間隔、傷害（英雄最大生命比例）、破咒所需傷害（首領最大生命比例） */
  doomCast: 3.5,
  doomEvery: 14,
  doomFirst: 6,
  doomDmg: 1,
  doomBreak: 0.1,
  /** 冰封吐息：詠唱、間隔、碎片數、每片傷害（英雄最大生命比例） */
  breathCast: 1.8,
  breathEvery: 20,
  breathFirst: 5,
  breathShards: 6,
  breathShard: 0.26,
  /** 有護盾時冰晶的威力 */
  breathShielded: 0.3,
  /** 熔岩外殼：硬化（減傷）與暴露（易傷）交替；暴露的瞬間會施放「保留」的技能 */
  shellHard: 8,
  shellOpen: 4,
  shellDR: 0.8,
  shellOpenTaken: 0.6,
  /** 熔核爆發：開打幾秒後開始，每秒造成英雄最大生命比例的火焰傷害，每秒再增加 */
  infernoAt: 40,
  infernoDmg: 0.1,
  infernoGrow: 0.02,
  /** 風暴結界：需要幾次命中打破、間隔、撐過幾秒就會雷霆爆發 */
  barrierHits: 15,
  barrierEvery: 14,
  barrierFirst: 3,
  barrierBlast: 6,
  barrierBlastDmg: 0.5,
  barrierHeal: 0.08,
  barrierStun: 2,
} as const;

export const BOSS_MECHS: Record<BossMechId, BossMech> = {
  guard: {
    id: 'guard', name: '手下護駕',
    desc: '每隻手下讓首領受到的傷害 -25%（最多 -50%），手下死了還會再叫。',
    hint: '用「攻擊所有敵人」的技能一次清掉手下，首領就沒有保護。',
    counters: {
      warrior: [{ text: '橫掃（攻擊所有敵人）', req: [sk('w_sweep')] }],
      ranger: [{ text: '散射（攻擊所有敵人）', req: [sk('r_multi')] }],
      mage: [{ text: '冰霜新星（攻擊所有敵人）', req: [sk('g_nova')] }],
      cleric: [{ text: '聖光彈 Lv.5 專精「聖光散射」改成攻擊全體', req: [sp('c_bolt', 0)] }],
    },
  },
  regen: {
    id: 'regen', name: '腐根再生',
    desc: '每秒回復 2% 最大生命；身上有流血、中毒或燃燒時無法再生。',
    hint: '讓首領一直帶著持續傷害（流血／中毒／燃燒），就能壓住再生。',
    counters: {
      warrior: [{ text: '重斬（附帶流血），天賦「撕裂」提高觸發率', req: [sk('w_slash')] }],
      ranger: [{ text: '散射 Lv.5 專精「毒箭」附帶中毒', req: [sp('r_multi', 1)] }],
      mage: [{ text: '火球術 Lv.5 專精「烈焰」提高燃燒機率', req: [sp('g_fireball', 1)] }],
      cleric: [{ text: '聖光彈 Lv.5 專精「聖焰彈」附帶燃燒', req: [sp('c_bolt', 1)] }],
    },
  },
  skin: {
    id: 'skin', name: '岩膚',
    desc: '受到的傷害 -70%。被暈眩或冰凍時岩膚碎裂 6 秒，期間受到的傷害 +20%；無視防禦的攻擊可以穿透一部分岩膚。',
    hint: '把暈眩／冰凍技能排在技能欄第 1 格，大傷害技能排在後面，在碎裂期間打出傷害。',
    counters: {
      warrior: [
        { text: '盾擊（暈眩）放第 1 格，重斬放後面', req: [first('w_bash')] },
        { text: '橫掃 Lv.5 專精「破甲橫掃」', req: [sp('w_sweep', 1)] },
      ],
      ranger: [
        { text: '穿刺箭（無視 50% 防禦），專精「破甲箭」完全穿透', req: [sp('r_pierce', 1)] },
        { text: '穿刺箭專精「震盪箭」（暈眩）放第 1 格', req: [first('r_pierce'), sp('r_pierce', 0)] },
      ],
      mage: [
        { text: '冰霜新星 Lv.5 專精「冰封」（冰凍）放第 1 格', req: [first('g_nova'), sp('g_nova', 0)] },
        { text: '暗咒師：暗影箭專精「虛空箭」', adv: 'warlock', req: [sp('k_bolt', 1)] },
      ],
      cleric: [
        { text: '神聖新星 Lv.5 專精「聖光震盪」（暈眩）放第 1 格', req: [first('c_nova'), sp('c_nova', 0)] },
        { text: '審判者：聖錘（暈眩）放第 1 格', adv: 'inquisitor', req: [first('q_hammer')] },
      ],
    },
  },
  doomcast: {
    id: 'doomcast', name: '滅魂咒',
    desc: '每 14 秒詠唱 3.5 秒，完成時造成你 100% 最大生命的傷害（無視抗性，只能被護盾吸收）並詛咒。詠唱中被暈眩／冰凍，或受到首領 10% 生命的傷害就會中斷。',
    hint: '把暈眩／冰凍技能設成「⏸ 保留」：首領開始詠唱的瞬間才施放，而且必定打斷。',
    counters: {
      warrior: [
        { text: '盾擊設為「⏸ 保留」', req: [hold('w_bash')] },
        { text: '聖騎士：正義之錘設為「⏸ 保留」', adv: 'paladin', req: [hold('p_justice')] },
      ],
      ranger: [
        { text: '穿刺箭專精「震盪箭」並設為「⏸ 保留」', req: [sp('r_pierce', 0), hold('r_pierce')] },
        { text: '神射手：致命狙擊設為「⏸ 保留」，用爆發打破詠唱', adv: 'marksman', req: [hold('m_snipe')] },
      ],
      mage: [
        { text: '冰霜新星專精「冰封」並設為「⏸ 保留」', req: [sp('g_nova', 0), hold('g_nova')] },
        { text: '元素使：暴風雪專精「永凍」並設為「⏸ 保留」', adv: 'elementalist', req: [sp('e_blizzard', 0), hold('e_blizzard')] },
      ],
      cleric: [
        { text: '神聖新星專精「聖光震盪」並設為「⏸ 保留」', req: [sp('c_nova', 0), hold('c_nova')] },
        { text: '審判者：聖錘設為「⏸ 保留」', adv: 'inquisitor', req: [hold('q_hammer')] },
      ],
    },
  },
  breath: {
    id: 'breath', name: '冰封吐息',
    desc: '每 20 秒吐出 6 道冰晶，每道造成你 26% 最大生命的冰霜物理傷害（可被迴避、護甲與冰抗減免；身上有護盾時威力只剩 30%）。巨龍不會被暈眩或冰凍。',
    hint: '這是防禦檢定：把護盾技能設成「⏸ 保留」在吐息前張開，或堆迴避、護甲、冰抗。',
    counters: {
      warrior: [
        { text: '聖騎士：神聖護盾設為「⏸ 保留」', adv: 'paladin', req: [hold('p_holyshield')] },
        { text: '狂戰士：天賦「不屈」＋嗜血吸血撐過去', adv: 'berserker', req: [tl('w4b')] },
      ],
      ranger: [{ text: '堆迴避：天賦「敏捷身手」「閃避本能」，裝備迴避與冰抗', req: [tl('r0b'), tl('r2b')] }],
      mage: [{ text: '魔力護盾設為「⏸ 保留」', req: [hold('g_manashield')] }],
      cleric: [
        { text: '天賦「守護天使」＋治癒術撐過去', req: [tl('c4b'), sk('c_heal')] },
        { text: '大主教：天使之翼設為「⏸ 保留」', adv: 'archbishop', req: [hold('h_wings')] },
      ],
    },
  },
  inferno: {
    id: 'inferno', name: '熔岩外殼',
    desc: '外殼硬化 8 秒（受到傷害 -80%）、裂開暴露熔核 4 秒（受到傷害 +60%）輪流出現；開打 40 秒後熔核爆發，每秒造成你 10% 最大生命的火焰傷害且越來越痛。',
    hint: '這是輸出檢定：把傷害最高的技能設成「⏸ 保留」，熔核暴露的瞬間會一起施放；增益技能排第 1 格。',
    counters: {
      warrior: [
        { text: '重斬專精「致命重擊」設為「⏸ 保留」，戰吼放第 1 格', req: [sp('w_slash', 1), hold('w_slash'), first('w_warcry')] },
        { text: '聖騎士：正義之錘設為「⏸ 保留」，戰吼放第 1 格', adv: 'paladin', req: [hold('p_justice'), first('w_warcry')] },
      ],
      ranger: [
        { text: '神射手：致命狙擊設為「⏸ 保留」，鷹眼放第 1 格', adv: 'marksman', req: [hold('m_snipe'), first('r_hawkeye')] },
        { text: '毒影刺客：影襲設為「⏸ 保留」，鷹眼放第 1 格', adv: 'assassin', req: [hold('a_shadow'), first('r_hawkeye')] },
      ],
      mage: [
        { text: '元素使：隕石術設為「⏸ 保留」', adv: 'elementalist', req: [hold('e_meteor')] },
        { text: '暗咒師：暗影箭設為「⏸ 保留」', adv: 'warlock', req: [hold('k_bolt')] },
      ],
      cleric: [
        { text: '大主教：神聖之光設為「⏸ 保留」，祝福放第 1 格', adv: 'archbishop', req: [hold('h_divine'), first('c_bless')] },
        { text: '審判者：聖錘設為「⏸ 保留」，祝福放第 1 格', adv: 'inquisitor', req: [hold('q_hammer'), first('c_bless')] },
      ],
    },
  },
  barrier: {
    id: 'barrier', name: '風暴結界',
    desc: '每 14 秒張開結界，擋下所有傷害；被命中 15 次就會破碎並讓首領暈眩 2 秒。結界撐過 6 秒會引發雷霆爆發（你 50% 最大生命，首領回復 8% 生命）。',
    hint: '比的是「命中次數」不是傷害：把多段攻擊技能排前面，寵物和召喚物的攻擊也算。',
    counters: {
      warrior: [
        { text: '狂戰士：旋風斬（4 段）專精「狂風」（冷卻 ×0.6）放第 1 格', adv: 'berserker', req: [first('b_whirl'), sp('b_whirl', 1)] },
        { text: '橫掃專精「連環橫掃」（攻擊次數 ×2）放第 1 格', req: [first('w_sweep'), sp('w_sweep', 0)] },
      ],
      ranger: [
        { text: '二連射專精「四連射」', req: [sp('r_double', 0)] },
        { text: '神射手：箭雨（8 段）放第 1 格', adv: 'marksman', req: [first('m_rain')] },
        { text: '毒影刺客：影襲（5 段）放第 1 格', adv: 'assassin', req: [first('a_shadow')] },
      ],
      mage: [
        { text: '連鎖閃電（4 段）專精「雷暴」（8 段）', req: [sp('g_chain', 0)] },
        { text: '暗咒師：亡骸召喚（骷髏每秒攻擊）', adv: 'warlock', req: [sk('k_skeleton')] },
      ],
      cleric: [
        { text: '大主教：神聖之光專精「天光連擊」', adv: 'archbishop', req: [sp('h_divine', 0)] },
        { text: '審判者：神罰（10 段）', adv: 'inquisitor', req: [sk('q_wrath')] },
      ],
    },
  },
  finale: {
    id: 'finale', name: '終焉三階段',
    desc: '生命 70% 以上時由手下護駕；70%～35% 會詠唱滅魂咒；35% 以下張開風暴結界。',
    hint: '綜合考試：範圍攻擊清手下、保留控制技打斷詠唱、多段攻擊打破結界——技能欄要兼顧三種。',
    counters: {
      warrior: [{ text: '橫掃＋盾擊（⏸ 保留）＋多段技能', req: [sk('w_sweep'), hold('w_bash')] }],
      ranger: [{ text: '散射＋震盪箭（⏸ 保留）＋多段技能', req: [sk('r_multi'), hold('r_pierce')] }],
      mage: [{ text: '冰霜新星（⏸ 保留）＋連鎖閃電', req: [hold('g_nova'), sk('g_chain')] }],
      cleric: [{ text: '神聖新星（⏸ 保留）＋多段技能', req: [hold('c_nova')] }],
    },
  },
};

export const mechOf = (id: BossMechId | undefined) => (id ? BOSS_MECHS[id] : undefined);
