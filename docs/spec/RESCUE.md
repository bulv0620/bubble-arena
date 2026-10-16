# 救援规则与权威边界

2026-10-16：4.18.3已接入任意队伍的实际玩家/AI，长按E救同队、点E踢爆敌泡，AI自动接近按同规则交互；以下资格/事务保持，持续时间统一2秒。历史：2026-10-14：4.4.1实现资格判定和地图遮挡适配。4.4.2已接入E长按、独占事务、持续复核/中断/2秒进度；4.4.3已接入实际救起、HP与保护，下文4.4.3覆盖历史ready停留行为。4.4.1是资格核心；4.4.2提供单机测试队友与进度HUD。

## 资格

默认中心距上限RESCUE_CONFIG.maxDistance=2m，定义于shared/rescue.ts，可严格解析自定义配置。2秒持续时间沿用PLAYER_LIFE_CONFIG.rescueDuration，不重复配置。

- 必须明确选中另一位已存在玩家，权威查找返回的playerId与目标意图一致；自己、无目标、未知/错误对象均不可救。
- 双方已连接且已分队，teamId同为red或同为blue。无队伍/敌人拒绝。
- 救援者normal并接地；沿用playerActionPolicy.canRescue。目标downed，目标无需接地，允许爬行。
- 三维中心距Math.hypot(dx,dy,dz)≤上限，正好2m允许；高度也计入，无超范围容差。数值计算溢出拒绝。
- 中心到中心的线段无遮挡；仅同版本地图固定实体可遮挡，忽略运动学人物、动态演示物体、sensor及纯视觉效果。实体端点或重叠中心在地图内部拒绝，重叠中心在空地允许。
- 目标当前无救援者，或当前救援者就是自己。已由他人救援时拒绝。比赛finished一律拒绝。

## 接口

shared的RescueEligibilityFacts包含rescuer、target、targetRescuerId、matchFinished。双方事实含playerId、teamId、life（status/lifeId/revision）、中心position、grounded、connected。严格拒绝缺失/额外/符号/访问器/非普通数据对象与非有限数字，不做强制转换；解析生成独立深冻结副本。ID为1～64字符且无空白/控制字符，teamId仅red/blue/null，lifeId正安全整数、revision非负安全整数。此类型用于内部模拟快照投影，不是客户端消息schema；传完整健康快照时必须选出life的三个字段。

```ts
evaluateRescueEligibility(requestedTargetId, facts, isUnobstructed, config?)
```

requestedTargetId是选择意图（string/null），其余必须由权威模拟提供。判定按finished→对象→连接→队伍→状态→接地→占用→范围→遮挡顺序返回首个原因；输入无效先抛错，即使比赛已结束也不跳过校验。地图查询仅在其他条件全部满足后调用一次，参数是冻结的中心位置。查询须返回布尔；错误返回类型或查询异常抛错，不产生成功结果。

成功结果为eligible=true、distance和双方{playerId,lifeId,revision}；失败为eligible=false、reason。结果冻结。没有状态持有、事件历史、监听器或计时器，不推进tick、不修改HP/弹药/生命状态、不占用目标。单次eligible不等于已接受救援或救援完成，不能传入生命状态机当完成事实。

## 物理适配与后续集成

web/player/rescueLineOfSight.ts提供isRescueLineClear(world,from,to)，使用已有Rapier地图碰撞和player查询mask，排除dynamic/kinematic/sensor；没有新刚体或碰撞体。零长度用地图点包含查询，其他情况用solid=true有限线段射线，地图内出发不能穿墙。适配直接读取已同步的world，后续必须在本tick移动/伤害之后的救援步骤调用。

4.4.2已挂入训练会话；未来服务器仍须绑定救援者身份、按请求ID查当前目标、取得当前接地/连接/占用状态，调用判定后原子占用；一个目标不能由两名同tick候选同时开始。每tick重新读取双方事实与遮挡，并比较已保存的lifeId/revision。断线、移动/武器/跳跃意图、受有效伤害、失焦、出范围/遮挡、任一方状态改变等按GAME_DESIGN立即中断清零，不能把上次eligible当持续许可。客户端不得上传有效坐标、接地/队伍、无遮挡、占用或完成。

## 检查与范围

共享解析、核心资格/拒绝/异常/不可变结果、真实共享白盒墙体/绕墙/人物与sensor排除有回归；编译期拒绝缺门禁、用bool代替地图查询、客户端对象/进度冒充事实。地图hash维持fnv1a64:5c84d22467198a7b。

4.4.1仅资格；4.4.2提供E进度条，4.4.3已接入实际救起。报告 [4.4.1](../reports/4.4.1.md)。

## 4.4.2 进度与独占

RescueProgress.step(tick, frame, mapQuery)一次接收整个权威tick的玩家事实、救援输入、当tick有效受伤playerId列表和显式finished门禁。shared/parseRescueProgressFrame要求稠密普通数据数组、所有布尔意图、唯一且已存在的控制/受伤玩家ID，最多8玩家/输入/受伤ID；拒绝未知字段/访问器/重复/稀疏/超容量。不是网络协议，客户端不能提供此帧的玩家事实或有效受伤列表。

每tick先复核原占用者，再按稳定playerId顺序接受新候选；一人最多救一人、一目标最多有一个占用者。同tick两名候选不叠加；原占用者即使ID较大也优先，释放后新候选可以从1tick开始。保存双方playerId/lifeId/revision，逐步重新验证4.4.1资格，旧生命/新revision或切换目标中断。松键、active=false、任意方向/跳/开火/换弹/切枪/开镜意图、任一方有效受伤、断线/状态/队伍资格失效、出范围/地图遮挡/finished均清零释放。动作尝试在执行门禁之前独立采集，不能因动作被禁止而漏掉中断。

成功接受的第一步累计1，默认180连续tick变ready=true，最高180，不继续增长；首次达成产生ready事件，持续持按不重复产生新事件。ready仅表示2秒进度达成，step自身不修改HP/生命/保护；当前4.4.3由装配器同tick消费完成并立即释放操作暂停。中断后必须观察到E已松开，再重新按下；不会自动续救。事件只存在当前快照，消费方必须按已处理tick/生命身份去重，不能重复消费旧快照。

旧tick/重复tick返回原快照，不重复推进或查询地图；跳过tick视为连续性丢失，清零并要求松键。非法新帧或查询异常会清空占用/进度、丢弃本tick暂存ready事件后抛错；非法tick自身拒绝推进。clear/退出/重置释放所有通道和中断锁，无计时器/事件历史，实例隔离。

## 单机接入与试玩

RescueSimulation在useAfterPhysicsStep读当前人物中心及移动适配器接地结果，在现有武器/伤害后推进进度；UI只提交场景选择意图并订阅状态。Rapier类Vector先投影为普通数据坐标，资格解析仍严格。救援中LocalLoadout.rescuing使canOperate=false、移速和HorizontalMovement惯性上限0、禁止跳跃/武器，取消装填/关闭镜圈；绑定清掉武器动作与排队跳跃，保留E/方向采集用于中断。结束恢复原武器重量速度/原弹药，禁止的动作不自动排队执行，须新动作。镜头仍可观察；未锁定左键拖动只按观察处理，不冒充开火中断。

Esc的“救援练习 · 单机测试”默认关闭；静止倒地队友/救援中向外爬行/1秒后受到伤害可选。模式意图在物理步中生成唯一测试队友，位置取当前中心+(0.8,0,-1)m；向外场景按1m/s移动直到出范围，受伤场景在60步后排队真实20伤害并由健康模拟消费。共享TRAINING_RESCUE_CONFIG是夹具参数，不是正式出生点/AI/网络配置。

测试队友是阶段4无碰撞占位，使用现有站立分块外形和真实PlayerHealthState，初始倒地50，当前连续救援2秒后正常50HP；不参加靶子伤害/正式比赛，不制作正式模型/爬行动画。无额外刚体/碰撞体，地图hash沿用。HUD在上方显示进度与中断原因，避免覆盖人物/准星；自己倒地时保留生命提示；队友救我模式另显示接收救援的进度，置于生命提示下方。重置清理队友/进度，恢复100HP/弹药及普通控制，保留鼠标速度/主枪，Canvas/Html宿主沿用。训练模式变化不持久化。

试玩：Esc选静止队友→返回→长按E2秒，观察进度和0移速/武器暂停，松键清零恢复。再次按E并按方向/Space/R/1/2或武器操作可中断。另选爬行场景或受伤场景可独立验证自动中断，受伤后自身HP变80。当前2秒结束会实际救起并获得1秒保护。报告 [4.4.2](../reports/4.4.2.md)。


## 4.4.3 救援完成与保护

RescueProgress.complete(tick, rescuerId, apply, matchFinished)只能消费本实例当前tick的私有ready通道。调用者必须在step之后同tick同步调用，不能传入保存的通道或客户端完成事实。先释放通道/目标占用，再由原子健康回调复核当前目标身份与状态；完成只产生一次completed事件，重复/旧tick/提前调用不执行回调。finished或回调拒绝/异常释放并产生中断，异常继续抛出。完成后无需等E松开即可恢复普通移动和武器；再次救援仍须松开E。单帧松键在本tick取消后即清除重按锁，设置暂停/返回不会残留锁。

PlayerHealthState.completeRescue接收内部{lifeId, revision, elapsedTicks}，验证当前downed/身份一致/不少于180tick/非旧tick/非finished。成功normal、普通HP=PLAYER_LIFE_CONFIG.revivedHp（默认50）、downedHp=0、lastDamage=0、revision+1；lifeId不变，不操作位置/武器/弹药。保护终点整数溢出在任何状态变化前拒绝。未来服务器必须自行消费真实通道并生成这个事实，不能公开为客户端命令。

RESCUE_PROTECTION_CONFIG.duration=1s在shared/rescueProtection.ts单处严格解析冻结，沿用60Hz，救起tick至终点前共60tick免伤/免控制。advanceProtection仅由权威物理tick推进，无UI计时器；终点tick已可受伤。保护内合法伤害不扣血，但消费受击sequence/tick，不能等保护结束重放；旧tick/生命/重复/finished继续拒绝。canReceiveControl和canCauseControl提供接收/产生控制门禁，保护期间已飞行的自身泡泡仍有原伤害但不产生范围减速。现有训练泡泡已接产生控制门禁，正式玩家受到减速的入口尚待后续玩法接入，不声称联机控制已实现。

只有武器核心实际接受的开火调用onAcceptedFire({lifeId, revision, tick, sequence}, matchFinished)，在命中/泡泡结算前结束保护；装填/冷却/倒地拒绝的点击不结束，重复/旧生命/旧revision/旧tick不生效。到期后开火可清除过期快照，但不会记为主动提前结束。保护期间HUD生命条金色并显示保护，结束后恢复正常颜色。

单机夹具的队友使用独立真实健康状态；“队友救我（先击倒自己）”以同一个救援核心和地图查询，让接地队友在玩家倒地且游戏输入active时持续救援。Esc/失焦先中断，返回重新累计2秒；玩家仍可按倒地规则1m/s爬行，越过2m中断。有效受伤用独立damageRevision辨识，恢复生命或保护到期不会被误认为受伤；再次击倒清除旧完成提示。重置创建全新实例、清理通道/保护/夹具并恢复原训练，订阅与对象释放沿用。

试玩：静止队友→返回→持E2秒，观察队友倒地50→正常50/100和短暂金色保护，自己立即恢复普通控制。队友救我→击倒→返回，2秒后自身50HP，原弹药/选枪不变；保护内受伤按钮不扣血，到期后20伤害变30HP。救起后立即实际射击，保护提前结束。报告 [4.4.3](../reports/4.4.3.md)。未实现4.5补刀/20秒淘汰、4.6复活或正式救援动画/联机。


4.5集成（2026-10-14）：真实自身/测试队友倒地20秒到期淘汰；补刀有效伤害中断救援，截止前完成才能救起。计时先于后置救援，到期身份/状态失效立即释放占用；救起清除旧计时，再倒地重新20秒。当前覆盖前文“未实现4.5”的历史范围，细则见 [PLAYER_LIFE](PLAYER_LIFE.md)。


4.6集成（2026-10-14）：自身自动复活时清理救援通道/中断锁及单机夹具，恢复新生命正常操作，不能用旧lifeId/revision续救。测试队友仍是救援夹具，到respawning标记待复活，自身复活清除它；不把无碰撞夹具冒称完整联机玩家。
