import Phaser from 'phaser';
import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';

/** 通用对话覆盖场景；NPC 只提供文字，不需要知道对话框如何绘制。 */
export class DialogueScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.DIALOGUE);
  }

  init(data) {
    this.speaker = data.speaker ?? '居民';
    this.lines = data.lines ?? ['……'];
    this.onComplete = data.onComplete ?? null;
    this.originScene = data.originScene ?? SCENE_KEYS.GAME;
    this.lineIndex = 0;
  }

  create() {
    this.advancing = false;

    // 整个屏幕都是“继续”区域。即使玩家没有精准点中右下角按钮，也不会卡住。
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.nextLine());

    this.add.rectangle(640, 595, 1160, 205, 0x173d3c, 0.96)
      .setStrokeStyle(5, 0xffffff, 0.9);
    this.add.text(105, 515, this.speaker, {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '27px', fontStyle: 'bold', color: '#f4ce5e',
    });
    this.contentText = this.add.text(105, 565, this.lines[0], {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '24px', color: '#ffffff',
      wordWrap: { width: 1010 }, lineSpacing: 8,
    });
    this.add.rectangle(1080, 665, 210, 52, 0xf2a65a).setStrokeStyle(3, 0xffffff);
    this.continueText = this.add.text(1080, 665, '继续 ▶', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '21px', fontStyle: 'bold', color: '#244342',
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.continueText, x: 1088, yoyo: true, repeat: -1, duration: 500 });

    this.add.text(105, 675, '对话期间移动暂停　·　点击任意位置 / E / 空格 / Enter', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '16px', color: '#c7e4e2',
    }).setOrigin(0, 0.5);

    this.input.keyboard.on('keydown-E', () => this.nextLine());
    this.input.keyboard.on('keydown-SPACE', () => this.nextLine());
    this.input.keyboard.on('keydown-ENTER', () => this.nextLine());
  }

  nextLine() {
    if (this.advancing) return;
    this.advancing = true;
    this.time.delayedCall(90, () => { this.advancing = false; });
    this.lineIndex += 1;
    if (this.lineIndex < this.lines.length) {
      this.contentText.setText(this.lines[this.lineIndex]);
      return;
    }
    this.onComplete?.();
    this.scene.resume(this.originScene);
    this.scene.stop();
  }
}
