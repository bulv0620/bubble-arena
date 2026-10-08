# Bubble Arena 工作区

原创 3D 卡通第三人称房间制射击游戏。当前白盒原型支持 WASD 移动、空格跳跃和地面/墙箱碰撞，尚未接入战斗与联机。

## 从这里开始

1. 阅读 [完整方案](docs/spec/SPEC.md)、[游戏规则](docs/GAME_DESIGN.md)。
2. 阅读 [工程约束](AGENTS.md)、[架构](docs/ARCHITECTURE.md)。
3. 查看 [开发计划](docs/DEVELOPMENT_PLAN.md) 与 [任务列表](docs/TASKS/INDEX.md)。
4. [阶段 0](docs/reports/stage-0.md) 和 [阶段 1](docs/reports/stage-1.md) 已验收通过。阶段 2 的全部任务已实现，包含第三人称镜头、避障、鼠标锁定、相机相对移动、瞄准横移/后退、独立手感参数和中心准星。先按 [阶段 2 试玩清单](docs/reports/stage-2.md) 验收；人工通过前不进入阶段 3。最新单项报告：[2.9](docs/reports/2.9.md)、[2.10](docs/reports/2.10.md)、[2.11](docs/reports/2.11.md)。

人物、枪械、正式地图使用 Blender MCP 驱动 Blender 制作，保留 .blend 和脚本，再导出 GLB。详见 [Blender 流程](docs/art/BLENDER_MCP.md) 与 [资产规范](docs/art/ASSET_PIPELINE.md)。

## 当前可执行命令

```sh
pnpm install --frozen-lockfile
pnpm dev             # http://localhost:5173
pnpm typecheck
pnpm build           # apps/web/dist
pnpm preview         # http://localhost:4173
pnpm check:workspace
pnpm lint
pnpm test            # 单次运行，失败返回非零
pnpm test:watch      # 本地开发监听
pnpm check           # 工作区、类型、lint、测试、构建
```

Node 已检测为 20.19.3，pnpm 为 10.12.4，Blender 为 5.2.2（2026-10-08）。MCP 尚未连接，uvx 未在 PATH 中找到。这些是检查时状态，不保证其他机器相同。

任务 0.6 已提供统一 test/lint/check；根工具链要求 Node ^20.19.0、^22.13.0 或 >=24.0.0。更新 tasks.json 后先运行 `node scripts/check-workspace.mjs --write-index` 同步索引。当前检查只验证工作区文档和任务一致性，不代表游戏通过测试。

## 范围与状态

M1：一张白盒地图 + 步枪 + 1v1 权威联机闭环。
M2：2v2 玩法 + 大厅房间 + 击倒救援。
V1：2v2 + 四种武器 + 小镇/海滨两张正式地图 + 一套原创角色骨骼和动画 + 音画反馈 + 公网部署。
V1.1：按性能结果扩展 4v4 和竞技场第三张地图。

0.1 工作区、0.7 执行规范、0.2 Web 最小页面、0.3 立方体和 0.4 Drei/Rapier 依赖已实现；0.5 模块边界和 0.6 检查工具已建立。阶段 0 基线保存在本地 Git tag `stage-0-baseline`。当前支持基础物理与第三人称跟随镜头，尚未接入战斗/联机或制作正式模型。规则为推荐实施基线，可通过决策记录调整；不是已试玩确认的平衡数值。

原需求原样保存在 docs/reference/ORIGINAL_REQUIREMENTS.md；现行范围差异记录在 docs/DECISIONS.md。
