# 城市新生活

《城市新生活》是一款基于 HTML、JavaScript 和 Phaser 3 制作的现代城市卡通风格探索游戏。

当前是第二阶段 AI NPC V1 原型：保留稳定城市玩法，并为三名 NPC 增加 AI 自由聊天和极简记忆。

## 当前已经实现

- 启动场景、资源加载场景和主菜单场景。
- 新游戏与浏览器本地自动存档。
- 精简角色创建：只选择姓名和身份，身份决定初始金钱。
- 一张可以连续移动的大型城市地图。
- 玩家住宅、城市街道、公园和小游戏场所。
- `WASD` 与方向键移动、镜头跟随和建筑碰撞。
- 游戏日期及时钟，现实 1 秒对应游戏 1 分钟。
- 独立 HUD 信息层和暂停场景。
- 小林、陈叔、小雨 3 名拥有固定日程的 NPC，任务对白固定，普通聊天支持 AI/Mock。
- “搬入城市的第一天”完整教学主线和 HUD 目标追踪。
- 公园遗失物收集、包裹配送和 3 名核心 NPC 的好感度记录。
- 玩家住宅、社区中心、街边商店和接物挑战馆室内场景。
- 可通关的接物挑战小游戏，成功后获得金钱奖励。
- `E` 键互动、`I` 键查看背包内容和 `Esc` 暂停。

## 第一次运行

请先确认电脑已经安装 Node.js，然后在本项目文件夹打开终端。

第一步，只需安装一次依赖：

```bash
npm install
```

第二步，每次开发游戏时运行：

```bash
npm run dev
```

终端会显示一个类似 `http://localhost:5173/` 的地址。按住 `Ctrl` 点击该地址，或将它复制到 Chrome、Edge 等现代浏览器中。

不要直接双击 `index.html`，因为浏览器的安全规则会阻止 JavaScript 模块通过 `file://` 方式正常加载。

## 游戏操作

| 按键 | 当前作用 |
| --- | --- |
| `WASD` / 方向键 | 移动角色 |
| `E` | 与当前位置互动 |
| `I` | 查看当前背包物品 |
| `Esc` | 暂停或继续游戏 |
| 鼠标左键 | 点击菜单按钮 |

## 生成网页发布版本

运行：

```bash
npm run build
```

成功后会生成 `dist` 文件夹。这个文件夹就是可以部署到静态网页服务器的最终网页版本。

若想在本机预览刚打包的版本，可以运行：

```bash
npm run preview
```

## 零基础常用修改位置

- 修改游戏标题：`index.html` 和 `src/scenes/MainMenuScene.js`。
- 修改设计分辨率：`src/config/constants.js` 中的 `GAME_WIDTH`、`GAME_HEIGHT`。
- 修改城市大小：`src/config/constants.js` 中的 `WORLD_WIDTH`、`WORLD_HEIGHT`。
- 修改走路速度：`src/config/constants.js` 中的 `PLAYER_SPEED`。
- 修改时间速度：`src/config/constants.js` 中的 `GAME_MINUTES_PER_REAL_SECOND`。
- 修改角色身份和初始金钱：`src/scenes/CharacterCreationScene.js` 与 `src/core/GameStore.js`。
- 修改第一版地图布局：`src/systems/CityMapBuilder.js`。

修改后保存文件，开发服务器会自动刷新浏览器，不必重复执行 `npm run dev`。

## 核心模块关系

```text
main.js
  └─ 创建 Phaser.Game
      └─ BootScene → PreloadScene → MainMenuScene
                                  ├─ CharacterCreationScene
                                  └─ GameScene
                                      ├─ Player
                                      ├─ CityMapBuilder
                                      ├─ TimeSystem
                                      ├─ NPCScheduleSystem
                                      ├─ QuestSystem
                                      ├─ HUDScene
                                      ├─ InteriorScene
                                      ├─ CatchGameScene
                                      └─ PauseScene

GameStore      保存当前游戏的全局数据
EventBus       在互不依赖的模块之间传递消息
SaveManager    将 GameStore 写入浏览器本地存储
```

## 开发约定

1. 场景负责流程组织，不把所有功能都塞入 `GameScene`。
2. 玩家、NPC 和物品放入 `entities`，可复用能力放入 `components`。
3. 时间、任务和 NPC 日程等整体规则放入 `systems`。
4. 可调整数值逐步转移到 `public/assets/data/configs` 的 JSON 配置表。
5. 全局模块通过 `EventBus` 通信，避免相互直接修改内部对象。
6. 每项新功能继续遵循“先讲设计思路，再写中文注释代码，最后说明修改方式”。

## AI NPC V1

普通 NPC 互动现在支持“玩家输入一句话 → NPC 异步回复”，任务关键对白仍由 `QuestSystem` 固定控制。每名 NPC 的最近 5 轮交流保存在浏览器自动存档中。

AI 模块关系：

```text
DialogueScene
  └─ NPCBrain（组织 NPC、玩家、时间、关系与记忆上下文）
      ├─ NPCMemory（读取并保存最近 5 轮交流）
      └─ LLMGateway（Mock 或请求 /api/ai/chat）
          └─ server/aiServer.js（服务端读取密钥并调用 LLM）
```

### Mock 模式

默认就是 Mock 模式，不需要 API Key 或后端：

```bash
npm run dev
```

三名 NPC 会通过与真实模式相同的异步接口返回测试文字，可用于验证输入 UI、多轮交流、记忆和存档。

### 真实 AI 模式

前端复制 `.env.example` 为 `.env.local`，只把模式改为：

```text
VITE_AI_MODE=live
```

不要在任何 `VITE_` 变量中填写 API Key。复制本地服务端配置文件：

```powershell
Copy-Item .env.server.example .env.server
notepad .env.server
```

在 `.env.server` 中填写：

```text
OPENAI_API_KEY=你的服务端密钥
OPENAI_BASE_URL=https://你的服务商地址/v1
OPENAI_MODEL=你测试成功的模型 ID
OPENAI_API_MODE=chat_completions
```

参数填写说明：

- `OPENAI_API_KEY`：大模型服务商签发的服务端 API Key，例如 `sk-...`。不要填写到任何 `VITE_` 环境变量中。
- `OPENAI_BASE_URL`：只填写版本根地址，不要包含 `/chat/completions` 或 `/responses`。
- `OPENAI_MODEL`：当前 API Key 有权限调用的模型 ID，例如 `gpt-5-mini`。如果使用兼容服务商，请填写该服务商提供的实际模型 ID。
- `OPENAI_API_MODE`：你的测试代码使用 `/chat/completions`，因此填写 `chat_completions`；只有服务商明确支持 Responses API 时才填写 `responses`。

`npm run ai:server` 会自动读取项目根目录的 `.env.server`。该文件已被 Git 忽略，不会进入前端构建或上传到仓库。

之后日常开发只需在项目根目录执行一个命令：

```bash
npm run dev
```

该命令会同时启动 AI Endpoint 和 Vite；按一次 `Ctrl+C` 会一起关闭两个服务。`npm run ai:server` 仅保留用于单独排查后端。

Vite 会把 `/api/ai/chat` 代理到 `http://127.0.0.1:8787`。生产部署时，服务器也必须提供相同的 `POST /api/ai/chat` 契约，并只返回：

```json
{
  "reply": "NPC 的纯文本回复"
}
```

服务端同时支持 [OpenAI Chat Completions](https://developers.openai.com/api/reference/cli/resources/chat/subresources/completions) 和 [OpenAI Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)。真实 `OPENAI_API_KEY` 只存在 `.env.server` 或服务器环境中，不会进入 `src/`、Vite 构建产物或 Git。

## AI NPC 自主行为 V1

三名 NPC 每 45 个游戏分钟从 `work/home/wander/park/shop/rest` 中选择下一项行为。小林、陈叔、小雨分别错峰 0、15、30 分钟，且同一时间最多只有一个行为请求。AI 只返回语义动作，本地 `locationConfig.js` 将动作映射到安全坐标；非法 JSON、未知动作、超时或网络错误都会回退到固定日程。教学关键 NPC 的任务位置始终优先于 AI 决策。
