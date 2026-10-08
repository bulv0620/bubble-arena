import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const checker = path.resolve('scripts/check-workspace.mjs');
let fixture: string;

function write(file: string, value: string) {
  const target = path.join(fixture, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, value);
}

function run(...args: string[]) {
  const result = spawnSync(process.execPath, [checker, ...args], { cwd: fixture, encoding: 'utf8', timeout: 5_000 });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}

function editTasks(change: (tasks: Array<{ id: string; dependencies: string[] }>) => void) {
  const file = path.join(fixture, 'docs/TASKS/tasks.json');
  const registry = JSON.parse(readFileSync(file, 'utf8'));
  change(registry.tasks);
  writeFileSync(file, JSON.stringify(registry));
}

beforeEach(() => {
  fixture = mkdtempSync(path.join(tmpdir(), 'bubble-arena-check-'));
  write('docs/TASKS/tasks.json', JSON.stringify({ tasks: [
    { id: 'A', title: 'First', status: 'todo', file: 'docs/TASKS/A.md', dependencies: [] },
    { id: 'B', title: 'Second', status: 'todo', file: 'docs/TASKS/B.md', dependencies: ['A'] },
  ] }));
  write('docs/TASKS/A.md', '# A\n');
  write('docs/TASKS/B.md', '# B\n');
  write('assets/manifest.json', JSON.stringify({ assets: [] }));
  expect(run('--write-index').status).toBe(0);
});

afterEach(() => { rmSync(fixture, { recursive: true, force: true }); });

describe('工作区检查命令', () => {
  test('接受有效任务图及生成索引', () => {
    expect(run().status).toBe(0);
  });

  test('拒绝循环依赖', () => {
    editTasks((tasks) => { tasks[0].dependencies = ['B']; });
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain('Dependency cycle');
  });

  test('拒绝不存在的前置任务', () => {
    editTasks((tasks) => { tasks[1].dependencies = ['UNKNOWN']; });
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain('Unknown dependency B -> UNKNOWN');
  });

  test('拒绝缺失任务卡', () => {
    rmSync(path.join(fixture, 'docs/TASKS/B.md'));
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain('Missing card docs/TASKS/B.md');
  });

  test('拒绝过期索引', () => {
    write('docs/TASKS/INDEX.md', '# Outdated\n');
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain('Task index stale');
  });

  test('拒绝无法解析的本地文档链接', () => {
    write('README.md', '[missing](docs/missing.md)\n');
    const result = run();
    expect(result.status).toBe(1);
    expect(result.output).toContain('Broken link README.md');
  });
});
