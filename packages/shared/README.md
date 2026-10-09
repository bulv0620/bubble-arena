# Shared

3.12.1训练靶配置version2，TRAINING_TARGET_LAYOUT为左右中三个唯一ID/位置，TRAINING_RANGE_CONFIG声明训练区出生点；whitebox新增range-backdrop并分散箱/台阶/坡位置，视觉与碰撞同源。当前碰撞hash为fnv1a64:5c84d22467198a7b；下文旧哈希是历史记录。

3.10 PLAYER_VITALS_CONFIG定义自身初始100HP。3.12 RIFLE_RECOIL_CONFIG采用单发1°/最大4°/回落7/s，createRifleRecoilTuning校验有限非负角度、最大角大于等于单发且不超过90°、正回落响应；独立冻结配置支持0关闭反馈。只决定表现，生命转换和服务器规则在后续阶段接入。

3.3 FireIntent 是只读操作意图接口：held 表示持续按住，pressed 表示上次读取后合并的按下沿；不携带坐标、伤害、弹药或客户端判定。当前尚未进入网络协议，后续网络入口需运行时消息验证。

3.1 已提供 weapons.ts：WeaponId、只读 WeaponConfig、isWeaponId、parseWeaponConfig 和 WEAPON_CONFIGS。伤害为正有限数值（霰弹按单粒）；fireRate 为次/秒，range 为米，reloadDuration 为秒；magazineSize 为正安全整数，reserveAmmo 为非负安全整数。解析拒绝缺失/额外字段、非法 ID、强制转换值和访问器，返回冻结副本；四武器基础默认值与 GAME_DESIGN 对齐，无弹药状态、射击机制或客户端伤害授权。

当前镜头基线已于 2026-10-09 按用户反馈更新（2.11.1）：观察点 1.1m、初始俯角 8°、瞄准 3.4m/60°/0.65m，普通 4.5m/70°/0.55m 保持。下文 2.1/2.8 参数属于历史交付；当前以 CAMERA_CONFIG、GAME_DESIGN 为准。

协议、运行时校验、配置和资源 ID；不依赖 React、DOM 或服务端。当前入口 src/index.ts 供 Vite/Vitest/TypeScript 消费；Node 20 服务端需 TS loader 或构建器，尚未提供发布 JS 产物。

## 基础物理参数（1.11）

规则基线见 ../../docs/GAME_DESIGN.md；调参改这里的源码，不在 React 组件里重复写数值。

| 配置位置 | 参数 / 单位 | 当前值与用途 |
| --- | --- | --- |
| src/physics.ts · PHYSICS_CONFIG | tickRate / Hz；timeStep / 秒 | 60；由 1/tickRate 推导，物理世界与纯运动规则共用 |
| 同上 | gravity / m/s² | [0,-20,0]，Y 向上；垂直规则复用 Y 分量 |
| src/player.ts · PLAYER_CONFIG | speed / m/s | 5，普通移动速度；aimSpeed=3.5 瞄准速度已接入 |
| 同上 | acceleration / deceleration / m/s² | 25 / 30，输入加速与松键减速 |
| 同上 | jumpSpeed / m/s；airControl / 无量纲 | 7；0.35，空中加减速系数 |
| 同上 | turnResponse / 1/s；turnMinSpeed / m/s | 12；0.05，仅视觉转向与接触噪声过滤，不改变速度/碰撞 |
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

2.6 CameraHeading 只含 yaw 弧度意图，由 camera 发布后交给固定物理步计算镜头相对目标速度；pitch 不进入该接口，客户端不提交有效坐标。2.7 turnResponse/turnMinSpeed 由 player 表现适配消费，依据实际允许位移只转视觉 group，不旋转物理胶囊。

## 跟随与旋转镜头（2.1 / 2.2 / 2.3）

src/camera.ts 的 CAMERA_CONFIG：普通距离 4.5m（肩部观察点至相机）、右肩偏移 0.55m、观察点高于胶囊中心 0.55m；初始俯角 25°（存为弧度）、FOV 70°、近/远裁切 0.1/200m。camera 每渲染帧只读目标位置，不通过 UI 推动物理 tick。2.2 左键拖动：mouseSensitivity=0.003 弧度/像素、rotationResponse=14/s（指数平滑），肩偏移随 yaw 旋转。2.3 以 minPitch=-60°、maxPitch=70°（存为弧度）替换临时保护；正值表示相机位于观察点上方俯视，负值表示下方仰视。目标角度先限幅再平滑，越界量丢弃，反向拖动立即恢复。后续 2.4～2.8 已接入避障、锁定和瞄准，见下文。

2.4.1 球形扫描使用 obstacleRadius=0.2m、obstacleClearance=0.05m。扫描从肩部观察点到理想相机，单位方向让 Rapier TOI 表示米；命中距离是球心移动到球面距障碍保留 clearance 的距离，不是表面射线距离。只查询现有静态地图碰撞体，排除角色/动态物体/传感器，不添加球碰撞体、不调整相机；缩短与恢复留到 2.4.2/2.4.3。

2.4.2 已接入即时避障：先从角色上部中心检测肩偏移并收回越墙的观察点，再沿镜头方向缩短到安全距离；obstacleContactEpsilon=0.001m 只处理接触数值误差，不重复扣除 0.05m 余量。末端复查半径+余量包络。无障碍即时回到 4.5m，2.4.3 再实现渐进恢复。极近距离允许收到 0m；不以最小距离强行穿墙。异常/中心锚点重叠拒绝更新，组件保留上一相机姿态。

2.4.3 已替换上述即时恢复：recoveryResponse=5/s、recoveryDelay=0.1s、recoveryMaxDelta=0.1s、recoveryEpsilon=0.005m。距离向内立即响应，处在安全上限时刷新等待，持续放宽后指数恢复；5mm 内收敛到目标。单帧恢复时间上限用于暂停返回，30/60Hz 正常等时响应一致。状态只在碰撞复查通过后提交，目标丢失/切换和组件重建重置；不平滑物理坐标。

2.5 已接入鼠标锁定，使用同一灵敏度；本机 Chrome 点击/Esc 释放实测通过，内置浏览器拒绝锁定时提示并启用后备左键拖动。2.8 已接入瞄准镜头。

2.8 右键持按的瞄准意图选择 aimDistance=2.5m、aimFov=55°、aimShoulderOffset=0.8m（推荐试玩初值）；松开回普通配置。肩偏移/FOV 即时切换，距离沿用向内即时、向外安全渐进恢复；两种模式共用完整肩偏移和轨道避障。此为 2.8 边界；2.9/2.10 后续已接入瞄准朝向及速度。

2.10 createMovementTuning(overrides) 创建不可变、独立快照：speed/aimSpeed/acceleration/deceleration/turnResponse 有限且 >0，airControl 在 [0,1]，turnMinSpeed 有限且 >=0。默认值只有 PLAYER_CONFIG 一处；无效值在模拟创建前抛 RangeError。MovementKeys.aiming 为可选意图，省略则普通；不是客户端有效速度。HorizontalMovement/RapierMovement 构造可传覆盖参数，PlayerFacing 构造仅接受转向参数；既有物理 step/碰撞接口不改。
