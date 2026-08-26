import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig.js';
import './styles/main.css';

/**
 * 创建全局唯一的 Phaser.Game 实例。
 * 其他功能都由场景和模块负责，入口文件保持简单，方便排查启动问题。
 */
const game = new Phaser.Game(gameConfig);

// 仅供浏览器开发者工具调试使用，正常游戏代码不要依赖 window.game。
window.game = game;
