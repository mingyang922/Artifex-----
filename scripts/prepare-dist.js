'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');

function copyDirectory(relativePath, filter) {
    const source = path.join(projectRoot, relativePath);
    const destination = path.join(distRoot, relativePath);
    fs.cpSync(source, destination, {
        recursive: true,
        force: true,
        filter: filter || (() => true),
    });
}

function copyFile(relativePath) {
    const source = path.join(projectRoot, relativePath);
    const destination = path.join(distRoot, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
}

if (!fs.existsSync(distRoot)) {
    throw new Error('dist directory does not exist; run Vite before preparing static assets');
}

// Vite does not bundle classic scripts referenced without type="module".
// Keep Vite-generated HTML intact while copying their runtime dependencies.
copyDirectory('js');
copyDirectory('styles');
copyDirectory('vendor');
copyDirectory('docs');
copyDirectory('modules', (source) => path.extname(source).toLowerCase() !== '.html');
copyFile('sw.js');
copyFile('manifest.json');

const missing = [];
const htmlFiles = [];

function collectHtmlFiles(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            collectHtmlFiles(absolutePath);
        } else if (entry.name.endsWith('.html')) {
            htmlFiles.push(absolutePath);
        }
    }
}

collectHtmlFiles(distRoot);

for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    const references = html.matchAll(/\b(?:src|href)=["']([^"'#?]+)(?:[?#][^"']*)?["']/g);

    for (const match of references) {
        const reference = match[1];
        if (/^(?:[a-z]+:|\/\/|data:|mailto:)/i.test(reference)) continue;

        const target = reference.startsWith('/')
            ? path.join(distRoot, reference.slice(1))
            : path.resolve(path.dirname(htmlFile), reference);

        if (!fs.existsSync(target)) {
            missing.push(`${path.relative(distRoot, htmlFile)} -> ${reference}`);
        }
    }
}

if (missing.length > 0) {
    throw new Error(`dist contains missing local assets:\n${missing.join('\n')}`);
}

console.log(`[prepare-dist] copied classic-script assets and verified ${htmlFiles.length} HTML files`);
