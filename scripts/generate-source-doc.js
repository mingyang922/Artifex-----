/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';

/**
 * 源代码文档生成脚本
 * 生成软著申请所需的「前30页 + 后30页」源代码文档
 * 每页50行，总计60页（3000行）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'docs', '源代码文档.txt');
const LINES_PER_PAGE = 50;
const PAGES_FRONT = 30;
const PAGES_BACK = 30;

// 收集源码文件（排除 node_modules、.claude、.vscode、docs、logs、scripts 本身）
const SOURCE_DIRS = ['backend', 'js', 'modules', 'config', 'styles'];
const SOURCE_EXTS = ['.js', '.html', '.css'];

function collectFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', '.claude', '.vscode', 'docs', 'logs', 'data'].includes(entry.name)) continue;
            results.push(...collectFiles(full));
        } else if (SOURCE_EXTS.includes(path.extname(entry.name))) {
            results.push(full);
        }
    }
    return results;
}

// 收集所有源码行
let allLines = [];

// 根目录的 HTML 和 CSS
const rootFiles = ['login.html', 'dashboard.html', 'styles.css'];
for (const f of rootFiles) {
    const fp = path.join(ROOT, f);
    if (fs.existsSync(fp)) {
        const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
        allLines.push(`// ===== 文件: ${rel} =====`);
        const content = fs.readFileSync(fp, 'utf-8');
        allLines.push(...content.split('\n'));
        allLines.push('');
    }
}

// 各子目录
for (const dir of SOURCE_DIRS) {
    const files = collectFiles(path.join(ROOT, dir));
    files.sort();
    for (const fp of files) {
        const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
        allLines.push(`// ===== 文件: ${rel} =====`);
        const content = fs.readFileSync(fp, 'utf-8');
        allLines.push(...content.split('\n'));
        allLines.push('');
    }
}

console.log(`总行数: ${allLines.length}`);

// 按页分组
const totalPages = Math.ceil(allLines.length / LINES_PER_PAGE);
console.log(`总页数: ${totalPages}`);

let output = '';
output += 'Artifex 二维游戏美术协作与 AI 资产生成平台 V1.3.3\n';
output += '源代码文档\n';
output += `生成时间: ${new Date().toISOString().split('T')[0]}\n`;
output += `总行数: ${allLines.length}  总页数: ${totalPages}\n`;
output += '='.repeat(80) + '\n\n';

function addPage(pageNum, lines) {
    output += `--- 第 ${pageNum} 页 ---\n`;
    for (const line of lines) {
        output += line + '\n';
    }
    output += '\n';
}

if (totalPages <= PAGES_FRONT + PAGES_BACK) {
    // 总页数不超过60页，全部输出
    for (let p = 0; p < totalPages; p++) {
        const start = p * LINES_PER_PAGE;
        const pageLines = allLines.slice(start, start + LINES_PER_PAGE);
        addPage(p + 1, pageLines);
    }
} else {
    // 输出前30页
    output += '【前30页】\n\n';
    for (let p = 0; p < PAGES_FRONT; p++) {
        const start = p * LINES_PER_PAGE;
        const pageLines = allLines.slice(start, start + LINES_PER_PAGE);
        addPage(p + 1, pageLines);
    }

    output += '\n' + '... （中间省略） ...\n\n';

    // 输出后30页
    output += '【后30页】\n\n';
    const lastPageStart = totalPages - PAGES_BACK;
    for (let p = 0; p < PAGES_BACK; p++) {
        const pageNum = lastPageStart + p + 1;
        const start = (lastPageStart + p) * LINES_PER_PAGE;
        const pageLines = allLines.slice(start, start + LINES_PER_PAGE);
        addPage(pageNum, pageLines);
    }
}

fs.writeFileSync(OUTPUT, output, 'utf-8');
console.log(`已生成: ${OUTPUT}`);
