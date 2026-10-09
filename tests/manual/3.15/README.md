# 3.15 武器手感修正证据

check.txt：最终pnpm check，54文件360测试。sniper-cooldown.png/production-cooldown.png为真实右键点击开镜后左击，头部100→0/弹匣5→4，自动关镜、实际冷却条与−100；early-scope.txt为提前开镜被拒绝；click-toggle.txt为生产右键已松开仍保持镜圈；shot.json/damage.json为真实开发枪械/头击日志；reset.txt为生产重置后三靶100/5∞、无冷却；错误日志均来自独立页。

physics.json为开发重置后的固定60tick、12刚体15碰撞体、原地图hash。shotgun-attempt.png未形成实际霰弹开火，不证明八轨迹效果；walking-switch.txt的工具组合输入没有保持S，不证明持续行走切换。霰弹真实命中/实际停止点和反馈池、持方向键切换的实际绑定/同一个Rapier控制器，由核心与真实物理测试验证。真人效果与手感按报告步骤验收，未注入状态或制造截图。
