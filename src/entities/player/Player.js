import Phaser from 'phaser';
import { PLAYER_SPEED } from '../../config/constants.js';
import {
  PLAYER_ASSET_KEYS,
  PLAYER_DIRECTION_RENDERING,
  PLAYER_SPRITE_CONFIG,
} from '../../config/playerSpriteConfig.js';

/**
 * 地图中的正式玩家 Sprite。
 *
 * Player 不再继承 AvatarView：AvatarView 仍专门服务 NPC 和角色创建预览，
 * 因此替换玩家素材不会让所有 NPC 都变成同一个正式角色。
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, _appearance) {
    // _appearance 仅为兼容 GameScene 原有调用接口；地图玩家现在使用固定正式素材。
    // 玩家从创建开始就只使用行走图集；待机也取其中的静止帧，避免形象突变。
    super(scene, x, y, PLAYER_ASSET_KEYS.WALK, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(PLAYER_SPRITE_CONFIG.displayScale);

    // x/y 继续代表人物脚下位置，NPC 交互、进门、拾取和存档逻辑无需改变。
    this.setOrigin(
      0.5,
      PLAYER_SPRITE_CONFIG.footBaselineY / PLAYER_SPRITE_CONFIG.frameHeight,
    );

    // 视觉图片很高，但物理碰撞体只放在脚边，避免头部和背包卡住建筑。
    this.body.setSize(
      PLAYER_SPRITE_CONFIG.bodyWidth,
      PLAYER_SPRITE_CONFIG.bodyHeight,
    );
    this.body.setOffset(
      PLAYER_SPRITE_CONFIG.bodyOffsetX,
      PLAYER_SPRITE_CONFIG.bodyOffsetY,
    );
    this.body.setCollideWorldBounds(true);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D');
    this.lastDirection = 'down';
    this.isMoving = false;
    this.applyVisualState(false, this.lastDirection);
  }

  /**
   * 每帧只读取输入和设置速度。
   * 动画仅在开始/停止移动或方向改变时切换，不会反复从第 0 帧重播。
   */
  update() {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    const horizontal = Number(right) - Number(left);
    const vertical = Number(down) - Number(up);
    const movementVector = new Phaser.Math.Vector2(horizontal, vertical);
    const movingNow = movementVector.lengthSq() > 0;

    if (movingNow) {
      // normalize 保留斜向速度归一化，W+A 不会比单独按 W 跑得更快。
      movementVector.normalize().scale(PLAYER_SPEED);
      this.body.setVelocity(movementVector.x, movementVector.y);

      const nextDirection = this.getEightDirection(horizontal, vertical);
      const movementStateChanged = !this.isMoving;
      const directionChanged = nextDirection !== this.lastDirection;

      this.lastDirection = nextDirection;
      if (movementStateChanged || directionChanged) {
        this.applyVisualState(true, this.lastDirection);
      }
    } else {
      this.body.setVelocity(0, 0);

      // 停止的这一帧立即切回 lastDirection 对应待机图，不跳回正面。
      if (this.isMoving) this.applyVisualState(false, this.lastDirection);
    }

    this.isMoving = movingNow;
  }

  /** 把水平、垂直输入组合转换为完整八方向名称。 */
  getEightDirection(horizontal, vertical) {
    if (vertical < 0 && horizontal < 0) return 'up-left';
    if (vertical < 0 && horizontal > 0) return 'up-right';
    if (vertical > 0 && horizontal < 0) return 'down-left';
    if (vertical > 0 && horizontal > 0) return 'down-right';
    if (vertical < 0) return 'up';
    if (vertical > 0) return 'down';
    if (horizontal < 0) return 'left';
    return 'right';
  }

  /** 根据八方向映射选择五个基础动画之一，并设置是否水平镜像。 */
  applyVisualState(moving, direction) {
    const renderConfig = PLAYER_DIRECTION_RENDERING[direction];
    this.setFlipX(renderConfig.flipX);

    const animationState = moving ? 'walk' : 'idle';
    const animationKey = `player-${animationState}-${renderConfig.baseDirection}`;

    // ignoreIfPlaying=true：左右镜像共享同一动画时只改 flipX，不重启动画。
    this.play(animationKey, true);
  }
}
