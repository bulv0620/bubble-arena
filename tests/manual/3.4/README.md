# 3.4 弹药 HUD 证据

2026-10-09，内置浏览器生产 localhost:4173，1280×720。

production-ammo.png：初始 30/120 弹药 HUD；点击锁定被拒绝后，普通左键拖动转镜头，弹药保持 30/120。Esc 后不再激活输入，弹药不被重置。browser-checks.json 保存实际 DOM 文本和 error=[]。

本轮桌面 Chrome 调用再次返回 Mac 锁屏，未进行真实持续扣弹。沒有扣到 0 的浏览器截图，未把单元测试结果写成真人实测。正向单击/连续/空弹/取消由 RifleFireState 与 FireInput→LocalRifle 组合测试验证，按报告步骤解锁后试玩。
