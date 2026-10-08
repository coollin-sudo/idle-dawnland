import { useState } from 'preact/hooks';
import { SKILL_SPECS, SPEC_RANK } from '@/data/skillSpecs';
import { fmt } from '@/core/format';
import { describeMod, ELEMENT_LABEL } from '@/core/stats';
import { scale, type SkillDef, type SkillEffect } from '@/core/types';
import { ADVANCES } from '@/data/classes';
import { classSkills, SKILL_MAX_RANK } from '@/data/skills';
import { STATUSES } from '@/data/statuses';
import { LOADOUT_UNLOCK } from '@/core/state';
import { learnSkill, loadoutSlots, resetSkills, RESET_SKILLS_GOLD, setLoadout, swapLoadout, setSkillSpec } from '@/systems/progression';
import { CIcon, SkillIcon, confirmModal } from '../common';
import { g, refresh, uiTick } from '../store';

const TARGET: Record<string, string> = { front: '前方敵人', all: '所有敵人', random: '隨機敵人', lowest: '血最少的敵人', highest: '血最多的敵人', self: '自己' };
const COND: Record<string, string> = {
  hpBelow70: '生命低於 70% 時', hpBelow50: '生命低於 50% 時', hpBelow30: '生命低於 30% 時', enemies2: '敵人 2 隻以上或首領時', enemies3: '敵人 3 隻以上時', boss: '對首領時', buffMissing: '效果結束後', once: '每場一次',
};

function effectText(e: SkillEffect, r: number): string {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  switch (e.type) {
    case 'damage': {
      const el = e.element === 'phys' ? (e.dmgType === 'phys' ? '物理' : '魔法') : ELEMENT_LABEL[e.element];
      let t = `對${TARGET[e.target]}造成 ${pct(scale(e.mult, r))} ${el}傷害${e.hits > 1 ? ` ×${e.hits}` : ''}`;
      if (e.pierce) t += `，無視 ${pct(e.pierce)} 防禦`;
      if (e.bonusCrit) t += `，暴擊率 +${e.bonusCrit}%`;
      if (e.status?.length) t += '；' + e.status.map(s => `${pct(s.chance)} ${STATUSES[s.id].name}${s.stacks && s.stacks > 1 ? `×${s.stacks}` : ''}`).join('、');
      return t;
    }
    case 'heal': return `回復 ${pct(scale(e.pct, r))} 最大生命`;
    case 'shield': return `獲得 ${pct(scale(e.pct, r))} 最大生命的護盾，持續 ${e.dur} 秒`;
    case 'buff': return `${e.name}（${e.dur} 秒）：${e.mods(r).map(m => describeMod(m, 1)).join('、')}`;
    case 'debuff': return `使${TARGET[e.target]}${STATUSES[e.status.id].name}`;
    case 'summon': return `召喚${e.name} ${e.dur} 秒，每 ${e.interval} 秒造成 ${pct(scale(e.mult, r))} 傷害`;
    case 'spawn': return `召喚 ${e.count} 名手下`;
  }
}

export function SkillsPanel() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const h = s.hero;
  const [pick, setPick] = useState<number | null>(null);
  const all = classSkills(h.classId);
  const groups: [string, SkillDef[]][] = [['基礎技能', all.filter(k => !k.advId)]];
  for (const adv of [...new Set(all.filter(k => k.advId).map(k => k.advId!))]) groups.push([`${ADVANCES[adv].name}技能`, all.filter(k => k.advId === adv)]);
  const slots = loadoutSlots(h.level);

  const assign = (id: string) => {
    if (pick === null) return;
    setLoadout(gm, pick, id);
    setPick(null);
    refresh();
  };

  return (
    <div>
      <div class="row between">
        <h3 style={{ margin: '0px' }}>技能欄 <span class="count">由左至右為施放優先順序</span></h3>
        <span class="chip on">技能點 {h.skillPoints}</span>
      </div>
      <div class="loadout" style={{ margin: '10px 0' }}>
        {h.loadout.map((id, i) => {
          const locked = i >= slots;
          const def = id ? all.find(k => k.id === id) : undefined;
          return (
            <div class={'ls' + (def ? ' filled' : '') + (pick === i ? ' target' : '')} style={{ opacity: locked ? 0.4 : 1 }} onClick={() => !locked && setPick(pick === i ? null : i)}>
              <span class="p">{i + 1}</span>
              {locked ? <div class="small muted" style={{ marginTop: '22px' }}>Lv.{LOADOUT_UNLOCK[i]} 解鎖</div> : def ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><SkillIcon def={def} size={42} /></div>
                  <div class="n">{def.name}</div>
                  <div class="row" style={{ justifyContent: 'center', gap: '2px', marginTop: '2px' }}>
                    <button class="btn xs" disabled={i === 0} onClick={e => { e.stopPropagation(); swapLoadout(gm, i, i - 1); refresh(); }}>◀</button>
                    <button class="btn xs" onClick={e => { e.stopPropagation(); setLoadout(gm, i, null); refresh(); }}>✕</button>
                    <button class="btn xs" disabled={i >= slots - 1} onClick={e => { e.stopPropagation(); swapLoadout(gm, i, i + 1); refresh(); }}>▶</button>
                  </div>
                </>
              ) : <div class="small muted" style={{ marginTop: '22px' }}>點擊選擇</div>}
            </div>
          );
        })}
      </div>
      {pick !== null && <div class="small gold" style={{ marginBottom: '8px' }}>👉 點下方技能的「放入」來放進第 {pick + 1} 格</div>}

      {groups.map(([title, list]) => (
        <>
          <h3>{title}</h3>
          {list.map(def => {
            const r = h.skillRanks[def.id] ?? 0;
            const advLocked = def.advId && def.advId !== h.advId;
            const lvLocked = h.level < def.unlock;
            const showRank = Math.max(1, r);
            return (
              <div class={'skill-row' + (advLocked || lvLocked ? ' locked' : '') + (def.ultimate ? ' ult' : '')}>
                <div class="skill-ico"><SkillIcon def={def} size={44} /></div>
                <div>
                  <div><b>{def.name}</b> <span class="small muted">Lv.{r}/{SKILL_MAX_RANK}</span>{def.ultimate && <span class="chip on" style={{ marginLeft: '6px' }}>終極技</span>}</div>
                  <div class="meta">需要 Lv.{def.unlock}・{scale(def.mp, showRank).toFixed(0)} MP・冷卻 {def.cd} 秒{def.cast ? `・詠唱 ${def.cast} 秒` : ''}{def.cond ? `・${COND[def.cond]}` : ''}</div>
                  <div class="eff">{def.effects.map(e => effectText(e, showRank)).join('；')}</div>
                  {r > 0 && r < SKILL_MAX_RANK && <div class="tiny dim">下一級：{def.effects.map(e => effectText(e, r + 1)).join('；')}</div>}
                  <div class="tiny muted">{def.desc}</div>
                  {SKILL_SPECS[def.id] && (
                    <div class="specs">
                      <span class="tiny muted">專精{r < SPEC_RANK ? `（Lv.${SPEC_RANK} 解鎖）` : '：'}</span>
                      {SKILL_SPECS[def.id].map((sp, i) => {
                        const on = h.skillSpecs?.[def.id] === i;
                        return (
                          <button class={'spec' + (on ? ' on' : '')} disabled={r < SPEC_RANK} title={sp.desc}
                            onClick={() => { setSkillSpec(gm, def.id, on ? -1 : i); refresh(); }}>
                            <b>{sp.name}</b><span>{sp.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div class="col" style={{ gap: '4px' }}>
                  <button class="btn sm good" disabled={!!advLocked || lvLocked || h.skillPoints <= 0 || r >= SKILL_MAX_RANK} onClick={() => { learnSkill(gm, def.id); refresh(); }}>{r === 0 ? '學習' : '升級'}</button>
                  {pick !== null && r > 0 && <button class="btn sm primary" onClick={() => assign(def.id)}>放入</button>}
                  {pick === null && r > 0 && !h.loadout.includes(def.id) && <button class="btn sm" onClick={() => { const free = h.loadout.findIndex((x, i) => !x && i < slots); if (free >= 0) { setLoadout(gm, free, def.id); refresh(); } else setPick(slots - 1); }}>裝上</button>}
                </div>
              </div>
            );
          })}
        </>
      ))}
      <div class="row" style={{ justifyContent: 'flex-end', marginTop: '10px' }}>
        <button class="btn sm" onClick={() => confirmModal('重置技能點', <p>花費 <CIcon k="gold" />{fmt(RESET_SKILLS_GOLD(h.level))} 退回所有技能點。</p>, () => { resetSkills(gm); refresh(); })}>重置技能點</button>
      </div>
    </div>
  );
}
