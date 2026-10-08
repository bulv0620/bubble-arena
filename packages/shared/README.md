# Shared

协议、运行时校验、配置和资源 ID；不依赖 React、DOM 或服务端。

任务 1.2 建立 @bubble-arena/shared 工作区包，公开 PHYSICS_CONFIG：米/秒、Y 向上，60Hz、1/60 秒、重力 [0,-20,0]。timeStep 由 tickRate 单一常量推导，客户端与后续 Node 服务端使用同一配置。

当前源入口为 src/index.ts，供 Vite/Vitest/TypeScript 消费。Node 20 不直接运行此 TS 文件；服务端任务需要使用 TS loader 或构建器，不能将源入口误认为已发布的 Node JS 构建产物。

任务 1.3 新增 WHITEBOX_CONFIG：80m 地面、1m 厚碰撞、顶面 y=0、1m 测试立方体、初始高度 5m。地图视觉和碰撞，以及真实 Rapier 集成测试引用同一配置。

任务 1.6 添加 MovementKeys 输入契约与 COLLISION_GROUPS；PLAYER_CONFIG 汇集水平速度 5m/s、加速 25m/s²、减速 30m/s²、控制器间隙 0.01m；水平原型出生离地 0.02m 避开接触误差，重力任务随后接入。WHITEBOX_CONFIG 添加一面滑动验证墙的位置/尺寸，视觉与碰撞共用。

任务 1.7 将静态白盒障碍集中为 WHITEBOX_SOLIDS（两墙两箱）。WHITEBOX_COLLISION 为 schemaVersion=1 的可序列化碰撞声明，WHITEBOX_COLLISION_HASH 通过固定字段顺序 JSON 的 UTF-8 内容计算 FNV-1a 64 位标识，当前 fnv1a64:f100071d20585698；材质颜色和历史动态测试立方体不参与哈希。尚未接入联机地图版本拒绝流程。原测试立方体尺寸保留供历史物理回归，已退出可玩场景。

任务 1.8 添加 jumpSpeed=7m/s、airControl=0.35，重力复用 PHYSICS_CONFIG.gravity 的 Y 分量 -20m/s²。出生中心仍为 y=0.92，随后由重力落稳至约 y=0.91；spawnClearance 是初始间隙，不再锁定角色高度。
