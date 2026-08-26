import Phaser from 'phaser';

/**
 * 所有普通场景共用的父类。
 * 目前只放真正通用的界面辅助方法，避免父类随着开发变成难以维护的“大杂烩”。
 */
export class BaseScene extends Phaser.Scene {
  constructor(sceneKey) {
    super(sceneKey);
  }

  /** 创建统一风格的页面标题。 */
  createTitle(text, y = 70) {
    return this.add
      .text(this.scale.width / 2, y, text, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#244342',
        stroke: '#ffffff',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
  }

  /** 创建带描边和轻微透明度的通用面板。 */
  createPanel(x, y, width, height, color = 0xffffff, alpha = 0.94) {
    return this.add
      .rectangle(x, y, width, height, color, alpha)
      .setStrokeStyle(4, 0x277a78, 0.85);
  }
}
