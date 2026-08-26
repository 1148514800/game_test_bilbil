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
