# 3.2 工程占位步枪试玩证据

2026-10-09；Codex 内置浏览器，生产 localhost:4173、开发 localhost:5173，1280×720。

- production-turn.png：D 450ms 后，角色朝右，蓝色枪身/黄色枪管一起转向右方。
- production-jump.png：Space 150ms 后角色离地，占位枪仍保持角色相对位置。
- production-aim.png：右键持按、等待实际瞄准准星后截图，枪随角色转回水平瞄准方向。松键后回普通状态。
- physics.log.json：开发实际 60 步日志，8 bodies / 8 colliders，mapHash=fnv1a64:4abdb29633dc2d14。
- movement.log.json：开发 D 移动样本，供位置/转向回归参考。

开发/生产 error 查询均 []；截图已读取检查。没有修改页面场景内部状态或注入事件。当前为简单几何体工程占位，不是 Blender 正式导出件；没有手臂握持/举枪动画或射击。
