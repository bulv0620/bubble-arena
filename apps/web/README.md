# Web 客户端

React + TypeScript + Vite，后续承担大厅、房间、渲染、输入和 HUD。任务 0.3 已接入 React Three Fiber 与 Three.js，显示静态立方体；任务 0.4 已安装 Drei 10.7.9、React Rapier 2.2.0 和原生 Rapier compat 0.19.2，尚未创建物理世界或添加网络功能。

从仓库根目录运行：

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm build
pnpm preview
```

开发地址 http://localhost:5173，生产预览 http://localhost:4173；端口占用时明确失败，不静默切换端口。构建产物为 apps/web/dist，已加入忽略列表。锁文件固定依赖，应用本身要求 Node ^20.19.0 或 >=22.12.0；从根目录运行完整检查工具链要求 ^20.19.0、^22.13.0 或 >=24.0.0。

任务报告见 [0.2](../../docs/reports/0.2.md) 、[0.3](../../docs/reports/0.3.md) 和 [0.4](../../docs/reports/0.4.md)。

任务 0.5 已建立七个空模块；职责和依赖方向见 [客户端模块边界](src/README.md)，交付结果见 [0.5 报告](../../docs/reports/0.5.md)。

任务 0.6 在根目录提供 pnpm lint/test/test:watch/check。类型检查同时覆盖应用、Vite 配置和测试工具 TS 文件；Vitest 当前使用 Node 环境，不代表 WebGL 或浏览器交互测试。详见 [0.6 报告](../../docs/reports/0.6.md)。

任务 1.1 已由 core/BasicScene 装配 maps/WhiteboxMap：80×80 地面、1m 测试立方体、灯光和静态镜头；没有物理模拟。详见 [1.1 报告](../../docs/reports/1.1.md)。
