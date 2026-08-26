import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { gameStore } from '../core/GameStore.js';
import { saveManager } from '../core/SaveManager.js';
import { TextButton } from '../ui/components/TextButton.js';

const IDENTITIES = ['自由职业者', '学生', '城市职员'];

/** 玩家第一次进入游戏时使用的精简角色创建页面。 */
export class CharacterCreationScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.CHARACTER_CREATION);
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0xdff4f2);
    this.createTitle('创建你的城市居民', 78);
    this.createPanel(640, 380, 760, 520);

    // 玩家外观已经统一为正式 Sprite，此处只保存真正影响游戏的数据。
    this.selection = { identityIndex: 0 };

    this.add.text(640, 175, '姓名', this.getLabelStyle()).setOrigin(0.5);
    this.nameInput = this.add.dom(640, 225).createFromHTML(
      '<input class="character-name-input" maxlength="10" value="新居民" aria-label="角色姓名" />',
    );

    this.add.text(640, 310, '身份（决定初始金钱）', this.getLabelStyle()).setOrigin(0.5);
    this.identityText = this.add.text(640, 375, '', this.getValueStyle()).setOrigin(0.5);
    this.createCycleButtons(640, 375, () => this.cycleIdentity(-1), () => this.cycleIdentity(1), 230);
    this.updateIdentityText();

    new TextButton(this, 455, 585, '返回主菜单', () => {
      this.scene.start(SCENE_KEYS.MAIN_MENU);
    }, { width: 250, color: 0x647b7a });

    new TextButton(this, 825, 585, '进入城市', () => this.confirmCharacter(), {
      width: 250,
      color: 0xe98a4a,
      hoverColor: 0xf2a65a,
    });
  }

  getLabelStyle() {
    return {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '23px',
      fontStyle: 'bold',
      color: '#315d5b',
    };
  }

  getValueStyle() {
    return {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#244342',
      backgroundColor: '#e8f6f5',
      padding: { x: 18, y: 8 },
    };
  }

  /** 为身份选择创建左右箭头按钮。 */
  createCycleButtons(centerX, y, onPrevious, onNext, distance = 150) {
    new TextButton(this, centerX - distance, y, '‹', onPrevious, {
      width: 52,
      height: 48,
      fontSize: 32,
    });
    new TextButton(this, centerX + distance, y, '›', onNext, {
      width: 52,
      height: 48,
      fontSize: 32,
    });
  }

  cycleIdentity(direction) {
    const count = IDENTITIES.length;
    this.selection.identityIndex = (this.selection.identityIndex + direction + count) % count;
    this.updateIdentityText();
  }

  updateIdentityText() {
    const identity = IDENTITIES[this.selection.identityIndex];
    const moneyDescription = {
      自由职业者: '初始金钱 200',
      学生: '初始金钱 120',
      城市职员: '初始金钱 300',
    }[identity];
    this.identityText.setText(`${identity}\n${moneyDescription}`).setAlign('center');
  }

  confirmCharacter() {
    const inputElement = this.nameInput.getChildByName('');
    const fallbackInput = this.nameInput.node.querySelector('input');
    const name = (inputElement?.value ?? fallbackInput?.value ?? '').trim();

    if (!name) {
      // 使用浏览器输入框时，直接聚焦最容易让零基础玩家理解哪里需要填写。
      fallbackInput?.focus();
      fallbackInput?.setAttribute('placeholder', '请先输入姓名');
      return;
    }

    gameStore.setCharacter({
      name: name.slice(0, 10),
      identity: IDENTITIES[this.selection.identityIndex],
    });
    saveManager.save();
    this.scene.start(SCENE_KEYS.GAME);
  }
}
