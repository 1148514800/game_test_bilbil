import { BaseScene } from './base/BaseScene.js';
import { SCENE_KEYS } from '../config/sceneKeys.js';
import { gameStore } from '../core/GameStore.js';
import { saveManager } from '../core/SaveManager.js';
import { TextButton } from '../ui/components/TextButton.js';
import { AvatarView, AVATAR_OPTION_COUNTS } from '../ui/components/AvatarView.js';

const IDENTITIES = ['自由职业者', '学生', '城市职员'];

/** 玩家第一次进入游戏时使用的角色创建页面。 */
export class CharacterCreationScene extends BaseScene {
  constructor() {
    super(SCENE_KEYS.CHARACTER_CREATION);
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0xdff4f2);
    this.createTitle('创建你的城市居民', 62);
    this.createPanel(640, 390, 1040, 570);

    this.selection = {
      identityIndex: 0,
      appearance: {
        skinIndex: 0,
        hairIndex: 0,
        hairColorIndex: 0,
        clothesColorIndex: 0,
      },
    };

    this.add.text(345, 145, '姓名', this.getLabelStyle()).setOrigin(0.5);
    this.nameInput = this.add.dom(345, 195).createFromHTML(
      '<input class="character-name-input" maxlength="10" value="新居民" aria-label="角色姓名" />',
    );

    this.add.text(345, 260, '身份（决定初始金钱）', this.getLabelStyle()).setOrigin(0.5);
    this.identityText = this.add.text(345, 308, '', this.getValueStyle()).setOrigin(0.5);
    this.createCycleButtons(345, 308, () => this.cycleIdentity(-1), () => this.cycleIdentity(1), 220);

    this.add.text(860, 145, '外观预览', this.getLabelStyle()).setOrigin(0.5);
    this.avatar = new AvatarView(this, 860, 280, this.selection.appearance, 2.4);

    this.addAppearanceRow('肤色', 455, 'skinIndex', AVATAR_OPTION_COUNTS.skin);
    this.addAppearanceRow('发型', 505, 'hairIndex', AVATAR_OPTION_COUNTS.hair);
    this.addAppearanceRow('发色', 555, 'hairColorIndex', AVATAR_OPTION_COUNTS.hairColor);
    this.addAppearanceRow('服装颜色', 605, 'clothesColorIndex', AVATAR_OPTION_COUNTS.clothesColor);

    this.updateIdentityText();

    new TextButton(this, 430, 665, '返回主菜单', () => {
      this.scene.start(SCENE_KEYS.MAIN_MENU);
    }, { width: 250, color: 0x647b7a });

    new TextButton(this, 850, 665, '进入城市', () => this.confirmCharacter(), {
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

  /** 为可循环选择的内容创建左右箭头按钮。 */
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

  addAppearanceRow(label, y, property, optionCount) {
    this.add.text(690, y, label, this.getLabelStyle()).setOrigin(0, 0.5);
    const valueText = this.add.text(925, y, '样式 1', this.getValueStyle()).setOrigin(0.5);

    const changeValue = (direction) => {
      const oldValue = this.selection.appearance[property];
      this.selection.appearance[property] = (oldValue + direction + optionCount) % optionCount;
      valueText.setText(`样式 ${this.selection.appearance[property] + 1}`);
      this.avatar.refreshAppearance(this.selection.appearance);
    };

    this.createCycleButtons(925, y, () => changeValue(-1), () => changeValue(1), 115);
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
      appearance: { ...this.selection.appearance },
    });
    saveManager.save();
    this.scene.start(SCENE_KEYS.GAME);
  }
}
