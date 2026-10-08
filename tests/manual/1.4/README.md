# 1.4 手动回归

1. pnpm dev 打开 http://localhost:5173/；或 pnpm build 后 pnpm preview 打开 http://localhost:4173/。
2. 确认蓝色立方体落地，左侧橙色胶囊直立、底部贴地，明显比 1m 立方体高。
3. 按 WASD/Space，胶囊保持静止；当前没有输入或移动控制。
4. 开发控制台 physics.check 为 3 刚体/3 碰撞体，固定 dt≈1/60；无 error。Rapier 初始化 warning 是已记录的既有问题。
5. 内置浏览器若只见背景，重新隐藏/显示预览后检查；不要把背景截图算作通过。跨浏览器冷启动问题尚待定位。

preview.png 为实际生产画面；dev.png 为开发页面按 W 后实际画面；dev-logs.json 为实际捕获日志。几何/碰撞对应、静止与清理由真实 Rapier/Three 集成测试覆盖，用户视觉验收仍待确认。
