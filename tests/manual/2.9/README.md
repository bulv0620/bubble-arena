# 2.9 实测

开发版 http://localhost:5173，内置浏览器 1280×720。

先 D 350ms 产生移动方向转向，然后原地持右键 5s。aim-standing.png 为真实持键截图；movement.log.json 记录 aiming=true、cameraYaw=0 时 facingYaw 平滑收敛 0，位置不被转身改变。普通后退转身另实测日志达到约 ±π。

工具分开发送键盘会结束鼠标持按；尝试 key=d 的组合右键也未进入有效持键（一次可见提示等待超时）。未将这些尝试声称为实际同时横移成功。真实 Rapier 组合横移/后退 + aimYaw 由 RapierMovement.test.ts 两项测试验证，真人组合操作留待用户试玩。
