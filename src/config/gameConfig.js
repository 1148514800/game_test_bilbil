import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './constants.js';
import { BootScene } from '../scenes/BootScene.js';
import { PreloadScene } from '../scenes/PreloadScene.js';
import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { CharacterCreationScene } from '../scenes/CharacterCreationScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { HUDScene } from '../scenes/HUDScene.js';
import { PauseScene } from '../scenes/PauseScene.js';
import { DialogueScene } from '../scenes/DialogueScene.js';
import { InteriorScene } from '../scenes/InteriorScene.js';
import { CatchGameScene } from '../scenes/CatchGameScene.js';

/**
 * Phaser 游戏总配置。
 * FIT 会保持 16:9 比例并缩放画布，CENTER_BOTH 会让画布始终位于网页中央。
 */
export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#dff4f2',
  pixelArt: false,
  antialias: true,
  // 请求浏览器优先使用高性能 GPU，降低集成显卡切换造成的瞬时卡顿。
  powerPreference: 'high-performance',
  fps: {
    // limit=0 表示不把游戏锁死在 60 FPS，而是跟随显示器的刷新率。
    target: 60,
    limit: 0,
    forceSetTimeOut: false,
    smoothStep: true,
  },
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      // 默认固定 60Hz 会让 120/144Hz 屏幕上的人物隔帧更新。
      // 改为可变步长后，物理位置会在每个浏览器渲染帧同步更新。
      fixedStep: false,
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    CharacterCreationScene,
    GameScene,
    HUDScene,
    PauseScene,
    DialogueScene,
    InteriorScene,
    CatchGameScene,
  ],
};
