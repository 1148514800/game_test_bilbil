# 游戏资源放置说明

当前原型使用 Phaser 几何图形绘制临时素材，因此这里暂时没有正式图片和声音。

后续资源按以下目录分类，不要把所有文件混放在一起：

```text
assets/
├─ images/
│  ├─ backgrounds/
│  ├─ characters/
│  ├─ items/
│  ├─ tilesets/
│  └─ ui/
├─ atlases/
├─ animations/
├─ audio/
│  ├─ music/
│  ├─ sfx/
│  └─ voice/
├─ fonts/
├─ shaders/
└─ data/
   ├─ configs/
   ├─ levels/
   ├─ maps/
   ├─ dialogues/
   └─ localization/
```

正式资源接入后由 `PreloadScene` 统一加载，其他模块只通过资源键名使用它们。
