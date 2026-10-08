# 2.7 与本轮三项联测证据

2026-10-08，内置浏览器 1280×720。

1. pnpm dev，http://localhost:5173/。D 350ms：right.png/json，方向标记从初始逐渐朝右，facingYaw 约 -0.2828→-1.5619→-1.5696。
2. S 350ms：backward.png/json，朝向继续转为后方约 -1.8546→-2.9289→-3.1377。镜头因箱子接近收近，截图可能将标记/角色放大。
3. pnpm build / pnpm preview，http://localhost:4173/；点击拒绝锁定后用左键拖动 (640,350)→(840,350)，W 300ms、D 250ms、Space 100ms；production.png，后备镜头/相对移动/转向/跳跃联测。
4. Esc：production-release.png，清空当时输入并恢复点击锁定提示。物理未暂停。
5. errors.json、production-errors.json 均为 []；physics.json 为 8 刚体/碰撞体与原地图哈希。

测试验证精确短路径、平滑响应/帧率、停止与接触噪声、实际墙滑动方向和胶囊不旋转。图像只用于验证可见方向标记及场景，不能代替完整运动过程测量。内置锁定失败和 Chrome 实际锁定/Esc 分别见 ../2.5/，未声称内置成功。

生产页面保留供用户试玩。方向标记是工程白盒，不是正式模型；正式角色仍用 Blender MCP。
