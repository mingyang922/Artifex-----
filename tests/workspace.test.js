'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbPath = path.join(os.tmpdir(), `artifex-workspace-${Date.now()}.sqlite`);
process.env.USERS_DB_PATH = dbPath;

const usersDb = require('../backend/db/users-db');
const { createWorkspaceDb } = require('../backend/db/workspace-db');
const { getWorkflowCapabilities } = require('../backend/routes/workspace');

let workspace;
let owner;
let member;
let project;

before(() => {
    usersDb.init();
    workspace = createWorkspaceDb(usersDb.getDb());
    owner = usersDb.createUser('workspaceOwner', 'owner@workspace.test', 'hash');
    member = usersDb.createUser('workspaceMember', 'member@workspace.test', 'hash');
    project = usersDb.createProject(owner.id, '协作项目', 'test', 'game');
    workspace.captureProjectVersion(project.id);
});

describe('workspace production workflows', () => {
    it('reports honest runtime capability boundaries', () => {
        const unavailable = getWorkflowCapabilities({});
        assert.equal(unavailable.characterConsistency.status, 'simplified');
        assert.equal(unavailable.loraTraining.enabled, false);
        assert.deepEqual(unavailable.loraTraining.requirements, {
            webhookConfigured: false,
            workerTokenConfigured: false,
        });

        const available = getWorkflowCapabilities({
            LORA_TRAINING_WEBHOOK_URL: 'https://worker.example.test/jobs',
            LORA_WORKER_TOKEN: 'test-worker-token-at-least-32-characters',
        });
        assert.equal(available.loraTraining.status, 'available');
        assert.equal(available.loraTraining.enabled, true);
    });

    it('stores and updates generation jobs', () => {
        const job = workspace.createGenerationJob(owner.id, {
            prompt: 'pixel hero',
            provider: 'mock',
            status: 'running',
            params: { size: '512x512' },
        });
        assert.equal(job.status, 'running');
        assert.equal(job.params.size, '512x512');
        const completed = workspace.updateGenerationJob(owner.id, job.id, {
            status: 'completed',
            outputs: [{ url: 'https://example.test/a.png' }],
            estimatedCost: 0.2,
        });
        assert.equal(completed.status, 'completed');
        assert.equal(completed.outputs.length, 1);
        assert.equal(workspace.listGenerationJobs(owner.id).length, 1);
    });

    it('creates reusable character profiles', () => {
        const character = workspace.upsertCharacter(owner.id, {
            name: '墨影',
            description: '黑衣剑客',
            lockedTraits: ['红色围巾'],
            references: ['https://example.test/ref.png'],
        });
        assert.equal(character.name, '墨影');
        assert.deepEqual(character.lockedTraits, ['红色围巾']);
    });

    it('supports invites and role-based project access', () => {
        const invite = workspace.createInvite(owner.id, project.id, { role: 'editor' });
        const grant = workspace.acceptInvite(member.id, invite.token);
        assert.equal(grant.role, 'editor');
        assert.equal(workspace.access(member.id, project.id).role, 'editor');
        assert.equal(workspace.canEdit('editor'), true);
        assert.equal(workspace.canEdit('reviewer'), false);
        assert.equal(workspace.canEdit('viewer'), false);
    });

    it('creates revocable public shares', () => {
        const share = workspace.createInvite(owner.id, project.id, { kind: 'share', days: 1 });
        const publicProject = workspace.publicShare(share.token);
        assert.equal(publicProject.name, '协作项目');
        assert.ok(Array.isArray(publicProject.assets));
    });

    it('persists notifications', () => {
        const item = workspace.notify(member.id, { title: '审核完成', body: '项目已通过' });
        const row = workspace.db.prepare('SELECT * FROM notifications WHERE id=?').get(item.id);
        assert.equal(row.title, '审核完成');
    });

    it('issues one-time password reset tokens', () => {
        const reset = workspace.requestPasswordReset(member.email);
        assert.ok(reset.token.length > 20);
        assert.equal(workspace.consumePasswordReset(reset.token), member.id);
        assert.equal(workspace.consumePasswordReset(reset.token), null);
    });

    it('searches, filters and soft-deletes assets', () => {
        const asset = usersDb.addAssetLibraryItem(owner.id, {
            name: '像素剑士',
            type: 'image',
            content: 'data:image/png;base64,iVBORw0KGgo=',
            tags: ['pixel'],
            favorite: true,
        });
        assert.equal(usersDb.getAssetLibrary(owner.id, { q: '剑士' }).length, 1);
        assert.equal(usersDb.getAssetLibrary(owner.id, { favorite: '1' }).length, 1);
        usersDb.deleteAssetLibraryItem(owner.id, asset.id);
        assert.equal(usersDb.getAssetLibraryCount(owner.id), 0);
        assert.equal(usersDb.getAssetLibraryCount(owner.id, { deleted: true }), 1);
    });

    it('restores snapshot-backed project versions', () => {
        const versionedProject = usersDb.createProject(owner.id, '版本项目', 'v1', 'game');
        usersDb.addProjectAsset(versionedProject.id, owner.id, '初始素材', 'image', 'data:image/png;base64,b2xk');
        usersDb.updateProject(versionedProject.id, owner.id, { versionDesc: '保存初始素材' });
        workspace.captureProjectVersion(versionedProject.id);

        const originalVersion = usersDb.getProject(versionedProject.id).version;
        const originalAsset = usersDb.getProject(versionedProject.id).assets[0];
        usersDb.deleteProjectAsset(originalAsset.id, owner.id);
        usersDb.addProjectAsset(versionedProject.id, owner.id, '新素材', 'image', 'data:image/png;base64,bmV3');
        usersDb.updateProject(versionedProject.id, owner.id, { name: '新名称', versionDesc: '替换素材' });
        workspace.captureProjectVersion(versionedProject.id);

        const restored = workspace.restoreVersion(owner.id, versionedProject.id, originalVersion);
        assert.equal(restored.name, '版本项目');
        assert.deepEqual(
            restored.assets.map((asset) => ({ name: asset.name, content: asset.content })),
            [{ name: '初始素材', content: 'data:image/png;base64,b2xk' }]
        );
    });
});

after(() => {
    usersDb.close();
    for (const suffix of ['', '-wal', '-shm']) {
        try {
            fs.rmSync(dbPath + suffix, { force: true });
        } catch (_) {}
    }
});
