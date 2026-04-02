import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(eslint.configs.recommended, ...tseslint.configs.recommended, {
	languageOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	rules: {
		'no-useless-escape': 'warn',
		'@typescript-eslint/no-unused-vars': 'warn',
		'no-mixed-spaces-and-tabs': 'warn',
		'no-unreachable': 'warn',
		'no-extra-semi': 'warn',
		'no-fallthrough': 'off',
		'no-empty': 'warn',
		'@typescript-eslint/no-empty-function': 'warn',
		'no-case-declarations': 'off',
		'prefer-const': 'warn',
		'@typescript-eslint/adjacent-overload-signatures': 'warn',
		'@typescript-eslint/no-inferrable-types': 'off',
		'@typescript-eslint/no-explicit-any': 'warn',
	},
});
