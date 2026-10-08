# Shared

协议、运行时校验、配置和资源 ID；不依赖 React、DOM 或服务端。当前入口 src/index.ts 供 Vite/Vitest/TypeScript 消费；Node 20 服务端需 TS loader 或构建器，尚未提供发布 JS 产物。

## 基础物理参数（1.11）

规则基线见 ../../docs/GAME_DESIGN.md；调参改这里的源码，不在 React 组件里重复写数值。

| 配置位置 | 参数 / 单位 | 当前值与用途 |
| --- | --- | --- |
| src/physics.ts · PHYSICS_CONFIG | tickRate / Hz；timeStep / 秒 | 60；由 1/tickRate 推导，物理世界与纯运动规则共用 |
| 同上 | gravity / m/s² | [0,-20,0]，Y 向上；垂直规则复用 Y 分量 |
| src/player.ts · PLAYER_CONFIG | speed / m/s | 5，普通移动速度；瞄准尚未实现 |
| 同上 | acceleration / deceleration / m/s² | 25 / 30，输入加速与松键减速 |
| 同上 | jumpSpeed / m/s；airControl / 无量纲 | 7；0.35，空中加减速系数 |
| 同上 | height / radius / capsuleHalfHeight / m | 1.8 / 0.35 / 0.55；半段长由 height/2-radius 推导 |
| 同上 | maxSlopeAngle / slopeAngleTolerance / 弧度 | π/4 / 0.001，约 45° 与 0.0573° 数值容差 |
| 同上 | maxStepHeight / minStepWidth / m | 0.3 / 0.4 |
| 同上 | groundSnapDistance / m | 0.3，仅已接地且未起跳的斜面运动使用 |
| 同上 | controllerOffset / groundProbeDistance / spawnClearance / m | 0.01 / 0.02 / 0.02；后两者由 offset 推导；实际垂直探测为 probe/cos(maxSlopeAngle)≈0.0283 |
| 同上 | slopeSnapMinNormalY / slopeSnapMaxNormalY | 0.5 / 0.99，仅选择吸附，不授予接地资格 |
| 同上 | ceilingDisplacementTolerance / m；ceilingMaxNormalY | 0.00001；-0.5，向上受阻且有向下障碍法线才视为碰顶 |
| src/physics.ts · COLLIDER_MATERIALS | ground friction / restitution | 0.8 / 0，地面原覆盖值 |
| 同上 | solid、player friction / restitution | 各 0.5 / 0，显式保留 Rapier 原默认值 |

摩擦是碰撞体接触系数，角色松键减速由 deceleration 控制；运动学控制器的目标位移不是靠摩擦系数积分生成。改变摩擦不能代替调整加减速。

消费位置：PhysicsWorld 用 PHYSICS_CONFIG，game-core 用 PHYSICS_CONFIG / PLAYER_CONFIG；WhiteboxMap 地面/障碍与 CapsulePlayer 使用 COLLIDER_MATERIALS；RapierMovement 用 PLAYER_CONFIG 配置控制器和容差。颜色、灯光、网格、日志采样频率属于表现或诊断配置，本任务不抽取。

## 地图与输入

WHITEBOX_CONFIG / WHITEBOX_SOLIDS 集中声明 80m 地面、两墙两箱、0.3m 台阶和 45° 坡；台阶高度和坡角引用 PLAYER_CONFIG，视觉与碰撞共用尺寸/旋转。WHITEBOX_COLLISION 的 schemaVersion=2，固定字段顺序 JSON 的 UTF-8 内容生成 FNV-1a 64 位标识，当前 fnv1a64:4abdb29633dc2d14。颜色与历史动态立方体不参与几何哈希，材质系数在共享物理配置中。改尺寸/旋转会改变哈希；联机版本拒绝流程尚未实现。

MovementKeys 是移动意图契约；COLLISION_GROUPS 集中碰撞分组。原 1m / 5m 动态立方体参数保留供历史物理回归，已退出可玩场景。

## 跟随与旋转镜头（2.1 / 2.2 / 2.3）

src/camera.ts 的 CAMERA_CONFIG：普通距离 4.5m（肩部观察点至相机）、右肩偏移 0.55m、观察点高于胶囊中心 0.55m；初始俯角 25°（存为弧度）、FOV 70°、近/远裁切 0.1/200m。camera 每渲染帧只读目标位置，不通过 UI 推动物理 tick。2.2 左键拖动：mouseSensitivity=0.003 弧度/像素、rotationResponse=14/s（指数平滑），肩偏移随 yaw 旋转。2.3 以 minPitch=-60°、maxPitch=70°（存为弧度）替换临时保护；正值表示相机位于观察点上方俯视，负值表示下方仰视。目标角度先限幅再平滑，越界量丢弃，反向拖动立即恢复。瞄准距离、鼠标锁定、镜头避障尚未实现。
