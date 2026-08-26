import { EVENTS } from '../config/eventNames.js';
import { eventBus } from '../core/EventBus.js';
import { gameStore } from '../core/GameStore.js';
import { saveManager } from '../core/SaveManager.js';

const OBJECTIVES = [
  '和住宅旁的邻居小林谈谈',
  '前往城市公园，与管理员陈叔交谈',
  '在公园里收集 3 件遗失物品',
  '把找到的物品交给公园管理员',
  '把包裹送给街边商店的店员小雨',
  '前往小游戏广场，调查场馆外的配电箱',
  '与小游戏馆入口的阿杰交谈',
  '完成接物挑战，至少获得 8 分',
  '教学完成：自由探索城市并帮助居民',
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
      arcadeManager: ['接物挑战馆每天上午十点开门。'],
      resident: ['天气不错，适合在城市里散步。'],
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
        lines: ['这是陈叔托你送来的吧？辛苦了！', '小游戏馆好像停电了，你可以去广场看看。'],
        onComplete: () => {
          gameStore.removeItem('delivery-package');
          gameStore.addMoney(30);
          this.advance(5, npcId);
        },
      };
    }
    if (npcId === 'arcadeManager' && this.step === 6) {
      return {
        lines: ['电力恢复了！我是场馆管理员阿杰。', '试试接物挑战吧：接住星星，躲开垃圾，拿到 8 分就算过关。'],
        onComplete: () => this.advance(7, npcId),
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

  investigateBreaker() {
    if (this.step !== 5) return false;
    this.advance(6);
    return true;
  }

  completeMinigame(score) {
    if (this.step !== 7 || score < 8) return false;
    gameStore.addMoney(50);
    gameStore.state.quests.tutorial.status = 'completed';
    this.advance(8);
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
