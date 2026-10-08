# 2.4.3 浏览器证据

2026-10-08，内置浏览器真实输入，1280×720。

1. pnpm dev，http://localhost:5173/，载入后点击画布；左键从 (600,350) 拖至 (1100,350)，朝西墙；contracted.png、contracted.json，实际距观察点约 0.87157m。
2. 从 (1100,350) 拖回 (600,350)，保存 recovering.png，稍后 restored.png；recovery.json 包含安全距离 4.5m 下实际距离 1.62→2.58→3.21→3.92→4.48→4.5m。开发恢复期间每 6 渲染帧记录，不能把截图当作完整动态测量。
3. 朝墙、转离、再次朝墙三次拖动：reentry.png、reentry.json；D/A 各 500ms 来回移动，wall-movement.png。
4. pnpm build / pnpm preview，http://localhost:4173/，重复朝墙/反向拖动；production-contracted.png、production-recovering.png；恢复后 D 移动和 Space 跳跃，production.png。
5. development-errors.json、production-errors.json 均为 []；physics.json 为地图哈希和 8 刚体/碰撞体。生产没有恢复距离日志。

自动化验证单调恢复、无过冲、交替命中、30/60Hz、非法输入、暂停后长帧限幅、失败不提交/重置，以及真实墙移除/再出现时每帧安全球在障碍外。目标丢失/切换调用 reset 的组件分支经类型与代码检查，未声称浏览器实际卸载/切换过目标。

导航后首次短暂空背景的既有现象保持；极近距离人物近裁切和肩偏移即时调整保持。生产页面保留供用户试玩。
