import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';

/**
 * 启动场景只负责最早期初始化。
 * 以后检查存档版本、浏览器能力或语言设置，都可以从这里开始。
 */
export class BootScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create() {
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
