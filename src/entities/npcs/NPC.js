import Phaser from 'phaser';
import { AvatarView } from '../../ui/components/AvatarView.js';

/** 可见 NPC 实体，包含外观、姓名牌和向日程目标移动的能力。 */
export class NPC extends AvatarView {
  constructor(scene, profile, x, y) {
    super(scene, x, y, profile.appearance, 0.92);
    this.profile = profile;
    this.target = { x, y };
    this.nameLabel = scene.add.text(x, y - 66, profile.name, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#244342cc',
      padding: { x: 7, y: 3 },
    }).setOrigin(0.5);
  }

  setTarget(x, y) {
    this.target = { x, y };
  }

  update(delta) {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (distance > 900) {
      this.setPosition(this.target.x, this.target.y);
    } else if (distance > 4) {
      const speed = 75 * (delta / 1000);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
      this.x += Math.cos(angle) * Math.min(speed, distance);
      this.y += Math.sin(angle) * Math.min(speed, distance);
    }
    this.nameLabel.setPosition(this.x, this.y - 66);
  }

  destroy(fromScene) {
    this.nameLabel?.destroy();
    super.destroy(fromScene);
  }
}
