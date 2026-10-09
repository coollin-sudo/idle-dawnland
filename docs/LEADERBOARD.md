# 排行榜設定（Supabase）

遊戲本身是靜態網頁，排行榜的成績存在 Supabase（免費方案即可）。沒設定前，遊戲不會顯示「排行」分頁。

## 一、建立專案（約 5 分鐘）

1. 到 <https://supabase.com> 註冊並登入，按 **New project**。
   - 名稱隨意（例如 `dawnland`），區域選 **Northeast Asia (Tokyo)** 或 **Singapore**，資料庫密碼自己保存好（遊戲用不到）。
2. 建好後左側選 **SQL Editor** → **New query**，把 [`supabase/leaderboard.sql`](../supabase/leaderboard.sql) 整份貼上，按 **Run**。看到 `Success` 就完成了（可以重複執行）。
3. 左側 **Project Settings → API**（或首頁的 **Connect**），找到：
   - **Project URL**：像 `https://abcdefgh.supabase.co`
   - **anon public key**（或 **Publishable key**）：一長串 `eyJ...` 或 `sb_publishable_...`
4. 把這兩個值交給開發者，填進 `src/online/config.ts` 後重新部署。

> anon key 本來就是公開的（會出現在網頁原始碼裡）。真正的權限由 SQL 裡的函式與 RLS 控制：瀏覽器只能呼叫 `lb_submit`、`lb_board`、`lb_leave`，不能直接讀寫資料表。
> **service_role key 絕對不要給任何人、也不要放進程式碼。**

## 二、排行榜內容

| 榜 | 比什麼 | 說明 |
|---|---|---|
| 冒險進度 | 最遠關卡（難度 × 80 + 關卡） | 只會往上，不因轉生倒退 |
| 首領速通 | 打倒區域首領的秒數 | 英雄等級不高於首領時才算，比的是打法（配合首領機制） |
| 本週高塔 | 這週無盡之塔通過的最高層 | 台灣時間週一 00:00 換週，週次由伺服器決定 |
| 戰力 | 目前戰力 | 取最新值 |

每個榜都能依職業篩選。玩家要在「排行」分頁按「加入排行榜」才會上傳（只上傳角色名、職業、等級、轉生次數與成績），之後每 10 分鐘、打破紀錄或打倒區域首領時自動上傳；可隨時退出並刪除伺服器上的紀錄。

## 三、管理

- 網頁遊戲的數值都在玩家瀏覽器裡，無法完全防止改存檔作弊。伺服器會檢查數值範圍、名稱長度、30 秒送出間隔。
- 看到可疑紀錄：Supabase → **Table Editor → lb_players**，把那一列的 `hidden` 打勾即可從所有榜上隱藏。
- 免費專案若連續一週沒有任何請求會被暫停，到 Supabase 後台按 **Restore** 即可恢復（資料不會消失）。
