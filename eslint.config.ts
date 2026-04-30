import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Vue 3 essential rules (parses <script lang="ts">)
  ...pluginVue.configs['flat/recommended'],

  // Disable ESLint rules that conflict with Prettier
  prettierConfig,

  {
    // Node.js globals for sidecar (backend) files
    files: ['apps/sidecar/**/*.{ts,js}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // Browser globals for desktop (frontend) files
    files: ['apps/desktop/src/**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
    rules: {
      // Allow unused vars prefixed with _
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Vue: allow single-word component names during early dev
      'vue/multi-word-component-names': 'off',
      // TypeScript/JS code style in <script> blocks
      'keyword-spacing': ['warn', { before: true, after: true }],
      'space-before-blocks': 'warn',
      'vue/script-indent': ['warn', 2, { baseIndent: 0, switchCase: 1 }],
      'indent': 'off', // disabled in favor of vue/script-indent

      // Catch invalid `this` usage (e.g. using `this` in <script setup> where it doesn't exist)
      'no-invalid-this': 'error',

      // Enforce (and auto-fix) trailing commas in multiline object/array/function literals
      'comma-dangle': ['warn', 'always-multiline'],

      // Enforce single quotes for strings (auto-fixable); allow double quotes to avoid escaping
      'quotes': ['warn', 'single', { avoidEscape: true }],

      // Enforce maximum 1 consecutive blank line (auto-fixable)
      'no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 1, maxBOF: 0 }],

      // Enforce a newline at the end of every file (auto-fixable)
      'eol-last': ['warn', 'always'],
    },
  },

  {
    // Ignore build outputs, type declaration files and Rust/Tauri artefacts
    ignores: ['**/dist/**', 'apps/desktop/src-tauri/**', '**/node_modules/**', '**/*.d.ts', 'docs/**'],
  },
)
