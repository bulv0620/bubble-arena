# 2.4.2 浏览器证据

2026-10-08，内置浏览器真实输入，1280×720。

1. pnpm dev，http://localhost:5173/，场景载入后点击画布；initial.png、clear.json 为无障碍 4.5m。
2. 左键从 (600,350) 拖到 (1100,350)：wall.png、wall.json；yaw≈-1.5，实际距离约 0.871571m，西墙不再完全遮住人物。人物会因镜头前移变大。
3. 从 (1100,350) 拖回 (600,350)，再从 (900,650) 拖到 (900,150)：floor.png、floor.json；pitch=-60°，镜头 y≈0.250866m，距离约 1.396303m，地面底部不再显示。
4. 从 (900,150) 拖到 (900,644) 恢复约 25°，A 650ms 靠西墙，再两次从 (600,350) 拖到 (1100,350)：shoulder.png、shoulder.json；玩家 x≈-2.6399、yaw≈-3，肩偏移收回，镜头距离可极近，人物近裁切。
5. pnpm build / pnpm preview，http://localhost:4173/；重复第 2/3 步，production-wall.png、production-floor.png。恢复约 25°，D 400ms、Space 100ms，production.png。
6. development-errors.json、production-errors.json 均为 []；physics.json 记录 8 刚体/碰撞体和地图哈希。

6 项真实 Rapier/Three 测试验证球形安全包络、肩偏移、墙/地前移、极近距离、非法输入/锚点重叠及完整白盒多 yaw/pitch；没有声称实际浏览器遍历所有地图角度。当前离墙即时恢复，2.4.3 再处理恢复平滑。导航后首帧短暂空背景的既有现象未作为本任务修复项。

生产页面保留供用户验收。
