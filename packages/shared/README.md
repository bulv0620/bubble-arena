# Shared

协议、运行时校验、配置和资源 ID；不依赖 React、DOM 或服务端。

任务 1.2 建立 @bubble-arena/shared 工作区包，公开 PHYSICS_CONFIG：米/秒、Y 向上，60Hz、1/60 秒、重力 [0,-20,0]。timeStep 由 tickRate 单一常量推导，客户端与后续 Node 服务端使用同一配置。

当前源入口为 src/index.ts，供 Vite/Vitest/TypeScript 消费。Node 20 不直接运行此 TS 文件；服务端任务需要使用 TS loader 或构建器，不能将源入口误认为已发布的 Node JS 构建产物。
