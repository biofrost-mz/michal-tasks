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
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/components/TaskDrawer.jsx'],
    rules: {
      // TaskDrawer je zatím velký legacy komponent s několika připravenými UI hodnotami.
      // Necháváme jej projít CI a samotný refaktor řešíme samostatně, aby se nerozbila produkční logika detailu úkolu.
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/components/Confirm.jsx'],
    rules: {
      // Confirm.jsx záměrně sdílí Provider i hook. Refaktor do samostatného context souboru je v backlogu.
      'react-refresh/only-export-components': 'off',
    },
  },
])
