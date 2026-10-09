import { fmt } from '@/core/format';
import { Emo } from '../emoji';
import { ADVANCE_LEVEL, armorDR, evadeChance } from '@/core/formulas';
import { describeMod, PRIMARY, statLabel, type Primary, type StatBlock, type StatKey } from '@/core/stats';
import type { AdvId, SlotId } from '@/core/types';
import { ADVANCES, CLASSES, advancesOf } from '@/data/classes';
import { RARITIES, SET_MAP, SLOT_LABEL, slotKind } from '@/data/items';
import { describePower } from '@/data/powers';
import { classSkills } from '@/data/skills';
import { combatPower, heroPowers, heroStats, setCounts } from '@/systems/hero';
import { advance, allocate, autoSpend, resetStats, RESET_STATS_GEMS } from '@/systems/progression';
import { CIcon, ItemSlot, Modal, Switch, confirmModal } from '../common';
import { HeroPreview } from '../HeroPreview';
import { ShareCardButton } from '../ShareCard';
import { heroLookOf } from '../GameScreen';
import { openItem } from '../ItemModal';
import { closeModal, g, gearView, openModal, refresh, uiTick } from '../store';
import { equipToGear, GEAR_NAMES, gearOf, requestGear, unequipFromGear } from '@/systems/gearsets';
import { canEquip, itemDisplayName, reqLevel } from '@/systems/items';

const LEFT: SlotId[] = ['weapon', 'helmet', 'armor', 'gloves', 'belt'];
const RIGHT: SlotId[] = ['offhand', 'amulet', 'ring1', 'ring2', 'boots'];

const ATTR_HELP: Record<Primary, string> = {
  str: '物理攻擊 +2、生命 +3',
  dex: '物攻 +1、暴擊、迴避、攻速',
  int: '魔法攻擊 +2.5、魔力、魔抗',
  vit: '生命 +12、防禦 +0.6',
};

export function HeroPanel() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const h = s.hero;
  const c = CLASSES[h.classId];
  const st = heroStats(s);
  const items = Object.values(s.equipment).filter(Boolean) as NonNullable<typeof s.equipment.weapon>[];
  const sets = setCounts(items);
  const powers = heroPowers(s);
  const view = gearView.value ?? s.gear.active;
  const eq = gearOf(s, view);
  const viewPower = view === s.gear.active ? combatPower(s, st) : (() => { const t = { ...s, equipment: s.gear.alt }; return combatPower(t, heroStats(t)); })();
  const slotEl = (sl: SlotId) => (
    <ItemSlot item={eq[sl]} label={SLOT_LABEL[slotKind(sl)]} onClick={() => openPicker(view, sl)} />
  );
  return (
    <div>
      <div class="gearsets">
        {([0, 1] as const).map(n => (
          <button class={'btn sm' + (view === n ? ' primary' : '')} onClick={() => { gearView.value = n; refresh(); }}>
            配裝 {GEAR_NAMES[n]}
            {s.gear.active === n && <span class="gs-tag on">使用中</span>}
            {s.gear.want === n && s.gear.active !== n && <span class="gs-tag next">下一波換上</span>}
          </button>
        ))}
        <span class="spacer" />
        {view !== s.gear.want
          ? <button class="btn sm good" onClick={() => { requestGear(gm, view); refresh(); }}>下一波改用配裝 {GEAR_NAMES[view]}</button>
          : s.gear.want !== s.gear.active
            ? <button class="btn sm ghost" onClick={() => { requestGear(gm, s.gear.active); refresh(); }}>取消切換</button>
            : null}
      </div>
      {view !== s.gear.active && (
        <div class="small muted" style={{ marginBottom: '6px' }}>
          正在編輯配裝 {GEAR_NAMES[view]}（尚未穿上，換上後戰力 {fmt(viewPower)}）。在背包點裝備會穿到這一套；切換在下一波戰鬥開始時生效。
        </div>
      )}
      <div class="paperdoll">
        <div class="colslots">{LEFT.map(slotEl)}</div>
        <div class="figure">
          <HeroPreview look={heroLookOf()} art={[h.advId, h.classId]} size={220} attackEvery={3.2} />
          <div style={{ position: 'absolute', top: '8px', left: '0px', right: '0px', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: '16px' }}>{h.advId ? ADVANCES[h.advId].name : c.name}</div>
            <div class="small gold">戰力 {fmt(viewPower)}{view !== s.gear.active ? '（換上後）' : ''}</div>
          </div>
        </div>
        <div class="colslots">{RIGHT.map(slotEl)}</div>
      </div>

      <div class="row" style={{ justifyContent: 'flex-end', marginTop: '8px' }}><ShareCardButton /></div>

      {h.level >= ADVANCE_LEVEL && !h.advId && <AdvanceBox />}

      <h3>屬性 {h.statPoints > 0 && <span class="badge" style={{ background: 'var(--gold3)' }}>可分配 {h.statPoints}</span>}</h3>
      <div class="row between small" style={{ marginBottom: '8px' }}>
        <label class="row"><Switch on={h.autoAlloc} onChange={v => { h.autoAlloc = v; if (v) autoSpend(s); gm.heroChanged(); refresh(); }} />自動配點與學技能</label>
        <button class="btn xs" onClick={() => confirmModal('重置屬性點', <p>花費 <CIcon k="gems" />{RESET_STATS_GEMS} 重置所有屬性點。</p>, () => { resetStats(gm); refresh(); })}>重置</button>
      </div>
      <div class="col" style={{ gap: '6px' }}>
        {PRIMARY.map(p => (
          <div class="attr" title={ATTR_HELP[p]}>
            <span class={'k' + (c.main === p ? ' main' : '')}>{statLabel(p)}{c.main === p ? ' ★' : ''}</span>
            <span><b>{Math.round(st[p])}</b> <span class="tiny dim">{ATTR_HELP[p]}</span></span>
            {h.statPoints > 0 ? (
              <span class="row" style={{ gap: '4px' }}>
                <button class="btn xs" onClick={() => { allocate(gm, p, 1); refresh(); }}>+1</button>
                <button class="btn xs" onClick={() => { allocate(gm, p, 5); refresh(); }}>+5</button>
                <button class="btn xs" onClick={() => { allocate(gm, p, h.statPoints); refresh(); }}>全</button>
              </span>
            ) : <span />}
          </div>
        ))}
      </div>

      <h3>能力值</h3>
      <StatTable st={st} level={h.level} />

      {(Object.keys(powers).length > 0 || sets.size > 0) && <h3>特殊效果</h3>}
      <div class="col" style={{ gap: '4px' }}>
        {Object.entries(powers).map(([id, v]) => <div class="small" style={{ color: '#ffc27a' }}>★ {describePower(id, v)}</div>)}
        {[...sets].map(([id, n]) => {
          const set = SET_MAP.get(id)!;
          return (
            <div class="small">
              <span style={{ color: 'var(--set)', fontWeight: 700 }}>{set.name}（{n}/4）</span>
              <span class={n >= 2 ? '' : 'dim'}>　(2) {set.bonus2.map(m => describeMod(m)).join('、')}</span>
              <span class={n >= 4 ? '' : 'dim'}>　(4) {set.bonus4.mods.map(m => describeMod(m)).join('、')}{set.bonus4.power ? '、' + describePower(set.bonus4.power.id, set.bonus4.power.value) : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatTable({ st, level }: { st: StatBlock; level: number }) {
  const pct = (k: StatKey) => `${st[k].toFixed(1)}%`;
  const row = (label: string, v: string) => <div class="s"><span>{label}</span><b>{v}</b></div>;
  const els: StatKey[] = ['fireDmg', 'iceDmg', 'lightningDmg', 'holyDmg', 'shadowDmg'];
  const res: StatKey[] = ['fireRes', 'iceRes', 'lightningRes', 'holyRes', 'shadowRes'];
  return (
    <>
      <div class="statgrid">
        {row('物理攻擊', fmt(st.atk))}
        {row('魔法攻擊', fmt(st.matk))}
        {row('暴擊率', pct('crit'))}
        {row('暴擊傷害', pct('critDmg'))}
        {row('攻擊速度', '+' + pct('haste'))}
        {row('冷卻縮減', pct('cdr'))}
        {row('全傷害', '+' + pct('dmg'))}
        {row('物理／魔法傷害', `+${st.physDmg.toFixed(0)}% / +${st.magDmg.toFixed(0)}%`)}
        {row('技能傷害', '+' + pct('skillDmg'))}
        {row('對首領／精英', `+${st.bossDmg.toFixed(0)}% / +${st.eliteDmg.toFixed(0)}%`)}
        {row('持續傷害', '+' + pct('dotDmg'))}
        {row('異常觸發率', '+' + pct('statusChance'))}
      </div>
      <div class="sep" />
      <div class="statgrid">
        {row('生命', fmt(st.hp))}
        {row('魔力', fmt(st.mp))}
        {row('防禦', `${fmt(st.def)}（減傷 ${(armorDR(st.def, level) * 100).toFixed(1)}%）`)}
        {row('魔抗', `${fmt(st.res)}（減傷 ${(armorDR(st.res, level) * 100).toFixed(1)}%）`)}
        {row('迴避', `${fmt(st.eva)}（${(evadeChance(st.eva, level) * 100).toFixed(1)}%）`)}
        {row('受到傷害', `${st.dmgTaken >= 0 ? '+' : ''}${st.dmgTaken.toFixed(1)}%`)}
        {row('吸血', pct('lifesteal'))}
        {row('生命／魔力回復', `${st.hpRegen.toFixed(1)} / ${st.mpRegen.toFixed(1)} 每秒`)}
      </div>
      <div class="sep" />
      <div class="statgrid">
        {els.map(k => row(statLabel(k), '+' + pct(k)))}
        {res.map(k => row(statLabel(k), pct(k)))}
      </div>
      <div class="sep" />
      <div class="statgrid">
        {row('金幣獲得', '+' + pct('goldFind'))}
        {row('經驗獲得', '+' + pct('xpGain'))}
        {row('掉寶率', '+' + pct('magicFind'))}
        {row('寵物傷害', '+' + pct('petDmg'))}
        {row('治療效果', '+' + pct('healPower'))}
        {row('護盾效果', '+' + pct('shieldPower'))}
      </div>
    </>
  );
}

function AdvanceBox() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const c = CLASSES[s.hero.classId];
  const choose = (id: AdvId) => {
    const a = ADVANCES[id];
    openModal(() => (
      <Modal title={`轉職為「${a.name}」？`} actions={<>
        <button class="btn" onClick={closeModal}>再想想</button>
        <button class="btn primary" onClick={() => { advance(gm, id); closeModal(); refresh(); }}>確定轉職</button>
      </>}>
        <p>{a.desc}</p>
        <div class="small">{a.mods.map(m => describeMod(m)).join('、')}</div>
        <p class="small muted">轉職後無法更改。新技能：{classSkills(s.hero.classId).filter(k => k.advId === id).map(k => `${k.icon}${k.name}（Lv.${k.unlock}）`).join('、')}</p>
      </Modal>
    ));
  };
  return (
    <div class="card hl" style={{ marginTop: '12px' }}>
      <h3 style={{ marginTop: '0px' }}><Emo e="🌟" /> 轉職</h3>
      <div class="small muted" style={{ marginBottom: '8px' }}>你已達到 {ADVANCE_LEVEL} 級，可以選擇 {c.name} 的進階道路。</div>
      <div class="row" style={{ gap: '10px', alignItems: 'stretch' }}>
        {advancesOf(s.hero.classId).map(a => (
          <div class="card grow" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => choose(a.id)}>
            <HeroPreview look={{ ...c.look, ...a.look }} art={[a.id]} size={120} attackEvery={2.2} />
            <div style={{ fontWeight: 900 }}>{a.name}</div>
            <div class="small muted">{a.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 點裝備欄：列出背包裡可以放進這一格的裝備，點一下就穿上（已有裝備時直接替換，舊的回到背包）
// ---------------------------------------------------------------------
function openPicker(set: 0 | 1, slot: SlotId) {
  openModal(() => <EquipPicker set={set} slot={slot} />);
}

function EquipPicker({ set, slot }: { set: 0 | 1; slot: SlotId }) {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const kind = slotKind(slot);
  const eq = gearOf(s, set);
  const asSet = (equipment: typeof eq) => ({ ...s, equipment });
  const base = combatPower(asSet(eq), heroStats(asSet(eq)));
  const rows = s.inventory
    .filter(it => it.slot === kind && (kind !== 'weapon' && kind !== 'offhand' ? true : it.classId === s.hero.classId))
    .map(it => {
      const ok = canEquip(it, s.hero.classId, s.hero.level);
      const t = asSet({ ...eq, [slot]: it });
      return { it, ok, gain: ok ? combatPower(t, heroStats(t)) - base : 0 };
    })
    .sort((a, b) => Number(b.ok) - Number(a.ok) || b.gain - a.gain);
  const pick = (uid: number) => { equipToGear(gm, uid, set, slot); closeModal(); refresh(); };
  const cur = eq[slot];
  return (
    <Modal title={`選擇${SLOT_LABEL[kind]}${set !== s.gear.active ? `（配裝 ${GEAR_NAMES[set]}）` : ''}`} actions={<button class="btn" onClick={closeModal}>取消</button>}>
      {cur && (
        <div class="pick-cur">
          <ItemSlot item={cur} small />
          <span class="pk-name">
            <span class="tiny muted">目前裝備</span>
            <b style={{ color: RARITIES[cur.rarity].color }}>{itemDisplayName(cur)}</b>
          </span>
          <span class="row" style={{ gap: '4px' }}>
            <button class="btn xs" onClick={() => { closeModal(); openItem(cur.uid); }}>詳細</button>
            <button class="btn xs" onClick={() => { unequipFromGear(gm, set, slot); closeModal(); refresh(); }}>卸下</button>
          </span>
        </div>
      )}
      {rows.length === 0 ? <p class="muted">背包裡沒有可以放進這一格的裝備。</p> : (
        <div class="picker">
          {rows.map(({ it, ok, gain }) => (
            <button class={'pick-row' + (ok ? '' : ' off')} disabled={!ok} onClick={() => pick(it.uid)}>
              <ItemSlot item={it} small />
              <span class="pk-name">
                <b style={{ color: RARITIES[it.rarity].color }}>{itemDisplayName(it)}</b>
                <span class="tiny muted">{RARITIES[it.rarity].name}・物品等級 {it.ilvl}{ok ? '' : `・需要 Lv.${reqLevel(it)}`}</span>
              </span>
              <span class={'pk-gain' + (gain > 0 ? ' up' : gain < 0 ? ' down' : '')}>{ok ? `${gain >= 0 ? '+' : ''}${fmt(gain)}` : ''}</span>
            </button>
          ))}
        </div>
      )}
      <div class="tiny muted" style={{ marginTop: '6px' }}>右邊數字是穿上後的戰力變化{cur ? '（換下的裝備會回到背包）' : ''}。</div>
    </Modal>
  );
}
