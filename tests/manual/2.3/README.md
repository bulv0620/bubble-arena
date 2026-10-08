# 2.3 浏览器试玩证据

2026-10-08，内置浏览器真实输入，1280×720。

1. pnpm dev，访问 http://localhost:5173/；左键从 (900,150) 拖至 (900,650)，重复一次达到上限；upper.png、upper-log.json，采样约 70°。
2. 从 (900,400) 拖至 (900,380)，反向 20px；reverse-upper.png、reverse-upper-log.json，采样约 66.5623°。连续越界没有导致反向拖动迟滞。
3. 从 (900,650) 拖至 (900,150)，重复两次达到下限；lower.png、lower-log.json，采样约 -60°。
4. 从 (900,400) 拖至 (900,420)，反向 20px；reverse-lower.png、reverse-lower-log.json，采样约 -56.5623°。
5. pnpm build / pnpm preview，访问 http://localhost:4173/；重复第 1 步一次拖动及第 2 步反向操作，production-upper.png、production-reverse.png。
6. 开发、生产 error 查询保存 development-errors.json、production-errors.json，均为 []。日志只在开发采样，生产没有角度日志。

Three 相机/输入类测试验证每帧范围、任意 yaw 不倒置、双侧反向恢复与定距；未声称浏览器遍历所有 yaw/帧率。下限图片显示地图底部，相机尚未避障。导航后首次截图出现背景空画面，拖动后正常，该既有现象未作为本任务修复项。

生产页面保留供用户验收。操作仍为左键拖动，WASD/Space 保持。
