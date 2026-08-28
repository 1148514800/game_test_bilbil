const browserEnv = import.meta.env ?? {};

const MOCK_REPLIES = Object.freeze({
  neighbor: '这是小林的 Mock 回复。',
  parkKeeper: '这是陈叔的 Mock 回复。',
  shopClerk: '这是小雨的 Mock 回复。',
});

const MOCK_BEHAVIOR_CYCLES = Object.freeze({
  neighbor: ['wander', 'park', 'home'],
  parkKeeper: ['work', 'rest', 'work'],
  shopClerk: ['shop', 'rest', 'home'],
});

/** 读取正整数配置，配置缺失或无效时回到安全默认值。 */
function readPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * 前端 LLM 网关只负责统一异步接口、HTTP、超时和返回值校验。
 * 它不知道 NPC 人设，也永远不接收或保存任何 Provider API Key。
 */
export class LLMGateway {
  constructor(options = {}) {
    this.mode = String(options.mode ?? browserEnv.VITE_AI_MODE ?? 'mock').toLowerCase();
    this.endpoint = options.endpoint ?? browserEnv.VITE_AI_ENDPOINT ?? '/api/ai/chat';
    this.timeoutMs = readPositiveNumber(
      options.timeoutMs ?? browserEnv.VITE_AI_TIMEOUT_MS,
      12_000,
    );
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  }

  async chat(messages, context = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('AI 请求缺少 messages。');
    }

    if (this.mode === 'mock') {
      // 保留短暂异步等待，用同一套 UI 验证“思考中”和防重复发送逻辑。
      await new Promise((resolve) => setTimeout(resolve, 280));
      return MOCK_REPLIES[context.npcId] ?? `这是${context.npcName ?? 'NPC'}的 Mock 回复。`;
    }

    if (!this.fetchImpl) throw new Error('当前环境不支持 fetch。');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`AI Endpoint 返回 HTTP ${response.status}。`);

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error('AI Endpoint 返回的不是合法 JSON。');
      }

      const reply = typeof payload?.reply === 'string' ? payload.reply.trim() : '';
      if (!reply) throw new Error('AI Endpoint 没有返回有效 reply。');
      return reply;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('AI 请求超时。');
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Mock 与 Live 共用同一行为文本接口，严格 JSON 解析由 NPCBrain 统一完成。 */
  async decideBehavior(messages, context = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('AI 行为请求缺少 messages。');
    }
    if (this.mode !== 'mock') return this.chat(messages, context);

    await new Promise((resolve) => setTimeout(resolve, 280));
    const cycle = MOCK_BEHAVIOR_CYCLES[context.npcId] ?? ['rest'];
    const currentIndex = cycle.indexOf(context.currentAction);
    const action = cycle[currentIndex < 0 ? 0 : (currentIndex + 1) % cycle.length];
    return JSON.stringify({
      action,
      reason: `${context.npcName ?? 'NPC'}根据当前时间选择了下一项日常活动。`,
    });
  }
}

export const llmGateway = new LLMGateway();
