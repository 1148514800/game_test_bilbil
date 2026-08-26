import Phaser from 'phaser';
import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { gameStore } from '../core/GameStore.js';
import { saveManager } from '../core/SaveManager.js';
import { questSystem } from '../systems/QuestSystem.js';

const ROOMS = {
  home: { name: '玩家住宅', color: 0xf5d6ad, feature: '床铺' },
  community: { name: '社区中心', color: 0xb8dfe3, feature: '服务台' },
  shop: { name: '街边商店', color: 0xf4c1aa, feature: '商品货架' },
  arcade: { name: '接物挑战馆', color: 0xd7c3ef, feature: '接物挑战机器' },
};

/** 可复用室内场景；同一套进出逻辑通过配置绘制四种房间。 */
export class InteriorScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.INTERIOR);
  }

  init(data) {
    this.roomId = data.roomId ?? 'home';
  }

  create() {
    const room = ROOMS[this.roomId];
    this.add.rectangle(640, 360, 1280, 720, 0x203f3e);
    this.add.rectangle(640, 330, 1050, 570, room.color).setStrokeStyle(14, 0xffffff);
    this.createTitle(room.name, 65);

    this.exitPoint = { x: 640, y: 615 };
    this.add.rectangle(640, 620, 160, 70, 0x5a483f);
    this.add.text(640, 620, '出口', this.textStyle(22)).setOrigin(0.5);

    if (this.roomId === 'home') this.drawHome();
    else if (this.roomId === 'shop') this.drawShop();
    else if (this.roomId === 'community') this.drawCommunity();
    else this.drawArcade();

    this.playerMarker = this.add.circle(640, 555, 25, 0x4f8dd6).setStrokeStyle(5, 0xffffff);
    this.add.text(640, 675, '靠近设施后按 E 互动　·　靠近出口按 E 离开', this.textStyle(18))
      .setOrigin(0.5);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-E', () => this.interact());
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.launch(SCENE_KEYS.PAUSE, { originScene: SCENE_KEYS.INTERIOR });
      this.scene.pause();
    });
  }

  textStyle(size) {
    return { fontFamily: 'Microsoft YaHei, sans-serif', fontSize: `${size}px`, color: '#ffffff', fontStyle: 'bold' };
  }

  drawHome() {
    this.featurePoint = { x: 320, y: 250 };
    this.add.rectangle(320, 250, 250, 150, 0x91b9dc).setStrokeStyle(7, 0xffffff);
    this.add.text(320, 250, '床铺\n睡到第二天 08:00', this.textStyle(20)).setOrigin(0.5).setAlign('center');
    this.add.rectangle(900, 300, 260, 190, 0xc79462).setStrokeStyle(6, 0xffffff);
    this.add.text(900, 300, '衣柜', this.textStyle(22)).setOrigin(0.5);
  }

  drawShop() {
    this.featurePoint = { x: 640, y: 270 };
    [330, 640, 950].forEach((x) => this.add.rectangle(x, 270, 230, 220, 0xc47b55).setStrokeStyle(6, 0xffffff));
    this.add.text(640, 270, '商品货架\n后续开放购买', this.textStyle(21)).setOrigin(0.5).setAlign('center');
  }

  drawCommunity() {
    this.featurePoint = { x: 640, y: 285 };
    this.add.rectangle(640, 285, 620, 150, 0x568d98).setStrokeStyle(6, 0xffffff);
    this.add.text(640, 285, '社区服务台\n自由任务将在这里发布', this.textStyle(22)).setOrigin(0.5).setAlign('center');
  }

  drawArcade() {
    this.featurePoint = { x: 640, y: 275 };
    this.add.rectangle(640, 275, 330, 230, 0x7458aa).setStrokeStyle(8, 0xf4ce5e);
    this.add.text(640, 275, '⭐ 接物挑战 ⭐\n靠近后按 E', this.textStyle(25)).setOrigin(0.5).setAlign('center');
  }

  update(_time, delta) {
    const horizontal = Number(this.cursors.right.isDown || this.keys.D.isDown) - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const vertical = Number(this.cursors.down.isDown || this.keys.S.isDown) - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(horizontal, vertical);
    if (direction.lengthSq() > 0) direction.normalize().scale(220 * delta / 1000);
    this.playerMarker.x = Phaser.Math.Clamp(this.playerMarker.x + direction.x, 145, 1135);
    this.playerMarker.y = Phaser.Math.Clamp(this.playerMarker.y + direction.y, 115, 600);
  }

  interact() {
    if (Phaser.Math.Distance.Between(this.playerMarker.x, this.playerMarker.y, this.exitPoint.x, this.exitPoint.y) < 100) {
      this.scene.wake(SCENE_KEYS.GAME);
      this.scene.stop();
      return;
    }
    if (Phaser.Math.Distance.Between(this.playerMarker.x, this.playerMarker.y, this.featurePoint.x, this.featurePoint.y) > 130) return;

    if (this.roomId === 'home') {
      const time = gameStore.state.time;
      gameStore.setTime({ day: time.day + 1, hour: 8, minute: 0 });
      saveManager.save();
    } else if (this.roomId === 'arcade') {
      if (questSystem.step < 7) return;
      this.scene.launch(SCENE_KEYS.CATCH_GAME);
      this.scene.sleep();
    }
  }
}
