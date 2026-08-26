import Phaser from 'phaser';
import { PLAYER_SPEED } from '../../config/constants.js';
import { AvatarView } from '../../ui/components/AvatarView.js';

/**
 * 地图中的玩家实体。
 * 它负责“如何移动”，但不负责地图、任务或时间，从而保持职责清晰。
 */
export class Player extends AvatarView {
  constructor(scene, x, y, appearance) {
    super(scene, x, y, appearance, 1);

    scene.physics.add.existing(this);
    this.body.setSize(38, 58);
    this.body.setOffset(2, 15);
    this.body.setCollideWorldBounds(true);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D');
    this.lastDirection = 'down';
  }

  /** 每帧读取键盘状态并设置速度，斜向移动时会自动归一化，避免跑得更快。 */
  update() {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    const direction = new Phaser.Math.Vector2(
      Number(right) - Number(left),
      Number(down) - Number(up),
    );

    if (direction.lengthSq() > 0) {
      direction.normalize().scale(PLAYER_SPEED);
      this.body.setVelocity(direction.x, direction.y);

      if (Math.abs(direction.x) > Math.abs(direction.y)) {
        this.lastDirection = direction.x > 0 ? 'right' : 'left';
      } else {
        this.lastDirection = direction.y > 0 ? 'down' : 'up';
      }

      // 轻微摆动作为占位行走动画，正式角色素材接入后替换为帧动画。
      this.rotation = Math.sin(this.scene.time.now / 90) * 0.035;
    } else {
      this.body.setVelocity(0, 0);
      this.rotation = 0;
    }
  }
}
