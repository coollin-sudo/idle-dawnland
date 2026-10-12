import './skin';
import { Gallery } from './Gallery';
import { GameScreen } from './GameScreen';
import { Launcher } from './Launcher';
import { ModalHost, OfflineModal, StoryOverlay, Toasts, TooltipHost } from './common';
import { game } from './store';

/** 開遊戲先到選角畫面（選帳號、選角色或建立新的），不直接進入遊戲 */
export function App() {
  if (location.hash === '#gallery') return <Gallery />;
  return (
    <>
      {game.value ? <GameScreen /> : <Launcher />}
      {game.value && <StoryOverlay />}
      <OfflineModal />
      <ModalHost />
      <TooltipHost />
      <Toasts />
    </>
  );
}
