import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsp from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';

export default defineConfig({
  files: ['**/*.ts', '**/*.tsx'],
  ignores: ['dist/**', 'node_modules/**', 'generated/**', 'public/**', 'coverage/**'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: tsp,
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: import.meta.dirname,
    },
    globals: {
      console: 'readonly',
      process: 'readonly',
    },
  },
  plugins: {
    '@typescript-eslint': tseslint,
  },
  rules: {
    ...js.configs.recommended.rules,
    ...tseslint.configs.recommended.rules,
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
});