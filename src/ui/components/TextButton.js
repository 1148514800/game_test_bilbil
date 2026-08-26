import Phaser from 'phaser';

/**
 * 可复用文字按钮。
 * 所有菜单都使用同一组件，后续调整圆角、颜色或字体时无需逐页修改。
 */
export class TextButton extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text, onClick, options = {}) {
    super(scene, x, y);

    this.buttonWidth = options.width ?? 300;
    this.buttonHeight = options.height ?? 64;
    this.enabled = options.enabled ?? true;
    this.normalColor = options.color ?? 0x277a78;
    this.hoverColor = options.hoverColor ?? 0x349b97;

    this.background = scene.add
      .rectangle(0, 0, this.buttonWidth, this.buttonHeight, this.normalColor)
      .setStrokeStyle(3, 0xffffff, 0.9);

    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: `${options.fontSize ?? 25}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add([this.background, this.label]);
    this.setSize(this.buttonWidth, this.buttonHeight);
    scene.add.existing(this);

    // 直接让背景矩形接收输入。矩形拥有 Phaser 自动计算的准确点击区域，
    // 在网页缩放、全屏和不同分辨率下都比手写 Container 点击区域稳定。
    this.background.setInteractive({ useHandCursor: true });

    this.background.on('pointerover', () => {
      if (this.enabled) this.background.setFillStyle(this.hoverColor);
    });
    this.background.on('pointerout', () => {
      if (this.enabled) this.background.setFillStyle(this.normalColor);
      this.setScale(1);
    });
    this.background.on('pointerdown', () => {
      if (!this.enabled || this.clickLocked) return;

      // pointerdown 当场执行，不再等待 pointerup，因此轻微拖动鼠标也不会漏掉点击。
      this.clickLocked = true;
      this.setScale(0.97);
      onClick();

      // 防止一次按下被浏览器重复派发；循环选择按钮很快即可再次使用。
      scene.time.delayedCall(100, () => {
        if (!this.active) return;
        this.clickLocked = false;
        this.setScale(1);
      });
    });

    this.setEnabled(this.enabled);
  }

  /** 禁用时按钮变灰，并阻止点击回调执行。 */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.background.setFillStyle(enabled ? this.normalColor : 0x8a9a99);
    this.label.setAlpha(enabled ? 1 : 0.65);
    this.background.input.cursor = enabled ? 'pointer' : 'default';
    return this;
  }
}
