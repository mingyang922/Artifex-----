(function () {
    'use strict';

    const $ = (selector) => document.querySelector(selector);
    const esc = (value) =>
        typeof escapeHtml === 'function'
            ? escapeHtml(String(value ?? ''))
            : String(value ?? '').replace(
                  /[&<>"']/g,
                  (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
              );

    function toast(message) {
        const node = $('#workflowToast');
        if (!node) return;
        node.textContent = message;
        node.classList.add('show');
        setTimeout(() => node.classList.remove('show'), 2600);
    }

    async function api(url, options) {
        const response = options ? await fetchWithCsrf(url, options) : await fetch(url, { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error?.message || data.message || '请求失败');
        return data;
    }

    function setBusy(button, busy, busyText) {
        if (!button) return;
        if (!button.dataset.label) button.dataset.label = button.textContent;
        button.disabled = busy;
        button.textContent = busy ? busyText : button.dataset.label;
    }

    async function loadTemplates() {
        const data = await api('/api/workflow-templates');
        const container = $('#workflowTemplateList');
        container.innerHTML = data.templates
            .map(
                (template) => `
                <article class="workflow-card">
                    <h3>${esc(template.name)}</h3>
                    <p>${esc(template.description)}</p>
                    <div class="meta">
                        <span class="badge">${esc(template.category)}</span>
                        <span class="badge">${esc(template.mode)}</span>
                        <span class="badge">${esc(template.size)}</span>
                        <a class="secondary-action" href="../ai-generate/ai-generator-new.html?workflow=${encodeURIComponent(template.id)}">使用模板</a>
                    </div>
                </article>`
            )
            .join('');
    }

    async function loadEvaluationCharacters() {
        const data = await api('/api/characters');
        const select = $('#evaluationCharacter');
        select.innerHTML = data.characters.length
            ? data.characters.map((item) => `<option value="${item.id}">${esc(item.name)}</option>`).join('')
            : '<option value="">请先创建角色档案</option>';
        select.disabled = !data.characters.length;
        $('#consistencyForm button[type="submit"]').disabled = !data.characters.length;
    }

    function renderEvaluation(evaluation) {
        const missing = [...evaluation.missingTraits, ...evaluation.missingPalette];
        $('#consistencyResult').innerHTML = `
            <div class="insight-score">
                <strong>${evaluation.score}</strong>
                <div>
                    <b>${esc(evaluation.grade)}</b>
                    <p>${esc(evaluation.scope)}</p>
                    <p>已覆盖：${esc([...evaluation.matchedTraits, ...evaluation.matchedPalette].join('、') || '暂无')}</p>
                    <p>待复核：${esc(missing.join('、') || '无')}</p>
                    <ul>${evaluation.recommendations.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
                </div>
            </div>`;
    }

    async function loadMetrics() {
        const data = await api('/api/me/workflow-metrics');
        const generation = data.metrics.generation;
        const consistency = data.metrics.consistency;
        const metrics = [
            [generation.total || 0, '生成任务'],
            [`${generation.successRate || 0}%`, '生成成功率'],
            [generation.avg_seconds ? `${generation.avg_seconds}s` : '—', '平均生成耗时'],
            [generation.failed || 0, '失败任务'],
            [consistency.total || 0, '一致性评估'],
            [consistency.average_score ?? '—', '平均一致性分'],
        ];
        $('#workflowMetricDetails').innerHTML = metrics
            .map(
                ([value, label]) =>
                    `<div class="insight-metric"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`
            )
            .join('');
    }

    $('#consistencyForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        const data = new FormData(form);
        try {
            setBusy(button, true, '评估中…');
            const response = await api(`/api/characters/${encodeURIComponent(data.get('characterId'))}/evaluate`, {
                method: 'POST',
                body: JSON.stringify({ description: data.get('description'), palette: data.get('palette') }),
            });
            renderEvaluation(response.evaluation);
            await loadMetrics();
        } catch (error) {
            toast(error.message);
        } finally {
            setBusy(button, false);
        }
    });

    $('#createDemoWorkspace').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        try {
            setBusy(button, true, '创建中…');
            const data = await api('/api/demo-workspace', { method: 'POST', body: '{}' });
            toast(data.created ? '示例工作区已创建' : '示例工作区已经存在');
            setTimeout(() => location.reload(), 600);
        } catch (error) {
            toast(error.message);
            setBusy(button, false);
        }
    });

    $('#removeDemoWorkspace').addEventListener('click', async (event) => {
        if (!confirm('确定移除由系统创建的示例项目和示例角色吗？其他数据不会受影响。')) return;
        const button = event.currentTarget;
        try {
            setBusy(button, true, '移除中…');
            const data = await api('/api/demo-workspace', { method: 'DELETE', body: '{}' });
            toast(`已移除 ${data.removed} 个示例项目`);
            setTimeout(() => location.reload(), 600);
        } catch (error) {
            toast(error.message);
            setBusy(button, false);
        }
    });

    $('#exportWorkspace').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        try {
            setBusy(button, true, '导出中…');
            const response = await fetch('/api/workspace-export', { credentials: 'include' });
            if (!response.ok) throw new Error('服务端工作区导出失败');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `artifex-workspace-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 0);
            toast('工作区备份已导出');
        } catch (error) {
            toast(error.message);
        } finally {
            setBusy(button, false);
        }
    });

    $('#importWorkspace').addEventListener('click', () => $('#workspaceImportFile').click());
    $('#workspaceImportFile').addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) return toast('备份文件不能超过 20MB');
        try {
            const payload = JSON.parse(await file.text());
            if (!confirm('导入会以追加方式创建项目、角色和素材，是否继续？')) return;
            const data = await api('/api/workspace-import', { method: 'POST', body: JSON.stringify(payload) });
            toast(`导入完成：${data.imported.projects} 个项目，${data.imported.characters} 个角色`);
            setTimeout(() => location.reload(), 800);
        } catch (error) {
            toast(`导入失败：${error.message}`);
        }
    });

    Promise.all([loadTemplates(), loadEvaluationCharacters(), loadMetrics()]).catch((error) => toast(error.message));
})();
