# 客户端模块边界

2026-10-14现行：阶段3已accepted。4.2训练会话持有LocalPlayerHealth及PlayerHealthSimulation固定物理步消费测试意图；头顶/边缘HUD以useSyncExternalStore订阅真实PlayerHealthState。Esc面板的单机生命测试槽只排队hit/down，生成身份和读取20/100伤害配置在模拟步完成。重置仅重建PhysicsWorld和会话，Canvas/Html宿主仍保持；未提前实现4.3操作门禁或完整救援/复活。下文为历史实现记录。


3.12.1 visuals/BlockAvatar共用分块头/圆脸/身子，player只替换视觉，target旋转π朝向玩家；胶囊尺寸/无爆头规则不改。LocalTrainingRange创建三个独立目标，HUD缓存聚合快照并配对释放订阅，只显示一个统一命中标记。BasicScene按独立训练区spawn装配；原移动回归基线spawn保留供物理测试。

3.10～3.12：自身HUD读取game-core独立初始PlayerVitals，尚无敌方攻击。ShotFeedback消费接受射击，两个ShotEffects网格固定复用，350/650ms隐藏，R3F卸载释放，无计时器/新物理体。RifleRecoil按接受sequence唯一脉冲，在FollowCamera基础鼠标pitch外叠加可回落偏移，再走原避障并查询最终aim；不改鼠标desired方向，不回溯本发伤害。阶段3全部implemented，等待人工手感验收。

3.9 TrainingTargetHint订阅有效受击快照，显示实际HP与受击数；按hitCount重建中心黄色命中标记与lastDamage数字，CSS在700ms淡出。miss/归零拒绝不通知、不重启动画；订阅由useSyncExternalStore释放，没有定时器或UI物理tick。归零靶子仍保留工程胶囊用于瞄准，刷新场景才重置，无倒地/复活/得分。下文3.8为历史接口记录。

3.8 TrainingTarget 注册独立sensor胶囊，R3F负责释放；TrainingTargets注册表结合地图遮挡、最近目标查询和一次射击身份去重，将已接受枪口查询路由到LocalTrainingTarget.receiveHit。FollowCamera选择靶子目标；HUD订阅100HP/受击数。当前只记录受击，无扣血/闪烁/音效；开发红点和shotRay仍表示地图遮挡界限，黄色准星目标可选靶子。


3.7 weapons/riflePose 与 RiflePlaceholder 共用枪口尺寸；CapsulePlayer发布本步facingYaw，RifleSimulation在接受开火后于useAfterPhysicsStep读取最新中心，安全段保护枪口穿墙，再做70m地图射线。shotRay仅是最近一次结果参考，不是可每帧重复消费的伤害事件；清理时清空。开发MuzzleAimDiagnostics连续红点预览，无物理tick/碰撞/伤害；生产隐藏。


3.6 weapons/screenAimRay 从最终透视镜头世界姿态计算单位射线和地图最近交点/远端点；FollowCamera 避障后写入场景 aimTarget ref，目标丢失/非法帧/卸载清空，无 React 每帧状态更新或物理 tick。AimTargetMarker 仅开发可见且无碰撞；后续枪口遮挡/伤害另做。


3.5 ReloadInput 采集 R 按下沿，过滤自动重复/文字编辑/修饰键，Esc/失焦/隐藏/卸载清空待处理输入。BasicScene 仅装配生命周期；RifleSimulation 在既有物理步消费换弹意图。LocalRifle 仅在扣弹、换弹开始/结束通知，AmmoHint 显示共享配置耗时；无 UI 计时器。


3.4 weapons/RifleSimulation 注册现有 Rapier useBeforePhysicsStep 回调，读取 FireInput.consume 并调用 LocalRifle 的共享规则；没有 useFrame 射击或 UI-owned timer。LocalRifle 只在接受开火/扣弹时通知，HUD/AmmoHint 订阅不可变快照。卸载时 hook/订阅由既有生命周期清理，重新创建整个场景恢复初始弹药；3.4 时无换弹/子弹/命中反馈。

3.3 weapons/FireInput 采集左键 held 与合并 pressed 沿；consume 只移除沿、clear 取消全部。FireInputHint 订阅低频状态，没有射击/扣弹/伤害或模拟 tick。正常锁定后可采集；后备时右键瞄准才采集左键，并禁止镜头拖动/锁定重试，普通左键仍拖动。监听和订阅由 attach 返回的清理函数释放。

3.2 weapons/RiflePlaceholder 以声明式几何体提供工程占位，挂到 CapsulePlayer 的视觉 group 下，随角色位移、跳跃与 yaw 转身；不创建物理体或碰撞体，不单独执行 tick。武器 +Z 前向经 socket 的 π 旋转适配白盒角色 -Z，几何体/材质由 R3F 声明式生命周期管理。当前无手臂/骨骼或 pitch 举枪动画，正式资产仍需 Blender MCP。

2.11.1 已按用户反馈调整默认构图，HUD 圆环普通 64px / 瞄准 52px 替换原 24px 十字；人物头部默认在准星下方，准星仍位于屏幕中心，状态/释放逻辑保持。

任务 0.5 建立模块目录；core/BasicScene 装配地图、物理、player 与 camera，App 只引用 core 公共入口。player 提供胶囊、输入/移动适配和视觉转向；camera 提供跟随/避障、恢复与锁定，失败时可拖动。监听器由 effect 配对释放。camera 只读位置并发布 yaw 意图，固定物理步调用共享规则计算位移；weapons/audio/network 仍为空。

| 模块 | 职责 | 边界 |
| --- | --- | --- |
| core | 客户端生命周期、场景装配 | 编排下列适配模块；不承担跨端模拟 |
| player | 角色模型、动画、输入适配 | 不定义伤害、生命状态或权威坐标 |
| input | 右键持按意图、准星激活状态及低频 HUD | 不授予有效命中或坐标 |
| camera | 跟随、瞄准、避障表现 | 不决定有效命中 |
| HUD | 中心普通/瞄准准星 | 只订阅输入激活状态，不决定命中 |\n| weapons | 武器模型、枪口、射击表现 | 不持有独立于 game-core 的弹药/射速/伤害规则 |
| maps | 场景与地图资源加载 | 不另维护一份碰撞/出生点常量 |
| audio | 预加载、混音、空间声音、清理 | 根据去重事件播放，不决定比赛规则 |
| network | 连接、输入、快照/事件适配 | 不依赖具体模型/音效或直接修改权威比分 |

2.4.1 camera 在现有 Physics 上下文中只读 Rapier world，按共用肩部观察点扫描至理想镜头并返回 clear/hit/invalid。开发日志可查看距离，未调整镜头，不新增物理实体或 tick。

2.4.2 camera 根据查询结果收回肩偏移及镜头距离，最终安全包络复查后只写表现相机；查询失败保留上一姿态，仍不修改玩家坐标或物理世界。

2.4.3 距离恢复状态由 camera 自己拥有，依据渲染 dt 规划，并在安全包络复查通过后提交。遇障碍立即收近，向外平滑恢复；目标引用变化/缺失重置，无新增物理 tick、监听器或定时器。

2.5 PointerLockInput 管理鼠标锁定、释放/失败/失焦与后备互斥，Hint 只订阅低频状态。2.6 core 装配 shared/CameraHeading 引用，camera 写 yaw，player 固定物理步读取；game-core 不依赖 DOM。2.7 PlayerFacing 根据碰撞允许的水平位移更新视觉 group，胶囊碰撞体保持原方向，方向标记仅为白盒试玩辅助。

## 依赖和导出

- App/core 负责装配，功能模块不反向依赖 App/core，不产生循环导入。
- 外部调用模块时只从 `<module>/index.ts` 导入公开 API，不深层导入私有实现。index 使用显式命名导出，不集中 `export *` 全部实现。
- camera 等模块需要玩家位置时，通过参数/接口接收数据；network 通过状态/事件接口传递数据，不直接调用 audio 或角色模型。
- 共享协议、配置和资源 ID 在 packages/shared；可重用模拟/武器/生命规则在 packages/game-core。它们不依赖 React、DOM、web 模块或网络传输实现。
- 不建立 src/index.ts 总桶：入口装配按需导入各模块，避免音频、网络、3D 的隐式初始化耦合。
- 资源创建/销毁在各模块生命周期内配对，不在 index.ts 顶层启动监听器、物理世界或网络连接。

任务 0.6 的 pnpm lint 已检查 TS/React Hooks，并限制常见相对路径下功能模块反向导入 App/core、network 直接导入表现模块。尚未自动检查任意深度路径、别名、动态导入、循环依赖或全部私有 API 访问；其余边界仍需代码审查。

2.8 input/AimInput 独立管理右键按住、全局松键和失焦/失锁/隐藏/Esc 清理；core 装配到 camera 和 AimHint，PointerLockInput 的清空回调同时取消键盘与瞄准意图。相机渲染帧只读意图选择共享参数；HUD 只订阅状态变化，无新增物理 tick。

2.11 input/CrosshairInput 订阅锁定/瞄准和窗口生命周期，HUD/Crosshair 以固定 24px SVG 居中显示普通/瞄准样式；非激活或释放/失焦/隐藏时移除，pointer-events:none。没有每帧 React 状态，不通过屏幕准星授予权威命中。

当前3.12.5覆盖旧2.8/3.12.2右键装配：普通步枪以RifleMotion读取实际允许水平位移，2°/3°散布，CrosshairInput当前禁用aim模式，移动准星80px/稳定64px。AimInput仅保留后备输入与后续狙击接口，当前不影响移动/镜头/弹道，HUD采用SpreadHint。

3.12.6：BasicScene外层保存设置/面板和PointerLockInput，SceneSession key重新挂载用于重置训练；面板不拥有物理tick，已接受动作继续。enabled函数同步屏蔽键盘/换弹/镜头请求，release清空输入；返回按钮直接调用request保留用户手势。mouseSettings单处校验/保存倍率，MouseOrbit锁定和拖动读取实时倍率。

3.12.7覆盖上述重置挂载方式：Canvas和SceneSession保留，createTrainingSession生成新训练数据；revision仅用于PhysicsWorld子树重挂载。避免销毁Canvas时首个Html血条容器变空，保留原有occlude规则、输入释放与设置。

3.12.8：trainingSession用TRAINING_RIFLE_AMMO_POLICY创建LocalRifle；核心策略校验/复制，自动换弹在接受最后一发的同一步启动。无限备弹由只读模式表达，数值reserve保持有限初值且不扣减，HUD显示∞/无障碍无限备弹标签；默认LocalRifle和核心保持有限规则，测试不通过UI模拟时间。

3.12.10：CapsulePlayer以result.jumped || !result.grounded发布空中状态；RifleMotion与核心rifleSpreadAngle共同使用水平速度或空中状态，起跳/顶点/下落扩大，落地停稳恢复。UI与实际接受射击读取同一角度，不新增UI计时器；reset释放空中状态。

3.12.11：RifleMotion拥有核心RifleAccuracy，RifleSimulation每物理步调用step(accepted)获得本发kick前散布；HUD读kick后下一发角度，连续张开/收缩，拒绝射击不加bloom。rifleSpreadDirection明确使用中心偏重样本。RifleRecoil增加recoveryDelay，使8/s连射积累至6°，仍在最终相机避障前应用偏移，不改变鼠标基础朝向。

3.12.12：BasicScene只在开发调试复选框打开时装配AimTargetMarker/MuzzleAimDiagnostics。RifleRecoil区分riseAngle与pulseAngle，累计上限不阻止新脉冲；pulse按帧dt立即衰减，hold timer有界以免长失焦dt溢出；FollowCamera只step一次并将总偏移应用到相机，开发日志包含分量。
