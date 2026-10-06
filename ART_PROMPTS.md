# 美術圖清單與 ChatGPT 生圖 Prompt

遊戲會自動偵測 `assets/` 裡的圖片：**有圖就用圖，沒圖就顯示 emoji**，所以可以一張一張慢慢補。

## 使用方式

1. 把下方「共用風格」和單張圖的描述**一起**貼給 ChatGPT（每次都貼共用風格，畫風才會一致）。
2. 下載圖片，**依照表格的檔名**存到對應資料夾（檔名大小寫要完全一樣）。
3. 建議先把圖片壓縮到 512×512 以內（例如用 [TinyPNG](https://tinypng.com/)），網頁載入才快。
4. 推上 GitHub 後，重新整理遊戲頁面就會看到新圖。

> 請不要在 prompt 裡寫任何現有遊戲的名稱或「某某遊戲風格」，保持原創，之後分享給朋友才不會有版權疑慮。

---

## 共用風格（角色與怪物）

```
Cute chibi fantasy RPG game sprite, full body, hand-painted style with clean dark outlines,
soft cel shading, vibrant colors, centered, single character only,
TRANSPARENT background (PNG), square 1:1 image, no text, no watermark, no border.
```

## 1. 職業角色　→ `assets/classes/`

角色都**面向右邊**（站在畫面左側面對怪物）。

| 檔名 | 描述（接在共用風格後面） |
|---|---|
| `warrior.png` | A young swordsman in steel plate armor with a red cape, holding a longsword and round shield, confident stance, facing right. |
| `ranger.png` | An agile elf archer in green leather armor and hood, drawing a wooden longbow, quiver on back, facing right. |
| `mage.png` | A young wizard in a deep blue robe with star embroidery and a pointed hat, holding a glowing crystal staff, facing right. |
| `cleric.png` | A gentle priest in white and gold robes with a halo-like glow, holding a holy war hammer, facing right. |

## 2. 怪物　→ `assets/monsters/`

怪物都**面向左邊**（站在畫面右側面對玩家）。首領可以畫得更大、更有壓迫感。

### 新手草原
| 檔名 | 描述 |
|---|---|
| `snail.png` | A cute oversized meadow snail with a mossy green shell, facing left. |
| `rabbit.png` | A mischievous fluffy brown rabbit with a tiny horn, mid-hop, facing left. |
| `goblin.png` | A small green goblin with big ears holding a wooden club, cheeky grin, facing left. |
| `goblin_chief.png` | BOSS: a burly goblin chieftain with a bone crown, fur cloak and spiked club, facing left. |

### 迷霧森林
| 檔名 | 描述 |
|---|---|
| `wolf.png` | A grey forest wolf snarling, mist around its paws, facing left. |
| `spider.png` | A giant purple-striped forest spider with glowing eyes, facing left. |
| `shroom.png` | A walking poisonous red mushroom monster with angry eyes, facing left. |
| `bear.png` | BOSS: a massive forest guardian bear with moss and vines on its back, glowing green eyes, facing left. |

### 古代礦坑
| 檔名 | 描述 |
|---|---|
| `bat.png` | A vampire bat with red eyes and spread wings, facing left. |
| `skeleton.png` | A skeleton soldier with a rusty sword and dented helmet, facing left. |
| `golem.png` | A small stone golem made of cave rocks with glowing crystal cracks, facing left. |
| `troll.png` | BOSS: a huge cave troll with a pickaxe and lantern, rocky skin, facing left. |

### 沙漠遺跡
| 檔名 | 描述 |
|---|---|
| `scorpion.png` | A desert scorpion with golden carapace and raised stinger, facing left. |
| `snake.png` | A coiled rattlesnake with sand-colored scales, hissing, facing left. |
| `mummy.png` | A shambling mummy wrapped in old bandages with glowing blue eyes, facing left. |
| `sphinx.png` | BOSS: an ancient ruin sphinx — lion body, stone mask, gold ornaments, facing left. |

### 冰封山脈
| 檔名 | 描述 |
|---|---|
| `yeti.png` | A white furry yeti with icy breath, fists raised, facing left. |
| `ice.png` | A floating ice crystal elemental with sharp shards orbiting it, facing left. |
| `mammoth.png` | A woolly mammoth with frost-covered tusks, facing left. |
| `frost_dragon.png` | BOSS: a majestic frost dragon with icy blue scales and crystal wings, facing left. |

### 火山深淵
| 檔名 | 描述 |
|---|---|
| `salamander.png` | A fire salamander lizard with flames along its back, facing left. |
| `magma.png` | A lava golem with cracked obsidian skin and glowing magma, facing left. |
| `imp.png` | A small red imp with bat wings and a trident, mischievous grin, facing left. |
| `balrog.png` | BOSS: a towering flame demon with horns, fire whip and burning wings, facing left. |

### 天空之城
| 檔名 | 描述 |
|---|---|
| `thunderbird.png` | A thunderbird with electric blue feathers and lightning crackling, facing left. |
| `sylph.png` | A playful wind fairy with translucent wings, swirling air around her, facing left. |
| `automaton.png` | A brass clockwork guardian robot with a spear, steampunk gears, facing left. |
| `storm_king.png` | BOSS: a storm king made of swirling clouds and lightning, wearing a crown, facing left. |

### 混沌深淵
| 檔名 | 描述 |
|---|---|
| `eye.png` | A floating void eye surrounded by dark purple energy, facing left. |
| `shade.png` | A shadowy humanoid wraith with glowing white eyes, facing left. |
| `tentacle.png` | Chaos tentacles emerging from a dark portal, purple and black, facing left. |
| `chaos_dragon.png` | BOSS: a colossal chaos dragon with black and violet scales, cosmic cracks glowing, facing left. |

## 3. 區域背景（可選）　→ `assets/zones/`

背景用 **JPG**，橫式。共用風格換成這段：

```
Fantasy RPG battle background, hand-painted, side view landscape, wide 2:1 aspect ratio,
open flat ground in the lower half for characters to stand on, no characters, no text.
```

| 檔名 | 描述 |
|---|---|
| `meadow.jpg` | Sunny green meadow with wildflowers and a distant village. |
| `forest.jpg` | Misty ancient forest with tall trees and soft light rays. |
| `mine.jpg` | Abandoned underground mine with wooden supports, rails and glowing crystals. |
| `desert.jpg` | Desert ruins with broken pillars and sand dunes at sunset. |
| `snow.jpg` | Frozen mountain pass with snow, ice cliffs and aurora sky. |
| `volcano.jpg` | Volcanic cavern with lava rivers and dark basalt rocks. |
| `sky.jpg` | Floating castle islands above the clouds, bright blue sky. |
| `abyss.jpg` | Dark chaotic void with floating rocks and purple cosmic rifts. |
