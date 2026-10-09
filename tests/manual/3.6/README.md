# 3.6 浏览器证据（2026-10-09）

内置浏览器 http://localhost:5173/ 开发版：锁定被浏览器拒绝，采用既有左键拖动后备；不声称成功锁定。

- 普通墙面 dev-wall.png：小黄球覆盖准星中心；wall-logs.json 命中墙面z≈-2.75，距镜头约7.277m。
- 右键持按4秒：DOM显示瞄准中/瞄准准星，dev-aim.png；all-aim-logs.json 包含瞄准镜头位置x≈-1.350,z≈3.367，普通为x≈-1.450,z≈4.456。after-aim-logs.json 是释放右键后的普通模式，名称明确保留。
- 左键向上拖动：dev-sky.png，无小黄球。aim-logs.json clear、distance=70、方向y≈0.771，目标y≈54.219；截图近镜头角色裁切是已有镜头限制。
- physics-logs.json：60步、dt≈1/60、8刚体/8碰撞体、fnv1a64:4abdb29633dc2d14。

生产 http://localhost:4173/：production.png，普通准星、30/120、无开发黄球/诊断面板。Esc后DOM无准星且恢复点击提示；browser-errors.json=[]。

截图为实际浏览器原图。首次开发加载短暂仅背景，再次点击后实际场景出现；不把背景帧当作完成证据。未做桌面Chrome、跨平台/性能或枪口命中验收。精确投影、过滤与空世界由实际Three/Rapier自动测试覆盖。
