# 2.8 浏览器实测记录

2026-10-08；Codex 内置浏览器，1280×720。开发 localhost:5173；生产 localhost:4173。

- development-normal.png：初始普通视角。
- development-aim.png：实际右键持按、等待可见“瞄准中”后截取；肩侧位移和拉近可见。
- development-release.png：右键松开恢复普通提示。
- development-camera.log.json：开发镜头日志，aiming=true/false、offset=0.8/0.55、FOV=55/70；瞄准无障碍距离约 2.5m，普通最终约 4.5m。
- production-aim.png、production-release.png：最新生产包真实持键/松开画面。

额外实测：右键持按可见瞄准后按 Esc，在右键尚未松开时已经回普通提示，随后松开也不会自动进入。开发/生产 console error 查询各为 []。本轮在未锁定鼠标状态验证瞄准；本机 Chrome 锁定证据继承 2.5，本轮未重复 Chrome 锁定试玩。锁定下持键及异常路径由输入单元测试覆盖，仍需用户实玩。

生产首次打开曾仅显示背景和 HUD，右键输入后正常渲染；这是既有偶发首帧现象，未声称修复。最初尝试并发点击/截图得到普通视角，随后改为等待真实瞄准提示再截图，development-aim.png 已替换为有效持键证据。没有人工合成浏览器事件或改写页面状态。
