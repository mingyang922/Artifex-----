// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('API 接口', () => {
    test('健康检查', async ({ request }) => {
        const response = await request.get('/api/health');
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.status).toBe('ok');
        expect(data.service).toContain('Artifex');
    });

    test('CSRF Token 获取', async ({ request }) => {
        const response = await request.get('/api/csrf-token');
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.csrfToken).toBeTruthy();
        expect(data.csrfToken.length).toBeGreaterThan(10);
    });

    test('未登录访问受保护接口返回 401', async ({ request }) => {
        const response = await request.get('/api/me');
        expect(response.status()).toBe(401);
    });

    test('注册 -> 登录 -> 获取用户信息 -> 登出', async ({ request }) => {
        const email = `e2e-api-${Date.now()}@test.com`;
        const password = 'test123456';
        const username = `e2eapi${Date.now()}`;

        // 获取 CSRF token
        const csrfRes = await request.get('/api/csrf-token');
        const { csrfToken } = await csrfRes.json();

        // 注册
        const regRes = await request.post('/api/auth/register', {
            data: { username, email, password },
            headers: { 'X-XSRF-Token': csrfToken },
        });
        expect(regRes.ok()).toBeTruthy();
        const regData = await regRes.json();
        expect(regData.ok).toBe(true);
        expect(regData.user.email).toBe(email);

        // 登录
        const loginRes = await request.post('/api/auth/login', {
            data: { email, password },
            headers: { 'X-XSRF-Token': csrfToken },
        });
        expect(loginRes.ok()).toBeTruthy();

        // 获取用户信息
        const meRes = await request.get('/api/me');
        expect(meRes.ok()).toBeTruthy();
        const meData = await meRes.json();
        expect(meData.email).toBe(email);

        // 登出
        const logoutRes = await request.post('/api/auth/logout', {
            headers: { 'X-XSRF-Token': csrfToken },
        });
        expect(logoutRes.ok()).toBeTruthy();

        // 登出后访问应返回 401
        const afterLogout = await request.get('/api/me');
        expect(afterLogout.status()).toBe(401);
    });

    test('项目 CRUD', async ({ request }) => {
        const email = `e2e-proj-${Date.now()}@test.com`;
        const username = `e2eproj${Date.now()}`;

        // 获取 CSRF token
        const csrfRes = await request.get('/api/csrf-token');
        const { csrfToken } = await csrfRes.json();

        // 注册并登录
        await request.post('/api/auth/register', {
            data: { username, email, password: 'test123456' },
            headers: { 'X-XSRF-Token': csrfToken },
        });

        // 创建项目
        const createRes = await request.post('/api/projects', {
            data: { name: 'E2E 测试项目', description: '自动化测试', type: 'game' },
            headers: { 'X-XSRF-Token': csrfToken },
        });
        expect(createRes.ok()).toBeTruthy();
        const { project } = await createRes.json();
        expect(project.name).toBe('E2E 测试项目');
        expect(project.version).toBe(1);

        // 获取项目列表
        const listRes = await request.get('/api/projects');
        expect(listRes.ok()).toBeTruthy();
        const listData = await listRes.json();
        expect(listData.projects.length).toBeGreaterThanOrEqual(1);

        // 更新项目
        const updateRes = await request.put(`/api/projects/${project.id}`, {
            data: { name: 'E2E 已更新', description: '更新后的描述' },
            headers: { 'X-XSRF-Token': csrfToken },
        });
        expect(updateRes.ok()).toBeTruthy();
        const updated = await updateRes.json();
        expect(updated.project.name).toBe('E2E 已更新');
        expect(updated.project.version).toBe(2);

        // 删除项目
        const deleteRes = await request.delete(`/api/projects/${project.id}`, {
            headers: { 'X-XSRF-Token': csrfToken },
        });
        expect(deleteRes.ok()).toBeTruthy();
    });
});
