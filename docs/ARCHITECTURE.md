# 工程架构

## 目录职责

apps/web：React 页面/路由、大厅/房间、R3F 渲染、输入、摄像机、动画、音频与 UI。
apps/game-server：Colyseus LobbyRoom、PartyRoom、MatchRoom、权威 tick、协议校验和会话生命周期。
packages/shared：ID、消息 Schema、配置 Schema、武器参数、地图定义/资源 manifest。
packages/game-core：时间步、角色运动接口、生命/救援/武器/比赛规则，可运行于浏览器和 Node。
assets-source：.blend、音频源、制作脚本；assets/exports：审核后的导出件；tools/blender：可复用 bpy 脚本。

依赖：web → shared/game-core；game-server → shared/game-core；game-core → shared。shared 不反向依赖。Node 的业务存储不是首版需求。

## 模拟与表现

输入适配器 → 输入队列 → game-core fixed tick → Rapier adapter → 权威状态/事件 → 快照 → 表现适配器。

模拟的数据是普通结构体，UI 只读取低频投影。Rapier world、角色控制器、事件缓冲、渲染对象生命周期不放 Zustand。web 可采用 R3F Physics 容器，但不让 React 调度控制 tick；阶段 1 固定步长适配要验证未来与 Node 共用接口。

移动配置和地图碰撞声明单处定义；加载同一碰撞 JSON 创建两端 Rapier 世界。动态玩家用运动学胶囊，命中测试独立；默认无玩家互相推动。每 tick 固定顺序：输入 → 移动 → 武器/投射物 → 伤害 → 救援 → 超时淘汰/复活 → 分数与结束 → 事件输出。该顺序解决同帧救起与被击杀竞争。

客户端预测只覆盖自身移动，不提前确认生命/比分。远端使用插值；开火反馈可预测，权威拒绝时校正弹药并丢弃未确认命中提示。

## 房间职责

LobbyRoom 发布可加入 PartyRoom 摘要。PartyRoom 持有房主/成员/准备/规则，是返回房间的稳定容器。开局建立唯一 matchId 并创建 MatchRoom；通过服务端签发的短期入场令牌绑定 playerId/partyId/matchId。客户端不能任意加入比赛。

PartyRoom 记录 loading/playing/finished 状态，比赛期间不对新玩家开放。结算由 MatchRoom 发出，PartyRoom 重置准备；MatchRoom 在所有玩家返回或超时后销毁。重复 start 使用同一个 matchId 或拒绝，不能产生两个实例。

每位玩家最多一个 PartyRoom 和一个关联 MatchRoom；分别记录连接状态，MatchRoom 断线不立即误删 PartyRoom 成员。迁移异常先关闭 MatchRoom 并回滚 PartyRoom，不能留下占用席位。

## 资源与日志

manifest 记录 assetId、version/hash、source、导出文件、动画/节点、碰撞版本、许可记录。加载失败提供回退或返回，不进入错误碰撞场景。每局记录 matchId、tick、事件 ID、结束原因和错误；不记录密码/令牌。资源、事件监听器、Rapier world、音效在退出时释放。

## 版本与工程工具

当前 Node 20.19.3、pnpm 10.12.4 可用于起步；首次安装各库时确认其 engines/peer dependencies，以精确版本和 lockfile 记录结果。版本不兼容时更新工具链决策记录，再安装。避免在准备工作区时提前安装整套未经验证依赖。


4.7当前积分集成：纯核心TeamScoreState只接受权威已结算的整tick淘汰批次，双方分数完整累计后交给后续结束判断。当前训练的单个LocalPlayerHealth在物理before回调内把测试伤害/超时事实送积分，出生成功后注册新lifeId；这不是未来多玩家每人独立同tick调用积分的范式。正式服务器必须汇总全部生命结算后一次提交，身份与来源均由服务器生成，见 [SCORING](spec/SCORING.md)。

4.11对抗Demo：新arena与旧whitebox各自同源碰撞/出生hash。pure ArenaBotBrain仅生成意图，web/Rapier验证移动/LOS/枪口/头身命中；玩家生命在arena模式延后汇总计分，所有角色伤害后一次collect双方淘汰，再MatchResolution。birthClock与积分clock分开，允许同tick出生登记与另一角色淘汰。它是本机模拟原型，未引入网络/DOM到game-core；旧训练继续原适配，详见 [ARENA_DEMO](spec/ARENA_DEMO.md)。
