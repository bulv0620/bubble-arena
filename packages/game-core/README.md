# Game core

固定步长规则、运动与武器状态机；通过适配器连接 Rapier，不依赖 UI。

任务 1.6 提供 HorizontalMovement：WASD 意图归一化，按共享 60Hz 步长计算水平加速/减速后的目标位移，无 React、DOM 或 Rapier 依赖。碰撞允许位移由 web 的 RapierMovement 适配器计算，未来服务端可复用同一运动规则和适配逻辑。

当前私有工作区包导出 TS 源码，由 Vite/Vitest/TypeScript 消费；Node 20 服务端需要 TS loader 或构建器，尚未提供发布 JS 产物。

任务 1.8 提供 VerticalMovement：可配置的负重力/正起跳速度、固定步积分、向上碰撞和落地后的速度归零；接地反馈来自物理适配器，不由 React 管理。HorizontalMovement 可接收控制系数，适配器在空中使用共享 airControl=0.35。当前使用控制器基础接地结果完成跳跃/着陆，1.9 的接地边界验证尚待执行。
