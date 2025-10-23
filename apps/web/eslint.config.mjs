import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    {
        ignores: [
            ".next/**",
            "node_modules/**",
            ".turbo/**",
            "out/**",
            "build/**",
            ".open-next/**",
            ".next-dev/**",
        ],
    },
    {
        files: ["**/*.{js,jsx,ts,tsx,mjs}"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'react': react,
            'react-hooks': reactHooks,
        },
        rules: {
            "react/no-unescaped-entities": "off",
            "react/react-in-jsx-scope": "off", // Not needed in Next.js
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
];
