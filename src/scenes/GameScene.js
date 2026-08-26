import Phaser from 'phaser';
import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants.js';
import { EVENTS } from '../config/eventNames.js';
import { eventBus } from '../core/EventBus.js';
import { gameStore } from '../core/GameStore.js';
import { saveManager } from '../core/SaveManager.js';
import { Player } from '../entities/player/Player.js';
import { CityMapBuilder } from '../systems/CityMapBuilder.js';
import { TimeSystem } from '../systems/TimeSystem.js';
import { NPCScheduleSystem } from '../systems/NPCScheduleSystem.js';
import { questSystem } from '../systems/QuestSystem.js';

/** 游戏主场景负责组合地图、玩家和各个系统。 */
export class GameScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create() {
    const mapData = CityMapBuilder.build(this);
    const savedPosition = gameStore.state.player.position;

    this.player = new Player(
      this,
      savedPosition.x,
      savedPosition.y,
      gameStore.state.player.appearance,
    );
    this.physics.add.collider(this.player, mapData.obstacles);

    this.zones = mapData.zones;
    this.doors = mapData.doors;
    this.breaker = mapData.breaker;
    this.currentZoneName = '';
    this.timeSystem = new TimeSystem();
    this.npcScheduleSystem = new NPCScheduleSystem(this);
    this.questItems = [];
    this.refreshQuestItems();
    eventBus.on(EVENTS.QUEST_CHANGED, this.refreshQuestItems, this);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1);

    this.setupInput();

    // HUD 是独立场景，始终显示在游戏世界上方。
    this.scene.launch(SCENE_KEYS.HUD);

    // 每 10 秒记录一次位置，任务完成和睡觉等重要节点还会立即自动保存。
    this.autoSaveTimer = this.time.addEvent({
      delay: 10_000,
      loop: true,
      callback: () => this.saveCurrentProgress(),
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.saveCurrentProgress();
      eventBus.off(EVENTS.QUEST_CHANGED, this.refreshQuestItems, this);
      if (this.scene.isActive(SCENE_KEYS.HUD)) this.scene.stop(SCENE_KEYS.HUD);
    });
  }

  setupInput() {
    this.input.keyboard.on('keydown-ESC', () => {
      if (!this.scene.isActive(SCENE_KEYS.PAUSE)) {
        this.scene.launch(SCENE_KEYS.PAUSE, { originScene: SCENE_KEYS.GAME });
        this.scene.pause();
      }
    });

    this.input.keyboard.on('keydown-E', () => this.interact());

    this.input.keyboard.on('keydown-I', () => {
      const items = gameStore.state.inventory;
      const description = items.length
        ? items.map((item) => `${item.name} ×${item.quantity}`).join('　')
        : '背包目前是空的';
      eventBus.emit(EVENTS.SHOW_TOAST, `背包：${description}`);
    });
  }

  update(_time, delta) {
    this.player.update();
    this.timeSystem.update(delta);
    this.npcScheduleSystem.update(delta);
    this.updateCurrentZone();
  }

  /** E 键会自动选择玩家身边最近、最合理的互动对象。 */
  interact() {
    const nearestNpc = this.npcScheduleSystem.getNearest(this.player.x, this.player.y);
    if (nearestNpc) {
      const dialogue = questSystem.interactWithNpc(nearestNpc.profile.id);
      this.scene.launch(SCENE_KEYS.DIALOGUE, {
        speaker: nearestNpc.profile.name,
        lines: dialogue.lines,
        onComplete: dialogue.onComplete,
        originScene: SCENE_KEYS.GAME,
      });
      this.scene.pause();
      return;
    }

    const nearbyItem = this.questItems.find((item) => item.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) < 95);
    if (nearbyItem) {
      nearbyItem.destroy();
      questSystem.collectLostItem();
      eventBus.emit(EVENTS.SHOW_TOAST, '已拾取公园遗失物');
      return;
    }

    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.breaker.x, this.breaker.y) < 115) {
      if (questSystem.investigateBreaker()) eventBus.emit(EVENTS.SHOW_TOAST, '你合上了松动的电闸，场馆恢复供电！');
      else eventBus.emit(EVENTS.SHOW_TOAST, '配电箱目前工作正常。');
      return;
    }

    const door = this.doors.find((entry) => Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.x, entry.y) < 120);
    if (door) {
      this.scene.launch(SCENE_KEYS.INTERIOR, { roomId: door.id });
      this.scene.sleep();
      return;
    }

    eventBus.emit(EVENTS.SHOW_TOAST, '附近没有互动对象。靠近 NPC、物品或门再按 E。');
  }

  /** 任务要求收集时显示三个物品，已经拾取的不会因重新进场而复活。 */
  refreshQuestItems() {
    this.questItems.forEach((item) => item.destroy());
    this.questItems = [];
    if (questSystem.step !== 2) return;
    const alreadyCollected = gameStore.state.inventory.find((item) => item.id === 'lost-tool')?.quantity ?? 0;
    const positions = [[2290, 290], [2920, 500], [2440, 840]];
    positions.slice(alreadyCollected).forEach(([x, y]) => {
      const item = this.add.star(x, y, 5, 12, 26, 0xf4ce5e).setStrokeStyle(5, 0xffffff);
      this.questItems.push(item);
      this.tweens.add({ targets: item, scale: 1.18, yoyo: true, repeat: -1, duration: 600 });
    });
  }

  /** 根据玩家坐标判断所在区域；不在特殊区域时统一显示“城市街道”。 */
  updateCurrentZone() {
    const matchedZone = this.zones.find((zone) => Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(zone.x, zone.y, zone.width, zone.height),
      this.player.x,
      this.player.y,
    ));
    const nextZoneName = matchedZone?.name ?? '城市街道';

    if (nextZoneName !== this.currentZoneName) {
      this.currentZoneName = nextZoneName;
      eventBus.emit(EVENTS.PLAYER_ZONE_CHANGED, nextZoneName);
    }
  }

  saveCurrentProgress() {
    if (!this.player) return;
    gameStore.setPlayerPosition(this.player.x, this.player.y);
    saveManager.save();
  }
}
