# 3.12 实机证据

- baseline.png：独立桌面开发5173初始画面。
- after-burst.png/.txt：锁定后左键持按900ms，实际8发、22/120弹、靶HP0受击5、自身HP100。
- recovered.png：停火后的画面。
- recoil-console.txt/.png：真实DevTools Filter=recoil.check；仅读取，没有Console脚本执行。offset采样0.02755141rad，回落到0；basePitch始终8°，最终pitch恢复8°。
- production-shot.png/.txt：独立生产页实际单击，29弹/靶80HP/自身100；有冲击点及HUD。
- production-errors.json：内置生产重载后error级日志为空。

原桌面试玩页状态变化未计入本轮操作；独立验证标签结束时已关闭，原页数据保留。没有GPU泄漏性能或全平台矩阵证明，组合瞄准/移动/后坐力需人工试玩。详见docs/reports/3.12.md。
