# B.6 制作狙击枪模型

状态：todo。里程碑：V1。

## 唯一目标

制作狙击枪模型。

## 前置与阅读

前置：B.5。阅读 AGENTS、SPEC、GAME_DESIGN、NETWORK（网络任务）或 BLENDER_MCP/ASSET_PIPELINE（B 任务）。阶段前置同时要求相应阶段验收。

## 允许修改与不做

Blender 武器源、制作脚本、manifest、狙击导出件、任务报告和状态。只完成此资产/能力；不制作下一个模型、不顺带改游戏规则。B.1 之外不改用户级 MCP 配置。B 任务必须实际使用 Blender MCP，不以伪造截图/空资产代替。

## 实现步骤

1. 核对前置状态和本任务接口/资产合同。
2. 完成本目标，保留可复用脚本/测试与必要源文件。
3. 按下述标准验收并记录实际输出、命令和截图/日志。

## 验收

狙击轮廓/瞄准镜/握把/枪口一致，导出无未支持材质。

运行 pnpm check:workspace；涉及应用改动运行 typecheck/build/相关测试。纯资产任务执行导出回读和截图检查，进入游戏的验证由对应阶段 7 任务完成。

## 交付与停止

docs/reports/B.6.md、改动/输出清单、实际工具结果、限制和状态更新。完成本任务停止。


4.14已提供 [sniper三视图概念参考](../../apps/web/public/ui/weapons/sniper-views-v1.png)，[提示词/源记录](../../assets-source/weapons/README.md)。各视图存在生成式结构误差可能，建模时统一正交比例、握把/枪口/水仓；当前只有PNG，不代表本卡或B.1完成，仍须实际Blender MCP、.blend/脚本/GLB和回读验证。
