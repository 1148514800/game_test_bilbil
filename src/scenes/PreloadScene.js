import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import {
  PLAYER_ASSET_KEYS,
  PLAYER_BASE_DIRECTION_ROWS,
  PLAYER_SPRITE_CONFIG,
} from '../config/playerSpriteConfig.js';

/**
 * 资源加载场景。
 * 玩家正式 Sprite 等公共资源都在这里统一加载，其他场景只使用资源键名。
 */
export class PreloadScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  preload() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add.text(centerX, centerY - 100, '城市新生活', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#244342',
    }).setOrigin(0.5);

    this.add.rectangle(centerX, centerY, 520, 34, 0xffffff, 0.8)
      .setStrokeStyle(3, 0x277a78);
    this.progressBar = this.add.rectangle(centerX - 250, centerY, 0, 22, 0xf2a65a)
      .setOrigin(0, 0.5);
    this.loadingText = this.add.text(centerX, centerY + 58, '正在准备城市……', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#37605f',
    }).setOrigin(0.5);

    // 地图玩家只加载一张图集；待机直接复用行走图集中的静止帧。
    this.load.spritesheet(
      PLAYER_ASSET_KEYS.WALK,
      'assets/images/characters/player/player_walk_sheet.png',
      {
        frameWidth: PLAYER_SPRITE_CONFIG.frameWidth,
        frameHeight: PLAYER_SPRITE_CONFIG.frameHeight,
      },
    );

    // 加入正式资源后，这个事件会按照真实下载进度更新进度条。
    this.load.on('progress', (progress) => {
      this.progressBar.width = 500 * progress;
      this.loadingText.setText(`正在加载资源 ${Math.round(progress * 100)}%`);
    });
  }

  create() {
    this.createPlayerAnimations();
    this.progressBar.width = 500;
    this.loadingText.setText('准备完成！');

    // 当前没有外部图片，直接进入菜单；加入正式资源后，加载过程本身会自然显示此页面。
    this.scene.start(SCENE_KEYS.MAIN_MENU);
  }

  /**
   * 只为素材实际拥有的五个方向创建动画。
   * down-right、right、up-right 在 Player 中复用对应左侧动画并设置 flipX。
   */
  createPlayerAnimations() {
    Object.entries(PLAYER_BASE_DIRECTION_ROWS).forEach(([direction, rowIndex]) => {
      const firstFrame = rowIndex * PLAYER_SPRITE_CONFIG.walkFramesPerDirection;
      const idleAnimationKey = `player-idle-${direction}`;
      const walkAnimationKey = `player-walk-${direction}`;

      if (!this.anims.exists(idleAnimationKey)) {
        this.anims.create({
          key: idleAnimationKey,
          // 使用相同方向行走动画的第 0 帧，因此停止移动时形象、大小和脚底都不变。
          frames: [{
            key: PLAYER_ASSET_KEYS.WALK,
            frame: firstFrame + PLAYER_SPRITE_CONFIG.idleFrameOffset,
          }],
          frameRate: 1,
          repeat: 0,
        });
      }

      if (!this.anims.exists(walkAnimationKey)) {
        this.anims.create({
          key: walkAnimationKey,
          frames: this.anims.generateFrameNumbers(PLAYER_ASSET_KEYS.WALK, {
            start: firstFrame,
            end: firstFrame + PLAYER_SPRITE_CONFIG.walkFramesPerDirection - 1,
          }),
          frameRate: PLAYER_SPRITE_CONFIG.walkFrameRate,
          repeat: -1,
          // 浏览器偶尔延迟时直接追上正确进度，避免随后连续补帧形成忽快忽慢。
          skipMissedFrames: true,
        });
      }
    });
  }
}
