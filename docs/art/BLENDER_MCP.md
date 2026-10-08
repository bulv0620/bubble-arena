# Blender MCP 接入与建模工作流

## 当前状态

2026-10-08：检测到 /Applications/Blender.app 版本 5.2.2；当前会话无 Blender 工具，PATH 中无 uvx；插件目录搜索 Blender 未找到候选。B.1 尚未执行，不能视为已连接。

选用社区 ahujasid/mcp-for-blender（原 blender-mcp），不是 Blender 官方插件。通过 MCP server ↔ Blender 插件 socket 控制正在运行的 Blender。以项目上游当前说明为准，并记录实际安装版本/commit 与兼容结果。

来源：[项目 README](https://github.com/ahujasid/mcp-for-blender)。GLB 规则参考 [Blender glTF 手册](https://docs.blender.org/manual/en/5.1/addons/import_export/scene_gltf2.html)。本页只提取接入与导出要点，不意味着已执行安装。

## B.1 的落地步骤

1. 检查当前 Blender、Python/uv 工具与已有 MCP 配置，备份既有配置，不覆盖无关服务器。
2. 安装 uv 后按上游方式安装服务端及 Blender addon；注册本地 blender MCP，固定经验证版本。上游当前服务启动入口为 `uvx mcp-for-blender`，addon 安装入口为 `uvx mcp-for-blender install-addon`。实际命令记录在报告；本次仅准备流程。
3. 在 Blender 启用 addon，打开空白工作文件，确认本机 socket 监听；保留 localhost，不对公网暴露。只运行一个控制实例，不接入付费外部资源功能。
4. 会话中实际调用读取场景、新建 1m 测试立方体、截图、保存 .blend、导出 GLB；记录工具名、版本、输出路径和错误。如工具列表尚未刷新，重连后再验证，不能用 CLI 建模替代 MCP 验收。
5. 配置 Git LFS 并验证 clone/pull 所需说明，然后保存二进制。导出回读检查尺寸/材质/朝向，输出 B.1 报告。

注册到 Codex 的具体设置在 B.1 按当前客户端核对；此文件不自动修改用户级设置。B.1 连接前可继续代码和白盒开发，正式建模不能宣称完成。

## 每个资产的工作步骤

需求卡（轮廓/尺寸/节点/预算）→ Blender MCP 创建/修改场景 → 保存可复用 bpy 脚本 → 截图审查轮廓/材质 → .blend 里程碑 → 导出 GLB 和碰撞 JSON → 导出回读 → 游戏加载/碰撞/动画验收。

每次只做一个角色/武器/地图模块；大地图按模块集合拆分。MCP 执行脚本前保留工作文件，使用明确命名，避免删除无关场景。制作脚本保存在 tools/blender，能在同版本 Blender 重建基础形状；手工调整另记说明。

人物先基础体/骨架再动画；枪械先挂点/枪口再造型；地图先锁定白盒玩法尺寸再正式视觉。MCP 能执行建模，不等于动画/拓扑/手感自动达标，最终必须经过截图和游戏中验收。
