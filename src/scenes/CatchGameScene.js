import Phaser from 'phaser';
import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { questSystem } from '../systems/QuestSystem.js';
import { TextButton } from '../ui/components/TextButton.js';

/** 教学主线的第一个小游戏：接住星星、躲避垃圾。 */
export class CatchGameScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.CATCH_GAME);
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x263d5a);
    this.add.text(640, 42, '接物挑战', { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '38px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    this.score = 0;
    this.secondsLeft = 25;
    this.ended = false;
    this.scoreText = this.add.text(35, 30, '分数：0 / 8', this.labelStyle());
    this.timeText = this.add.text(1245, 30, '剩余：25 秒', this.labelStyle()).setOrigin(1, 0);
    this.add.text(640, 95, 'A / D 或左右方向键移动　⭐ +1　🗑 -1', { ...this.labelStyle(), fontSize: '19px' }).setOrigin(0.5);

    this.catcher = this.add.rectangle(640, 650, 150, 35, 0xf2a65a).setRounded(12);
    this.physics.add.existing(this.catcher, true);
    this.items = this.physics.add.group();
    this.physics.add.overlap(this.catcher, this.items, (_catcher, item) => this.catchItem(item));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D');

    this.spawnTimer = this.time.addEvent({ delay: 620, loop: true, callback: () => this.spawnItem() });
    this.countdown = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      this.secondsLeft -= 1;
      this.timeText.setText(`剩余：${this.secondsLeft} 秒`);
      if (this.secondsLeft <= 0) this.finish();
    }});
  }

  labelStyle() {
    return { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '23px', fontStyle: 'bold', color: '#ffffff' };
  }

  spawnItem() {
    if (this.ended) return;
    const good = Math.random() < 0.72;
    const item = good
      ? this.add.star(Phaser.Math.Between(80, 1200), 130, 5, 14, 29, 0xf4ce5e)
      : this.add.rectangle(Phaser.Math.Between(80, 1200), 130, 46, 46, 0xd96363).setRounded(8);
    item.setData('good', good);
    this.physics.add.existing(item);
    item.body.setVelocityY(Phaser.Math.Between(210, 320));
    this.items.add(item);
  }

  catchItem(item) {
    this.score = Math.max(0, this.score + (item.getData('good') ? 1 : -1));
    this.scoreText.setText(`分数：${this.score} / 8`);
    item.destroy();
    if (this.score >= 8) this.finish();
  }

  update(_time, delta) {
    if (this.ended) return;
    const direction = Number(this.cursors.right.isDown || this.keys.D.isDown) - Number(this.cursors.left.isDown || this.keys.A.isDown);
    this.catcher.x = Phaser.Math.Clamp(this.catcher.x + direction * 470 * delta / 1000, 90, 1190);
    this.catcher.body.updateFromGameObject();
    this.items.getChildren().forEach((item) => { if (item.y > 760) item.destroy(); });
  }

  finish() {
    if (this.ended) return;
    this.ended = true;
    this.spawnTimer.remove();
    this.countdown.remove();
    this.items.clear(true, true);
    const passed = this.score >= 8;
    if (passed) questSystem.completeMinigame(this.score);
    this.add.rectangle(640, 380, 620, 300, 0x173d3c, 0.96).setStrokeStyle(5, 0xffffff);
    this.add.text(640, 310, passed ? '挑战成功！获得 50 金钱' : '时间到，再试一次吧！', { ...this.labelStyle(), fontSize: '30px', color: passed ? '#f4ce5e' : '#ffffff' }).setOrigin(0.5);
    new TextButton(this, 640, 435, passed ? '返回场馆' : '重新挑战', () => {
      if (passed) {
        this.scene.wake(SCENE_KEYS.INTERIOR);
        this.scene.stop();
      } else this.scene.restart();
    });
  }
}
