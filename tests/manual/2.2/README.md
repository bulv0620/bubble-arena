# 2.2 浏览器试玩证据

2026-10-08，通过 Codex 内置浏览器真实鼠标拖动与键盘输入保存，1280×720。

1. pnpm dev，访问 http://localhost:5173/；initial.png 为出生构图。
2. 画布左键从 (640,350) 拖到 (840,350)：yaw.png，角色持续跟随，地图朝向变化。
3. 从 (750,350) 拖到 (750,470)：pitch.png，俯视角加大。
4. D 约 700ms，Space 约 100ms：move-jump.png，移动与跳跃后镜头跟随。
5. 从 (900,100) 拖到 (900,650)：pole-guard.png，接近顶视图没有翻转；精确 ±89° 检查在单元测试中。
6. pnpm build / pnpm preview，访问 http://localhost:4173/；从 (640,350) 拖到 (840,430)，D 约 400ms、Space 约 100ms：production.png；底部提示在生产也可见。
7. 手动继续：松键后移动鼠标应不增加旋转；拖动时切出窗口/隐藏页面再回来，须重新按下才能旋转。此处失焦/隐藏与卸载路径由自动化 EventTarget 测试覆盖，没有声称实际浏览器做过切页验证。

开发采样 development-camera.json 包含 yaw=-0.6、pitch≈0.7963 与 4.5m 距离；极点截图之后立即转生产，保存日志尚无极点角度采样。development-errors.json、production-errors.json 均为 []。UI 可访问性树会列出 Canvas fallback 文本，实际截图显示正常 3D，不把 fallback 文本当作 WebGL 失败。

生产预览保留供人工验收。镜头避障和正式俯仰范围尚未实现，WASD 仍使用世界轴。
