import { defineConfig } from 'vite';

/**
 * Vite 只是开发服务器和打包工具，不会改变“HTML + JavaScript + Phaser”的技术栈。
 * base 使用相对路径后，dist 文件夹可以部署到网站的任意子目录。
 */
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: false,
    // 开发时真实 AI 请求由 Vite 转发，浏览器不直接接触 Provider。
    proxy: {
      '/api/ai': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Phaser 本身就是较大的完整游戏引擎，单包约 1.2 MB 属于预期体积。
    // 将阈值调到 1.3 MB，后续若业务代码继续明显膨胀，Vite 仍会及时提醒我们拆包。
    chunkSizeWarningLimit: 1300,
  },
});
