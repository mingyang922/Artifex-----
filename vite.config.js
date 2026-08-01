import { createLogger, defineConfig } from 'vite';
import { resolve } from 'path';

const logger = createLogger();
const warn = logger.warn.bind(logger);
logger.warn = (message, options) => {
    // prepare-dist removes Font Awesome's unused v4 compatibility face before
    // verifying dist, so these two missing optional font files are intentional.
    if (message.includes('../webfonts/fa-v4compatibility') && message.includes("didn't resolve at build time")) return;
    warn(message, options);
};
logger.warnOnce = logger.warn;

export default defineConfig({
    customLogger: logger,
    root: '.',
    build: {
        outDir: 'dist',
        target: 'es2020',
        minify: 'esbuild',
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'login.html'),
                dashboard: resolve(import.meta.dirname, 'dashboard.html'),
                'ai-generator': resolve(import.meta.dirname, 'modules/ai-generate/ai-generator-new.html'),
                'asset-library': resolve(import.meta.dirname, 'modules/asset-library/asset-library.html'),
                'project-management': resolve(import.meta.dirname, 'modules/project-management/index.html'),
                'project-detail': resolve(import.meta.dirname, 'modules/project-management/project-detail.html'),
                'user-center': resolve(import.meta.dirname, 'modules/user-center/userCenter.html'),
                admin: resolve(import.meta.dirname, 'modules/admin/admin.html'),
                'style-presets': resolve(import.meta.dirname, 'modules/style-presets/style-presets.html'),
                'message-center': resolve(import.meta.dirname, 'modules/messageCenter.html'),
                'workflow-hub': resolve(import.meta.dirname, 'modules/workflow-hub/index.html'),
                'shared-project': resolve(import.meta.dirname, 'modules/workflow-hub/shared.html'),
            },
            output: {
                // 文件哈希用于长期缓存
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
                // 代码分割
                manualChunks(id) {
                    if (id.includes('js/api-utils') || id.includes('js/html-utils') || id.includes('js/constants')) {
                        return 'vendor-utils';
                    }
                },
            },
        },
        // 代码分割配置
        chunkSizeWarningLimit: 500,
        // 启用 CSS 代码分割
        cssCodeSplit: true,
    },
    // 开发服务器配置（代理后端 API）
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
        },
    },
    // 本项目的经典脚本与 vendor 资源由 prepare-dist.js 复制，不使用 Vite public 目录。
    publicDir: false,
    // CSS 配置
    css: {
        devSourcemap: true,
    },
});
