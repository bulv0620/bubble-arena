# Bubble Arena 工作区

阶段0～3已验收关闭；阶段3共37项于2026-10-11由用户确认accepted，4.1～4.3生命状态机/普通受伤归零转倒地/倒地操作限制已implemented，规则见 [PLAYER_LIFE](docs/spec/PLAYER_LIFE.md)。Esc生命测试可受伤或击倒，自身头顶与边缘显示独立倒地血量；倒地统一1m/s移动、可观察，禁跳/开火/换弹/切枪/开镜；4.4.1～4.4.3救援资格/3秒进度/中断/唯一占用和实际救起已implemented：恢复50HP、1秒伤害及控制保护，实际开火提前结束；Esc救援练习提供静止/爬行/受伤及队友救我测试场景，见 [RESCUE](docs/spec/RESCUE.md)；4.5倒地补刀/20秒淘汰已implemented，HUD显示剩余时间与原因，淘汰停止行动；4.6复活/出生点已implemented：淘汰5秒后100HP/满弹药/新生命、2秒保护，规则见 [SPAWN](docs/spec/SPAWN.md)；4.7队伍/淘汰计分已implemented：shared红蓝ID统一、补刀/超时归属和助攻、每生命去重、Esc模拟来源/重放及比分HUD，见 [SCORING](docs/spec/SCORING.md)；下一项4.8比赛计时与状态。最新3.14批次已接入步枪/霰弹/狙击三选一主武器 + 固定4发泡泡副武器：Esc设置选主枪，数字1/2切主副，独立弹药/冷却、无限训练备弹和自动装填；重量决定移速（轻型霰弹/泡泡5.5、步枪5、狙击4m/s）。狙击右键FOV24°开镜、无伤害衰减、满血靶头击清空；霰弹八弹丸合并伤害，泡泡飞行/碰撞爆开、范围伤害和减速状态。具体见 [双武器规则](docs/spec/LOADOUT_WEAPONS.md)、[步枪射击手感](docs/spec/RIFLE_GUNPLAY.md)、[部位伤害](docs/spec/WEAPON_DAMAGE.md)。人物始终朝准星水平前方；正式模型仍待Blender MCP B.1，当前工程占位。3.15修正非连发冷却进度条、狙击点击切镜/射后关闭/冷却门禁，霰弹八丸轨迹及近身体全中112，切枪保留移动。3.15.4进度改为唯一准星外围圆环（换弹优先、冷却只显示“冷却”），按 [TTK计算](docs/spec/WEAPON_TTK.md) 将霰弹冷却降至0.45s。3.15.6收回肩位至1.12m、观察点1.7m，自身血条头顶居中且间隔缩至0.25m；近墙投影保护保留。3.15.7排除纯视觉特效的血条遮挡查询，修复隐藏泡泡爆炸球可能持续挡住靶子头顶条。3.15.8取消镜头旋转指数追赶，鼠标完整增量在下一渲染帧生效，保留避障恢复/后坐力。本地验收快照stage-3-accepted，旧候选保留。玩家倒地/救援/复活与联机继续按后续任务推进。

原创 3D 卡通第三人称房间制射击游戏。当前白盒原型支持 WASD 移动、空格跳跃和地面/墙箱碰撞，已支持单机四武器训练与练习靶，尚未接入完整生命状态与联机。

## 从这里开始

1. 阅读 [完整方案](docs/spec/SPEC.md)、[游戏规则](docs/GAME_DESIGN.md)。
2. 阅读 [工程约束](AGENTS.md)、[架构](docs/ARCHITECTURE.md)。
3. 查看 [开发计划](docs/DEVELOPMENT_PLAN.md) 与 [任务列表](docs/TASKS/INDEX.md)。
4. [阶段 0](docs/reports/stage-0.md)、[阶段 1](docs/reports/stage-1.md)、[阶段 2](docs/reports/stage-2.md) 已验收通过。阶段 2 包含第三人称镜头、避障、鼠标锁定、相机相对移动、瞄准横移/后退、独立手感参数与圆环准星；本地验收回退点为 stage-2-accepted。[阶段 3](docs/reports/stage-3.md) 已验收射击输入、多武器、弹药、换弹、射线查询、靶子扣血与命中反馈；接下来阶段4生命规则，联机仍待阶段5。

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
