/**
 * 音效與配樂（WebAudio）
 * - 音效：優先播放 public/audio/sfx/ 的 CC0 取樣（同一種音效有多個版本隨機挑選並微調音高）
 * - 配樂：播放 public/audio/music/ 的 CC0 曲目，換區域時交叉淡入淡出
 * - 音檔還沒載入或載入失敗時，退回程式合成
 */

type SfxName =
  | 'hit' | 'crit' | 'slash' | 'arrow' | 'magic' | 'fire' | 'ice' | 'lightning' | 'holy' | 'shadow' | 'heal'
  | 'coin' | 'levelup' | 'loot' | 'legend' | 'death' | 'boss' | 'enhance' | 'fail' | 'break' | 'click' | 'hurt' | 'shield'
  | 'achievement' | 'herodeath' | 'bossdown';

/** 每種音效有幾個取樣檔（audio/sfx/{name}_{i}.wav） */
const SAMPLE_COUNT: Partial<Record<SfxName, number>> = {
  hit: 5, crit: 5, hurt: 5, slash: 3, shield: 3, coin: 2, loot: 2, legend: 1, levelup: 1, achievement: 1, herodeath: 1, bossdown: 1,
  boss: 2, enhance: 3, fail: 1, break: 3, click: 2, holy: 2, heal: 2, magic: 2, death: 2,
};
/** 各音效的取樣音量（取樣本身響度不一，在這裡校正） */
const SAMPLE_GAIN: Partial<Record<SfxName, number>> = {
  hit: 0.55, crit: 0.8, hurt: 0.5, slash: 0.6, shield: 0.5, coin: 0.45, loot: 0.6, legend: 0.8, levelup: 0.8, achievement: 0.7,
  herodeath: 0.7, bossdown: 0.75, boss: 0.7, enhance: 0.6, fail: 0.5, break: 0.7, click: 0.4, holy: 0.45, heal: 0.5, magic: 0.45, death: 0.5,
  fire: 0.6, ice: 0.6, lightning: 0.6,
};
/** 音高隨機範圍（配樂短句不變調） */
const NO_PITCH = new Set<SfxName>(['legend', 'levelup', 'achievement', 'herodeath', 'bossdown']);

/** 配樂曲目：區域 id、boss、dungeon、title */
export type TrackKey = string;
const LOOP_TRACKS = new Set(['desert', 'dungeon', 'sky', 'abyss', 'boss']);

const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private last: Record<string, number> = {};
  sfxVol = 0.6;
  musicVol = 0.35;
  // 取樣
  private samples = new Map<string, AudioBuffer[]>();
  private samplesLoading = false;
  private voices = 0;
  // 配樂（檔案）
  private track: TrackKey | null = null;
  private trackBuffers = new Map<TrackKey, AudioBuffer | null>();
  private current: { key: TrackKey; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  // 音樂（程式合成備援）
  private music: { root: number; scale: string; tempo: number; intense: boolean } | null = null;
  private nextNote = 0;
  private step = 0;
  private timer: number | null = null;

  /** 第一次使用者互動時呼叫 */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.setVolumes(this.sfxVol, this.musicVol);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    void this.loadSamples();
    if (this.track) void this.playTrack(this.track);
    else if (this.music) this.startScheduler();
  }

  private base() {
    return import.meta.env.BASE_URL;
  }

  private async decode(url: string): Promise<AudioBuffer | null> {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await this.ctx!.decodeAudioData(await r.arrayBuffer());
    } catch {
      return null;
    }
  }

  private async loadSamples() {
    if (this.samplesLoading || !this.ctx) return;
    this.samplesLoading = true;
    const jobs: Promise<void>[] = [];
    for (const [name, n] of Object.entries(SAMPLE_COUNT)) {
      for (let i = 0; i < (n ?? 0); i++) {
        jobs.push(this.decode(`${this.base()}audio/sfx/${name}_${i}.wav`).then(b => {
          if (!b) return;
          const list = this.samples.get(name) ?? [];
          list.push(b);
          this.samples.set(name, list);
        }));
      }
    }
    await Promise.all(jobs);
  }

  /** 播放取樣；沒有取樣時回傳 false 讓呼叫端改用合成 */
  private playSample(name: SfxName, v: number, t: number): boolean {
    const list = this.samples.get(name);
    if (!list?.length || !this.ctx) return false;
    if (this.voices > 14) return true; // 同時發聲太多就略過，避免爆音
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    if (!NO_PITCH.has(name)) src.playbackRate.value = 0.93 + Math.random() * 0.14;
    const g = c.createGain();
    g.gain.value = (SAMPLE_GAIN[name] ?? 0.6) * (0.55 + 0.45 * v);
    src.connect(g).connect(this.sfxBus);
    this.voices++;
    src.onended = () => { this.voices--; };
    src.start(t);
    return true;
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVol = sfx;
    this.musicVol = music;
    if (!this.ctx) return;
    this.sfxBus.gain.value = sfx * 0.8;
    this.musicBus.gain.value = music * 0.7;
  }

  // ---------------------------------------------------------------------
  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private tone(type: OscillatorType, f0: number, f1: number, t: number, dur: number, vol: number, bus: GainNode, attack = 0.005) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, attack, vol, dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
  }

  private noise(t: number, dur: number, vol: number, filter: BiquadFilterType, f0: number, f1 = f0, q = 1, bus = this.sfxBus) {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter();
    fl.type = filter;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    this.env(g, t, 0.003, vol, dur);
    s.connect(fl).connect(g).connect(bus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  play(name: SfxName, intensity = 1) {
    if (!this.ctx || this.sfxVol <= 0) return;
    const now = this.ctx.currentTime;
    const gap = name === 'coin' ? 0.05 : name === 'hit' ? 0.04 : 0.06;
    if ((this.last[name] ?? 0) > now - gap) return;
    this.last[name] = now;
    const t = now + 0.005;
    const v = Math.min(1, intensity);
    if (this.playSample(name, v, t)) return;
    const B = this.sfxBus;
    switch (name) {
      case 'achievement':
      case 'bossdown':
        for (const [i, f] of [880, 1109, 1319].entries()) this.tone('triangle', f, f, t + i * 0.05, 0.2, 0.08, B);
        break;
      case 'herodeath':
        this.tone('sawtooth', 300, 60, t, 0.6, 0.12, B);
        break;
      case 'hit':
        this.noise(t, 0.08, 0.35 * v, 'bandpass', 1800, 600, 1.2);
        this.tone('sine', 160, 60, t, 0.1, 0.4 * v, B);
        break;
      case 'crit':
        this.noise(t, 0.12, 0.5, 'bandpass', 3000, 800, 1);
        this.tone('sine', 200, 50, t, 0.18, 0.6, B);
        this.tone('triangle', 1400, 2200, t, 0.12, 0.15, B);
        break;
      case 'hurt':
        this.tone('square', 220, 110, t, 0.1, 0.12, B);
        this.noise(t, 0.06, 0.2, 'lowpass', 900);
        break;
      case 'slash':
        this.noise(t, 0.14, 0.3, 'highpass', 1500, 5000, 0.8);
        break;
      case 'arrow':
        this.tone('triangle', 680, 440, t, 0.08, 0.15, B);
        this.noise(t, 0.1, 0.18, 'bandpass', 3000, 1500, 2);
        break;
      case 'magic':
        this.tone('sine', 500, 1100, t, 0.18, 0.18, B, 0.01);
        this.tone('sine', 750, 1650, t + 0.02, 0.18, 0.08, B, 0.01);
        break;
      case 'fire':
        this.noise(t, 0.4, 0.4, 'lowpass', 1200, 200, 0.7);
        this.tone('sawtooth', 120, 60, t, 0.3, 0.1, B);
        break;
      case 'ice':
        for (let i = 0; i < 3; i++) this.tone('sine', 1800 + i * 600, 1600 + i * 600, t + i * 0.03, 0.25, 0.08, B);
        this.noise(t, 0.15, 0.15, 'highpass', 6000);
        break;
      case 'lightning':
        for (let i = 0; i < 4; i++) this.noise(t + i * 0.025, 0.04, 0.35, 'highpass', 2500);
        this.tone('sawtooth', 90, 40, t, 0.3, 0.15, B);
        break;
      case 'holy':
        for (const [i, f] of [523, 659, 784, 1047].entries()) this.tone('sine', f, f, t + i * 0.02, 0.5, 0.07, B, 0.02);
        break;
      case 'shadow':
        this.tone('sawtooth', 220, 70, t, 0.35, 0.12, B, 0.02);
        this.noise(t, 0.3, 0.2, 'lowpass', 600, 150);
        break;
      case 'heal':
        for (const [i, f] of [523, 659, 784].entries()) this.tone('sine', f, f * 1.01, t + i * 0.06, 0.3, 0.08, B, 0.02);
        break;
      case 'shield':
        this.tone('sine', 300, 600, t, 0.3, 0.12, B, 0.03);
        break;
      case 'coin':
        this.tone('square', 1320, 1320, t, 0.05, 0.05, B);
        this.tone('square', 1760, 1760, t + 0.05, 0.08, 0.05, B);
        break;
      case 'loot':
        for (const [i, f] of [880, 1109, 1319].entries()) this.tone('triangle', f, f, t + i * 0.05, 0.2, 0.08, B);
        break;
      case 'legend':
        for (const [i, f] of [523, 659, 784, 1047, 1319, 1568].entries()) this.tone('triangle', f, f, t + i * 0.07, 0.6, 0.1, B);
        this.noise(t, 0.8, 0.08, 'highpass', 7000);
        break;
      case 'levelup':
        for (const [i, f] of [392, 523, 659, 784, 1047].entries()) this.tone('square', f, f, t + i * 0.08, 0.25, 0.06, B);
        this.tone('triangle', 1047, 1047, t + 0.4, 0.8, 0.1, B);
        break;
      case 'death':
        this.tone('sawtooth', 300, 60, t, 0.6, 0.12, B);
        break;
      case 'boss':
        this.tone('sawtooth', 73, 73, t, 1.2, 0.2, B, 0.05);
        this.tone('sawtooth', 110, 110, t + 0.05, 1.1, 0.12, B, 0.05);
        this.noise(t, 0.5, 0.4, 'lowpass', 300, 60);
        break;
      case 'enhance':
        this.tone('square', 660, 660, t, 0.06, 0.08, B);
        this.tone('square', 990, 990, t + 0.06, 0.06, 0.08, B);
        this.tone('triangle', 1320, 1320, t + 0.12, 0.3, 0.1, B);
        break;
      case 'fail':
        this.tone('triangle', 400, 200, t, 0.3, 0.12, B);
        break;
      case 'break':
        this.noise(t, 0.5, 0.5, 'highpass', 2000, 500);
        this.tone('sawtooth', 300, 40, t, 0.5, 0.15, B);
        break;
      case 'click':
        this.tone('sine', 900, 700, t, 0.04, 0.06, B);
        break;
    }
  }

  // ---------------------------------------------------------------------
  // 配樂（檔案）：區域曲、首領曲、副本曲、標題曲
  // ---------------------------------------------------------------------
  /** 切換配樂曲目；fallback 是載入失敗時用的合成配樂設定 */
  setTrack(key: TrackKey | null, fallback?: { root: number; scale: string; tempo: number } | null, intense = false) {
    if (key === this.track) return;
    this.track = key;
    this.fallback = fallback ?? null;
    this.fallbackIntense = intense;
    if (this.ctx) void this.playTrack(key);
  }
  private fallback: { root: number; scale: string; tempo: number } | null = null;
  private fallbackIntense = false;

  private async playTrack(key: TrackKey | null) {
    if (!this.ctx) return;
    if (!key) { this.fadeOutCurrent(); return; }
    let buf = this.trackBuffers.get(key);
    if (buf === undefined) {
      buf = await this.decode(`${this.base()}audio/music/${key}.m4a`);
      this.trackBuffers.set(key, buf);
    }
    if (this.track !== key) return; // 載入期間又換了曲目
    if (!buf) {
      // 檔案配樂載入失敗：改用合成配樂
      this.fadeOutCurrent();
      this.music = this.fallback ? { ...this.fallback, intense: this.fallbackIntense } : null;
      this.startScheduler();
      return;
    }
    this.music = null; // 停掉合成配樂
    if (this.current?.key === key) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    if (!LOOP_TRACKS.has(key)) {
      // 非循環設計的曲子：避開開頭與結尾可能的空白
      src.loopStart = 0.05;
      src.loopEnd = Math.max(0.1, buf.duration - 0.05);
    }
    const g = c.createGain();
    const now = c.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(1, now + 1.2);
    src.connect(g).connect(this.musicBus);
    src.start(now);
    this.fadeOutCurrent();
    this.current = { key, src, gain: g };
  }

  private fadeOutCurrent() {
    if (!this.current || !this.ctx) return;
    const { src, gain } = this.current;
    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    src.stop(now + 1.3);
    this.current = null;
  }

  // ---------------------------------------------------------------------
  // 配樂（合成備援）：每個區域依調式與速度生成循環
  // ---------------------------------------------------------------------
  setMusic(m: { root: number; scale: string; tempo: number } | null, intense = false) {
    const next = m ? { ...m, intense } : null;
    if (JSON.stringify(next) === JSON.stringify(this.music)) return;
    this.music = next;
    this.step = 0;
    if (this.ctx) this.startScheduler();
  }

  private startScheduler() {
    if (this.timer !== null) return;
    this.nextNote = this.ctx!.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 100);
  }

  private schedule() {
    if (!this.ctx || !this.music || this.musicVol <= 0) return;
    const m = this.music;
    const tempo = m.tempo * (m.intense ? 1.15 : 1);
    const sixteenth = 60 / tempo / 4;
    const scale = SCALES[m.scale] ?? SCALES.minor;
    const prog = m.scale === 'major' || m.scale === 'lydian' ? [0, 5, 3, 4] : [0, 5, 2, 6];
    while (this.nextNote < this.ctx.currentTime + 0.25) {
      const t = this.nextNote;
      const s = this.step;
      const bar = Math.floor(s / 16) % 4;
      const deg = prog[bar];
      const chordRoot = m.root + scale[deg % 7] + (deg >= 7 ? 12 : 0);
      const note = (d: number) => m.root + scale[(deg + d) % 7] + Math.floor((deg + d) / 7) * 12;
      const B = this.musicBus;
      // 鋪底和弦
      if (s % 16 === 0) {
        for (const d of [0, 2, 4]) this.tone('triangle', midi(note(d)), midi(note(d)), t, sixteenth * 15, 0.035, B, 0.3);
      }
      // 貝斯
      if (s % 4 === 0 || (m.intense && s % 2 === 0)) {
        const bn = chordRoot - 24 + (s % 8 === 4 ? 7 : 0);
        this.tone(m.intense ? 'sawtooth' : 'sine', midi(bn), midi(bn), t, sixteenth * 2.5, m.intense ? 0.05 : 0.09, B);
      }
      // 琶音
      const arp = [0, 2, 4, 7, 4, 2, 0, 4];
      if (s % 2 === 0) {
        const n = note(arp[(s / 2) % arp.length]) + 12;
        this.tone('sine', midi(n), midi(n), t, sixteenth * 1.8, 0.03, B, 0.01);
      }
      // 旋律（偶爾）
      if (s % 8 === 6 && ((s * 7919) % 13) < 6) {
        const n = note([4, 2, 5, 7][(s >> 3) % 4]) + 12;
        this.tone('triangle', midi(n), midi(n), t, sixteenth * 3, 0.04, B, 0.02);
      }
      // 打擊
      if (m.intense) {
        if (s % 4 === 0) { this.tone('sine', 120, 40, t, 0.12, 0.12, B); }
        if (s % 2 === 1) this.noise(t, 0.03, 0.03, 'highpass', 7000, 7000, 1, B);
      } else if (s % 4 === 2) this.noise(t, 0.025, 0.02, 'highpass', 8000, 8000, 1, B);
      this.nextNote += sixteenth;
      this.step++;
    }
  }
}

export const audio = new AudioEngine();
export type { SfxName };
