# Game core

固定步长规则、运动与武器状态机；通过适配器连接 Rapier，不依赖 UI。

任务 1.6 提供 HorizontalMovement：WASD 意图归一化，按共享 60Hz 步长计算水平加速/减速后的目标位移，无 React、DOM 或 Rapier 依赖。碰撞允许位移由 web 的 RapierMovement 适配器计算，未来服务端可复用同一运动规则和适配逻辑。

当前私有工作区包导出 TS 源码，由 Vite/Vitest/TypeScript 消费；Node 20 服务端需要 TS loader 或构建器，尚未提供发布 JS 产物。
