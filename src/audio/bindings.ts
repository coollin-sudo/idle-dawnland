import type { Game } from '@/core/game';
import { regionOfStage } from '@/data/regions';
import { audio, type SfxName } from './audio';

const FX_SOUND: Record<string, SfxName> = {
  slash: 'slash', heavy: 'slash', sweep: 'slash', whirl: 'slash', bash: 'hit', arrow: 'arrow', multiarrow: 'arrow', snipe: 'arrow', rain: 'arrow',
  fireball: 'fire', meteor: 'fire', frost: 'ice', blizzard: 'ice', chain: 'lightning', storm: 'lightning', shadowbolt: 'shadow', doom: 'shadow',
  holy: 'holy', nova: 'holy', hammer: 'holy', heal: 'heal', shield: 'shield', buff: 'heal', poison: 'shadow', blades: 'slash', summon: 'shadow', magic: 'magic',
};

/** 把遊戲事件接到音效；回傳解除訂閱函式 */
export function bindAudio(g: Game): () => void {
  const offs: (() => void)[] = [];
  const ev = g.ev;
  offs.push(ev.on('unit:act', e => {
    if (e.src.side !== 'hero' || e.src.kind === 'pet') return;
    const s = FX_SOUND[e.fx];
    if (s) audio.play(s, e.skill ? 1 : 0.7);
  }));
  offs.push(ev.on('unit:hit', e => {
    if (e.dot) return;
    if (e.tgt.side === 'hero') audio.play('hurt');
    else audio.play(e.crit ? 'crit' : 'hit', 0.7);
  }));
  offs.push(ev.on('unit:shield', () => audio.play('shield')));
  offs.push(ev.on('loot:gold', () => audio.play('coin')));
  offs.push(ev.on('loot:item', e => {
    if (e.auto !== 'kept') return;
    if (e.item.rarity >= 4) audio.play('legend');
    else if (e.item.rarity >= 2) audio.play('loot');
  }));
  offs.push(ev.on('hero:level', () => audio.play('levelup')));
  offs.push(ev.on('unit:death', e => {
    if (e.unit.kind === 'hero') audio.play('herodeath');
    else if (e.unit.boss) audio.play('bossdown');
    else if (e.unit.elite.length) audio.play('death', 0.6);
  }));
  offs.push(ev.on('forge:enhance', e => audio.play(e.result === 'success' ? 'enhance' : e.result === 'break' ? 'break' : 'fail')));
  offs.push(ev.on('achievement', () => audio.play('achievement')));

  const updateMusic = (boss: boolean) => {
    const act = g.activity;
    const region = act.kind === 'tower' ? regionOfStage(70) : regionOfStage(act.kind === 'dungeon' ? Math.max(0, g.state.progress.best[0]) : g.state.progress.stage);
    // 首領戰、副本與高塔有專屬配樂，其餘依區域
    const key = boss ? 'boss' : act.kind === 'dungeon' || act.kind === 'tower' ? 'dungeon' : region.id;
    audio.setTrack(key, region.music, boss);
  };
  offs.push(ev.on('battle:start', e => {
    if (e.boss) audio.play('boss');
    updateMusic(e.boss);
  }));
  offs.push(ev.on('stage:enter', () => updateMusic(false)));
  updateMusic(false);
  return () => offs.forEach(o => o());
}
