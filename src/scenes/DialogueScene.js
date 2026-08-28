import Phaser from 'phaser';
import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { getNpcProfile } from '../config/npcProfiles.js';
import { npcBrain } from '../ai/NPCBrain.js';
import { TextButton } from '../ui/components/TextButton.js';

/**
 * 通用对话覆盖场景。
 * scripted 模式只播放 QuestSystem 固定文本；ai 模式只负责自由输入和显示 NPC 回复。
 */
export class DialogueScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.DIALOGUE);
  }

  init(data) {
    this.mode = data.mode ?? 'scripted';
    this.npcId = data.npcId ?? null;
    this.speaker = data.speaker ?? '居民';
    this.lines = data.lines ?? ['……'];
    this.onComplete = data.onComplete ?? null;
    this.originScene = data.originScene ?? SCENE_KEYS.GAME;
    this.lineIndex = 0;
    this.busy = false;
  }

  create() {
    if (this.mode === 'ai') this.createAiDialogue();
    else this.createScriptedDialogue();
  }

  createScriptedDialogue() {
    this.advancing = false;

    // 整个屏幕都是“继续”区域，任务剧情不会因为按钮点击不准而卡住。
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.nextLine());

    this.add.rectangle(640, 595, 1160, 205, 0x173d3c, 0.96)
      .setStrokeStyle(5, 0xffffff, 0.9);
    this.add.text(105, 515, this.speaker, {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '27px', fontStyle: 'bold', color: '#f4ce5e',
    });
    this.contentText = this.add.text(105, 565, this.lines[0], {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '24px', color: '#ffffff',
      wordWrap: { width: 1010 }, lineSpacing: 8,
    });
    this.add.rectangle(1080, 665, 210, 52, 0xf2a65a).setStrokeStyle(3, 0xffffff);
    this.continueText = this.add.text(1080, 665, '继续 ▶', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '21px', fontStyle: 'bold', color: '#244342',
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.continueText, x: 1088, yoyo: true, repeat: -1, duration: 500 });

    this.add.text(105, 675, '任务剧情 · 点击任意位置 / E / 空格 / Enter 继续', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '16px', color: '#c7e4e2',
    }).setOrigin(0, 0.5);

    this.input.keyboard.on('keydown-E', () => this.nextLine());
    this.input.keyboard.on('keydown-SPACE', () => this.nextLine());
    this.input.keyboard.on('keydown-ENTER', () => this.nextLine());
  }

  createAiDialogue() {
    const profile = getNpcProfile(this.npcId);
    if (!profile) {
      this.scene.resume(this.originScene);
      this.scene.stop();
      return;
    }

    this.add.rectangle(640, 360, 1280, 720, 0x102525, 0.72);
    this.add.rectangle(640, 350, 1160, 630, 0x173d3c, 0.98)
      .setStrokeStyle(5, 0xffffff, 0.9);

    this.add.text(105, 62, this.speaker, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#f4ce5e',
    });
    this.add.text(105, 108, '普通聊天 · 最近 5 次交流会自动保存', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '17px',
      color: '#c7e4e2',
    });

    this.add.rectangle(640, 300, 1060, 300, 0x244b4a, 0.95)
      .setStrokeStyle(3, 0x7ac7c4, 0.8);
    this.replyText = this.add.text(140, 175, this.speaker + '：\n' + profile.greeting, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '25px',
      color: '#ffffff',
      // 中文回复通常没有英文空格，必须启用高级换行才能按字符稳定折行。
      wordWrap: { width: 960, useAdvancedWrap: true },
      lineSpacing: 10,
    });
    // 固定文本画布尺寸，防止异常长单词或第三方模型输出突破对话框边界。
    this.replyText.setFixedSize(990, 250);

    this.add.text(110, 485, '你想说：', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    this.inputDom = this.add.dom(470, 545).createFromHTML(
      '<input class="npc-dialogue-input" maxlength="120" autocomplete="off" aria-label="对 NPC 说的话" placeholder="输入一句话，按 Enter 或点击发送" />',
    );
    this.inputElement = this.inputDom.node.querySelector('input');

    this.sendButton = new TextButton(this, 945, 545, '发送', () => this.submitPlayerMessage(), {
      width: 180,
      height: 58,
      color: 0xe98a4a,
      hoverColor: 0xf2a65a,
      fontSize: 22,
    });
    new TextButton(this, 1050, 625, '结束对话', () => this.closeDialogue(), {
      width: 210,
      height: 54,
      color: 0x647b7a,
      fontSize: 21,
    });

    this.add.text(110, 650, 'AI 请求期间仍可结束对话 · Esc：结束', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#c7e4e2',
    }).setOrigin(0, 0.5);

    this.inputElement.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeDialogue();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        this.submitPlayerMessage();
      }
    });
    this.input.keyboard.once('keydown-ESC', () => this.closeDialogue());
    this.time.delayedCall(60, () => this.inputElement?.focus());
  }

  async submitPlayerMessage() {
    if (this.busy || !this.inputElement) return;

    const playerText = this.inputElement.value.trim().slice(0, 120);
    if (!playerText) {
      this.inputElement.focus();
      this.inputElement.placeholder = '请先输入一句话';
      return;
    }

    this.busy = true;
    this.inputElement.value = '';
    this.inputElement.disabled = true;
    this.sendButton.setEnabled(false);
    this.replyText.setText('你：' + playerText + '\n\n' + this.speaker + '正在思考……');
    this.thinkingTween = this.tweens.add({
      targets: this.replyText,
      alpha: { from: 0.55, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 480,
    });

    const reply = await npcBrain.chat(this.npcId, playerText);

    // 玩家可以在请求期间退出；请求回来后不能再触碰已经销毁的 UI。
    if (!this.sys.isActive()) return;
    this.thinkingTween?.stop();
    this.replyText.setAlpha(1).setText(
      '你：' + playerText + '\n\n' + this.speaker + '：\n' + reply,
    );
    this.busy = false;
    this.inputElement.disabled = false;
    this.sendButton.setEnabled(true);
    this.inputElement.focus();
  }

  nextLine() {
    if (this.mode !== 'scripted' || this.advancing) return;
    this.advancing = true;
    this.time.delayedCall(90, () => { this.advancing = false; });
    this.lineIndex += 1;
    if (this.lineIndex < this.lines.length) {
      this.contentText.setText(this.lines[this.lineIndex]);
      return;
    }
    this.onComplete?.();
    this.closeDialogue();
  }

  closeDialogue() {
    if (!this.scene.isActive()) return;
    this.scene.resume(this.originScene);
    this.scene.stop();
  }
}
