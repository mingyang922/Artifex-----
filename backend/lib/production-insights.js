'use strict';

const WORKFLOW_TEMPLATES = Object.freeze([
    {
        id: 'character-sheet',
        name: '角色设定立绘',
        category: '角色',
        description: '围绕固定外观、配色和标志性特征生成角色设定图。',
        mode: 'text2img',
        size: '1024x1024',
        prompt: '完整角色设定立绘，正面视角，清晰轮廓，统一服装与标志性特征，纯色背景',
        outputType: '角色立绘',
    },
    {
        id: 'action-set',
        name: '角色动作组',
        category: '角色',
        description: '为同一角色准备待机、移动、攻击和受击动作。',
        mode: 'text2img',
        size: '1024x1024',
        prompt: '同一角色动作组，待机、移动、攻击、受击，比例和服装保持一致，分格展示',
        outputType: '动作组',
    },
    {
        id: 'expression-set',
        name: '角色表情组',
        category: '角色',
        description: '生成适合对话界面的统一角色表情集合。',
        mode: 'text2img',
        size: '1024x1024',
        prompt: '同一角色头像表情组，平静、喜悦、愤怒、惊讶、悲伤，五官与发型保持一致',
        outputType: '表情组',
    },
    {
        id: 'item-pack',
        name: '道具套装',
        category: '道具',
        description: '按统一视角、光照和材质生成系列道具。',
        mode: 'text2img',
        size: '1024x1024',
        prompt: '游戏道具套装，统一视角、统一光照、统一材质表现，轮廓清晰，透明背景感',
        outputType: '道具',
    },
    {
        id: 'ui-icons',
        name: 'UI 图标组',
        category: '界面',
        description: '生成视觉语言一致、适合小尺寸显示的图标组。',
        mode: 'text2img',
        size: '1024x1024',
        prompt: '游戏 UI 图标组，统一边框、统一色彩、中心构图，高辨识度，适合小尺寸显示',
        outputType: 'UI 图标',
    },
    {
        id: 'scene-concept',
        name: '场景概念图',
        category: '场景',
        description: '以明确构图、空间层次和氛围生成场景方案。',
        mode: 'text2img',
        size: '1024x1024',
        prompt: '游戏场景概念图，明确前中后景，空间层次清晰，光影统一，保留可落地的关卡结构',
        outputType: '场景',
    },
    {
        id: 'sketch-finish',
        name: '线稿转成品',
        category: '加工',
        description: '保留原始构图和轮廓，将线稿转为完整美术资产。',
        mode: 'img2img',
        size: '1024x1024',
        prompt: '保留原始线稿构图和主体轮廓，补充稳定配色、材质、光影和可用细节',
        outputType: '成品图',
    },
]);

function splitTerms(value) {
    if (Array.isArray(value)) return value.flatMap(splitTerms);
    return String(value || '')
        .split(/[，,、;；/|\n]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 50);
}

function normalize(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/([红黑白金蓝绿紫黄橙灰])色/g, '$1')
        .replace(/[\s，,、;；:：。.!！?？()（）\-_]/g, '');
}

function includesTerm(haystack, term) {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) return false;
    if (haystack.includes(normalizedTerm)) return true;
    const fragments = String(term)
        .split(/[的与和及带有]+/)
        .map(normalize)
        .filter((part) => part.length >= 2);
    return fragments.length > 1 && fragments.every((part) => haystack.includes(part));
}

function evaluateCharacterConsistency(character, observation = {}) {
    const observedText = [observation.description, observation.prompt, observation.observedTraits]
        .flatMap(splitTerms)
        .join('；');
    const haystack = normalize(observedText);
    const expectedTraits = splitTerms(character.lockedTraits || character.locked_traits_json);
    const expectedPalette = splitTerms(character.palette);
    const observedPalette = splitTerms(observation.palette);
    const paletteHaystack = normalize([observation.palette, observedText].filter(Boolean).join('；'));

    const matchedTraits = expectedTraits.filter((trait) => includesTerm(haystack, trait));
    const missingTraits = expectedTraits.filter((trait) => !matchedTraits.includes(trait));
    const matchedPalette = expectedPalette.filter((color) => includesTerm(paletteHaystack, color));
    const missingPalette = expectedPalette.filter((color) => !matchedPalette.includes(color));
    const traitScore = expectedTraits.length ? matchedTraits.length / expectedTraits.length : 1;
    const paletteScore = expectedPalette.length ? matchedPalette.length / expectedPalette.length : 1;
    const descriptionPresent = normalize(character.description) && haystack ? 1 : 0.5;
    const score = Math.round((traitScore * 0.7 + paletteScore * 0.2 + descriptionPresent * 0.1) * 100);
    const recommendations = [];
    if (missingTraits.length) recommendations.push(`补充或确认锁定特征：${missingTraits.join('、')}`);
    if (missingPalette.length) recommendations.push(`补充或确认固定配色：${missingPalette.join('、')}`);
    if (!observedText) recommendations.push('填写生成 Prompt 或人工观察到的特征后再评估');
    if (!recommendations.length) recommendations.push('元数据约束均已覆盖，仍建议人工检查造型与比例');

    return {
        method: 'metadata-heuristic-v1',
        scope: '基于提示词、人工观察和配色文本的可解释检查，不等同于图像识别或模型级相似度',
        score,
        grade: score >= 85 ? '良好' : score >= 60 ? '需复核' : '偏差较大',
        matchedTraits,
        missingTraits,
        matchedPalette,
        missingPalette,
        recommendations,
        sample: {
            expectedTraitCount: expectedTraits.length,
            expectedPaletteCount: expectedPalette.length,
            observedPaletteCount: observedPalette.length,
        },
    };
}

function classifyGenerationError(error) {
    const message = String(error || '').toLowerCase();
    if (!message) return { code: 'unknown', label: '未知错误', suggestion: '检查服务日志后重试' };
    if (/timeout|timed out|超时/.test(message))
        return { code: 'timeout', label: '请求超时', suggestion: '降低图片尺寸或稍后重试' };
    if (/401|403|unauthor|forbidden|密钥|credential/.test(message))
        return { code: 'credentials', label: '凭证错误', suggestion: '在账户中心检查服务商密钥' };
    if (/429|rate|quota|额度|限流/.test(message))
        return { code: 'quota', label: '额度或限流', suggestion: '等待额度恢复或切换服务商' };
    if (/network|fetch|dns|connect|socket|网络/.test(message))
        return { code: 'network', label: '网络连接失败', suggestion: '检查网络与服务地址后重试' };
    if (/content|policy|safety|审核|敏感/.test(message))
        return { code: 'content_policy', label: '内容策略限制', suggestion: '调整提示词中的敏感描述' };
    return { code: 'provider', label: '服务商错误', suggestion: '保留参数并重试，持续失败时切换服务商' };
}

module.exports = {
    WORKFLOW_TEMPLATES,
    evaluateCharacterConsistency,
    classifyGenerationError,
    splitTerms,
};
