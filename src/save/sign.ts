/**
 * 存檔簽章：偵測存檔被手動修改（localStorage 或匯出的 JSON）。
 * 這只是「防君子」的門檻——金鑰就在網頁程式裡，懂程式的人還是能繞過；真正的把關在伺服器端（supabase/leaderboard.sql）。
 * 被判定修改過的存檔照常可以玩，只是不能參加排行榜。
 */
const SALT = 'dawnland·晨曦·2026·lb';

/** cyrb53 雜湊（兩組 32 位元），輸出 16 進位字串 */
export function signText(text: string): string {
  const str = SALT + text + SALT;
  let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}
