# B.1 接入 Blender MCP 与导出烟测

状态：todo。里程碑：V1。

## 唯一目标

接入 Blender MCP 与导出烟测。

## 前置与阅读

前置：工程工作区已建立。阅读 AGENTS、SPEC、GAME_DESIGN、NETWORK（网络任务）或 BLENDER_MCP/ASSET_PIPELINE（B 任务）。阶段前置同时要求相应阶段验收。

## 允许修改与不做

本地 Blender addon/MCP 配置（先备份）、tools/blender、assets-source、assets/exports、.gitattributes、任务报告和状态。只完成此资产/能力；不制作下一个模型、不顺带改游戏规则。B.1 之外不改用户级 MCP 配置。B 任务必须实际使用 Blender MCP，不以伪造截图/空资产代替。

## 实现步骤

1. 核对前置状态和本任务接口/资产合同。
2. 完成本目标，保留可复用脚本/测试与必要源文件。
3. 按下述标准验收并记录实际输出、命令和截图/日志。

## 验收

实际 MCP 读取场景、创建 1m 方块、截图、保存 .blend、导出并回读 GLB；记录插件/server/Blender 版本，验证 LFS。

运行 pnpm check:workspace；涉及应用改动运行 typecheck/build/相关测试。纯资产任务执行导出回读和截图检查，进入游戏的验证由对应阶段 7 任务完成。

## 交付与停止

docs/reports/B.1.md、改动/输出清单、实际工具结果、限制和状态更新。完成本任务停止。
