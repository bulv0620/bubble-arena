# 复活与出生点（4.6）

2026-10-14 implemented，阶段3 accepted，阶段4尚未关闭。本节覆盖PLAYER_LIFE早期“复活未接入”的历史范围。

## 等待与出生事务

淘汰时记录权威eliminatedTick；默认等待PLAYER_LIFE_CONFIG.respawnDelay=5秒/300tick。PlayerHealthState.advanceTick由模拟推进，整秒发布respawnSecondsRemaining，不使用UI时钟；同一tick先处理伤害/超时淘汰，再复活/移动，最后救援。超时淘汰的起点是原倒地截止tick，即使漏步也不从迟到的观察tick重新等待5秒。finished、旧tick不推进，重复步不重复开始出生。

等待满后eliminated→respawning，revision+1、HP仍0且禁止行动。respawning是选点/清理/位移事务，不追加等待。在同tick调用completeSpawn({lifeId,revision}, tick, apply, matchFinished)：严格普通数据/完整身份/当前状态/旧tick/显式finished守卫；保护终点、lifeId+1/revision+1安全整数在调用apply前校验。apply必须是同步布尔回调。false/异常保留不可操作的respawning，可下一tick重试；同一次回调不能递归出生或推进时钟。只有apply成功才转换normal、lifeId+1/revision+1、100HP、倒地HP0、清除旧原因/倒地/复活计时及伤害/开火去重记录。旧生命事件拒绝，模拟tick和本地枪械效果sequence继续单调，避免特效/靶子命中重放。

RESPAWN_CONFIG单处定义protectionDuration=2秒、clearance=0.005m，严格有限正数/安全tick解析；保护默认120tick，实际接受的主动开火提前结束。免伤/免控制、保护中有效伤害消费去重身份、开火身份/finished守卫沿用4.4.3。只有参数或整秒变化发布UI，不每tick更新HUD。

## 目录与选点

shared/spawn.ts的WHITEBOX_SPAWNS提供红蓝各4个点且每队唯一primary，位置为人物胶囊中心。红队主点复用训练出生X/地面高度，蓝队在背景墙后独立区。目录绑定WHITEBOX_COLLISION_HASH=fnv1a64:5c84d22467198a7b；目录独立哈希WHITEBOX_SPAWN_HASH=fnv1a64:0634c343957c90f1，包括碰撞身份及全部出生点。碰撞几何未改，默认开发物理对象仍12刚体/15碰撞体。正式地图/服务器加载须核对两个版本，不能只更新视觉位置。

parseSpawnCatalog严格验证每队至少4个点/唯一primary、唯一ID、普通冻结坐标/字段及最多32点；parseSpawnEnemies验证最多8个唯一ID、明确红蓝队/生命状态/普通位置。拒绝访问器/稀疏/额外字段等，不做数字强转；解析返回独立深冻结数据。它们是内部权威事实，不是客户端消息schema。

selectSpawnPoint(team, enemies, mapQuery, matchFinished, catalog?)筛除其他队及地图空间不可用的点，计算每点距最近存活敌人的三维中心距离，选择该最小距离最大者。normal/downed敌人都存活，eliminated/respawning及友军不计。无敌人或距离相同优先主点，其余按ID稳定顺序；敌人/目录输入顺序不改变同距结果。数值距离溢出、非布尔地图结果或查询异常不产生有效选择；finished校验参数后不查询地图。

没有可用候选返回标记fallback=true的己方主点；应用前仍重新核对主点胶囊空间与地面支持。敌人/人物不阻塞地图查询，因此敌人靠近不会让有效地图主点不可用，也不会等敌人离开。若地图被破坏/版本异常导致所有点包括主点都塞进几何或没有地面，则不得用保护穿墙出生；保持respawning并在后续tick重新查询、HUD显示等待合法出生点。默认八点均在真实共享白盒地图通过几何检查，不会遇到这个异常分支。

## 物理与单机清理

isSpawnClear使用同一Rapier世界，验证完整人物胶囊+0.005m余量不交地图，并用向下有限射线确认可行走支持。查询忽略dynamic、kinematic人物、sensor；不创建刚体/碰撞体，不依赖Three视觉或训练靶血条。测试覆盖全部八点、墙体边缘/头部空间、空中/地图外、人物/动态体/sensor排除和数量不增长。

LocalRespawn在CapsulePlayer现有before物理回调内完成，排在健康推进后、人物移动前；训练固定红队且无正式敌人，因此传空敌方列表，复用主点。保留同一Canvas/胶囊/控制器，重置HorizontalMovement/VerticalMovement惯性和重力速度；清理键盘/武器/E输入、救援通道/夹具、换弹/散布/冷却/反馈/后坐力，恢复所有武器初始弹匣/数值备弹，训练无限备弹策略保持，保留当前主枪及当前槽位。人物坐标和下一运动学坐标同tick改为出生点，速度归零。复活后必须新输入，不自动续射/开镜/跳跃。相机保留观察角，重置距离避障恢复，直接跟随新位置；没有自动打开/关闭设置或重新捕获鼠标。

训练靶HP/命中次数/减速不随人物复活重置；正式玩家减速入口仍未接入，当前自身没有减速实例，不声称新增了该玩法。训练测试队友仅救援夹具，其生命计时能到respawning并标记待复活，没有正式出生适配；自身复活会清除夹具，正式每个玩家须绑定其出生事务。

## 验证范围

报告 [4.6](../reports/4.6.md) 包含核心/地图/真实装配检查和浏览器证据。当前单机，无正式敌人/球队联机、环境死亡、淘汰归属/计分或新模型/动画；正式资产仍须先完成Blender MCP B.1。下一项4.7计分，4.6完成后停止。
