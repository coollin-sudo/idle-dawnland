/**
 * Supabase 連線設定（建好專案後填入，或用環境變數 VITE_LB_URL / VITE_LB_ANON_KEY）。
 * anon key 是公開金鑰（本來就會出現在網頁裡）；真正的權限由 supabase/leaderboard.sql 的函式與 RLS 控制。
 * 千萬不要把 service_role key 放進來。
 */
export const LB_URL: string = (import.meta.env.VITE_LB_URL as string | undefined) ?? '';
export const LB_ANON_KEY: string = (import.meta.env.VITE_LB_ANON_KEY as string | undefined) ?? '';
