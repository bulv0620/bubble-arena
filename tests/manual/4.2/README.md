# 4.2 玩家受伤与倒地实测

独立IAB开发5173/生产4173，真实UI输入/物理步、只读日志和DOM，不注入状态，截图未编辑。

- hit.txt/hit.png：实际受伤100→80；downed-settings.png/downed.png：再击倒后头顶与边缘显示倒地50/50。
- before-camera.json/after-camera.json：离开出生点后受伤前/倒地后人物位置完全一致，未重生。
- health.json：模拟钩子输出normal80→downed、普通hp0/倒地hp50/lifeId1/revision1/lastDamage80。
- physics.json：真实60Hz、12刚体15碰撞体、原地图hash。
- production-hits.json/production-downed.txt/production-downed.png：狙击实际5→4后，连续五次20依次80/60/40/20/倒地50，ammo仍4∞。
- compact-settings.png：800×600滚动设置面板，测试后reset viewport。
- resets.json：连续三次重置，四条头顶血条满血、所选狙击/5∞保留。
- reset.txt/reset.png：最终步枪30∞/自身100/三靶100。
- errors.json/dev-errors.json：error=[]；check.txt：实际完整check，62文件404测试。

当前只实现状态/血量，不冒称已接入倒地姿态、爬行/禁射、救援、补刀计时或复活；分别属于后续任务。内置锁鼠拒绝走已有后备输入，不声称桌面锁鼠实测。
