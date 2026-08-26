/**
 * 正式玩家 Sprite 的统一配置。
 * 这些尺寸来自 tools/process_player_sprites.py 实际生成的 metadata，不能随意猜测修改。
 */
export const PLAYER_ASSET_KEYS = Object.freeze({
  WALK: 'player-walk-sheet',
});

export const PLAYER_SPRITE_CONFIG = Object.freeze({
  frameWidth: 128,
  frameHeight: 192,
  footBaselineY: 176,
  displayScale: 0.55,
  // 12 FPS 可以被常见的 60 / 120 / 144Hz 刷新率整除，动作帧停留时间更均匀。
  walkFrameRate: 12,
  walkFramesPerDirection: 8,
  // 待机直接复用行走图集每一行的第 0 帧，保证角色画风、比例完全一致。
  idleFrameOffset: 0,
  // 碰撞体只覆盖人物脚边的下半身区域，不让头发和背包阻挡建筑。
  bodyWidth: 52,
  bodyHeight: 32,
  bodyOffsetX: 38,
  bodyOffsetY: 144,
});

/** 原图五行的固定方向顺序；右侧方向不会生成重复图片。 */
export const PLAYER_BASE_DIRECTION_ROWS = Object.freeze({
  down: 0,
  'down-left': 1,
  left: 2,
  'up-left': 3,
  up: 4,
});

/** 将完整八方向映射到五个原始方向及 flipX 状态。 */
export const PLAYER_DIRECTION_RENDERING = Object.freeze({
  up: { baseDirection: 'up', flipX: false },
  'up-left': { baseDirection: 'up-left', flipX: false },
  left: { baseDirection: 'left', flipX: false },
  'down-left': { baseDirection: 'down-left', flipX: false },
  down: { baseDirection: 'down', flipX: false },
  'down-right': { baseDirection: 'down-left', flipX: true },
  right: { baseDirection: 'left', flipX: true },
  'up-right': { baseDirection: 'up-left', flipX: true },
});
