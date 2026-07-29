'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');

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

// Images and other non-JS assets are copied verbatim. Classic application
// scripts are merged per page below so production does not issue 20-30
// blocking requests for unminified files.
copyDirectory('js', (source) => path.extname(source).toLowerCase() !== '.js');
copyFile('js/theme-bootstrap.js');
copyDirectory('styles');
copyDirectory('vendor');
copyDirectory('docs');
copyDirectory('modules', (source) => !['.html', '.js'].includes(path.extname(source).toLowerCase()));
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

function bundleClassicScripts(htmlFile) {
    let html = fs.readFileSync(htmlFile, 'utf8');
    const relativeHtmlPath = path.relative(distRoot, htmlFile);
    const sourceHtmlDir = path.dirname(path.join(projectRoot, relativeHtmlPath));
    const scriptPattern = /<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi;
    const selected = [];

    for (const match of html.matchAll(scriptPattern)) {
        const src = match[2].split(/[?#]/, 1)[0];
        const attrs = `${match[1]} ${match[3]}`;
        if (/^(?:[a-z]+:|\/\/|data:)/i.test(src)) continue;
        if (/\btype=["']module["']/i.test(attrs)) continue;
        if (src.includes('/vendor/') || src.startsWith('vendor/') || src.endsWith('theme-bootstrap.js')) continue;

        const sourcePath = src.startsWith('/')
            ? path.join(projectRoot, src.slice(1))
            : path.resolve(sourceHtmlDir, src);
        if (path.extname(sourcePath).toLowerCase() !== '.js' || !fs.existsSync(sourcePath)) continue;
        if (!sourcePath.startsWith(projectRoot + path.sep)) continue;
        selected.push({ tag: match[0], src, sourcePath });
    }

    if (selected.length === 0) return;
    const combined = selected
        .map(({ src, sourcePath }) => `\n/* ${src} */\n${fs.readFileSync(sourcePath, 'utf8')}\n`)
        .join(';\n');
    const output = esbuild.transformSync(combined, {
        loader: 'js',
        minify: true,
        target: 'es2020',
        legalComments: 'none',
    }).code;
    const hash = crypto.createHash('sha256').update(output).digest('hex').slice(0, 10);
    const pageName = relativeHtmlPath
        .replace(/\.html$/i, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
    const bundlePath = path.join(distRoot, 'assets', `classic-${pageName}-${hash}.js`);
    fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
    fs.writeFileSync(bundlePath, output);

    for (const script of selected) html = html.replace(script.tag, '');
    const bundleSrc = path.relative(path.dirname(htmlFile), bundlePath).replace(/\\/g, '/');
    html = html.replace('</body>', `    <script defer src="${bundleSrc}"></script>\n</body>`);
    fs.writeFileSync(htmlFile, html);
}

for (const htmlFile of htmlFiles) bundleClassicScripts(htmlFile);

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
