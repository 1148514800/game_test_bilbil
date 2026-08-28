import { NPC_IDS } from '../config/npcProfiles.js';
import { gameStore } from '../core/GameStore.js';
import { saveManager } from '../core/SaveManager.js';

export const NPC_MEMORY_LIMIT = 5;

/** 极简短期记忆：每名 NPC 只保留最近 5 轮玩家与 NPC 的交流。 */
export class NPCMemory {
  get(npcId) {
    if (!NPC_IDS.includes(npcId)) return [];
    return [...(gameStore.state.npcMemories[npcId] ?? [])];
  }

  add(npcId, playerText, npcText) {
    if (!NPC_IDS.includes(npcId)) return false;

    const exchange = {
      player: String(playerText).trim(),
      npc: String(npcText).trim(),
    };
    const current = gameStore.state.npcMemories[npcId] ?? [];
    gameStore.state.npcMemories[npcId] = [...current, exchange].slice(-NPC_MEMORY_LIMIT);

    // 每次 AI 交流结束立即保存，退出对话或刷新页面也不会丢失最近记忆。
    saveManager.save();
    return true;
  }
}

export const npcMemory = new NPCMemory();
