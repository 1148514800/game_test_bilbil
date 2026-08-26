import { INITIAL_TIME } from '../config/constants.js';
import { EVENTS } from '../config/eventNames.js';
import { eventBus } from './EventBus.js';

/**
 * 返回一份全新的默认存档数据。
 * 每次都创建新对象，避免新游戏错误地沿用上一局的背包或任务数据。
 */
function createInitialState() {
  return {
    saveVersion: 1,
    player: {
      name: '新居民',
      identity: '自由职业者',
      appearance: {
        skinIndex: 0,
        hairIndex: 0,
        hairColorIndex: 0,
        clothesColorIndex: 0,
      },
      money: 200,
      position: { x: 520, y: 520 },
    },
    time: { ...INITIAL_TIME },
    inventory: [],
    quests: {
      tutorial: { status: 'not-started', step: 0 },
    },
    npcRelationships: {},
  };
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

  /** 保存角色创建页面产生的数据。 */
  setCharacter(profile) {
    const identityStartingMoney = {
      自由职业者: 200,
      学生: 120,
      城市职员: 300,
    };

    this.state.player = {
      ...this.state.player,
      ...profile,
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

  /** 把读取到的普通对象恢复为当前全局状态。 */
  hydrate(savedState) {
    const defaults = createInitialState();
    this.state = {
      ...defaults,
      ...savedState,
      player: { ...defaults.player, ...savedState.player },
      time: { ...defaults.time, ...savedState.time },
      quests: { ...defaults.quests, ...savedState.quests },
    };
    eventBus.emit(EVENTS.STATE_CHANGED, this.state);
  }

  /** 生成不带 Phaser 对象的纯数据副本，可安全写入 localStorage。 */
  toJSON() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

export const gameStore = new GameStore();
