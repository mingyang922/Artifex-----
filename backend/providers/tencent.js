/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
/**
 * 腾讯云混元 / 文生图 / 图生图 API 提供商（从 proxy.js 提取）
 */
const axios = require('axios');
const {
    getTencentCamCredentials,
    validateTencentCamCredential,
    assertTencentCamCredential,
    generateSignature,
} = require('../lib/utils');

// 腾讯云混元API代理（用户级配置）
async function handleHunyuanProxy(req, res, { runtimeConfig, API_CONFIG, getUserProviderConfig, isAdminUser }) {
    try {
        const userTencentConfig = getUserProviderConfig(req.currentUser.id, 'tencent');
        const { secretId: SecretId, secretKey: SecretKey } = getTencentCamCredentials(userTencentConfig);
        const { SecretId: _dropSecretId, SecretKey: _dropSecretKey, ...requestData } = req.body || {};

        const camCheck = validateTencentCamCredential(SecretId, SecretKey);
        if (!camCheck.ok) {
            return res.status(400).json({
                error: 'API密钥无效',
                message: (req.currentUser && getUserProviderConfig(req.currentUser.id, 'tencent'))
                    ? camCheck.message
                    : '请先在用户中心配置腾讯云 SecretId / SecretKey',
                code: camCheck.code,
                provider: 'tencent',
            });
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const signature = generateSignature(SecretId, SecretKey, timestamp, JSON.stringify(requestData));

        const response = await axios.post(runtimeConfig.hunyuan.endpoint, requestData, {
            headers: {
                Authorization: signature,
                'Content-Type': 'application/json',
                'X-TC-Timestamp': timestamp.toString(),
                'X-TC-Version': runtimeConfig.hunyuan.version,
                'X-TC-Action': 'ChatCompletions',
            },
            timeout: API_CONFIG.frontend.timeout,
        });

        res.json(response.data);
    } catch (error) {
        console.error('API代理错误:', error);

        if (error.response) {
            res.status(error.response.status).json({
                error: '腾讯云API错误',
                message:
                    typeof error.response.data === 'string'
                        ? error.response.data
                        : (error.response.data && error.response.data.message) || JSON.stringify(error.response.data),
                provider: 'tencent',
                code: error.response.status,
            });
        } else if (error.code === 'ECONNABORTED') {
            res.status(408).json({
                error: '请求超时',
                message: '混元 API 调用超时，请稍后重试',
                provider: 'tencent',
                code: 408,
            });
        } else {
            res.status(500).json({
                error: 'API调用失败',
                message: error.message,
                provider: 'tencent',
                code: 500,
            });
        }
    }
}

// 腾讯云混元图生图（线稿/草图→成品图）
async function callTencentImage2ImageAPI(prompt, imageDataUrl, strength, size, userConfig) {
    const { secretId, secretKey } = getTencentCamCredentials(userConfig);
    assertTencentCamCredential(secretId, secretKey);

    let inputBase64 = imageDataUrl;
    if (typeof imageDataUrl === 'string' && imageDataUrl.indexOf('base64,') !== -1) {
        inputBase64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    }

    const tencentcloud = require('tencentcloud-sdk-nodejs');
    const AiartClient = tencentcloud.aiart.v20221229.Client;
    const clientConfig = {
        credential: { secretId, secretKey },
        region: 'ap-guangzhou',
        profile: { httpProfile: { endpoint: 'aiart.tencentcloudapi.com' } },
    };
    const client = new AiartClient(clientConfig);

    const numStrength = typeof strength === 'number' ? strength : parseFloat(strength) || 0.7;
    const params = {
        InputImage: inputBase64,
        Prompt: prompt,
        Strength: Math.min(1, Math.max(0.1, numStrength)),
        RspImgType: 'url',
        LogoAdd: 0,
        ResultConfig: { Resolution: 'origin' },
    };

    const response = await client.ImageToImage(params);
    if (response.ResultImage) {
        return response.ResultImage;
    }
    throw new Error('腾讯云图生图返回格式错误，未找到图片数据');
}

// 腾讯云混元生图API调用
async function callTencentImageAPI(prompt, size, userConfig) {
    const { secretId, secretKey } = getTencentCamCredentials(userConfig);
    assertTencentCamCredential(secretId, secretKey);

    try {
        const tencentcloud = require('tencentcloud-sdk-nodejs');
        const AiartClient = tencentcloud.aiart.v20221229.Client;

        const clientConfig = {
            credential: { secretId, secretKey },
            region: 'ap-guangzhou',
            profile: { httpProfile: { endpoint: 'aiart.tencentcloudapi.com' } },
        };

        const client = new AiartClient(clientConfig);

        const params = {
            Prompt: prompt,
            Resolution: size || '1024:1024',
            RspImgType: 'url',
            Style: '1',
            LogoAdd: 0,
            Seed: Math.floor(Math.random() * 1000000),
        };

        const response = await client.TextToImageRapid(params);

        if (response.ResultImage) {
            return response.ResultImage;
        } else {
            throw new Error('腾讯云API返回格式错误，未找到图片数据');
        }
    } catch (error) {
        console.error('腾讯云API调用失败:', error);

        if (error.message.includes('ResourceUnavailable.NotExist')) {
            throw new Error('混元生图服务未开通，请在腾讯云控制台开通服务');
        } else if (error.message.includes('ResourceUnavailable.LowBalance')) {
            throw new Error('账户余额不足，请充值后重试');
        } else if (error.message.includes('SecretIdNotFound') || error.message.includes('AuthFailure')) {
            throw new Error(
                '腾讯云认证失败：SecretId 无效或未找到。请确认使用 CAM 控制台（AKID 开头）的 SecretId/SecretKey，并已开通混元生图。'
            );
        } else {
            throw new Error(`腾讯云API调用失败: ${error.message}`);
        }
    }
}

// 腾讯云密钥与连通性自检
async function handleTencentStatus(req, res, { getUserProviderConfig }) {
    const { secretId, secretKey } = getTencentCamCredentials(getUserProviderConfig(req.currentUser.id, 'tencent'));
    const validation = validateTencentCamCredential(secretId, secretKey);
    const out = {
        configured: validation.ok,
        validation,
        secretIdPrefix: secretId ? secretId.slice(0, 8) + '…' : null,
        hint: '图片生成页需选择「腾讯云文生图」；密钥须来自 https://console.cloud.tencent.com/cam/capi',
    };
    if (!validation.ok) {
        return res.json(out);
    }
    if (req.query.live !== '1') {
        out.liveTest = 'skipped';
        out.message = '格式校验通过。加 ?live=1 可探测混元生图接口（会消耗额度）';
        return res.json(out);
    }
    try {
        const tencentcloud = require('tencentcloud-sdk-nodejs');
        const AiartClient = tencentcloud.aiart.v20221229.Client;
        const client = new AiartClient({
            credential: { secretId, secretKey },
            region: 'ap-guangzhou',
            profile: { httpProfile: { endpoint: 'aiart.tencentcloudapi.com' } },
        });
        await client.TextToImageRapid({
            Prompt: 'test',
            Resolution: '1024:1024',
            RspImgType: 'url',
            Style: '1',
            LogoAdd: 0,
            Seed: 1,
        });
        out.liveTest = 'ok';
    } catch (e) {
        out.liveTest = 'failed';
        out.liveError = e.message || String(e);
    }
    res.json(out);
}

module.exports = {
    handleHunyuanProxy,
    callTencentImage2ImageAPI,
    callTencentImageAPI,
    handleTencentStatus,
};
