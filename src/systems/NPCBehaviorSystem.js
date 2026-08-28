import { gameStore } from '../core/GameStore.js';
import { npcBrain } from '../ai/NPCBrain.js';
import {
  NPC_AI_DECISION_INTERVAL_MINUTES,
  NPC_AI_DECISION_OFFSETS,
  chooseSafeWanderDestination,
  buildSafeRoute,
  getAbsoluteGameMinutes,
  getBehaviorDestination,
  getBehaviorStatusText,
  getNearestLocationName,
  isAllowedNpcBehavior,
} from '../config/locationConfig.js';

const IS_DEVELOPMENT = import.meta.env?.DEV ?? false;

/**
 * AI 只决定语义动作，本系统负责安全坐标、移动状态、错峰、任务优先级与日程兜底。
 */
export class NPCBehaviorSystem {
  constructor(scene, scheduleSystem, questSystem, options = {}) {
    this.scene = scene;
    this.scheduleSystem = scheduleSystem;
    this.questSystem = questSystem;
    this.brain = options.brain ?? npcBrain;
    this.decisionIntervalMinutes = options.decisionIntervalMinutes
      ?? NPC_AI_DECISION_INTERVAL_MINUTES;
    this.requestInFlight = false;
    this.destroyed = false;
    this.states = new Map();

    const now = getAbsoluteGameMinutes(gameStore.state.time);
    this.scheduleSystem.npcs.forEach((npc) => {
      const savedAction = gameStore.state.npcBehaviorStates[npc.profile.id]?.action;
      const scheduleAction = this.scheduleSystem.getScheduleAction(npc.profile);
      const action = isAllowedNpcBehavior(savedAction) ? savedAction : scheduleAction;
      const state = {
        action,
        source: 'restored',
        phase: 'moving',
        currentLocation: getNearestLocationName(npc.profile, npc.x, npc.y),
        targetLocation: null,
        nextDecisionAt: now + (NPC_AI_DECISION_OFFSETS[npc.profile.id] ?? 0),
      };
      this.states.set(npc.profile.id, state);

      const lockAction = this.questSystem.getNpcBehaviorLock(npc.profile.id);
      if (lockAction) this.applyAction(npc, state, lockAction, 'quest');
      else this.applyAction(npc, state, action, 'restored');
    });
  }

  update(delta) {
    if (this.destroyed) return;
    const now = getAbsoluteGameMinutes(gameStore.state.time);

    this.scheduleSystem.npcs.forEach((npc) => {
      const state = this.states.get(npc.profile.id);
      const locked = this.enforceQuestPriority(npc, state, now);
      if (!locked && state.source === 'fallback') this.applyScheduleFallback(npc, state);

      npc.update(delta);
      state.phase = npc.hasReachedTarget() ? 'arrived' : 'moving';
      state.currentLocation = getNearestLocationName(npc.profile, npc.x, npc.y);
      npc.setBehaviorStatus(getBehaviorStatusText(state.action, state.phase === 'arrived'));
    });

    if (this.requestInFlight) return;
    const dueNpc = this.scheduleSystem.npcs.find((npc) => {
      const state = this.states.get(npc.profile.id);
      return !this.questSystem.getNpcBehaviorLock(npc.profile.id)
        && now >= state.nextDecisionAt;
    });
    if (!dueNpc) return;

    const state = this.states.get(dueNpc.profile.id);
    state.nextDecisionAt = now + this.decisionIntervalMinutes;
    void this.requestDecision(dueNpc, state);
  }

  enforceQuestPriority(npc, state, now) {
    const lockAction = this.questSystem.getNpcBehaviorLock(npc.profile.id);
    if (lockAction) {
      if (state.source !== 'quest' || state.action !== lockAction) {
        this.applyAction(npc, state, lockAction, 'quest');
      }
      return true;
    }

    if (state.source === 'quest') {
      this.applyScheduleFallback(npc, state);
      state.nextDecisionAt = now;
    }
    return false;
  }

  async requestDecision(npc, state) {
    this.requestInFlight = true;
    try {
      const decision = await this.brain.decideBehavior(npc.profile.id, {
        currentLocation: state.currentLocation,
        currentBehavior: state.action,
      });
      if (this.destroyed || !this.scene.sys.isActive()) return;

      // 请求期间任务可能刚好推进；任务锁仍然拥有最高优先级。
      if (this.questSystem.getNpcBehaviorLock(npc.profile.id)) return;
      this.applyAction(npc, state, decision.action, 'ai');
      if (IS_DEVELOPMENT) {
        console.info(`[AI Behavior]\nNPC: ${npc.profile.name}\nAction: ${decision.action}\nReason: ${decision.reason}`);
      }
    } catch (error) {
      if (!this.destroyed && this.scene.sys.isActive()) {
        if (!this.questSystem.getNpcBehaviorLock(npc.profile.id)) {
          this.applyScheduleFallback(npc, state);
        }
        if (IS_DEVELOPMENT) {
          console.warn(`[AI Behavior Fallback]\nNPC: ${npc.profile.name}\nReason: ${error?.message ?? error}\nUse schedule fallback`);
        }
      }
    } finally {
      this.requestInFlight = false;
    }
  }

  applyAction(npc, state, action, source) {
    if (!isAllowedNpcBehavior(action)) throw new Error(`不允许的 NPC 行为：${action}`);

    let destination;
    if (action === 'rest') {
      destination = { id: 'rest', name: state.currentLocation, x: npc.x, y: npc.y };
    } else if (action === 'wander') {
      destination = chooseSafeWanderDestination(npc.profile, npc.x, npc.y);
    } else {
      destination = getBehaviorDestination(npc.profile, action);
    }
    if (!destination) throw new Error(`行为 ${action} 没有可用的安全目标点。`);

    const route = action === 'rest' || action === 'wander'
      ? [{ x: destination.x, y: destination.y }]
      : buildSafeRoute(npc.profile, npc.x, npc.y, destination);
    npc.setRoute(route);
    state.action = action;
    state.source = source;
    state.targetLocation = destination.name;
    state.phase = npc.hasReachedTarget() ? 'arrived' : 'moving';
    gameStore.setNpcBehaviorAction(npc.profile.id, action);
    npc.setBehaviorStatus(getBehaviorStatusText(action, state.phase === 'arrived'));
  }

  applyScheduleFallback(npc, state) {
    const schedule = this.scheduleSystem.getTarget(npc.profile);
    const targetChanged = npc.destination.x !== schedule.x || npc.destination.y !== schedule.y;
    if (state.source !== 'fallback' || state.action !== schedule.action || targetChanged) {
      this.applyAction(npc, state, schedule.action, 'fallback');
    }
  }

  destroy() {
    this.destroyed = true;
  }
}
