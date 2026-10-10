# 3.15.7 血条修复证据

- check.txt：真实完整pnpm check输出，58文件374测试。
- bubble-equipped.png：开发数字2切泡泡4∞、三靶头顶条正常；不是泡泡开火证据。
- shot.png/shot.txt/visible-after-shot.json：生产真实狙击5→4、中靶100→0，三条祖先display/visibility均未隐藏；不是泡泡命中截图。
- restored.txt：等待中靶恢复100后的完整AX。
- reset.txt/reset.png：重置回步枪后再按2切泡泡，三靶100/自身100/4∞。
- errors.json/dev-errors.json：生产/开发控制台error=[]。

根因复现见effects/skipEffectRaycast.test.ts：真实Three可见/已隐藏爆炸球仍相交，特效group停止递归后移除该遮挡，真实墙体继续遮挡。泡泡结算/减速与生命周期另由MultiWeaponImpact等真实Rapier回归证明；工具未捕获真人泡泡命中，不虚报。
