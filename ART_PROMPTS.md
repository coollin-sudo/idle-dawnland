# 美術圖清單與 ChatGPT 生圖 Prompt

遊戲裡的角色、怪物、寵物都已經由程式即時繪製，這份清單是**可選的升級**：把圖放進 `public/art/` 對應資料夾後，遊戲會自動改用圖片（找不到圖的仍然用程式繪製）。

> 本檔由 `npm run art-prompts` 自動產生。

## 使用方式

1. 把「共用風格」和單張描述**一起**貼給 ChatGPT（每次都貼共用風格，畫風才一致）。
2. 下載 PNG（透明背景），依表格檔名存進對應資料夾，建議壓到 512×512 以內。
3. 推上 GitHub，部署完成後重新整理遊戲即可看到。
4. 請不要在 prompt 裡提到任何現有遊戲的名稱或「某某遊戲風格」，保持原創。

## 共用風格

```
Cute chibi fantasy RPG game sprite, full body, hand-painted style with clean dark outlines,
soft cel shading, vibrant colors, centered, single character only,
TRANSPARENT background (PNG), square 1:1 image, no text, no watermark, no border.
```

## 1. 職業與轉職 → `public/art/classes/`（角色面向右邊）

| 檔名 | 名稱 | 描述（接在共用風格後面） |
|---|---|---|
| `warrior.png` | 劍士 | a young swordsman in steel plate armor with a red cape, holding a longsword and a round shield with a golden star, facing right. |
| `ranger.png` | 遊俠 | an agile forest ranger with a blonde ponytail and green hood, drawing a wooden longbow, quiver on the back, facing right. |
| `mage.png` | 法師 | a young wizard with silver hair, deep blue robe and pointed star hat, holding a staff with a glowing blue crystal, facing right. |
| `cleric.png` | 祭司 | a gentle priestess with copper hair, white and gold robes, a jeweled circlet, holding a holy war mace and a small relic book, facing right. |
| `berserker.png` | 狂戰士（劍士轉職） | a wild berserker with spiky red hair and horned helmet, brown leather armor, dark red cape, two-handed greatsword, no shield, facing right. |
| `paladin.png` | 聖騎士（劍士轉職） | a holy paladin in white-gold plate armor and visored helm, blue cape, longsword and kite shield glowing with light, facing right. |
| `marksman.png` | 神射手（遊俠轉職） | a calm marksman in navy coat and brown cape, short hair, ornate longbow with a scope-like sight, facing right. |
| `assassin.png` | 毒影刺客（遊俠轉職） | a shadow assassin in dark purple hood and mask, green poison trim, holding a bow with toxic green arrows, facing right. |
| `elementalist.png` | 元素使（法師轉職） | a fiery elementalist with orange hair, crimson robe with gold trim, staff crackling with fire, ice and lightning, facing right. |
| `warlock.png` | 暗咒師（法師轉職） | a mysterious warlock in a dark purple hood, pale lavender hair, staff with a violet void orb, shadow wisps around, facing right. |
| `archbishop.png` | 大主教（祭司轉職） | a radiant archbishop in pure white robes, golden crown and pale gold cape, holding a holy mace, soft halo light, facing right. |
| `inquisitor.png` | 審判者（祭司轉職） | a stern inquisitor in dark red robes and steel helm, crimson cape, heavy golden hammer raised, facing right. |

## 2. 怪物 → `public/art/monsters/`（怪物面向左邊）

### 晨露草原
| 檔名 | 名稱 | 描述 |
|---|---|---|
| `slime.png` | 露珠史萊姆 | a cute round green jelly slime with big shiny eyes, facing left. |
| `hare.png` | 尖牙野兔 | a fluffy brown rabbit with oversized ears and a sharp buck tooth, facing left. |
| `goblin.png` | 哥布林斥候 | a small green goblin scout with pointy ears and a rusty dagger, cheeky grin, facing left. |
| `boar.png` | 暴躁野豬 | an angry brown wild boar with white curved tusks, facing left. |
| `goblin_king.png` | 哥布林王 格魯克 | BOSS: a burly goblin king with a golden crown, red fur cape and a huge spiked wooden club, facing left. |

### 迷霧森林
| 檔名 | 名稱 | 描述 |
|---|---|---|
| `wolf.png` | 霧影灰狼 | a grey wolf with a shaggy mane and glowing yellow eyes, mist around its paws, facing left. |
| `shroom.png` | 毒傘菇人 | a walking red toadstool mushroom monster with white spots and grumpy eyes, facing left. |
| `spider.png` | 巨網蜘蛛 | a giant dark spider with purple stripes and many red eyes, facing left. |
| `wisp.png` | 迷途精魂 | a lost mint-green ghost wisp with a wavy tail and sad eyes, facing left. |
| `treant.png` | 腐化樹人 艾爾德 | BOSS: a corrupted ancient treant, dark bark body, glowing lime eyes, branch arms and a mossy leaf crown, facing left. |

### 遺忘礦坑
| 檔名 | 名稱 | 描述 |
|---|---|---|
| `bat.png` | 吸血蝙蝠 | a purple vampire bat with spread membrane wings and red eyes, facing left. |
| `skel_miner.png` | 骷髏礦工 | a skeleton miner with a mining helmet with a lamp, holding a pickaxe, cyan glowing eye sockets, facing left. |
| `rock_golem.png` | 岩石魔像 | a rock golem made of grey boulders with glowing blue crystal cracks, facing left. |
| `rat_king.png` | 礦坑巨鼠 | a giant grey cave rat with pink tail and red eyes, facing left. |
| `troll.png` | 深淵巨魔 戈爾 | BOSS: a huge blue-grey cave troll with tusks and a massive wooden club, facing left. |

### 赤沙遺跡
| 檔名 | 名稱 | 描述 |
|---|---|---|
| `scorpion.png` | 赤沙巨蠍 | a giant orange desert scorpion with raised golden stinger and big claws, facing left. |
| `sand_serpent.png` | 流沙巨蛇 | a sand-colored desert serpent rising from the dunes, fangs out, facing left. |
| `mummy.png` | 遺跡木乃伊 | a shambling mummy wrapped in old bandages with glowing teal eyes, facing left. |
| `fire_elem.png` | 烈陽元素 | a fire elemental made of swirling orange and yellow flames with a cute face, facing left. |
| `pharaoh.png` | 法老亡魂 塞特 | BOSS: an undead pharaoh with a blue-and-gold striped headdress, holding a golden scepter, glowing teal eyes, facing left. |

### 霜語山脈
| 檔名 | 名稱 | 描述 |
|---|---|---|
| `snow_wolf.png` | 霜牙雪狼 | a white snow wolf with icy blue mane and frost breath, facing left. |
| `ice_elem.png` | 冰晶元素 | an ice crystal elemental with orbiting sharp ice shards, facing left. |
| `yeti.png` | 山岳雪怪 | a big white furry yeti with a blue-grey face, fists raised, facing left. |
| `harpy.png` | 冰翼鳥妖 | an icy blue harpy bird with pale feathered wings and yellow eyes, facing left. |
| `frost_dragon.png` | 冰霜巨龍 斯卡迪 | BOSS: a majestic frost dragon with pale blue scales, white wings and ice horns, facing left. |

### 熔心火山
| 檔名 | 名稱 | 描述 |
|---|---|---|
| `salamander.png` | 熔岩火蜥 | a red fire salamander lizard with flames along its back, facing left. |
| `lava_golem.png` | 熔岩魔像 | a lava golem with black obsidian armor and glowing orange magma cracks, facing left. |
| `imp.png` | 火焰小惡魔 | a small red imp with bat wings, horns, pointed tail and a mischievous grin, facing left. |
| `hellhound.png` | 地獄犬 | a black hellhound with a mane of fire and glowing yellow eyes, facing left. |
| `balrog.png` | 炎魔 巴爾洛斯 | BOSS: a towering flame demon with dark red body, great horns, burning bat wings, facing left. |

### 雷鳴天城
| 檔名 | 名稱 | 描述 |
|---|---|---|
| `thunderbird.png` | 雷鳴鳥 | a blue thunderbird with yellow lightning feathers and a crest, facing left. |
| `sylph.png` | 風之精靈 | a playful wind fairy spirit, pale mint body, swirling air, facing left. |
| `automaton.png` | 機械守衛 | a brass clockwork guardian robot with a spinning gear on its chest and a spear, facing left. |
| `sky_knight.png` | 天空騎士 | a sky knight in silver-blue armor with feathered white wings and a lance, facing left. |
| `storm_king.png` | 風暴君王 托爾納 | BOSS: a storm king made of dark blue clouds and crackling lightning, wearing a golden crown, facing left. |

### 暮影深淵
| 檔名 | 名稱 | 描述 |
|---|---|---|
| `void_eye.png` | 虛空之眼 | a floating purple void eyeball with tentacles underneath and a pink iris, facing left. |
| `shade.png` | 暮影刺客 | a shadow assassin wraith in a dark hood with glowing pink eyes and a dagger, facing left. |
| `tentacle.png` | 深淵觸手 | purple abyss tentacles with lime green suckers rising from a dark portal, facing left. |
| `fallen_knight.png` | 墮落騎士 | a fallen dark knight in black armor with crimson cape and glowing red eyes, holding a sword, facing left. |
| `nox.png` | 暮影之主 諾克斯 | FINAL BOSS: the Lord of Dusk, a dark violet dragon with black horns, golden crown and pink glowing eyes, cosmic cracks on its body, facing left. |

### 副本專用
| 檔名 | 名稱 | 描述 |
|---|---|---|
| `gold_goblin.png` | 寶藏哥布林 | a treasure goblin carrying a huge sack of gold coins, golden skin, greedy grin, facing left. |
| `crystal_golem.png` | 晶石魔像 | a blue crystal golem made entirely of shining gemstones, facing left. |
| `trial_spirit.png` | 試煉之靈 | a golden light spirit of the temple trials, warm glowing wisp, facing left. |

## 3. 寵物 → `public/art/pets/`（面向右邊）

| 檔名 | 名稱 | 描述 |
|---|---|---|
| `pet_slime.png` | 史萊姆寶寶 | a tiny light-blue baby slime, facing right. |
| `pet_fox.png` | 小火狐 | a small orange fire fox with a flame-tipped tail, facing right. |
| `pet_snowbun.png` | 雪球兔 | a round white snow bunny with blue ear tips, facing right. |
| `pet_volt.png` | 雷電鼠 | a small yellow electric mouse with a lightning tail, facing right. |
| `pet_sprite.png` | 森林小精靈 | a tiny green forest sprite with leaf wings, facing right. |
| `pet_goblin.png` | 迷你哥布林 | a mini goblin with a little treasure sack, facing right. |
| `pet_beetle.png` | 寶石甲蟲 | a teal jewel beetle with a glossy shell, facing right. |
| `pet_lantern.png` | 幽靈燈籠 | a floating purple ghost lantern with a warm yellow flame, facing right. |
| `pet_golem.png` | 迷你魔像 | a mini stone golem with a blue crystal on its back, facing right. |
| `pet_griffin.png` | 晨曦獅鷲 | a golden baby griffin with white feathers, facing right. |
| `pet_icedrake.png` | 小冰龍 | a baby ice dragon with pale blue scales, facing right. |
| `pet_shadowdrake.png` | 暮影幼龍 | a baby shadow dragon, dark purple with violet glowing horns, facing right. |
