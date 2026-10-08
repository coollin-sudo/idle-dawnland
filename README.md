# 放置冒險：晨曦大陸

原創的網頁放置 RPG。永晝水晶碎裂、暮影籠罩大陸——選一個職業，角色會自動戰鬥、升級、撿裝備，關掉網頁也會繼續累積收益。

**▶ 線上遊玩：https://coollin-sudo.github.io/idle-dawnland/**

## 遊戲特色

- **4 職業 × 8 轉職**：劍士（狂戰士／聖騎士）、遊俠（神射手／毒影刺客）、法師（元素使／暗咒師）、祭司（大主教／審判者）。共 40 個技能，可自訂 4 格技能欄的施放順序。
- **天賦樹**：每個職業 18 個節點、6 層，攻擊／防禦／輔助三條路線。
- **戰鬥系統**：
  - 五種元素：火、冰、雷、聖、暗
  - 九種異常狀態：燃燒、冰緩、冰凍、感電、流血、中毒、暈眩、虛弱、詛咒
  - 精英怪詞綴
  - 首領詠唱技（可用暈眩打斷）、召喚、狂暴、護盾
- **8 大區域、80 關、3 種難度**（普通／惡夢／地獄），每區有首領與劇情。
- **週末首領解謎**：第 3 區起每區約掛機一週才會打到首領；每個首領都有一種機制（手下護駕、腐根再生、岩膚、滅魂咒、冰封吐息、熔岩外殼、風暴結界、終焉三階段），要用對的技能、專精、天賦、施放順序或「⏸ 保留」才好打。地圖與技能頁有首領情報，列出本職業的解法；多練一陣子也能硬打過去。
- **裝備**：
  - 10 個部位、6 種稀有度、40 多種詞綴
  - 27 件具特殊能力的傳說裝備、6 套套裝
  - 鍛造屋：強化到 +20、重鑄、分解、打造
  - 魔晶鑲嵌：6 種魔晶 × 5 個等級，3 顆合成高一級；稀有度越高的裝備孔越多，也可以打孔
- **寵物**：12 種，孵蛋、升級、升星，出戰寵物會一起戰鬥。
- **長線目標**：
  - 每日副本（黃金洞窟、精煉礦脈、試煉神殿）、無盡之塔
  - 主線劇情任務、每日任務、20 種成就
  - 25 個稱號：成就達到 Ⅲ 階或完成特殊條件解鎖，配戴後顯示在名字旁並給予加成
  - 怪物圖鑑、轉生與星魂天賦
- **表現**：
  - 角色、怪物、寵物立繪、頭像、區域背景、物品與技能圖示、戰鬥特效都是手繪風格美術圖；特效動畫與粒子運動由程式驅動
  - 音效與配樂使用 CC0（公眾領域）素材：Kenney 音效包、OpenGameArt 的奇幻配樂；8 個區域、首領戰、副本與標題畫面各有配樂，素材載入失敗時退回 WebAudio 合成
- **離線收益**：離開時用真實戰鬥邏輯模擬目前關卡的效率，回來時結算（基本上限 12 小時）。
- **存檔**：自動存在瀏覽器，可匯出／匯入存檔碼換裝置。

## 開發

```bash
npm install
npm run dev        # 開發伺服器
npm test           # 單元測試
npm run build      # 正式版編譯到 dist/
npm run sim -- 48  # 平衡模擬：四職業連續掛機 48 小時的成長曲線
```

推送到 `main` 之後，GitHub Actions 會自動測試、編譯並部署到 GitHub Pages。

## 架構

```
src/
  core/      純邏輯：亂數、事件匯流排、數值系統、公式、型別、Game 主控制器
  data/      內容：職業、技能、天賦、怪物、區域、裝備、傳說、套裝、寵物、任務、劇情、成就
  systems/   系統：戰鬥、角色數值、掉落、鍛造、成長、關卡／副本／高塔、寵物、任務、轉生、離線
  render/    Canvas 渲染：英雄與 14 種怪物骨架繪製器、背景、粒子、特效、圖示
  audio/     WebAudio 程式合成音效與配樂
  ui/        Preact 介面
  save/      存檔、版本遷移、匯出匯入
scripts/     平衡模擬器、美術清單產生器
tests/       Vitest 單元測試
docs/        遊戲設計文件
```

設計細節見 [docs/DESIGN.md](docs/DESIGN.md)；數值平衡的參考資料與驗證方式見 [docs/BALANCE.md](docs/BALANCE.md)。

## 美術

美術圖由 ChatGPT 依 [ART_PROMPTS.md](ART_PROMPTS.md) 生成，存放在 `public/art/`（WebP）：

- 角色、怪物、寵物立繪 67 張
- 8 個區域的戰鬥背景
- 裝備圖示 60 個（15 種外型 × 4 個等級）、傳說裝備專屬圖示 27 個、貨幣與道具圖示 16 個
- 技能圖示 57 個（英雄 40、敵人 17）
- 頭像 18 張（12 個職業／轉職、6 位 NPC）
- 介面分頁圖示 13 個、天氣與金幣粒子貼圖 9 種
- 介面文字小圖示 45 個（取代按鈕、通知、提示列裡的 emoji）
- 異常狀態圖示 9 個、標題畫面背景與徽章、App 圖示
- 戰鬥特效貼圖 36 張（投射物、刀光、爆炸、法術範圍等），動畫由程式驅動

遊戲設定裡可以關閉「美術圖」，改用程式即時繪製的版本（角色會隨裝備改變武器外觀）。

想替換某張圖，照 ART_PROMPTS.md 的檔名放進對應資料夾即可（支援 .webp／.png），找不到圖的單位會自動用程式繪製。

## 音效與配樂授權

所有音訊素材皆為 CC0（公眾領域，可自由使用、不需標示作者），以下列出來源以示感謝：

- 音效：[Kenney](https://kenney.nl) — RPG Audio、Impact Sounds、Interface Sounds、Music Jingles
- 法術音效：[Basic Spell Impacts](https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx) — lentikula（火焰、冰霜、雷電）
- 配樂（[OpenGameArt](https://opengameart.org)）：
  - 標題：Intro Music — RonyDkid
  - 晨露草原：GrassLands Theme — DST
  - 迷霧森林：Peaceful Forest — Samza
  - 遺忘礦坑：Mysterious — nene
  - 赤沙遺跡：Desert Calmness (Negev Desert Loop) — Dizzy Crow
  - 霜語山脈：Fantasy: Rising Moon — RandomMind
  - 熔心火山：Evil Approach — nene
  - 雷鳴天城：Determined Pursuit — Emma_MA
  - 暮影深淵：Dark Shrine Loop — qubodup / yd
  - 副本與高塔：Desert Fighting (Negev Fight Loop) — Dizzy Crow
  - 首領戰：Boss Battle #2 [Symphonic Metal] — nene

