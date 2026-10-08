# 物理初始化与按需渲染回归

1. pnpm build 后 pnpm preview，首次打开 localhost:4173，等待 WASM 加载完成。
2. 应显示与开发版相同的地面和立方体，不能一直只有背景；刷新后重复检查。无角色或碰撞体。
3. 开发版 localhost:5173 加载完成后，控制台应出现一次 physics.check，steps=60，min/max 约 0.0166666675，bodies/colliders 都为 0。
4. 不要求 rAF 墙钟严格达到 60Hz；本验证检查每次模拟 dt，浏览器后台可能节流。

曾发现生产版 Suspense 完成后空世界没有刚体运动触发 invalidate，导致静态场景不重绘；PhysicsWorld 的挂载 effect 主动 invalidate 一次修复。上述首次加载/刷新步骤为后续回归路径。初始化弃用 warning 已记录，不将其伪报为无警告。
