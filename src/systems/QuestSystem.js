import { EVENTS } from '../config/eventNames.js';
import { eventBus } from '../core/EventBus.js';
import { gameStore } from '../core/GameStore.js';
import { saveManager } from '../core/SaveManager.js';

const OBJECTIVES = [
  '与住宅附近的小林聊天',
  '前往城市公园，与陈叔聊天',
  '在公园里收集 3 件遗失物品',
  '把 3 件遗失物交给陈叔',
  '前往商店，把陈叔的包裹交给小雨',
  '教学完成，自由探索城市。',
];

/** 教学任务系统只管理任务规则，不直接绘制对话框或地图物品。 */
export class QuestSystem {
  get step() {
    return gameStore.state.quests.tutorial.step;
  }

  getObjective() {
    return OBJECTIVES[this.step] ?? OBJECTIVES[OBJECTIVES.length - 1];
  }

  /** 根据当前步骤返回 NPC 对话和对话完成后的任务动作。 */
  interactWithNpc(npcId) {
    const generic = {
      neighbor: ['欢迎来到这座城市！有空多去公园走走吧。'],
      parkKeeper: ['公园的花草每天都需要照料。'],
      shopClerk: ['欢迎光临！商店还在准备货架。'],
    };

    if (npcId === 'neighbor' && this.step === 0) {
      return {
        lines: ['你就是刚搬来的新邻居吧？我是小林。', '先去公园认识一下陈叔，他会告诉你城市里的生活方式。'],
        onComplete: () => this.advance(1, npcId),
      };
    }
    if (npcId === 'parkKeeper' && this.step === 1) {
      return {
        lines: ['来得正好！我搬工具时丢了三件东西。', '它们散落在公园里，能帮我找回来吗？'],
        onComplete: () => this.advance(2, npcId),
      };
    }
    if (npcId === 'parkKeeper' && this.step === 3) {
      return {
        lines: ['全都找到了，太感谢了！', '还有一个包裹，请帮我送给街边商店的小雨。'],
        onComplete: () => {
          gameStore.removeItem('lost-tool', 3);
          gameStore.addItem({ id: 'delivery-package', name: '陈叔的包裹', questItem: true });
          this.advance(4, npcId);
        },
      };
    }
    if (npcId === 'shopClerk' && this.step === 4 && gameStore.hasItem('delivery-package')) {
      return {
        lines: ['这是陈叔托你送来的吧？辛苦了！', '这是给你的谢礼。接下来可以自由探索这座城市了。'],
        onComplete: () => {
          gameStore.removeItem('delivery-package');
          gameStore.addMoney(30);
          // 包裹送达就是 MVP 教学终点，小游戏不再影响主线进度。
          gameStore.state.quests.tutorial.status = 'completed';
          this.advance(5, npcId);
        },
      };
    }
    return { lines: generic[npcId] ?? ['你好！'], onComplete: null };
  }

  collectLostItem() {
    if (this.step !== 2) return false;
    gameStore.addItem({ id: 'lost-tool', name: '公园遗失物', questItem: true });
    const count = gameStore.state.inventory.find((item) => item.id === 'lost-tool')?.quantity ?? 0;
    if (count >= 3) this.advance(3);
    else this.notify();
    return true;
  }

  /** 接物小游戏作为自由探索内容保留，只发放原有奖励，不再推进教学。 */
  completeMinigame(score) {
    if (score < 8) return false;
    gameStore.addMoney(50);
    saveManager.save();
    return true;
  }

  advance(nextStep, relationshipNpcId = null) {
    gameStore.state.quests.tutorial.step = nextStep;
    if (relationshipNpcId) gameStore.addRelationship(relationshipNpcId, 1);
    this.notify();
    saveManager.save();
  }

  notify() {
    eventBus.emit(EVENTS.QUEST_CHANGED, {
      step: this.step,
      objective: this.getObjective(),
    });
  }
}

export const questSystem = new QuestSystem();
