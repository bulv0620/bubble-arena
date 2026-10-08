# 1.8 重力与跳跃手动回归

1. pnpm dev 打开 http://localhost:5173/；或 pnpm build / pnpm preview 打开 http://localhost:4173/，点击场景。
2. 玩家出生后自动落稳。短按 Space，胶囊离地约 1.2m，随后回落；不应穿过地面或落地后持续下沉。
3. 按住 Space 检查只起跳一次；释放后重新按下才形成新的请求。失焦或切到隐藏标签页会清空未消费的请求。
4. WASD 跑动时按 Space，空中仍可操控，但加减速较地面弱；墙箱仍阻挡。当前镜头不跟随。
5. 观察开发 movement.check 中 jumped、velocityY、grounded；生产无调试日志或输入面板。脚底保留约 1cm 碰撞间隙。
6. 连续重力/碰撞导致少量浮点校正，当前测试容差是静止 1mm、自由方向侧偏 3cm；如果可感知持续漂移请记录路径，留给接地稳定性回归。

箱顶落地、低顶阻挡、地图外下落由真实 WASM 夹具自动验证；当前白盒无顶棚，也未接跌落淘汰/重生。地图边缘之外会继续下落。空中再跳/落地再跳等完整接地边界验收留到 1.9。

dev-jump.png / dev-landed.png 与 preview-jump.png / preview-landed.png 为实际离地/落地画面；dev-logs.json 为最终开发加载后实际日志。内置浏览器既有偶发空背景问题尚未修复，不能把空背景当作视觉通过。
