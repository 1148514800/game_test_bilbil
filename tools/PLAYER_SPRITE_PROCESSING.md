# 玩家 Sprite 预处理说明

原始角色图保存在：

```text
source/assets/images/characters/player/
```

游戏运行时只加载标准化图集：

```text
public/assets/images/characters/player/player_idle_sheet.png
public/assets/images/characters/player/player_walk_sheet.png
```

## 重新生成

如果电脑尚未安装图像处理依赖，先运行：

```bash
python -m pip install -r tools/requirements-player-sprites.txt
```

然后在项目根目录运行：

```bash
python tools/process_player_sprites.py
```

脚本不会平均切割原图，而是先检测真实人物行列，再去除连通白底、统一人物高度、水平居中并对齐脚底。

最终尺寸记录在 `player_sheet_metadata.json`。如果将来生成尺寸发生变化，必须同步修改
`src/config/playerSpriteConfig.js`，否则 Phaser 会使用错误的帧尺寸切图。
