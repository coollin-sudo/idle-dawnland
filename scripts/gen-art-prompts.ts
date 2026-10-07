/** 產生 ART_PROMPTS.md：列出所有可替換的美術圖與給 ChatGPT 的生圖描述 */
import { readFileSync, writeFileSync } from 'node:fs';
import { ADVANCES, CLASSES } from '@/data/classes';
import { MONSTERS } from '@/data/monsters';
import { PETS } from '@/data/pets';
import { REGIONS } from '@/data/regions';

const HERO_DESC: Record<string, string> = {
  warrior: 'a young swordsman in steel plate armor with a red cape, holding a longsword and a round shield with a golden star',
  ranger: 'an agile forest ranger with a blonde ponytail and green hood, drawing a wooden longbow, quiver on the back',
  mage: 'a young wizard with silver hair, deep blue robe and pointed star hat, holding a staff with a glowing blue crystal',
  cleric: 'a gentle priestess with copper hair, white and gold robes, a jeweled circlet, holding a holy war mace and a small relic book',
  berserker: 'a wild berserker with spiky red hair and horned helmet, brown leather armor, dark red cape, two-handed greatsword, no shield',
  paladin: 'a holy paladin in white-gold plate armor and visored helm, blue cape, longsword and kite shield glowing with light',
  marksman: 'a calm marksman in navy coat and brown cape, short hair, ornate longbow with a scope-like sight',
  assassin: 'a shadow assassin in dark purple hood and mask, green poison trim, holding a bow with toxic green arrows',
  elementalist: 'a fiery elementalist with orange hair, crimson robe with gold trim, staff crackling with fire, ice and lightning',
  warlock: 'a mysterious warlock in a dark purple hood, pale lavender hair, staff with a violet void orb, shadow wisps around',
  archbishop: 'a radiant archbishop in pure white robes, golden crown and pale gold cape, holding a holy mace, soft halo light',
  inquisitor: 'a stern inquisitor in dark red robes and steel helm, crimson cape, heavy golden hammer raised',
};

const MONSTER_DESC: Record<string, string> = {
  slime: 'a cute round green jelly slime with big shiny eyes',
  hare: 'a fluffy brown rabbit with oversized ears and a sharp buck tooth',
  goblin: 'a small green goblin scout with pointy ears and a rusty dagger, cheeky grin',
  boar: 'an angry brown wild boar with white curved tusks',
  goblin_king: 'BOSS: a burly goblin king with a golden crown, red fur cape and a huge spiked wooden club',
  wolf: 'a grey wolf with a shaggy mane and glowing yellow eyes, mist around its paws',
  shroom: 'a walking red toadstool mushroom monster with white spots and grumpy eyes',
  spider: 'a giant dark spider with purple stripes and many red eyes',
  wisp: 'a lost mint-green ghost wisp with a wavy tail and sad eyes',
  treant: 'BOSS: a corrupted ancient treant, dark bark body, glowing lime eyes, branch arms and a mossy leaf crown',
  bat: 'a purple vampire bat with spread membrane wings and red eyes',
  skel_miner: 'a skeleton miner with a mining helmet with a lamp, holding a pickaxe, cyan glowing eye sockets',
  rock_golem: 'a rock golem made of grey boulders with glowing blue crystal cracks',
  rat_king: 'a giant grey cave rat with pink tail and red eyes',
  troll: 'BOSS: a huge blue-grey cave troll with tusks and a massive wooden club',
  scorpion: 'a giant orange desert scorpion with raised golden stinger and big claws',
  sand_serpent: 'a sand-colored desert serpent rising from the dunes, fangs out',
  mummy: 'a shambling mummy wrapped in old bandages with glowing teal eyes',
  fire_elem: 'a fire elemental made of swirling orange and yellow flames with a cute face',
  pharaoh: 'BOSS: an undead pharaoh with a blue-and-gold striped headdress, holding a golden scepter, glowing teal eyes',
  snow_wolf: 'a white snow wolf with icy blue mane and frost breath',
  ice_elem: 'an ice crystal elemental with orbiting sharp ice shards',
  yeti: 'a big white furry yeti with a blue-grey face, fists raised',
  harpy: 'an icy blue harpy bird with pale feathered wings and yellow eyes',
  frost_dragon: 'BOSS: a majestic frost dragon with pale blue scales, white wings and ice horns',
  salamander: 'a red fire salamander lizard with flames along its back',
  lava_golem: 'a lava golem with black obsidian armor and glowing orange magma cracks',
  imp: 'a small red imp with bat wings, horns, pointed tail and a mischievous grin',
  hellhound: 'a black hellhound with a mane of fire and glowing yellow eyes',
  balrog: 'BOSS: a towering flame demon with dark red body, great horns, burning bat wings',
  thunderbird: 'a blue thunderbird with yellow lightning feathers and a crest',
  sylph: 'a playful wind fairy spirit, pale mint body, swirling air',
  automaton: 'a brass clockwork guardian robot with a spinning gear on its chest and a spear',
  sky_knight: 'a sky knight in silver-blue armor with feathered white wings and a lance',
  storm_king: 'BOSS: a storm king made of dark blue clouds and crackling lightning, wearing a golden crown',
  void_eye: 'a floating purple void eyeball with tentacles underneath and a pink iris',
  shade: 'a shadow assassin wraith in a dark hood with glowing pink eyes and a dagger',
  tentacle: 'purple abyss tentacles with lime green suckers rising from a dark portal',
  fallen_knight: 'a fallen dark knight in black armor with crimson cape and glowing red eyes, holding a sword',
  nox: 'FINAL BOSS: the Lord of Dusk, a dark violet dragon with black horns, golden crown and pink glowing eyes, cosmic cracks on its body',
  gold_goblin: 'a treasure goblin carrying a huge sack of gold coins, golden skin, greedy grin',
  crystal_golem: 'a blue crystal golem made entirely of shining gemstones',
  trial_spirit: 'a golden light spirit of the temple trials, warm glowing wisp',
};

const PET_DESC: Record<string, string> = {
  pet_slime: 'a tiny light-blue baby slime',
  pet_fox: 'a small orange fire fox with a flame-tipped tail',
  pet_snowbun: 'a round white snow bunny with blue ear tips',
  pet_volt: 'a small yellow electric ferret with blue spark-patterned fur and a crackling blue tail',
  pet_sprite: 'a tiny green forest sprite with leaf wings',
  pet_goblin: 'a mini goblin with a little treasure sack',
  pet_beetle: 'a teal jewel beetle with a glossy shell',
  pet_lantern: 'a floating purple ghost lantern with a warm yellow flame',
  pet_golem: 'a mini stone golem with a blue crystal on its back',
  pet_griffin: 'a golden baby griffin with white feathers',
  pet_icedrake: 'a baby ice dragon with pale blue scales',
  pet_shadowdrake: 'a baby shadow dragon, dark purple with violet glowing horns',
};

const STYLE = `Cute chibi fantasy RPG game sprite, full body, hand-painted style with clean dark outlines,
soft cel shading, vibrant colors, centered, single character only,
TRANSPARENT background (PNG), square 1:1 image, no text, no watermark, no border.`;

const lines: string[] = [];
const p = (s = '') => lines.push(s);
p('# 美術圖清單與 ChatGPT 生圖 Prompt');
p();
p('遊戲裡的角色、怪物、寵物都已經由程式即時繪製，這份清單是**可選的升級**：把圖放進 `public/art/` 對應資料夾後，遊戲會自動改用圖片（找不到圖的仍然用程式繪製）。');
p();
p('> 本檔由 `npm run art-prompts` 自動產生。');
p();
p('## 使用方式');
p();
p('1. 把「共用風格」和單張描述**一起**貼給 ChatGPT（每次都貼共用風格，畫風才一致）。');
p('2. 下載 PNG（透明背景），依表格檔名存進對應資料夾（.png 或 .webp 都可以），建議壓到 512×512 以內。');
p('3. 推上 GitHub，部署完成後重新整理遊戲即可看到。');
p('4. 請不要在 prompt 裡提到任何現有遊戲的名稱或「某某遊戲風格」，保持原創。');
p();
p('## 共用風格');
p();
p('```');
p(STYLE);
p('```');
p();
p('## 1. 職業與轉職 → `public/art/classes/`（角色面向右邊）');
p();
p('| 檔名 | 名稱 | 描述（接在共用風格後面） |');
p('|---|---|---|');
for (const c of Object.values(CLASSES)) p(`| \`${c.id}.png\` | ${c.name} | ${HERO_DESC[c.id]}, facing right. |`);
for (const a of Object.values(ADVANCES)) p(`| \`${a.id}.png\` | ${a.name}（${CLASSES[a.classId].name}轉職） | ${HERO_DESC[a.id]}, facing right. |`);
p();
p('## 2. 怪物 → `public/art/monsters/`（怪物面向左邊）');
for (const r of REGIONS) {
  p();
  p(`### ${r.name}`);
  p('| 檔名 | 名稱 | 描述 |');
  p('|---|---|---|');
  for (const id of [...r.monsters, r.boss]) {
    const m = MONSTERS.find(x => x.id === id)!;
    p(`| \`${id}.png\` | ${m.name} | ${MONSTER_DESC[id]}, facing left. |`);
  }
}
p();
p('### 副本專用');
p('| 檔名 | 名稱 | 描述 |');
p('|---|---|---|');
for (const id of ['gold_goblin', 'crystal_golem', 'trial_spirit']) p(`| \`${id}.png\` | ${MONSTERS.find(x => x.id === id)!.name} | ${MONSTER_DESC[id]}, facing left. |`);
p();
p('## 3. 寵物 → `public/art/pets/`（面向右邊）');
p();
p('| 檔名 | 名稱 | 描述 |');
p('|---|---|---|');
for (const pet of PETS) p(`| \`${pet.id}.png\` | ${pet.name} | ${PET_DESC[pet.id]}, facing right. |`);
p();
// ---- 背景與圖示（scripts/art-prompts-v2.json） ----
type Job2 = { name: string; grid: number; cells: string[]; prompt: string };
const jobs2: Job2[] = JSON.parse(readFileSync(new URL('./art-prompts-v2.json', import.meta.url), 'utf8'));
const DIR: Record<string, string> = { bg: 'bg', items: 'items', uniques: 'uniques', currency: 'currency', skills: 'skills', eskills: 'skills', vfx: 'vfx', portraits: 'portraits', ui: 'ui', particles: 'particles' };
p('## 4. 背景、圖示與特效');
p();
p('這部分每張 prompt 都已包含完整風格描述，直接整段貼給 ChatGPT 即可。');
p('- 背景：一張圖就是一個區域，存成 `public/art/bg/<區域 id>.webp`（或 .png），角色站的地面約在圖高 72%。');
p('- 圖示：一張圖是 2×2 或 3×3 的格子，依閱讀順序切開後存成右欄的檔名（建議 128×128）。');
p('  一般裝備的 4 格依序是等級 1–3、4–6、7–9、10–13 的外觀（檔名結尾 _0～_3）。');
p('- 技能：檔名是技能 id（例如 `skills/w_slash`），圓角方形圖示。');
p('- 頭像：`portraits/` 底下，檔名是職業／轉職 id 或 NPC id（aria、glenn、mila、bobo、sal、nox）。');
p('- 介面：`ui/` 底下是分頁按鈕圖示（檔名是分頁 id）；`particles/` 是天氣與金幣粒子（建議 64 以內）。');
p('- 特效：`vfx/` 底下的戰鬥特效貼圖，保留原始長寬比（建議 256 以內），投射物請讓前端朝右。');
p();
p('| 產出檔案 | Prompt |');
p('|---|---|');
for (const j of jobs2) {
  const kind = j.name.split('__')[0];
  const files = j.cells.map(c => `\`${DIR[kind]}/${c}\``).join('<br>');
  p(`| ${files} | ${j.prompt.replace(/\|/g, '\\|')} |`);
}
p();
const missing = MONSTERS.filter(m => !MONSTER_DESC[m.id]).map(m => m.id);
if (missing.length) throw new Error('缺少描述：' + missing.join(','));
writeFileSync('ART_PROMPTS.md', lines.join('\n'));
console.log('ART_PROMPTS.md 已更新');
