import Phaser from 'phaser';

const SKIN_COLORS = [0xf2c6a0, 0xd99b72, 0xa86f4d, 0x6e4635];
const HAIR_COLORS = [0x3b2c26, 0x7a4b2b, 0x252a35, 0xd4a451, 0x9d4d7b];
const CLOTHES_COLORS = [0x4f8dd6, 0xee795f, 0x6abf75, 0xf2b84b, 0x8c6ed1, 0x394b59];

/**
 * 使用基础图形绘制的临时卡通角色。
 * 当前只供 NPC 使用；地图玩家统一使用正式的八方向 Sprite。
 */
export class AvatarView extends Phaser.GameObjects.Container {
  constructor(scene, x, y, appearance, displayScale = 1) {
    super(scene, x, y);
    scene.add.existing(this);

    this.appearance = { ...appearance };

    // 阴影能让俯视角角色看起来确实“站在地面上”。
    this.shadow = scene.add.ellipse(0, 27, 38, 14, 0x244342, 0.22);
    this.leftLeg = scene.add.rectangle(-9, 18, 11, 24, 0x31475a).setRounded(4);
    this.rightLeg = scene.add.rectangle(9, 18, 11, 24, 0x31475a).setRounded(4);
    // 不能命名为 body：Phaser Arcade Physics 会把 body 属性留给物理碰撞体。
    this.torso = scene.add.rectangle(0, -3, 38, 38).setRounded(10);
    this.head = scene.add.circle(0, -31, 22);
    this.hair = scene.add.ellipse(0, -43, 42, 24);
    this.leftEye = scene.add.circle(-7, -29, 2.5, 0x273637);
    this.rightEye = scene.add.circle(7, -29, 2.5, 0x273637);

    this.add([
      this.shadow,
      this.leftLeg,
      this.rightLeg,
      this.torso,
      this.head,
      this.hair,
      this.leftEye,
      this.rightEye,
    ]);

    // setSize 为物理碰撞体提供宽高；预览界面则通过 displayScale 放大。
    this.setSize(42, 76);
    this.setScale(displayScale);
    this.refreshAppearance(appearance);
  }

  /** 按索引读取颜色，越界时自动回到第一种，防止旧存档造成报错。 */
  refreshAppearance(appearance) {
    this.appearance = { ...this.appearance, ...appearance };
    const skinColor = SKIN_COLORS[this.appearance.skinIndex] ?? SKIN_COLORS[0];
    const hairColor = HAIR_COLORS[this.appearance.hairColorIndex] ?? HAIR_COLORS[0];
    const clothesColor =
      CLOTHES_COLORS[this.appearance.clothesColorIndex] ?? CLOTHES_COLORS[0];

    this.head.setFillStyle(skinColor);
    this.hair.setFillStyle(hairColor);
    this.torso.setFillStyle(clothesColor);

    // 发型索引暂时通过不同宽高表现，正式美术接入后会替换为不同动画帧。
    const hairStyles = [
      { width: 42, height: 24, y: -43 },
      { width: 48, height: 30, y: -40 },
      { width: 38, height: 20, y: -45 },
      { width: 45, height: 34, y: -39 },
    ];
    const hairStyle = hairStyles[this.appearance.hairIndex] ?? hairStyles[0];
    this.hair.setSize(hairStyle.width, hairStyle.height).setY(hairStyle.y);
  }
}
