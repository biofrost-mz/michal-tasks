import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // CI zatím bere lint jako poradní kontrolu, ale warningy chceme znovu vidět a postupně čistit.
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'react-hooks/exhaustive-deps': 'warn',
      'no-prototype-builtins': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Strukturální refaktor context/hook exportů bude řešen později mimo malé cleanup kroky.
      'react-refresh/only-export-components': 'off',
    },
  },
])
