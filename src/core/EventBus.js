import Phaser from 'phaser';

/**
 * 全局事件总线就像游戏内部的广播站。
 * 例如时间系统只负责广播“时间变了”，HUD 自己决定如何更新文字，二者不直接依赖。
 */
export const eventBus = new Phaser.Events.EventEmitter();
