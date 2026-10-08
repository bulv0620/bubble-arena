import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const registry = JSON.parse(fs.readFileSync('docs/TASKS/tasks.json', 'utf8'));
const tasks = registry.tasks;
const errors = [];
const ids = new Set();
for (const t of tasks) {
  if (ids.has(t.id)) errors.push(`Duplicate task ${t.id}`);
  ids.add(t.id);
  if (!fs.existsSync(t.file)) errors.push(`Missing card ${t.file}`);
  if (!['todo', 'in_progress', 'implemented', 'accepted'].includes(t.status)) errors.push(`Bad status ${t.id}`);
}
for (const t of tasks) for (const d of t.dependencies) if (!ids.has(d)) errors.push(`Unknown dependency ${t.id} -> ${d}`);
const visiting = new Set(); const visited = new Set();
const byId = new Map(tasks.map(t => [t.id, t]));
function visit(id) {
  if (visiting.has(id)) { errors.push(`Dependency cycle at ${id}`); return; }
  if (visited.has(id) || !byId.has(id)) return;
  visiting.add(id);
  byId.get(id).dependencies.forEach(visit);
  visiting.delete(id); visited.add(id);
}
tasks.forEach(t => visit(t.id));
const index = `# 任务索引

状态源为 tasks.json；每次执行一个任务，前置阶段门槛见 DEVELOPMENT_PLAN。implemented 不等于人工 accepted。

| ID | 目标 | 里程碑 | 状态 | 前置 |
| --- | --- | --- | --- | --- |
` + tasks.map(t => `| [${t.id}](${t.id}.md) | ${t.title} | ${t.milestone} | ${t.status} | ${t.dependencies.join(', ') || '无'} |`).join('\n') + '\n';
if (process.argv.includes('--write-index')) fs.writeFileSync('docs/TASKS/INDEX.md', index);
else if (fs.readFileSync('docs/TASKS/INDEX.md', 'utf8') !== index) errors.push('Task index stale: node scripts/check-workspace.mjs --write-index');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (['.git', 'node_modules', 'dist'].includes(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
for (const file of walk(root).filter(f => f.endsWith('.md') && !f.includes('/docs/reference/'))) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|#|app:)/.test(target) || target.includes('<')) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file), target.split('#')[0]))) errors.push(`Broken link ${path.relative(root, file)}: ${target}`);
  }
}
const manifest = JSON.parse(fs.readFileSync('assets/manifest.json', 'utf8'));
for (const asset of manifest.assets) if (!fs.existsSync(asset.file)) errors.push(`Missing exported asset ${asset.assetId}`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Workspace OK: ${tasks.length} task cards, acyclic dependencies, local Markdown links and asset manifest checked.`);
