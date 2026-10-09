# 3.8 实测证据（2026-10-09）

生产 http://localhost:4173/。

- production-initial.png：内置实际青色靶子，100/100、受击0、30弹；内置锁定失败按既有后备，未声称其锁定成功。
- 桌面Chrome重新打开生产从0开始，点击画布锁定、再左键单击，desktop-hit.png/txt：29弹、HP100/100、受击1。
- Esc后D持按0.7s偏离，重新锁定/左键单击，desktop-miss.png/txt：28弹、受击仍1。随后Esc释放。
- getApp初始发现桌面开发页已存在16弹/受击14，该状态不是本次工具操作证据；上述验证均从生产重置0开始。
- 开发physics-logs.json最新60步为9刚体/9碰撞体，原地图hash；多一个独立固定sensor靶，移动/镜头不受靶子阻挡。
- production-errors.json/dev-errors.json为空。截图原图，无注入或执行页面状态更改代码。

HP不扣除是3.8范围，3.9实现伤害。墙面遮挡、同面优先、清理/去重、不同target注册等边界有实际Rapier/核心测试，不声称逐项真人测试通过。无跨平台矩阵。
