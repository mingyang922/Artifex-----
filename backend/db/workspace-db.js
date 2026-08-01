/**
 * Artifex advanced workflow data layer.
 * Collaboration, generation history, reviews, notifications, characters and LoRA jobs.
 */
'use strict';

const crypto = require('crypto');

function json(value, fallback = {}) {
    try {
        return JSON.parse(value || JSON.stringify(fallback));
    } catch (_) {
        return fallback;
    }
}

function token() {
    return crypto.randomBytes(24).toString('base64url');
}

function tokenHash(value) {
    return crypto
        .createHash('sha256')
        .update(String(value || ''))
        .digest('hex');
}

function createWorkspaceDb(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS generation_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            project_id INTEGER,
            character_id INTEGER,
            provider TEXT NOT NULL DEFAULT '',
            mode TEXT NOT NULL DEFAULT 'text2img',
            prompt TEXT NOT NULL DEFAULT '',
            negative_prompt TEXT NOT NULL DEFAULT '',
            params_json TEXT NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'queued',
            outputs_json TEXT NOT NULL DEFAULT '[]',
            estimated_cost REAL NOT NULL DEFAULT 0,
            error TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_created
            ON generation_jobs(user_id, created_at);
        CREATE TABLE IF NOT EXISTS character_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            project_id INTEGER,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            palette TEXT NOT NULL DEFAULT '',
            seed TEXT NOT NULL DEFAULT '',
            style_prompt TEXT NOT NULL DEFAULT '',
            negative_prompt TEXT NOT NULL DEFAULT '',
            locked_traits_json TEXT NOT NULL DEFAULT '[]',
            references_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS character_evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            character_id INTEGER NOT NULL,
            generation_job_id INTEGER,
            method TEXT NOT NULL,
            score INTEGER NOT NULL,
            observation_json TEXT NOT NULL DEFAULT '{}',
            result_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (character_id) REFERENCES character_profiles(id) ON DELETE CASCADE,
            FOREIGN KEY (generation_job_id) REFERENCES generation_jobs(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_character_evaluations_user_created
            ON character_evaluations(user_id, created_at);
        CREATE TABLE IF NOT EXISTS lora_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            project_id INTEGER,
            name TEXT NOT NULL,
            provider TEXT NOT NULL DEFAULT 'sdwebui',
            images_json TEXT NOT NULL DEFAULT '[]',
            params_json TEXT NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'draft',
            progress INTEGER NOT NULL DEFAULT 0,
            model_path TEXT NOT NULL DEFAULT '',
            error TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS project_members (
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer',
            created_at TEXT NOT NULL,
            PRIMARY KEY(project_id, user_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS project_invites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            created_by INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL DEFAULT 'viewer',
            kind TEXT NOT NULL DEFAULT 'invite',
            expires_at TEXT,
            revoked_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS project_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            asset_id INTEGER,
            body TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS asset_reviews (
            project_id INTEGER NOT NULL,
            asset_id INTEGER NOT NULL,
            reviewer_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            note TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL,
            PRIMARY KEY(project_id, asset_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            title TEXT NOT NULL,
            body TEXT NOT NULL DEFAULT '',
            link TEXT NOT NULL DEFAULT '',
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_user_created
            ON notifications(user_id, created_at);
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS asset_collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, name),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS asset_collection_items (
            collection_id INTEGER NOT NULL,
            asset_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(collection_id, asset_id),
            FOREIGN KEY (collection_id) REFERENCES asset_collections(id) ON DELETE CASCADE,
            FOREIGN KEY (asset_id) REFERENCES asset_library(id) ON DELETE CASCADE
        );
    `);

    const projectColumns = db
        .prepare('PRAGMA table_info(projects)')
        .all()
        .map((c) => c.name);
    if (!projectColumns.includes('review_status')) {
        db.exec("ALTER TABLE projects ADD COLUMN review_status TEXT NOT NULL DEFAULT 'draft'");
    }
    const versionColumns = db
        .prepare('PRAGMA table_info(version_history)')
        .all()
        .map((c) => c.name);
    if (!versionColumns.includes('snapshot_json')) {
        db.exec('ALTER TABLE version_history ADD COLUMN snapshot_json TEXT');
    }
    const loraColumns = db
        .prepare('PRAGMA table_info(lora_jobs)')
        .all()
        .map((c) => c.name);
    if (!loraColumns.includes('dispatch_attempts')) {
        db.exec('ALTER TABLE lora_jobs ADD COLUMN dispatch_attempts INTEGER NOT NULL DEFAULT 0');
    }
    if (!loraColumns.includes('worker_job_key')) {
        db.exec("ALTER TABLE lora_jobs ADD COLUMN worker_job_key TEXT NOT NULL DEFAULT ''");
    }

    function hydrateJob(row) {
        if (!row) return null;
        return { ...row, params: json(row.params_json), outputs: json(row.outputs_json, []) };
    }

    function access(userId, projectId) {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(Number(projectId));
        if (!project) return null;
        if (project.user_id === Number(userId)) return { project, role: 'owner' };
        const member = db
            .prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?')
            .get(Number(projectId), Number(userId));
        return member ? { project, role: member.role } : null;
    }

    function canEdit(role) {
        return ['owner', 'editor'].includes(role);
    }

    function notify(userId, data) {
        const now = new Date().toISOString();
        const info = db
            .prepare(
                `INSERT INTO notifications (user_id, type, title, body, link, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)`
            )
            .run(
                Number(userId),
                data.type || 'info',
                String(data.title || 'Artifex 通知').slice(0, 120),
                String(data.body || '').slice(0, 1000),
                String(data.link || '').slice(0, 500),
                now
            );
        return { id: Number(info.lastInsertRowid), user_id: Number(userId), is_read: 0, created_at: now, ...data };
    }

    function projectRecipients(projectId, excludeUserId) {
        const project = db.prepare('SELECT user_id FROM projects WHERE id = ?').get(Number(projectId));
        if (!project) return [];
        const ids = [project.user_id].concat(
            db
                .prepare('SELECT user_id FROM project_members WHERE project_id = ?')
                .all(Number(projectId))
                .map((r) => r.user_id)
        );
        return [...new Set(ids)].filter((id) => id !== Number(excludeUserId));
    }

    function createGenerationJob(userId, input) {
        const now = new Date().toISOString();
        const status = ['draft', 'queued', 'running', 'completed', 'failed', 'cancelled'].includes(input.status)
            ? input.status
            : 'draft';
        const info = db
            .prepare(
                `INSERT INTO generation_jobs
                 (user_id, project_id, character_id, provider, mode, prompt, negative_prompt, params_json,
                  status, outputs_json, estimated_cost, error, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                Number(userId),
                input.projectId || null,
                input.characterId || null,
                input.provider || '',
                input.mode || 'text2img',
                input.prompt || '',
                input.negativePrompt || '',
                JSON.stringify(input.params || {}),
                status,
                JSON.stringify(input.outputs || []),
                Number(input.estimatedCost) || 0,
                input.error || '',
                now,
                now
            );
        return hydrateJob(db.prepare('SELECT * FROM generation_jobs WHERE id = ?').get(info.lastInsertRowid));
    }

    function updateGenerationJob(userId, id, input) {
        const existing = db
            .prepare('SELECT * FROM generation_jobs WHERE id = ? AND user_id = ?')
            .get(Number(id), Number(userId));
        if (!existing) return null;
        const nextStatus = input.retry ? 'draft' : input.status || existing.status;
        const now = new Date().toISOString();
        db.prepare(
            `UPDATE generation_jobs SET status = ?, outputs_json = ?, error = ?, estimated_cost = ?, updated_at = ?
             WHERE id = ? AND user_id = ?`
        ).run(
            nextStatus,
            input.retry ? '[]' : JSON.stringify(input.outputs ?? json(existing.outputs_json, [])),
            input.retry ? '' : (input.error ?? existing.error),
            Number(input.estimatedCost ?? existing.estimated_cost) || 0,
            now,
            Number(id),
            Number(userId)
        );
        return hydrateJob(db.prepare('SELECT * FROM generation_jobs WHERE id = ?').get(Number(id)));
    }

    function listGenerationJobs(userId, options = {}) {
        const where = ['user_id = ?'];
        const params = [Number(userId)];
        if (options.status) {
            where.push('status = ?');
            params.push(options.status);
        }
        if (options.projectId) {
            where.push('project_id = ?');
            params.push(Number(options.projectId));
        }
        const limit = Math.min(100, Math.max(1, Number(options.limit) || 30));
        return db
            .prepare(`SELECT * FROM generation_jobs WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`)
            .all(...params, limit)
            .map(hydrateJob);
    }

    function upsertCharacter(userId, input, id) {
        const now = new Date().toISOString();
        if (id) {
            const current = db
                .prepare('SELECT * FROM character_profiles WHERE id = ? AND user_id = ?')
                .get(Number(id), Number(userId));
            if (!current) return null;
            db.prepare(
                `UPDATE character_profiles SET project_id=?, name=?, description=?, palette=?, seed=?, style_prompt=?,
                 negative_prompt=?, locked_traits_json=?, references_json=?, updated_at=? WHERE id=? AND user_id=?`
            ).run(
                input.projectId ?? current.project_id,
                input.name || current.name,
                input.description ?? current.description,
                input.palette ?? current.palette,
                input.seed ?? current.seed,
                input.stylePrompt ?? current.style_prompt,
                input.negativePrompt ?? current.negative_prompt,
                JSON.stringify(input.lockedTraits ?? json(current.locked_traits_json, [])),
                JSON.stringify(input.references ?? json(current.references_json, [])),
                now,
                Number(id),
                Number(userId)
            );
        } else {
            const info = db
                .prepare(
                    `INSERT INTO character_profiles
                     (user_id, project_id, name, description, palette, seed, style_prompt, negative_prompt,
                      locked_traits_json, references_json, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                )
                .run(
                    Number(userId),
                    input.projectId || null,
                    input.name,
                    input.description || '',
                    input.palette || '',
                    input.seed || '',
                    input.stylePrompt || '',
                    input.negativePrompt || '',
                    JSON.stringify(input.lockedTraits || []),
                    JSON.stringify(input.references || []),
                    now,
                    now
                );
            id = Number(info.lastInsertRowid);
        }
        const row = db.prepare('SELECT * FROM character_profiles WHERE id = ?').get(Number(id));
        return { ...row, lockedTraits: json(row.locked_traits_json, []), references: json(row.references_json, []) };
    }

    function captureProjectVersion(projectId) {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(Number(projectId));
        if (!project) return;
        const assets = db
            .prepare('SELECT user_id, name, type, content, created_at FROM project_assets WHERE project_id = ?')
            .all(Number(projectId));
        const snapshot = JSON.stringify({ project, assets });
        db.prepare(
            `UPDATE version_history SET snapshot_json = ?
             WHERE id = (SELECT id FROM version_history WHERE project_id = ? ORDER BY version DESC, id DESC LIMIT 1)`
        ).run(snapshot, Number(projectId));
    }

    function restoreVersion(userId, projectId, version) {
        const grant = access(userId, projectId);
        if (!grant || !canEdit(grant.role)) return null;
        const row = db
            .prepare('SELECT * FROM version_history WHERE project_id = ? AND version = ?')
            .get(Number(projectId), Number(version));
        const snapshot = row && json(row.snapshot_json, null);
        if (!snapshot || !snapshot.project) return null;
        const snapshotAssets = Array.isArray(snapshot.assets) ? snapshot.assets : [];
        // 旧版快照只有素材元数据，不能安全覆盖当前素材。
        const canRestoreAssets = snapshotAssets.every((asset) => typeof asset.content === 'string');
        const now = new Date().toISOString();
        const nextVersion = Number(grant.project.version || 1) + 1;
        const restore = db.transaction(() => {
            db.prepare(
                `UPDATE projects SET name=?, description=?, type=?, review_status=?, version=?, updated_at=? WHERE id=?`
            ).run(
                snapshot.project.name,
                snapshot.project.description,
                snapshot.project.type,
                snapshot.project.review_status || 'draft',
                nextVersion,
                now,
                Number(projectId)
            );
            if (canRestoreAssets) {
                db.prepare('DELETE FROM project_assets WHERE project_id=?').run(Number(projectId));
                const insertAsset = db.prepare(
                    `INSERT INTO project_assets (project_id,user_id,name,type,content,created_at)
                     VALUES (?,?,?,?,?,?)`
                );
                for (const asset of snapshotAssets) {
                    insertAsset.run(
                        Number(projectId),
                        Number(asset.user_id) || Number(userId),
                        String(asset.name || '未命名素材'),
                        String(asset.type || 'image'),
                        asset.content,
                        asset.created_at || now
                    );
                }
            }
            const restoredProject = db.prepare('SELECT * FROM projects WHERE id=?').get(Number(projectId));
            const restoredAssets = db.prepare('SELECT * FROM project_assets WHERE project_id=?').all(Number(projectId));
            db.prepare(
                'INSERT INTO version_history (project_id, version, description, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?)'
            ).run(
                Number(projectId),
                nextVersion,
                `恢复到版本 ${version}`,
                JSON.stringify({ project: restoredProject, assets: restoredAssets }),
                now
            );
        });
        restore();
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(Number(projectId));
        project.assets = db.prepare('SELECT * FROM project_assets WHERE project_id=?').all(Number(projectId));
        return project;
    }

    function createInvite(userId, projectId, input = {}) {
        const grant = access(userId, projectId);
        if (!grant || grant.role !== 'owner') return null;
        const value = token();
        const now = new Date().toISOString();
        const expires = new Date(Date.now() + (Number(input.days) || 7) * 86400000).toISOString();
        db.prepare(
            `INSERT INTO project_invites (project_id, created_by, token, role, kind, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
            Number(projectId),
            Number(userId),
            value,
            ['viewer', 'editor', 'reviewer'].includes(input.role) ? input.role : 'viewer',
            input.kind === 'share' ? 'share' : 'invite',
            expires,
            now
        );
        return { token: value, role: input.role || 'viewer', kind: input.kind || 'invite', expiresAt: expires };
    }

    function acceptInvite(userId, value) {
        const invite = db
            .prepare(
                `SELECT * FROM project_invites WHERE token=? AND revoked_at IS NULL
                 AND (expires_at IS NULL OR expires_at > ?)`
            )
            .get(value, new Date().toISOString());
        if (!invite || invite.kind !== 'invite') return null;
        const project = db.prepare('SELECT user_id FROM projects WHERE id = ?').get(invite.project_id);
        if (!project || project.user_id === Number(userId)) return { projectId: invite.project_id, role: 'owner' };
        db.prepare(
            `INSERT INTO project_members (project_id, user_id, role, created_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(project_id, user_id) DO UPDATE SET role=excluded.role`
        ).run(invite.project_id, Number(userId), invite.role, new Date().toISOString());
        return { projectId: invite.project_id, role: invite.role };
    }

    function publicShare(value) {
        const invite = db
            .prepare(
                `SELECT * FROM project_invites WHERE token=? AND kind='share' AND revoked_at IS NULL
                 AND (expires_at IS NULL OR expires_at > ?)`
            )
            .get(value, new Date().toISOString());
        if (!invite) return null;
        const project = db
            .prepare('SELECT id,name,description,type,version,review_status,updated_at FROM projects WHERE id=?')
            .get(invite.project_id);
        if (!project) return null;
        project.assets = db
            .prepare('SELECT id,name,type,created_at FROM project_assets WHERE project_id=? ORDER BY created_at DESC')
            .all(invite.project_id);
        return project;
    }

    function requestPasswordReset(email) {
        const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(
            String(email || '')
                .trim()
                .toLowerCase()
        );
        if (!user) return null;
        const value = token();
        const now = new Date().toISOString();
        const expires = new Date(Date.now() + 30 * 60000).toISOString();
        db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < ?').run(user.id, now);
        db.prepare(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)`
        ).run(user.id, tokenHash(value), expires, now);
        return { token: value, userId: user.id, email: user.email, expiresAt: expires };
    }

    function consumePasswordReset(value) {
        const now = new Date().toISOString();
        const row = db
            .prepare(`SELECT * FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at > ?`)
            .get(tokenHash(value), now);
        if (!row) return null;
        db.prepare('UPDATE password_reset_tokens SET used_at=? WHERE id=?').run(now, row.id);
        return row.user_id;
    }

    return {
        db,
        access,
        canEdit,
        notify,
        projectRecipients,
        createGenerationJob,
        updateGenerationJob,
        listGenerationJobs,
        upsertCharacter,
        captureProjectVersion,
        restoreVersion,
        createInvite,
        acceptInvite,
        publicShare,
        requestPasswordReset,
        consumePasswordReset,
        token,
        json,
    };
}

module.exports = { createWorkspaceDb };
