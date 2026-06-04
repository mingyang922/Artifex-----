/**
 * Artifex — AI 服务商路由
 * 即梦 / SD WebUI / 混元 / 阿里云状态与代理
 */
'use strict';

const { Router } = require('express');

/**
 * @param {object} deps
 * @param {Function} deps.requireAuth
 * @param {object} deps.runtimeConfig
 * @param {object} deps.API_CONFIG
 * @param {Function} deps.getUserProviderConfig
 * @param {Function} deps.isAdminUser
 * @param {object} deps.tencentProvider
 * @param {object} deps.alibabaProvider
 * @param {object} deps.jimengProvider
 * @param {object} deps.sdWebUiProvider
 * @returns {import('express').Router}
 */
function createAiProviderRouter(deps) {
    const router = Router();
    const {
        requireAuth, csrfProtection, runtimeConfig, API_CONFIG, getUserProviderConfig, isAdminUser,
        tencentProvider, alibabaProvider, jimengProvider, sdWebUiProvider,
    } = deps;

    // 腾讯混元
    const _tencentDeps = { runtimeConfig, API_CONFIG, getUserProviderConfig, isAdminUser };
    router.post('/hunyuan-proxy', requireAuth, csrfProtection, (req, res) => tencentProvider.handleHunyuanProxy(req, res, _tencentDeps));

    // SD WebUI 状态
    router.get('/sd-webui/status', requireAuth, (req, res) => sdWebUiProvider.handleSdWebUiStatus(req, res, { getUserProviderConfig }));

    // 即梦状态
    router.get('/jimeng/status', requireAuth, (req, res) => jimengProvider.handleJimengStatus(req, res, { getUserProviderConfig }));

    // 即梦在线测试
    router.get('/jimeng/live-test', requireAuth, (req, res) => jimengProvider.handleJimengLiveTest(req, res, { getUserProviderConfig }));

    // SD WebUI 文生图
    router.post('/sd-webui/txt2img', requireAuth, csrfProtection, (req, res) => sdWebUiProvider.handleSdWebUiTxt2Img(req, res, { getUserProviderConfig }));

    // 阿里云文生图
    router.post('/alibaba-proxy', requireAuth, csrfProtection, (req, res) =>
        alibabaProvider.handleAlibabaProxy(req, res, { runtimeConfig, API_CONFIG, getUserProviderConfig })
    );

    // 阿里云视觉
    router.post('/alibaba-vision-proxy', requireAuth, csrfProtection, (req, res) =>
        alibabaProvider.handleAlibabaVisionProxy(req, res, { runtimeConfig, API_CONFIG, getUserProviderConfig })
    );

    // 腾讯云状态
    router.get('/tencent/status', requireAuth, (req, res) => tencentProvider.handleTencentStatus(req, res, { getUserProviderConfig }));

    return router;
}

module.exports = { createAiProviderRouter };
