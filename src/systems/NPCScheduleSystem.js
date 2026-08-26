import Phaser from 'phaser';
import { NPC } from '../entities/npcs/NPC.js';
import { gameStore } from '../core/GameStore.js';

const PROFILES = [
  // MVP 只保留三名核心 NPC；外观配置仍供 NPC 的临时 AvatarView 使用。
  { id: 'neighbor', name: '小林', appearance: { skinIndex: 1, hairIndex: 1, hairColorIndex: 0, clothesColorIndex: 1 }, schedule: [[0, 8, 920, 530], [8, 17, 1080, 760], [17, 20, 2140, 700], [20, 24, 920, 530]] },
  { id: 'parkKeeper', name: '陈叔', appearance: { skinIndex: 2, hairIndex: 2, hairColorIndex: 2, clothesColorIndex: 2 }, schedule: [[0, 8, 700, 1500], [8, 17, 2180, 820], [17, 24, 700, 1500]] },
  { id: 'shopClerk', name: '小雨', appearance: { skinIndex: 0, hairIndex: 3, hairColorIndex: 4, clothesColorIndex: 3 }, schedule: [[0, 8, 950, 1900], [8, 19, 1030, 1490], [19, 24, 950, 1900]] },
];

/** 根据游戏时间为每名 NPC 选择工作或休息地点。 */
export class NPCScheduleSystem {
  constructor(scene) {
    this.npcs = PROFILES.map((profile) => {
      const target = this.getTarget(profile);
      return new NPC(scene, profile, target.x, target.y);
    });
  }

  getTarget(profile) {
    const hour = gameStore.state.time.hour + gameStore.state.time.minute / 60;
    const slot = profile.schedule.find(([start, end]) => hour >= start && hour < end) ?? profile.schedule[0];
    return { x: slot[2], y: slot[3] };
  }

  update(delta) {
    this.npcs.forEach((npc) => {
      const target = this.getTarget(npc.profile);
      npc.setTarget(target.x, target.y);
      npc.update(delta);
    });
  }

  getNearest(x, y, maximumDistance = 105) {
    return this.npcs
      .map((npc) => ({ npc, distance: Phaser.Math.Distance.Between(x, y, npc.x, npc.y) }))
      .filter((entry) => entry.distance <= maximumDistance)
      .sort((a, b) => a.distance - b.distance)[0]?.npc ?? null;
  }
}
