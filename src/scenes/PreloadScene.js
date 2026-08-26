import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';

/**
 * 资源加载场景。
 * 第一版使用程序绘制占位素材，暂时没有外部图片，但完整加载界面先保留下来。
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

    // 加入正式资源后，这个事件会按照真实下载进度更新进度条。
    this.load.on('progress', (progress) => {
      this.progressBar.width = 500 * progress;
      this.loadingText.setText(`正在加载资源 ${Math.round(progress * 100)}%`);
    });
  }

  create() {
    this.progressBar.width = 500;
    this.loadingText.setText('准备完成！');

    // 当前没有外部图片，直接进入菜单；加入正式资源后，加载过程本身会自然显示此页面。
    this.scene.start(SCENE_KEYS.MAIN_MENU);
  }
}
