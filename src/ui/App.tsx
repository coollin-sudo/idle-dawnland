import { useState } from 'preact/hooks';
import { loadState } from '@/save/storage';
import { Create } from './Create';
import { GameScreen } from './GameScreen';
import { ModalHost, OfflineModal, StoryOverlay, Toasts, TooltipHost } from './common';
import { openImport } from './panels/SettingsPanel';
import { game, startGame } from './store';

let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  const s = loadState();
  if (s) startGame(s, { offline: true });
}

export function App() {
  boot();
  const [, force] = useState(0);
  return (
    <>
      {game.value ? <GameScreen /> : <Create onDone={() => force(n => n + 1)} onImport={openImport} />}
      {game.value && <StoryOverlay />}
      <OfflineModal />
      <ModalHost />
      <TooltipHost />
      <Toasts />
    </>
  );
}
