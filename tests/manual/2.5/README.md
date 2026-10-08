# 2.5 操作证据

2026-10-08。Chrome 新标签页访问 http://localhost:5173/，点击画布，实际显示鼠标已锁定及 Chrome Esc 通知；chrome-locked.png。按 Escape 后解除，chrome-released.png。此两图是原生 Chrome 窗口截图，未模拟锁定。后续 Chrome 被用户切换，未继续操作其当前页面。

内置浏览器点击实际拒绝锁定，iab-denied.png；加入兼容提示后点击失败再左键拖动 (640,350)→(840,350)，iab-fallback.png，地图朝向实际变化。两种浏览器结果分别记录，不把拖动视为锁定成功。

自动化事件测试覆盖正常确认、相对移动、Esc、blur、隐藏、外部失锁、拒绝/异常/Promise、取消或卸载后晚授权、重挂/旧清理/订阅及其他元素锁保护；批次收尾补不同画布晚授权。没有声称实际 Chrome 做过每种失焦/生命周期路径。
