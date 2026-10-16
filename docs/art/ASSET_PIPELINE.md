# 美术与资产规范

## 风格

原创圆润低模卡通、清晰大色块、轻描边/柔和阴影；红蓝队有材质颜色与额外图形标识。武器夸张但枪口和握持位置清晰。地图用暖色建筑、冷色阴影，掩体与背景可区分；不复制参考游戏的角色/模型/贴图。

## 单位与命名

Blender 用米制 1 单位=1m，Z 向上。GLB 导出启用 +Y Up；运行时 Y 向上，角色统一面向 +Z，weapon muzzle 局部 +Z 发射。建模阶段使用朝向标记并在导出后验证，避免重复坐标转换。模型应用 scale=1，静态物体应用旋转；骨骼变换在绑定前确认，不在绑定后随意 apply。

角色原点脚底中心；武器原点主握把，节点 grip_main/grip_support/muzzle；角色挂点 weapon_socket 在右手，逻辑枪口按标准姿态/配置计算，不能依赖客户端动画作为命中来源。

4.18.6.1角色比例合同：总高1.4m、大头短身，头高约50%，水平形体不超当前0.35m运动半径；正式手脚与骨架在B.3通过Blender MCP制作，遵循[当前构图](../spec/CAMERA_FRAMING.md)，不得回用旧1.8m长身比例。当前仅共享工程占位已调整，未交付正式模型。

角色动画 clips：idle/run/jump/fall/land/aim/fire/reload/downed/crawl/revive。移动动画 in-place，不用 root motion 驱动坐标。不同武器可有 reload 变体并由 manifest 指定；动作长度不决定权威换弹时间。

地图集合 VISUAL/COLLISION/SPAWNS。碰撞节点 col_*，出生节点 spawn_red_01/spawn_blue_01 等。简化碰撞导出到 shared 地图 JSON（位置、尺寸、旋转/顶点），两端使用相同文件/hash。场景禁止有视觉墙无碰撞或反之。

## 初始预算

| 资产 | 三角形 | 材质 | 纹理 | 导出预算 |
| --- | --- | --- | --- | --- |
| 角色含骨架 | ≤12k | ≤3 | 最多 2×1024 | ≤3MB |
| 单枪 | ≤4k | ≤2 | ≤1024 | ≤1MB |
| 地图 | ≤150k 可见 | 复用 ≤12 | 复用 ≤2048 | ≤10MB |

预算是目标，正式性能验证决定是否调整。先使用 glTF 标准 PBR 材质/PNG，不引入压缩扩展；完成加载链路后按体积实测增加压缩，保留未压缩源。

## 路径与注册

assets-source/<类别>/<assetId>/<assetId>.blend；tools/blender/<assetId>.py；assets/exports/<assetId>/<version>.glb。注册 assets/manifest.json：assetId/kind/version/file/source/licenseRecord/nodes/animations/budgetStatus。发布任务将审核件复制到 apps/web/public/assets，不让客户端运行时读取 Blender 源文件。

占位资源可空 manifest，不能填不存在的文件。每个导出件需 license 记录，包括完全原创资产的制作来源、作者/工具和引用情况。大型 .blend/GLB/纹理在 B.1 验证 LFS 后纳入版本控制；Git LFS 不是工作区初始化的假定依赖。

## 地图计划

small_town：80×80m 白盒核心；两侧出生区、左右路线、中央广场掩体。出生到中心约 8～12s，出生视野不直通敌出生点；跳跃高度/台阶遵守控制器参数。
seaside：同量级场地，浅色码头/建筑/平台，水为不可行走边界；无游泳和水下玩法。
arena：第三图 V1.1，复用模块验证 4v4；不阻断 V1。

## 导出检查

尺寸/朝向、原点、挂点、动画名/循环、法线/UV、材质、预算、遮挡、碰撞、出生点、失败回退均有实际记录。截图不能替代 GLB 加载测试，GLB 正常显示不能替代权威碰撞测试。
