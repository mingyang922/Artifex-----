// @ts-check
const { test, expect } = require('@playwright/test');

async function register(page, prefix) {
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await page.goto('/login.html');
    await page.evaluate(() => localStorage.setItem('artifex-onboarding-v2', 'done'));
    await page.click('[data-switch-form="registerForm"]');
    await page.fill('#registerUsername', `${prefix}${stamp}`.slice(0, 30));
    await page.fill('#registerEmail', `${prefix}-${stamp}@test.com`);
    await page.fill('#registerPassword', 'test123456');
    await page.check('#agreeTerms');
    await page.click('#register button[type="submit"]');
    await page.waitForURL('**/dashboard.html', { timeout: 20000 });
    const csrfResponse = await page.request.get('/api/csrf-token');
    return (await csrfResponse.json()).csrfToken;
}

test.describe('生产工作台', () => {
    test('生成历史、简化版角色档案、协作分享和 LoRA 能力边界形成真实闭环', async ({ page }) => {
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        const csrfToken = await register(page, 'workflow');
        const headers = { 'X-XSRF-Token': csrfToken };

        const projectResponse = await page.request.post('/api/projects', {
            data: { name: 'E2E 交付项目', description: '生产流程验收', type: 'game' },
            headers,
        });
        expect(projectResponse.ok()).toBeTruthy();
        const project = (await projectResponse.json()).project;

        const generationResponse = await page.request.post('/api/image-proxy', {
            data: { prompt: 'pixel art hero', provider: 'mock', mode: 'text2img', size: '512x512' },
            headers,
        });
        expect(generationResponse.ok()).toBeTruthy();
        await page.request.post('/api/characters', {
            data: { name: '墨影', description: '黑衣剑客', palette: '黑、红、金', lockedTraits: ['红围巾'] },
            headers,
        });

        await page.goto('/modules/workflow-hub/index.html');
        await expect(page.locator('#metricJobs')).toHaveText('1');
        await expect(page.locator('#metricCharacters')).toHaveText('1');
        await expect(page.locator('#metricProjects')).toHaveText('1');
        await expect(page.locator('#jobList')).toContainText('pixel art hero');
        await expect(page.locator('#characterList')).toContainText('墨影');
        await expect(page.locator('[data-capability-badge="characterConsistency"]')).toHaveText('简化版');

        await page.click('[data-panel="insights"]');
        await expect(page.locator('#workflowTemplateList .workflow-card')).toHaveCount(7);
        await expect(page.locator('#evaluationCharacter')).toContainText('墨影');
        await page.fill('#consistencyForm textarea[name="description"]', '黑衣剑客，红色围巾');
        await page.fill('#consistencyForm input[name="palette"]', '黑、红、金');
        await page.click('#consistencyForm button[type="submit"]');
        await expect(page.locator('#consistencyResult')).toContainText('不等同于图像识别');
        await expect(page.locator('#workflowMetricDetails')).toContainText('一致性评估');

        await page.click('[data-panel="collaboration"]');
        await expect(page.locator('#projectSelect')).toHaveValue(String(project.id));
        await page.click('#createShare');
        await expect(page.locator('#shareResult')).toHaveValue(/shared\.html\?token=/);
        const shareUrl = await page.locator('#shareResult').inputValue();

        const sharePage = await page.context().newPage();
        await sharePage.goto(shareUrl);
        await expect(sharePage.locator('#projectName')).toHaveText('E2E 交付项目');
        await expect(sharePage.locator('#projectVersion')).toHaveText('v1');
        await sharePage.close();

        await page.click('[data-panel="lora"]');
        await expect(page.locator('[data-capability-badge="loraTraining"]')).toHaveText('未配置训练 Worker');
        await expect(page.locator('#loraCapabilityNotice')).toContainText('不会创建无法执行的排队任务');
        await expect(page.locator('#createLoraJob')).toBeDisabled();
        expect(pageErrors).toEqual([]);
    });

    test('素材库 API 支持搜索、收藏、软删除与恢复', async ({ page }) => {
        const csrfToken = await register(page, 'assetapi');
        const headers = { 'X-XSRF-Token': csrfToken };
        const createdResponse = await page.request.post('/api/asset-library', {
            data: {
                name: '像素骑士',
                type: 'image',
                source: 'e2e',
                tags: ['pixel', 'character'],
                favorite: true,
                content: 'data:image/png;base64,iVBORw0KGgo=',
            },
            headers,
        });
        expect(createdResponse.ok()).toBeTruthy();
        const created = await createdResponse.json();
        const assetId = created.item.id;

        const searchResponse = await page.request.get('/api/asset-library?q=骑士&favorite=1&limit=100');
        const search = await searchResponse.json();
        expect(search.total).toBe(1);
        expect(search.items[0].name).toBe('像素骑士');

        expect((await page.request.delete(`/api/asset-library/${assetId}`, { headers })).ok()).toBeTruthy();
        const trash = await (await page.request.get('/api/asset-library?deleted=1')).json();
        expect(trash.items.some((item) => item.id === assetId)).toBeTruthy();
        expect(
            (await page.request.post(`/api/asset-library/${assetId}/restore`, { headers, data: {} })).ok()
        ).toBeTruthy();
        const restored = await (await page.request.get('/api/asset-library?q=骑士')).json();
        expect(restored.items.some((item) => item.id === assetId)).toBeTruthy();
    });
});
