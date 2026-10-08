import { fmt, fmtDuration } from '@/core/format';
import { Emo, rich } from '../emoji';
import { potionHeal, potionPrice, stonePrice } from '@/core/formulas';
import { BLESSINGS, GEM_SHOP } from '@/data/shop';
import { invCapacity } from '@/systems/loot';
import { buyBlessing, buyInvSlots, buyMerchant, buyPotion, buyProtect, buyStones, ensureMerchant, merchantPrice, PROTECT_GEMS, refreshMerchant } from '@/systems/shop';
import { currencyIcon } from '@/render/icons';
import { Cost, ItemCard, ItemSlot, NpcHeader, confirmModal } from '../common';
import { g, refresh } from '../store';

export function ShopPanel() {
  const gm = g();
  const s = gm.state;
  const L = s.hero.level;
  ensureMerchant(gm);
  const act = (fn: () => void) => { fn(); refresh(); };
  const now = gm.now();
  return (
    <div>
      <NpcHeader npc="sal" lines={['嘿，騎士。大陸各地的好東西，薩爾這裡都有。', '祝福可以疊加時間，掛機前買一個最划算。', '每四個小時進一批新貨，記得常來看看。', '背包不夠放？薩爾也賣空間，童叟無欺。']} />
      <h3>藥水 <span class="count">生命低於 {s.settings.potionAt}% 時自動使用</span></h3>
      <div class="list">
        {([0, 1, 2] as const).map(t => (
          <div class="li">
            <div class="ic"><img src={currencyIcon(`potion${t}`)} alt="" /></div>
            <div class="grow"><div class="t">{['初級', '中級', '高級'][t]}治療藥水</div><div class="d">回復 {potionHeal(t) * 100}% 生命・持有 {s.potions[t]}</div></div>
            <button class="btn sm" onClick={() => act(() => buyPotion(gm, t, 1))}><Cost k="gold" n={potionPrice(t, L)} have={s.cur.gold} /></button>
            <button class="btn sm" onClick={() => act(() => buyPotion(gm, t, 10))}>×10</button>
          </div>
        ))}
      </div>

      <h3>強化材料</h3>
      <div class="list">
        <div class="li">
          <div class="ic"><img src={currencyIcon('stones')} alt="" /></div>
          <div class="grow"><div class="t">強化石</div><div class="d">強化裝備的必要材料・持有 {fmt(s.cur.stones)}</div></div>
          <button class="btn sm" onClick={() => act(() => buyStones(gm, 1))}><Cost k="gold" n={stonePrice(L)} have={s.cur.gold} /></button>
          <button class="btn sm" onClick={() => act(() => buyStones(gm, 10))}>×10</button>
        </div>
        <div class="li">
          <div class="ic"><img src={currencyIcon('protect')} alt="" /></div>
          <div class="grow"><div class="t">保護卷軸</div><div class="d">強化失敗時避免降級與碎裂・持有 {s.cur.protect}</div></div>
          <button class="btn sm" onClick={() => act(() => buyProtect(gm))}><Cost k="gems" n={PROTECT_GEMS} have={s.cur.gems} /></button>
        </div>
      </div>

      <h3>祝福 <span class="count">30 分鐘，可疊加時間</span></h3>
      <div class="list">
        {BLESSINGS.map(b => {
          const active = s.buffs.find(x => x.id === b.id && x.until > now);
          return (
            <div class={'li' + (active ? ' done' : '')}>
              <div class="ic">{rich(b.icon)}</div>
              <div class="grow"><div class="t">{b.name}</div><div class="d">{b.desc}{active ? `・剩餘 ${fmtDuration(active.until - now)}` : ''}</div></div>
              <button class="btn sm" onClick={() => act(() => buyBlessing(gm, b.id))}><Cost k="gems" n={b.gems} have={s.cur.gems} /></button>
            </div>
          );
        })}
      </div>

      <h3>旅行商人薩爾 <span class="count">{fmtDuration(Math.max(0, s.merchant.refreshAt - now))} 後補貨</span></h3>
      <div class="items" style={{ marginBottom: '8px' }}>
        {s.merchant.items.map(it => (
          <div class="col" style={{ gap: '4px', alignItems: 'center' }}>
            <ItemSlot item={it} onClick={() => confirmModal('購買裝備', <><div class="card"><ItemCard item={it} /></div><p>價格 <Cost k="gold" n={merchantPrice(it)} have={s.cur.gold} /></p></>, () => act(() => buyMerchant(gm, it.uid)), '購買')} />
            <span class="tiny"><Cost k="gold" n={merchantPrice(it)} have={s.cur.gold} /></span>
          </div>
        ))}
        {s.merchant.items.length === 0 && <div class="muted small">賣完了！</div>}
      </div>
      <div class="row" style={{ gap: '6px' }}>
        <button class="btn sm" onClick={() => act(() => refreshMerchant(gm))}>立即補貨 <Cost k="gems" n={GEM_SHOP.merchantRefresh.gems} /></button>
        <span class="tiny dim">點擊商品查看詳情與購買</span>
      </div>

      <h3>其他</h3>
      <div class="list">
        <div class="li">
          <div class="ic"><Emo e="🎒" /></div>
          <div class="grow"><div class="t">擴充背包 +{GEM_SHOP.invSlots.amount}</div><div class="d">目前容量 {invCapacity(gm)}</div></div>
          <button class="btn sm" disabled={s.invCapacity >= GEM_SHOP.invSlots.max} onClick={() => act(() => buyInvSlots(gm))}><Cost k="gems" n={GEM_SHOP.invSlots.gems} have={s.cur.gems} /></button>
        </div>
      </div>
      <div class="tiny dim" style={{ marginTop: '10px' }}>寶石來自首次通關、成就、每日任務與無盡之塔。本遊戲沒有任何付費內容。</div>
    </div>
  );
}
