# 2.11 准星实测证据

2026-10-08，内置浏览器 1280×720；开发 localhost:5173，生产 localhost:4173。

- development-normal.png / production-normal.png：明确点击画布后锁定拒绝，后备输入可用，普通准星出现。
- development-aim.png / production-aim.png：等待实际可见“瞄准准星”后截图，右键持按进入紧凑绿色准星。
- development-escape.png / production-escape.png：松右键恢复普通，然后 Esc；准星从 DOM 移除。
- browser-checks.json：开发普通准星实际 rect=(628,348,24,24)，中心=(640,360)，pointerEvents=none；生产 Esc 后两种准星 count=0，error 查询 []。开发 error 查询亦 []。

首次刚 reload 后的点击未激活（可见状态仍 idle），等待渲染后明确点击才进入拒绝锁定后备状态；一次普通准星定位等待超时因此重新核对。没有把第一次普通画面当作准星证据，已替换截图。继承内置不支持锁定的实际限制，未虚报真实锁定。Chrome 既有真实锁定证据见 2.5，当前锁定生命周期由组合输入测试覆盖。

真人验收还需在桌面 Chrome 连续按右键 + WASD 验证瞄准横移/后退和 3.5m/s 手感；本轮工具组合持键限制见 2.9。
