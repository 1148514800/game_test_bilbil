import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { saveManager } from '../core/SaveManager.js';
import { TextButton } from '../ui/components/TextButton.js';

/** 暂停场景覆盖在游戏之上；底层 GameScene 暂停后，游戏时间也不会继续流逝。 */
export class PauseScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.PAUSE);
  }

  init(data) {
    this.originScene = data.originScene ?? SCENE_KEYS.GAME;
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x102525, 0.72);
    this.createPanel(640, 360, 520, 430, 0xeaf7f6, 0.98);
    this.createTitle('游戏暂停', 215);

    new TextButton(this, 640, 330, '继续游戏', () => this.resumeGame());
    new TextButton(this, 640, 420, '保存并返回主菜单', () => {
      saveManager.save();
      this.scene.stop(SCENE_KEYS.HUD);
      this.scene.stop(SCENE_KEYS.GAME);
      this.scene.stop(SCENE_KEYS.INTERIOR);
      this.scene.stop(SCENE_KEYS.CATCH_GAME);
      this.scene.start(SCENE_KEYS.MAIN_MENU);
    }, { width: 340, color: 0x647b7a });

    this.input.keyboard.once('keydown-ESC', () => this.resumeGame());
  }

  resumeGame() {
    this.scene.resume(this.originScene);
    this.scene.stop();
  }
}
