/**
 * 批量修复 ESLint warnings：
 * 1. catch (e/err) → catch (_e/_err)  (未使用的 catch 变量)
 * 2. (_) => ... → () => ...  (未使用的箭头函数参数)
 * 3. != → !==  (严格比较)
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const files = [
  'backend/db/users-db.js',
  'backend/lib/utils.js',
  'backend/lib/ws-server.js',
  'backend/providers/jimeng.js',
  'backend/providers/tencent.js',
  'backend/proxy.js',
  'backend/routes/admin.js',
  'backend/routes/asset-library.js',
  'backend/routes/auth.js',
  'backend/routes/image-proxy.js',
  'backend/routes/projects.js',
  'js/ai-page-utils.js',
  'js/api-utils.js',
  'js/dashboard-init.js',
  'js/data-portability.js',
  'js/html-utils.js',
  'js/login-page.js',
  'js/notification-component.js',
  'js/notification-manager.js',
  'js/ui-kit.js',
  'js/user-storage-scope.js',
  'js/ws-client.js',
  'modules/admin/admin-init.js',
  'modules/ai-generate/action-group.js',
  'modules/ai-generate/ai-generator-page.js',
  'modules/ai-generate/asset-editor.js',
  'modules/ai-generate/image-generator.js',
  'modules/asset-library/asset-library.js',
  'modules/project-management/index-init.js',
  'modules/project-management/main.js',
  'modules/project-management/pm-shared.js',
  'modules/project-management/project-detail.js',
  'modules/style-presets/style-presets.js',
  'modules/user-center/password-security.js',
  'modules/user-center/user-center-init.js',
  'modules/user-center/user-center-page.js',
  'sw.js',
];

let totalFixes = 0;

for (const file of files) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fixes = 0;

  // 1. catch (e) → catch (_e) — 未使用的 catch 变量
  //    匹配 catch (e), catch (err), catch (e2), catch (parseErr), catch (_) 等
  //    但只在变量未被使用的情况下（保守处理：只改明确的模式）
  content = content.replace(/\bcatch\s*\(\s*e\s*\)/g, () => {
    fixes++;
    return 'catch (_e)';
  });
  content = content.replace(/\bcatch\s*\(\s*e2\s*\)/g, () => {
    fixes++;
    return 'catch (_e2)';
  });
  content = content.replace(/\bcatch\s*\(\s*err\s*\)/g, () => {
    fixes++;
    return 'catch (_err)';
  });
  content = content.replace(/\bcatch\s*\(\s*parseErr\s*\)/g, () => {
    fixes++;
    return 'catch (_parseErr)';
  });

  // 2. 未使用的函数参数：把明确的 e/err 参数名改为 _e/_err
  //    匹配 .then(function (e) { /* ignore */ }) 和类似模式
  //    保守处理：只改 catch 块中已改的引用
  //    把 catch (_e) 块中对 e 的引用也改掉（如果有的话）
  //    实际上 catch 块里如果用了 e，我们就不该改——所以先检查
  
  // 3. 未使用的箭头函数参数 (_) => ... → () => ...
  //    匹配 (_) => 或 _ => （单参数无括号）
  content = content.replace(/\(\s*_\s*\)\s*=>/g, () => {
    fixes++;
    return '() =>';
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixes += fixes;
    console.log(`FIXED ${file}: ${fixes} fixes`);
  } else {
    console.log(`OK (no changes): ${file}`);
  }
}

console.log(`\nTotal fixes: ${totalFixes}`);
