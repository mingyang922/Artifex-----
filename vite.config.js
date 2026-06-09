import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        target: 'es2020',
        minify: 'esbuild',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'login.html'),
                dashboard: resolve(__dirname, 'dashboard.html'),
                'ai-generator': resolve(__dirname, 'modules/ai-generate/ai-generator-new.html'),
                'asset-library': resolve(__dirname, 'modules/asset-library/asset-library.html'),
                'project-management': resolve(__dirname, 'modules/project-management/index.html'),
                'project-detail': resolve(__dirname, 'modules/project-management/project-detail.html'),
                'user-center': resolve(__dirname, 'modules/user-center/userCenter.html'),
                admin: resolve(__dirname, 'modules/admin/admin.html'),
                'style-presets': resolve(__dirname, 'modules/style-presets/style-presets.html'),
                'message-center': resolve(__dirname, 'modules/messageCenter.html'),
            },
            output: {
                // 文件哈希用于长期缓存
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
                // 代码分割
                manualChunks: {
                    'vendor-utils': ['js/api-utils.js', 'js/html-utils.js', 'js/constants.js'],
                },
            },
        },
        // 代码分割配置
        chunkSizeWarningLimit: 500,
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
    // 静态资源处理
    publicDir: 'public',
    // CSS 配置
    css: {
        devSourcemap: true,
    },
});
