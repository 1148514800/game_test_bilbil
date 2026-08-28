import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// 本地密钥只由 Node 服务端读取；.env.server 已在 .gitignore 中排除，不会进入 Vite 前端。
const SERVER_ENV_PATH = resolve(process.cwd(), '.env.server');
if (existsSync(SERVER_ENV_PATH)) process.loadEnvFile(SERVER_ENV_PATH);

const PORT = Number(process.env.AI_SERVER_PORT ?? 8787);
// 大模型地址必须由服务端显式配置，避免部署时误连到错误的供应商或环境。
// 这里只填写版本根地址（例如 https://api.openai.com/v1），不要包含具体接口路径。
const OPENAI_BASE_URL = String(process.env.OPENAI_BASE_URL ?? '').replace(/\/+$/, '');
const OPENAI_API_MODE = String(process.env.OPENAI_API_MODE ?? 'chat_completions').trim().toLowerCase();
const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 10_000);
const MAX_BODY_BYTES = 32 * 1024;
const allowedOrigins = new Set(
  (process.env.AI_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function applyCors(request, response) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let rejected = false;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      if (rejected) return;
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
        rejected = true;
        reject(new Error('请求体过大。'));
        request.destroy();
      }
    });
    request.on('end', () => {
      if (rejected) return;
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('请求体不是合法 JSON。'));
      }
    });
    request.on('error', reject);
  });
}

/** 后端再次约束输入，只接受纯文本对话消息，不接受任何游戏动作或工具定义。 */
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) return null;

  const normalized = messages.map((message) => ({
    role: message?.role,
    content: typeof message?.content === 'string' ? message.content.trim() : '',
  }));
  const validRoles = new Set(['system', 'user', 'assistant']);
  const isValid = normalized.every((message) => (
    validRoles.has(message.role)
    && message.content.length > 0
    && message.content.length <= 6_000
  ));
  return isValid ? normalized : null;
}

function extractReply(responsePayload) {
  const chatContent = responsePayload?.choices?.[0]?.message?.content;
  if (typeof chatContent === 'string' && chatContent.trim()) return chatContent.trim();

  if (typeof responsePayload?.output_text === 'string' && responsePayload.output_text.trim()) {
    return responsePayload.output_text.trim();
  }

  for (const outputItem of responsePayload?.output ?? []) {
    for (const contentItem of outputItem?.content ?? []) {
      if (contentItem?.type === 'output_text' && typeof contentItem.text === 'string') {
        const text = contentItem.text.trim();
        if (text) return text;
      }
    }
  }
  return '';
}

async function requestOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model || !OPENAI_BASE_URL) {
    throw new Error('服务器缺少 OPENAI_API_KEY、OPENAI_BASE_URL 或 OPENAI_MODEL。');
  }

  // 提前校验地址，给部署配置错误一个清晰提示，而不是返回难以定位的 fetch 异常。
  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(OPENAI_BASE_URL);
  } catch {
    throw new Error('OPENAI_BASE_URL 不是合法 URL。');
  }

  if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) {
    throw new Error('OPENAI_BASE_URL 仅支持 http 或 https 协议。');
  }

  if (!['chat_completions', 'responses'].includes(OPENAI_API_MODE)) {
    throw new Error('OPENAI_API_MODE 仅支持 chat_completions 或 responses。');
  }

  const instructions = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const input = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({ role: message.role, content: message.content }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // 第三方 OpenAI 兼容服务通常只实现 Chat Completions；官方接口也可切换为 Responses。
    const usesChatCompletions = OPENAI_API_MODE === 'chat_completions';
    const endpoint = usesChatCompletions ? '/chat/completions' : '/responses';
    const requestBody = usesChatCompletions
      ? { model, messages, max_tokens: 180 }
      : { model, instructions, input, max_output_tokens: 180, store: false };
    const upstream = await fetch(OPENAI_BASE_URL + endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) throw new Error('上游模型返回 HTTP ' + upstream.status + '。');

    const reply = extractReply(payload);
    if (!reply) throw new Error('上游模型返回了空文本。');
    return reply;
  } finally {
    clearTimeout(timeoutId);
  }
}

const server = createServer(async (request, response) => {
  applyCors(request, response);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true });
    return;
  }
  if (request.method !== 'POST' || request.url !== '/api/ai/chat') {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  try {
    const body = await readRequestBody(request);
    const messages = validateMessages(body?.messages);
    if (!messages) {
      sendJson(response, 400, { error: 'messages 格式无效。' });
      return;
    }

    const reply = await requestOpenAI(messages);
    // 前端只接收语言文本，Provider 的其他字段不会进入游戏。
    sendJson(response, 200, { reply });
  } catch (error) {
    console.error('AI Endpoint 请求失败：', error);
    sendJson(response, 502, { error: 'AI 服务暂时不可用。' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('AI Endpoint 已启动：http://127.0.0.1:' + PORT + '/api/ai/chat');
});
