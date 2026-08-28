import { INITIAL_TIME } from '../config/constants.js';
import { EVENTS } from '../config/eventNames.js';
import { eventBus } from './EventBus.js';
import { NPC_IDS } from '../config/npcProfiles.js';
import {
  DEFAULT_NPC_BEHAVIORS,
  isAllowedNpcBehavior,
} from '../config/locationConfig.js';

const CORE_NPC_IDS = new Set(NPC_IDS);
const TUTORIAL_COMPLETED_STEP = 5;

/**
 * 返回一份全新的默认存档数据。
 * 每次都创建新对象，避免新游戏错误地沿用上一局的背包或任务数据。
 */
function createInitialState() {
  return {
    saveVersion: 4,
    player: {
      name: '新居民',
      identity: '自由职业者',
      money: 200,
      position: { x: 520, y: 520 },
    },
    time: { ...INITIAL_TIME },
    inventory: [],
    quests: {
      tutorial: { status: 'not-started', step: 0 },
    },
    npcRelationships: {},
    npcMemories: Object.fromEntries(NPC_IDS.map((npcId) => [npcId, []])),
    npcBehaviorStates: Object.fromEntries(
      NPC_IDS.map((npcId) => [npcId, { action: DEFAULT_NPC_BEHAVIORS[npcId] ?? 'rest' }]),
    ),
  };
}

/**
 * 将旧版 9 段教学迁移到当前 5 段流程。
 * 旧存档 step 5 以后都代表已经送达包裹，因此直接视为教学完成。
 */
function normalizeTutorial(savedTutorial) {
  const numericStep = Number(savedTutorial?.step);
  const step = Number.isFinite(numericStep) ? Math.max(0, Math.floor(numericStep)) : 0;

  if (savedTutorial?.status === 'completed' || step >= TUTORIAL_COMPLETED_STEP) {
    return { status: 'completed', step: TUTORIAL_COMPLETED_STEP };
  }

  return {
    status: savedTutorial?.status === 'not-started' ? 'not-started' : 'active',
    step: Math.min(step, TUTORIAL_COMPLETED_STEP - 1),
  };
}

/** 将任意旧存档中的 NPC 交流清理为当前三名 NPC 各自最近 5 条。 */
function normalizeNpcMemories(savedMemories) {
  const source = savedMemories && typeof savedMemories === 'object' ? savedMemories : {};
  return Object.fromEntries(NPC_IDS.map((npcId) => {
    const memories = Array.isArray(source[npcId]) ? source[npcId] : [];
    const normalized = memories
      .filter((entry) => entry && typeof entry.player === 'string' && typeof entry.npc === 'string')
      .map((entry) => ({ player: entry.player.slice(0, 120), npc: entry.npc.slice(0, 500) }))
      .slice(-5);
    return [npcId, normalized];
  }));
}

/** v3 及更早存档没有行为状态时，为当前三名 NPC 自动生成安全默认值。 */
function normalizeNpcBehaviorStates(savedStates) {
  const source = savedStates && typeof savedStates === 'object' ? savedStates : {};
  return Object.fromEntries(NPC_IDS.map((npcId) => {
    const savedAction = source[npcId]?.action;
    const action = isAllowedNpcBehavior(savedAction)
      ? savedAction
      : (DEFAULT_NPC_BEHAVIORS[npcId] ?? 'rest');
    return [npcId, { action }];
  }));
}

/**
 * GameStore 是唯一的全局游戏数据仓库。
 * 场景切换会销毁场景对象，但这里的角色数据、时间和背包仍会保留。
 */
class GameStore {
  constructor() {
    this.state = createInitialState();
  }

  /** 开始新游戏时彻底恢复默认数据。 */
  reset() {
    this.state = createInitialState();
    eventBus.emit(EVENTS.STATE_CHANGED, this.state);
  }

  /** 保存角色创建页面产生的姓名与身份。 */
  setCharacter(profile) {
    const identityStartingMoney = {
      自由职业者: 200,
      学生: 120,
      城市职员: 300,
    };

    this.state.player = {
      ...this.state.player,
      name: profile.name,
      identity: profile.identity,
      money: identityStartingMoney[profile.identity] ?? 200,
    };
    this.state.quests.tutorial = { status: 'active', step: 0 };
    eventBus.emit(EVENTS.STATE_CHANGED, this.state);
  }

  /** 更新时间；使用浅拷贝可以避免其他模块无意间直接修改旧对象。 */
  setTime(time) {
    this.state.time = { ...time };
    eventBus.emit(EVENTS.TIME_CHANGED, this.state.time);
  }

  /** 记录玩家位置，为继续游戏做准备。 */
  setPlayerPosition(x, y) {
    this.state.player.position = {
      x: Math.round(x),
      y: Math.round(y),
    };
  }

  /** 添加物品；相同 id 的物品自动叠加数量。 */
  addItem(item) {
    const existingItem = this.state.inventory.find((entry) => entry.id === item.id);
    if (existingItem) existingItem.quantity += item.quantity ?? 1;
    else this.state.inventory.push({ ...item, quantity: item.quantity ?? 1 });
    eventBus.emit(EVENTS.INVENTORY_CHANGED, this.state.inventory);
  }

  /** 扣除指定物品，数量归零后从背包列表移除。 */
  removeItem(itemId, quantity = 1) {
    const item = this.state.inventory.find((entry) => entry.id === itemId);
    if (!item || item.quantity < quantity) return false;
    item.quantity -= quantity;
    if (item.quantity === 0) {
      this.state.inventory = this.state.inventory.filter((entry) => entry.id !== itemId);
    }
    eventBus.emit(EVENTS.INVENTORY_CHANGED, this.state.inventory);
    return true;
  }

  hasItem(itemId, quantity = 1) {
    return (this.state.inventory.find((entry) => entry.id === itemId)?.quantity ?? 0) >= quantity;
  }

  addMoney(amount) {
    this.state.player.money = Math.max(0, this.state.player.money + amount);
    eventBus.emit(EVENTS.MONEY_CHANGED, this.state.player.money);
  }

  addRelationship(npcId, amount) {
    const oldValue = this.state.npcRelationships[npcId] ?? 0;
    this.state.npcRelationships[npcId] = oldValue + amount;
  }

  /** 行为存档只允许写入白名单动作，不保存坐标或 Phaser 对象。 */
  setNpcBehaviorAction(npcId, action) {
    if (!CORE_NPC_IDS.has(npcId) || !isAllowedNpcBehavior(action)) return false;
    this.state.npcBehaviorStates[npcId] = { action };
    return true;
  }

  /** 把旧版或当前版存档恢复为兼容当前 MVP 的全局状态。 */
  hydrate(savedState) {
    const defaults = createInitialState();
    const source = savedState && typeof savedState === 'object' ? savedState : {};
    const savedPlayer = source.player && typeof source.player === 'object' ? source.player : {};
    const compatiblePlayer = { ...savedPlayer };
    // 旧 appearance 字段仅用于已经删除的角色创建选项，不再带入运行时状态。
    delete compatiblePlayer.appearance;

    const savedQuests = source.quests && typeof source.quests === 'object' ? source.quests : {};
    const savedRelationships =
      source.npcRelationships && typeof source.npcRelationships === 'object'
        ? source.npcRelationships
        : {};

    this.state = {
      ...defaults,
      ...source,
      saveVersion: defaults.saveVersion,
      player: {
        ...defaults.player,
        ...compatiblePlayer,
        position: { ...defaults.player.position, ...savedPlayer.position },
      },
      time: { ...defaults.time, ...source.time },
      inventory: Array.isArray(source.inventory) ? source.inventory : [],
      quests: {
        ...defaults.quests,
        ...savedQuests,
        tutorial: normalizeTutorial(savedQuests.tutorial),
      },
      // 已删除 NPC 的旧好感度键不再重新写入新存档。
      npcRelationships: Object.fromEntries(
        Object.entries(savedRelationships).filter(([npcId]) => CORE_NPC_IDS.has(npcId)),
      ),
      // v1/v2 存档没有 npcMemories 时会自动为三名 NPC 创建空数组。
      npcMemories: normalizeNpcMemories(source.npcMemories),
      // v3 及更早存档缺少行为状态时，会补齐白名单内的安全默认动作。
      npcBehaviorStates: normalizeNpcBehaviorStates(source.npcBehaviorStates),
    };
    eventBus.emit(EVENTS.STATE_CHANGED, this.state);
  }

  /** 生成不带 Phaser 对象的纯数据副本，可安全写入 localStorage。 */
  toJSON() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

export const gameStore = new GameStore();
