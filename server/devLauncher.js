import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const children = new Set();
let isStopping = false;

/**
 * 使用同一个 Node 父进程启动 AI 后端与 Vite，避免开发时手动维护两个终端。
 * 子进程继承当前终端输出，因此原有报错信息仍可直接查看。
 */
function startChild(name, scriptPath, args = []) {
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.add(child);

  child.once('error', (error) => {
    console.error(`${name} 启动失败：`, error);
  });
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (isStopping) return;

    const reason = signal ? `信号 ${signal}` : `退出码 ${code ?? 1}`;
    console.error(`${name} 已意外停止（${reason}），正在关闭其他开发服务。`);
    stopAll(code ?? 1);
  });
}

/** Ctrl+C 或任一服务退出时，同时清理两个子进程，避免残留端口。 */
function stopAll(exitCode = 0) {
  if (isStopping) return;
  isStopping = true;

  const activeChildren = [...children].filter((child) => child.exitCode === null);
  if (activeChildren.length === 0) {
    process.exit(exitCode);
    return;
  }

  let remaining = activeChildren.length;
  const fallbackTimer = setTimeout(() => process.exit(exitCode), 2_000);
  activeChildren.forEach((child) => {
    child.once('exit', () => {
      remaining -= 1;
      if (remaining === 0) {
        clearTimeout(fallbackTimer);
        process.exit(exitCode);
      }
    });
    child.kill();
  });
}

console.log('正在启动 AI Endpoint 与 Vite 开发服务器……');
startChild('AI Endpoint', resolve('server/aiServer.js'));
startChild('Vite', resolve('node_modules/vite/bin/vite.js'), ['--host', '0.0.0.0']);

process.once('SIGINT', () => stopAll(0));
process.once('SIGTERM', () => stopAll(0));
