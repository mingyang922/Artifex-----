/**
 * Artifex - 二维游戏美术协作与 AI 资产生成平台
 * Copyright (c) 2026 窦英杰, 黄建文, 吴名扬
 * 版本: 1.4.0 */
'use strict';
// AI API配置
const ARTIFEX_VERSION = '1.4.0';

const API_CONFIG = {
    version: ARTIFEX_VERSION,
    // 腾讯混元API配置
    hunyuan: {
        // 从环境变量或配置文件中读取API密钥
        secretId: process.env.HUNYUAN_SECRET_ID || 'YOUR_SECRET_ID',
        secretKey: process.env.HUNYUAN_SECRET_KEY || 'YOUR_SECRET_KEY',
        endpoint: 'https://hunyuan.tencentcloudapi.com',
        version: '2023-09-01',
        model: 'hunyuan-lite' // 可选模型: hunyuan-lite, hunyuan-standard, hunyuan-pro
    },
    // 阿里云通义千问API配置
    alibaba: {
        // 从环境变量或配置文件中读取API密钥
        apiKey: process.env.DASHSCOPE_API_KEY || process.env.ALIBABA_API_KEY || 'YOUR_ALIBABA_API_KEY',
        endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        imageEndpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        model: 'qwen-turbo', // 可选模型: qwen-turbo, qwen-plus
        // 看图归纳画风（DashScope 多模态），可用环境变量 DASHSCOPE_VL_MODEL 覆盖
        visionModel: process.env.DASHSCOPE_VL_MODEL || 'qwen-vl-plus'
    },
    // 图片生成API配置
    image: {
        // 从环境变量或配置文件中读取API密钥
        apiKey: process.env.IMAGE_API_KEY || 'YOUR_IMAGE_API_KEY',
        endpoint: 'https://api.openai.com/v1/images/generations', // 示例：使用OpenAI DALL-E API
        defaultSize: '512x512'
    },

    // 代理服务器配置
    proxy: {
        endpoint: process.env.PROXY_ENDPOINT || '/api',
        port: parseInt(process.env.PORT, 10) || 3000
    },

    // 前端配置
    frontend: {
        maxAssets: 15, // 最大保存资产数量（图片占用空间较大）
        timeout: 60000 // API调用超时时间(毫秒)，图片生成需要更长时间
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
} else {
    window.API_CONFIG = API_CONFIG;
}
