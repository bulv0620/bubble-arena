import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

const featureModules = ['player', 'camera', 'weapons', 'maps', 'audio', 'network'];
const forbiddenComposition = ['../core', '../core/**', '../../core', '../../core/**', '../App', '../App.tsx', '../../App', '../../App.tsx'];

export default defineConfig([
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.tmp/**', '**/.vitest/**'] },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: featureModules.map((name) => `apps/web/src/${name}/**/*.{ts,tsx}`),
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: forbiddenComposition, message: '功能模块不能反向依赖 App/core 装配层；通过参数或接口获取数据。' }],
      }],
    },
  },
  {
    files: ['apps/web/src/network/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [...forbiddenComposition, '../audio', '../audio/**', '../player', '../player/**', '../weapons', '../weapons/**', '../maps', '../maps/**'],
          message: 'network 通过状态/事件接口同步，不直接依赖装配层或具体表现模块。',
        }],
      }],
    },
  },
]);
