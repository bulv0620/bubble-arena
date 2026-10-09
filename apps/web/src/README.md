# 客户端模块边界

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
