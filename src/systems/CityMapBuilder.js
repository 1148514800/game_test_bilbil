import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants.js';

/**
 * 第一阶段城市地图生成器。
 * 当前使用几何图形快速验证布局；以后接入 Tiled 地图时，GameScene 不需要跟着大改。
 */
export class CityMapBuilder {
  static build(scene) {
    scene.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawGround(scene);
    const obstacles = scene.physics.add.staticGroup();
    this.drawResidentialArea(scene, obstacles);
    this.drawPark(scene, obstacles);
    this.drawMinigameArea(scene, obstacles);
    this.drawStreetDetails(scene, obstacles);

    return {
      obstacles,
      doors: [
        { id: 'home', name: '玩家住宅', x: 480, y: 500 },
        { id: 'community', name: '社区中心', x: 455, y: 1940 },
        { id: 'shop', name: '街边商店', x: 1010, y: 1920 },
        { id: 'arcade', name: '接物挑战馆', x: 2695, y: 1880 },
      ],
      zones: [
        { name: '玩家住宅区', x: 0, y: 0, width: 1150, height: 920 },
        { name: '城市公园', x: 2050, y: 120, width: 1000, height: 820 },
        { name: '小游戏场所', x: 2220, y: 1470, width: 760, height: 520 },
      ],
    };
  }

  /** 大块底色和道路只绘制一次，比创建上千个小地砖对象更适合原型性能。 */
  static drawGround(scene) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x98cf8d);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 城市主干道形成十字，连接所有地点，保证视觉上是一张连续地图。
    graphics.fillStyle(0x607178);
    graphics.fillRect(1250, 0, 560, WORLD_HEIGHT);
    graphics.fillRect(0, 960, WORLD_WIDTH, 390);

    // 人行道使用浅灰色，并用黄色虚线标记车道中央。
    graphics.fillStyle(0xd4d8d4);
    graphics.fillRect(1210, 0, 40, WORLD_HEIGHT);
    graphics.fillRect(1810, 0, 40, WORLD_HEIGHT);
    graphics.fillRect(0, 920, WORLD_WIDTH, 40);
    graphics.fillRect(0, 1350, WORLD_WIDTH, 40);
    graphics.fillStyle(0xf6d56b);
    for (let y = 20; y < WORLD_HEIGHT; y += 90) graphics.fillRect(1520, y, 20, 52);
    for (let x = 20; x < WORLD_WIDTH; x += 100) graphics.fillRect(x, 1135, 58, 18);
  }

  static drawResidentialArea(scene, obstacles) {
    this.addLabel(scene, 560, 90, '玩家住宅区');
    this.addBuilding(scene, obstacles, 170, 185, 620, 300, 0xf3bd72, '你的家');
    this.addBuilding(scene, obstacles, 835, 170, 260, 250, 0xd98983, '邻居家');

    // 房屋门口的小路将出生点引向城市主干道。
    scene.add.rectangle(620, 700, 1050, 150, 0xd8c7a9);
    scene.add.text(520, 540, '出生点', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#385554',
      backgroundColor: '#ffffffcc',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5);
  }

  static drawPark(scene, obstacles) {
    scene.add.rectangle(2550, 530, 960, 780, 0x75bd78)
      .setStrokeStyle(12, 0xe8dfbb);
    this.addLabel(scene, 2550, 180, '城市公园');

    // 池塘只作为景观和障碍，玩家不能直接走进水中。
    const pond = scene.add.ellipse(2600, 570, 410, 230, 0x72c4d4)
      .setStrokeStyle(10, 0xc9e4ca);
    scene.physics.add.existing(pond, true);
    obstacles.add(pond);

    const treePositions = [
      [2180, 320], [2350, 760], [2840, 330], [2910, 770], [2210, 650],
    ];
    treePositions.forEach(([x, y]) => this.addTree(scene, obstacles, x, y));
  }

  static drawMinigameArea(scene, obstacles) {
    scene.add.rectangle(2600, 1730, 830, 490, 0xc9b4e8)
      .setStrokeStyle(12, 0xf6e6ff);
    this.addLabel(scene, 2600, 1510, '小游戏广场');
    this.addBuilding(scene, obstacles, 2460, 1590, 470, 255, 0x8d6cc3, '接物挑战馆');
    scene.add.circle(2840, 1830, 72, 0xf4ce5e).setStrokeStyle(8, 0xffffff);
    scene.add.text(2840, 1830, '已开放', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#654f28',
    }).setOrigin(0.5);

  }

  static drawStreetDetails(scene, obstacles) {
    this.addLabel(scene, 1530, 1050, '城市街道');
    this.addBuilding(scene, obstacles, 130, 1560, 650, 360, 0x6cb5c2, '社区中心');
    this.addBuilding(scene, obstacles, 860, 1580, 300, 300, 0xf08b66, '街边商店');

    // 路障避免玩家进入尚未开发的地图边缘，同时也展示后续扩建方向。
    scene.add.text(1540, 2050, '更多城区将在后续开放', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#41555ad9',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5);
  }

  /** 创建有物理碰撞的建筑。 */
  static addBuilding(scene, obstacles, x, y, width, height, color, label) {
    const building = scene.add.rectangle(x, y, width, height, color)
      .setOrigin(0)
      .setStrokeStyle(10, 0xffffff, 0.65);
    scene.physics.add.existing(building, true);
    obstacles.add(building);

    // 门只是第一阶段的视觉提示，进入室内会在后续阶段实现。
    scene.add.rectangle(x + width / 2, y + height - 35, 70, 70, 0x5a483f).setOrigin(0.5);
    scene.add.text(x + width / 2, y + 45, label, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '27px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#4d5b5b',
      strokeThickness: 5,
    }).setOrigin(0.5);
  }

  static addTree(scene, obstacles, x, y) {
    scene.add.rectangle(x, y + 28, 22, 58, 0x79553d);
    const crown = scene.add.circle(x, y, 48, 0x3f9356).setStrokeStyle(6, 0x69b96f);
    scene.physics.add.existing(crown, true);
    obstacles.add(crown);
  }

  static addLabel(scene, x, y, text) {
    scene.add.text(x, y, text, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#315d5b',
      strokeThickness: 7,
    }).setOrigin(0.5);
  }
}
