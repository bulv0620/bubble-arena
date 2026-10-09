# 3.15.4 圆环与TTK证据

check.txt为最终pnpm check（56文件365测试）；ttk-check.txt为冷却/TTK/互斥选择相关3文件8测试通过记录。完整条件TTK表在docs/spec/WEAPON_TTK.md，由weaponTtk.test.ts真实核心规则校验，不是实战平均。

cooldown-ring.png/cooldown.json来自生产真实狙击开火后，唯一圆环、文本“冷却”、宽136px；reload-only.png/last-shot.json来自同页继续打空最后一发，只有换弹环，冷却count0。errors.json为该独立页错误日志。没有注入状态或伪造截图。
