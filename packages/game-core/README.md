# Game core

3.5 RifleFireState.step(FireIntent, reloadPressed=false) 接受布尔换弹意图，快照增加 reloading。步枪共享 2s 对应 120 tick，期间禁止开火/重启，完成时按缺弹量和有限备弹转入；开始/结束 tick 均不射击，后续持按可恢复但不积压短点击。满匣/无备弹不启动。清空输入不取消已经接受的换弹，死亡取消待生命阶段。


3.4 RifleFireState 是仅步枪的固定步规则：step(FireIntent) 一次对应共享 60Hz 的一 tick，接受返回 tick/sequence，本次扣一发，否则 null；getState 返回不可变弹匣/备弹/累计接受数。8/s 用小数 tick 相位保留平均射速，落到计划时刻后的首 tick（量化 <1 tick），每步最多一次，不追补空闲射击。松键/取消后冷却仍继续，冷却期单击不队列，空弹不补入备弹。仅本地原型由客户端运行，未来服务器独立执行同一规则，不接收客户端扣弹结果或配置。3.4 时尚无换弹/命中。

固定步长规则、运动与武器状态机；通过适配器连接 Rapier，不依赖 UI。

任务 1.6 提供 HorizontalMovement：WASD 意图归一化，按共享 60Hz 步长计算水平加速/减速后的目标位移，无 React、DOM 或 Rapier 依赖。碰撞允许位移由 web 的 RapierMovement 适配器计算，未来服务端可复用同一运动规则和适配逻辑。

任务 2.6 在目标速度计算前使用 cameraYaw 旋转 WASD，保持当前速度在世界坐标中，再应用原加减速。默认 yaw=0 保留旧测试，非法 yaw 回退 0；不接收 pitch。有效位移仍由物理适配器计算，客户端 yaw 只是操作意图。

当前私有工作区包导出 TS 源码，由 Vite/Vitest/TypeScript 消费；Node 20 服务端需要 TS loader 或构建器，尚未提供发布 JS 产物。

任务 1.8 提供 VerticalMovement：可配置的负重力/正起跳速度、固定步积分、向上碰撞和落地后的速度归零；接地反馈来自物理适配器，不由 React 管理。HorizontalMovement 可接收控制系数，适配器在空中使用共享 airControl=0.35。1.9 已完成接地边界验证，1.10 已配置坡度/台阶；1.11 将碰顶位移容差统一读取 PLAYER_CONFIG。摩擦与恢复系数由适配层的共享 COLLIDER_MATERIALS 消费，不用于替代纯运动规则的加减速。

2.10 HorizontalMovement 构造可传 MovementTuning 覆盖，经过共享 createMovementTuning 校验和不可变快照；step 的物理接口不改。MovementKeys.aiming 为可选布尔意图，省略走普通速度 5m/s，true 走 aimSpeed=3.5m/s，切换目标速度仍走原加速；控制比例限制 [0,1]，非有限比例置 0，避免坏输入污染速度。无 DOM/React/网络依赖。
