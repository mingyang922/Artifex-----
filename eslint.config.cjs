const globals = require('globals');

module.exports = [
    {
        files: ['**/*.js'],
        ignores: ['node_modules/**', 'logs/**', 'backend/data/**', 'js/constants.js', 'js/html-utils.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            eqeqeq: ['warn', 'always'],
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-undef': 'off',
        },
    },
    {
        files: ['js/constants.js', 'js/html-utils.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            eqeqeq: ['warn', 'always'],
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-undef': 'off',
        },
    },
];
