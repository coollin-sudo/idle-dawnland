import type { Item, SlotId } from '@/core/types';
import { SLOT_LABEL, slotKind } from '@/data/items';
import { ItemSlot } from './common';
import { HeroPreview } from './HeroPreview';
import { heroLookOf } from './GameScreen';
import { g } from './store';

/**
 * 人形裝備欄：裝備格放在身體對應的位置（參考 Diablo 系列的角色裝備介面），
 * 中間淡淡畫出角色，細線連到對應的身體部位。座標都是容器的百分比。
 */
const LAYOUT: Record<SlotId, { x: number; y: number; ax: number; ay: number }> = {
  helmet: { x: 50, y: 9, ax: 51, ay: 30 },
  amulet: { x: 78, y: 19, ax: 53, ay: 39 },
  armor: { x: 22, y: 25, ax: 49, ay: 46 },
  weapon: { x: 88, y: 45, ax: 66, ay: 47 },
  offhand: { x: 12, y: 48, ax: 34, ay: 48 },
  ring1: { x: 82, y: 66, ax: 64, ay: 52 },
  ring2: { x: 18, y: 70, ax: 36, ay: 53 },
  belt: { x: 50, y: 60, ax: 50, ay: 54 },
  gloves: { x: 76, y: 87, ax: 65, ay: 50 },
  boots: { x: 40, y: 88, ax: 49, ay: 70 },
};

export function BodyDoll({ eq, selectedUid, onPick, dim }: {
  eq: Record<SlotId, Item | null>;
  selectedUid?: number | null;
  onPick: (slot: SlotId, item: Item | null) => void;
  /** 顯示「未穿上」的另一套配裝時，角色畫得更淡 */
  dim?: boolean;
}) {
  const s = g().state;
  return (
    <div class="bodydoll">
      <div class={'bd-figure' + (dim ? ' dim' : '')}>
        <HeroPreview look={heroLookOf()} art={[s.hero.advId, s.hero.classId]} size={240} attackEvery={0} />
      </div>
      <svg class="bd-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {(Object.keys(LAYOUT) as SlotId[]).map(sl => {
          const p = LAYOUT[sl];
          return (
            <g class={eq[sl] ? 'on' : ''}>
              <line x1={p.x} y1={p.y} x2={p.ax} y2={p.ay} />
              <circle cx={p.ax} cy={p.ay} r="0.9" />
            </g>
          );
        })}
      </svg>
      {(Object.keys(LAYOUT) as SlotId[]).map(sl => {
        const p = LAYOUT[sl];
        const it = eq[sl];
        return (
          <div class="bd-slot" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <ItemSlot item={it} label={SLOT_LABEL[slotKind(sl)]} selected={!!it && it.uid === selectedUid} onClick={() => onPick(sl, it)} />
          </div>
        );
      })}
    </div>
  );
}
