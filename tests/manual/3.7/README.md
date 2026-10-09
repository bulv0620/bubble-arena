# 3.7 浏览器实测（2026-10-09）

开发 http://localhost:5173/。

内置浏览器：锁定拒绝，使用原后备。W持按1秒实际到北墙；dev-near-wall.png显示中心黄点与下方红点，near-wall-logs.json身体z≈-2.390/枪口z≈-3.060，安全段阻于墙面z≈-2.750、blocked-muzzle。仅连续预览，不冒充接受开火。physics-logs.json仍8刚体/8碰撞体、原地图hash；browser-errors.json为空。

桌面Chrome：实际锁定成功，W持按1秒靠墙，单击30→29；desktop-shot.png。Esc释放后打开DevTools，使用Filter字段粘贴shot.ray筛选（只读，没有执行Console表达式），记录desktop-shot-log.txt与desktop-shot-console.png：tick657/sequence1，blocked-muzzle、近侧交点z≈-2.750。起初AX setValue过滤未触发筛选，改为正常粘贴成功；原始全AX证据为最终筛选结果。临时DevTools关闭。

生产4173：production.png，无开发红/黄点。Esc后准星隐藏、30/120不变。production-errors.json为空。截图原图，未做跨平台矩阵、性能测试或伤害目标验收。
