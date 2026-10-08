import type { ComponentChildren, CSSProperties } from 'preact';
import { artUrl } from '@/render/images';
import { jewelMods, jewelName, parseJewel } from '@/data/jewels';
import { Emo, rich } from './emoji';
import { useEffect, useRef, useState } from 'preact/hooks';
import { fmt, fmtDuration } from '@/core/format';
import { describeMod, statIsPct, statLabel } from '@/core/stats';
import type { GameState, Item } from '@/core/types';
import { RARITIES, SET_MAP, SLOT_LABEL, SLOTS, UNIQUE_MAP, tierOf, AFFIX_MAP } from '@/data/items';
import { describePower } from '@/data/powers';
import { NPCS, SCENES } from '@/data/story';
import { CLASSES, ADVANCES } from '@/data/classes';
import { currencyIcon, itemIcon, portrait, portraitArt, type CurrencyKey } from '@/render/icons';
import { itemColor, itemMods, reqLevel, canEquip, affixRange } from '@/systems/items';
import { setCounts, upgradeDelta } from '@/systems/hero';
import { salvageValue } from '@/systems/loot';
import { sellPrice, enhanceMult } from '@/core/formulas';
import { closeModal, g, modal, offlineReport, storyQueue, tip, toasts, uiTick } from './store';

/** 魔晶圖示：有美術圖用圖，沒有就畫一顆對應顏色的寶石；右下角標示等級 */
export function JewelIcon({ jkey, size = 28 }: { jkey: string; size?: number }) {
  const p = parseJewel(jkey);
  if (!p) return null;
  const url = artUrl(`art/gems/${p.def.id}`);
  return (
    <span class="jewel" style={{ width: size + 'px', height: size + 'px' }} title={jewelName(jkey)}>
      {url ? <img src={url} alt="" /> : <span class="jdot" style={{ background: p.def.color }} />}
      <span class="jt">{['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][p.tier]}</span>
    </span>
  );
}

/** 裝備上的鑲嵌孔 */
export function Sockets({ item, size = 22 }: { item: Item; size?: number }) {
  if (!item.sockets?.length) return null;
  const empty = artUrl('art/gems/socket');
  return (
    <span class="sockets">
      {item.sockets.map(k => k ? <JewelIcon jkey={k} size={size} /> : (
        <span class="jewel empty" style={{ width: size + 'px', height: size + 'px' }} title="空的鑲嵌孔">{empty ? <img src={empty} alt="" /> : null}</span>
      ))}
    </span>
  );
}

/** 技能圖示：有美術圖用圖，沒有就用 emoji */
export function SkillIcon({ def, size }: { def: { id: string; icon: string }; size: number }) {
  const url = artUrl(`art/skills/${def.id}`);
  if (url) return <img class="skimg" src={url} alt="" style={{ width: size + 'px', height: size + 'px' }} draggable={false} />;
  return <span style={{ fontSize: Math.round(size * 0.62) + 'px', lineHeight: 1 }}>{def.icon}</span>;
}

export function CIcon({ k, size }: { k: CurrencyKey; size?: 'sm' | 'lg' }) {
  return <img class={'cicon' + (size ? ' ' + size : '')} src={currencyIcon(k)} alt="" />;
}

export function Cost({ k, n, have }: { k: CurrencyKey; n: number; have?: number }) {
  const lack = have !== undefined && have < n;
  return <span class={'cost' + (lack ? ' bad' : '')}><CIcon k={k} size="sm" />{fmt(n)}</span>;
}

export function Bar({ value, max, kind, label, size, shield }: { value: number; max: number; kind: string; label?: string; size?: 'sm' | 'lg'; shield?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div class={'bar' + (size ? ' ' + size : '')}>
      <div class={'fill ' + kind} style={{ width: pct + '%' }} />
      {shield ? <div class="fill shield" style={{ width: Math.min(100, (shield / max) * 100) + '%' }} /> : null}
      {label !== undefined && <div class="label">{label}</div>}
    </div>
  );
}

export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <div class={'switch' + (on ? ' on' : '')} onClick={() => onChange(!on)} role="switch" aria-checked={on} />;
}

// ---------------------------------------------------------------------
// 裝備
// ---------------------------------------------------------------------
export function itemStyle(it: Item | null): CSSProperties {
  if (!it) return {};
  const R = RARITIES[it.rarity];
  return { '--rc': itemColor(it), '--rg': it.set ? 'rgba(74,224,160,.35)' : R.glow } as CSSProperties;
}

export function ItemSlot({ item, onClick, selected, label, showUp, small }: {
  item: Item | null; onClick?: () => void; selected?: boolean; label?: string; showUp?: boolean; small?: boolean;
}) {
  void uiTick.value;
  useEffect(() => () => { if (item && tip.value?.item === item) tip.value = null; }, [item]);
  if (!item) return <div class={'islot empty' + (small ? ' sm' : '')} onClick={onClick}><span class="slotname">{label}</span></div>;
  const s = g().state;
  const up = showUp && canEquip(item, s.hero.classId, s.hero.level) && upgradeDelta(s, item).delta > 0;
  const tooLow = s.hero.level < reqLevel(item);
  return (
    <div
      class={'islot' + (selected ? ' sel' : '') + (small ? ' sm' : '')}
      style={itemStyle(item)}
      onClick={onClick}
      onMouseEnter={e => { tip.value = { item, x: e.clientX, y: e.clientY }; }}
      onMouseMove={e => { if (tip.value?.item === item) tip.value = { item, x: e.clientX, y: e.clientY }; }}
      onMouseLeave={() => { tip.value = null; }}
    >
      <img src={itemIcon(item.slot, item.classId, tierOf(item.ilvl), item.unique)} alt="" draggable={false} />
      {item.enh > 0 && <span class="enh">+{item.enh}</span>}
      {up && <span class="up">▲</span>}
      {item.locked && <span class="lock"><Emo e="🔒" /></span>}
      {item.isNew && <span class="new" />}
      {item.sockets && item.sockets.length > 0 && <span class="skdots">{item.sockets.map(k => <i class={k ? 'on' : ''} style={k ? { background: parseJewel(k)?.def.color } : undefined} />)}</span>}
      {tooLow && <span class="req">Lv{reqLevel(item)}</span>}
    </div>
  );
}

function fmtModValue(stat: Parameters<typeof statLabel>[0], v: number) {
  return statIsPct(stat) ? `${v.toFixed(1)}%` : fmt(v);
}

export function ItemCard({ item, compare = true }: { item: Item; compare?: boolean }) {
  void uiTick.value;
  const s = g().state;
  const R = RARITIES[item.rarity];
  const color = itemColor(item);
  const em = enhanceMult(item.enh);
  const uq = item.unique ? UNIQUE_MAP.get(item.unique) : undefined;
  const set = item.set ? SET_MAP.get(item.set) : undefined;
  const equippedSets = setCounts(SLOTS.map(sl => s.equipment[sl]).filter((x): x is Item => !!x));
  const req = reqLevel(item);
  const wrongClass = (item.slot === 'weapon' || item.slot === 'offhand') && item.classId !== s.hero.classId;
  const delta = compare && canEquip(item, s.hero.classId, s.hero.level) && !isEquipped(s, item) ? upgradeDelta(s, item).delta : null;
  const sv = salvageValue(item);
  return (
    <div class="itemcard">
      <div class="iname" style={{ color }}>{item.enh > 0 ? `+${item.enh} ` : ''}{item.name}</div>
      <div class="itype">
        {set ? '套裝' : R.name}・{SLOT_LABEL[item.slot]}{item.classId ? `（${CLASSES[item.classId].name}）` : ''}・物品等級 {item.ilvl}
      </div>
      {item.implicit.map(m => (
        <div class="stat"><span>{statLabel(m.stat)}</span><span class="v">{fmtModValue(m.stat, statIsPct(m.stat) ? m.value * em : Math.round(m.value * em))}</span></div>
      ))}
      {item.affixes.length > 0 && <div class="sep" style={{ margin: '6px 0' }} />}
      {item.affixes.map(a => {
        const def = AFFIX_MAP.get(a.id)!;
        const [lo, hi] = affixRange(def, item.ilvl);
        return (
          <div class="aff">
            <span>{describeMod({ stat: def.stat, kind: def.kind, value: a.value }, 1)}</span>
            <span class="q">{Math.round(a.q * 100)}%　<span class="dim">{fmtNum(lo)}~{fmtNum(hi)}</span></span>
          </div>
        );
      })}
      {item.sockets && item.sockets.length > 0 && (
        <div style={{ marginTop: '6px' }}>
          {item.sockets.map(k => (
            <div class="aff socket-line">
              <span>{k ? <><JewelIcon jkey={k} size={16} /> {jewelMods(k).length > 1 ? `全元素抗性 +${jewelMods(k)[0].value}%` : describeMod(jewelMods(k)[0], 1)}</> : <span class="dim">◇ 空的鑲嵌孔</span>}</span>
              {k && <span class="q dim">{jewelName(k)}</span>}
            </div>
          ))}
        </div>
      )}
      {uq && <div class="power">★ {describePower(uq.power.id, uq.power.value * (item.rarity === 5 ? 1.3 : 1))}</div>}
      {set && (
        <div>
          <div class="setbonus on" style={{ marginTop: '8px' }}>{set.name}（{equippedSets.get(set.id) ?? 0}/4）</div>
          <div class={'setbonus' + ((equippedSets.get(set.id) ?? 0) >= 2 ? ' on' : '')}>(2) {set.bonus2.map(m => describeMod(m)).join('、')}</div>
          <div class={'setbonus' + ((equippedSets.get(set.id) ?? 0) >= 4 ? ' on' : '')}>(4) {[...set.bonus4.mods.map(m => describeMod(m)), set.bonus4.power ? describePower(set.bonus4.power.id, set.bonus4.power.value) : ''].filter(Boolean).join('、')}</div>
        </div>
      )}
      {uq && <div class="flavor">「{uq.flavor}」</div>}
      {s.hero.level < req && <div class="bad small" style={{ marginTop: '6px' }}>需要等級 {req}</div>}
      {wrongClass && <div class="bad small" style={{ marginTop: '6px' }}>職業不符</div>}
      {delta !== null && (
        <div class={'delta ' + (delta > 0 ? 'good' : delta < 0 ? 'bad' : 'muted')}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '＝'} 戰力 {delta > 0 ? '+' : ''}{fmt(Math.round(delta))}
        </div>
      )}
      <div class="small muted" style={{ marginTop: '6px', display: 'flex', gap: '10px' }}>
        <span>分解：<CIcon k="essence" size="sm" />{sv.essence}{sv.stones ? <> <CIcon k="stones" size="sm" />{sv.stones}</> : null}{sv.shards ? <> <CIcon k="shards" size="sm" />{sv.shards}</> : null}</span>
        <span>賣出：<CIcon k="gold" size="sm" />{fmt(sellPrice(item.ilvl, item.rarity))}</span>
      </div>
    </div>
  );
}

const fmtNum = (n: number) => (Math.abs(n) < 10 ? n.toFixed(1) : String(Math.round(n)));
const isEquipped = (s: GameState, it: Item) => SLOTS.some(sl => s.equipment[sl]?.uid === it.uid);

export function TooltipHost() {
  const t = tip.value;
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(320);
  useEffect(() => {
    if (ref.current && ref.current.offsetHeight !== h) setH(ref.current.offsetHeight);
  });
  if (!t || matchMedia('(hover: none)').matches) return null;
  void uiTick.value;
  const W = 300;
  let left = t.x + 18;
  if (left + W > window.innerWidth - 8) left = Math.max(8, t.x - W - 18);
  const top = Math.max(8, Math.min(t.y + 12, window.innerHeight - h - 8));
  return <div class="tip" ref={ref} style={{ left: `${left}px`, top: `${top}px` }}><ItemCard item={t.item} /></div>;
}

// ---------------------------------------------------------------------
// 浮層
// ---------------------------------------------------------------------
export function Toasts() {
  return (
    <div class="toasts">
      {toasts.value.map(t => (
        <div key={t.id} class={`toast ${t.kind}${t.out ? ' out' : ''}`}>{t.icon && <span>{rich(t.icon)}</span>}<span>{t.text}</span></div>
      ))}
    </div>
  );
}

export function ModalHost() {
  const m = modal.value;
  if (!m) return null;
  return (
    <div class="modal-bg" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div class="modal panel">{m()}</div>
    </div>
  );
}

export function Modal({ title, children, actions }: { title: string; children: ComponentChildren; actions?: ComponentChildren }) {
  return (
    <>
      <h2>{title}</h2>
      {children}
      <div class="actions">{actions ?? <button class="btn primary" onClick={closeModal}>好</button>}</div>
    </>
  );
}

export function confirmModal(title: string, body: ComponentChildren, onYes: () => void, yesText = '確定', danger = false) {
  modal.value = () => (
    <Modal title={title} actions={<>
      <button class="btn" onClick={closeModal}>取消</button>
      <button class={'btn ' + (danger ? 'danger' : 'primary')} onClick={() => { closeModal(); onYes(); }}>{yesText}</button>
    </>}>{body}</Modal>
  );
}

export function StoryOverlay() {
  void uiTick.value;
  const id = storyQueue.value[0];
  const [line, setLine] = useState(0);
  const [shown, setShown] = useState(0);
  const scene = id ? SCENES[id] : undefined;
  const cur = scene?.lines[line];
  useEffect(() => { setLine(0); }, [id]);
  useEffect(() => {
    if (!cur) return;
    setShown(0);
    const timer = setInterval(() => setShown(n => (n >= cur.text.length ? n : n + 1)), 28);
    return () => clearInterval(timer);
  }, [id, line]);
  if (!scene || !cur) return null;
  const s = g().state;
  const npc = cur.who === 'hero' ? null : NPCS[cur.who];
  const heroLook = s.hero.advId ? { ...CLASSES[s.hero.classId].look, ...ADVANCES[s.hero.advId].look } : CLASSES[s.hero.classId].look;
  const next = () => {
    if (shown < cur.text.length) { setShown(cur.text.length); return; }
    if (line + 1 < scene.lines.length) setLine(line + 1);
    else { storyQueue.value = storyQueue.value.slice(1); setLine(0); }
  };
  return (
    <div class="story" onClick={next}>
      <div class="box panel">
        {line === 0 && <div class="scene-title">{scene.title}</div>}
        {(() => {
          const art = npc ? portraitArt(npc.id) : (s.hero.advId ? portraitArt(s.hero.advId) : null) ?? portraitArt(s.hero.classId);
          return <img class={'face' + (art ? ' art' : '')} src={art ?? portrait(npc ? npc.look : heroLook, 120)} alt="" />;
        })()}
        <div>
          <div class="who">{npc ? npc.name : s.hero.name}<small>{npc ? npc.title : CLASSES[s.hero.classId].name}</small></div>
          <div class="txt">{cur.text.slice(0, shown)}</div>
        </div>
        <div class="next">點擊繼續 ▶</div>
      </div>
    </div>
  );
}

export function OfflineModal() {
  const r = offlineReport.value;
  if (!r) return null;
  const close = () => { offlineReport.value = null; };
  return (
    <div class="modal-bg" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div class="modal panel">
        <h2><Emo e="🌙" /> 歡迎回來</h2>
        <div class="muted">你離開了 {fmtDuration(r.away)}{r.away > r.counted ? `（計算上限 ${fmtDuration(r.counted)}）` : ''}，你的角色仍在持續冒險：</div>
        <div class="offline-grid">
          <div class="c"><div class="k">經驗</div><div class="v">+{fmt(r.xp)}</div></div>
          <div class="c"><div class="k"><CIcon k="gold" size="sm" /> 金幣</div><div class="v">+{fmt(r.gold)}</div></div>
          <div class="c"><div class="k">擊殺</div><div class="v">{fmt(r.kills)}</div></div>
          <div class="c"><div class="k">等級</div><div class="v">{r.levels > 0 ? `+${r.levels}` : '—'}</div></div>
          <div class="c"><div class="k"><CIcon k="stones" size="sm" /> 強化石</div><div class="v">+{fmt(r.stones)}</div></div>
          <div class="c"><div class="k">裝備</div><div class="v">{r.items.kept.length}<span class="small muted">（分解 {r.items.salvaged}）</span></div></div>
        </div>
        {r.items.byRarity.some((n, i) => i >= 2 && n > 0) && (
          <div class="row wrap small">
            {r.items.byRarity.map((n, i) => (n > 0 && i >= 1 ? <span class="chip" style={{ color: RARITIES[i].color }}>{RARITIES[i].name} ×{n}</span> : null))}
          </div>
        )}
        <div class="small dim" style={{ marginTop: '8px' }}>離線收益為線上效率的 70%。</div>
        <div class="actions"><button class="btn primary" onClick={close}>收下</button></div>
      </div>
    </div>
  );
}

export { itemMods };

/** 面板頂端的 NPC 招呼 */
export function NpcHeader({ npc, lines }: { npc: keyof typeof NPCS; lines: string[] }) {
  const n = NPCS[npc];
  const [i] = useState(() => Math.floor(Math.random() * lines.length));
  return (
    <div class="npc-header">
      {(() => { const art = portraitArt(n.id); return <img class={art ? 'art' : ''} src={art ?? portrait(n.look, 96)} alt="" />; })()}
      <div>
        <div class="who">{n.name}<small>{n.title}</small></div>
        <div class="say">「{lines[i]}」</div>
      </div>
    </div>
  );
}
