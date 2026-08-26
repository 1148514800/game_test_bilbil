import Phaser from 'phaser';
import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { EVENTS } from '../config/eventNames.js';
import { eventBus } from '../core/EventBus.js';
import { gameStore } from '../core/GameStore.js';
import { questSystem } from '../systems/QuestSystem.js';

/** HUD 场景只显示信息，不承载地图或玩家物理逻辑。 */
export class HUDScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.HUD);
  }

  create() {
    this.add.rectangle(205, 82, 370, 125, 0x173d3c, 0.87)
      .setStrokeStyle(3, 0xffffff, 0.75);
    this.playerText = this.add.text(38, 34, '', this.getHudStyle(22, true));
    this.timeText = this.add.text(38, 72, '', this.getHudStyle(20));
    this.moneyText = this.add.text(38, 104, '', this.getHudStyle(18));

    this.zoneText = this.add.text(640, 35, '城市街道', {
      ...this.getHudStyle(24, true),
      backgroundColor: '#173d3cdd',
      padding: { x: 18, y: 9 },
    }).setOrigin(0.5);

    this.add.text(1240, 34, 'WASD / 方向键：移动\nE：互动　I：背包　Esc：暂停', {
      ...this.getHudStyle(17),
      align: 'right',
      backgroundColor: '#173d3cbb',
      padding: { x: 12, y: 8 },
    }).setOrigin(1, 0);

    this.toastText = this.add.text(640, 565, '', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '21px',
      color: '#ffffff',
      backgroundColor: '#253f3fe8',
      padding: { x: 18, y: 11 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    this.add.rectangle(305, 665, 550, 78, 0x173d3c, 0.9).setStrokeStyle(3, 0xf4ce5e, 0.9);
    this.questText = this.add.text(48, 636, '', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '18px', color: '#ffffff',
      wordWrap: { width: 500 },
    });

    this.refreshProfile();
    this.refreshTime(gameStore.state.time);
    this.refreshQuest();

    eventBus.on(EVENTS.TIME_CHANGED, this.refreshTime, this);
    eventBus.on(EVENTS.PLAYER_ZONE_CHANGED, this.showZone, this);
    eventBus.on(EVENTS.SHOW_TOAST, this.showToast, this);
    eventBus.on(EVENTS.QUEST_CHANGED, this.refreshQuest, this);
    eventBus.on(EVENTS.MONEY_CHANGED, this.refreshProfile, this);

    // 场景关闭时必须解除全局监听，避免重新进入游戏后一次事件触发多次。
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventBus.off(EVENTS.TIME_CHANGED, this.refreshTime, this);
      eventBus.off(EVENTS.PLAYER_ZONE_CHANGED, this.showZone, this);
      eventBus.off(EVENTS.SHOW_TOAST, this.showToast, this);
      eventBus.off(EVENTS.QUEST_CHANGED, this.refreshQuest, this);
      eventBus.off(EVENTS.MONEY_CHANGED, this.refreshProfile, this);
    });
  }

  getHudStyle(fontSize, bold = false) {
    return {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: bold ? 'bold' : 'normal',
      color: '#ffffff',
    };
  }

  refreshProfile() {
    const player = gameStore.state.player;
    this.playerText.setText(`${player.name} · ${player.identity}`);
    this.moneyText.setText(`金钱：${player.money}`);
  }

  refreshTime(time) {
    const minute = String(time.minute).padStart(2, '0');
    let period = '白天';
    if (time.hour < 6) period = '深夜';
    else if (time.hour < 9) period = '早晨';
    else if (time.hour >= 18 && time.hour < 21) period = '傍晚';
    else if (time.hour >= 21) period = '夜晚';
    this.timeText.setText(`第 ${time.day} 天　${String(time.hour).padStart(2, '0')}:${minute}　${period}`);
  }

  refreshQuest() {
    const tutorial = gameStore.state.quests.tutorial;
    // 完成态使用产品文案原句，避免再显示已经结束的“教学主线”前缀。
    if (tutorial.status === 'completed') {
      this.questText.setText('教学完成，自由探索城市。');
      return;
    }
    this.questText.setText(`教学主线：${questSystem.getObjective()}`);
  }

  showZone(zoneName) {
    this.zoneText.setText(zoneName);
    this.tweens.add({
      targets: this.zoneText,
      scaleX: { from: 1.12, to: 1 },
      scaleY: { from: 1.12, to: 1 },
      duration: 250,
    });
  }

  showToast(message) {
    if (this.toastTween) this.toastTween.stop();
    this.toastText.setText(message).setAlpha(1);
    this.toastTween = this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 2200,
      duration: 450,
    });
  }
}
