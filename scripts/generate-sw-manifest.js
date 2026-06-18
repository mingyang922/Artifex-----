/**
 * Artifex - Service Worker Manifest Generator
 * 扫描 dist/ 目录，生成 sw-manifest.json 供 Service Worker 预缓存使用
 *
 * 用法: node scripts/generate-sw-manifest.js
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const manifestPath = path.join(distDir, 'sw-manifest.json');
const pkg = require('../package.json');

/**
 * 递归扫描目录，收集所有可缓存的静态资源
 * @param {string} dir  - 要扫描的绝对路径
 * @param {string} base - 相对于 dist/ 的路径前缀（递归用）
 * @returns {string[]}  - 以 '/' 开头的资源路径列表
 */
function scanDir(dir, base = '') {
    const entries = [];
    if (!fs.existsSync(dir)) return entries;

    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const relPath = path.join(base, item).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            entries.push(...scanDir(fullPath, relPath));
        } else if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|webp|avif|ico)$/.test(item) && !/\.map$/.test(item)) {
            entries.push('/' + relPath);
        }
    }
    return entries;
}

// --- Main ---
const assets = scanDir(distDir);
const manifest = {
    assets,
    generatedAt: new Date().toISOString(),
    version: pkg.version,
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`[sw-manifest] Generated manifest with ${assets.length} assets -> ${manifestPath}`);
