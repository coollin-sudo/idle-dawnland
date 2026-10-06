'use strict';
(() => {
  const SAVE_KEY = 'dawnland-idle-save-v1';
  const STEP = 100;
  const OFFLINE_CAP_MS = 8 * 3600 * 1000;
  const OFFLINE_RATE = 0.6;

  // ---------- 工具 ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => {
    n = Math.floor(n);
    if (n < 1e5) return n.toLocaleString();
    if (n < 1e8) return (n / 1e4).toFixed(n < 1e6 ? 1 : 0) + '萬';
    return (n / 1e8).toFixed(2) + '億';
  };
  const fmtStat = (k, v) => PCT_KEYS.has(k) ? `${(+v).toFixed(1)}%` : fmt(v);
  const fmtTime = ms => {
    const m = Math.floor(ms / 60000), h = Math.floor(m / 60);
    return h ? `${h} 小時 ${m % 60} 分` : `${m} 分鐘`;
  };
  const weighted = weights => {
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
    return weights.length - 1;
  };
  const xpNeed = lv => Math.round(60 * lv * lv * Math.pow(1.06, lv));

  // ---------- 圖片（有圖用圖，沒圖用 emoji） ----------
  const IMG_OK = {};
  const mobImg = id => `assets/monsters/${id}.png`;
  const zoneImg = id => `assets/zones/${id}.jpg`;
  function preloadImages(done) {
    const paths = [
      ...Object.values(CLASSES).map(c => c.img),
      ...ZONES.flatMap(z => [...z.mobs.map(m => mobImg(m[0])), mobImg(z.boss[0]), zoneImg(z.id)]),
    ];
    let left = paths.length;
    const finish = () => { if (--left === 0) done(); };
    for (const p of paths) {
      const im = new Image();
      im.onload = () => { IMG_OK[p] = true; finish(); };
      im.onerror = finish;
      im.src = p;
    }
  }
  const sprite = (img, emoji, cls = '') => IMG_OK[img]
    ? `<span class="sprite ${cls}"><img src="${img}" alt=""></span>`
    : `<span class="sprite ${cls}"><span class="emo">${emoji}</span></span>`;

  // ---------- 狀態 ----------
  let P = null;   // 存檔資料
  let S = null;   // 計算後的角色數值
  const B = { mob: null, pTimer: 0, mTimer: 0, respawn: 500, dead: 0, cds: {}, potionCd: 0, queueBoss: false, bossWait: 0 };
  const ui = { tab: 'char', enhId: null, dirty: new Set(), lastTabRender: 0, pointerDown: false, logDirty: true };
  const track = { xp: 0, gold: 0, ms: 0 };
  let logs = [];

  function defaultSettings() {
    return { fx: true, dmg: true, autoBoss: true, autoNext: false, autoSell: 0, potionAt: 50, autoAlloc: true };
  }

  function newPlayer(name, cls) {
    P = {
      v: 1, name, cls, level: 1, xp: 0, gold: 100, stones: 1, scrolls: 0, points: 0,
      alloc: { str: 0, dex: 0, int: 0, con: 0 },
      hp: 0, mp: 0,
      equip: Object.fromEntries(SLOTS.map(s => [s, null])),
      inv: [],
      potions: { p1: 10, p2: 0, p3: 0, p4: 0 },
      zone: 0, zoneKills: ZONES.map(() => 0), bossDown: ZONES.map(() => false), abyss: 0,
      settings: defaultSettings(),
      stats: { kills: 0, bosses: 0, deaths: 0, playMs: 0, bestEnh: 0, created: Date.now() },
      rate: { xp: 0, gold: 0 },
      lastTime: Date.now(), nextId: 1,
    };
    P.equip.weapon = genItem(1, 0, 'weapon');
    refresh();
    P.hp = S.maxHp; P.mp = S.maxMp;
  }

  function migrate(d) {
    d.settings = { ...defaultSettings(), ...(d.settings || {}) };
    d.potions = { p1: 0, p2: 0, p3: 0, p4: 0, ...(d.potions || {}) };
    while (d.zoneKills.length < ZONES.length) d.zoneKills.push(0);
    while (d.bossDown.length < ZONES.length) d.bossDown.push(false);
    for (const s of SLOTS) if (!(s in d.equip)) d.equip[s] = null;
    d.rate = d.rate || { xp: 0, gold: 0 };
    return d;
  }

  function save() {
    if (!P) return;
    P.lastTime = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(P)); } catch (e) { /* 儲存空間不可用 */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) { /* 存檔損毀或無法讀取 */ }
    return null;
  }

  // ---------- 裝備 ----------
  function genItem(ilvl, rarity, slot) {
    ilvl = Math.max(1, ilvl);
    slot = slot || pick(SLOTS);
    const R = RARITY[rarity];
    const roll = rand(0.9, 1.1);
    const base = {};
    const b = SLOT_BASE[slot](ilvl);
    for (const k in b) base[k] = k === 'crit' ? +(b[k] * R.mult * roll).toFixed(1) : Math.max(1, Math.round(b[k] * R.mult * roll));
    const aff = {};
    for (let i = 0; i < R.affixes; i++) {
      const a = pick(AFFIXES);
      aff[a.key] = (aff[a.key] || 0) + a.roll(ilvl);
    }
    for (const k in aff) aff[k] = PCT_KEYS.has(k) ? +aff[k].toFixed(1) : Math.round(aff[k]);
    const tier = TIERS[Math.min(TIERS.length - 1, Math.floor((ilvl - 1) / 8))];
    const isWeapon = slot === 'weapon';
    const c = CLASSES[P.cls];
    return {
      id: P.nextId++, slot, ilvl, rarity, enh: 0, lock: false,
      name: tier + (isWeapon ? c.weapon.noun : SLOT_INFO[slot].noun),
      icon: isWeapon ? c.weapon.icon : SLOT_INFO[slot].icon,
      base, aff,
    };
  }

  function itemStats(it) {
    const out = {};
    for (const k in it.base) out[k] = k === 'crit' ? it.base[k] * (1 + 0.12 * it.enh) : Math.round(it.base[k] * (1 + 0.12 * it.enh));
    for (const k in it.aff) out[k] = (out[k] || 0) + it.aff[k];
    return out;
  }

  function itemScore(it) {
    if (!it) return 0;
    const st = itemStats(it), main = CLASSES[P.cls].main;
    const w = { atk: 1, def: 1.2, hp: 0.12, crit: 4, hpPct: 3, atkPct: 5, gold: 1, xp: 1.5, str: 1.2, dex: 1.2, int: 1.2, con: 1.6 };
    let sc = 0;
    for (const k in st) sc += st[k] * (w[k] || 1) * (k === main ? 2 : 1);
    return Math.round(sc);
  }

  const sellPrice = it => Math.round(it.ilvl * 3 * RARITY[it.rarity].mult ** 2 * (1 + it.enh * 0.3));

  function findItem(id) {
    for (const s of SLOTS) if (P.equip[s] && P.equip[s].id === id) return { item: P.equip[s], where: 'equip', slot: s };
    const idx = P.inv.findIndex(i => i.id === id);
    return idx >= 0 ? { item: P.inv[idx], where: 'inv', idx } : null;
  }

  function addItem(it) {
    const name = itemLabel(it);
    if (it.rarity < P.settings.autoSell && !isUpgrade(it)) {
      P.gold += sellPrice(it);
      addLog(`自動賣出 ${name}（+${fmt(sellPrice(it))} 金幣）`, 'dim');
      return;
    }
    if (P.inv.length >= INV_MAX) {
      P.gold += sellPrice(it);
      addLog(`背包已滿，${name} 已自動賣出`, 'warn');
      return;
    }
    P.inv.push(it);
    addLog(`獲得 ${name}`, it.rarity >= 3 ? 'epic' : '');
    if (it.rarity >= 3) toast(`獲得 ${name}`);
    markDirty('bag', 'enh');
  }

  const isUpgrade = it => itemScore(it) > itemScore(P.equip[it.slot]);
  const itemLabel = it => `<span style="color:${RARITY[it.rarity].color}">${it.enh ? '+' + it.enh + ' ' : ''}${esc(it.name)}</span>`;

  function equipItem(id) {
    const f = findItem(id);
    if (!f || f.where !== 'inv') return;
    const old = P.equip[f.item.slot];
    P.inv.splice(f.idx, 1);
    P.equip[f.item.slot] = f.item;
    if (old) P.inv.push(old);
    refresh();
    markDirty('bag', 'char', 'enh');
  }

  function unequip(slot) {
    if (!P.equip[slot]) return;
    if (P.inv.length >= INV_MAX) { toast('背包已滿'); return; }
    P.inv.push(P.equip[slot]);
    P.equip[slot] = null;
    refresh();
    markDirty('bag', 'char', 'enh');
  }

  function sellItem(id) {
    const f = findItem(id);
    if (!f || f.where !== 'inv' || f.item.lock) return;
    P.gold += sellPrice(f.item);
    P.inv.splice(f.idx, 1);
    if (ui.enhId === id) ui.enhId = null;
    markDirty('bag', 'enh');
  }

  function bulkSell(maxRarity) {
    let n = 0, g = 0;
    P.inv = P.inv.filter(it => {
      if (it.lock || it.rarity > maxRarity || isUpgrade(it)) return true;
      n++; g += sellPrice(it);
      return false;
    });
    P.gold += g;
    if (ui.enhId && !findItem(ui.enhId)) ui.enhId = null;
    toast(n ? `賣出 ${n} 件，獲得 ${fmt(g)} 金幣` : '沒有可賣出的裝備');
    markDirty('bag', 'enh');
  }

  // ---------- 強化 ----------
  const enhStoneCost = it => 1 + Math.floor(it.enh / 5);
  const enhGoldCost = it => Math.round((40 + it.ilvl * 10) * Math.pow(it.enh + 1, 1.5));

  function enhance(id, useScroll) {
    const f = findItem(id);
    if (!f) return;
    const it = f.item;
    if (it.enh >= MAX_ENH) return toast('已達強化上限');
    const sc = enhStoneCost(it), gc = enhGoldCost(it);
    if (P.stones < sc) return toast('強化石不足');
    if (P.gold < gc) return toast('金幣不足');
    if (useScroll && P.scrolls < 1) return toast('保護卷軸不足');
    P.stones -= sc; P.gold -= gc;
    const risky = it.enh >= ENH_SAFE;
    if (Math.random() * 100 < ENH_RATES[it.enh]) {
      it.enh++;
      P.stats.bestEnh = Math.max(P.stats.bestEnh, it.enh);
      addLog(`強化成功！${itemLabel(it)}`, 'good');
      enhResult('success', `強化成功！+${it.enh}`);
    } else if (risky && useScroll) {
      P.scrolls--;
      addLog(`強化失敗，保護卷軸保住了 ${itemLabel(it)}`, 'warn');
      enhResult('fail', '強化失敗（裝備已保護）');
    } else if (risky) {
      if (f.where === 'equip') P.equip[f.slot] = null; else P.inv.splice(f.idx, 1);
      ui.enhId = null;
      addLog(`強化失敗… ${itemLabel(it)} 碎裂了`, 'bad');
      enhResult('break', '裝備碎裂了…');
    } else {
      addLog(`強化失敗，${itemLabel(it)} 沒有變化`, 'warn');
      enhResult('fail', '強化失敗（裝備無損）');
    }
    refresh();
    markDirty('bag', 'char', 'enh');
  }

  // ---------- 數值 ----------
  function calcStats() {
    const c = CLASSES[P.cls];
    const s = {};
    for (const k of ATTRS) s[k] = Math.floor(c.base[k] + c.grow[k] * (P.level - 1)) + P.alloc[k];
    const g = { atk: 0, def: 0, hp: 0, crit: 0, hpPct: 0, atkPct: 0, gold: 0, xp: 0 };
    for (const slot of SLOTS) {
      const it = P.equip[slot];
      if (!it) continue;
      const st = itemStats(it);
      for (const k in st) { if (k in s) s[k] += st[k]; else g[k] += st[k]; }
    }
    return {
      ...s,
      atk: Math.round((c.atk(s) + g.atk) * (1 + g.atkPct / 100)),
      def: Math.round(s.con * 0.5 + g.def),
      maxHp: Math.round((60 + s.con * 12 + P.level * 10 + g.hp) * (1 + g.hpPct / 100)),
      maxMp: Math.round(20 + s.int * 4 + P.level * 2),
      crit: Math.min(75, 5 + s.dex * 0.2 + g.crit),
      critDmg: c.critDmg,
      dodge: Math.min(25, s.dex * 0.1),
      interval: Math.max(450, c.interval - s.dex * 5),
      goldBonus: g.gold, xpBonus: g.xp,
    };
  }

  function refresh() {
    S = calcStats();
    P.hp = Math.min(P.hp, S.maxHp);
    P.mp = Math.min(P.mp, S.maxMp);
  }

  function gainXp(x) {
    P.xp += x;
    let ups = 0;
    while (P.xp >= xpNeed(P.level)) {
      P.xp -= xpNeed(P.level);
      P.level++; ups++;
      if (P.settings.autoAlloc) {
        const main = CLASSES[P.cls].main;
        P.alloc[main] += 2; P.alloc.con += 1;
      } else P.points += 3;
    }
    if (ups) {
      refresh();
      P.hp = S.maxHp; P.mp = S.maxMp;
      return ups;
    }
    return 0;
  }

  function onLevelUp(ups) {
    if (!ups) return;
    addLog(`升級了！目前等級 Lv.${P.level}`, 'good');
    toast(`🎉 升級！Lv.${P.level}`);
    for (const sk of CLASSES[P.cls].skills) if (P.level - ups < sk.lv && P.level >= sk.lv) {
      addLog(`學會了新技能「${sk.name}」`, 'epic');
    }
    if (P.settings.fx) flashClass($('#u-player'), 'lvup', 900);
    markDirty('char');
  }

  // ---------- 戰鬥 ----------
  function mobStats(lv, boss) {
    const m = {
      lv, maxHp: Math.round(20 + 16 * Math.pow(lv, 1.38)),
      atk: Math.round(6 + 2.6 * lv + 0.04 * lv * lv),
      def: Math.round(lv * 1.1),
      xp: Math.round(6 * Math.pow(lv, 1.5)),
      gold: Math.round(2 + lv * 1.2 + Math.pow(lv, 1.3) * 0.2),
      interval: 1800,
    };
    if (boss) {
      m.maxHp *= 8; m.atk = Math.round(m.atk * 1.4); m.def = Math.round(m.def * 1.2);
      m.xp *= 12; m.gold *= 15; m.interval = 1600;
    }
    m.hp = m.maxHp;
    return m;
  }

  function spawn() {
    const z = ZONES[P.zone];
    const boss = B.queueBoss;
    B.queueBoss = false;
    let lv;
    if (z.endless) lv = z.lv[0] + P.abyss + (boss ? 2 : randInt(0, 1));
    else lv = boss ? z.lv[1] + 1 : randInt(z.lv[0], z.lv[1]);
    const [id, name, icon] = boss ? z.boss : pick(z.mobs);
    B.mob = { ...mobStats(lv, boss), id, name, icon, boss };
    if (z.endless) {
      const k = Math.pow(1.025, P.abyss);
      B.mob.maxHp = B.mob.hp = Math.round(B.mob.maxHp * k);
      B.mob.atk = Math.round(B.mob.atk * k);
    }
    B.mTimer = 0;
    B.pTimer = S.interval * 0.5;
    renderMob();
  }

  function step(dt) {
    P.stats.playMs += dt;
    track.ms += dt;
    for (const k in B.cds) B.cds[k] = Math.max(0, B.cds[k] - dt);
    B.potionCd = Math.max(0, B.potionCd - dt);

    if (B.dead > 0) {
      B.dead -= dt;
      if (B.dead <= 0) {
        P.hp = S.maxHp; P.mp = S.maxMp;
        $('#overlay').classList.remove('show');
        B.respawn = 300;
      }
      return;
    }

    const sec = dt / 1000;
    const inFight = !!B.mob;
    P.hp = Math.min(S.maxHp, P.hp + S.maxHp * (inFight ? 0.004 : 0.04) * sec);
    P.mp = Math.min(S.maxMp, P.mp + S.maxMp * (inFight ? 0.01 : 0.05) * sec);

    if (!B.mob) {
      B.respawn -= dt;
      if (B.respawn <= 0) spawn();
      return;
    }

    B.pTimer += dt;
    if (B.pTimer >= S.interval) { B.pTimer = 0; playerAct(); }
    if (!B.mob) return;
    B.mTimer += dt;
    if (B.mTimer >= B.mob.interval) { B.mTimer = 0; mobAttack(); }
    autoPotion();

    if (track.ms >= 10000) {
      const sxp = track.xp / (track.ms / 1000), sg = track.gold / (track.ms / 1000);
      P.rate.xp = P.rate.xp ? P.rate.xp * 0.85 + sxp * 0.15 : sxp;
      P.rate.gold = P.rate.gold ? P.rate.gold * 0.85 + sg * 0.15 : sg;
      track.xp = track.gold = track.ms = 0;
    }
  }

  function playerAct() {
    const c = CLASSES[P.cls];
    let used = null;
    for (let i = c.skills.length - 1; i >= 0; i--) {
      const sk = c.skills[i];
      if (P.level < sk.lv || (B.cds[sk.id] || 0) > 0 || P.mp < sk.mp) continue;
      if (sk.cond === 'lowHp' && P.hp / S.maxHp > 0.6) continue;
      used = sk; break;
    }
    const act = used || { hits: 1, mult: 1 };
    if (used) {
      P.mp -= used.mp;
      B.cds[used.id] = used.cd;
      if (P.settings.fx) skillBanner(used);
    } else {
      P.mp = Math.min(S.maxMp, P.mp + Math.max(1, S.maxMp * 0.04));
    }
    if (P.settings.fx) flashClass($('#u-player'), 'lunge', 250);
    if (act.heal) {
      const h = Math.round(S.maxHp * act.heal);
      P.hp = Math.min(S.maxHp, P.hp + h);
      floatNum('player', '+' + fmt(h), 'heal', 0);
    }
    for (let h = 0; h < act.hits && B.mob; h++) dealDamage(act, h);
  }

  function dealDamage(act, idx) {
    const m = B.mob;
    let raw = S.atk * act.mult * rand(0.9, 1.1);
    const crit = act.forceCrit || Math.random() * 100 < S.crit;
    if (crit) raw *= S.critDmg / 100;
    const reduced = act.ignoreDef ? raw : raw - m.def * 0.6;
    const dmg = Math.max(Math.ceil(raw * 0.1), Math.round(reduced));
    m.hp -= dmg;
    floatNum('mob', fmt(dmg), crit ? 'crit' : '', idx);
    if (P.settings.fx) {
      flashClass($('#u-mob'), 'hit', 200);
      if (crit) flashClass($('#arena'), 'shake', 300);
    }
    if (m.hp <= 0) killMob();
  }

  function mobAttack() {
    const m = B.mob;
    if (P.settings.fx) flashClass($('#u-mob'), 'lunge-l', 250);
    if (Math.random() * 100 < S.dodge) { floatNum('player', '閃避', 'miss', 0); return; }
    const raw = m.atk * rand(0.9, 1.1);
    const dmg = Math.max(Math.ceil(raw * 0.1), Math.round(raw - S.def * 0.6));
    P.hp -= dmg;
    floatNum('player', fmt(dmg), 'hurt', 0);
    if (P.settings.fx) flashClass($('#u-player'), 'hit', 200);
    if (P.hp <= 0) die();
  }

  function autoPotion() {
    if (B.potionCd > 0 || P.hp <= 0 || P.hp / S.maxHp * 100 >= P.settings.potionAt) return;
    const missing = S.maxHp - P.hp;
    const owned = POTIONS.filter(p => P.potions[p.id] > 0)
      .map(p => ({ p, amt: p.heal || Math.round(S.maxHp * p.healPct / 100) }))
      .sort((a, b) => a.amt - b.amt);
    if (!owned.length) return;
    const choice = owned.find(o => o.amt >= missing * 0.5) || owned[owned.length - 1];
    P.potions[choice.p.id]--;
    P.hp = Math.min(S.maxHp, P.hp + choice.amt);
    B.potionCd = 1000;
    floatNum('player', '+' + fmt(choice.amt), 'heal', 1);
    if (P.potions[choice.p.id] === 0) addLog(`${choice.p.name} 用完了`, 'warn');
  }

  function die() {
    P.hp = 0;
    const lost = Math.min(P.xp, Math.floor(xpNeed(P.level) * 0.05));
    P.xp -= lost;
    P.stats.deaths++;
    const wasBoss = B.mob && B.mob.boss;
    addLog(`你被 ${esc(B.mob.name)} 擊倒了，損失 ${fmt(lost)} 經驗`, 'bad');
    if (wasBoss) {
      B.bossWait = 10;
      addLog('首領太強了，先多練幾級或換更好的裝備吧', 'warn');
    }
    if (ZONES[P.zone].endless && P.abyss > 0) {
      P.abyss--;
      P.zoneKills[P.zone] = 0;
      addLog(`被擊退回混沌深淵第 ${P.abyss + 1} 層`, 'warn');
      renderZone();
    }
    B.mob = null;
    B.dead = 5000;
    renderMob();
    const ov = $('#overlay');
    ov.innerHTML = `<div>💫 倒下了</div><small>5 秒後在營地復活</small>`;
    ov.classList.add('show');
  }

  function killMob() {
    const m = B.mob;
    B.mob = null;
    B.respawn = m.boss ? 1500 : 500;
    const xp = Math.round(m.xp * (1 + S.xpBonus / 100));
    const gold = Math.round(m.gold * rand(0.8, 1.2) * (1 + S.goldBonus / 100));
    P.gold += gold;
    track.xp += xp; track.gold += gold;
    P.stats.kills++;
    const ups = gainXp(xp);
    const z = ZONES[P.zone];

    if (m.boss) {
      P.stats.bosses++;
      const first = !P.bossDown[P.zone];
      P.bossDown[P.zone] = true;
      P.zoneKills[P.zone] = 0;
      addLog(`擊敗首領 ${esc(m.name)}！獲得 ${fmt(xp)} 經驗、${fmt(gold)} 金幣`, 'epic');
      if (z.endless) {
        P.abyss++;
        toast(`🏆 突破混沌深淵第 ${P.abyss} 層`);
      } else if (first && ZONES[P.zone + 1]) {
        toast(`🏆 解鎖新區域：${ZONES[P.zone + 1].name}`);
        addLog(`解鎖新區域「${ZONES[P.zone + 1].name}」`, 'epic');
      }
      addItem(genItem(m.lv + randInt(0, 2), weighted(BOSS_RARITY_WEIGHTS)));
      if (Math.random() < 0.25) addItem(genItem(m.lv, weighted(BOSS_RARITY_WEIGHTS)));
      const st = randInt(2, 4);
      P.stones += st;
      addLog(`獲得強化石 ×${st}`, 'good');
      if (P.settings.autoNext && !z.endless && ZONES[P.zone + 1]) travel(P.zone + 1, true);
      markDirty('map');
    } else {
      P.zoneKills[P.zone] = Math.min(BOSS_KILLS, P.zoneKills[P.zone] + 1);
      if (B.bossWait > 0) B.bossWait--;
      if (Math.random() < 0.12) addItem(genItem(m.lv + randInt(-1, 1), weighted(RARITY.map(r => r.weight))));
      if (Math.random() < 0.03) { P.stones++; addLog('獲得強化石 ×1', 'good'); }
      if (P.settings.autoBoss && P.zoneKills[P.zone] >= BOSS_KILLS && B.bossWait <= 0) B.queueBoss = true;
    }
    if (P.settings.fx) flashClass($('#u-mob'), 'die', 450);
    floatNum('mob', `+${fmt(gold)} 💰`, 'gold', 2);
    onLevelUp(ups);
    markDirty('char');
  }

  function travel(zi, silent) {
    if (zi > 0 && !P.bossDown[zi - 1]) return toast('需先擊敗上一區的首領');
    P.zone = zi;
    B.mob = null; B.respawn = 300; B.queueBoss = false; B.bossWait = 0;
    renderMob(); renderZone();
    if (!silent) toast(`前往 ${ZONES[zi].name}`);
    addLog(`來到了「${ZONES[zi].name}」`);
    markDirty('map');
  }

  function challengeBoss() {
    if (P.zoneKills[P.zone] < BOSS_KILLS || B.dead > 0) return;
    if (B.mob && B.mob.boss) return;
    B.queueBoss = true; B.bossWait = 0;
    B.mob = null; B.respawn = 200;
    renderMob();
  }

  // ---------- 離線收益 ----------
  function offlineGain(ms) {
    const capped = Math.min(ms, OFFLINE_CAP_MS);
    const secs = capped / 1000;
    const xp = Math.round(P.rate.xp * secs * OFFLINE_RATE);
    const gold = Math.round(P.rate.gold * secs * OFFLINE_RATE);
    if (xp <= 0 && gold <= 0) return;
    const before = P.level;
    const ups = gainXp(xp);
    P.gold += gold;
    if (ups) { P.hp = S.maxHp; P.mp = S.maxMp; }
    addLog(`離線期間獲得 ${fmt(xp)} 經驗、${fmt(gold)} 金幣`, 'good');
    showModal(`
      <h3>🌙 歡迎回來</h3>
      <p>你離開了 ${fmtTime(ms)}${ms > OFFLINE_CAP_MS ? '（最多計算 8 小時）' : ''}，角色仍在持續冒險：</p>
      <div class="offline-grid">
        <div><span>經驗</span><b>+${fmt(xp)}</b></div>
        <div><span>金幣</span><b>+${fmt(gold)}</b></div>
        ${ups ? `<div><span>等級</span><b>Lv.${before} → Lv.${P.level}</b></div>` : ''}
      </div>
      <p class="muted small">離線收益為線上效率的 60%。</p>
      <div class="modal-actions"><button class="primary" data-act="close">好的</button></div>`);
    markDirty('char');
  }

  // ---------- 畫面：共用 ----------
  function markDirty(...keys) { keys.forEach(k => ui.dirty.add(k)); }

  function flashClass(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(el['_t_' + cls]);
    el['_t_' + cls] = setTimeout(() => el.classList.remove(cls), ms);
  }

  function floatNum(target, text, cls, idx) {
    if (!P.settings.dmg) return;
    const layer = $('#floats');
    if (!layer || layer.childElementCount > 30) return;
    const d = document.createElement('div');
    d.className = 'float ' + (cls || '');
    d.textContent = text;
    d.style.left = (target === 'mob' ? 72 : 26) + rand(-7, 7) + '%';
    d.style.top = 30 + (idx || 0) * 6 + rand(-4, 4) + '%';
    d.addEventListener('animationend', () => d.remove());
    layer.appendChild(d);
  }

  function skillBanner(sk) {
    const layer = $('#floats');
    if (!layer) return;
    const d = document.createElement('div');
    d.className = 'skill-banner';
    d.textContent = `${sk.icon} ${sk.name}`;
    d.addEventListener('animationend', () => d.remove());
    layer.appendChild(d);
  }

  function toast(msg) {
    const layer = $('#toast-layer');
    const d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML = msg;
    layer.appendChild(d);
    setTimeout(() => d.classList.add('out'), 2200);
    setTimeout(() => d.remove(), 2600);
  }

  function addLog(html, cls = '') {
    const t = new Date();
    logs.unshift({ html, cls, t: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` });
    if (logs.length > 60) logs.length = 60;
    ui.logDirty = true;
  }

  function showModal(html) {
    $('#modal-content').innerHTML = html;
    $('#modal').classList.remove('hidden');
  }
  function closeModal() { $('#modal').classList.add('hidden'); }

  function enhResult(kind, text) {
    const el = $('#enh-result');
    if (!el) return toast(text);
    el.className = 'enh-result ' + kind;
    el.textContent = text;
    if (P.settings.fx) flashClass(el, 'pop', 600);
  }

  // ---------- 畫面：建立角色 ----------
  function renderCreate() {
    let chosen = 'warrior';
    $('#app').innerHTML = `
      <div class="create">
        <div class="logo"><span>放置冒險</span><small>晨 曦 大 陸</small></div>
        <p class="tagline">選一個職業，剩下的交給你的角色。關掉網頁也會繼續冒險。</p>
        <input id="c-name" class="input" maxlength="10" placeholder="輸入角色名稱" autocomplete="off">
        <div class="class-grid">
          ${Object.entries(CLASSES).map(([k, c]) => `
            <button class="class-card ${k === chosen ? 'on' : ''}" data-cls="${k}">
              ${sprite(c.img, c.avatar, 'big')}
              <b>${c.name}</b>
              <span>${c.desc}</span>
              <small>主屬性：${STAT_LABEL[c.main]}</small>
            </button>`).join('')}
        </div>
        <button id="c-start" class="primary big">開始冒險</button>
        <p class="foot">原創作品・進度只存在你自己的瀏覽器</p>
      </div>`;
    $('#app').querySelectorAll('.class-card').forEach(btn => btn.addEventListener('click', () => {
      chosen = btn.dataset.cls;
      $('#app').querySelectorAll('.class-card').forEach(b => b.classList.toggle('on', b === btn));
    }));
    const start = () => {
      const name = $('#c-name').value.trim() || '無名冒險者';
      newPlayer(name, chosen);
      addLog(`${esc(name)} 踏上了冒險之旅！`, 'good');
      save();
      startGame();
    };
    $('#c-start').addEventListener('click', start);
    $('#c-name').addEventListener('keydown', e => { if (e.key === 'Enter') start(); });
  }

  // ---------- 畫面：遊戲主畫面 ----------
  const TABS = [['char', '角色'], ['bag', '背包'], ['enh', '強化'], ['map', '地圖'], ['shop', '商店'], ['set', '設定']];

  function renderGameShell() {
    const c = CLASSES[P.cls];
    $('#app').innerHTML = `
      <header class="topbar">
        <div class="hero-id">${sprite(c.img, c.avatar, 'sm')}
          <div><div class="hname">${esc(P.name)}</div><div class="hsub">Lv.<b id="h-lv"></b> ${c.name}</div></div>
        </div>
        <div class="xpwrap"><div class="bar xp"><div class="fill" id="xp-fill"></div><span id="xp-text"></span></div></div>
        <div class="wallet">
          <span title="金幣">💰 <b id="w-gold"></b></span>
          <span title="強化石">💎 <b id="w-stone"></b></span>
          <span title="保護卷軸">📜 <b id="w-scroll"></b></span>
        </div>
      </header>
      <main class="layout">
        <section class="card battle">
          <div class="zone-bar">
            <div class="zone-name" id="zone-name"></div>
            <div class="boss-prog">
              <div class="bar small"><div class="fill boss" id="boss-fill"></div></div>
              <span id="boss-text"></span>
              <button id="btn-boss" class="sm">挑戰首領</button>
            </div>
          </div>
          <div class="arena" id="arena">
            <div class="unit player" id="u-player">
              <div class="avatar">${sprite(c.img, c.avatar, 'unit')}</div>
              <div class="uname">${esc(P.name)}</div>
              <div class="bar hp"><div class="fill" id="php-fill"></div><span id="php-text"></span></div>
              <div class="bar mp"><div class="fill" id="pmp-fill"></div><span id="pmp-text"></span></div>
            </div>
            <div class="vs">VS</div>
            <div class="unit mob" id="u-mob">
              <div class="avatar" id="mob-avatar"></div>
              <div class="uname" id="mob-name"></div>
              <div class="bar hp"><div class="fill" id="mhp-fill"></div><span id="mhp-text"></span></div>
            </div>
            <div class="float-layer" id="floats"></div>
            <div class="overlay" id="overlay"></div>
          </div>
          <div class="skillbar" id="skillbar"></div>
          <div class="potbar" id="potbar"></div>
          <div class="log" id="log"></div>
        </section>
        <section class="card panel">
          <nav class="tabs">${TABS.map(([k, n]) => `<button data-tab="${k}" class="${k === ui.tab ? 'on' : ''}">${n}<i class="dot" id="dot-${k}"></i></button>`).join('')}</nav>
          <div id="tab-body"></div>
        </section>
      </main>`;

    $('#skillbar').innerHTML = c.skills.map(sk => `
      <div class="skill" id="sk-${sk.id}" title="${sk.name}：${sk.desc}（${sk.mp} MP）">
        <span class="sk-icon">${sk.icon}</span><span class="sk-name">${sk.name}</span>
        <span class="sk-lock">Lv.${sk.lv}</span><i class="sk-cd"></i>
      </div>`).join('');

    $('#btn-boss').addEventListener('click', challengeBoss);
    $('.tabs').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      ui.tab = b.dataset.tab;
      document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
      renderTab();
    });
    $('#tab-body').addEventListener('click', onTabClick);
    $('#tab-body').addEventListener('change', onTabChange);
    $('#tab-body').addEventListener('input', onTabInput);
    renderZone(); renderMob(); renderTab();
  }

  function renderZone() {
    const z = ZONES[P.zone];
    const zn = $('#zone-name');
    if (!zn) return;
    zn.innerHTML = `${z.icon} ${z.name} <small>${z.endless ? `第 ${P.abyss + 1} 層` : `Lv.${z.lv[0]}–${z.lv[1]}`}</small>`;
    const arena = $('#arena');
    arena.style.setProperty('--z1', z.theme[0]);
    arena.style.setProperty('--z2', z.theme[1]);
    arena.style.backgroundImage = IMG_OK[zoneImg(z.id)]
      ? `linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.45)), url(${zoneImg(z.id)})`
      : '';
  }

  function renderMob() {
    const box = $('#u-mob');
    if (!box) return;
    const m = B.mob;
    box.classList.toggle('empty', !m);
    box.classList.toggle('boss', !!(m && m.boss));
    box.classList.remove('die');
    $('#mob-avatar').innerHTML = m ? sprite(mobImg(m.id), m.icon, m.boss ? 'unit boss' : 'unit') : '';
    $('#mob-name').innerHTML = m ? `${m.boss ? '👑 ' : ''}${esc(m.name)} <small>Lv.${m.lv}</small>` : (B.dead > 0 ? '' : '<small>搜尋怪物中…</small>');
  }

  function setBar(id, cur, max, textId, text) {
    const pct = max > 0 ? clamp(cur / max * 100, 0, 100) : 0;
    const el = document.getElementById(id);
    if (el) el.style.width = pct + '%';
    if (textId) { const t = document.getElementById(textId); if (t) t.textContent = text; }
  }

  function renderBattle() {
    $('#h-lv').textContent = P.level;
    setBar('xp-fill', P.xp, xpNeed(P.level), 'xp-text', `${fmt(P.xp)} / ${fmt(xpNeed(P.level))}`);
    $('#w-gold').textContent = fmt(P.gold);
    $('#w-stone').textContent = fmt(P.stones);
    $('#w-scroll').textContent = fmt(P.scrolls);
    setBar('php-fill', P.hp, S.maxHp, 'php-text', `${fmt(Math.max(0, P.hp))} / ${fmt(S.maxHp)}`);
    setBar('pmp-fill', P.mp, S.maxMp, 'pmp-text', `${fmt(P.mp)} / ${fmt(S.maxMp)}`);
    const m = B.mob;
    setBar('mhp-fill', m ? m.hp : 0, m ? m.maxHp : 1, 'mhp-text', m ? `${fmt(Math.max(0, m.hp))} / ${fmt(m.maxHp)}` : '');

    const k = P.zoneKills[P.zone];
    setBar('boss-fill', k, BOSS_KILLS, 'boss-text', `首領 ${k}/${BOSS_KILLS}`);
    const bb = $('#btn-boss');
    const fighting = m && m.boss;
    bb.disabled = k < BOSS_KILLS || fighting || B.dead > 0;
    bb.textContent = fighting ? '首領戰中' : (B.queueBoss ? '首領即將出現' : '挑戰首領');

    for (const sk of CLASSES[P.cls].skills) {
      const el = document.getElementById('sk-' + sk.id);
      const locked = P.level < sk.lv;
      el.classList.toggle('locked', locked);
      el.classList.toggle('nomp', !locked && P.mp < sk.mp);
      el.style.setProperty('--cd', ((B.cds[sk.id] || 0) / sk.cd * 100) + '%');
    }

    $('#potbar').innerHTML = POTIONS.map(p => `<span class="${P.potions[p.id] ? '' : 'zero'}" title="${p.name}">${p.icon}<b>${P.potions[p.id]}</b></span>`).join('')
      + `<span class="muted small">生命 &lt; ${P.settings.potionAt}% 自動喝</span>`;

    if (ui.logDirty) {
      ui.logDirty = false;
      $('#log').innerHTML = logs.slice(0, 40).map(l => `<div class="${l.cls}"><time>${l.t}</time>${l.html}</div>`).join('');
    }

    $('#dot-char').classList.toggle('on', P.points > 0);
    $('#dot-bag').classList.toggle('on', P.inv.some(isUpgrade));
  }

  // ---------- 分頁 ----------
  function renderTabIfDirty() {
    if (!ui.dirty.size || ui.pointerDown) return;
    const now = Date.now();
    if (now - ui.lastTabRender < 500) return;
    if (ui.dirty.has(ui.tab) && ui.tab !== 'set' && ui.tab !== 'shop') renderTab();
    ui.dirty.clear();
  }

  function renderTab() {
    ui.lastTabRender = Date.now();
    const body = $('#tab-body');
    const scroll = body.scrollTop;
    body.innerHTML = ({ char: tabChar, bag: tabBag, enh: tabEnh, map: tabMap, shop: tabShop, set: tabSet })[ui.tab]();
    body.scrollTop = scroll;
  }

  const statRow = (label, val) => `<div class="kv"><span>${label}</span><b>${val}</b></div>`;

  function itemCell(it, opts = {}) {
    if (!it) return `<div class="icell empty"><span class="i-ico">${opts.ph || ''}</span><span class="i-slot">${opts.label || ''}</span></div>`;
    const up = opts.showUp && isUpgrade(it);
    return `<button class="icell r${it.rarity} ${opts.sel ? 'sel' : ''}" data-act="${opts.act || 'item'}" data-id="${it.id}" title="${esc(it.name)}">
      <span class="i-ico">${it.icon}</span>
      ${it.enh ? `<span class="i-enh">+${it.enh}</span>` : ''}
      ${up ? '<span class="i-up">▲</span>' : ''}
      ${it.lock ? '<span class="i-lock">🔒</span>' : ''}
      ${opts.label ? `<span class="i-slot">${opts.label}</span>` : ''}
    </button>`;
  }

  function tabChar() {
    const c = CLASSES[P.cls];
    return `
      <h4>屬性 ${P.points ? `<span class="badge">可分配 ${P.points} 點</span>` : ''}</h4>
      <div class="attrs">
        ${ATTRS.map(k => `
          <div class="attr" title="${ATTR_HELP[k]}">
            <span>${STAT_LABEL[k]}${k === c.main ? ' ★' : ''}</span><b>${S[k]}</b>
            ${P.points ? `<button class="sm" data-act="alloc" data-k="${k}" data-n="1">+1</button><button class="sm" data-act="alloc" data-k="${k}" data-n="${P.points}">全部</button>` : ''}
          </div>`).join('')}
      </div>
      <div class="kvs">
        ${statRow('攻擊力', fmt(S.atk))}${statRow('防禦力', fmt(S.def))}
        ${statRow('生命上限', fmt(S.maxHp))}${statRow('魔力上限', fmt(S.maxMp))}
        ${statRow('暴擊率', S.crit.toFixed(1) + '%')}${statRow('暴擊傷害', S.critDmg + '%')}
        ${statRow('閃避率', S.dodge.toFixed(1) + '%')}${statRow('攻擊間隔', (S.interval / 1000).toFixed(2) + ' 秒')}
        ${S.goldBonus ? statRow('金幣獲得', '+' + S.goldBonus.toFixed(1) + '%') : ''}
        ${S.xpBonus ? statRow('經驗獲得', '+' + S.xpBonus.toFixed(1) + '%') : ''}
      </div>
      <h4>裝備</h4>
      <div class="equip-grid">
        ${SLOTS.map(s => itemCell(P.equip[s], { label: SLOT_INFO[s].name, ph: s === 'weapon' ? c.weapon.icon : SLOT_INFO[s].icon })).join('')}
      </div>
      <h4>技能</h4>
      <div class="skill-list">
        ${c.skills.map(sk => `<div class="${P.level < sk.lv ? 'locked' : ''}"><span>${sk.icon}</span><div><b>${sk.name}</b> <small>Lv.${sk.lv}・${sk.mp} MP・冷卻 ${sk.cd / 1000} 秒</small><p>${sk.desc}</p></div></div>`).join('')}
      </div>
      <h4>紀錄</h4>
      <div class="kvs">
        ${statRow('擊殺數', fmt(P.stats.kills))}${statRow('擊敗首領', fmt(P.stats.bosses))}
        ${statRow('倒下次數', fmt(P.stats.deaths))}${statRow('最高強化', '+' + P.stats.bestEnh)}
        ${statRow('遊玩時間', fmtTime(P.stats.playMs))}${statRow('每秒經驗', fmt(P.rate.xp))}
      </div>`;
  }

  function tabBag() {
    const inv = [...P.inv].sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl);
    return `
      <div class="row between"><h4>背包 <small>${P.inv.length}/${INV_MAX}</small></h4>
        <div class="row gap">
          <button class="sm" data-act="bulk" data-r="0">賣出普通</button>
          <button class="sm" data-act="bulk" data-r="1">賣出精良以下</button>
          <button class="sm" data-act="bulk" data-r="2">賣出稀有以下</button>
        </div>
      </div>
      <p class="muted small">▲ 表示比目前裝備更好；上鎖或比目前裝備好的不會被批次賣出。</p>
      <div class="inv-grid">${inv.length ? inv.map(it => itemCell(it, { showUp: true })).join('') : '<p class="muted">還沒有裝備，打怪會掉落喔。</p>'}</div>`;
  }

  function enhCandidates() {
    return [...SLOTS.map(s => P.equip[s]).filter(Boolean), ...[...P.inv].sort((a, b) => itemScore(b) - itemScore(a))];
  }

  function tabEnh() {
    const list = enhCandidates();
    if (ui.enhId && !findItem(ui.enhId)) ui.enhId = null;
    if (!ui.enhId && list.length) ui.enhId = list[0].id;
    const f = ui.enhId && findItem(ui.enhId);
    let detail = '<p class="muted">選擇要強化的裝備</p>';
    if (f) {
      const it = f.item;
      const maxed = it.enh >= MAX_ENH;
      const risky = it.enh >= ENH_SAFE;
      const next = { ...it, enh: it.enh + 1 };
      const cur = itemStats(it), nx = itemStats(next);
      detail = `
        <div class="enh-box">
          <div class="enh-item r${it.rarity}"><span class="i-ico">${it.icon}</span></div>
          <div class="enh-title">${itemLabel(it)}<small>${f.where === 'equip' ? '（裝備中）' : ''}</small></div>
          ${maxed ? '<p>已達強化上限 +15</p>' : `
          <div class="enh-stats">${Object.keys(it.base).map(k => `<div>${STAT_LABEL[k]} ${fmtStat(k, cur[k])} → <b class="good">${fmtStat(k, nx[k])}</b></div>`).join('')}</div>
          <div class="kvs">
            ${statRow('成功率', ENH_RATES[it.enh] + '%')}
            ${statRow('消耗', `💎 ${enhStoneCost(it)}（持有 ${P.stones}）・💰 ${fmt(enhGoldCost(it))}`)}
            ${statRow('失敗時', risky ? '<span class="bad">裝備碎裂</span>' : '不會損壞')}
          </div>
          ${risky ? `<label class="check"><input type="checkbox" id="enh-scroll" ${P.scrolls ? '' : 'disabled'}> 使用保護卷軸（持有 ${P.scrolls}）</label>` : ''}
          <button class="primary" data-act="enhance" data-id="${it.id}">強化</button>`}
          <div class="enh-result" id="enh-result"></div>
        </div>`;
    }
    return `
      ${detail}
      <h4>選擇裝備</h4>
      <div class="inv-grid">${list.map(it => itemCell(it, { act: 'enhpick', sel: it.id === ui.enhId })).join('') || '<p class="muted">沒有裝備</p>'}</div>
      <p class="muted small">+0～+3 必定成功；+${ENH_SAFE} 以上失敗會碎裂，可用保護卷軸保住裝備。</p>`;
  }

  function tabMap() {
    return `<div class="zone-list">${ZONES.map((z, i) => {
      const unlocked = i === 0 || P.bossDown[i - 1];
      const here = i === P.zone;
      return `<button class="zone ${here ? 'here' : ''} ${unlocked ? '' : 'locked'}" data-act="travel" data-z="${i}" ${unlocked ? '' : 'disabled'}
        style="--z1:${z.theme[0]};--z2:${z.theme[1]}">
        <span class="z-icon">${z.icon}</span>
        <span class="z-info"><b>${z.name}</b><small>${z.endless ? `無盡挑戰・目前第 ${P.abyss + 1} 層` : `建議等級 ${z.lv[0]}–${z.lv[1]}`}</small></span>
        <span class="z-state">${here ? '目前位置' : !unlocked ? '🔒 擊敗上一區首領' : (P.bossDown[i] && !z.endless ? '✅ 已制霸' : '')}</span>
      </button>`;
    }).join('')}</div>`;
  }

  const chestPrice = () => 300 + P.level * P.level * 3;

  function tabShop() {
    return `
      <h4>藥水</h4>
      <div class="shop-list">
        ${POTIONS.map(p => `
          <div class="shop-item"><span class="s-ico">${p.icon}</span>
            <div><b>${p.name}</b><small>回復 ${p.heal ? p.heal + ' 生命' : p.healPct + '% 生命'}・持有 ${P.potions[p.id]}</small></div>
            <div class="s-buy"><button class="sm" data-act="buy" data-what="${p.id}" data-n="1">💰${fmt(p.price)}</button><button class="sm" data-act="buy" data-what="${p.id}" data-n="10">×10</button></div>
          </div>`).join('')}
      </div>
      <h4>強化</h4>
      <div class="shop-list">
        <div class="shop-item"><span class="s-ico">💎</span><div><b>強化石</b><small>強化裝備的必要材料・持有 ${P.stones}</small></div>
          <div class="s-buy"><button class="sm" data-act="buy" data-what="stone" data-n="1">💰${fmt(STONE_PRICE)}</button><button class="sm" data-act="buy" data-what="stone" data-n="10">×10</button></div></div>
        <div class="shop-item"><span class="s-ico">📜</span><div><b>保護卷軸</b><small>強化失敗時保住裝備・持有 ${P.scrolls}</small></div>
          <div class="s-buy"><button class="sm" data-act="buy" data-what="scroll" data-n="1">💰${fmt(SCROLL_PRICE)}</button></div></div>
      </div>
      <h4>寶箱</h4>
      <div class="shop-list">
        <div class="shop-item"><span class="s-ico">🎁</span><div><b>冒險者寶箱</b><small>隨機一件你等級的裝備，稀有度較高</small></div>
          <div class="s-buy"><button class="sm" data-act="buy" data-what="chest" data-n="1">💰${fmt(chestPrice())}</button></div></div>
      </div>
      <p class="muted small">目前金幣：${fmt(P.gold)}</p>`;
  }

  function tabSet() {
    const s = P.settings;
    const chk = (k, label, help) => `<label class="check"><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''}> <span>${label}${help ? `<small>${help}</small>` : ''}</span></label>`;
    return `
      <h4>戰鬥</h4>
      ${chk('fx', '戰鬥特效', '裝置較舊或覺得卡頓可以關掉')}
      ${chk('dmg', '傷害數字')}
      ${chk('autoBoss', '自動挑戰首領', '擊殺數滿了就自動召喚首領')}
      ${chk('autoNext', '擊敗首領後自動前往下一區')}
      ${chk('autoAlloc', '升級自動配點', '每級主屬性 +2、體質 +1；關閉則可自行分配 3 點')}
      <div class="setting-row"><span>自動喝藥水：生命低於 <b id="pot-val">${s.potionAt}</b>%</span>
        <input type="range" min="10" max="90" step="5" value="${s.potionAt}" data-set="potionAt"></div>
      <div class="setting-row"><span>自動賣出</span>
        <select data-set="autoSell">
          ${['不自動賣', '普通', '精良以下', '稀有以下'].map((n, i) => `<option value="${i}" ${s.autoSell === i ? 'selected' : ''}>${n}</option>`).join('')}
        </select></div>
      <p class="muted small">比目前裝備好的不會被自動賣出。</p>
      <h4>存檔</h4>
      <p class="muted small">進度存在這個瀏覽器裡。換手機或換瀏覽器時，可以匯出存檔碼再匯入。</p>
      <div class="row gap wrap">
        <button class="sm" data-act="export">匯出存檔碼</button>
        <button class="sm" data-act="import">匯入存檔碼</button>
        <button class="sm danger" data-act="reset">刪除角色重新開始</button>
      </div>
      <p class="muted small foot">放置冒險：晨曦大陸・原創作品</p>`;
  }

  // ---------- 分頁事件 ----------
  function onTabClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.dataset.id ? +b.dataset.id : null;
    switch (b.dataset.act) {
      case 'alloc': {
        const n = Math.min(P.points, +b.dataset.n);
        P.alloc[b.dataset.k] += n; P.points -= n;
        refresh(); renderTab();
        break;
      }
      case 'item': openItem(id); break;
      case 'bulk': bulkSell(+b.dataset.r); renderTab(); break;
      case 'enhpick': ui.enhId = id; renderTab(); break;
      case 'enhance': {
        const sc = $('#enh-scroll');
        enhance(id, !!(sc && sc.checked));
        const keep = $('#enh-result') && { cls: $('#enh-result').className, txt: $('#enh-result').textContent };
        renderTab();
        if (keep && $('#enh-result')) { $('#enh-result').className = keep.cls; $('#enh-result').textContent = keep.txt; }
        if (sc && sc.checked && $('#enh-scroll') && P.scrolls) $('#enh-scroll').checked = true;
        break;
      }
      case 'travel': travel(+b.dataset.z); renderTab(); break;
      case 'buy': buy(b.dataset.what, +b.dataset.n); renderTab(); break;
      case 'export': exportSave(); break;
      case 'import': importSave(); break;
      case 'reset': resetGame(); break;
    }
  }

  function onTabChange(e) {
    const k = e.target.dataset.set;
    if (!k) return;
    if (e.target.type === 'checkbox') P.settings[k] = e.target.checked;
    else P.settings[k] = +e.target.value;
    if (k === 'autoBoss' && P.settings.autoBoss && P.zoneKills[P.zone] >= BOSS_KILLS) B.queueBoss = true;
    save();
  }
  function onTabInput(e) {
    if (e.target.dataset.set === 'potionAt') {
      P.settings.potionAt = +e.target.value;
      $('#pot-val').textContent = e.target.value;
    }
  }

  function buy(what, n) {
    const pot = POTIONS.find(p => p.id === what);
    const price = pot ? pot.price : what === 'stone' ? STONE_PRICE : what === 'scroll' ? SCROLL_PRICE : chestPrice();
    if (P.gold < price * n) return toast('金幣不足');
    P.gold -= price * n;
    if (pot) P.potions[what] += n;
    else if (what === 'stone') P.stones += n;
    else if (what === 'scroll') P.scrolls += n;
    else if (what === 'chest') {
      if (P.inv.length >= INV_MAX) { P.gold += price; return toast('背包已滿'); }
      const it = genItem(P.level, weighted([0, 500, 380, 100, 20]));
      P.inv.push(it);
      toast(`🎁 開出 ${itemLabel(it)}`);
      addLog(`寶箱開出 ${itemLabel(it)}`, it.rarity >= 3 ? 'epic' : 'good');
      markDirty('bag', 'enh');
    }
  }

  function openItem(id) {
    const f = findItem(id);
    if (!f) return;
    const it = f.item, st = itemStats(it);
    const cur = f.where === 'inv' ? P.equip[it.slot] : null;
    const diff = cur ? itemScore(it) - itemScore(cur) : null;
    showModal(`
      <div class="item-head r${it.rarity}"><span class="i-ico">${it.icon}</span>
        <div><b>${itemLabel(it)}</b><small>${RARITY[it.rarity].name}・${SLOT_INFO[it.slot].name}・物品等級 ${it.ilvl}</small></div></div>
      <div class="item-stats">
        ${Object.keys(it.base).map(k => `<div>${STAT_LABEL[k]} <b>${fmtStat(k, st[k] - (it.aff[k] || 0))}</b></div>`).join('')}
        ${Object.keys(it.aff).map(k => `<div class="aff">+${fmtStat(k, it.aff[k])} ${STAT_LABEL[k]}</div>`).join('')}
      </div>
      <p class="small">裝備評分 <b>${itemScore(it)}</b>
        ${f.where === 'equip' ? '<span class="muted">（裝備中）</span>' : cur ? `<span class="${diff > 0 ? 'good' : diff < 0 ? 'bad' : 'muted'}">（${diff > 0 ? '▲' : diff < 0 ? '▼' : ''}${Math.abs(diff)} 對比目前裝備）</span>` : '<span class="good">（該部位目前空著）</span>'}</p>
      <div class="modal-actions">
        ${f.where === 'inv' ? `<button class="primary" data-act="m-equip" data-id="${id}">裝備</button>` : `<button data-act="m-unequip" data-slot="${f.slot}">卸下</button>`}
        <button data-act="m-enh" data-id="${id}">強化</button>
        ${f.where === 'inv' ? `<button data-act="m-lock" data-id="${id}">${it.lock ? '解鎖' : '上鎖'}</button>
        <button class="danger" data-act="m-sell" data-id="${id}" ${it.lock ? 'disabled' : ''}>賣出 💰${fmt(sellPrice(it))}</button>` : ''}
        <button data-act="close">關閉</button>
      </div>`);
  }

  function onModalClick(e) {
    if (e.target.id === 'modal') return closeModal();
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.dataset.id ? +b.dataset.id : null;
    switch (b.dataset.act) {
      case 'close': closeModal(); break;
      case 'm-equip': equipItem(id); closeModal(); renderTab(); break;
      case 'm-unequip': unequip(b.dataset.slot); closeModal(); renderTab(); break;
      case 'm-enh': ui.enhId = id; closeModal(); switchTab('enh'); break;
      case 'm-lock': { const f = findItem(id); if (f) f.item.lock = !f.item.lock; openItem(id); renderTab(); break; }
      case 'm-sell': sellItem(id); closeModal(); renderTab(); break;
      case 'm-import': {
        const txt = $('#import-text').value.trim();
        try {
          const d = migrate(JSON.parse(decodeURIComponent(escape(atob(txt)))));
          if (!d.cls || !CLASSES[d.cls]) throw new Error('bad');
          localStorage.setItem(SAVE_KEY, JSON.stringify(d));
          P = null; // 避免重新整理前的自動存檔覆蓋匯入的資料
          location.reload();
        } catch (err) { toast('存檔碼無效'); }
        break;
      }
      case 'm-reset':
        try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* ignore */ }
        P = null;
        location.reload();
        break;
      case 'm-copy': {
        const ta = $('#export-text');
        ta.select();
        (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject())
          .then(() => toast('已複製'), () => { document.execCommand('copy'); toast('已複製'); });
        break;
      }
    }
  }

  function switchTab(t) {
    ui.tab = t;
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x.dataset.tab === t));
    renderTab();
  }

  function exportSave() {
    save();
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(P))));
    showModal(`<h3>匯出存檔碼</h3><p class="small muted">把這串文字存好，在其他裝置選「匯入存檔碼」貼上即可。</p>
      <textarea id="export-text" class="input code" readonly>${code}</textarea>
      <div class="modal-actions"><button class="primary" data-act="m-copy">複製</button><button data-act="close">關閉</button></div>`);
  }
  function importSave() {
    showModal(`<h3>匯入存檔碼</h3><p class="small muted">會覆蓋目前這個瀏覽器裡的角色。</p>
      <textarea id="import-text" class="input code" placeholder="貼上存檔碼"></textarea>
      <div class="modal-actions"><button class="primary" data-act="m-import">匯入</button><button data-act="close">取消</button></div>`);
  }
  function resetGame() {
    showModal(`<h3>刪除角色？</h3><p>${esc(P.name)}（Lv.${P.level}）的所有進度都會消失，無法復原。</p>
      <div class="modal-actions"><button class="danger" data-act="m-reset">確定刪除</button><button data-act="close">取消</button></div>`);
  }

  // ---------- 主迴圈 ----------
  let lastNow = 0, acc = 0, loopId = null, saveId = null;

  function startGame() {
    refresh();
    if (P.hp <= 0) P.hp = S.maxHp;
    renderGameShell();
    const away = Date.now() - (P.lastTime || Date.now());
    if (away > 60000) offlineGain(away);
    lastNow = Date.now();
    clearInterval(loopId); clearInterval(saveId);
    loopId = setInterval(tick, STEP);
    saveId = setInterval(save, 10000);
    renderBattle();
  }

  function tick() {
    const now = Date.now();
    let dt = now - lastNow;
    lastNow = now;
    if (dt > 60000) { offlineGain(dt); dt = 0; }
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 600) { step(STEP); acc -= STEP; n++; }
    if (n >= 600) acc = 0;
    renderBattle();
    renderTabIfDirty();
  }

  // ---------- 啟動 ----------
  document.addEventListener('pointerdown', () => { ui.pointerDown = true; });
  document.addEventListener('pointerup', () => { ui.pointerDown = false; });
  document.addEventListener('pointercancel', () => { ui.pointerDown = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);
  $('#modal').addEventListener('click', onModalClick);

  preloadImages(() => {
    P = load();
    if (P) startGame(); else renderCreate();
  });
})();
