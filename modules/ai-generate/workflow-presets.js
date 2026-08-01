/**
 * Applies deep-linked production workflow presets to the existing generator.
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const params = new URLSearchParams(location.search);
        const workflow = params.get('workflow');
        if (workflow === 'sketch') {
            const imageTab = document.querySelector('[data-tab-target="image"], [data-tab="image"]');
            if (imageTab && imageTab.tagName === 'BUTTON') imageTab.click();
            const mode = document.querySelector('input[name="imageMode"][value="img2img"]');
            if (mode) {
                mode.checked = true;
                mode.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const title = document.querySelector('#view-image .form-section-title');
            if (title) title.innerHTML = '<i class="fas fa-pen-ruler"></i> 线稿 → 成品图工作流';
            setTimeout(function () {
                document.getElementById('sketchFile')?.focus();
            }, 300);
        }

        if (workflow && workflow !== 'sketch') {
            fetch('/api/workflow-templates', { credentials: 'include' })
                .then((response) => response.json())
                .then((data) => {
                    const template = (data.templates || []).find((item) => item.id === workflow);
                    if (!template) return;
                    const description = document.getElementById('imageDescription');
                    const size = document.getElementById('imageSize');
                    if (description)
                        description.value = [description.value, template.prompt].filter(Boolean).join('；');
                    if (size && Array.from(size.options).some((option) => option.value === template.size)) {
                        size.value = template.size;
                        size.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    if (template.mode === 'img2img') {
                        const mode = document.querySelector('input[name="imageMode"][value="img2img"]');
                        if (mode) {
                            mode.checked = true;
                            mode.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                })
                .catch(() => {});
        }

        const replayJobId = params.get('replayJobId');
        if (replayJobId) {
            fetch(`/api/generation-jobs/${encodeURIComponent(replayJobId)}/replay`, { credentials: 'include' })
                .then((response) => response.json())
                .then((data) => {
                    const replay = data.replay;
                    if (!replay) return;
                    const description = document.getElementById('imageDescription');
                    const provider = document.getElementById('apiProvider');
                    const size = document.getElementById('imageSize');
                    if (description) description.value = replay.prompt || '';
                    if (provider && Array.from(provider.options).some((option) => option.value === replay.provider)) {
                        provider.value = replay.provider;
                        provider.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    if (size && replay.params?.size) {
                        const normalizedSize = String(replay.params.size).replace(':', 'x');
                        if (Array.from(size.options).some((option) => option.value === normalizedSize)) {
                            size.value = normalizedSize;
                            size.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                    const mode = document.querySelector(`input[name="imageMode"][value="${replay.mode}"]`);
                    if (mode) {
                        mode.checked = true;
                        mode.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                })
                .catch(() => {});
        }

        const characterId = params.get('characterId');
        if (!characterId) return;
        fetch('/api/characters', { credentials: 'include' })
            .then((response) => response.json())
            .then((data) => {
                const character = (data.characters || []).find((item) => String(item.id) === String(characterId));
                if (!character) return;
                const description = document.getElementById('imageDescription');
                if (!description) return;
                const traits = (character.lockedTraits || []).join('、');
                const prompt = [
                    character.description,
                    character.style_prompt,
                    character.palette ? `固定配色：${character.palette}` : '',
                    traits ? `必须保持：${traits}` : '',
                ]
                    .filter(Boolean)
                    .join('；');
                description.value = [description.value, prompt].filter(Boolean).join('；');
            })
            .catch(() => {});
    });
})();
