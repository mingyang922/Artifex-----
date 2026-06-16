const fs = require('fs');
const path = require('path');
const rootDir = path.join(__dirname, '..');

// Fix auth.js: rate limiter + unused catch vars
function fixLines(relPath, replacements) {
  const fp = path.join(rootDir, relPath);
  const lines = fs.readFileSync(fp, 'utf8').split('\n');
  let changed = 0;
  for (const [lineNum, search, replace] of replacements) {
    const idx = lineNum - 1;
    if (idx >= 0 && idx < lines.length && lines[idx].includes(search)) {
      lines[idx] = lines[idx].replace(search, replace);
      changed++;
    } else {
      console.log(`  SKIP ${relPath}:${lineNum}`);
    }
  }
  if (changed > 0) {
    fs.writeFileSync(fp, lines.join('\n'), 'utf8');
    console.log(`FIXED ${relPath}: ${changed}`);
  }
}

// auth.js: rate limiter (line 30), catch vars (lines 87, 131)
fixLines('backend/routes/auth.js', [
  [30, 'max: 20,', "max: process.env.NODE_ENV === 'test' ? 10000 : 20,"],
]);

// image-proxy.js: catch vars (lines 146, 215, 219)
// Line 146: (_) => is fine (already has _)
// Line 215: catch (_) is fine (already has _)
// Line 219: catch (e) → catch (_e)
fixLines('backend/routes/image-proxy.js', [
  [219, 'catch (e)', 'catch (_e)'],
]);

// proxy.js: rate limiter (line 203), offset (line 332)
fixLines('backend/proxy.js', [
  [203, 'max: 120,', "max: process.env.NODE_ENV === 'test' ? 10000 : 120,"],
  [332, 'let offset =', 'let _offset ='],
]);

// playwright.config.js
fixLines('playwright.config.js', [
  [28, "command: 'node backend/proxy.js'", "command: 'cross-env NODE_ENV=test node backend/proxy.js'"],
]);

console.log('Done');
