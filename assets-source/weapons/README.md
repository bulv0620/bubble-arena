# 四把水枪美术与建模参考

4.14 使用 imagegen 技能和内置 image_gen 生成四张原创透明 PNG。完整提示词、原始路径与工具模式见 [generation-v1.json](generation-v1.json)，尺寸/字节/哈希见 [manifest](../../assets/manifest.json)。每张为侧视、俯视、正面三个视图；顶部侧视区域由 CSS 裁切显示在武器栏，原始三视图完整保留，没有图像后处理或额外外部生成平台。

| 槽位 | 武器参考 | 设计特征 | 对应后续任务 |
| --- | --- | --- | --- |
| 1 | [步枪三视图](../../apps/web/public/ui/weapons/rifle-views-v1.png) | 白/蓝中型水枪、青色水罐、珊瑚喷嘴 | B.4 |
| 2 | [霰弹三视图](../../apps/web/public/ui/weapons/shotgun-views-v1.png) | 橙白短粗双喷口、青色压力罐 | B.5 |
| 3 | [狙击三视图](../../apps/web/public/ui/weapons/sniper-views-v1.png) | 长蓝白枪身、金色镜圈、下置水罐 | B.6 |
| 4 | [泡泡三视图](../../apps/web/public/ui/weapons/bubble-views-v1.png) | 紫白短枪、球形透明水仓、四格指示 | B.7 |

这些是视觉概念参考，生成图的各视图可能存在结构/投影差异，不能当作经过尺寸校准的工程图。后续 B.2/B.4–B.7 通过 Blender MCP 建模时统一比例、握把、枪口 +Z 与水仓结构，保存 .blend、脚本、GLB 和回读证据；当前没有制作或声称已存在正式模型。图中水仓和材质不增加射击规则。
