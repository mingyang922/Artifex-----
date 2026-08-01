'use strict';

const { Router } = require('express');
const { sendError, ERR } = require('../lib/error-response');
const { validateAssetPayload } = require('../lib/asset-validation');
const {
    WORKFLOW_TEMPLATES,
    evaluateCharacterConsistency,
    classifyGenerationError,
} = require('../lib/production-insights');

const EXPORT_SCHEMA_VERSION = 1;
const DEMO_MARKER = '[ARTIFEX_DEMO]';
const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

function parseJson(value, fallback) {
    try {
        return JSON.parse(value || JSON.stringify(fallback));
    } catch (_) {
        return fallback;
    }
}

function createProductionInsightsRouter(deps) {
    const router = Router();
    const { workspaceDb, usersDb, requireAuth, csrfProtection } = deps;
    const db = workspaceDb.db;

    router.get('/workflow-templates', requireAuth, (_req, res) => {
        res.json({ ok: true, templates: WORKFLOW_TEMPLATES });
    });

    router.post('/characters/:characterId/evaluate', requireAuth, csrfProtection, (req, res) => {
        const character = db
            .prepare('SELECT * FROM character_profiles WHERE id=? AND user_id=?')
            .get(Number(req.params.characterId), req.currentUser.id);
        if (!character) return sendError(res, 404, ERR.NOT_FOUND, '角色档案不存在');
        const observation = req.body && typeof req.body === 'object' ? req.body : {};
        const result = evaluateCharacterConsistency(
            {
                ...character,
                lockedTraits: parseJson(character.locked_traits_json, []),
            },
            observation
        );
        const now = new Date().toISOString();
        const info = db
            .prepare(
                `INSERT INTO character_evaluations
                 (user_id,character_id,generation_job_id,method,score,observation_json,result_json,created_at)
                 VALUES (?,?,?,?,?,?,?,?)`
            )
            .run(
                req.currentUser.id,
                character.id,
                observation.generationJobId || null,
                result.method,
                result.score,
                JSON.stringify(observation),
                JSON.stringify(result),
                now
            );
        res.status(201).json({ ok: true, evaluation: { id: Number(info.lastInsertRowid), createdAt: now, ...result } });
    });

    router.get('/character-evaluations', requireAuth, (req, res) => {
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const evaluations = db
            .prepare(
                `SELECT ce.*, cp.name AS character_name
                 FROM character_evaluations ce JOIN character_profiles cp ON cp.id=ce.character_id
                 WHERE ce.user_id=? ORDER BY ce.created_at DESC LIMIT ?`
            )
            .all(req.currentUser.id, limit)
            .map((row) => ({
                ...row,
                observation: parseJson(row.observation_json, {}),
                result: parseJson(row.result_json, {}),
            }));
        res.json({ ok: true, evaluations });
    });

    router.post('/generation-jobs/:jobId/cancel', requireAuth, csrfProtection, (req, res) => {
        const job = db
            .prepare('SELECT * FROM generation_jobs WHERE id=? AND user_id=?')
            .get(Number(req.params.jobId), req.currentUser.id);
        if (!job) return sendError(res, 404, ERR.NOT_FOUND, '生成任务不存在');
        if (!['draft', 'queued'].includes(job.status)) {
            return sendError(res, 409, ERR.CONFLICT, '只有草稿或旧版等待任务可以取消');
        }
        db.prepare("UPDATE generation_jobs SET status='cancelled', updated_at=? WHERE id=?").run(
            new Date().toISOString(),
            job.id
        );
        res.json({ ok: true, job: { ...job, status: 'cancelled' } });
    });

    router.post('/generation-jobs/:jobId/duplicate', requireAuth, csrfProtection, (req, res) => {
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
            params: parseJson(source.params_json, {}),
            status: 'draft',
        });
        res.status(201).json({ ok: true, job, sourceJobId: source.id });
    });

    router.get('/generation-jobs/:jobId/replay', requireAuth, (req, res) => {
        const job = db
            .prepare('SELECT * FROM generation_jobs WHERE id=? AND user_id=?')
            .get(Number(req.params.jobId), req.currentUser.id);
        if (!job) return sendError(res, 404, ERR.NOT_FOUND, '生成任务不存在');
        res.json({
            ok: true,
            replay: {
                id: job.id,
                provider: job.provider,
                mode: job.mode,
                prompt: job.prompt,
                negativePrompt: job.negative_prompt,
                params: parseJson(job.params_json, {}),
                characterId: job.character_id,
            },
        });
    });

    router.get('/me/workflow-metrics', requireAuth, (req, res) => {
        const generation = db
            .prepare(
                `SELECT COUNT(*) AS total,
                        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
                        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed,
                        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled,
                        ROUND(AVG(CASE WHEN status='completed'
                          THEN (julianday(updated_at)-julianday(created_at))*86400 END), 1) AS avg_seconds,
                        ROUND(SUM(estimated_cost), 4) AS estimated_cost
                 FROM generation_jobs WHERE user_id=?`
            )
            .get(req.currentUser.id);
        const providers = db
            .prepare(
                `SELECT provider, COUNT(*) AS total,
                        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
                        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed
                 FROM generation_jobs WHERE user_id=? GROUP BY provider ORDER BY total DESC`
            )
            .all(req.currentUser.id);
        const consistency = db
            .prepare(
                'SELECT COUNT(*) AS total, ROUND(AVG(score),1) AS average_score FROM character_evaluations WHERE user_id=?'
            )
            .get(req.currentUser.id);
        const successRate = generation.total
            ? Math.round((Number(generation.completed || 0) / generation.total) * 100)
            : 0;
        res.json({
            ok: true,
            metrics: {
                generation: { ...generation, successRate },
                consistency,
                providers,
                generatedAt: new Date().toISOString(),
            },
        });
    });

    router.get('/workspace-export', requireAuth, (req, res) => {
        const userId = req.currentUser.id;
        const projects = usersDb.getUserProjects(userId).slice(0, 100);
        const payload = {
            schemaVersion: EXPORT_SCHEMA_VERSION,
            product: 'Artifex',
            exportedAt: new Date().toISOString(),
            projects: projects.map((project) => ({
                name: project.name,
                description: project.description,
                type: project.type,
                reviewStatus: project.review_status || 'draft',
                assets: (project.assets || []).slice(0, 500).map((asset) => ({
                    name: asset.name,
                    type: asset.type,
                    content: asset.content,
                })),
            })),
            characters: db
                .prepare('SELECT * FROM character_profiles WHERE user_id=? ORDER BY updated_at DESC LIMIT 500')
                .all(userId)
                .map((row) => ({
                    name: row.name,
                    description: row.description,
                    palette: row.palette,
                    seed: row.seed,
                    stylePrompt: row.style_prompt,
                    negativePrompt: row.negative_prompt,
                    lockedTraits: parseJson(row.locked_traits_json, []),
                    references: parseJson(row.references_json, []),
                })),
            generationJobs: workspaceDb.listGenerationJobs(userId, { limit: 100 }).map((job) => ({
                provider: job.provider,
                mode: job.mode,
                prompt: job.prompt,
                negativePrompt: job.negative_prompt,
                params: job.params,
                status: job.status,
                outputs: job.outputs,
                error: job.error,
                createdAt: job.created_at,
            })),
            assetLibrary: db
                .prepare('SELECT * FROM asset_library WHERE user_id=? ORDER BY created_at DESC LIMIT 1000')
                .all(userId)
                .map((asset) => ({
                    name: asset.name,
                    type: asset.type,
                    content: asset.content,
                    desc: asset.desc,
                    source: asset.source,
                    tags: parseJson(asset.tags, []),
                    status: asset.status,
                    favorite: Boolean(asset.favorite),
                    metadata: parseJson(asset.metadata_json, {}),
                })),
        };
        res.setHeader('Content-Disposition', `attachment; filename="artifex-workspace-${Date.now()}.json"`);
        res.json(payload);
    });

    router.post('/workspace-import', requireAuth, csrfProtection, (req, res) => {
        const payload = req.body;
        const serializedSize = Buffer.byteLength(JSON.stringify(payload || {}), 'utf8');
        if (!payload || payload.schemaVersion !== EXPORT_SCHEMA_VERSION) {
            return sendError(res, 400, ERR.VALIDATION, '备份格式或版本不受支持');
        }
        if (serializedSize > MAX_IMPORT_BYTES) return sendError(res, 413, ERR.VALIDATION, '备份文件超过 20MB');
        const projects = Array.isArray(payload.projects) ? payload.projects.slice(0, 100) : [];
        const characters = Array.isArray(payload.characters) ? payload.characters.slice(0, 500) : [];
        const assets = Array.isArray(payload.assetLibrary) ? payload.assetLibrary.slice(0, 1000) : [];
        const counts = { projects: 0, projectAssets: 0, characters: 0, assetLibrary: 0 };
        const importData = db.transaction(() => {
            for (const projectInput of projects) {
                if (!String(projectInput.name || '').trim()) continue;
                const project = usersDb.createProject(
                    req.currentUser.id,
                    String(projectInput.name).slice(0, 120),
                    String(projectInput.description || '').slice(0, 2000),
                    String(projectInput.type || 'other').slice(0, 40)
                );
                counts.projects += 1;
                for (const asset of Array.isArray(projectInput.assets) ? projectInput.assets.slice(0, 500) : []) {
                    if (validateAssetPayload(asset, { requireContent: true })) continue;
                    usersDb.addProjectAsset(
                        project.id,
                        req.currentUser.id,
                        String(asset.name || '导入素材').slice(0, 120),
                        String(asset.type || 'image').slice(0, 40),
                        String(asset.content)
                    );
                    counts.projectAssets += 1;
                }
                workspaceDb.captureProjectVersion(project.id);
            }
            for (const character of characters) {
                if (!String(character.name || '').trim()) continue;
                workspaceDb.upsertCharacter(req.currentUser.id, character);
                counts.characters += 1;
            }
            for (const asset of assets) {
                if (validateAssetPayload(asset, { requireContent: true })) continue;
                usersDb.addAssetLibraryItem(req.currentUser.id, asset);
                counts.assetLibrary += 1;
            }
        });
        importData();
        res.status(201).json({ ok: true, imported: counts });
    });

    router.post('/demo-workspace', requireAuth, csrfProtection, (req, res) => {
        const existing = db
            .prepare('SELECT * FROM projects WHERE user_id=? AND description LIKE ? ORDER BY id DESC LIMIT 1')
            .get(req.currentUser.id, `${DEMO_MARKER}%`);
        if (existing) return res.json({ ok: true, created: false, projectId: existing.id });
        const createDemo = db.transaction(() => {
            const project = usersDb.createProject(
                req.currentUser.id,
                '墨影 · 武侠角色演示',
                `${DEMO_MARKER} 用于体验角色约束、素材管理、审核和版本交付的示例项目。`,
                'game'
            );
            const character = workspaceDb.upsertCharacter(req.currentUser.id, {
                projectId: project.id,
                name: '墨影',
                description: '青年黑衣剑客，束发，冷静克制',
                palette: '墨黑、朱红、暗金',
                seed: '20260801',
                stylePrompt: '东方像素美术，清晰轮廓，克制光影',
                lockedTraits: ['红色围巾', '黑色长袍', '木质长剑', '高束发'],
                references: [],
            });
            workspaceDb.createGenerationJob(req.currentUser.id, {
                projectId: project.id,
                characterId: character.id,
                provider: 'mock',
                prompt: '墨影角色设定立绘，红色围巾，黑色长袍，木质长剑，高束发',
                params: { size: '1024x1024', templateId: 'character-sheet', demo: true },
                status: 'completed',
                outputs: [{ url: '/js/logo-main.png', demo: true }],
            });
            workspaceDb.notify(req.currentUser.id, {
                type: 'info',
                title: '示例工作区已创建',
                body: '从角色一致性评估开始体验 Artifex 生产流程。',
                link: '/modules/workflow-hub/index.html#insights',
            });
            workspaceDb.captureProjectVersion(project.id);
            return { project, character };
        });
        const demo = createDemo();
        res.status(201).json({ ok: true, created: true, projectId: demo.project.id, characterId: demo.character.id });
    });

    router.delete('/demo-workspace', requireAuth, csrfProtection, (req, res) => {
        const projects = db
            .prepare('SELECT id FROM projects WHERE user_id=? AND description LIKE ?')
            .all(req.currentUser.id, `${DEMO_MARKER}%`);
        const remove = db.transaction(() => {
            for (const project of projects) {
                db.prepare('DELETE FROM generation_jobs WHERE user_id=? AND project_id=?').run(
                    req.currentUser.id,
                    project.id
                );
                db.prepare('DELETE FROM character_profiles WHERE user_id=? AND project_id=?').run(
                    req.currentUser.id,
                    project.id
                );
                usersDb.deleteProject(project.id, req.currentUser.id);
            }
        });
        remove();
        res.json({ ok: true, removed: projects.length });
    });

    router.get('/generation-jobs/:jobId/diagnosis', requireAuth, (req, res) => {
        const job = db
            .prepare('SELECT * FROM generation_jobs WHERE id=? AND user_id=?')
            .get(Number(req.params.jobId), req.currentUser.id);
        if (!job) return sendError(res, 404, ERR.NOT_FOUND, '生成任务不存在');
        res.json({ ok: true, diagnosis: classifyGenerationError(job.error), jobId: job.id });
    });

    return router;
}

module.exports = { createProductionInsightsRouter, EXPORT_SCHEMA_VERSION, DEMO_MARKER };
