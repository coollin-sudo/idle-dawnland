import { useState } from 'preact/hooks';
import { fineCraftPrice } from '@/core/formulas';
import { Emo, rich } from '../emoji';
import { fmt } from '@/core/format';
import { enhanceMult } from '@/core/formulas';
import { describeMod, statIsPct, statLabel } from '@/core/stats';
import type { Item, ItemSlotKind } from '@/core/types';
import { AFFIX_MAP, SLOT_LABEL, SLOTS } from '@/data/items';
import {
  craft, craftCost, enhance, fineCraft, FINE_CRAFT_ILVL, enhanceCost, enhanceRate, ENH_BREAK_FROM, ENH_DOWN_FROM, findItem, LEGEND_SHARDS, MAX_ENH, reforge, reforgeCost, type EnhanceResult,
} from '@/systems/forge';
import { itemColor } from '@/systems/items';
import { Cost, ItemCard, ItemSlot, JewelIcon, NpcHeader, Sockets, Switch } from '../common';
import { JEWEL_MAX_TIER, JEWELS, MAX_SOCKETS, combineCost, jewelKey, jewelMods, jewelName, parseJewel, punchCost, unsocketCost } from '@/data/jewels';
import { canPunch, combineJewel, punchSocket, socketJewel, unsocketJewel } from '@/systems/jewels';
import { forgeItem, g, refresh, uiTick } from '../store';

type Sub = 'enhance' | 'reforge' | 'jewel' | 'craft';

export function ForgePanel() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const [sub, setSub] = useState<Sub>('enhance');
  const equipped = [...SLOTS.map(sl => s.equipment[sl]), ...SLOTS.map(sl => s.gear.alt[sl])].filter((x): x is Item => !!x);
  if (!forgeItem.value || !findItem(gm, forgeItem.value)) forgeItem.value = equipped[0]?.uid ?? s.inventory[0]?.uid ?? null;
  const sel = forgeItem.value ? findItem(gm, forgeItem.value)?.item ?? null : null;
  return (
    <div>
      <NpcHeader npc="glenn" lines={['+5 之前都很安全。再往上……就看你的運氣了，哈哈！', '分解不用的裝備，精華可以拿來重鑄詞綴。', '傳說碎片收集到 50 個，老頭子幫你打一件傳說！', '強化到 +10 的武器，會發出不一樣的光。']} />
      <div class="subtabs">
        {([['enhance', '🔨 強化'], ['reforge', '🎲 重鑄'], ['jewel', '💠 魔晶'], ['craft', '⚒️ 打造']] as [Sub, string][]).map(([id, n]) => (
          <button class={'btn sm' + (sub === id ? ' primary' : '')} onClick={() => setSub(id)}>{rich(n)}</button>
        ))}
        <span class="spacer" />
        <span class="row small" style={{ gap: '10px' }}>
          <Cost k="stones" n={s.cur.stones} /><Cost k="essence" n={s.cur.essence} /><Cost k="protect" n={s.cur.protect} /><Cost k="shards" n={s.cur.shards} />
        </span>
      </div>
      {sub === 'craft' ? <Craft /> : (
        <>
          {sub === 'jewel' ? <Jewels item={sel} /> : sel ? (sub === 'enhance' ? <Enhance item={sel} /> : <Reforge item={sel} />) : <div class="muted">先選一件裝備</div>}
          <h3>選擇裝備</h3>
          <div class="small muted" style={{ marginBottom: '6px' }}>身上裝備</div>
          <div class="items" style={{ marginBottom: '10px' }}>{equipped.map(it => <ItemSlot item={it} selected={it.uid === forgeItem.value} onClick={() => { forgeItem.value = it.uid; refresh(); }} />)}</div>
          <div class="small muted" style={{ marginBottom: '6px' }}>背包</div>
          <div class="items">{[...s.inventory].sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl).map(it => <ItemSlot item={it} selected={it.uid === forgeItem.value} onClick={() => { forgeItem.value = it.uid; refresh(); }} />)}</div>
        </>
      )}
    </div>
  );
}

function Enhance({ item }: { item: Item }) {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const [protect, setProtect] = useState(false);
  const [result, setResult] = useState<{ r: EnhanceResult; k: number } | null>(null);
  const cost = enhanceCost(item);
  const rate = enhanceRate(gm, item);
  const maxed = item.enh >= MAX_ENH;
  const risk = item.enh >= ENH_BREAK_FROM ? 'break' : item.enh >= ENH_DOWN_FROM ? 'down' : 'safe';
  const now = enhanceMult(item.enh), next = enhanceMult(item.enh + 1);
  const go = () => {
    const r = enhance(gm, item.uid, protect && risk !== 'safe');
    if (r) setResult({ r, k: Date.now() });
    if (r === 'break') forgeItem.value = null;
    refresh();
  };
  const text: Record<EnhanceResult, string> = { success: `強化成功！+${item.enh}`, fail: '強化失敗（無損失）', down: `強化失敗，降為 +${item.enh}`, break: '裝備碎裂了……', protected: '強化失敗（保護卷軸生效）' };
  return (
    <div class="card" style={{ marginBottom: '6px' }}>
      <div class="forge-main">
        <div class="forge-item"><ItemSlot item={item} /></div>
        <div>
          <div style={{ fontWeight: 900, fontSize: '17px', color: itemColor(item) }}>{item.enh > 0 ? `+${item.enh} ` : ''}{item.name}</div>
          {!maxed ? (
            <>
              {item.implicit.map(m => (
                <div class="small">{statLabel(m.stat)}　{fmtV(m.stat, m.value * now)} → <b class="good">{fmtV(m.stat, m.value * next)}</b></div>
              ))}
              <div class="row" style={{ gap: '16px', margin: '8px 0', alignItems: 'baseline' }}>
                <div><div class="tiny muted">成功率</div><div class="enh-rate">{rate}%</div></div>
                <div class="small">
                  <div>消耗：<Cost k="stones" n={cost.stones} have={s.cur.stones} />　<Cost k="gold" n={cost.gold} have={s.cur.gold} /></div>
                  <div>失敗時：{risk === 'safe' ? <span class="good">不會損失</span> : risk === 'down' ? <span style={{ color: 'var(--warn)' }}>強化等級 −1</span> : <span class="bad">裝備碎裂！</span>}</div>
                </div>
              </div>
              {risk !== 'safe' && (
                <label class="row small" style={{ marginBottom: '8px' }}>
                  <Switch on={protect} onChange={setProtect} />使用保護卷軸（持有 {s.cur.protect}）
                </label>
              )}
              <button class="btn primary lg" onClick={go}>強化 +{item.enh + 1}</button>
            </>
          ) : <div class="gold" style={{ margin: '10px 0' }}>已達強化上限 +{MAX_ENH}</div>}
          <div key={result?.k} class={'enh-anim ' + (result?.r ?? '')}>{result ? text[result.r] : ''}</div>
        </div>
      </div>
      <div class="tiny dim">+0～+4 失敗不會損失；+5～+9 失敗會降一級；+10 以上失敗會碎裂。保護卷軸可避免降級與碎裂。</div>
    </div>
  );
}

const fmtV = (stat: Parameters<typeof statIsPct>[0], v: number) => (statIsPct(stat) ? `${v.toFixed(1)}%` : fmt(Math.round(v)));

function Reforge({ item }: { item: Item }) {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const cv = reforgeCost(item, 'value');
  const cr = reforgeCost(item, 'reroll');
  return (
    <div class="card" style={{ marginBottom: '6px' }}>
      <div style={{ fontWeight: 900, fontSize: '16px', color: itemColor(item), marginBottom: '8px' }}>{item.enh > 0 ? `+${item.enh} ` : ''}{item.name}</div>
      {item.affixes.length === 0 && <div class="muted">這件裝備沒有詞綴。稀有度越高，詞綴越多。</div>}
      {item.affixes.map((a, i) => {
        const def = AFFIX_MAP.get(a.id)!;
        return (
          <div class="affix-row">
            <span class="grow">{describeMod({ stat: def.stat, kind: def.kind, value: a.value }, 1)}</span>
            <span class="qbar" title={`品質 ${Math.round(a.q * 100)}%`}><i style={{ width: `${a.q * 100}%` }} /></span>
            <button class="btn xs" title="保留詞綴種類，重新骰數值" onClick={() => { reforge(gm, item.uid, i, 'value'); refresh(); }}><Emo e="🎲" /> 數值 <Cost k="essence" n={cv.essence} have={s.cur.essence} /></button>
            {!item.unique && <button class="btn xs" title="換成另一個隨機詞綴" onClick={() => { reforge(gm, item.uid, i, 'reroll'); refresh(); }}><Emo e="🔄" /> 換詞綴 <Cost k="essence" n={cr.essence} have={s.cur.essence} /></button>}
          </div>
        );
      })}
      <div class="tiny dim">另外各需金幣：重骰數值 {fmt(cv.gold)}、換詞綴 {fmt(cr.gold)}。傳說裝備只能重骰數值。</div>
      <div class="sep" />
      <ItemCard item={item} />
    </div>
  );
}

const CRAFT_SLOTS: ItemSlotKind[] = ['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'belt', 'boots', 'amulet', 'ring'];

function Craft() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const [slot, setSlot] = useState<ItemSlotKind>('weapon');
  const cost = craftCost(s.hero.level);
  return (
    <div class="card">
      <div class="small muted" style={{ marginBottom: '8px' }}>指定部位打造一件你目前等級（Lv.{s.hero.level}）的裝備，保底稀有以上。</div>
      <div class="row wrap" style={{ gap: '6px', marginBottom: '12px' }}>
        {CRAFT_SLOTS.map(k => <span class={'chip' + (slot === k ? ' on' : '')} style={{ cursor: 'pointer' }} onClick={() => setSlot(k)}>{SLOT_LABEL[k]}</span>)}
      </div>
      <div class="row wrap" style={{ gap: '10px' }}>
        <button class="btn primary" onClick={() => { craft(gm, slot, false); refresh(); }}>
          <Emo e="⚒️" /> 打造{SLOT_LABEL[slot]}　<Cost k="essence" n={cost.essence} have={s.cur.essence} /> <Cost k="gold" n={cost.gold} have={s.cur.gold} />
        </button>
        <button class="btn" style={{ borderColor: 'var(--r4)' }} onClick={() => { craft(gm, slot, true); refresh(); }}>
          <Emo e="🌟" /> 打造傳說{SLOT_LABEL[slot]}　<Cost k="shards" n={LEGEND_SHARDS} have={s.cur.shards} />
        </button>
        <button class="btn" style={{ borderColor: 'var(--r3)' }} onClick={() => { fineCraft(gm, slot); refresh(); }} title={`只花金幣：物品等級 ${s.hero.level + FINE_CRAFT_ILVL}、保底史詩`}>
          <Emo e="🔨" /> 精工打造{SLOT_LABEL[slot]}（Lv.{s.hero.level + FINE_CRAFT_ILVL}、保底史詩）　<Cost k="gold" n={fineCraftPrice(s.hero.level)} have={s.cur.gold} />
        </button>
      </div>
      <div class="tiny dim" style={{ marginTop: '10px' }}>傳說碎片來自分解傳說／神話裝備。打造的物品會依自動規則放進背包。</div>
    </div>
  );
}

/** 魔晶：鑲嵌、取下、打孔與合成 */
function Jewels({ item }: { item: Item | null }) {
  // 訂閱介面刷新：props 不變時 signals 會略過重畫
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const owned = JEWELS.flatMap(d => Array.from({ length: JEWEL_MAX_TIER + 1 }, (_, t) => jewelKey(d.id, t)))
    .filter(k => (s.jewels[k] ?? 0) > 0)
    .sort((a, b) => parseJewel(b)!.tier - parseJewel(a)!.tier);
  const hasEmpty = !!item?.sockets?.includes(null);
  const act = (fn: () => unknown) => { fn(); refresh(); };
  const effect = (k: string) => {
    const m = jewelMods(k);
    return m.length > 1 ? `全元素抗性 +${m[0].value}%` : describeMod(m[0], 1);
  };
  return (
    <div class="card" style={{ marginBottom: '6px' }}>
      {item ? (
        <div class="forge-main">
          <div class="forge-item"><ItemSlot item={item} /></div>
          <div class="grow">
            <div style={{ fontWeight: 800, color: itemColor(item) }}>{item.name}</div>
            <div class="small muted" style={{ margin: '2px 0 8px' }}>鑲嵌孔 {item.sockets?.length ?? 0} / {MAX_SOCKETS[item.rarity]}（上限依稀有度）</div>
            {(item.sockets ?? []).map((k, i) => (
              <div class="row" style={{ gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                {k ? <JewelIcon jkey={k} size={26} /> : <Sockets item={{ ...item, sockets: [null] }} size={26} />}
                <span class="small grow">{k ? <>{jewelName(k)}・<span class="gold">{effect(k)}</span></> : <span class="dim">空孔：點下方魔晶鑲入</span>}</span>
                {k && <button class="btn xs" onClick={() => act(() => unsocketJewel(gm, item.uid, i))}>取下 <Cost k="gold" n={unsocketCost(parseJewel(k)!.tier)} have={s.cur.gold} /></button>}
              </div>
            ))}
            {canPunch(item) ? (() => {
              const c = punchCost(item.sockets?.length ?? 0, item.ilvl);
              return <button class="btn sm" style={{ marginTop: '4px' }} onClick={() => act(() => punchSocket(gm, item.uid))}>🔨 打孔 <Cost k="gold" n={c.gold} have={s.cur.gold} /> <Cost k="stones" n={c.stones} have={s.cur.stones} /></button>;
            })() : MAX_SOCKETS[item.rarity] === 0 && <div class="small dim">普通裝備無法打孔，稀有度越高可以打越多孔。</div>}
          </div>
        </div>
      ) : <div class="muted">先從下方選一件裝備</div>}
      <h3 style={{ marginTop: '12px' }}>魔晶袋</h3>
      {owned.length === 0 ? <div class="small muted">還沒有魔晶。擊敗首領必定掉落，精英怪也有機會掉落。</div> : (
        <div class="jewel-grid">
          {owned.map(k => (
            <div class="jewel-cell" title={hasEmpty ? '點擊鑲入選取的裝備' : '選取的裝備沒有空孔'} onClick={() => { if (item && hasEmpty) act(() => socketJewel(gm, item.uid, k)); else gm.toast(item ? '這件裝備沒有空的鑲嵌孔' : '先選一件裝備', 'warn', '💠'); }}>
              <JewelIcon jkey={k} size={30} />
              <div class="n">{jewelName(k)}<div class="tiny gold">{effect(k)}</div></div>
              <span class="c">×{s.jewels[k]}</span>
            </div>
          ))}
        </div>
      )}
      {owned.some(k => s.jewels[k] >= 3 && parseJewel(k)!.tier < JEWEL_MAX_TIER) && (
        <>
          <h3 style={{ marginTop: '12px' }}>合成（3 顆同級 → 1 顆高一級）</h3>
          <div class="row wrap" style={{ gap: '6px' }}>
            {owned.filter(k => s.jewels[k] >= 3 && parseJewel(k)!.tier < JEWEL_MAX_TIER).map(k => {
              const p = parseJewel(k)!;
              return (
                <button class="btn sm" onClick={() => act(() => combineJewel(gm, k))}>
                  <JewelIcon jkey={k} size={18} /> ×3 → <JewelIcon jkey={jewelKey(p.def.id, p.tier + 1)} size={18} /> <Cost k="gold" n={combineCost(p.tier)} have={s.cur.gold} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
