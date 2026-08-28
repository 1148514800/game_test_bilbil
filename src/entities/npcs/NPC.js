import Phaser from 'phaser';
import { AvatarView } from '../../ui/components/AvatarView.js';

/** 可见 NPC 实体，只负责显示、状态牌和朝系统提供的安全目标移动。 */
export class NPC extends AvatarView {
  constructor(scene, profile, x, y) {
    super(scene, x, y, profile.appearance, 0.92);
    this.profile = profile;
    this.target = { x, y };
    this.destination = { x, y };
    this.route = [];
    this.nameLabel = scene.add.text(x, y - 66, profile.name, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#244342cc',
      padding: { x: 7, y: 3 },
    }).setOrigin(0.5);
    this.statusLabel = scene.add.text(x, y - 42, '按日程活动', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: '#dff4f2',
      backgroundColor: '#173d3ccc',
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5);
  }

  setTarget(x, y) {
    this.target = { x, y };
    this.destination = { x, y };
    this.route = [];
  }

  /** 按预定义道路中转点依次移动；这些点全部由本地配置产生。 */
  setRoute(points) {
    const route = points
      .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
      .map((point) => ({ x: point.x, y: point.y }));
    if (!route.length) {
      this.setTarget(this.x, this.y);
      return;
    }

    this.target = route[0];
    this.destination = route[route.length - 1];
    this.route = route.slice(1);
  }

  setBehaviorStatus(text) {
    this.statusLabel.setText(text);
  }

  hasReachedTarget(tolerance = 6) {
    return this.route.length === 0
      && Phaser.Math.Distance.Between(
        this.x,
        this.y,
        this.destination.x,
        this.destination.y,
      ) <= tolerance;
  }

  update(delta) {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (distance > 4) {
      const speed = 75 * (delta / 1000);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
      this.x += Math.cos(angle) * Math.min(speed, distance);
      this.y += Math.sin(angle) * Math.min(speed, distance);
    } else if (this.route.length > 0) {
      this.target = this.route.shift();
    }
    this.nameLabel.setPosition(this.x, this.y - 66);
    this.statusLabel.setPosition(this.x, this.y - 42);
  }

  destroy(fromScene) {
    this.nameLabel?.destroy();
    this.statusLabel?.destroy();
    super.destroy(fromScene);
  }
}
