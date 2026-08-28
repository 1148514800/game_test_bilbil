import Phaser from 'phaser';
import { NPC } from '../entities/npcs/NPC.js';
import { gameStore } from '../core/GameStore.js';
import { NPC_PROFILES } from '../config/npcProfiles.js';
import { getBehaviorDestination, getBehaviorStatusText } from '../config/locationConfig.js';

/** 根据游戏时间为每名 NPC 选择工作或休息地点。 */
export class NPCScheduleSystem {
  constructor(scene) {
    this.npcs = NPC_PROFILES.map((profile) => {
      const target = this.getTarget(profile);
      return new NPC(scene, profile, target.x, target.y);
    });
  }

  getTarget(profile) {
    const action = this.getScheduleAction(profile);
    const target = getBehaviorDestination(profile, action);
    return { ...target, action };
  }

  getScheduleAction(profile) {
    const hour = gameStore.state.time.hour + gameStore.state.time.minute / 60;
    const slot = profile.schedule.find(([start, end]) => hour >= start && hour < end) ?? profile.schedule[0];
    return slot[2];
  }

  update(delta) {
    this.npcs.forEach((npc) => {
      const target = this.getTarget(npc.profile);
      npc.setTarget(target.x, target.y);
      npc.update(delta);
      npc.setBehaviorStatus(getBehaviorStatusText(target.action, npc.hasReachedTarget()));
    });
  }

  getNearest(x, y, maximumDistance = 105) {
    return this.npcs
      .map((npc) => ({ npc, distance: Phaser.Math.Distance.Between(x, y, npc.x, npc.y) }))
      .filter((entry) => entry.distance <= maximumDistance)
      .sort((a, b) => a.distance - b.distance)[0]?.npc ?? null;
  }
}
