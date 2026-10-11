# 玩家生命状态机（4.1）

2026-10-11阶段3由用户整体验收通过。4.1只建立纯核心转换守卫与共享配置/类型；训练自身HP、练习靶2秒恢复尚不接入此模型。HP扣减、实际计时、操作门禁、救援资格及合法出生事务按4.2～4.6接入，计分/比赛阶段按4.7～4.9接入。

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

respawning是选点/重置的瞬时事务标记，开始和完成可以在同一模拟tick调用，不额外等待。它不是第二个复活倒计时；4.6负责处理出生点、弹药/保护和异常回退。HP运算与普通/倒地两套血量未在4.1实现，状态机不自行扣血，不把超额站立伤害再次扣到倒地HP。

## 参数与生命周期

配置单处定义于shared/playerLife：downedHp=50、revivedHp=50、downedDuration=20s、rescueDuration=3s、respawnDelay=5s；正常最大HP复用PLAYER_VITALS_CONFIG.maxHp=100。配置严格解析、复制冻结，时长有限正数且换算tick不溢出，救起HP不能超过普通最大HP。时间阈值使用ceil(duration×共享60Hz)，不接受UI dt/计时器作为权威计时。

实例独立，无DOM/React/网络/Rapier依赖、监听器、定时器或事件历史池。新模拟实例重新构造状态；lifeId/revision安全整数耗尽时拒绝转换，不回绕复用身份。后续重开整局由4.10管理，不在本任务实现房间/局状态。

## 检查入口

pnpm test packages/shared/src/playerLife.test.ts packages/game-core/src/playerLifeMachine.test.ts

正常链、救起同一lifeId、复活新lifeId、倒地/救援/复活精确边界、环境直接淘汰、finished全部门禁、重复/错状态/过期、冻结/实例隔离、严格异常及整数耗尽有测试。报告 [4.1](../reports/4.1.md)。目前没有浏览器新增生命交互，不把核心规则测试冒充倒地/救援试玩。
