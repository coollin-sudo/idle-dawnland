import { useEffect, useRef } from 'preact/hooks';
import { Emo, rich } from './emoji';
import { fmt } from '@/core/format';
import { xpToNext, ADVANCE_LEVEL } from '@/core/formulas';
import { CLASSES, ADVANCES } from '@/data/classes';
import { UNLOCKS } from '@/data/quests';
import { getSkill } from '@/data/skills';
import { scale } from '@/core/types';
import { BattleScene } from '@/render/scene';
import { portrait, portraitArt } from '@/render/icons';
import { artUrl } from '@/render/images';
import { combatPower, heroStats } from '@/systems/hero';
import { weaponLook } from '@/systems/units';
import { advise } from '@/systems/advisor';
import { setMode } from '@/systems/activities';
import { claimQuest, currentQuest, questProgress, describeReward, dailyProgress } from '@/systems/quests';
import { loadoutSlots, talentAvailable } from '@/systems/progression';
import { CHAPTERS } from '@/data/quests';
import { Bar, CIcon, SkillIcon } from './common';
import { g, getScene, logs, refresh, setScene, tab, uiTick, type TabId } from './store';
import { audio } from '@/audio/audio';
import { HeroPanel } from './panels/HeroPanel';
import { BagPanel } from './panels/BagPanel';
import { SkillsPanel } from './panels/SkillsPanel';
import { TalentsPanel } from './panels/TalentsPanel';
import { ForgePanel } from './panels/ForgePanel';
import { PetsPanel } from './panels/PetsPanel';
import { MapPanel } from './panels/MapPanel';
import { ChallengePanel } from './panels/ChallengePanel';
import { ShopPanel } from './panels/ShopPanel';
import { QuestsPanel } from './panels/QuestsPanel';
import { CollectionPanel } from './panels/CollectionPanel';
import { RebirthPanel } from './panels/RebirthPanel';
import { SettingsPanel } from './panels/SettingsPanel';

export function heroLookOf() {
  const s = g().state;
  const c = CLASSES[s.hero.classId];
  return { ...(s.hero.advId ? { ...c.look, ...ADVANCES[s.hero.advId].look } : c.look), ...weaponLook(s) };
}

function TopBar() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const h = s.hero;
  const st = heroStats(s);
  const c = CLASSES[h.classId];
  const need = xpToNext(h.level);
  return (
    <div class="topbar">
      <div class="brand">放置冒險<small>晨曦大陸</small></div>
      <div class="hero-chip">
        {(() => {
          const art = (s.hero.advId ? portraitArt(s.hero.advId) : null) ?? portraitArt(s.hero.classId);
          return <img class={'portrait' + (art ? ' art' : '')} src={art ?? portrait(heroLookOf(), 88)} alt="" />;
        })()}
        <div>
          <div class="name">{h.name}</div>
          <div class="sub">Lv.<b>{h.level}</b> {h.advId ? ADVANCES[h.advId].name : c.name}{s.rebirth.count ? `・轉生 ${s.rebirth.count}` : ''}</div>
        </div>
      </div>
      <div class="xpbox">
        <Bar value={h.xp} max={need} kind="xp" label={`EXP ${fmt(h.xp)} / ${fmt(need)}（${((h.xp / need) * 100).toFixed(1)}%）`} />
      </div>
      <div class="cp"><small>戰力</small>{fmt(combatPower(s, st))}</div>
      <div class="wallet">
        <span class="w" title="金幣"><CIcon k="gold" />{fmt(s.cur.gold)}</span>
        <span class="w" title="寶石"><CIcon k="gems" />{fmt(s.cur.gems)}</span>
        <span class="w" title="強化石"><CIcon k="stones" />{fmt(s.cur.stones)}</span>
        <span class="w" title="精華"><CIcon k="essence" />{fmt(s.cur.essence)}</span>
        {s.cur.shards > 0 && <span class="w" title="傳說碎片"><CIcon k="shards" />{fmt(s.cur.shards)}</span>}
      </div>
    </div>
  );
}

function BattleView() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const scene = new BattleScene(ref.current!, g());
    setScene(scene);
    const ro = new ResizeObserver(() => scene.resize());
    ro.observe(ref.current!);
    scene.resize();
    return () => { ro.disconnect(); scene.destroy(); setScene(null); };
  }, []);
  void uiTick.value;
  const gm = g();
  const act = gm.activity;
  const p = gm.state.progress;
  const scene = getScene();
  if (scene && scene.game !== gm) scene.bind(gm);
  return (
    <div class="stage-wrap">
      <canvas ref={ref} />
      <div class="stage-top">
        <div class="stage-title">
          <b>{act.title()}</b>
          <div class="sub">{act.subtitle()}</div>
        </div>
        {act.kind === 'stage' ? (
          <div class="stage-ctl">
            <MuteButton />
            <button class={'btn xs' + (p.mode === 'push' ? ' on' : '')} onClick={() => setMode(gm, 'push')} title="自動前往下一關"><Emo e="⏩" /> 推進</button>
            <button class={'btn xs' + (p.mode === 'farm' ? ' on' : '')} onClick={() => setMode(gm, 'farm')} title="停留在這一關刷怪"><Emo e="🔁" /> 刷怪</button>
          </div>
        ) : (
          <div class="stage-ctl">
            <button class="btn xs" onClick={() => gm.startActivity('stage')}>離開</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MuteButton() {
  const s = g().state.settings;
  const muted = s.sfx === 0 && s.music === 0;
  const toggle = () => {
    const st = s as typeof s & { _vol?: [number, number] };
    if (muted) { const [a, b] = st._vol ?? [0.6, 0.35]; s.sfx = a; s.music = b; }
    else { st._vol = [s.sfx, s.music]; s.sfx = 0; s.music = 0; }
    audio.unlock();
    audio.setVolumes(s.sfx, s.music);
    refresh();
  };
  return <button class="btn xs" onClick={toggle} title={muted ? '開啟聲音' : '靜音'}>{rich(muted ? '🔇' : '🔊')}</button>;
}

function Hud() {
  void uiTick.value;
  const gm = g();
  const u = gm.heroUnit;
  const s = gm.state;
  if (!u) return null;
  return (
    <div class="hud">
      <div class="bars">
        <Bar value={u.hp} max={u.stats.hp} kind="hp" size="lg" shield={u.shield} label={`${fmt(Math.max(0, u.hp))} / ${fmt(u.stats.hp)}`} />
        <Bar value={u.mp} max={u.stats.mp} kind="mp" label={`${fmt(u.mp)} / ${fmt(u.stats.mp)}`} />
      </div>
      <div class="pots" title={`生命低於 ${s.settings.potionAt}% 自動喝藥水`}>
        {[0, 1, 2].map(i => (
          <div class={'pot' + (s.potions[i] ? '' : ' zero')}>
            <img src={portraitFor(i)} alt="" />
            <span>{s.potions[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { currencyIcon } from '@/render/icons';
const portraitFor = (i: number) => currencyIcon(('potion' + i) as 'potion0');

function SkillBar() {
  void uiTick.value;
  const gm = g();
  const s = gm.state;
  const u = gm.heroUnit;
  const slots = loadoutSlots(s.hero.level);
  return (
    <div class="skillbar">
      {s.hero.loadout.map((id, i) => {
        if (i >= slots) return <div class="skill-slot locked empty">Lv.{[1, 5, 15, 30][i]} 解鎖</div>;
        if (!id) return <div class="skill-slot empty" onClick={() => { tab.value = 'skills'; }}>＋ 技能</div>;
        const def = getSkill(id);
        const rank = s.hero.skillRanks[id] ?? 0;
        const cd = u?.cds[id] ?? 0;
        const usable = s.hero.level >= def.unlock && (!def.advId || def.advId === s.hero.advId);
        const mp = scale(def.mp, rank);
        return (
          <div class={'skill-slot' + (!usable ? ' locked' : '') + (u && u.mp < mp ? ' nomp' : '')} onClick={() => { tab.value = 'skills'; }} title={def.desc}>
            <span class="prio">{i + 1}</span>
            <span class="ico"><SkillIcon def={def} size={36} /></span>
            <div>
              <div class="nm">{def.name}</div>
              <div class="rk">Lv.{rank}・{mp.toFixed(0)} MP</div>
            </div>
            <div class="cd" style={{ height: `${Math.min(100, (cd / def.cd) * 100)}%` }} />
          </div>
        );
      })}
    </div>
  );
}

function QuestTracker() {
  void uiTick.value;
  const gm = g();
  const q = currentQuest(gm);
  if (!q) return <div class="quest panel"><span class="qicon"><Emo e="🏆" /></span><div class="grow"><div class="title">主線完成</div><div class="name">你已完成所有主線任務！</div></div></div>;
  const p = questProgress(gm, q);
  const done = p.cur >= p.goal;
  return (
    <div class={'quest panel' + (done ? ' done' : '')}>
      <span class="qicon">{rich(done ? '✅' : '📜')}</span>
      <div class="grow">
        <div class="title">第 {q.chapter + 1} 章・{CHAPTERS[q.chapter]}</div>
        <div class="name">{q.name}</div>
        <div class="rew">{describeReward(q.reward)}</div>
        {!done && <div style={{ marginTop: '4px' }}><Bar value={p.cur} max={p.goal} kind="gold" size="sm" /></div>}
      </div>
      {done ? <button class="btn primary sm" onClick={() => claimQuest(gm)}>領取</button> : <span class="small muted">{fmt(Math.max(0, p.cur))}/{fmt(p.goal)}</span>}
    </div>
  );
}

function Advisor() {
  void uiTick.value;
  const list = advise(g()).slice(0, 3);
  if (!list.length) return null;
  return (
    <div class="advisor">
      {list.map(a => <button class="adv" onClick={() => { tab.value = a.tab as TabId; }}><span>{rich(a.icon)}</span>{a.text}</button>)}
    </div>
  );
}

function LogBox() {
  return (
    <div class="log panel">
      {logs.value.length === 0 && <div class="dim">戰鬥紀錄會顯示在這裡</div>}
      {logs.value.slice(0, 40).map(l => <div key={l.id} class={l.kind}><time>{l.t}</time>{rich(l.text)}</div>)}
    </div>
  );
}

const TABS: { id: TabId; name: string; icon: string }[] = [
  { id: 'hero', name: '角色', icon: '🧝' },
  { id: 'bag', name: '背包', icon: '🎒' },
  { id: 'skills', name: '技能', icon: '✨' },
  { id: 'talents', name: '天賦', icon: '🌳' },
  { id: 'forge', name: '鍛造', icon: '🔨' },
  { id: 'pets', name: '寵物', icon: '🐾' },
  { id: 'map', name: '地圖', icon: '🗺️' },
  { id: 'challenge', name: '挑戰', icon: '🗼' },
  { id: 'shop', name: '商店', icon: '🛒' },
  { id: 'quests', name: '任務', icon: '📜' },
  { id: 'collection', name: '收藏', icon: '📖' },
  { id: 'rebirth', name: '轉生', icon: '🌌' },
  { id: 'settings', name: '設定', icon: '⚙️' },
];

function tabLocked(id: TabId): string | null {
  const s = g().state;
  const best = Math.max(...s.progress.best, s.rebirth.count > 0 ? 99 : -1);
  if (id === 'pets' && best < UNLOCKS.pets && !Object.keys(s.pets.owned).length && !s.pets.eggs.length) return '通關第 2 區解鎖';
  if (id === 'challenge' && best < UNLOCKS.dungeon) return '通關第 2 區解鎖';
  if (id === 'rebirth' && best < UNLOCKS.rebirth) return '通關第 5 區解鎖';
  return null;
}

function tabBadge(id: TabId): boolean {
  const gm = g();
  const s = gm.state;
  switch (id) {
    case 'hero': return (s.hero.statPoints > 0 && !s.hero.autoAlloc) || (s.hero.level >= ADVANCE_LEVEL && !s.hero.advId);
    case 'skills': return s.hero.skillPoints > 0;
    case 'talents': return talentAvailable(s) > 0;
    case 'bag': return s.inventory.some(i => i.isNew);
    case 'pets': return s.pets.eggs.some(e => e.readyAt !== null && e.readyAt <= gm.now()) || (s.pets.eggs.some(e => e.readyAt === null) && s.pets.eggs.filter(e => e.readyAt !== null).length < s.pets.slots);
    case 'quests': {
      const q = currentQuest(gm);
      const mainDone = q ? questProgress(gm, q).cur >= questProgress(gm, q).goal : false;
      const daily = s.quests.daily.some(d => !d.claimed && dailyProgress(gm, d.id).cur >= dailyProgress(gm, d.id).goal);
      return mainDone || daily;
    }
    default: return false;
  }
}

function Tabs() {
  void uiTick.value;
  return (
    <div class="tabs panel">
      {TABS.map(t => {
        const lock = tabLocked(t.id);
        return (
          <button
            class={'tab' + (tab.value === t.id ? ' on' : '') + (lock ? ' locked' : '')}
            title={lock ?? t.name}
            onClick={() => { if (!lock) tab.value = t.id; else g().toast(lock, 'warn', '🔒'); }}
          >
            <span class="ti">{(() => { const art = artUrl(`art/ui/${t.id}`); return art ? <img class="tiimg" src={art} alt="" /> : t.icon; })()}</span>
            {t.name}
            {!lock && tabBadge(t.id) && <span class="badge" />}
          </button>
        );
      })}
    </div>
  );
}

function Panel() {
  void uiTick.value;
  switch (tab.value) {
    case 'hero': return <HeroPanel />;
    case 'bag': return <BagPanel />;
    case 'skills': return <SkillsPanel />;
    case 'talents': return <TalentsPanel />;
    case 'forge': return <ForgePanel />;
    case 'pets': return <PetsPanel />;
    case 'map': return <MapPanel />;
    case 'challenge': return <ChallengePanel />;
    case 'shop': return <ShopPanel />;
    case 'quests': return <QuestsPanel />;
    case 'collection': return <CollectionPanel />;
    case 'rebirth': return <RebirthPanel />;
    case 'settings': return <SettingsPanel />;
  }
}

export function GameScreen() {
  return (
    <div class="shell">
      <TopBar />
      <div class="main">
        <div class="left">
          <BattleView />
          <div class="panel">
            <Hud />
            <SkillBar />
          </div>
          <QuestTracker />
          <Advisor />
          <LogBox />
        </div>
        <div class="right">
          <Tabs />
          <div class="panel tab-body"><Panel /></div>
        </div>
      </div>
    </div>
  );
}
