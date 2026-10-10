# 3.15.8 镜头跟手验证

独立IAB开发5173/生产4173，实际UI输入/只读日志，无状态注入，截图未经编辑。没有改鼠标速度：开发原保存1.5倍、生产1倍。

- dev-turn.png/stopped-camera.json：100px实际水平拖动；yaw−0.45，连续4次停手日志恒定。
- reversed.png/settings.txt：反向100px、Esc实显原1.50倍。
- production-turn.png/production-return.png：生产150px水平/50px俯仰与反向恢复。
- near-wall.png/near-wall.json：约180°转向、S2600ms，安全距离约0.109m。
- restored.png/restored-camera.json：W1600ms离墙后距4.487→4.491m，自身条恢复。
- reset.txt/reset.png：生产重置三靶100/自身100/30∞。
- errors.json/dev-errors.json：控制台error=[]。
- check.txt：实际完整pnpm check，58文件376测试。

工具没有量出硬件端到端延迟/首帧毫秒数；第一采样帧完整角和锁定事件至真实Three方向由MouseOrbit回归验证。内置锁鼠被拒绝使用明确拖动后备，真人跟手验收仍需用户完成。
