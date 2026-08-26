import { gameStore } from './GameStore.js';

const SAVE_KEY = 'city-new-life:auto-save:v1';

/**
 * 浏览器本地存档管理器。
 * 所有 localStorage 操作都包裹在 try/catch 内，隐私模式禁用存储时游戏也不会崩溃。
 */
class SaveManager {
  hasSave() {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch (error) {
      console.warn('浏览器无法访问本地存储：', error);
      return false;
    }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameStore.toJSON()));
      return true;
    } catch (error) {
      console.warn('自动存档失败：', error);
      return false;
    }
  }

  load() {
    try {
      const rawSave = localStorage.getItem(SAVE_KEY);
      if (!rawSave) return false;

      gameStore.hydrate(JSON.parse(rawSave));
      return true;
    } catch (error) {
      console.warn('读取存档失败，将保留当前游戏数据：', error);
      return false;
    }
  }
}

export const saveManager = new SaveManager();
