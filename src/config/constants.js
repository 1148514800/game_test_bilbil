/**
 * 游戏固定规则。
 * 经常需要策划调整的数值以后应移入 public/assets/data/configs，而不是一直堆在这里。
 */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 2200;

export const PLAYER_SPEED = 260;

/** 现实 1 秒等于游戏 1 分钟，因此游戏里的一整天约为现实 24 分钟。 */
export const GAME_MINUTES_PER_REAL_SECOND = 1;

/** 游戏第一次开始时的默认时间：第 1 天早晨 8 点。 */
export const INITIAL_TIME = Object.freeze({
  day: 1,
  hour: 8,
  minute: 0,
});
