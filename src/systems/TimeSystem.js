import { GAME_MINUTES_PER_REAL_SECOND } from '../config/constants.js';
import { gameStore } from '../core/GameStore.js';

/**
 * 把现实流逝时间转换为游戏内日期和时钟。
 * 换算比例是独立常量，以后调快或调慢只需要改一个地方。
 */
export class TimeSystem {
  constructor() {
    this.accumulatedGameMinutes = 0;
  }

  /** delta 是 Phaser 提供的两帧之间毫秒数，不受电脑帧率高低影响。 */
  update(delta) {
    this.accumulatedGameMinutes += (delta / 1000) * GAME_MINUTES_PER_REAL_SECOND;

    if (this.accumulatedGameMinutes < 1) return;

    const wholeMinutes = Math.floor(this.accumulatedGameMinutes);
    this.accumulatedGameMinutes -= wholeMinutes;
    this.advanceMinutes(wholeMinutes);
  }

  advanceMinutes(amount) {
    const current = gameStore.state.time;
    let totalMinutes = current.hour * 60 + current.minute + amount;
    let day = current.day;

    while (totalMinutes >= 24 * 60) {
      totalMinutes -= 24 * 60;
      day += 1;
    }

    gameStore.setTime({
      day,
      hour: Math.floor(totalMinutes / 60),
      minute: totalMinutes % 60,
    });
  }
}
