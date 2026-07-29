/**
 * Generate the production Service Worker precache manifest.
 * Large source images are intentionally left to the runtime cache.
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const manifestPath = path.join(distDir, 'sw-manifest.json');
const pkg = require('../package.json');
const MAX_PRECACHE_FILE_SIZE = 512 * 1024;
const CACHEABLE_EXTENSION = /\.(html|js|css|png|jpe?g|gif|svg|woff2?|ttf|eot|webp|avif|ico|json)$/i;

function shouldPrecache(relativePath, size) {
    const normalized = relativePath.replace(/\\/g, '/');
    if (!CACHEABLE_EXTENSION.test(normalized) || normalized.endsWith('.map')) return false;
    if (size > MAX_PRECACHE_FILE_SIZE) return false;
    if (/^modules\/asset-library\/素材库图片\/(?!thumbs\/)/.test(normalized)) return false;

    return (
        normalized.endsWith('.html') ||
        normalized === 'manifest.json' ||
        normalized === 'js/theme-bootstrap.js' ||
        normalized.startsWith('assets/') ||
        normalized.startsWith('styles/') ||
        normalized.startsWith('vendor/css/') ||
        normalized.startsWith('vendor/fonts/') ||
        normalized.startsWith('vendor/images/') ||
        normalized.startsWith('modules/asset-library/素材库图片/thumbs/')
    );
}

function scanDir(dir, base = '') {
    const entries = [];
    if (!fs.existsSync(dir)) return entries;

    for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(base, item).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            entries.push(...scanDir(fullPath, relativePath));
        } else if (shouldPrecache(relativePath, stat.size)) {
            entries.push('/' + relativePath);
        }
    }
    return entries;
}

const assets = scanDir(distDir).sort();
const manifest = {
    assets,
    generatedAt: new Date().toISOString(),
    version: pkg.version,
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`[sw-manifest] Generated ${assets.length} entries -> ${manifestPath}`);
