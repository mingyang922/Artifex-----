/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { encryptSensitiveFields, decryptSensitiveFields } = require('../lib/utils');
const logger = require('../lib/logger');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = process.env.USERS_DB_PATH || path.join(dataDir, 'users.sqlite');
const legacyJsonPath = path.join(dataDir, 'users.json');

let db;
let _checkpointTimer = null;

// 预编译语句缓存（init() 中初始化）
let stmtGetUserById, stmtGetUserByEmail, stmtGetUserByUsername, stmtLogApiCall;
let stmtCheckQuotaDaily, stmtCheckQuotaMonthly;

/**
 * 把 WAL 里的已提交页合并进主库文件，便于用 DB Browser 等外部工具立刻看到最新行。
 */
function checkpointWal() {
    if (!db) return;
    try {
        if (typeof db.checkpoint === 'function') {
            db.checkpoint('main');
        } else {
            db.pragma('wal_checkpoint(TRUNCATE)');
        }
    } catch (_e) {
        try {
            db.pragma('wal_checkpoint(TRUNCATE)');
        } catch (_e2) {
            /* ignore */
        }
    }
}

/**
 * 若存在旧版 users.json 且库为空，则导入一次（便于升级，不影响新环境）
 */
function migrateFromJsonIfEmpty() {
    if (!fs.existsSync(legacyJsonPath)) return;
    const { c } = db.prepare('SELECT COUNT(*) AS c FROM users').get();
    if (c > 0) return;
    let data;
    try {
        data = JSON.parse(fs.readFileSync(legacyJsonPath, 'utf8'));
    } catch {
        return;
    }
    const users = data.users || [];
    if (users.length === 0) return;
    const insert = db.prepare(
        `INSERT INTO users (id, username, email, password_hash, profile_json, created_at)
         VALUES (@id, @username, @email, @password_hash, @profile_json, @created_at)`
    );
    const runMany = db.transaction((rows) => {
        for (const u of rows) {
            insert.run({
                id: u.id,
                username: u.username,
                email: String(u.email || '')
                    .trim()
                    .toLowerCase(),
                password_hash: u.password_hash,
                profile_json: JSON.stringify(u.profile || {}),
                created_at: u.created_at || new Date().toISOString(),
            });
        }
    });
    runMany(users);
    const maxRow = db.prepare('SELECT MAX(id) AS m FROM users').get();
    const maxId = maxRow && maxRow.m ? maxRow.m : 0;
    if (maxId > 0) {
        db.prepare("DELETE FROM sqlite_sequence WHERE name = 'users'").run();
        db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('users', ?)").run(maxId);
    }
    logger.info(`已从 users.json 迁移 ${users.length} 条用户到 SQLite`);
}

function init() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    logger.info('[users-db] 用户库文件:', path.resolve(dbPath));
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL COLLATE NOCASE UNIQUE,
            email TEXT NOT NULL COLLATE NOCASE UNIQUE,
            password_hash TEXT NOT NULL,
            profile_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_api_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            credentials_json TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, provider),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            operation TEXT NOT NULL,
            status TEXT NOT NULL,
            duration_ms INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_usage_logs_user_provider_created ON usage_logs(user_id, provider, created_at);
        CREATE TABLE IF NOT EXISTS user_quotas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            daily_limit INTEGER DEFAULT 100,
            monthly_limit INTEGER DEFAULT 3000,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, provider),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            type TEXT DEFAULT 'other',
            version INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS project_assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'image',
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS version_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            version INTEGER NOT NULL,
            description TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS asset_library (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            type TEXT NOT NULL DEFAULT 'image',
            content TEXT NOT NULL DEFAULT '',
            desc TEXT DEFAULT '',
            source TEXT DEFAULT '',
            tags TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_asset_library_user ON asset_library(user_id);
        CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
        CREATE INDEX IF NOT EXISTS idx_project_assets_project ON project_assets(project_id);
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            details TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
    `);

    // Migration: add role column to users if missing
    const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    if (!userCols.includes('role')) {
        db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
        logger.info('[users-db] 已添加 role 列到 users 表');
    }
    // 自动提升首个用户为 admin（仅当 ADMIN_USER_ID 未指定时）
    const adminUserId = process.env.ADMIN_USER_ID;
    if (adminUserId) {
        db.prepare("UPDATE users SET role = 'admin' WHERE id = ? AND role !== 'admin'").run(Number(adminUserId));
    } else {
        // 默认将 ID=1 设为管理员（向后兼容）
        db.prepare("UPDATE users SET role = 'admin' WHERE id = 1 AND role !== 'admin'").run();
    }

    migrateFromJsonIfEmpty();

    // 预编译高频查询语句，避免每次调用重复解析 SQL
    stmtGetUserById = db.prepare('SELECT * FROM users WHERE id = ?');
    stmtGetUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
    stmtGetUserByUsername = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
    stmtLogApiCall = db.prepare(
        'INSERT INTO usage_logs (user_id, provider, operation, status, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmtCheckQuotaDaily = db.prepare(
        'SELECT COUNT(*) AS c FROM usage_logs WHERE user_id = ? AND provider = ? AND created_at >= ?'
    );
    stmtCheckQuotaMonthly = db.prepare(
        'SELECT COUNT(*) AS c FROM usage_logs WHERE user_id = ? AND provider = ? AND created_at >= ?'
    );

    // 定时 WAL checkpoint（每 30 秒），替代每次写操作后的 checkpoint
    if (_checkpointTimer) clearInterval(_checkpointTimer);
    _checkpointTimer = setInterval(checkpointWal, 30 * 1000);
    if (_checkpointTimer.unref) _checkpointTimer.unref();
}

function getUserById(id) {
    return stmtGetUserById.get(id);
}

function getUserByEmail(email) {
    const em = String(email || '')
        .trim()
        .toLowerCase();
    return stmtGetUserByEmail.get(em);
}

function getUserByUsername(username) {
    const u = String(username || '').trim();
    return stmtGetUserByUsername.get(u);
}

function createUser(username, email, passwordHash) {
    const created_at = new Date().toISOString();
    const info = db
        .prepare(
            `INSERT INTO users (username, email, password_hash, profile_json, created_at)
             VALUES (?, ?, ?, ?, ?)`
        )
        .run(username, email, passwordHash, '{}', created_at);
    const newUserId = Number(info.lastInsertRowid);
    // 首个注册用户自动成为管理员
    const adminUserId = process.env.ADMIN_USER_ID;
    if (adminUserId) {
        if (newUserId === Number(adminUserId)) {
            db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(newUserId);
        }
    } else if (newUserId === 1) {
        db.prepare("UPDATE users SET role = 'admin' WHERE id = 1").run();
    }
    return getUserById(newUserId);
}

function updateProfile(userId, profileObj) {
    db.prepare('UPDATE users SET profile_json = ? WHERE id = ?').run(JSON.stringify(profileObj), userId);
}

function updatePassword(userId, passwordHash) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, Number(userId));
}

function getUserRole(userId) {
    const row = db.prepare('SELECT role FROM users WHERE id = ?').get(Number(userId));
    return row ? row.role : 'user';
}

function isAdminRole(userId) {
    return getUserRole(userId) === 'admin';
}

function normalizeProvider(provider) {
    return String(provider || '')
        .trim()
        .toLowerCase();
}

function getUserApiCredentials(userId, provider) {
    const p = normalizeProvider(provider);
    if (!p) return null;
    const row = db
        .prepare('SELECT credentials_json FROM user_api_credentials WHERE user_id = ? AND provider = ?')
        .get(Number(userId), p);
    if (!row) return null;
    try {
        const data = JSON.parse(row.credentials_json || '{}');
        // 解密敏感字段
        return decryptSensitiveFields(data);
    } catch (_) {
        return null;
    }
}

function getAllUserApiCredentials(userId) {
    const rows = db
        .prepare('SELECT provider, credentials_json, updated_at FROM user_api_credentials WHERE user_id = ?')
        .all(Number(userId));
    const out = {};
    for (const row of rows) {
        try {
            const data = JSON.parse(row.credentials_json || '{}');
            out[row.provider] = {
                ...decryptSensitiveFields(data),
                updatedAt: row.updated_at,
            };
        } catch (_) {
            out[row.provider] = { updatedAt: row.updated_at };
        }
    }
    return out;
}

function upsertUserApiCredentials(userId, provider, credentialsObj) {
    const p = normalizeProvider(provider);
    if (!p) throw new Error('provider is required');
    const now = new Date().toISOString();
    const obj = credentialsObj && typeof credentialsObj === 'object' ? credentialsObj : {};
    // 加密敏感字段
    const encrypted = encryptSensitiveFields(obj);
    const payload = JSON.stringify(encrypted);
    db.prepare(
        `INSERT INTO user_api_credentials (user_id, provider, credentials_json, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, provider)
         DO UPDATE SET credentials_json = excluded.credentials_json, updated_at = excluded.updated_at`
    ).run(Number(userId), p, payload, now);
}

function deleteUserApiCredentials(userId, provider) {
    const p = normalizeProvider(provider);
    if (!p) return;
    db.prepare('DELETE FROM user_api_credentials WHERE user_id = ? AND provider = ?').run(Number(userId), p);
}

function getUserApiCredentialStatus(userId) {
    const providers = ['jimeng', 'alibaba', 'tencent', 'sdwebui'];
    // 单次查询获取已配置的 provider 列表，避免 N+1
    const rows = db.prepare('SELECT provider FROM user_api_credentials WHERE user_id = ?').all(Number(userId));
    const configured = new Set(rows.map((r) => r.provider));
    const out = {};
    for (const provider of providers) {
        out[provider] = configured.has(provider);
    }
    return out;
}

// ─── 管理员功能 ───

function getAllUsers() {
    const rows = db.prepare('SELECT id, username, email, role, profile_json, created_at FROM users ORDER BY created_at DESC').all();
    return rows.map((row) => {
        let profile = {};
        try { profile = JSON.parse(row.profile_json || '{}'); } catch (_) { /* profile_json 损坏时降级为空对象 */ }
        return {
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role || 'user',
            created_at: row.created_at,
        };
    });
}

// ─── 项目管理 ───

function createProject(userId, name, description, type) {
    const now = new Date().toISOString();
    const info = db.prepare(
        'INSERT INTO projects (user_id, name, description, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(Number(userId), name, description || '', type || 'other', now, now);
    const projectId = Number(info.lastInsertRowid);
    // 记录版本历史
    db.prepare(
        'INSERT INTO version_history (project_id, version, description, created_at) VALUES (?, 1, ?, ?)'
    ).run(projectId, '项目创建', now);
    return getProject(projectId);
}

function getProject(projectId) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(Number(projectId));
    if (!project) return null;
    project.assets = db.prepare('SELECT * FROM project_assets WHERE project_id = ? ORDER BY created_at DESC LIMIT 200').all(project.id);
    project.versionHistory = db.prepare('SELECT * FROM version_history WHERE project_id = ? ORDER BY created_at DESC LIMIT 50').all(project.id);
    return project;
}

function getUserProjects(userId, limit, offset) {
    let projects;
    if (limit !== undefined && offset !== undefined) {
        projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
            .all(Number(userId), Number(limit), Number(offset));
    } else {
        projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(Number(userId));
    }
    if (projects.length === 0) return projects;
    // 批量查询 assets 和 version_history，避免 N+1
    const ids = projects.map((p) => p.id);
    const placeholders = ids.map(() => '?').join(',');
    const allAssets = db.prepare(`SELECT * FROM project_assets WHERE project_id IN (${placeholders}) ORDER BY created_at DESC`).all(...ids);
    const allHistory = db.prepare(`SELECT * FROM version_history WHERE project_id IN (${placeholders}) ORDER BY created_at DESC`).all(...ids);
    const assetsMap = new Map();
    allAssets.forEach((a) => { if (!assetsMap.has(a.project_id)) assetsMap.set(a.project_id, []); assetsMap.get(a.project_id).push(a); });
    const historyMap = new Map();
    allHistory.forEach((h) => { if (!historyMap.has(h.project_id)) historyMap.set(h.project_id, []); historyMap.get(h.project_id).push(h); });
    return projects.map((p) => {
        p.assets = assetsMap.get(p.id) || [];
        p.versionHistory = historyMap.get(p.id) || [];
        return p;
    });
}

function getProjectCount(userId) {
    const row = db.prepare('SELECT COUNT(*) AS count FROM projects WHERE user_id = ?').get(Number(userId));
    return row ? row.count : 0;
}

function updateProject(projectId, userId, updates) {
    const now = new Date().toISOString();
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(Number(projectId), Number(userId));
    if (!project) return null;
    const newVersion = (project.version || 1) + 1;
    db.prepare(
        'UPDATE projects SET name = ?, description = ?, type = ?, version = ?, updated_at = ? WHERE id = ?'
    ).run(
        updates.name || project.name,
        updates.description !== undefined ? updates.description : project.description,
        updates.type || project.type,
        newVersion,
        now,
        Number(projectId)
    );
    db.prepare(
        'INSERT INTO version_history (project_id, version, description, created_at) VALUES (?, ?, ?, ?)'
    ).run(Number(projectId), newVersion, updates.versionDesc || '项目更新', now);
    return getProject(projectId);
}

function deleteProject(projectId, userId) {
    db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(Number(projectId), Number(userId));
}

// ─── 项目素材 ───

function addProjectAsset(projectId, userId, name, type, content) {
    const now = new Date().toISOString();
    const info = db.prepare(
        'INSERT INTO project_assets (project_id, user_id, name, type, content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(Number(projectId), Number(userId), name, type || 'image', content, now);
    return { id: Number(info.lastInsertRowid), project_id: projectId, name, type, content, created_at: now };
}

function deleteProjectAsset(assetId, userId) {
    db.prepare('DELETE FROM project_assets WHERE id = ? AND user_id = ?').run(Number(assetId), Number(userId));
}

// ─── 素材库 ───

function getAssetLibrary(userId, limit, offset) {
    if (limit !== undefined && offset !== undefined) {
        return db.prepare('SELECT * FROM asset_library WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
            .all(Number(userId), Number(limit), Number(offset));
    }
    return db.prepare('SELECT * FROM asset_library WHERE user_id = ? ORDER BY created_at DESC').all(Number(userId));
}

function getAssetLibraryCount(userId) {
    const row = db.prepare('SELECT COUNT(*) AS count FROM asset_library WHERE user_id = ?').get(Number(userId));
    return row ? row.count : 0;
}

function addAssetLibraryItem(userId, item) {
    const now = new Date().toISOString();
    const tags = item.tags ? (typeof item.tags === 'string' ? item.tags : JSON.stringify(item.tags)) : '[]';
    const info = db.prepare(
        'INSERT INTO asset_library (user_id, name, type, content, desc, source, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
        Number(userId),
        item.name || '',
        item.type || 'image',
        item.content || '',
        item.desc || '',
        item.source || '',
        tags,
        now
    );
    return { id: Number(info.lastInsertRowid), user_id: userId, ...item, tags, created_at: now };
}

function updateAssetLibraryItem(userId, itemId, updates) {
    const existing = db.prepare('SELECT * FROM asset_library WHERE id = ? AND user_id = ?').get(Number(itemId), Number(userId));
    if (!existing) return null;
    const tags = updates.tags !== undefined
        ? (typeof updates.tags === 'string' ? updates.tags : JSON.stringify(updates.tags))
        : existing.tags;
    db.prepare(
        'UPDATE asset_library SET name = ?, type = ?, content = ?, desc = ?, source = ?, tags = ? WHERE id = ? AND user_id = ?'
    ).run(
        updates.name !== undefined ? updates.name : existing.name,
        updates.type !== undefined ? updates.type : existing.type,
        updates.content !== undefined ? updates.content : existing.content,
        updates.desc !== undefined ? updates.desc : existing.desc,
        updates.source !== undefined ? updates.source : existing.source,
        tags,
        Number(itemId),
        Number(userId)
    );
    return db.prepare('SELECT * FROM asset_library WHERE id = ?').get(Number(itemId));
}

function deleteAssetLibraryItem(userId, itemId) {
    db.prepare('DELETE FROM asset_library WHERE id = ? AND user_id = ?').run(Number(itemId), Number(userId));
}

// ─── 用量追踪 ───

function logApiCall(userId, provider, operation, status, durationMs) {
    const now = new Date().toISOString();
    stmtLogApiCall.run(Number(userId), normalizeProvider(provider), operation, status, durationMs || 0, now);
}

function getUserUsageStats(userId) {
    return db.prepare(
        `SELECT provider, operation, status, COUNT(*) AS count, SUM(duration_ms) AS total_ms
         FROM usage_logs WHERE user_id = ?
         GROUP BY provider, operation, status`
    ).all(Number(userId));
}

function getUserUsageToday(userId) {
    const today = new Date().toISOString().split('T')[0];
    return db.prepare(
        `SELECT provider, COUNT(*) AS count
         FROM usage_logs WHERE user_id = ? AND created_at >= ?
         GROUP BY provider`
    ).all(Number(userId), today + 'T00:00:00.000Z');
}

function getGlobalUsageStats() {
    return db.prepare(
        `SELECT u.username, ul.provider, ul.operation, ul.status, COUNT(*) AS count
         FROM usage_logs ul
         JOIN users u ON u.id = ul.user_id
         GROUP BY ul.user_id, ul.provider, ul.operation, ul.status
         ORDER BY count DESC`
    ).all();
}

function getGlobalUsageSummary() {
    const total = db.prepare('SELECT COUNT(*) AS c FROM usage_logs').get();
    const today = new Date().toISOString().split('T')[0];
    const todayCount = db.prepare('SELECT COUNT(*) AS c FROM usage_logs WHERE created_at >= ?').get(today + 'T00:00:00.000Z');
    const byProvider = db.prepare(
        `SELECT provider, COUNT(*) AS count FROM usage_logs GROUP BY provider ORDER BY count DESC`
    ).all();
    return { total: total.c, today: todayCount.c, byProvider };
}

// ─── 活动日志 ───

function addActivity(userId, action, targetType, targetId, details) {
    const now = new Date().toISOString();
    db.prepare(
        `INSERT INTO activity_log (user_id, action, target_type, target_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).run(Number(userId), action, targetType || null, targetId !== null ? String(targetId) : null, details || null, now);
}

function getActivityLog(userId, limit, offset) {
    const lim = Math.min(100, Math.max(1, Number(limit) || 20));
    const off = Math.max(0, Number(offset) || 0);
    return db.prepare(
        `SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(Number(userId), lim, off);
}

function getActivityLogCount(userId) {
    const row = db.prepare('SELECT COUNT(*) AS count FROM activity_log WHERE user_id = ?').get(Number(userId));
    return row ? row.count : 0;
}

function getRecentActivity(limit) {
    const lim = Math.min(200, Math.max(1, Number(limit) || 50));
    return db.prepare(
        `SELECT al.*, u.username FROM activity_log al
         JOIN users u ON u.id = al.user_id
         ORDER BY al.created_at DESC LIMIT ?`
    ).all(lim);
}

function getRecentActivityCount() {
    const row = db.prepare('SELECT COUNT(*) AS count FROM activity_log').get();
    return row ? row.count : 0;
}

// ─── 配额管理 ───

function getUserQuota(userId, provider) {
    const p = normalizeProvider(provider);
    if (!p) return null;
    return db.prepare('SELECT * FROM user_quotas WHERE user_id = ? AND provider = ?').get(Number(userId), p);
}

function setUserQuota(userId, provider, dailyLimit, monthlyLimit) {
    const p = normalizeProvider(provider);
    if (!p) throw new Error('provider is required');
    const now = new Date().toISOString();
    db.prepare(
        `INSERT INTO user_quotas (user_id, provider, daily_limit, monthly_limit, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, provider)
         DO UPDATE SET daily_limit = excluded.daily_limit, monthly_limit = excluded.monthly_limit, updated_at = excluded.updated_at`
    ).run(Number(userId), p, dailyLimit || 100, monthlyLimit || 3000, now);
}

function checkQuota(userId, provider) {
    const p = normalizeProvider(provider);
    if (!p) return { ok: true };

    // 获取用户配额，如果没有则使用默认值
    const quota = getUserQuota(userId, p);
    const dailyLimit = quota ? quota.daily_limit : 100;
    const monthlyLimit = quota ? quota.monthly_limit : 3000;

    // 检查今日用量
    const today = new Date().toISOString().split('T')[0];
    const todayCount = stmtCheckQuotaDaily.get(Number(userId), p, today + 'T00:00:00.000Z');

    if (todayCount.c >= dailyLimit) {
        return { ok: false, reason: 'daily', limit: dailyLimit, used: todayCount.c };
    }

    // 检查本月用量
    const monthStart = today.substring(0, 7) + '-01';
    const monthCount = stmtCheckQuotaMonthly.get(Number(userId), p, monthStart + 'T00:00:00.000Z');

    if (monthCount.c >= monthlyLimit) {
        return { ok: false, reason: 'monthly', limit: monthlyLimit, used: monthCount.c };
    }

    return { ok: true, dailyUsed: todayCount.c, dailyLimit, monthlyUsed: monthCount.c, monthlyLimit };
}

/**
 * 关闭数据库连接（优雅关闭时调用）
 */
function close() {
    if (db) {
        try {
            checkpointWal();
            db.close();
        } catch (_e) {
            /* ignore close errors */
        }
        db = null;
    }
}

module.exports = {
    init,
    close,
    getUserById,
    getUserByEmail,
    getUserByUsername,
    createUser,
    updateProfile,
    updatePassword,
    getUserRole,
    isAdminRole,
    getUserApiCredentials,
    getAllUserApiCredentials,
    upsertUserApiCredentials,
    deleteUserApiCredentials,
    getUserApiCredentialStatus,
    getAllUsers,
    logApiCall,
    getUserUsageStats,
    getUserUsageToday,
    getGlobalUsageStats,
    getGlobalUsageSummary,
    getUserQuota,
    setUserQuota,
    checkQuota,
    createProject,
    getProject,
    getUserProjects,
    getProjectCount,
    updateProject,
    deleteProject,
    addProjectAsset,
    deleteProjectAsset,
    getAssetLibrary,
    getAssetLibraryCount,
    addAssetLibraryItem,
    updateAssetLibraryItem,
    deleteAssetLibraryItem,
    addActivity,
    getActivityLog,
    getActivityLogCount,
    getRecentActivity,
    getRecentActivityCount,
};
