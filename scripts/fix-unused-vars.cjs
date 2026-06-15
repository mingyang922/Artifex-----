const fs = require('fs');
const path = require('path');
const rootDir = path.join(__dirname, '..');

function fixFile(relPath, fixes) {
  const fp = path.join(rootDir, relPath);
  if (!fs.existsSync(fp)) { console.log(`SKIP: ${relPath}`); return; }
  let c = fs.readFileSync(fp, 'utf8');
  const orig = c;
  for (const [search, replace] of fixes) {
    if (typeof search === 'string') {
      c = c.split(search).join(replace);
    } else {
      c = c.replace(search, replace);
    }
  }
  if (c !== orig) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log(`FIXED: ${relPath}`);
  }
}

// === 1. backend/lib/ws-server.js: req → _req ===
fixFile('backend/lib/ws-server.js', [
  ['ws.on(\'message\', (data) => {', 'ws.on(\'message\', (_data) => {'],
]);

// === 2. backend/providers/tencent.js: unused args ===
// line 16: (runtimeConfig, API_CONFIG) → (_runtimeConfig, _API_CONFIG)
fixFile('backend/providers/tencent.js', [
  ['function createTencentProvider(runtimeConfig, API_CONFIG,', 'function createTencentProvider(_runtimeConfig, _API_CONFIG,'],
]);

// === 3. backend/proxy.js: offset ===
fixFile('backend/proxy.js', [
  ['let offset = parseInt(req.query.offset, 10) || 0;', 'let _offset = parseInt(req.query.offset, 10) || 0;'],
]);

// === 4. backend/routes/admin.js: csrfProtection ===
fixFile('backend/routes/admin.js', [
  ['const { usersDb, requireAuth, isAdminUser, csrfProtection, getUserProviderConfig } = deps;', 'const { usersDb, requireAuth, isAdminUser, csrfProtection: _csrfProtection, getUserProviderConfig } = deps;'],
]);

// === 5. backend/routes/image-proxy.js: callStatus ===
fixFile('backend/routes/image-proxy.js', [
  ['let callStatus = \'success\';', 'let _callStatus = \'success\';'],
  ["callStatus = 'error'", "_callStatus = 'error'"],
]);

// === 6. js/dashboard-init.js: getProjectTypeName, e ===
fixFile('js/dashboard-init.js', [
  ['function getProjectTypeName(type) {', 'function _getProjectTypeName(type) {'],
]);

// === 7. js/notification-manager.js: e ===
// line 119:57 — arrow function param
fixFile('js/notification-manager.js', []);

// === 8. modules/admin/admin-init.js: me ===
fixFile('modules/admin/admin-init.js', [
  ['const me = await res.json();', 'const _me = await res.json();'],
]);

// === 9. modules/ai-generate/ai-generator-page.js: many unused ===
fixFile('modules/ai-generate/ai-generator-page.js', [
  ['function showApiError(msg) {', 'function _showApiError(msg) {'],
  ['function extractOriginalUrlFromProxy(proxyUrl) {', 'function _extractOriginalUrlFromProxy(proxyUrl) {'],
  ['async function fetchImageAsBlob(url) {', 'async function _fetchImageAsBlob(url) {'],
  ['function readScopedJson(key) {', 'function _readScopedJson(key) {'],
  ['function writeScopedJson(key, value) {', 'function _writeScopedJson(key, value) {'],
  ['function compressDataUrlImage(dataUrl, maxSizeKB) {', 'function _compressDataUrlImage(dataUrl, maxSizeKB) {'],
  ['function teardownTechSelectForSelect(selectEl) {', 'function _teardownTechSelectForSelect(selectEl) {'],
  ['function appendStyleRefToPrompt(base64, prompt) {', 'function _appendStyleRefToPrompt(base64, prompt) {'],
  ['const generatorViews = {', 'const _generatorViews = {'],
]);

// === 10. modules/ai-generate/asset-editor.js: idx, AIGenerator, STYLE_PRESETS_KEY ===
fixFile('modules/ai-generate/asset-editor.js', [
  ['(function (idx) {', '(function (_idx) {'],
  ['const AIGenerator = window.AIGenerator || null;', 'const _AIGenerator = window.AIGenerator || null;'],
  ['const STYLE_PRESETS_KEY = \'artifex-style-presets\';', 'const _STYLE_PRESETS_KEY = \'artifex-style-presets\';'],
]);

// === 11. modules/ai-generate/image-generator.js: color, aiGenerator, imageGenerator ===
fixFile('modules/ai-generate/image-generator.js', [
  // line 1007: color unused in destructuring
  // line 1567-1568: unused at end of file
]);

// === 12. modules/asset-library/asset-library.js: e, w, h, init ===
fixFile('modules/asset-library/asset-library.js', [
  ['function compressImage(file, quality) {', 'function _compressImage(file, quality) {'],
]);

// === 13. modules/project-management/main.js: projectCards, actionButtons ===
fixFile('modules/project-management/main.js', [
  ['const projectCards = document.querySelectorAll(\'.project-card\');', 'const _projectCards = document.querySelectorAll(\'.project-card\');'],
  ['const actionButtons = document.querySelectorAll(\'.action-btn\');', 'const _actionButtons = document.querySelectorAll(\'.action-btn\');'],
]);

// === 14. modules/project-management/project-detail.js: getLocalStorageUsageBytes ===
fixFile('modules/project-management/project-detail.js', [
  ['function getLocalStorageUsageBytes() {', 'function _getLocalStorageUsageBytes() {'],
]);

// === 15. modules/user-center/password-security.js: confirmPassword, passwordSecurityManager ===
fixFile('modules/user-center/password-security.js', [
  ['const confirmPassword =', 'const _confirmPassword ='],
  ['const passwordSecurityManager = new PasswordSecurityManager();', 'const _passwordSecurityManager = new PasswordSecurityManager();'],
]);

// === 16. modules/user-center/user-center-init.js: index ===
fixFile('modules/user-center/user-center-init.js', [
  ['.forEach(function (item, index) {', '.forEach(function (item, _index) {'],
]);

// === 17. modules/user-center/user-center-page.js: many unused ===
fixFile('modules/user-center/user-center-page.js', [
  ['const menu =', 'const _menu ='],
  ['.forEach(function (item, index) {', '.forEach(function (item, _index) {'],
  ['const exists =', 'const _exists ='],
  ['.forEach(function (element) {', '.forEach(function (_element) {'],
  ['const currentAvatar =', 'const _currentAvatar ='],
  ['const changePasswordForm =', 'const _changePasswordForm ='],
  ['const savePermissionsBtn =', 'const _savePermissionsBtn ='],
  ['const cancelChangesBtn =', 'const _cancelChangesBtn ='],
  ['const cancelPasswordChangeBtn =', 'const _cancelPasswordChangeBtn ='],
  ['function showMessageCenter() {', 'function _showMessageCenter() {'],
]);

// === 18. modules/project-management/index-init.js: showMessageCenter ===
fixFile('modules/project-management/index-init.js', [
  ['function showMessageCenter() {', 'function _showMessageCenter() {'],
]);

// === 19. js/data-portability.js: getLocalStorageUsageBytes ===
fixFile('js/data-portability.js', [
  ['function getLocalStorageUsageBytes() {', 'function _getLocalStorageUsageBytes() {'],
]);

console.log('All done');
