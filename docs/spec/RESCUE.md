# 救援规则与权威边界

2026-10-14：4.4.1实现资格判定和地图遮挡适配。4.4.2负责E长按、独占事务、持续复核/中断/3秒进度；4.4.3负责实际救起、HP与保护。本项没有新增浏览器交互或模拟队友。

## 资格

默认中心距上限RESCUE_CONFIG.maxDistance=2m，定义于shared/rescue.ts，可严格解析自定义配置。3秒持续时间沿用PLAYER_LIFE_CONFIG.rescueDuration，不重复配置。

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

当前接口未挂入训练会话/UI。4.4.2接入时，服务器/本地模拟应绑定救援者身份、按请求ID查当前目标、取得当前接地/连接/占用状态，调用判定后原子占用；一个目标不能由两名同tick候选同时开始。每tick重新读取双方事实与遮挡，并比较已保存的lifeId/revision。断线、移动/武器/跳跃意图、受有效伤害、失焦、出范围/遮挡、任一方状态改变等按GAME_DESIGN立即中断清零，不能把上次eligible当持续许可。客户端不得上传有效坐标、接地/队伍、无遮挡、占用或完成。

## 检查与范围

共享解析、核心资格/拒绝/异常/不可变结果、真实共享白盒墙体/绕墙/人物与sensor排除有回归；编译期拒绝缺门禁、用bool代替地图查询、客户端对象/进度冒充事实。地图hash维持fnv1a64:5c84d22467198a7b。

本项未改变画面、输入和完整救援玩法，不提供E进度条或救起效果；真实E长按与视觉验收在4.4.2以后进行。报告 [4.4.1](../reports/4.4.1.md)。
