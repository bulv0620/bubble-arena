# 玩家生命状态机（4.1～4.4.3）

2026-10-11阶段3由用户整体验收通过。4.1建立纯核心转换守卫与共享配置/类型；4.2已接入普通玩家HP扣减与归零转倒地，训练靶仍独立2秒恢复。4.3已接入倒地操作门禁和1m/s移动；实际计时、救援资格及合法出生事务按4.4～4.6接入，计分/比赛阶段按4.7～4.9接入。

## 状态与内部事实

PlayerLifeMachine默认从normal、lifeId=1、revision=0开始；getSnapshot返回冻结稳定引用，无变化时不替换。PlayerLifeEvent仅是权威模拟器已结算事实，不是客户端命令或网络消息，不能让客户端提交HP、经过tick数、救援/出生完成。后续服务器必须自行判定实际伤害、计时、队伍/距离/接地/无遮挡与合法选点。

| 当前状态 | 内部事实及本模块条件 | 下一状态 |
| --- | --- | --- |
| normal | hp_depleted且已结算当前HP=0 | downed |
| downed | hp_depleted且独立倒地HP=0 | eliminated |
| downed | downed_timeout且倒地已过≥1200tick/20s | eliminated |
| downed | rescue_completed且已由救援模块确认连续合格救援≥180tick/3s | normal |
| normal或downed | environment_death已由环境模块确认 | eliminated |
| eliminated | respawn_due且淘汰已过≥300tick/5s | respawning |
| respawning | spawn_completed已由出生模块确认选点/重置完成 | normal，lifeId+1 |

每次事实带当前lifeId与revision；只有两者都匹配才可能转换，每次成功revision+1。重复、跨生命、救起后重放旧HP归零、状态不适用及提前计时事件返回false、保留原快照。输入形状/字段/数字非法则抛错且不更改状态；每次转换必须显式传matchFinished布尔门禁，true冻结所有生命转换。

respawning是选点/重置的瞬时事务标记，开始和完成可以在同一模拟tick调用，不额外等待。它不是第二个复活倒计时；4.6负责处理出生点、弹药/保护和异常回退。4.1状态机不自行扣血；4.2的PlayerHealthState维护普通与倒地独立血量，超额站立伤害不会再次扣到倒地HP。

## 参数与生命周期

配置单处定义于shared/playerLife：downedHp=50、revivedHp=50、downedDuration=20s、rescueDuration=3s、respawnDelay=5s；正常最大HP复用PLAYER_VITALS_CONFIG.maxHp=100。配置严格解析、复制冻结，时长有限正数且换算tick不溢出，救起HP不能超过普通最大HP。时间阈值使用ceil(duration×共享60Hz)，不接受UI dt/计时器作为权威计时。

实例独立，无DOM/React/网络/Rapier依赖、监听器、定时器或事件历史池。新模拟实例重新构造状态；lifeId/revision安全整数耗尽时拒绝转换，不回绕复用身份。后续重开整局由4.10管理，不在本任务实现房间/局状态。

## 检查入口

pnpm test packages/shared/src/playerLife.test.ts packages/game-core/src/playerLifeMachine.test.ts

正常链、救起同一lifeId、复活新lifeId、倒地/救援/复活精确边界、环境直接淘汰、finished全部门禁、重复/错状态/过期、冻结/实例隔离、严格异常及整数耗尽有测试。报告 [4.1](../reports/4.1.md)。目前没有浏览器新增生命交互，不把核心规则测试冒充倒地/救援试玩。

## 4.2 普通受伤与倒地接入

PlayerHealthState.receiveDamage(identity, resolvedDamage, matchFinished)处理已结算的普通伤害，三个输入字段为lifeId/tick/sequence（sequence为每个受击玩家的权威结算顺序，不是不同攻击者各自的枪械序号）。字段严格校验，damage为正安全整数，门禁必须显式布尔；finished/错生命/重复/旧tick/非normal状态拒绝且快照不变。伤害裁剪剩余普通HP，lastDamage为实际扣除；普通HP=0同次调用触发4.1状态机downed，初始化独立downedHp=50并保留lifeId/人物位置/弹药，超额伤害不穿入倒地池。

当前4.2只接入普通伤害，倒地后的补刀/计时/救援/复活分别待4.5/4.4/4.6；不提前倒地后继续扣血或自动重生。操作门禁/1m/s移动由4.3接入，当前人物占位姿态仍沿用。4.2实现范围不等于完整倒地玩法。

本地训练LocalPlayerHealth只收hit/down测试意图，最多暂存1个，物理useBeforePhysicsStep消费后生成受击身份并读取共享TRAINING_PLAYER_HEALTH_CONFIG的固定20/100伤害，UI不直接写HP或推进模拟。Esc面板提供受伤（20）/击倒测试；头顶与边缘HUD订阅同一冻结快照，倒地展示50/50倒地生命，普通HP保留0，颜色转橙。通过重置训练重新测试，保留设置/所选主枪并创建新健康状态；Canvas/Html宿主保持挂载。

订阅取消与pending清理幂等，无新增计时器/碰撞体/敌人/联机；训练测试按钮只适用于当前单机场景，不能接入正式服务器作为damage命令。报告 [4.2](../reports/4.2.md)。

## 4.3 倒地操作限制

共享PLAYER_LIFE_CONTROL_CONFIG.downedSpeed=1m/s。game-core/playerActionPolicy按模拟生命状态给出移动、跳跃、武器、救援门禁及绝对水平速度上限；normal沿用当前武器重量，downed可移动和转镜头但不跳、不用武器、不救人。eliminated/respawning仅定义无操作策略，实际触发仍待后续任务。

CapsulePlayer每物理步读取健康状态，消费并丢弃被禁止的跳跃意图；HorizontalMovement在目标速度与已有水平惯性上都施加限速，倒地第一步即≤1m/s，斜向/空中不获得额外速度。保留同一Rapier人物/控制器、胶囊和重力，空中倒地自然落地，不瞬移或取消已发生的竖向速度。Rapier碰撞纠正允许毫米级水平/竖向偏差，不等于新增跳跃或额外奔跑。

LocalPlayerHealth状态通知同步更新LocalLoadout并清除开火、换弹、切枪、瞄准和已排队跳跃，保留WASD；取消所有枪的装填，不补弹、不改变备弹/武器选择。后坐力和枪口反馈清空，已发射泡泡继续扫掠/碰撞结算。输入采集、loadout直接API和WeaponFireState逐tick均拒绝被禁止的动作，包括空匣自动装填与装填完成tick；冷却时间继续推进，不排队恢复开火/开镜。右键、1/2、R以及设置更换主枪均不可绕过倒地限制。

倒地隐藏准星/进度环/举枪占位，保留橙色头顶/边缘倒地HP并显示“已倒地”和可用操作。Esc设置、鼠标速度、返回、重置仍可用。重置重新创建训练健康/武器状态，恢复正常控制与弹药；Canvas/Html宿主保持挂载。绑定和输入取消订阅幂等，无额外计时器/碰撞体。

本任务实现操作限制，未制作正式爬行动画/低姿胶囊，角色仍使用现有站立分块占位。救援、倒地受伤/20秒计时、复活分别待4.4/4.5/4.6，当前只能通过训练重置恢复。未来权威模拟必须由服务器自身生命状态选择策略，不能接受客户端传actionsAllowed绕过规则。报告 [4.3](../reports/4.3.md)。

## 4.4.1 救援资格

纯核心救援资格与2m三维中心距/同队/接地/连接/状态/目标身份/占用/finished、真实地图无遮挡查询已完成，见 [RESCUE](RESCUE.md)。本项不计时/占用/救起、不添加E或队友表现；4.4.2继续进度与中断，4.4.3才修改健康状态。

## 4.4.2 救援进度

180连续物理步累计、唯一占用、持续生命身份/资格校验、中断释放/清零和重新按E门禁已接入核心及单机测试队友；救援中移速0与武器暂停，Esc场景选择/HUD/重置完成。详见 [RESCUE](RESCUE.md)。本项ready不调用生命转换，不改变目标HP，4.4.3才接入救起与保护。


## 4.4.3 实际救起

真实180tick通道同tick只消费一次，PlayerHealthState恢复normal/50HP/倒地HP0并增加revision；生命ID、人物位置、选枪与弹药保留。救起后1秒（60tick）免伤/免控制，实际接受的主动开火提前结束保护。保护中忽略的有效伤害仍消费去重身份，不能延后重放；保护时钟/开火/完成均显式finished与严格身份门禁。规则、当前单机两种救援方向及控制接入范围见 [RESCUE](RESCUE.md)，报告 [4.4.3](../reports/4.4.3.md)。前文4.2/4.3的“只能重置恢复”是历史范围，当前已能被救起；倒地补刀/20秒淘汰及复活分别仍待4.5/4.6。
