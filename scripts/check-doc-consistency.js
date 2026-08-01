'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        if (['node_modules', 'dist'].includes(entry.name)) return [];
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(fullPath) : [fullPath];
    });
}

const packageJson = JSON.parse(read('package.json'));
const version = packageJson.version;

assert(read('backend/proxy.js').includes(`版本: ${version}`), 'backend/proxy.js version differs from package.json');
assert(read('sw.js').includes(`artifex-v${version}-`), 'Service Worker cache version differs from package.json');
assert(JSON.parse(read('docs/openapi.json')).info.version === version, 'OpenAPI version differs from package.json');
assert(read('更新日志.md').includes(`v${version}`), 'Changelog does not mention the package version');

const backendTsCount = walk(path.join(root, 'backend')).filter((file) => file.endsWith('.ts')).length;
const plan = read('IMPLEMENTATION_PLAN.md');
const documentedTsCount = plan.match(/当前后端 \*\*(\d+)\*\* 个 `\.ts` 源文件/);
assert(documentedTsCount, 'IMPLEMENTATION_PLAN.md must state the current backend TypeScript file count');
assert(Number(documentedTsCount[1]) === backendTsCount, 'Documented TypeScript count differs from the repository');

const matrix = read('docs/CAPABILITY_MATRIX.md');
for (const [capability, status] of [
    ['角色一致性档案', '简化版'],
    ['LoRA 训练', '外部集成依赖'],
    ['密码找回', '未完成'],
    ['Figma 对接', '未实现'],
]) {
    const rowPattern = new RegExp(`\\|\\s*${capability}\\s*\\|\\s*${status}\\s*\\|`);
    assert(rowPattern.test(matrix), `Capability matrix is missing: ${capability} | ${status}`);
}
assert(matrix.includes('GET /api/capabilities'), 'Capability matrix must document the runtime capability API');

console.log(`Documentation is consistent with Artifex v${version}.`);
