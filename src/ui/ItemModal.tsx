import type { Item, SlotId } from '@/core/types';
import { SLOTS, slotKind } from '@/data/items';
import { canEquip } from '@/systems/items';
import { equipItem, findItem, toggleLock, unequipItem } from '@/systems/forge';
import { salvageItems, sellItems } from '@/systems/loot';
import { upgradeDelta } from '@/systems/hero';
import { ItemCard, confirmModal } from './common';
import { closeModal, forgeItem, g, openModal, refresh, tab, tip } from './store';

function ItemModalBody({ uid }: { uid: number }) {
  const gm = g();
  const f = findItem(gm, uid);
  if (!f) { closeModal(); return null; }
  const it = f.item;
  const s = gm.state;
  const equippable = canEquip(it, s.hero.classId, s.hero.level);
  const target: SlotId | undefined = f.where === 'inv' && equippable ? upgradeDelta(s, it).slot : undefined;
  const compareWith = f.where === 'inv'
    ? (it.slot === 'ring' ? [s.equipment.ring1, s.equipment.ring2] : [s.equipment[it.slot as SlotId]]).filter((x): x is Item => !!x)
    : [];
  if (it.isNew) it.isNew = false;
  const act = (fn: () => void) => { fn(); refresh(); };
  return (
    <>
      <div class="card" style={{ marginBottom: '10px' }}><ItemCard item={it} /></div>
      {compareWith.length > 0 && (
        <details>
          <summary class="small muted" style={{ cursor: 'pointer' }}>目前裝備中（{compareWith.length}）</summary>
          {compareWith.map(c => <div class="card" style={{ marginTop: '6px', opacity: 0.85 }}><ItemCard item={c} compare={false} /></div>)}
        </details>
      )}
      <div class="actions">
        {f.where === 'inv' && it.slot === 'ring' && equippable && (
          <>
            <button class="btn sm" onClick={() => act(() => { equipItem(gm, uid, 'ring1'); closeModal(); })}>戴左手</button>
            <button class="btn sm" onClick={() => act(() => { equipItem(gm, uid, 'ring2'); closeModal(); })}>戴右手</button>
          </>
        )}
        {f.where === 'inv' && it.slot !== 'ring' && (
          <button class="btn primary" disabled={!equippable} onClick={() => act(() => { equipItem(gm, uid, target); closeModal(); })}>裝備</button>
        )}
        {f.where === 'equip' && <button class="btn" onClick={() => act(() => { unequipItem(gm, f.slot!); closeModal(); })}>卸下</button>}
        <button class="btn" onClick={() => { forgeItem.value = uid; tab.value = 'forge'; closeModal(); }}>🔨 鍛造</button>
        <button class="btn" onClick={() => act(() => toggleLock(gm, uid))}>{it.locked ? '🔓 解鎖' : '🔒 上鎖'}</button>
        {f.where === 'inv' && (
          <>
            <button class="btn" disabled={it.locked} onClick={() => {
              const go = () => act(() => { salvageItems(gm, [uid]); closeModal(); });
              if (it.rarity >= 4 || it.enh >= 7) confirmModal('確定分解？', <p>{it.name}（+{it.enh}）將被分解。</p>, go, '分解', true);
              else go();
            }}>♻️ 分解</button>
            <button class="btn" disabled={it.locked} onClick={() => act(() => { sellItems(gm, [uid]); closeModal(); })}>💰 賣出</button>
          </>
        )}
        <button class="btn ghost" onClick={closeModal}>關閉</button>
      </div>
    </>
  );
}

export function openItem(uid: number) {
  tip.value = null;
  openModal(() => <ItemModalBody uid={uid} />);
}

export const equippedSlots = SLOTS;
export { slotKind };
