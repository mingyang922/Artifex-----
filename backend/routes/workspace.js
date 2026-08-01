/**
 * Artifex production workflow routes.
 */
'use strict';

const { Router } = require('express');
const { sendError, ERR } = require('../lib/error-response');

function getWorkflowCapabilities(environment = process.env) {
    const webhookValue = String(environment.LORA_TRAINING_WEBHOOK_URL || '').trim();
    const workerTokenValue = String(environment.LORA_WORKER_TOKEN || '').trim();
    let webhookConfigured = false;
    try {
        webhookConfigured = ['http:', 'https:'].includes(new URL(webhookValue).protocol);
    } catch (_) {
        // Invalid or missing URL keeps the external capability disabled.
    }
    const workerTokenConfigured = workerTokenValue.length >= 32;
    const loraReady = webhookConfigured && workerTokenConfigured;

    return {
        characterConsistency: {
            status: 'simplified',
            enabled: true,
            label: '简化版',
            description: '保存 Seed、提示词、锁定属性与参考图 URL，并注入生成器。',
            limitations: ['不包含角色 embedding', '不包含多参考图一致性模型', '不保证跨批次像素级一致'],
        },
        loraTraining: {
            status: loraReady ? 'available' : 'unavailable',
            enabled: loraReady,
            label: loraReady ? 'Worker 已连接' : '未配置训练 Worker',
            description: loraReady
                ? '新任务会派发到外部训练 Worker，并通过安全回调更新进度。'
                : '需要同时配置训练 Webhook 与 Worker Token，当前不会创建无法执行的排队任务。',
            requirements: {
                webhookConfigured,
                workerTokenConfigured,
            },
        },
        passwordReset: {
            status: 'unavailable',
            enabled: false,
            label: '未完成',
            description: '当前部署没有完整的用户自助投递与密码更新闭环。',
        },
        figmaIntegration: {
            status: 'not_implemented',
            enabled: false,
            label: '未实现',
            description: '当前没有 Figma API、插件或 OAuth 集成。',
        },
    };
}

async function dispatchLoraWebhook({ fetchImpl, url, token, jobKey, payload, timeoutMs = 10000, onAttempt }) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        onAttempt?.(attempt);
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            Math.min(30000, Math.max(1000, Number(timeoutMs) || 10000))
        );
        try {
            const response = await fetchImpl(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'Idempotency-Key': jobKey,
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`Worker returned HTTP ${response.status}`);
            return { attempts: attempt };
        } catch (error) {
            lastError = error;
            if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        } finally {
            clearTimeout(timeout);
        }
    }
    throw lastError;
}

function createWorkspaceRouter(deps) {
    const router = Router();
    const {
        workspaceDb,
        usersDb,
        requireAuth,
        csrfProtection,
        notifyUser = () => {},
        environment = process.env,
        fetchImpl = global.fetch,
    } = deps;
    const db = workspaceDb.db;
    const rolePermissions = {
        owner: new Set(['view', 'comment', 'edit', 'review', 'restore', 'manage']),
        editor: new Set(['view', 'comment', 'edit', 'restore']),
        reviewer: new Set(['view', 'comment', 'review']),
        viewer: new Set(['view']),
    };

    function emit(userId, data) {
        const saved = workspaceDb.notify(userId, data);
        notifyUser(userId, saved);
        return saved;
    }

    function requireProject(permission = 'view') {
        return (req, res, next) => {
            const grant = workspaceDb.access(req.currentUser.id, Number(req.params.id));
            if (!grant) return sendError(res, 404, ERR.NOT_FOUND, '项目不存在或无权访问');
            if (!rolePermissions[grant.role]?.has(permission)) {
                return sendError(res, 403, ERR.FORBIDDEN, '当前项目角色无此操作权限');
            }
            req.projectGrant = grant;
            next();
        };
    }

    router.get('/capabilities', requireAuth, (_req, res) => {
        res.json({ ok: true, capabilities: getWorkflowCapabilities(environment) });
    });

    // Public, revocable read-only share.
    router.get('/shared-projects/:token', (req, res) => {
        const project = workspaceDb.publicShare(req.params.token);
        if (!project) return sendError(res, 404, ERR.NOT_FOUND, '分享链接无效或已过期');
        res.json({ ok: true, project });
    });

    // Callback used by a separately deployed LoRA worker.
    router.post('/lora-jobs/:jobId/callback', (req, res) => {
        const configuredToken = environment.LORA_WORKER_TOKEN;
        const suppliedToken = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
        if (!configuredToken || suppliedToken !== configuredToken) {
            return sendError(res, 401, ERR.UNAUTHORIZED, 'LoRA worker token 无效');
        }
        const allowed = ['queued', 'running', 'completed', 'failed', 'cancelled'];
        const status = allowed.includes(req.body?.status) ? req.body.status : 'running';
        const job = db.prepare('SELECT * FROM lora_jobs WHERE id=?').get(Number(req.params.jobId));
        if (!job) return sendError(res, 404, ERR.NOT_FOUND, 'LoRA 任务不存在');
        if (job.status === 'cancelled') return sendError(res, 409, ERR.CONFLICT, '已取消任务不能再更新进度');
        db.prepare(`UPDATE lora_jobs SET status=?, progress=?, model_path=?, error=?, updated_at=? WHERE id=?`).run(
            status,
            Math.min(100, Math.max(0, Number(req.body?.progress) || 0)),
            String(req.body?.modelPath || '').slice(0, 1000),
            String(req.body?.error || '').slice(0, 2000),
            new Date().toISOString(),
            job.id
        );
        if (status === 'completed' || status === 'failed') {
            emit(job.user_id, {
                type: status,
                title: status === 'completed' ? 'LoRA 训练已完成' : 'LoRA 训练失败',
                body: job.name,
                link: '/modules/workflow-hub/index.html#lora',
            });
        }
        res.json({ ok: true });
    });

    // Generation history and retry lifecycle.
    router.get('/generation-jobs', requireAuth, (req, res) => {
        const jobs = workspaceDb.listGenerationJobs(req.currentUser.id, {
            status: req.query.status,
            projectId: req.query.projectId,
            limit: req.query.limit,
        });
        res.json({ ok: true, jobs });
    });
    router.post('/generation-jobs', requireAuth, csrfProtection, (req, res) => {
        const input = req.body || {};
        if (!String(input.prompt || '').trim()) return sendError(res, 400, ERR.VALIDATION, 'Prompt 不能为空');
        if (String(input.prompt).length > 10000) {
            return sendError(res, 400, ERR.VALIDATION, 'Prompt 过长，最多 10000 字符');
        }
        // 状态、输出和成本由服务端生成流程维护，客户端不可信。
        const job = workspaceDb.createGenerationJob(req.currentUser.id, {
            provider: String(input.provider || '').slice(0, 40),
            mode: input.mode === 'img2img' ? 'img2img' : 'text2img',
            prompt: String(input.prompt).trim(),
            projectId: input.projectId || null,
            characterId: input.characterId || null,
            params: input.params && typeof input.params === 'object' ? input.params : {},
            status: 'draft',
        });
        res.status(201).json({ ok: true, job });
    });
    router.put('/generation-jobs/:jobId', requireAuth, csrfProtection, (req, res) => {
        sendError(res, 405, ERR.FORBIDDEN, '生成任务状态由服务端维护');
    });
    router.post('/generation-jobs/:jobId/retry', requireAuth, csrfProtection, (req, res) => {
        const source = db
            .prepare('SELECT * FROM generation_jobs WHERE id=? AND user_id=?')
            .get(Number(req.params.jobId), req.currentUser.id);
        if (!source) return sendError(res, 404, ERR.NOT_FOUND, '生成任务不存在');
        const job = workspaceDb.createGenerationJob(req.currentUser.id, {
            projectId: source.project_id,
            characterId: source.character_id,
            provider: source.provider,
            mode: source.mode,
            prompt: source.prompt,
            negativePrompt: source.negative_prompt,
            params: workspaceDb.json(source.params_json, {}),
            status: 'draft',
        });
        res.status(201).json({ ok: true, job, sourceJobId: source.id });
    });

    // Character consistency profiles.
    router.get('/characters', requireAuth, (req, res) => {
        const params = [req.currentUser.id];
        let sql = 'SELECT * FROM character_profiles WHERE user_id=?';
        if (req.query.projectId) {
            sql += ' AND project_id=?';
            params.push(Number(req.query.projectId));
        }
        sql += ' ORDER BY updated_at DESC';
        const characters = db
            .prepare(sql)
            .all(...params)
            .map((row) => ({
                ...row,
                lockedTraits: workspaceDb.json(row.locked_traits_json, []),
                references: workspaceDb.json(row.references_json, []),
            }));
        res.json({ ok: true, characters });
    });
    router.post('/characters', requireAuth, csrfProtection, (req, res) => {
        if (!String(req.body?.name || '').trim()) return sendError(res, 400, ERR.VALIDATION, '角色名称不能为空');
        res.status(201).json({ ok: true, character: workspaceDb.upsertCharacter(req.currentUser.id, req.body) });
    });
    router.put('/characters/:characterId', requireAuth, csrfProtection, (req, res) => {
        const character = workspaceDb.upsertCharacter(req.currentUser.id, req.body || {}, req.params.characterId);
        if (!character) return sendError(res, 404, ERR.NOT_FOUND, '角色档案不存在');
        res.json({ ok: true, character });
    });
    router.delete('/characters/:characterId', requireAuth, csrfProtection, (req, res) => {
        db.prepare('DELETE FROM character_profiles WHERE id=? AND user_id=?').run(
            Number(req.params.characterId),
            req.currentUser.id
        );
        res.json({ ok: true });
    });

    // LoRA training job registry. A worker can claim queued jobs and update progress.
    router.get('/lora-jobs', requireAuth, (req, res) => {
        const jobs = db
            .prepare('SELECT * FROM lora_jobs WHERE user_id=? ORDER BY created_at DESC')
            .all(req.currentUser.id)
            .map((row) => ({
                ...row,
                images: workspaceDb.json(row.images_json, []),
                params: workspaceDb.json(row.params_json),
            }));
        res.json({ ok: true, jobs });
    });
    router.post('/lora-jobs', requireAuth, csrfProtection, (req, res) => {
        const capability = getWorkflowCapabilities(environment).loraTraining;
        if (!capability.enabled) {
            return sendError(
                res,
                503,
                ERR.SERVICE_UNAVAILABLE,
                'LoRA 训练 Worker 未配置，当前不能创建训练任务',
                capability.requirements
            );
        }
        const input = req.body || {};
        const images = Array.isArray(input.images) ? input.images.slice(0, 50) : [];
        if (!input.name || images.length < 5) {
            return sendError(res, 400, ERR.VALIDATION, 'LoRA 任务需要名称和至少 5 张训练图');
        }
        const now = new Date().toISOString();
        const workerJobKey = `artifex-lora-${req.currentUser.id}-${Date.now()}`;
        const info = db
            .prepare(
                `INSERT INTO lora_jobs
                 (user_id, project_id, name, provider, images_json, params_json, status, worker_job_key, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)`
            )
            .run(
                req.currentUser.id,
                input.projectId || null,
                String(input.name).slice(0, 100),
                input.provider || 'sdwebui',
                JSON.stringify(images),
                JSON.stringify(input.params || {}),
                workerJobKey,
                now,
                now
            );
        const jobId = Number(info.lastInsertRowid);
        const webhookUrl = environment.LORA_TRAINING_WEBHOOK_URL;
        const callbackUrl = `${req.protocol}://${req.get('host')}/api/lora-jobs/${jobId}/callback`;
        dispatchLoraWebhook({
            fetchImpl,
            url: webhookUrl,
            token: environment.LORA_WORKER_TOKEN,
            jobKey: workerJobKey,
            timeoutMs: environment.LORA_DISPATCH_TIMEOUT_MS,
            payload: {
                jobId,
                idempotencyKey: workerJobKey,
                name: String(input.name).slice(0, 100),
                provider: input.provider || 'sdwebui',
                images,
                params: input.params || {},
                callbackUrl,
            },
            onAttempt: (attempt) => {
                db.prepare('UPDATE lora_jobs SET dispatch_attempts=?, updated_at=? WHERE id=?').run(
                    attempt,
                    new Date().toISOString(),
                    jobId
                );
            },
        }).catch((error) => {
            console.error('[lora] training webhook failed:', error.message);
            db.prepare(`UPDATE lora_jobs SET status='failed', error=?, updated_at=? WHERE id=?`).run(
                `训练 Worker 派发失败：${String(error.message).slice(0, 500)}`,
                new Date().toISOString(),
                jobId
            );
            emit(req.currentUser.id, {
                type: 'failed',
                title: 'LoRA 任务派发失败',
                body: String(input.name).slice(0, 100),
                link: '/modules/workflow-hub/index.html#lora',
            });
        });
        res.status(201).json({ ok: true, id: jobId, status: 'queued', dispatched: true, workerJobKey });
    });
    router.put('/lora-jobs/:jobId', requireAuth, csrfProtection, (req, res) => {
        const job = db
            .prepare('SELECT * FROM lora_jobs WHERE id=? AND user_id=?')
            .get(Number(req.params.jobId), req.currentUser.id);
        if (!job) return sendError(res, 404, ERR.NOT_FOUND, 'LoRA 任务不存在');
        if (req.body?.status !== 'cancelled') {
            return sendError(res, 403, ERR.FORBIDDEN, '训练状态和模型路径只能由 Worker 回调更新');
        }
        if (!['queued', 'running'].includes(job.status)) {
            return sendError(res, 409, ERR.CONFLICT, '当前任务状态不能取消');
        }
        db.prepare("UPDATE lora_jobs SET status='cancelled', updated_at=? WHERE id=?").run(
            new Date().toISOString(),
            job.id
        );
        res.json({ ok: true, status: 'cancelled' });
    });

    // Projects visible through ownership or membership.
    router.get('/collaboration/projects', requireAuth, (req, res) => {
        const projects = db
            .prepare(
                `SELECT p.*, CASE WHEN p.user_id=? THEN 'owner' ELSE pm.role END AS access_role
                 FROM projects p LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=?
                 WHERE p.user_id=? OR pm.user_id=? ORDER BY p.updated_at DESC`
            )
            .all(req.currentUser.id, req.currentUser.id, req.currentUser.id, req.currentUser.id);
        res.json({ ok: true, projects });
    });
    router.get('/projects/:id/members', requireAuth, requireProject(), (req, res) => {
        const owner = db
            .prepare(
                `SELECT u.id,u.username,u.email,'owner' AS role FROM projects p JOIN users u ON u.id=p.user_id WHERE p.id=?`
            )
            .get(Number(req.params.id));
        const members = db
            .prepare(
                `SELECT u.id,u.username,u.email,pm.role FROM project_members pm
                 JOIN users u ON u.id=pm.user_id WHERE pm.project_id=? ORDER BY pm.created_at`
            )
            .all(Number(req.params.id));
        res.json({ ok: true, members: owner ? [owner, ...members] : members });
    });
    router.post('/projects/:id/members', requireAuth, csrfProtection, requireProject(), (req, res) => {
        if (req.projectGrant.role !== 'owner') return sendError(res, 403, ERR.FORBIDDEN, '仅项目所有者可添加成员');
        const user = usersDb.getUserByEmail(req.body?.email);
        if (!user) return sendError(res, 404, ERR.NOT_FOUND, '未找到该邮箱对应的用户');
        const role = ['viewer', 'editor', 'reviewer'].includes(req.body?.role) ? req.body.role : 'viewer';
        db.prepare(
            `INSERT INTO project_members (project_id,user_id,role,created_at) VALUES (?,?,?,?)
             ON CONFLICT(project_id,user_id) DO UPDATE SET role=excluded.role`
        ).run(Number(req.params.id), user.id, role, new Date().toISOString());
        emit(user.id, {
            type: 'project_invite',
            title: '你已加入项目',
            body: req.projectGrant.project.name,
            link: `/modules/workflow-hub/index.html?projectId=${req.params.id}#collaboration`,
        });
        res.json({ ok: true, member: { id: user.id, email: user.email, role } });
    });
    router.delete('/projects/:id/members/:userId', requireAuth, csrfProtection, requireProject(), (req, res) => {
        if (req.projectGrant.role !== 'owner') return sendError(res, 403, ERR.FORBIDDEN, '仅项目所有者可移除成员');
        db.prepare('DELETE FROM project_members WHERE project_id=? AND user_id=?').run(
            Number(req.params.id),
            Number(req.params.userId)
        );
        res.json({ ok: true });
    });
    router.post('/projects/:id/invites', requireAuth, csrfProtection, requireProject(), (req, res) => {
        const invite = workspaceDb.createInvite(req.currentUser.id, req.params.id, req.body || {});
        if (!invite) return sendError(res, 403, ERR.FORBIDDEN, '仅项目所有者可创建分享');
        res.status(201).json({ ok: true, invite });
    });
    router.get('/projects/:id/invites', requireAuth, requireProject(), (req, res) => {
        if (req.projectGrant.role !== 'owner') return sendError(res, 403, ERR.FORBIDDEN, '仅项目所有者可查看邀请');
        const invites = db
            .prepare(
                `SELECT token,role,kind,expires_at,revoked_at,created_at
                 FROM project_invites WHERE project_id=? ORDER BY created_at DESC`
            )
            .all(Number(req.params.id));
        res.json({ ok: true, invites });
    });
    router.delete('/projects/:id/invites/:token', requireAuth, csrfProtection, requireProject(), (req, res) => {
        if (req.projectGrant.role !== 'owner') return sendError(res, 403, ERR.FORBIDDEN, '仅项目所有者可撤销邀请');
        const result = db
            .prepare(
                `UPDATE project_invites SET revoked_at=?
                 WHERE project_id=? AND token=? AND revoked_at IS NULL`
            )
            .run(new Date().toISOString(), Number(req.params.id), req.params.token);
        if (!result.changes) return sendError(res, 404, ERR.NOT_FOUND, '邀请不存在或已撤销');
        res.json({ ok: true });
    });
    router.post('/project-invites/:token/accept', requireAuth, csrfProtection, (req, res) => {
        const grant = workspaceDb.acceptInvite(req.currentUser.id, req.params.token);
        if (!grant) return sendError(res, 404, ERR.NOT_FOUND, '邀请无效或已过期');
        res.json({ ok: true, grant });
    });

    // Comments, review status and version recovery.
    router.get('/projects/:id/comments', requireAuth, requireProject(), (req, res) => {
        const comments = db
            .prepare(
                `SELECT c.*,u.username FROM project_comments c JOIN users u ON u.id=c.user_id
                 WHERE c.project_id=? ORDER BY c.created_at DESC`
            )
            .all(Number(req.params.id));
        res.json({ ok: true, comments });
    });
    router.post('/projects/:id/comments', requireAuth, csrfProtection, requireProject('comment'), (req, res) => {
        const body = String(req.body?.body || '').trim();
        if (!body) return sendError(res, 400, ERR.VALIDATION, '批注不能为空');
        const now = new Date().toISOString();
        const info = db
            .prepare(
                `INSERT INTO project_comments (project_id,user_id,asset_id,body,status,created_at,updated_at)
                 VALUES (?,?,?,?,?,?,?)`
            )
            .run(
                Number(req.params.id),
                req.currentUser.id,
                req.body?.assetId || null,
                body.slice(0, 2000),
                'open',
                now,
                now
            );
        for (const userId of workspaceDb.projectRecipients(req.params.id, req.currentUser.id)) {
            emit(userId, {
                type: 'comment',
                title: '项目有新批注',
                body: body.slice(0, 120),
                link: `/modules/workflow-hub/index.html?projectId=${req.params.id}#collaboration`,
            });
        }
        res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
    });
    router.put('/projects/:id/review', requireAuth, csrfProtection, requireProject('review'), (req, res) => {
        const status = ['draft', 'pending', 'changes_requested', 'approved', 'delivered'].includes(req.body?.status)
            ? req.body.status
            : null;
        if (!status) return sendError(res, 400, ERR.VALIDATION, '无效审核状态');
        const allowedByRole =
            req.projectGrant.role === 'owner' ||
            (req.projectGrant.role === 'reviewer' && ['changes_requested', 'approved'].includes(status));
        if (!allowedByRole) return sendError(res, 403, ERR.FORBIDDEN, '当前角色无权设置该审核状态');
        db.prepare('UPDATE projects SET review_status=?,updated_at=? WHERE id=?').run(
            status,
            new Date().toISOString(),
            Number(req.params.id)
        );
        for (const userId of workspaceDb.projectRecipients(req.params.id, req.currentUser.id)) {
            emit(userId, {
                type: 'review',
                title: '项目审核状态已更新',
                body: `${req.projectGrant.project.name}: ${status}`,
                link: `/modules/workflow-hub/index.html?projectId=${req.params.id}#collaboration`,
            });
        }
        res.json({ ok: true, status });
    });
    router.put(
        '/projects/:id/assets/:assetId/review',
        requireAuth,
        csrfProtection,
        requireProject('review'),
        (req, res) => {
            const status = ['draft', 'pending', 'changes_requested', 'approved', 'delivered'].includes(req.body?.status)
                ? req.body.status
                : 'draft';
            db.prepare(
                `INSERT INTO asset_reviews (project_id,asset_id,reviewer_id,status,note,updated_at) VALUES (?,?,?,?,?,?)
             ON CONFLICT(project_id,asset_id) DO UPDATE SET reviewer_id=excluded.reviewer_id,
             status=excluded.status,note=excluded.note,updated_at=excluded.updated_at`
            ).run(
                Number(req.params.id),
                Number(req.params.assetId),
                req.currentUser.id,
                status,
                String(req.body?.note || '').slice(0, 1000),
                new Date().toISOString()
            );
            res.json({ ok: true, status });
        }
    );
    router.get('/projects/:id/versions', requireAuth, requireProject(), (req, res) => {
        const versions = db
            .prepare(
                `SELECT id,project_id,version,description,created_at,
                 CASE WHEN snapshot_json IS NULL THEN 0 ELSE 1 END AS restorable
                 FROM version_history WHERE project_id=? ORDER BY version DESC LIMIT 100`
            )
            .all(Number(req.params.id));
        res.json({ ok: true, versions });
    });
    router.post(
        '/projects/:id/versions/:version/restore',
        requireAuth,
        csrfProtection,
        requireProject('restore'),
        (req, res) => {
            const project = workspaceDb.restoreVersion(req.currentUser.id, req.params.id, req.params.version);
            if (!project) return sendError(res, 409, ERR.CONFLICT, '该版本没有可恢复快照');
            res.json({ ok: true, project });
        }
    );
    router.get('/projects/:id/versions/:version/diff', requireAuth, requireProject(), (req, res) => {
        const row = db
            .prepare('SELECT snapshot_json FROM version_history WHERE project_id=? AND version=?')
            .get(Number(req.params.id), Number(req.params.version));
        const snapshot = row && workspaceDb.json(row.snapshot_json, null);
        if (!snapshot) return sendError(res, 404, ERR.NOT_FOUND, '版本快照不存在');
        const current = req.projectGrant.project;
        const before = snapshot.project;
        const fields = ['name', 'description', 'type', 'review_status'];
        const changes = fields
            .filter((field) => before[field] !== current[field])
            .map((field) => ({ field, before: before[field], after: current[field] }));
        res.json({ ok: true, changes, snapshotAssets: snapshot.assets || [] });
    });

    // Notifications.
    router.get('/notifications', requireAuth, (req, res) => {
        const notifications = db
            .prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100')
            .all(req.currentUser.id);
        const unread = notifications.filter((item) => !item.is_read).length;
        res.json({ ok: true, notifications, unread });
    });
    router.put('/notifications/read-all', requireAuth, csrfProtection, (req, res) => {
        db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.currentUser.id);
        res.json({ ok: true });
    });
    router.put('/notifications/:notificationId/read', requireAuth, csrfProtection, (req, res) => {
        db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(
            Number(req.params.notificationId),
            req.currentUser.id
        );
        res.json({ ok: true });
    });
    router.delete('/notifications/:notificationId', requireAuth, csrfProtection, (req, res) => {
        db.prepare('DELETE FROM notifications WHERE id=? AND user_id=?').run(
            Number(req.params.notificationId),
            req.currentUser.id
        );
        res.json({ ok: true });
    });

    // Collections/folders.
    router.get('/asset-collections', requireAuth, (req, res) => {
        const collections = db
            .prepare(
                `SELECT c.*,COUNT(i.asset_id) AS item_count FROM asset_collections c
                 LEFT JOIN asset_collection_items i ON i.collection_id=c.id
                 WHERE c.user_id=? GROUP BY c.id ORDER BY c.name`
            )
            .all(req.currentUser.id);
        res.json({ ok: true, collections });
    });
    router.post('/asset-collections', requireAuth, csrfProtection, (req, res) => {
        const name = String(req.body?.name || '').trim();
        if (!name) return sendError(res, 400, ERR.VALIDATION, '集合名称不能为空');
        const info = db
            .prepare('INSERT INTO asset_collections (user_id,name,created_at) VALUES (?,?,?)')
            .run(req.currentUser.id, name.slice(0, 80), new Date().toISOString());
        res.status(201).json({ ok: true, id: Number(info.lastInsertRowid), name });
    });
    router.post('/asset-collections/:collectionId/items', requireAuth, csrfProtection, (req, res) => {
        const collection = db
            .prepare('SELECT id FROM asset_collections WHERE id=? AND user_id=?')
            .get(Number(req.params.collectionId), req.currentUser.id);
        if (!collection) return sendError(res, 404, ERR.NOT_FOUND, '素材集合不存在');
        db.prepare(
            `INSERT OR IGNORE INTO asset_collection_items (collection_id,asset_id,created_at) VALUES (?,?,?)`
        ).run(collection.id, Number(req.body?.assetId), new Date().toISOString());
        res.json({ ok: true });
    });

    // Cost/usage alerts: request counts are always available; currency estimate is based on recorded job costs.
    router.get('/me/cost-summary', requireAuth, (req, res) => {
        const costs = db
            .prepare(
                `SELECT provider,COUNT(*) AS jobs,SUM(estimated_cost) AS estimated_cost
                 FROM generation_jobs WHERE user_id=? GROUP BY provider`
            )
            .all(req.currentUser.id);
        const quota = ['jimeng', 'alibaba', 'tencent', 'sdwebui'].map((provider) =>
            usersDb.checkQuota(req.currentUser.id, provider)
        );
        const alerts = quota
            .map((item, index) => ({ provider: ['jimeng', 'alibaba', 'tencent', 'sdwebui'][index], ...item }))
            .filter(
                (item) =>
                    !item.ok || item.dailyUsed / item.dailyLimit >= 0.8 || item.monthlyUsed / item.monthlyLimit >= 0.8
            );
        res.json({ ok: true, costs, alerts });
    });

    return router;
}

module.exports = { createWorkspaceRouter, getWorkflowCapabilities, dispatchLoraWebhook };
