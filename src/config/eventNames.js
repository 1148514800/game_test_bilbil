/**
 * 事件总线使用的“广播频道”名称。
 * 发出事件和监听事件的模块都从这里取名字，后续修改更安全。
 */
export const EVENTS = Object.freeze({
  STATE_CHANGED: 'state:changed',
  TIME_CHANGED: 'time:changed',
  MONEY_CHANGED: 'money:changed',
  PLAYER_ZONE_CHANGED: 'player:zone-changed',
  SHOW_TOAST: 'ui:show-toast',
  QUEST_CHANGED: 'quest:changed',
  INVENTORY_CHANGED: 'inventory:changed',
});
