/** 特殊能力的說明文字。實際效果在 systems/combat.ts 的對應掛勾中。 */
export const POWER_DESC: Record<string, (v: number) => string> = {
  chainOnHit: v => `攻擊命中時有 ${v}% 機率釋放連鎖閃電，彈跳 3 次，各造成 120% 雷電傷害`,
  executioner: v => `對生命低於 30% 的敵人傷害 +${v}%`,
  bleedBurst: v => `流血疊滿 5 層時引爆，造成 ${v}% 物理傷害`,
  evadeCrit: () => '迴避攻擊後，下一次攻擊必定暴擊',
  starfall: v => `每 8 秒降下星辰，對隨機敵人造成 ${v}% 神聖傷害`,
  frostCrit: v => `暴擊時有 ${v}% 機率冰凍目標`,
  holyNova: v => `每第 5 次攻擊釋放聖光新星，對所有敵人造成 ${v}% 神聖傷害`,
  guardian: v => `生命低於 30% 時獲得 ${v}% 最大生命的護盾（冷卻 30 秒）`,
  multishot: v => `普通攻擊額外命中 ${v} 個隨機敵人`,
  burnAmp: v => `燃燒中的敵人受到的傷害 +${v}%`,
  phoenix: v => `受到致命傷害時以 ${v}% 生命復活（冷卻 120 秒）`,
  echo: v => `施放技能時有 ${v}% 機率再施放一次`,
  overload: v => `攻擊感電中的敵人時，雷電會跳到另一個敵人造成 ${v}% 傷害`,
  thorns: v => `反彈受到傷害的 ${v}%`,
  killHeal: v => `擊殺敵人時回復 ${v}% 最大生命`,
  goldTouch: v => `擊殺時有 ${v}% 機率獲得雙倍金幣`,
  firstStrike: v => `對每個敵人的第一擊傷害 +${v}%`,
  berserk: v => `每損失 10% 生命，傷害 +${v}%`,
  timeWarp: v => `擊殺敵人時所有技能冷卻減少 ${v} 秒`,
  swift: v => `每次迴避後 3 秒內攻擊速度 +${v}%`,
  deathMark: v => `對中毒 5 層以上或流血 3 層以上的敵人傷害 +${v}%`,
  greed: v => `代價：受到的傷害 +${v}%`,
  petBond: v => `寵物傷害 +${v}%，寵物攻擊時回復你 1% 生命`,
};

export const describePower = (id: string, v: number) => (POWER_DESC[id] ?? (() => id))(Math.round(v * 10) / 10);
