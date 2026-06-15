/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.3.3 */
'use strict';
/**
 * 腾讯云混元 / 文生图 / 图生图 API 提供商（从 proxy.js 提取）
 */
const {
    getTencentCamCredentials,
    validateTencentCamCredential,
    assertTencentCamCredential,
} = require('../lib/utils');

// 腾讯云混元API代理（用户级配置，使用官方SDK）
async function handleHunyuanProxy(req, res, { _runtimeConfig, _API_CONFIG, getUserProviderConfig, isAdminUser }) {
    try {
        const userTencentConfig = getUserProviderConfig(req.currentUser.id, 'tencent');
        const { secretId: SecretId, secretKey: SecretKey } = getTencentCamCredentials(userTencentConfig);
        const { SecretId: _dropSecretId, SecretKey: _dropSecretKey, ...requestData } = req.body || {};

        // 普通用户必须自配密钥，管理员可用平台默认密钥
        const isAdmin = isAdminUser(req.currentUser);
        const hasOwnKeys = !!(userTencentConfig && userTencentConfig.secretId && userTencentConfig.secretKey);
        if (!isAdmin && !hasOwnKeys) {
            return res.status(403).json({
                error: '未配置个人密钥',
                message: '请先在「用户中心」配置你自己的腾讯云 SecretId / SecretKey，再使用混元对话功能。',
                code: 'no_personal_credentials',
                provider: 'tencent',
            });
        }

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

        const tencentcloud = require('tencentcloud-sdk-nodejs');
        const HunyuanClient = tencentcloud.hunyuan.v20230901.Client;
        const client = new HunyuanClient({
            credential: { secretId: SecretId, secretKey: SecretKey },
            region: 'ap-guangzhou',
            profile: { httpProfile: { endpoint: 'hunyuan.tencentcloudapi.com' } },
        });

        const result = await client.ChatCompletions(requestData);
        res.json({ Response: result });
    } catch (error) {
        console.error('API代理错误:', error);

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            res.status(408).json({
                error: '请求超时',
                message: '混元 API 调用超时，请稍后重试',
                provider: 'tencent',
                code: 408,
            });
        } else if (error.code && error.message) {
            res.status(400).json({
                error: '腾讯云API错误',
                message: error.message,
                provider: 'tencent',
                code: error.code,
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
async function handleTencentStatus(req, res, { getUserProviderConfig, isAdminUser }) {
    const userCfg = getUserProviderConfig(req.currentUser.id, 'tencent');
    const hasOwnKeys = !!(userCfg && userCfg.secretId && userCfg.secretKey);
    const { secretId, secretKey } = getTencentCamCredentials(userCfg);
    const validation = validateTencentCamCredential(secretId, secretKey);
    const isAdmin = isAdminUser ? isAdminUser(req.currentUser) : false;
    const out = {
        configured: validation.ok,
        hasOwnKeys,
        usesPlatformKeys: validation.ok && !hasOwnKeys,
        isAdmin,
        validation,
        secretIdPrefix: secretId ? secretId.slice(0, 8) + '…' : null,
        hint: hasOwnKeys
            ? '使用你自配的腾讯云密钥'
            : isAdmin
                ? '使用平台默认密钥（管理员权限）'
                : '请在「用户中心」配置你自己的腾讯云 SecretId / SecretKey',
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
