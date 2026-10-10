/**
 * 角色動作：用單張美術圖做出「連續動作」——預備、衝刺、出招、收招，
 * 參考動作遊戲的 anticipation → action → follow-through，以及擠壓與伸展（squash & stretch）。
 * 不需要骨架動畫，只對整張圖做位移、旋轉、縮放；殘影由同一個姿勢函式往回推幾格畫出。
 */
export type MotionKind =
  | 'combo1' // 近戰普攻第 1 下：水平斬
  | 'combo2' // 第 2 下：上挑（跳起）
  | 'combo3' // 第 3 下：終結技（大幅衝刺＋重擊）
  | 'skill' // 近戰技能：同終結技但更重
  | 'shoot' // 遠程普攻：拉弓／揮杖的後座力
  | 'shoot2' // 遠程連段：小跳步
  | 'cast' // 施法：浮起、前傾放出
  | 'hop'; // 寵物、召喚物

export interface Motion {
  kind: MotionKind;
  t: number;
  dur: number;
  /** 衝刺距離（像素，正值＝朝面向方向） */
  dist: number;
}

export interface MotionPose {
  dx: number;
  dy: number;
  rot: number;
  sx: number;
  sy: number;
  /** 0～1：殘影強度（衝刺最快時最明顯） */
  blur: number;
}

const ease = (k: number) => 1 - Math.pow(1 - k, 3);
const easeIn = (k: number) => k * k;
const inOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const seg = (k: number, a: number, b: number) => Math.max(0, Math.min(1, (k - a) / (b - a)));

export const IDLE: MotionPose = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, blur: 0 };

/** 各動作「出招命中」的時間點（佔整段動作的比例）：特效與傷害數字在這時候出現 */
export const STRIKE_AT: Record<MotionKind, number> = {
  combo1: 0.32, combo2: 0.34, combo3: 0.4, skill: 0.42, shoot: 0.18, shoot2: 0.2, cast: 0.38, hop: 0.3,
};

export const MOTION_DUR: Record<MotionKind, number> = {
  combo1: 0.46, combo2: 0.5, combo3: 0.62, skill: 0.66, shoot: 0.36, shoot2: 0.4, cast: 0.6, hop: 0.36,
};

/** 給定進度 k（0～1）算出姿勢；方向由呼叫端乘上 dir */
export function poseAt(m: Motion, k: number): MotionPose {
  const d = m.dist;
  switch (m.kind) {
    case 'combo1':
    case 'combo2':
    case 'combo3':
    case 'skill': {
      const heavy = m.kind === 'combo3' || m.kind === 'skill';
      const back = heavy ? 18 : 10;
      const a = 0.18, b = STRIKE_AT[m.kind], c = b + 0.2;
      if (k < a) {
        // 預備：後拉、下蹲、往後仰
        const e = ease(k / a);
        return { dx: -back * e, dy: 2 * e, rot: 0.08 * e, sx: 1 + 0.04 * e, sy: 1 - 0.06 * e, blur: 0 };
      }
      if (k < b) {
        // 衝刺：快速前進、前傾、拉長
        const e = easeIn(seg(k, a, b));
        const up = m.kind === 'combo2' ? -22 * Math.sin(e * Math.PI * 0.5) : 0;
        return { dx: -back + (d + back) * e, dy: up, rot: -0.14 - (heavy ? 0.06 : 0), sx: 1.1, sy: 0.93, blur: 1 };
      }
      if (k < c) {
        // 出招與餘勢：停在目標前，身體跟著揮出去
        const e = ease(seg(k, b, c));
        const up = m.kind === 'combo2' ? -22 + 14 * e : 0;
        const spin = m.kind === 'combo3' ? -0.35 * Math.sin(e * Math.PI) : m.kind === 'skill' ? -0.25 * Math.sin(e * Math.PI) : 0;
        const rot = (m.kind === 'combo2' ? 0.18 : -0.2) * (1 - e) + spin;
        const pop = heavy ? 1 + 0.08 * Math.sin(e * Math.PI) : 1;
        return { dx: d + 6 * Math.sin(e * Math.PI), dy: up, rot, sx: pop * (1 - 0.05 * (1 - e)), sy: pop * (1 + 0.05 * (1 - e)), blur: 0.3 * (1 - e) };
      }
      // 收招：退回原位
      const e = inOut(seg(k, c, 1));
      return { dx: d * (1 - e), dy: 0, rot: 0, sx: 1, sy: 1, blur: 0.25 * (1 - e) };
    }
    case 'shoot':
    case 'shoot2': {
      const a = STRIKE_AT[m.kind];
      const hopY = m.kind === 'shoot2' ? -10 * Math.sin(Math.min(1, k / 0.6) * Math.PI) : 0;
      if (k < a) {
        const e = ease(k / a);
        return { dx: -3 * e, dy: hopY, rot: 0.05 * e, sx: 1 - 0.03 * e, sy: 1 + 0.03 * e, blur: 0 };
      }
      const e = seg(k, a, 1);
      const recoil = Math.exp(-e * 6);
      return { dx: -3 - 9 * recoil * Math.sin(Math.min(1, e * 4) * Math.PI * 0.5), dy: hopY, rot: 0.08 * recoil, sx: 1 + 0.04 * recoil, sy: 1 - 0.04 * recoil, blur: 0 };
    }
    case 'cast': {
      const a = STRIKE_AT.cast;
      if (k < a) {
        const e = ease(k / a);
        return { dx: -4 * e, dy: -12 * e, rot: 0.1 * e, sx: 1, sy: 1 + 0.04 * e, blur: 0 };
      }
      const e = seg(k, a, 1);
      const push = Math.sin(Math.min(1, e * 3) * Math.PI * 0.5);
      return { dx: -4 + 14 * push * (1 - e), dy: -12 * (1 - inOut(e)), rot: 0.1 - 0.22 * push * (1 - e), sx: 1 + 0.06 * (1 - e) * push, sy: 1 + 0.06 * (1 - e) * push, blur: 0 };
    }
    case 'hop': {
      const e = Math.sin(k * Math.PI);
      return { dx: d * e * 0.6, dy: -14 * e, rot: -0.1 * e, sx: 1 - 0.05 * e, sy: 1 + 0.05 * e, blur: 0 };
    }
  }
}
