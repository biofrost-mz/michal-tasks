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
      // Legacy kód zatím nechceme blokovat v CI kvůli drobným nepoužitým importům.
      // Ponecháváme to jako warning, aby technický dluh zůstal vidět v Actions.
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Admin diagnostika zatím obsahuje legacy průchod přes localStorage.
      // Bezpečnější přepis na Object.prototype.hasOwnProperty.call(...) je v backlogu.
      'no-prototype-builtins': 'warn',
      // U větších souborů nyní záměrně exportujeme i hooks/context/helper komponenty.
      // Strukturální refaktor do samostatných souborů bude řešen samostatně.
      'react-refresh/only-export-components': 'off',
    },
  },
])
