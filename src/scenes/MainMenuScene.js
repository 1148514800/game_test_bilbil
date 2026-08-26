import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { gameStore } from '../core/GameStore.js';
import { saveManager } from '../core/SaveManager.js';
import { TextButton } from '../ui/components/TextButton.js';

/** 主菜单负责开始新游戏和读取自动存档。 */
export class MainMenuScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.MAIN_MENU);
  }

  create() {
    this.drawCartoonCityBackground();
    this.createTitle('城市新生活', 125);

    this.add.text(this.scale.width / 2, 187, '在城市里认识每一个有故事的人', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#37605f',
    }).setOrigin(0.5);

    const continueButton = new TextButton(
      this,
      this.scale.width / 2,
      320,
      '继续游戏',
      () => {
        if (saveManager.load()) this.scene.start(SCENE_KEYS.GAME);
      },
      { enabled: saveManager.hasSave() },
    );

    new TextButton(this, this.scale.width / 2, 410, '开始新游戏', () => {
      gameStore.reset();
      this.scene.start(SCENE_KEYS.CHARACTER_CREATION);
    });

    if (!continueButton.enabled) {
      this.add.text(this.scale.width / 2, 363, '还没有自动存档', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#5d7473',
      }).setOrigin(0.5);
    }

    this.add.text(this.scale.width / 2, 650, '第一阶段原型 · Phaser 3', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#517170',
    }).setOrigin(0.5);
  }

  /** 用简单几何图形绘制现代卡通城市天际线，后续可以无缝替换为正式背景图。 */
  drawCartoonCityBackground() {
    this.add.rectangle(640, 360, 1280, 720, 0xcdeeed);
    this.add.circle(1080, 105, 55, 0xffd479, 0.9);

    const colors = [0x78b7c5, 0xf2a65a, 0x8bc48a, 0xd88987, 0x7f91bd];
    for (let index = 0; index < 10; index += 1) {
      const width = 120 + (index % 3) * 35;
      const height = 150 + (index % 4) * 45;
      const x = index * 145 + 10;
      const building = this.add.rectangle(x, 720, width, height, colors[index % colors.length]);
      building.setOrigin(0, 1).setAlpha(0.72);
    }

    this.add.rectangle(640, 670, 1280, 100, 0x76b77c);
  }
}
