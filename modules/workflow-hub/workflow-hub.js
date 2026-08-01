(function () {
    'use strict';
    const state = { projects: [], projectId: null, capabilities: null };
    const $ = (selector) => document.querySelector(selector);
    const esc = (value) =>
        typeof escapeHtml === 'function'
            ? escapeHtml(String(value ?? ''))
            : String(value ?? '').replace(
                  /[&<>"']/g,
                  (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
              );
    const toast = (message) => {
        const node = $('#workflowToast');
        node.textContent = message;
        node.classList.add('show');
        setTimeout(() => node.classList.remove('show'), 2200);
    };
    async function api(url, options) {
        const response = options ? await fetchWithCsrf(url, options) : await fetch(url, { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error?.message || data.message || data.error || '请求失败');
        return data;
    }
    function card(title, body, badges = '', actions = '') {
        return `<article class="workflow-card"><h3>${esc(title)}</h3><p>${esc(body)}</p><div class="meta">${badges}${actions}</div></article>`;
    }
    function badge(value) {
        return `<span class="badge">${esc(value)}</span>`;
    }

    function renderCapability(name, capability, noticeSelector) {
        const badgeNode = document.querySelector(`[data-capability-badge="${name}"]`);
        if (badgeNode) {
            badgeNode.textContent = capability.label;
            badgeNode.dataset.status = capability.status;
        }
        const notice = $(noticeSelector);
        if (notice) {
            const limitations = Array.isArray(capability.limitations)
                ? ` 限制：${capability.limitations.join('；')}。`
                : '';
            notice.textContent = capability.description + limitations;
            notice.dataset.status = capability.status;
        }
    }

    function setLoraFormEnabled(enabled) {
        document
            .querySelectorAll('#loraForm input, #loraForm select, #loraForm textarea, #loraForm button')
            .forEach((node) => {
                node.disabled = !enabled;
            });
    }

    async function loadCapabilities() {
        try {
            const data = await api('/api/capabilities');
            state.capabilities = data.capabilities;
            renderCapability(
                'characterConsistency',
                data.capabilities.characterConsistency,
                '#characterCapabilityNotice'
            );
            renderCapability('loraTraining', data.capabilities.loraTraining, '#loraCapabilityNotice');
            setLoraFormEnabled(data.capabilities.loraTraining.enabled);
        } catch (error) {
            state.capabilities = null;
            renderCapability(
                'characterConsistency',
                { status: 'unknown', label: '状态未知', description: '无法确认能力状态，请刷新页面后重试。' },
                '#characterCapabilityNotice'
            );
            renderCapability(
                'loraTraining',
                { status: 'unknown', label: '不可提交', description: '无法确认训练 Worker 状态，已停止接收新任务。' },
                '#loraCapabilityNotice'
            );
            setLoraFormEnabled(false);
            toast(error.message);
        }
    }

    document.querySelectorAll('.workflow-tabs button').forEach((button) => {
        button.addEventListener('click', () => {
            document
                .querySelectorAll('.workflow-tabs button')
                .forEach((item) => item.classList.toggle('is-active', item === button));
            document
                .querySelectorAll('[data-workflow-panel]')
                .forEach((panel) =>
                    panel.classList.toggle('is-active', panel.dataset.workflowPanel === button.dataset.panel)
                );
        });
    });

    async function loadJobs() {
        const data = await api('/api/generation-jobs?limit=50');
        $('#metricJobs').textContent = data.jobs.length;
        $('#jobList').innerHTML = data.jobs.length
            ? data.jobs
                  .map((job) =>
                      card(
                          job.prompt || '未命名任务',
                          `${job.provider || '未指定服务商'} · ${job.mode}`,
                          badge(job.status) +
                              badge(new Date(job.created_at).toLocaleString()) +
                              (job.status === 'draft'
                                  ? `<a class="secondary-action" href="../ai-generate/ai-generator-new.html?replayJobId=${job.id}">打开复现草稿</a>`
                                  : '') +
                              (['completed', 'failed'].includes(job.status)
                                  ? `<button class="secondary-action duplicate-job" data-id="${job.id}">复制参数</button>`
                                  : '') +
                              (['draft', 'queued'].includes(job.status)
                                  ? `<button class="secondary-action cancel-job" data-id="${job.id}">取消草稿</button>`
                                  : '') +
                              (job.status === 'failed'
                                  ? `<button class="secondary-action diagnose-job" data-id="${job.id}">查看失败建议</button>`
                                  : '')
                      )
                  )
                  .join('')
            : card('暂无生成历史', '从 AI 生成器完成一次生成后会自动记录。');
        document.querySelectorAll('.duplicate-job').forEach((button) =>
            button.addEventListener('click', async () => {
                await api(`/api/generation-jobs/${button.dataset.id}/duplicate`, { method: 'POST', body: '{}' });
                toast('已创建可复现草稿，请从草稿进入生成器提交');
                loadJobs();
            })
        );
        document.querySelectorAll('.cancel-job').forEach((button) =>
            button.addEventListener('click', async () => {
                await api(`/api/generation-jobs/${button.dataset.id}/cancel`, { method: 'POST', body: '{}' });
                toast('草稿已取消');
                loadJobs();
            })
        );
        document.querySelectorAll('.diagnose-job').forEach((button) =>
            button.addEventListener('click', async () => {
                const data = await api(`/api/generation-jobs/${button.dataset.id}/diagnosis`);
                toast(`${data.diagnosis.label}：${data.diagnosis.suggestion}`);
            })
        );
    }

    async function loadCharacters() {
        const data = await api('/api/characters');
        $('#metricCharacters').textContent = data.characters.length;
        $('#characterList').innerHTML = data.characters.length
            ? data.characters
                  .map((item) =>
                      card(
                          item.name,
                          item.description || '暂无描述',
                          badge(item.palette || '未设配色') +
                              badge(item.seed ? `Seed ${item.seed}` : '随机 Seed') +
                              `<a class="secondary-action" href="../ai-generate/ai-generator-new.html?characterId=${item.id}">使用角色</a>`
                      )
                  )
                  .join('')
            : card('还没有角色档案', '创建档案后可把固定设定注入生成器。');
    }
    $('#characterForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fd = new FormData(form);
        await api('/api/characters', {
            method: 'POST',
            body: JSON.stringify({
                name: fd.get('name'),
                palette: fd.get('palette'),
                seed: fd.get('seed'),
                description: fd.get('description'),
                stylePrompt: fd.get('stylePrompt'),
                lockedTraits: String(fd.get('lockedTraits') || '')
                    .split(/[,，]/)
                    .map((v) => v.trim())
                    .filter(Boolean),
                references: String(fd.get('references') || '')
                    .split(/[,，]/)
                    .map((v) => v.trim())
                    .filter(Boolean),
            }),
        });
        form.reset();
        toast('角色档案已创建');
        loadCharacters();
    });

    async function loadProjects() {
        const data = await api('/api/collaboration/projects');
        state.projects = data.projects;
        $('#metricProjects').textContent = data.projects.length;
        $('#projectSelect').innerHTML = data.projects
            .map((p) => `<option value="${p.id}">${esc(p.name)} · ${esc(p.access_role)}</option>`)
            .join('');
        const requestedProjectId = Number(new URLSearchParams(location.search).get('projectId'));
        if (requestedProjectId && data.projects.some((project) => project.id === requestedProjectId)) {
            $('#projectSelect').value = String(requestedProjectId);
        }
        state.projectId = Number($('#projectSelect').value) || null;
        if (state.projectId) loadProjectDetails();
    }
    async function loadProjectDetails() {
        if (!state.projectId) return;
        const [members, comments, versions] = await Promise.all([
            api(`/api/projects/${state.projectId}/members`),
            api(`/api/projects/${state.projectId}/comments`),
            api(`/api/projects/${state.projectId}/versions`),
        ]);
        $('#memberList').innerHTML = members.members
            .map((m) => card(m.username || m.email, m.email, badge(m.role)))
            .join('');
        $('#commentList').innerHTML = comments.comments.length
            ? comments.comments
                  .map((c) =>
                      card(c.username, c.body, badge(c.status) + badge(new Date(c.created_at).toLocaleString()))
                  )
                  .join('')
            : card('暂无批注', '审核意见会显示在这里。');
        const project = state.projects.find((item) => item.id === state.projectId);
        const role = project?.access_role || 'viewer';
        const canRestore = role === 'owner' || role === 'editor';
        const canReview = role === 'owner' || role === 'reviewer';
        $('#versionList').innerHTML = versions.versions.length
            ? versions.versions
                  .map((v) =>
                      card(
                          `版本 ${v.version}`,
                          v.description,
                          badge(new Date(v.created_at).toLocaleString()) +
                              (v.restorable && canRestore
                                  ? `<button class="secondary-action restore-version" data-version="${v.version}">恢复</button>`
                                  : badge(v.restorable ? '可恢复' : '仅记录'))
                      )
                  )
                  .join('')
            : card('暂无版本', '保存项目后会创建可恢复快照。');
        document.querySelectorAll('.restore-version').forEach((button) =>
            button.addEventListener('click', async () => {
                if (!confirm(`确定恢复到版本 ${button.dataset.version}？`)) return;
                await api(`/api/projects/${state.projectId}/versions/${button.dataset.version}/restore`, {
                    method: 'POST',
                    body: '{}',
                });
                toast('版本已恢复并创建新版本');
                loadProjects();
            })
        );
        if (project) $('#reviewStatus').value = project.review_status || 'draft';
        $('#memberForm').hidden = role !== 'owner';
        $('#inviteControls').hidden = role !== 'owner';
        $('#commentForm').hidden = role === 'viewer';
        $('#reviewStatus').disabled = !canReview;
        Array.from($('#reviewStatus').options).forEach((option) => {
            option.disabled = role === 'reviewer' && !['changes_requested', 'approved'].includes(option.value);
        });
        const inviteList = $('#inviteList');
        if (project?.access_role === 'owner') {
            const inviteData = await api(`/api/projects/${state.projectId}/invites`);
            inviteList.innerHTML = inviteData.invites.length
                ? inviteData.invites
                      .map((invite) =>
                          card(
                              invite.kind === 'share' ? '只读分享' : '成员邀请',
                              `有效期至 ${new Date(invite.expires_at).toLocaleString()}`,
                              invite.revoked_at
                                  ? badge('已撤销')
                                  : `<button class="secondary-action revoke-invite" data-token="${esc(invite.token)}">撤销</button>`
                          )
                      )
                      .join('')
                : '';
            document.querySelectorAll('.revoke-invite').forEach((button) =>
                button.addEventListener('click', async () => {
                    await api(`/api/projects/${state.projectId}/invites/${encodeURIComponent(button.dataset.token)}`, {
                        method: 'DELETE',
                    });
                    toast('链接已撤销');
                    loadProjectDetails();
                })
            );
        } else {
            inviteList.innerHTML = '';
        }
    }
    $('#projectSelect').addEventListener('change', () => {
        state.projectId = Number($('#projectSelect').value);
        loadProjectDetails();
    });
    $('#memberForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fd = new FormData(form);
        await api(`/api/projects/${state.projectId}/members`, {
            method: 'POST',
            body: JSON.stringify({ email: fd.get('email'), role: fd.get('role') }),
        });
        form.reset();
        toast('成员已添加');
        loadProjectDetails();
    });
    $('#commentForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fd = new FormData(form);
        await api(`/api/projects/${state.projectId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ body: fd.get('body') }),
        });
        form.reset();
        toast('批注已发布');
        loadProjectDetails();
    });
    $('#reviewStatus').addEventListener('change', async (event) => {
        await api(`/api/projects/${state.projectId}/review`, {
            method: 'PUT',
            body: JSON.stringify({ status: event.target.value }),
        });
        toast('审核状态已更新');
    });
    async function createLink(kind) {
        const data = await api(`/api/projects/${state.projectId}/invites`, {
            method: 'POST',
            body: JSON.stringify({ kind, role: 'viewer', days: 7 }),
        });
        const path =
            kind === 'share'
                ? `/modules/workflow-hub/shared.html?token=${encodeURIComponent(data.invite.token)}`
                : `/modules/workflow-hub/index.html?invite=${encodeURIComponent(data.invite.token)}`;
        $('#shareResult').value = location.origin + path;
        $('#shareResult').select();
        navigator.clipboard?.writeText($('#shareResult').value).catch(() => {});
        toast('链接已创建并复制');
        loadProjectDetails();
    }
    $('#createInvite').addEventListener('click', () => createLink('invite'));
    $('#createShare').addEventListener('click', () => createLink('share'));

    async function loadLora() {
        const data = await api('/api/lora-jobs');
        $('#loraList').innerHTML = data.jobs.length
            ? data.jobs
                  .map((job) =>
                      card(
                          job.name,
                          `${job.provider} · ${job.images.length} 张训练图`,
                          badge(job.status) + badge(`${job.progress}%`)
                      )
                  )
                  .join('')
            : card('暂无 LoRA 任务', '至少准备 5 张同风格图片后创建训练任务。');
    }
    $('#loraForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!state.capabilities?.loraTraining?.enabled) {
            toast('训练 Worker 未就绪，当前不能创建 LoRA 任务');
            return;
        }
        const form = event.currentTarget;
        const fd = new FormData(form);
        const images = String(fd.get('images') || '')
            .split(/\r?\n/)
            .map((v) => v.trim())
            .filter(Boolean);
        await api('/api/lora-jobs', {
            method: 'POST',
            body: JSON.stringify({
                name: fd.get('name'),
                provider: fd.get('provider'),
                images,
                params: { triggerWord: fd.get('triggerWord') },
            }),
        });
        form.reset();
        toast('LoRA 任务已排队');
        loadLora();
    });

    async function loadNotifications() {
        const [notifications, costs] = await Promise.all([api('/api/notifications'), api('/api/me/cost-summary')]);
        $('#metricUnread').textContent = notifications.unread;
        $('#notificationList').innerHTML = notifications.notifications.length
            ? notifications.notifications
                  .map((n) =>
                      card(
                          n.title,
                          n.body,
                          badge(n.is_read ? '已读' : '未读') + badge(new Date(n.created_at).toLocaleString())
                      )
                  )
                  .join('')
            : card('暂无通知', '生成任务和协作事件会实时出现在这里。');
        $('#costSummary').innerHTML = costs.costs.length
            ? costs.costs
                  .map((item) =>
                      card(
                          item.provider || 'unknown',
                          `${item.jobs} 个任务`,
                          badge(`估算 ¥${Number(item.estimated_cost || 0).toFixed(2)}`)
                      )
                  )
                  .join('')
            : card('暂无成本记录', '生成任务记录成本后会按服务商汇总。');
        if (costs.alerts.length)
            $('#costSummary').innerHTML += costs.alerts
                .map((a) => card(`${a.provider} 额度预警`, a.reason ? '额度已用尽' : '使用量已超过 80%', badge('注意')))
                .join('');
    }
    $('#readAll').addEventListener('click', async () => {
        await api('/api/notifications/read-all', { method: 'PUT', body: '{}' });
        loadNotifications();
    });
    $('#refreshJobs').addEventListener('click', loadJobs);

    const requestedPanel = location.hash.slice(1);
    const requestedTab = document.querySelector(`.workflow-tabs button[data-panel="${requestedPanel}"]`);
    if (requestedTab) requestedTab.click();

    async function acceptInviteFromUrl() {
        const invite = new URLSearchParams(location.search).get('invite');
        if (!invite) return;
        await api(`/api/project-invites/${encodeURIComponent(invite)}/accept`, { method: 'POST', body: '{}' });
        history.replaceState({}, '', 'index.html');
        toast('已加入项目');
    }
    Promise.resolve()
        .then(acceptInviteFromUrl)
        .then(loadCapabilities)
        .then(() => Promise.all([loadJobs(), loadCharacters(), loadProjects(), loadLora(), loadNotifications()]))
        .catch((error) => toast(error.message));
    if (window.WsClient) {
        window.WsClient.onNotify(() => loadNotifications());
        window.WsClient.init();
    }
})();
