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
