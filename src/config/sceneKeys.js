/**
 * 所有场景名称集中在这里。
 * 场景跳转时引用常量，可以避免手写字符串造成拼写错误。
 */
export const SCENE_KEYS = Object.freeze({
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MAIN_MENU: 'MainMenuScene',
  CHARACTER_CREATION: 'CharacterCreationScene',
  GAME: 'GameScene',
  HUD: 'HUDScene',
  PAUSE: 'PauseScene',
  DIALOGUE: 'DialogueScene',
  INTERIOR: 'InteriorScene',
  CATCH_GAME: 'CatchGameScene',
});
