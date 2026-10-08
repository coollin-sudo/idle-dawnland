import { fmt, fmtDuration } from '@/core/format';
import { Emo, Stars } from '../emoji';
import { describeMod } from '@/core/stats';
import type { PetDef } from '@/core/types';
import { RARITIES } from '@/data/items';
import { EGGS, PET_MAX_LEVEL, PET_MAX_STARS, PETS, petPassiveMult, petStarCost, petXpToNext } from '@/data/pets';
import { GEM_SHOP } from '@/data/shop';
import { petThumb } from '@/render/icons';
import { buyEgg, buyHatchSlot, claimEgg, feedPet, hatchCost, hatchingCount, setActivePet, speedHatch, starUp, startHatch } from '@/systems/pets';
import { Bar, CIcon, Cost, Modal, NpcHeader } from '../common';
import { closeModal, g, openModal, refresh } from '../store';

const petImg = (p: PetDef) => petThumb(p, 96);

function PetDetail({ id }: { id: string }) {
  const gm = g();
  const s = gm.state;
  const def = PETS.find(p => p.id === id)!;
  const ps = s.pets.owned[id];
  if (!ps) return null;
  const mult = petPassiveMult(ps.level, ps.stars);
  const cost = petStarCost(ps.stars);
  const act = (fn: () => void) => { fn(); refresh(); };
  return (
    <Modal title={def.name} actions={<button class="btn" onClick={closeModal}>關閉</button>}>
      <div class="row" style={{ gap: '14px', alignItems: 'flex-start' }}>
        <img src={petImg(def)} style={{ width: '110px', height: '110px' }} alt="" />
        <div class="grow">
          <div style={{ color: RARITIES[def.rarity].color, fontWeight: 800 }}>{RARITIES[def.rarity].name}・<Stars n={ps.stars} max={PET_MAX_STARS} /></div>
          <div class="small muted">{def.desc}</div>
          <div style={{ marginTop: '6px' }}>Lv.{ps.level}{ps.level < PET_MAX_LEVEL ? '' : '（滿級）'}</div>
          {ps.level < PET_MAX_LEVEL && <Bar value={ps.xp} max={petXpToNext(ps.level)} kind="green" size="sm" />}
          <div class="small" style={{ marginTop: '6px' }}>出戰加成：{describeMod({ ...def.passive, value: def.passive.value * mult }, 1)}</div>
          <div class="small muted">收藏加成（未出戰）：{describeMod({ ...def.passive, value: def.passive.value * mult * 0.25 }, 1)}</div>
          <div class="small muted">攻擊：每 {def.interval} 秒造成英雄攻擊力 {Math.round(def.mult * (1 + ps.level * 0.03) * (1 + ps.stars * 0.3) * 100)}% 的傷害</div>
        </div>
      </div>
      <div class="row wrap" style={{ gap: '6px', marginTop: '12px' }}>
        {s.pets.active !== id ? <button class="btn primary" onClick={() => act(() => setActivePet(gm, id))}>出戰</button> : <button class="btn" onClick={() => act(() => setActivePet(gm, null))}>休息</button>}
        <button class="btn" disabled={ps.level >= PET_MAX_LEVEL} onClick={() => act(() => feedPet(gm, id, 1))}>餵食 ×1 <Cost k="petFood" n={1} have={s.cur.petFood} /></button>
        <button class="btn" disabled={ps.level >= PET_MAX_LEVEL} onClick={() => act(() => feedPet(gm, id, 10))}>×10</button>
        <button class="btn" disabled={ps.stars >= PET_MAX_STARS || ps.dupes < cost} onClick={() => act(() => starUp(gm, id))}><Emo e="⭐" /> 升星（{ps.dupes}/{cost}）</button>
      </div>
    </Modal>
  );
}

export function PetsPanel() {
  const gm = g();
  const s = gm.state;
  const now = gm.now();
  const hatching = hatchingCount(gm);
  return (
    <div>
      <NpcHeader npc="bobo" lines={['把蛋交給我孵，孵出來的寶寶會跟你一起戰鬥喔！', '重複的寵物不要浪費，可以拿來升星！', '寵物飼料可以讓寶寶長大，首領常常會掉。', '傳說寵物蛋裡面……說不定是一條龍呢！']} />
      <div class="row between">
        <h3 style={{ margin: '0px' }}>寵物蛋 <span class="count">孵化槽 {hatching}/{s.pets.slots}</span></h3>
        <span class="row small" style={{ gap: '10px' }}><Cost k="petFood" n={s.cur.petFood} /> <Cost k="gems" n={s.cur.gems} /></span>
      </div>
      <div class="eggs" style={{ margin: '10px 0' }}>
        {s.pets.eggs.length === 0 && <div class="muted small">還沒有寵物蛋。首領有機率掉落，也可以在下方購買。</div>}
        {s.pets.eggs.map(e => {
          const ready = e.readyAt !== null && e.readyAt <= now;
          const left = e.readyAt !== null ? Math.max(0, e.readyAt - now) : EGGS[e.tier].hatchMs;
          return (
            <div class={'egg' + (e.readyAt !== null ? (ready ? ' ready' : ' hatching') : '')}>
              <img src={eggIcon(e.tier)} alt="" />
              <div class="tiny">{EGGS[e.tier].name}</div>
              <div class="tiny muted">{ready ? '可以孵化了！' : e.readyAt !== null ? fmtDuration(left) : `需 ${fmtDuration(left)}`}</div>
              {ready ? <button class="btn xs primary" onClick={() => { claimEgg(gm, e.uid); refresh(); }}>破殼！</button>
                : e.readyAt !== null ? <button class="btn xs" onClick={() => { speedHatch(gm, e.uid); refresh(); }}>加速 <Cost k="gems" n={hatchCost(gm, e.uid)} /></button>
                  : <button class="btn xs" disabled={hatching >= s.pets.slots} onClick={() => { startHatch(gm, e.uid); refresh(); }}>開始孵化</button>}
            </div>
          );
        })}
      </div>
      <div class="row wrap" style={{ gap: '6px' }}>
        {GEM_SHOP.eggs.map(e => <button class="btn sm" onClick={() => { buyEgg(gm, e.tier); refresh(); }}>買{EGGS[e.tier].name} <Cost k="gems" n={e.gems} have={s.cur.gems} /></button>)}
        {s.pets.slots < GEM_SHOP.petSlot.max && <button class="btn sm" onClick={() => { buyHatchSlot(gm); refresh(); }}>孵化槽 +1 <Cost k="gems" n={GEM_SHOP.petSlot.gems} have={s.cur.gems} /></button>}
      </div>

      <h3>寵物圖鑑 <span class="count">{Object.keys(s.pets.owned).length}/{PETS.length}</span></h3>
      <div class="pets">
        {PETS.map(p => {
          const ps = s.pets.owned[p.id];
          return (
            <div class={'pet' + (ps ? '' : ' unowned') + (s.pets.active === p.id ? ' active' : '')} style={{ '--rc': RARITIES[p.rarity].color } as never} onClick={() => ps && openModal(() => <PetDetail id={p.id} />)}>
              <img src={petImg(p)} alt="" />
              <div style={{ fontWeight: 800, fontSize: '13px' }}>{p.name}</div>
              {ps ? (
                <>
                  <div class="stars"><Stars n={ps.stars} max={PET_MAX_STARS} /></div>
                  <div class="tiny muted">Lv.{ps.level}{s.pets.active === p.id ? '・出戰中' : ''}</div>
                </>
              ) : <div class="tiny dim">未擁有</div>}
              <div class="tiny" style={{ color: '#9ad0ff' }}>{describeMod(p.passive, 0)}</div>
            </div>
          );
        })}
      </div>
      <div class="tiny dim" style={{ marginTop: '10px' }}>出戰寵物會跟你一起戰鬥，所有擁有的寵物都會提供 25% 的收藏加成。重複孵到的寵物可以用來升星。目前擁有 {fmt(Object.keys(s.pets.owned).length)} 隻。</div>
    </div>
  );
}

import { currencyIcon } from '@/render/icons';
const eggIcon = (t: 0 | 1 | 2) => currencyIcon(('egg' + t) as 'egg0');
void CIcon;
