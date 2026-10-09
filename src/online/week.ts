/** 台灣時間的 ISO 週次，例如 2026-W41（與伺服器的 lb_week() 一致） */
export function weekKey(now: number): string {
  const d = new Date(now + 8 * 3600_000);
  const day = (d.getUTCDay() + 6) % 7; // 週一 = 0
  const thu = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 3));
  const year = thu.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((thu.getTime() - jan4.getTime()) / 86400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
