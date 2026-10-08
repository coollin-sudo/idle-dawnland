import { useState } from 'preact/hooks';
import { Emo } from '../emoji';
import type { Item, ItemSlotKind, Rarity } from '@/core/types';
import { RARITIES } from '@/data/items';
import { bulkFilter, invCapacity, salvageItems, sellItems, salvageValue } from '@/systems/loot';
import { upgradeDelta } from '@/systems/hero';
import { canEquip } from '@/systems/items';
import { CIcon, ItemSlot, confirmModal } from '../common';
import { openItem } from '../ItemModal';
import { g, refresh, uiTick } from '../store';

type Filter = 'all' | 'weapon' | 'armor' | 'jewel';
const FILTERS: [Filter, string][] = [['all', '全部'], ['weapon', '武器副手'], ['armor', '防具'], ['jewel', '飾品']];
const inFilter = (k: ItemSlotKind, f: Filter) =>
  f === 'all' || (f === 'weapon' ? k === 'weapon' || k === 'offhand' : f === 'jewel' ? k === 'amulet' || k === 'ring' : !['weapon', 'offhand', 'amulet', 'ring'].includes(k));

type Sort = 'rarity' | 'level' | 'upgrade' | 'new';

export function BagPanel() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('rarity');
  let list = s.inventory.filter(i => inFilter(i.slot, filter));
  const deltaCache = new Map<number, number>();
  const delta = (it: Item) => {
    if (!deltaCache.has(it.uid)) deltaCache.set(it.uid, canEquip(it, s.hero.classId, s.hero.level) ? upgradeDelta(s, it).delta : -Infinity);
    return deltaCache.get(it.uid)!;
  };
  list = [...list].sort((a, b) => {
    if (sort === 'level') return b.ilvl - a.ilvl || b.rarity - a.rarity;
    if (sort === 'upgrade') return delta(b) - delta(a);
    if (sort === 'new') return Number(!!b.isNew) - Number(!!a.isNew) || b.uid - a.uid;
    return b.rarity - a.rarity || b.ilvl - a.ilvl;
  });
  const bulk = (r: Rarity, mode: 'salvage' | 'sell') => {
    const uids = bulkFilter(gm, r);
    if (!uids.length) return gm.toast('沒有符合的裝備（上鎖、套裝與比身上好的會保留）', 'warn');
    const items = s.inventory.filter(i => uids.includes(i.uid));
    const ess = items.reduce((a, i) => a + salvageValue(i).essence, 0);
    confirmModal(mode === 'salvage' ? '批次分解' : '批次賣出', <p>{mode === 'salvage' ? '分解' : '賣出'} {uids.length} 件{RARITIES[r].name}以下的裝備？{mode === 'salvage' && <>（約 <CIcon k="essence" size="sm" />{ess}）</>}</p>, () => {
      if (mode === 'salvage') salvageItems(gm, uids); else sellItems(gm, uids);
      refresh();
    }, mode === 'salvage' ? '分解' : '賣出');
  };
  return (
    <div>
      <div class="row between wrap" style={{ marginBottom: '10px' }}>
        <h3 style={{ margin: '0px' }}>背包 <span class="count">{s.inventory.length} / {invCapacity(gm)}</span></h3>
        <div class="row wrap" style={{ gap: '4px' }}>
          {FILTERS.map(([id, n]) => <span class={'chip' + (filter === id ? ' on' : '')} style={{ cursor: 'pointer' }} onClick={() => setFilter(id)}>{n}</span>)}
        </div>
      </div>
      <div class="row wrap small" style={{ marginBottom: '10px', gap: '6px' }}>
        <span class="muted">排序</span>
        {([['rarity', '稀有度'], ['level', '等級'], ['upgrade', '戰力提升'], ['new', '最新']] as [Sort, string][]).map(([id, n]) => (
          <span class={'chip' + (sort === id ? ' on' : '')} style={{ cursor: 'pointer' }} onClick={() => setSort(id)}>{n}</span>
        ))}
        <span class="spacer" />
        <button class="btn xs" onClick={() => { s.inventory.forEach(i => { i.isNew = false; }); refresh(); }}>全部已讀</button>
      </div>
      {list.length ? (
        <div class="items">{list.map(it => <ItemSlot key={it.uid} item={it} showUp onClick={() => openItem(it.uid)} />)}</div>
      ) : <div class="muted" style={{ padding: '20px', textAlign: 'center' }}>背包空空的。打倒怪物會掉落裝備！</div>}
      <h3>批次處理</h3>
      <div class="small muted" style={{ marginBottom: '6px' }}>上鎖、套裝、傳說，以及比身上裝備更好的不會被處理。</div>
      <div class="row wrap" style={{ gap: '6px' }}>
        {([0, 1, 2, 3] as Rarity[]).map(r => (
          <button class="btn sm" onClick={() => bulk(r, 'salvage')}><Emo e="♻️" /> 分解<span style={{ color: RARITIES[r].color }}>{RARITIES[r].name}</span>{r > 0 ? '以下' : ''}</button>
        ))}
        <button class="btn sm" onClick={() => bulk(1, 'sell')}><Emo e="💰" /> 賣出優良以下</button>
      </div>
    </div>
  );
}
