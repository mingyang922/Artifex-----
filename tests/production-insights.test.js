'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    WORKFLOW_TEMPLATES,
    evaluateCharacterConsistency,
    classifyGenerationError,
} = require('../backend/lib/production-insights');
const { dispatchLoraWebhook } = require('../backend/routes/workspace');

describe('production insights', () => {
    it('provides structured game-art workflow templates', () => {
        assert.equal(WORKFLOW_TEMPLATES.length, 7);
        assert.equal(new Set(WORKFLOW_TEMPLATES.map((item) => item.id)).size, WORKFLOW_TEMPLATES.length);
        assert.ok(WORKFLOW_TEMPLATES.every((item) => item.prompt && item.mode && item.size));
    });

    it('scores character constraints with explainable matches and gaps', () => {
        const result = evaluateCharacterConsistency(
            {
                description: '黑衣剑客',
                palette: '墨黑、朱红、暗金',
                lockedTraits: ['红色围巾', '黑色长袍', '木质长剑', '高束发'],
            },
            {
                description: '高束发剑客，穿黑色长袍，佩戴红色围巾',
                palette: '墨黑、朱红',
            }
        );
        assert.equal(result.method, 'metadata-heuristic-v1');
        assert.ok(result.score > 60 && result.score < 100);
        assert.deepEqual(result.missingTraits, ['木质长剑']);
        assert.deepEqual(result.missingPalette, ['暗金']);
        assert.match(result.scope, /不等同于图像识别/);
    });

    it('classifies common generation failures into actionable advice', () => {
        assert.equal(classifyGenerationError('HTTP 429 quota exceeded').code, 'quota');
        assert.equal(classifyGenerationError('request timed out').code, 'timeout');
        assert.equal(classifyGenerationError('invalid API credential 401').code, 'credentials');
    });

    it('retries LoRA dispatch with one idempotency key', async () => {
        const keys = [];
        let calls = 0;
        const result = await dispatchLoraWebhook({
            fetchImpl: async (_url, options) => {
                calls += 1;
                keys.push(options.headers['Idempotency-Key']);
                return { ok: calls === 3, status: 502 };
            },
            url: 'https://worker.example.test/jobs',
            token: 'worker-token-at-least-32-characters-long',
            jobKey: 'stable-job-key',
            payload: { jobId: 1 },
            timeoutMs: 1000,
        });
        assert.equal(result.attempts, 3);
        assert.deepEqual(keys, ['stable-job-key', 'stable-job-key', 'stable-job-key']);
    });
});
