import type { Game } from '@/core/game';
import { fmt, fmtClock } from '@/core/format';
import type { GameEvents } from '@/core/gameEvents';
import { ELEMENT_COLOR, type Element } from '@/core/stats';
import type { Archetype, FxKey, HeroLook, MonsterDef, PetDef } from '@/core/types';
import type { Unit } from '@/core/unit';
import { getMonster, MONSTER_MAP } from '@/data/monsters';
import { PET_MAP } from '@/data/pets';
import { regionOfStage } from '@/data/regions';
import { STATUSES } from '@/data/statuses';
import { RARITIES } from '@/data/items';
import { Background, GROUND_Y, VIEW_H, VIEW_W } from './background';
import { alpha, clamp01, easeOut, glow, lerp, rrect, type Ctx } from './draw';
import { Beam, Bubble, Burst, Falling, Lightning, Particles, Pillar, Projectile, Ring, Slash, Texts, Vortex, type Fx } from './effects';
import { paintHero, type Pose } from './heroPainter';
import { classImage, monsterImage, petImage } from './images';
import { ARCH_HEIGHT, paintMonster } from './monsterPainter';

interface Actor {
  unit: Unit;
  kind: Unit['kind'];
  x: number; y: number;
  homeX: number; homeY: number;
  spawn: number;
  dying: number;
  attack: number;
  attackDur: number;
  hurt: number;
  cast: number;
  height: number;
  scale: number;
  mdef?: MonsterDef | PetDef;
  arch?: Archetype;
  seed: number;
  delayUntil: number;
  pending: { at: number; fn: () => void }[];
  statusShown: Record<string, number>;
  blinkAt: number;
}

const SKELETON: MonsterDef = { id: 'skeleton_summon', name: '骷髏戰士', archetype: 'undead', family: 'undead', palette: ['#e8e2d0', '#4a3a6a', '#b67bff'], features: ['sword'], dmgType: 'magic', element: 'shadow' };

export class BattleScene {
  ctx: Ctx;
  dpr = 1;
  scale = 1;
  actors = new Map<number, Actor>();
  parts = new Particles();
  texts = new Texts();
  fxs: Fx[] = [];
  bg: Background | null = null;
  prevBg: Background | null = null;
  bgFade = 1;
  bgKey = '';
  scroll = 0;
  walk = 0;
  time = 0;
  shakeT = 0;
  shakeMag = 0;
  flashT = 0;
  flashColor = '#ffffff';
  banner: { text: string; sub: string; t: number; color: string } | null = null;
  private unsubs: (() => void)[] = [];
  private ambientAcc = 0;

  constructor(public canvas: HTMLCanvasElement, public game: Game) {
    this.ctx = canvas.getContext('2d')!;
    this.bind(game);
  }

  bind(game: Game) {
    this.unsubs.forEach(u => u());
    this.game = game;
    this.actors.clear();
    const ev = game.ev;
    const on = <K extends keyof GameEvents>(k: K, fn: (e: GameEvents[K]) => void) => this.unsubs.push(ev.on(k, fn));
    on('unit:act', e => this.onAct(e));
    on('unit:hit', e => this.onHit(e));
    on('unit:miss', e => this.text(e.tgt, '閃避', '#a8d0ff', 18));
    on('unit:heal', e => {
      const a = this.actors.get(e.tgt.uid);
      if (!a) return;
      this.text(e.tgt, '+' + fmt(e.amount), '#7dff9a', 20);
      this.parts.burst(a.x, a.y - a.height * 0.5, 8, { color: '#7dff9a', shape: 'star', speed: 60, angle: -Math.PI / 2, spread: 1.2, gravity: -60, additive: true, size: 3 });
    });
    on('unit:shield', e => {
      const a = this.actors.get(e.tgt.uid);
      if (a) this.fxs.push(new Bubble(a.x, a.y - a.height * 0.5, a.height * 0.75, '#8ad0ff', 0.7));
    });
    on('unit:status', e => {
      const a = this.actors.get(e.tgt.uid);
      if (!a) return;
      const def = STATUSES[e.status];
      if ((a.statusShown[e.status] ?? 0) > this.time - 0.9) return;
      a.statusShown[e.status] = this.time;
      this.text(e.tgt, def.name, def.color, 14, -0.15);
      if (e.status === 'freeze') this.parts.burst(a.x, a.y - a.height * 0.5, 10, { color: '#d8f4ff', shape: 'shard', speed: 120, size: 4 });
      if (e.status === 'stun') this.parts.burst(a.x, a.y - a.height - 6, 6, { color: '#ffe35c', shape: 'star', speed: 60, size: 3, max: 0.6 });
    });
    on('unit:buff', e => {
      const a = this.actors.get(e.tgt.uid);
      if (!a) return;
      this.text(e.tgt, e.name, '#ffe08a', 16, -0.2);
      this.parts.burst(a.x, a.y, 14, { color: '#ffd34a', shape: 'spark', speed: 140, angle: -Math.PI / 2, spread: 0.8, additive: true, size: 2.4 });
    });
    on('unit:cast', e => {
      const a = this.actors.get(e.src.uid);
      if (!a) return;
      this.text(e.src, e.skill.name, '#ffb8ff', 18, -0.3);
    });
    on('unit:interrupt', e => this.text(e.src, '打斷！', '#ffe35c', 22));
    on('unit:death', e => this.onDeath(e.unit));
    on('unit:revive', e => {
      const a = this.actors.get(e.unit.uid);
      if (!a) return;
      this.fxs.push(new Pillar(a.x, a.y, 40, '#ff9a4a', 0.9));
      this.text(e.unit, '浴火重生', '#ffb04a', 22);
    });
    on('unit:proc', e => this.onProc(e));
    on('loot:gold', e => {
      if (!e.unit) return;
      const a = this.actors.get(e.unit.uid);
      if (!a) return;
      const n = Math.min(8, 2 + Math.floor(Math.log10(e.amount + 1) * 1.5));
      for (let i = 0; i < n; i++) {
        this.parts.emit({ x: a.x, y: a.y - 20, vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 120, gravity: 300, shape: 'coin', size: 4, max: 1.1, tx: this.offsetX + 30, ty: 18 });
      }
    });
    on('loot:item', e => {
      if (e.auto !== 'kept' || e.item.rarity < 2) return;
      const color = e.item.set ? '#4ae0a0' : RARITIES[e.item.rarity].color;
      const x = 640 + Math.random() * 120;
      this.fxs.push(new Pillar(x, GROUND_Y, 14 + e.item.rarity * 4, color, 1.2));
      if (e.item.rarity >= 3) {
        this.texts.add({ x, y: GROUND_Y - 90, text: e.item.name, color, size: 18, max: 2, crit: false, vy: -20 });
      }
    });
    on('hero:level', () => {
      const h = this.heroActor();
      if (!h) return;
      this.fxs.push(new Pillar(h.x, h.y, 46, '#ffd34a', 1.2));
      this.fxs.push(new Ring(h.x, h.y, 10, 120, '#ffd34a', 0.8, 6));
      this.texts.add({ x: h.x, y: h.y - 140, text: '等級提升！', color: '#ffe35c', size: 30, max: 1.8, crit: true, vy: -30 });
      this.parts.burst(h.x, h.y - 50, 30, { color: '#ffe35c', shape: 'star', speed: 220, additive: true, size: 3 });
    });
    on('battle:start', e => {
      if (e.boss) {
        const boss = e.units.find(u => u.boss);
        if (boss) this.banner = { text: boss.name, sub: e.kind === 'tower' ? '無盡之塔守衛' : '首領出現！', t: 0, color: '#ff8a8a' };
        this.flash('#ff2a2a', 0.25);
      }
    });
    on('battle:clear', () => { this.walk = 0.75; });
    on('stage:enter', () => { this.walk = Math.max(this.walk, 0.6); });
    on('boss:fail', e => {
      this.banner = { text: e.reason === 'time' ? '時間到！' : '挑戰失敗', sub: '回到前一關修練', t: 0, color: '#ff6a6a' };
    });
    on('forge:enhance', () => {});
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  // ---------------------------------------------------------------------
  /** 畫面比預設更「高」時（手機），改以高度縮放並裁切左右，聚焦在戰場中央 */
  offsetX = 0;

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    const aspect = rect.width / rect.height;
    if (aspect < VIEW_W / VIEW_H) {
      this.scale = rect.height / VIEW_H;
      const visW = rect.width / this.scale;
      this.offsetX = Math.max(0, Math.min(VIEW_W - visW, 535 - visW / 2));
    } else {
      this.scale = rect.width / VIEW_W;
      this.offsetX = 0;
    }
  }

  private visibleW() {
    return this.canvas.width / this.dpr / this.scale;
  }

  private heroActor() {
    for (const a of this.actors.values()) if (a.kind === 'hero') return a;
    return undefined;
  }

  private shake(mag: number, t = 0.25) {
    if (!this.game.state.settings.shake) return;
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, t);
  }

  private flash(color: string, t: number) {
    this.flashColor = color;
    this.flashT = t;
  }

  private text(u: Unit, text: string, color: string, size: number, dy = 0, crit = false) {
    const a = this.actors.get(u.uid);
    if (!a) return;
    this.texts.add({ x: a.x + (Math.random() - 0.5) * 20, y: a.y - a.height * (0.9 - dy), text, color, size, max: crit ? 1.2 : 0.9, crit });
  }

  // ---------------------------------------------------------------------
  // 單位同步
  // ---------------------------------------------------------------------
  private homeOf(u: Unit): [number, number] {
    if (u.kind === 'hero') return [250, GROUND_Y];
    if (u.kind === 'pet') return [158, GROUND_Y + 12];
    if (u.kind === 'summon') {
      const idx = [...this.actors.values()].filter(a => a.kind === 'summon' && a.unit.alive && a.unit.uid < u.uid).length;
      return [330 + idx * 26, GROUND_Y + 16];
    }
    const yOff = [2, 16, -8, 22, 10][u.slot % 5];
    return [610 + u.slot * 86 + (u.boss ? 30 : 0), GROUND_Y + yOff];
  }

  private sync() {
    const units = this.game.battle?.units ?? [];
    const present = new Set<number>();
    for (const u of units) {
      present.add(u.uid);
      let a = this.actors.get(u.uid);
      if (!a) {
        const [hx, hy] = this.homeOf(u);
        let mdef: MonsterDef | PetDef | undefined;
        let arch: Archetype | undefined;
        let height = 100;
        if (u.kind === 'monster') { mdef = getMonster(u.defId); arch = mdef.archetype; height = ARCH_HEIGHT[arch] * (mdef.features?.includes('treant') ? 1.5 : 1); }
        else if (u.kind === 'pet') { mdef = PET_MAP.get(u.defId); arch = mdef?.archetype; height = 60; }
        else if (u.kind === 'summon') { mdef = SKELETON; arch = 'undead'; height = 70; }
        const scale = u.kind === 'monster' ? u.size * 1.12 : u.kind === 'pet' ? 0.62 : u.kind === 'summon' ? 0.75 : 1;
        a = {
          unit: u, kind: u.kind, x: u.side === 'enemy' ? hx + 260 : hx - 80, y: hy, homeX: hx, homeY: hy,
          spawn: 0, dying: -1, attack: -1, attackDur: 0.45, hurt: 0, cast: 0,
          height: height * scale, scale, mdef, arch, seed: Math.random() * 100, delayUntil: 0, pending: [], statusShown: {},
          blinkAt: this.time + 2 + Math.random() * 3,
        };
        if (u.kind === 'hero') { a.x = hx; a.spawn = 1; }
        this.actors.set(u.uid, a);
      }
      if (u.kind === 'monster' || u.kind === 'summon') {
        const [hx, hy] = this.homeOf(u);
        a.homeX = hx;
        a.homeY = hy;
      }
    }
    for (const [uid, a] of this.actors) {
      if (!present.has(uid) && a.dying < 0) a.dying = 0;
      if (a.dying > 0.8 || (!present.has(uid) && a.unit.kind === 'hero')) this.actors.delete(uid);
    }
  }

  // ---------------------------------------------------------------------
  // 戰鬥事件 → 特效
  // ---------------------------------------------------------------------
  private center(a: Actor) { return [a.x, a.y - a.height * 0.5] as const; }

  private onAct(e: GameEvents['unit:act']) {
    const src = this.actors.get(e.src.uid);
    if (!src) return;
    src.attack = 0;
    src.attackDur = e.skill ? 0.5 : 0.42;
    const color = ELEMENT_COLOR[e.element] ?? '#ffffff';
    const targets = e.targets.map(t => this.actors.get(t.uid)).filter((x): x is Actor => !!x);
    const [sx, sy] = this.center(src);
    const dirX = src.unit.side === 'hero' ? 1 : -1;
    const travel = (dist: number, speed = 1400) => Math.min(0.35, Math.max(0.08, dist / speed));
    const delay = (t: Actor, d: number) => { t.delayUntil = Math.max(t.delayUntil, this.time + d); };
    const fx = e.fx as FxKey;

    const projectile = (kind: 'arrow' | 'orb' | 'blade' | 'spit', size: number, c = color, arc = 0, onHit?: (t: Actor) => void) => {
      for (const t of targets) {
        const [tx, ty] = this.center(t);
        const d = travel(Math.abs(tx - sx));
        delay(t, d);
        this.fxs.push(new Projectile(sx + dirX * 20, sy - 6, tx, ty, d, kind, c, size, this.parts, arc, () => {
          this.parts.burst(tx, ty, 8, { color: c, shape: 'spark', speed: 180, additive: true, size: 2.5 });
          onHit?.(t);
        }));
      }
    };
    const onEach = (fn: (t: Actor, x: number, y: number) => void) => { for (const t of targets) { const [x, y] = this.center(t); fn(t, x, y); } };

    switch (fx) {
      case 'slash':
      case 'bite':
      case 'claw':
        onEach((_t, x, y) => {
          if (fx === 'claw') for (let i = 0; i < 3; i++) this.fxs.push(new Slash(x - 10 + i * 8, y - 4, 26, -2.2 * dirX, -0.9 * dirX, '#ffffff', 0.22, 3));
          else this.fxs.push(new Slash(x - dirX * 10, y, 34, dirX > 0 ? -2.3 : -0.8, dirX > 0 ? 0.7 : 2.3, fx === 'bite' ? '#ffd0d0' : '#ffffff', 0.26, 8));
        });
        break;
      case 'heavy':
        onEach((_t, x, y) => {
          this.fxs.push(new Slash(x, y, 46, -2.6, 0.9, color === '#e8e2d4' ? '#ffe9b0' : color, 0.32, 14));
          this.parts.burst(x, y, 14, { color: '#ffe9b0', shape: 'spark', speed: 260, additive: true, size: 3 });
        });
        this.shake(5);
        break;
      case 'sweep':
        onEach((_t, x, y) => this.fxs.push(new Slash(x, y, 50, -2.8, 0.4, '#e8f4ff', 0.3, 12)));
        break;
      case 'whirl':
        this.fxs.push(new Ring(src.x, src.y - 30, 20, 170, '#ffe9b0', 0.5, 10, 0.5));
        onEach((_t, x, y) => this.fxs.push(new Slash(x, y, 40, 0, Math.PI * 2, '#ffffff', 0.4, 8)));
        this.shake(4);
        break;
      case 'bash':
        onEach((_t, x, y) => {
          this.fxs.push(new Burst(x, y, 50, '#ffe9b0', 0.3));
          this.parts.burst(x, y - 20, 6, { color: '#ffe35c', shape: 'star', speed: 90, size: 3 });
        });
        this.shake(6);
        break;
      case 'arrow':
      case 'multiarrow':
        projectile('arrow', 4, color === '#e8e2d4' ? '#c8d8ff' : color);
        break;
      case 'snipe':
        onEach((t, x, y) => {
          delay(t, 0.06);
          this.fxs.push(new Beam(sx + 20, sy - 6, x, y, '#fff2c8', 0.3, 8));
          this.fxs.push(new Burst(x, y, 60, '#fff2c8', 0.4));
        });
        this.shake(5);
        break;
      case 'rain':
        for (let i = 0; i < 10; i++) {
          const t = targets[i % Math.max(1, targets.length)];
          if (!t) break;
          const x = t.x + (Math.random() - 0.5) * 70;
          this.fxs.push(new Falling(x, t.y - 20, 0.3 + Math.random() * 0.25, 'arrow', '#ffffff', this.parts));
        }
        for (const t of targets) delay(t, 0.35);
        break;
      case 'fireball':
      case 'magic':
      case 'shadowbolt':
      case 'holy': {
        if (fx === 'holy' && src.unit.side === 'hero' && e.skill) {
          onEach((t, x, y) => { delay(t, 0.12); this.fxs.push(new Pillar(x, t.y, 26, '#fff2a8', 0.55)); this.parts.burst(x, y, 10, { color: '#fff2a8', shape: 'star', speed: 120, additive: true }); });
          break;
        }
        const c = fx === 'fireball' ? '#ff8a3a' : fx === 'shadowbolt' ? '#b67bff' : fx === 'holy' ? '#fff2a8' : color === '#e8e2d4' ? '#9ad0ff' : color;
        projectile('orb', fx === 'fireball' || fx === 'shadowbolt' ? 7 : 5, c, fx === 'magic' ? 20 : 0, t => {
          const [x, y] = this.center(t);
          this.fxs.push(new Burst(x, y, fx === 'fireball' ? 60 : 40, c, 0.35));
        });
        break;
      }
      case 'meteor': {
        const cx = targets.length ? targets.reduce((s, t) => s + t.x, 0) / targets.length : 700;
        for (const t of targets) delay(t, 0.45);
        this.fxs.push(new Falling(cx, GROUND_Y - 30, 0.45, 'meteor', '#ff8a3a', this.parts, () => {
          this.fxs.push(new Ring(cx, GROUND_Y, 20, 200, '#ff8a3a', 0.6, 12));
          this.fxs.push(new Burst(cx, GROUND_Y - 40, 140, '#ffb04a', 0.5));
          this.parts.burst(cx, GROUND_Y - 20, 40, { color: '#ff8a3a', shape: 'spark', speed: 380, additive: true, size: 3.5, gravity: 400 });
          this.parts.burst(cx, GROUND_Y - 10, 20, { color: 'rgba(80,60,60,0.6)', shape: 'smoke', speed: 80, size: 8, max: 1.2 });
          this.shake(10, 0.4);
        }, 1.6));
        break;
      }
      case 'frost':
        this.fxs.push(new Ring(src.unit.side === 'hero' ? 700 : src.x, GROUND_Y, 20, 260, '#bff0ff', 0.55, 10));
        onEach((_t, x, y) => this.parts.burst(x, y, 12, { color: '#d8f4ff', shape: 'shard', speed: 160, size: 4 }));
        break;
      case 'blizzard':
        for (let i = 0; i < 26; i++) {
          const x = 560 + Math.random() * 360;
          this.fxs.push(new Falling(x, GROUND_Y - 10 - Math.random() * 60, 0.3 + Math.random() * 0.5, 'ice', '#bff0ff', this.parts));
        }
        for (const t of targets) delay(t, 0.3);
        break;
      case 'chain':
      case 'storm': {
        if (fx === 'storm') {
          onEach((t, x) => {
            delay(t, 0.05);
            this.fxs.push(new Lightning([[x + (Math.random() - 0.5) * 60, 0], [x, t.y - t.height * 0.4]], color, 0.35));
            this.fxs.push(new Burst(x, t.y - t.height * 0.4, 50, color, 0.3));
          });
          this.flash('#ffffff', 0.12);
          this.shake(6);
        } else {
          const pts: [number, number][] = [[sx + dirX * 20, sy - 10]];
          for (const t of targets.slice(0, 6)) pts.push(this.center(t) as [number, number]);
          this.fxs.push(new Lightning(pts, '#ffe35c', 0.35));
        }
        break;
      }
      case 'doom': {
        const cx = targets.length ? targets.reduce((s, t) => s + t.x, 0) / targets.length : 700;
        this.fxs.push(new Vortex(cx, GROUND_Y, 220, '#b67bff', 1));
        this.parts.burst(cx, GROUND_Y - 40, 40, { color: '#b67bff', shape: 'circle', speed: 200, additive: true, size: 3, max: 1 });
        this.flash('#2a0a3a', 0.3);
        this.shake(8, 0.5);
        break;
      }
      case 'nova':
        this.fxs.push(new Ring(src.x, src.y - 20, 20, 320, color === '#e8e2d4' ? '#fff2a8' : color, 0.6, 14, 0.4));
        this.fxs.push(new Burst(src.x, src.y - 40, 120, color, 0.4));
        this.shake(5);
        break;
      case 'hammer':
        onEach((t, x) => {
          delay(t, 0.3);
          this.fxs.push(new Falling(x, t.y - t.height * 0.6, 0.3, 'hammer', '#fff2a8', this.parts, () => {
            this.fxs.push(new Ring(x, t.y, 10, 90, '#fff2a8', 0.4, 8));
            this.parts.burst(x, t.y - 30, 18, { color: '#fff2a8', shape: 'star', speed: 200, additive: true });
            this.shake(7);
          }));
        });
        break;
      case 'heal':
        this.fxs.push(new Ring(src.x, src.y, 10, 70, '#7dff9a', 0.6, 5));
        for (let i = 0; i < 14; i++) this.parts.emit({ x: src.x + (Math.random() - 0.5) * 50, y: src.y - Math.random() * 30, vy: -60 - Math.random() * 40, shape: 'star', color: '#7dff9a', size: 3, max: 1, additive: true });
        break;
      case 'shield':
        this.fxs.push(new Bubble(src.x, src.y - src.height * 0.5, src.height * 0.8, '#8ad0ff', 0.8));
        break;
      case 'buff':
        this.fxs.push(new Ring(src.x, src.y, 10, 60, '#ffd34a', 0.6, 4));
        break;
      case 'poison':
        onEach((_t, x, y) => this.parts.burst(x, y, 16, { color: 'rgba(122,209,106,0.55)', shape: 'smoke', speed: 60, size: 9, max: 1.2 }));
        break;
      case 'blades':
        for (let i = 0; i < Math.min(8, targets.length * 3); i++) {
          const t = targets[i % targets.length];
          const [tx, ty] = this.center(t);
          const d = 0.12 + i * 0.03;
          delay(t, d);
          this.fxs.push(new Projectile(sx, sy - 10 + (Math.random() - 0.5) * 30, tx, ty + (Math.random() - 0.5) * 20, d, 'blade', '#b67bff', 6, this.parts, 30));
        }
        break;
      case 'summon':
        this.fxs.push(new Vortex(src.unit.side === 'hero' ? 340 : src.x, GROUND_Y + 10, 60, '#b67bff', 0.8));
        break;
      case 'spit':
        projectile('spit', 6, '#7ad16a', 40);
        break;
      case 'breath':
        onEach((t, x, y) => {
          delay(t, 0.2);
          for (let i = 0; i < 22; i++) {
            const k = Math.random();
            this.parts.emit({ x: sx + dirX * 30, y: sy - 20, vx: (x - sx) * (1.6 + k), vy: (y - sy + 20) * (1.6 + k) + (Math.random() - 0.5) * 60, size: 6, color, max: 0.5, additive: true, shape: 'circle' });
          }
        });
        break;
      case 'slam':
        onEach((t, x) => {
          delay(t, 0.12);
          this.fxs.push(new Ring(x, t.y, 10, 110, '#e8d8c0', 0.4, 8));
          this.parts.burst(x, t.y, 10, { color: 'rgba(160,140,120,0.6)', shape: 'smoke', speed: 90, size: 6, max: 0.8 });
        });
        if (src.unit.boss) this.shake(8);
        break;
    }
  }

  private onHit(e: GameEvents['unit:hit']) {
    const t = this.actors.get(e.tgt.uid);
    if (!t) return;
    const settings = this.game.state.settings;
    const run = () => {
      t.hurt = 1;
      if (!settings.dmgNumbers) return;
      const toHero = e.tgt.side === 'hero';
      let color = toHero ? '#ff7070' : '#ffffff';
      let size = e.dot ? 15 : 22;
      if (e.dot) color = toHero ? '#ff9a9a' : ELEMENT_COLOR[e.element as Element] ?? '#ffd0d0';
      else if (e.proc) color = ELEMENT_COLOR[e.element as Element] ?? '#ffe08a';
      if (e.crit) { color = '#ffd34a'; size = 32; }
      const [x, y] = this.center(t);
      this.texts.add({ x: x + (Math.random() - 0.5) * 30, y: y - 20 - Math.random() * 20, text: fmt(e.amount) + (e.crit ? '!' : ''), color, size, max: e.crit ? 1.1 : 0.85, crit: e.crit });
      if (e.absorbed > 0 && !e.dot) this.texts.add({ x, y: y - 40, text: `吸收 ${fmt(e.absorbed)}`, color: '#8ad0ff', size: 14, max: 0.8, crit: false });
      if (!e.dot) this.parts.burst(x, y, e.crit ? 10 : 4, { color: e.crit ? '#ffd34a' : ELEMENT_COLOR[e.element as Element] ?? '#fff', shape: 'spark', speed: e.crit ? 300 : 180, additive: true, size: 2.4, max: 0.4 });
      if (e.crit) this.shake(3, 0.15);
    };
    if (t.delayUntil > this.time) t.pending.push({ at: t.delayUntil, fn: run });
    else run();
  }

  private onProc(e: GameEvents['unit:proc']) {
    const src = this.actors.get(e.src.uid);
    if (!src) return;
    this.text(e.src, e.name, '#ffd34a', 18, -0.35);
    const targets = e.targets.map(t => this.actors.get(t.uid)).filter((x): x is Actor => !!x);
    if (e.fx === 'chain' && targets.length) {
      const pts: [number, number][] = [this.center(src) as [number, number], ...targets.map(t => this.center(t) as [number, number])];
      this.fxs.push(new Lightning(pts, '#ffe35c', 0.3));
    } else if (e.fx === 'meteor') {
      for (const t of targets) this.fxs.push(new Falling(t.x, t.y - t.height * 0.5, 0.35, 'star', '#fff2a8', this.parts, () => this.fxs.push(new Burst(t.x, t.y - 40, 70, '#fff2a8'))));
    } else if (e.fx === 'nova') {
      this.fxs.push(new Ring(src.x, src.y - 20, 20, 300, '#fff2a8', 0.5, 10, 0.4));
    } else if (e.fx === 'shield') {
      this.fxs.push(new Bubble(src.x, src.y - src.height * 0.5, src.height * 0.8, '#ffe08a', 0.8));
    } else if (e.fx === 'heavy') {
      for (const t of targets) this.fxs.push(new Burst(t.x, t.y - t.height * 0.5, 70, '#ff4a4a', 0.4));
    }
  }

  private onDeath(u: Unit) {
    const a = this.actors.get(u.uid);
    if (!a) return;
    if (u.kind === 'hero') {
      this.texts.add({ x: a.x, y: a.y - 120, text: '倒下了…', color: '#ff8a8a', size: 26, max: 2, crit: true, vy: -10 });
      return;
    }
    a.dying = 0.0001;
    const [x, y] = this.center(a);
    const colors = (a.mdef as MonsterDef | undefined)?.palette ?? ['#ffffff', '#cccccc', '#999999'];
    for (const c of colors) this.parts.burst(x, y, u.boss ? 18 : 6, { color: c, shape: 'square', speed: 200, gravity: 500, size: u.boss ? 5 : 3.5, max: 0.9 });
    this.parts.emit({ x, y, vy: -50, color: 'rgba(255,255,255,0.6)', shape: 'circle', size: 8, max: 1, additive: true });
    if (u.boss) {
      this.fxs.push(new Burst(x, y, 200, '#ffffff', 0.6));
      this.shake(12, 0.6);
      this.flash('#ffffff', 0.3);
      this.banner = { text: '擊敗首領！', sub: u.name, t: 0, color: '#ffe35c' };
    }
  }

  // ---------------------------------------------------------------------
  // 主繪製
  // ---------------------------------------------------------------------
  frame(dt: number) {
    dt = Math.min(dt, 0.1);
    this.time += dt;
    this.sync();
    this.updateBg();
    if (this.walk > 0) {
      this.walk -= dt;
      this.scroll += 240 * dt;
    }
    this.updateActors(dt);
    for (const f of this.fxs) {
      f.t += dt;
      f.update?.(dt);
    }
    const finished = this.fxs.filter(f => f.t >= f.dur);
    this.fxs = this.fxs.filter(f => f.t < f.dur);
    for (const f of finished) f.done?.();
    const quality = this.game.state.settings.particles;
    this.parts.density = quality === 'high' ? 1 : quality === 'low' ? 0.4 : 0;
    this.ambient(dt);
    this.parts.update(dt);
    this.texts.update(dt);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > 2.2) this.banner = null;
    }
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.draw();
  }

  private updateBg() {
    const act = this.game.activity;
    const stage = this.game.state.progress.stage;
    const region = act.kind === 'dungeon' ? regionOfStage(Math.max(0, this.game.state.progress.best[0])) : act.kind === 'tower' ? regionOfStage(70) : regionOfStage(stage);
    const key = act.kind + ':' + region.id;
    if (key === this.bgKey) {
      if (this.bgFade < 1) this.bgFade = Math.min(1, this.bgFade + 0.03);
      return;
    }
    this.prevBg = this.bg;
    this.bg = new Background(region.bg, region.id.length * 7 + (act.kind === 'tower' ? 99 : 0));
    this.bgKey = key;
    this.bgFade = this.prevBg ? 0 : 1;
  }

  private updateActors(dt: number) {
    for (const a of this.actors.values()) {
      const u = a.unit;
      if (a.spawn < 1) a.spawn = Math.min(1, a.spawn + dt * 2.2);
      const ease = easeOut(a.spawn);
      const targetX = a.homeX;
      if (u.side === 'enemy') a.x = lerp(a.homeX + 260, targetX, ease);
      else if (a.spawn < 1) a.x = lerp(a.homeX - 80, targetX, ease);
      else a.x += (targetX - a.x) * Math.min(1, dt * 8);
      a.y += (a.homeY - a.y) * Math.min(1, dt * 8);
      if (a.attack >= 0) {
        a.attack += dt;
        if (a.attack > a.attackDur) a.attack = -1;
      }
      a.hurt = Math.max(0, a.hurt - dt * 5);
      a.cast = u.casting ? 1 - u.casting.remaining / u.casting.total : Math.max(0, a.cast - dt * 3);
      if (a.dying >= 0) a.dying += dt;
      if (a.pending.length) {
        const due = a.pending.filter(p => p.at <= this.time);
        a.pending = a.pending.filter(p => p.at > this.time);
        for (const p of due) p.fn();
      }
      if (this.time > a.blinkAt + 0.12) a.blinkAt = this.time + 2 + Math.random() * 3;
    }
  }

  private ambient(dt: number) {
    const theme = this.bg?.theme;
    if (!theme || this.parts.density === 0) return;
    this.ambientAcc += dt * this.parts.density;
    const rate = 0.08;
    while (this.ambientAcc > rate) {
      this.ambientAcc -= rate;
      const x = Math.random() * VIEW_W;
      switch (theme.particles) {
        case 'fireflies':
          this.parts.emit({ x, y: 160 + Math.random() * 180, vx: (Math.random() - 0.5) * 20, vy: -8, color: '#e8ff8a', size: 2, max: 3, additive: true });
          break;
        case 'leaves':
          this.parts.emit({ x: x + 100, y: -10, vx: -40 - Math.random() * 30, vy: 40 + Math.random() * 20, color: Math.random() < 0.5 ? '#7aa84a' : '#c88a3a', size: 3, max: 6, shape: 'leaf', vr: 3 });
          break;
        case 'dust':
          this.parts.emit({ x, y: 80 + Math.random() * 260, vx: 6, vy: -4, color: 'rgba(220,200,180,0.5)', size: 1.6, max: 4 });
          break;
        case 'sand':
          this.parts.emit({ x: VIEW_W + 10, y: 120 + Math.random() * 240, vx: -260 - Math.random() * 120, vy: 10, color: 'rgba(240,210,150,0.6)', size: 1.5, max: 4, shape: 'spark' });
          break;
        case 'snow':
          this.parts.emit({ x: x + 60, y: -10, vx: -20 - Math.random() * 20, vy: 40 + Math.random() * 30, color: '#ffffff', size: 1.5 + Math.random() * 2, max: 9, shape: 'snow' });
          break;
        case 'embers':
          this.parts.emit({ x, y: GROUND_Y + 20, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 60, color: '#ff8a3a', size: 2, max: 4, additive: true });
          break;
        case 'sparks':
          this.parts.emit({ x, y: Math.random() * 300, vx: -30, vy: 0, color: '#c8e0ff', size: 1.6, max: 2, additive: true });
          break;
        case 'motes':
          this.parts.emit({ x, y: GROUND_Y, vx: (Math.random() - 0.5) * 10, vy: -30 - Math.random() * 20, color: '#b67bff', size: 2, max: 6, additive: true });
          break;
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const s = this.scale * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let sx = 0, sy = 0;
    if (this.shakeT > 0) {
      const m = this.shakeMag * (this.shakeT / 0.25);
      sx = (Math.random() - 0.5) * m;
      sy = (Math.random() - 0.5) * m;
    } else this.shakeMag = 0;
    ctx.setTransform(s, 0, 0, s, (sx - this.offsetX) * s, sy * s);

    // 背景
    if (this.prevBg && this.bgFade < 1) {
      this.prevBg.draw(ctx, this.scroll, this.time);
      ctx.globalAlpha = this.bgFade;
    }
    this.bg?.draw(ctx, this.scroll, this.time);
    ctx.globalAlpha = 1;
    if (this.bgFade >= 1) this.prevBg = null;

    // 單位（依 y 排序）
    const list = [...this.actors.values()].sort((a, b) => a.y - b.y);
    for (const a of list) this.drawActor(ctx, a);

    this.parts.draw(ctx);
    for (const f of this.fxs) f.draw(ctx);
    for (const a of list) this.drawOverlay(ctx, a);
    this.texts.draw(ctx);
    this.drawBossHud(ctx);
    this.drawBanner(ctx);

    // 英雄倒下
    if (this.game.activity.phase === 'dead') {
      ctx.fillStyle = 'rgba(20,10,20,0.45)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#ffd0d0';
      ctx.font = '900 28px "Noto Sans TC", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('倒下了…即將在營地復活', this.offsetX + this.visibleW() / 2, VIEW_H / 2);
    }
    if (this.flashT > 0) {
      ctx.globalAlpha = Math.min(0.6, this.flashT * 2);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }

  private drawActor(ctx: Ctx, a: Actor) {
    const u = a.unit;
    const alive = u.alive || u.kind === 'hero';
    let alphaV = Math.min(1, a.spawn * 1.5);
    let sink = 0;
    if (a.dying >= 0 && u.kind !== 'hero') {
      alphaV *= Math.max(0, 1 - a.dying / 0.6);
      sink = a.dying * 30;
    }
    if (alphaV <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alphaV;
    ctx.translate(a.x, a.y + sink);
    if (a.hurt > 0) ctx.filter = `brightness(${1 + a.hurt * 1.2}) saturate(${1 - a.hurt * 0.5})`;
    if (u.kind === 'hero' && !u.alive) {
      ctx.rotate(-1.4);
      ctx.translate(-30, 10);
      ctx.filter = 'grayscale(0.8) brightness(0.8)';
    }
    if (u.shield > 0) glow(ctx, 0, -a.height * 0.5, a.height * 0.8, '#8ad0ff', 0.25);
    if (u.elite.length && alive) glow(ctx, 0, -a.height * 0.4, a.height * 0.9, '#ff6a4a', 0.18 + Math.sin(this.time * 4) * 0.06);
    if (u.casting) glow(ctx, 0, -a.height * 0.5, a.height * (0.6 + a.cast * 0.6), '#ff4aff', 0.25 + a.cast * 0.3);

    const attackK = a.attack >= 0 ? clamp01(a.attack / a.attackDur) : -1;
    if (u.kind === 'hero') {
      const img = classImage(u.defId);
      const look = u.look as HeroLook;
      if (img) this.drawImageUnit(ctx, img, 110, false, attackK);
      else {
        const pose: Pose = { t: this.time, attack: attackK, walk: this.walk > 0 ? this.time * 5 : 0, cast: a.cast, blink: this.time > a.blinkAt, hurt: a.hurt };
        paintHero(ctx, look, pose);
      }
    } else if (a.mdef && a.arch) {
      const flip = u.side === 'enemy';
      const imgPath = u.kind === 'monster' ? monsterImage(a.mdef.id) : u.kind === 'pet' ? petImage(a.mdef.id) : null;
      if (imgPath) this.drawImageUnit(ctx, imgPath, a.height * 1.1, flip, attackK);
      else {
        ctx.scale(flip ? -a.scale : a.scale, a.scale);
        const walkBob = u.kind === 'pet' && this.walk > 0 ? Math.abs(Math.sin(this.time * 10)) * -4 : 0;
        ctx.translate(0, walkBob);
        paintMonster(ctx, a.arch, a.mdef.palette, a.mdef.features, { t: this.time + a.seed, attack: attackK, cast: a.cast, seed: a.seed });
      }
    }
    ctx.restore();
    ctx.filter = 'none';
  }

  private drawImageUnit(ctx: Ctx, img: HTMLImageElement, h: number, flip: boolean, attackK: number) {
    const w = (img.width / img.height) * h;
    const lunge = attackK >= 0 ? Math.sin(attackK * Math.PI) * 12 : 0;
    const bob = Math.sin(this.time * 2.4) * 2;
    ctx.save();
    if (flip) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.35, w * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(img, -w / 2 + lunge, -h + bob, w, h);
    ctx.restore();
  }

  private drawOverlay(ctx: Ctx, a: Actor) {
    const u = a.unit;
    if (!u.alive || a.dying >= 0 || u.kind === 'pet' || u.kind === 'summon') return;
    if (u.boss) return;
    const w = u.kind === 'hero' ? 64 : 54;
    const x = a.x - w / 2;
    const y = a.y - a.height - 16;
    ctx.globalAlpha = Math.min(1, a.spawn * 2);
    // 名稱（精英）
    if (u.elite.length) {
      ctx.font = '700 12px "Noto Sans TC", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1b1420';
      ctx.strokeText(u.name, a.x, y - 8);
      ctx.fillStyle = '#ffb08a';
      ctx.fillText(u.name, a.x, y - 8);
    }
    rrect(ctx, x - 1, y - 1, w + 2, 7, 3);
    ctx.fillStyle = 'rgba(10,8,14,0.75)';
    ctx.fill();
    const pct = Math.max(0, u.hp / u.stats.hp);
    rrect(ctx, x, y, w * pct, 5, 2.5);
    ctx.fillStyle = u.side === 'hero' ? '#5ad86a' : '#e5484d';
    ctx.fill();
    if (u.shield > 0) {
      rrect(ctx, x, y, w * Math.min(1, u.shield / u.stats.hp), 2, 1);
      ctx.fillStyle = '#9ad8ff';
      ctx.fill();
    }
    // 狀態圖示
    if (u.statuses.length) {
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      let ix = x;
      for (const s of u.statuses.slice(0, 5)) {
        ctx.fillStyle = STATUSES[s.id].color;
        ctx.beginPath();
        ctx.arc(ix + 4, y + 13, 4, 0, Math.PI * 2);
        ctx.fill();
        if (s.stacks > 1) {
          ctx.fillStyle = '#fff';
          ctx.fillText(String(s.stacks), ix + 9, y + 17);
          ix += 8;
        }
        ix += 11;
      }
    }
    // 詠唱條
    if (u.casting) {
      rrect(ctx, x, y - 10, w, 4, 2);
      ctx.fillStyle = 'rgba(10,8,14,0.75)';
      ctx.fill();
      rrect(ctx, x, y - 10, w * a.cast, 4, 2);
      ctx.fillStyle = '#ff8aff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawBossHud(ctx: Ctx) {
    const boss = this.game.battle?.units.find(u => u.boss && u.alive);
    if (!boss) return;
    const visW = this.visibleW();
    const W = Math.min(520, visW - 30), x = this.offsetX + (visW - W) / 2, y = 22;
    ctx.save();
    rrect(ctx, x - 10, y - 8, W + 20, 48, 10);
    ctx.fillStyle = 'rgba(10,6,16,0.65)';
    ctx.fill();
    ctx.font = '900 16px "Noto Sans TC", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd0d0';
    ctx.fillText('👑 ' + boss.name, x, y + 8);
    ctx.textAlign = 'right';
    ctx.font = '700 13px "Noto Sans TC", system-ui, sans-serif';
    const act = this.game.activity;
    if (act.timeTotal > 0) {
      const low = act.timeLeft < 10_000;
      ctx.fillStyle = low ? (Math.sin(this.time * 10) > 0 ? '#ff6a6a' : '#ffd0d0') : '#ffd0d0';
      ctx.fillText('⏱ ' + fmtClock(act.timeLeft), x + W, y + 8);
    }
    const pct = Math.max(0, boss.hp / boss.stats.hp);
    rrect(ctx, x, y + 16, W, 14, 6);
    ctx.fillStyle = '#2a1018';
    ctx.fill();
    const g = ctx.createLinearGradient(x, 0, x + W, 0);
    g.addColorStop(0, '#ff4a5a');
    g.addColorStop(1, '#ff8a5a');
    rrect(ctx, x, y + 16, W * pct, 14, 6);
    ctx.fillStyle = g;
    ctx.fill();
    if (boss.shield > 0) {
      rrect(ctx, x, y + 16, W * Math.min(1, boss.shield / boss.stats.hp), 5, 3);
      ctx.fillStyle = '#9ad8ff';
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${fmt(Math.max(0, boss.hp))} / ${fmt(boss.stats.hp)}`, x + W / 2, y + 27);
    if (boss.casting) {
      const k = 1 - boss.casting.remaining / boss.casting.total;
      rrect(ctx, x + W * 0.25, y + 36, W * 0.5, 6, 3);
      ctx.fillStyle = 'rgba(40,10,40,0.9)';
      ctx.fill();
      rrect(ctx, x + W * 0.25, y + 36, W * 0.5 * k, 6, 3);
      ctx.fillStyle = '#ff8aff';
      ctx.fill();
      ctx.font = '700 12px "Noto Sans TC", system-ui, sans-serif';
      ctx.fillStyle = '#ffc8ff';
      ctx.fillText(`${boss.casting.skill.name}（暈眩可打斷）`, x + W / 2, y + 56);
    }
    ctx.restore();
  }

  private drawBanner(ctx: Ctx) {
    const b = this.banner;
    if (!b) return;
    const k = b.t;
    const a = k < 0.25 ? k / 0.25 : k > 1.7 ? Math.max(0, 1 - (k - 1.7) / 0.5) : 1;
    const sc = k < 0.25 ? 1.4 - (k / 0.25) * 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(this.offsetX + this.visibleW() / 2, 150);
    ctx.scale(sc, sc);
    const g = ctx.createLinearGradient(-300, 0, 300, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(10,4,16,0.7)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-300, -36, 600, 74);
    ctx.textAlign = 'center';
    ctx.font = '900 34px "Noto Sans TC", system-ui, sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1b1420';
    ctx.strokeText(b.text, 0, 0);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, 0, 0);
    ctx.font = '700 15px "Noto Sans TC", system-ui, sans-serif';
    ctx.fillStyle = alpha('#ffffff', 0.85);
    ctx.fillText(b.sub, 0, 26);
    ctx.restore();
  }
}

export { MONSTER_MAP };
