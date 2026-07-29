/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * SD Web UI API 提供商（从 proxy.js 提取）
 */
const axios = require('axios');
const { getSdWebUiBaseUrl, buildTxt2ImgPayload, buildImg2ImgPayload } = require('../sd-webui-helper');

function sdWebUiAxiosConfig(userConfig) {
    const headers = { 'Content-Type': 'application/json' };
    const apiKey =
        (userConfig && String(userConfig.apiKey || '').trim()) || String(process.env.SD_WEBUI_API_KEY || '').trim();
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }
    return { headers, timeout: 300000 };
}

async function handleSdWebUiStatus(req, res, { getUserProviderConfig }) {
    try {
        const sdConfig = getUserProviderConfig(req.currentUser.id, 'sdwebui');
        const base =
            (sdConfig &&
                String(sdConfig.baseUrl || '')
                    .trim()
                    .replace(/\/$/, '')) ||
            getSdWebUiBaseUrl();
        const axiosOpts = { ...sdWebUiAxiosConfig(sdConfig), timeout: 10000 };
        const r = await axios.get(`${base}/sdapi/v1/options`, axiosOpts);
        res.json({
            ok: true,
            baseUrl: base,
            sd_model_checkpoint: r.data.sd_model_checkpoint,
            sd_vae: r.data.sd_vae,
        });
    } catch (e) {
        const d = e.response && e.response.data;
        const msg = (d && (d.detail || d.error || d.message)) || e.message;
        res.status(502).json({
            ok: false,
            baseUrl: getSdWebUiBaseUrl(),
            message: typeof msg === 'string' ? msg : JSON.stringify(msg),
        });
    }
}

async function handleSdWebUiTxt2Img(req, res, { getUserProviderConfig }) {
    try {
        const sdConfig = getUserProviderConfig(req.currentUser.id, 'sdwebui');
        const base =
            (sdConfig &&
                String(sdConfig.baseUrl || '')
                    .trim()
                    .replace(/\/$/, '')) ||
            getSdWebUiBaseUrl();
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        if (body.prompt === null || body.prompt === undefined || String(body.prompt).trim() === '') {
            return res.status(400).json({ error: 'prompt 不能为空' });
        }
        const { prompt: _omitP, size: _omitS, ...extra } = body;
        const requestData = buildTxt2ImgPayload(body.prompt, body.size, extra);
        const r = await axios.post(`${base}/sdapi/v1/txt2img`, requestData, sdWebUiAxiosConfig(sdConfig));
        res.json(r.data);
    } catch (e) {
        const status = e.response && e.response.status ? e.response.status : 502;
        const d = e.response && e.response.data;
        res.status(status).json({
            error: 'sd-webui txt2img 失败',
            message: (d && (d.detail || d.error || d.message)) || e.message,
        });
    }
}

async function callSDWebUIText2ImageAPI(prompt, size, extra = {}, userConfig) {
    const sdWebUIBaseUrl =
        (userConfig &&
            String(userConfig.baseUrl || '')
                .trim()
                .replace(/\/$/, '')) ||
        getSdWebUiBaseUrl();
    const requestData = buildTxt2ImgPayload(prompt, size, extra);
    const axiosOpts = sdWebUiAxiosConfig(userConfig);

    const response = await axios.post(`${sdWebUIBaseUrl}/sdapi/v1/txt2img`, requestData, axiosOpts);

    if (response.data.images && response.data.images[0]) {
        return `data:image/png;base64,${response.data.images[0]}`;
    }
    throw new Error('SD Web UI API返回格式错误');
}

async function callSDWebUIImage2ImageAPI(prompt, imageDataUrl, strength, size, extra = {}, userConfig) {
    const sdWebUIBaseUrl =
        (userConfig &&
            String(userConfig.baseUrl || '')
                .trim()
                .replace(/\/$/, '')) ||
        getSdWebUiBaseUrl();
    let inputBase64 = imageDataUrl;
    if (typeof imageDataUrl === 'string' && imageDataUrl.indexOf('base64,') !== -1) {
        inputBase64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    }

    const requestData = buildImg2ImgPayload(prompt, inputBase64, strength, size, extra);
    const axiosOpts = sdWebUiAxiosConfig(userConfig);

    const response = await axios.post(`${sdWebUIBaseUrl}/sdapi/v1/img2img`, requestData, axiosOpts);

    if (response.data.images && response.data.images[0]) {
        return `data:image/png;base64,${response.data.images[0]}`;
    }
    throw new Error('SD Web UI 图生图API返回格式错误');
}

module.exports = {
    sdWebUiAxiosConfig,
    handleSdWebUiStatus,
    handleSdWebUiTxt2Img,
    callSDWebUIText2ImageAPI,
    callSDWebUIImage2ImageAPI,
};
