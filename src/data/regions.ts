import type { RegionDef } from '@/core/types';

export const REGIONS: RegionDef[] = [
  {
    id: 'meadow', name: '晨露草原', subtitle: '一切從這裡開始',
    monsters: ['slime', 'hare', 'goblin', 'boar'], boss: 'goblin_king',
    bg: { sky: ['#8fd0ff', '#e8f6ff'], far: '#9cc8a0', mid: '#6fae6a', near: '#4a8a48', ground: ['#5a9a4a', '#3a6a30'], layers: ['hills', 'trees'], particles: 'fireflies', sun: '#fff4c8' },
    music: { root: 60, scale: 'major', tempo: 96 },
  },
  {
    id: 'forest', name: '迷霧森林', subtitle: '霧中有東西在看著你',
    monsters: ['wolf', 'shroom', 'spider', 'wisp'], boss: 'treant',
    bg: { sky: ['#4a6a6a', '#9ab8b0'], far: '#3a5a52', mid: '#2a4a40', near: '#1a3328', ground: ['#2f4a2a', '#1a2a18'], layers: ['pines', 'trees'], particles: 'leaves' },
    music: { root: 57, scale: 'dorian', tempo: 84 },
  },
  {
    id: 'mine', name: '遺忘礦坑', subtitle: '水晶的微光照亮黑暗',
    monsters: ['bat', 'skel_miner', 'rock_golem', 'rat_king'], boss: 'troll',
    bg: { sky: ['#1a1418', '#3a2e2a'], far: '#2e2622', mid: '#3e322a', near: '#2a221c', ground: ['#4a3a2e', '#2a2018'], layers: ['rocks', 'crystals'], particles: 'dust' },
    music: { root: 55, scale: 'minor', tempo: 80 },
  },
  {
    id: 'desert', name: '赤沙遺跡', subtitle: '烈日下沉睡的古文明',
    monsters: ['scorpion', 'sand_serpent', 'mummy', 'fire_elem'], boss: 'pharaoh',
    bg: { sky: ['#f0a85a', '#ffe0a8'], far: '#d8a060', mid: '#c88a4a', near: '#a86a3a', ground: ['#e0b070', '#b8844a'], layers: ['dunes', 'pillars'], particles: 'sand', sun: '#fff0c0' },
    music: { root: 62, scale: 'phrygian', tempo: 100 },
  },
  {
    id: 'snow', name: '霜語山脈', subtitle: '寒風中傳來龍的低語',
    monsters: ['snow_wolf', 'ice_elem', 'yeti', 'harpy'], boss: 'frost_dragon',
    bg: { sky: ['#6a8ab8', '#d8e8f8'], far: '#b8c8e0', mid: '#8aa0c0', near: '#e8f0f8', ground: ['#f0f4fa', '#b8c8d8'], layers: ['mountains', 'pines'], particles: 'snow' },
    music: { root: 59, scale: 'minor', tempo: 76 },
  },
  {
    id: 'volcano', name: '熔心火山', subtitle: '大地在燃燒',
    monsters: ['salamander', 'lava_golem', 'imp', 'hellhound'], boss: 'balrog',
    bg: { sky: ['#2a0a0a', '#8a2a1a'], far: '#4a1a14', mid: '#3a1410', near: '#24100c', ground: ['#3a2420', '#1a0e0c'], layers: ['spikes', 'rocks'], particles: 'embers', sun: '#ff6a2a' },
    music: { root: 52, scale: 'phrygian', tempo: 112 },
  },
  {
    id: 'sky', name: '雷鳴天城', subtitle: '雲端之上的古老王國',
    monsters: ['thunderbird', 'sylph', 'automaton', 'sky_knight'], boss: 'storm_king',
    bg: { sky: ['#3a5aa8', '#b8d8ff'], far: '#e8f0ff', mid: '#c8d8f0', near: '#f8faff', ground: ['#d8e0f0', '#a8b8d8'], layers: ['clouds', 'towers'], particles: 'sparks', sun: '#ffffff' },
    music: { root: 64, scale: 'lydian', tempo: 108 },
  },
  {
    id: 'abyss', name: '暮影深淵', subtitle: '永晝水晶的最後碎片',
    monsters: ['void_eye', 'shade', 'tentacle', 'fallen_knight'], boss: 'nox',
    bg: { sky: ['#0a0612', '#2a1a3a'], far: '#1a1028', mid: '#24163a', near: '#120a1c', ground: ['#1e1430', '#0c0814'], layers: ['void', 'crystals'], particles: 'motes', sun: '#8a4ad8' },
    music: { root: 50, scale: 'minor', tempo: 92 },
  },
];

export const regionOfStage = (stageIndex: number) => REGIONS[Math.min(REGIONS.length - 1, Math.floor(stageIndex / 10))];
