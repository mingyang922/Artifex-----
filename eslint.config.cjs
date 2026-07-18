const globals = require('globals');
const js = require('@eslint/js');

const noUnusedVarsRule = ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }];
const appBrowserGlobals = {
    API_BASE: 'readonly',
    AssetEditor: 'readonly',
    GameUiUserScope: 'readonly',
    ImageGenerator: 'readonly',
    JSZip: 'readonly',
    ParticleNetwork: 'readonly',
    STYLE_PRESETS_KEY: 'readonly',
    aiGenerator: 'writable',
    aiStorageKey: 'readonly',
    appendStyleRefToPrompt: 'readonly',
    addProjectAsset: 'readonly',
    cancelChangesBtn: 'readonly',
    cancelPasswordChangeBtn: 'readonly',
    changePasswordForm: 'readonly',
    compressDataUrlImage: 'readonly',
    createProject: 'readonly',
    currentProjectId: 'writable',
    deleteProject: 'readonly',
    escapeHtml: 'readonly',
    extractOriginalUrlFromProxy: 'readonly',
    fetchImageAsBlob: 'readonly',
    fetchWithCsrf: 'readonly',
    getAIGeneratePath: 'readonly',
    getCsrfToken: 'readonly',
    getProxyImageUrl: 'readonly',
    gsap: 'readonly',
    imageGenerator: 'writable',
    initTechSelects: 'readonly',
    initUserId: 'readonly',
    loadImage: 'readonly',
    loginHtmlPath: 'readonly',
    module: 'readonly',
    personalInfoForm: 'readonly',
    projects: 'writable',
    readScopedJson: 'readonly',
    saveEditProject: 'readonly',
    savePermissionsBtn: 'readonly',
    saveProjectsToStorage: 'readonly',
    saveUserConfig: 'readonly',
    setActiveProjectCard: 'readonly',
    showApiError: 'readonly',
    teardownTechSelectForSelect: 'readonly',
    themedError: 'readonly',
    themedSuccess: 'readonly',
    themedWarn: 'readonly',
    tsParticles: 'readonly',
};

module.exports = [
    js.configs.recommended,
    {
        files: ['backend/**/*.js'],
        ignores: ['backend/data/**'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            eqeqeq: ['warn', 'always'],
            'no-unused-vars': noUnusedVarsRule,
        },
    },
    {
        files: ['js/**/*.js', 'modules/**/*.js', '*.js'],
        ignores: ['node_modules/**', 'logs/**', 'backend/data/**', 'js/constants.js', 'js/html-utils.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...appBrowserGlobals,
            },
        },
        rules: {
            eqeqeq: ['warn', 'always'],
            'no-unused-vars': noUnusedVarsRule,
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-redeclare': 'off',
        },
    },
    {
        files: ['js/constants.js', 'js/html-utils.js', 'vite.config.js', 'playwright.config.js', 'scripts/**/*.js', 'e2e/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...appBrowserGlobals,
            },
        },
        rules: {
            eqeqeq: ['warn', 'always'],
            'no-unused-vars': noUnusedVarsRule,
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-redeclare': 'off',
        },
    },
];
