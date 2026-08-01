'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function lines(relativePath) {
    return read(relativePath).split(/\r?\n/).length;
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const lineBudgets = {
    'js/i18n.js': 200,
    'modules/user-center/user-center-page.js': 1000,
    'modules/asset-library/asset-library.html': 500,
    'modules/ai-generate/style.css': 20,
    'modules/ai-generate/styles/foundation.css': 1100,
    'modules/ai-generate/styles/generator-layout.css': 1100,
    'modules/ai-generate/styles/asset-editor.css': 700,
    'modules/ai-generate/styles/theme-system.css': 800,
    'modules/ai-generate/styles/image-tools.css': 1000,
    'modules/asset-library/asset-library-shell.css': 1000,
    'modules/asset-library/asset-library-features.css': 800,
    'modules/workflow-hub/workflow-insights.js': 400,
    'modules/workflow-hub/workflow-insights.css': 300,
};

for (const [relativePath, budget] of Object.entries(lineBudgets)) {
    const count = lines(relativePath);
    assert(count <= budget, `${relativePath} has ${count} lines; architecture budget is ${budget}`);
}

const assetLibraryHtml = read('modules/asset-library/asset-library.html');
assert(!assetLibraryHtml.includes('<style>'), 'asset-library.html must not regain a large inline style block');
assert(
    !read('modules/user-center/user-center-page.js').includes('_showMessageCenter'),
    'Legacy demo message center must not return to user-center-page.js'
);

function walkHtml(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        if (['node_modules', 'dist'].includes(entry.name)) return [];
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return walkHtml(fullPath);
        return entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
    });
}

for (const htmlPath of walkHtml(root)) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const classicScripts = html.match(/<script\b(?![^>]*\btype=["']module["'])[^>]*\bsrc=["'][^"']+["'][^>]*>/gi) || [];
    assert(
        classicScripts.every((tag) => /\bvite-ignore\b/i.test(tag)),
        `${path.relative(root, htmlPath)} classic scripts must use vite-ignore because prepare-dist bundles them`
    );
    const runtimeIndex = html.indexOf('js/i18n.js');
    if (runtimeIndex < 0) continue;
    const dataIndex = html.indexOf('js/i18n-translations.js');
    assert(dataIndex >= 0 && dataIndex < runtimeIndex, `${path.relative(root, htmlPath)} must load i18n data first`);
}

console.log('Frontend architecture boundaries are consistent.');
