/**
 * AI generator copy bridge.
 *
 * The generator contains several feature modules that create controls and
 * result panels at runtime.  This bridge keeps their legacy Chinese source
 * strings translatable without letting custom selects, templates or async
 * status messages fall back to Chinese after the initial i18n pass.
 */
(function () {
    'use strict';

    const ROWS = [
        // Style preset strip and shared states.
        ['未使用风格预设', 'No style preset', 'スタイルプリセット未使用', '스타일 프리셋 사용 안 함'],
        ['— 不使用预设 —', '— No preset —', '— プリセットなし —', '— 프리셋 사용 안 함 —'],
        [
            '详细选项（提取画风、保存预设、说明）',
            'Advanced options (extract, save, help)',
            '詳細オプション（スタイル抽出・保存・説明）',
            '상세 옵션(스타일 추출·저장·안내)',
        ],
        [
            '点击展开或收起详细选项',
            'Expand or collapse advanced options',
            '詳細オプションを開閉',
            '상세 옵션 펼치기 또는 접기',
        ],
        ['删除所选', 'Delete selected', '選択項目を削除', '선택 항목 삭제'],
        ['选择参考图', 'Choose reference', '参照画像を選択', '참조 이미지 선택'],
        ['提取画风', 'Extract style', 'スタイルを抽出', '스타일 추출'],
        [
            '你尚未配置阿里云 API Key，「提取画风」不可用。',
            'Alibaba Cloud API Key is not configured. Style extraction is unavailable.',
            'Alibaba Cloud API Keyが未設定のため、スタイル抽出は利用できません。',
            'Alibaba Cloud API Key가 설정되지 않아 스타일 추출을 사용할 수 없습니다.',
        ],
        [
            '当前风格片段（可编辑）',
            'Current style snippet (editable)',
            '現在のスタイル文（編集可）',
            '현재 스타일 문구(편집 가능)',
        ],
        [
            '保存压缩参考图到预设',
            'Save compressed reference in preset',
            '圧縮した参照画像をプリセットに保存',
            '압축 참조 이미지를 프리셋에 저장',
        ],
        ['保存为预设', 'Save as preset', 'プリセットとして保存', '프리셋으로 저장'],
        [
            '选用已保存的风格预设',
            'Use a saved style preset',
            '保存済みスタイルプリセットを使用',
            '저장된 스타일 프리셋 사용',
        ],
        [
            '选择参考图后点「提取画风」，或从上方下拉选择已保存预设',
            'Choose a reference and select Extract Style, or choose a saved preset above',
            '参照画像を選んで「スタイルを抽出」を押すか、上のリストから保存済みプリセットを選択',
            '참조 이미지를 선택해 ‘스타일 추출’을 누르거나 위 목록에서 저장된 프리셋을 선택하세요',
        ],
        ['预设名称', 'Preset name', 'プリセット名', '프리셋 이름'],
        ['使用预设：', 'Preset: ', '使用中：', '사용 프리셋: '],
        [
            '已填写风格片段（未绑定预设）',
            'Style snippet entered (no preset linked)',
            'スタイル文を入力済み（プリセット未連携）',
            '스타일 문구 입력됨(프리셋 연결 안 됨)',
        ],
        ['准备生成中...', 'Preparing generation...', '生成を準備中...', '생성 준비 중...'],
        ['生成结果', 'Generation result', '生成結果', '생성 결과'],
        [
            '生成结果将显示在这里',
            'Your result will appear here',
            '生成結果がここに表示されます',
            '생성 결과가 여기에 표시됩니다',
        ],
        ['已生成资产', 'Generated assets', '生成済みアセット', '생성된 에셋'],
        [
            '暂无已生成图片。填写参数后点击生成，即可在这里管理图片。',
            'No generated images yet. Configure the options and generate an image to manage it here.',
            '生成済み画像はありません。設定を入力して生成すると、ここで管理できます。',
            '생성된 이미지가 없습니다. 옵션을 설정하고 생성하면 여기에서 관리할 수 있습니다.',
        ],

        // Image generation form.
        ['内容与风格', 'Content & Style', '内容とスタイル', '콘텐츠 및 스타일'],
        ['图片类型', 'Image type', '画像タイプ', '이미지 유형'],
        ['请选择图片类型', 'Select an image type', '画像タイプを選択', '이미지 유형 선택'],
        ['UI界面', 'UI screen', 'UI画面', 'UI 화면'],
        ['图标', 'Icon', 'アイコン', '아이콘'],
        ['按钮', 'Button', 'ボタン', '버튼'],
        ['卡片', 'Card', 'カード', '카드'],
        ['导航栏', 'Navigation bar', 'ナビゲーションバー', '내비게이션 바'],
        ['表单', 'Form', 'フォーム', '폼'],
        ['背景图', 'Background', '背景画像', '배경 이미지'],
        ['插画', 'Illustration', 'イラスト', '일러스트'],
        ['设计风格', 'Design style', 'デザインスタイル', '디자인 스타일'],
        ['请选择设计风格', 'Select a design style', 'デザインスタイルを選択', '디자인 스타일 선택'],
        ['现代简约', 'Modern minimal', 'モダン・ミニマル', '모던 미니멀'],
        ['磨砂玻璃', 'Frosted glass', 'すりガラス', '프로스트 글라스'],
        ['像素风格', 'Pixel art', 'ピクセルアート', '픽셀 아트'],
        ['渐变色彩', 'Color gradient', 'カラーグラデーション', '컬러 그라데이션'],
        ['暗黑模式', 'Dark mode', 'ダークモード', '다크 모드'],
        ['霓虹灯', 'Neon', 'ネオン', '네온'],
        ['扁平化', 'Flat design', 'フラットデザイン', '플랫 디자인'],
        ['拟物化', 'Skeuomorphic', 'スキューモーフィック', '스큐어모픽'],
        ['配色方案', 'Color scheme', '配色', '색상 구성'],
        ['请选择配色方案', 'Select a color scheme', '配色を選択', '색상 구성 선택'],
        ['蓝绿色系', 'Blue & teal', '青・ティール系', '블루·틸 계열'],
        ['紫色系', 'Purple', '紫系', '퍼플 계열'],
        ['暖色调', 'Warm', '暖色', '웜 톤'],
        ['冷色调', 'Cool', '寒色', '쿨 톤'],
        ['单色系', 'Monochrome', '単色', '모노크롬'],
        ['对比色', 'Contrasting', '補色', '대비 색상'],
        ['彩虹色', 'Rainbow', 'レインボー', '레인보우'],
        ['黑白灰', 'Black, white & gray', '白黒・グレー', '흑백·회색'],
        ['图片尺寸', 'Image size', '画像サイズ', '이미지 크기'],
        ['请选择图片尺寸', 'Select an image size', '画像サイズを選択', '이미지 크기 선택'],
        ['256×256 小图标', '256×256 Small icon', '256×256 小アイコン', '256×256 작은 아이콘'],
        ['512×512 标准', '512×512 Standard', '512×512 標準', '512×512 표준'],
        ['1024×1024 高清', '1024×1024 HD', '1024×1024 高精細', '1024×1024 고해상도'],
        ['1024×1792 竖屏', '1024×1792 Portrait', '1024×1792 縦長', '1024×1792 세로형'],
        ['1792×1024 横屏', '1792×1024 Landscape', '1792×1024 横長', '1792×1024 가로형'],
        ['API 服务商', 'API provider', 'APIプロバイダー', 'API 제공업체'],
        ['请选择API服务商', 'Select an API provider', 'APIプロバイダーを選択', 'API 제공업체 선택'],
        ['即梦 Seedream 4.0 (推荐)', 'Seedream 4.0 (Recommended)', 'Seedream 4.0（推奨）', 'Seedream 4.0(권장)'],
        [
            '腾讯云文生图',
            'Tencent Cloud Text-to-Image',
            'Tencent Cloud テキスト画像生成',
            'Tencent Cloud 텍스트 이미지 생성',
        ],
        ['阿里云通义万相', 'Alibaba Cloud Wanxiang', 'Alibaba Cloud 通義万相', 'Alibaba Cloud 통이완샹'],
        ['免费图片 (仅管理员)', 'Free image (Admins only)', '無料画像（管理者のみ）', '무료 이미지(관리자 전용)'],
        ['模拟图片 (仅管理员)', 'Mock image (Admins only)', 'モック画像（管理者のみ）', '모의 이미지(관리자 전용)'],
        ['wanx-v1 标准', 'wanx-v1 Standard', 'wanx-v1 標準', 'wanx-v1 표준'],
        ['wanx2.0 快速', 'wanx2.0 Fast', 'wanx2.0 高速', 'wanx2.0 빠름'],
        ['wanx2.1 最新', 'wanx2.1 Latest', 'wanx2.1 最新', 'wanx2.1 최신'],
        ['生成方式', 'Generation method', '生成方法', '생성 방식'],
        ['生成模式', 'Generation mode', '生成モード', '생성 모드'],
        ['文生图', 'Text to image', 'テキストから画像', '텍스트→이미지'],
        ['线稿/草图 → 成品图', 'Sketch → Finished image', '線画・ラフ → 完成画像', '선화·스케치 → 완성 이미지'],
        ['风格迁移', 'Style transfer', 'スタイル変換', '스타일 변환'],
        ['图片放大', 'Upscale image', '画像を拡大', '이미지 확대'],
        ['背景去除', 'Remove background', '背景を削除', '배경 제거'],
        ['上传线稿或草图', 'Upload line art or sketch', '線画またはラフをアップロード', '선화 또는 스케치 업로드'],
        ['(支持 JPG/PNG/WebP)', '(JPG/PNG/WebP supported)', '（JPG/PNG/WebP対応）', '(JPG/PNG/WebP 지원)'],
        ['生成自由度', 'Creative freedom', '生成の自由度', '생성 자유도'],
        [
            '（越小越贴近线稿）',
            '(Lower stays closer to the sketch)',
            '（低いほど線画に忠実）',
            '(낮을수록 선화에 가까움)',
        ],
        ['内容图', 'Content image', '内容画像', '콘텐츠 이미지'],
        [
            '(将应用风格的原始图片)',
            '(Original image to restyle)',
            '（スタイルを適用する元画像）',
            '(스타일을 적용할 원본 이미지)',
        ],
        ['风格参考图', 'Style reference', 'スタイル参照画像', '스타일 참조 이미지'],
        [
            '(提供艺术风格的图片)',
            '(Image providing the art style)',
            '（アートスタイルの参照画像）',
            '(아트 스타일을 제공하는 이미지)',
        ],
        ['风格强度', 'Style strength', 'スタイル強度', '스타일 강도'],
        [
            '（越大风格越明显）',
            '(Higher makes the style stronger)',
            '（高いほどスタイルが強くなります）',
            '(높을수록 스타일이 강해짐)',
        ],
        ['上传源图片', 'Upload source image', '元画像をアップロード', '원본 이미지 업로드'],
        [
            '(需要放大的低分辨率图片)',
            '(Low-resolution image to upscale)',
            '（拡大する低解像度画像）',
            '(확대할 저해상도 이미지)',
        ],
        ['放大倍数', 'Upscale factor', '拡大倍率', '확대 배율'],
        ['2x 放大', 'Upscale 2x', '2倍に拡大', '2배 확대'],
        ['4x 放大', 'Upscale 4x', '4倍に拡大', '4배 확대'],
        [
            '(需要去除背景的图片)',
            '(Image whose background will be removed)',
            '（背景を削除する画像）',
            '(배경을 제거할 이미지)',
        ],
        ['描述与生成', 'Description & Generation', '説明と生成', '설명 및 생성'],
        ['Prompt 模式', 'Prompt mode', 'プロンプトモード', '프롬프트 모드'],
        ['个性需求描述', 'Custom description', 'カスタム要望', '맞춤 요구 설명'],
        ['专业 UI 生成 Prompt', 'Professional UI prompt', 'プロ向けUI生成プロンプト', '전문 UI 생성 프롬프트'],
        ['qwen-turbo 快速', 'qwen-turbo Fast', 'qwen-turbo 高速', 'qwen-turbo 빠름'],
        ['qwen-plus 均衡', 'qwen-plus Balanced', 'qwen-plus バランス', 'qwen-plus 균형'],
        ['qwen-max 最强', 'qwen-max Best quality', 'qwen-max 最高品質', 'qwen-max 최고 품질'],
        ['详细描述', 'Detailed description', '詳細説明', '상세 설명'],
        [
            'AI 优化后的专业 Prompt',
            'AI-optimized professional prompt',
            'AIで最適化したプロンプト',
            'AI 최적화 전문 프롬프트',
        ],
        ['（可手动编辑）', '(Editable)', '（手動編集可）', '(직접 편집 가능)'],
        ['重新生成 Prompt', 'Regenerate prompt', 'プロンプトを再生成', '프롬프트 다시 생성'],
        ['确认并生成图片', 'Confirm and generate image', '確認して画像を生成', '확인 후 이미지 생성'],
        ['游戏 UI 模板', 'Game UI templates', 'ゲームUIテンプレート', '게임 UI 템플릿'],
        [
            '(点击分类展开，选择模板自动填入 prompt)',
            '(Expand a category and select a template to fill the prompt)',
            '（カテゴリを開き、テンプレートを選ぶとプロンプトへ自動入力）',
            '(카테고리를 펼쳐 템플릿을 선택하면 프롬프트가 자동 입력됩니다)',
        ],
        ['生成数量', 'Number of images', '生成枚数', '생성 수량'],
        ['开始生成图片', 'Generate image', '画像を生成', '이미지 생성 시작'],
        ['生成专业 Prompt', 'Generate professional prompt', 'プロ向けプロンプトを生成', '전문 프롬프트 생성'],
        ['生成中...', 'Generating...', '生成中...', '생성 중...'],
        ['请选择', 'Select', '選択してください', '선택하세요'],
        ['下拉选择', 'Open options', '選択肢を開く', '옵션 열기'],
        [
            '与上方「设计风格」会合并进同一条',
            'This is merged with Design Style above into the same',
            '上の「デザインスタイル」と同じ',
            '위 ‘디자인 스타일’과 같은',
        ],
        [
            '，图片将送至通义多模态。',
            ', and the image is sent to Qwen-VL.',
            '。画像はQwen-VLへ送信されます。',
            '이며 이미지는 Qwen-VL로 전송됩니다.',
        ],
        [
            '风格迁移效果取决于所选 AI 服务商。系统将使用内容图作为基础，结合风格参考图的艺术特征生成新图片。',
            'Style-transfer quality depends on the provider. The content image is combined with the artistic traits of the style reference.',
            'スタイル変換の品質はプロバイダーによって異なります。内容画像を基に、参照画像の表現を組み合わせて新しい画像を生成します。',
            '스타일 변환 결과는 제공업체에 따라 달라집니다. 콘텐츠 이미지를 바탕으로 스타일 참조 이미지의 예술적 특징을 결합합니다.',
        ],
        [
            '图片放大效果取决于 AI 服务商，建议使用即梦以获得最佳效果。',
            'Upscaling quality depends on the provider. Seedream is recommended for best results.',
            '拡大品質はプロバイダーによって異なります。最良の結果にはSeedreamを推奨します。',
            '확대 품질은 제공업체에 따라 달라집니다. 최상의 결과에는 Seedream을 권장합니다.',
        ],
        [
            '输出为透明背景 PNG。效果取决于 AI 服务商，建议使用即梦以获得最佳抠图效果。',
            'Outputs a transparent PNG. Quality depends on the provider; Seedream is recommended.',
            '透明背景PNGとして出力します。品質はプロバイダーによって異なり、Seedreamを推奨します。',
            '투명 배경 PNG로 출력합니다. 품질은 제공업체에 따라 달라지며 Seedream을 권장합니다.',
        ],

        // Template groups and cards.
        ['RPG 血条与状态栏', 'RPG health & status bars', 'RPG HP・ステータスバー', 'RPG 체력·상태 표시줄'],
        [
            '3 个模板 · 点击展开',
            '3 templates · Click to expand',
            '3テンプレート・クリックして展開',
            '템플릿 3개 · 클릭하여 펼치기',
        ],
        ['血条', 'Health bar', 'HPバー', '체력 바'],
        ['魔法条', 'Mana bar', 'MPバー', '마나 바'],
        ['状态面板', 'Status panel', 'ステータスパネル', '상태 패널'],
        ['背包系统', 'Inventory system', 'インベントリ', '인벤토리 시스템'],
        ['物品槽', 'Item slot', 'アイテムスロット', '아이템 슬롯'],
        ['背包图标', 'Inventory icon', 'バッグアイコン', '가방 아이콘'],
        ['物品网格', 'Item grid', 'アイテムグリッド', '아이템 그리드'],
        ['游戏按钮', 'Game buttons', 'ゲームボタン', '게임 버튼'],
        ['主按钮', 'Primary button', 'メインボタン', '기본 버튼'],
        ['禁用按钮', 'Disabled button', '無効ボタン', '비활성 버튼'],
        ['圆形图标按钮', 'Round icon button', '丸型アイコンボタン', '원형 아이콘 버튼'],
        ['小地图', 'Minimap', 'ミニマップ', '미니맵'],
        ['地图边框', 'Map frame', 'マップ枠', '지도 테두리'],
        ['指南针', 'Compass', 'コンパス', '나침반'],
        ['战争迷雾', 'Fog of war', '戦場の霧', '전장의 안개'],
        ['对话框', 'Dialogue box', '会話ウィンドウ', '대화 상자'],
        ['对话框体', 'Dialogue panel', '会話パネル', '대화 패널'],
        ['头像框', 'Portrait frame', '顔アイコン枠', '초상화 프레임'],
        ['选项按钮', 'Choice button', '選択肢ボタン', '선택지 버튼'],
        ['游戏图标', 'Game icons', 'ゲームアイコン', '게임 아이콘'],
        ['武器图标', 'Weapon icon', '武器アイコン', '무기 아이콘'],
        ['药水图标', 'Potion icon', 'ポーションアイコン', '물약 아이콘'],
        ['盾牌图标', 'Shield icon', '盾アイコン', '방패 아이콘'],

        // Character action group.
        ['三视图', 'Three-view sheet', '三面図', '삼면도'],
        ['动作帧', 'Action frames', 'アクションフレーム', '동작 프레임'],
        [
            '草图与三视图（图生图 · 即梦 Seedream）',
            'Sketch & three-view sheet (Image-to-image · Seedream)',
            'ラフと三面図（画像変換・Seedream）',
            '스케치 및 삼면도(이미지 변환 · Seedream)',
        ],
        ['角色线稿 / 草图', 'Character line art / sketch', 'キャラクター線画・ラフ', '캐릭터 선화 / 스케치'],
        ['三视图预设', 'Three-view preset', '三面図プリセット', '삼면도 프리셋'],
        [
            '像素风 · 横板三视图',
            'Pixel art · Side-scroller views',
            'ピクセル・横スクロール三面図',
            '픽셀 · 횡스크롤 삼면도',
        ],
        [
            '游戏立绘 · 三视图参考',
            'Game character art · Three-view reference',
            'ゲーム立ち絵・三面図参照',
            '게임 일러스트 · 삼면도 참조',
        ],
        ['简约 · 三视图', 'Minimal · Three-view', 'シンプル・三面図', '미니멀 · 삼면도'],
        [
            '仅使用下方附加提示词',
            'Use only the additional prompt below',
            '下の追加プロンプトのみ使用',
            '아래 추가 프롬프트만 사용',
        ],
        ['三视图输出尺寸', 'Three-view output size', '三面図の出力サイズ', '삼면도 출력 크기'],
        ['1024×1024（方图）', '1024×1024 (Square)', '1024×1024（正方形）', '1024×1024(정사각형)'],
        ['1280×720（横版）', '1280×720 (Landscape)', '1280×720（横長）', '1280×720(가로형)'],
        ['1536×640（横板三格）', '1536×640 (Three horizontal panels)', '1536×640（横3分割）', '1536×640(가로 3분할)'],
        ['图生图强度', 'Image-to-image strength', '画像変換の強度', '이미지 변환 강도'],
        [
            '三视图附加提示词（可选）',
            'Additional three-view prompt (optional)',
            '三面図の追加プロンプト（任意）',
            '삼면도 추가 프롬프트(선택)',
        ],
        ['生成三视图', 'Generate three-view sheet', '三面図を生成', '삼면도 생성'],
        [
            '正在请求 Seedream 图生图…',
            'Requesting Seedream image-to-image...',
            'Seedream画像変換をリクエスト中…',
            'Seedream 이미지 변환 요청 중…',
        ],
        [
            '三视图结果（供后续动作组参考）',
            'Three-view result (reference for action frames)',
            '三面図結果（アクション生成の参照）',
            '삼면도 결과(후속 동작 생성 참조)',
        ],
        ['下载三视图 PNG', 'Download three-view PNG', '三面図PNGをダウンロード', '삼면도 PNG 다운로드'],
        ['打包三视图 ZIP', 'Download three-view ZIP', '三面図ZIPをダウンロード', '삼면도 ZIP 다운로드'],
        ['保存到素材库', 'Save to asset library', 'アセットへ保存', '에셋 라이브러리에 저장'],
        ['角色与动作配置', 'Character & action settings', 'キャラクターとアクション設定', '캐릭터 및 동작 설정'],
        [
            '人物动作详细提示词（与下方动作类型二选一）',
            'Detailed action prompt (choose this or action types below)',
            'アクション詳細プロンプト（下の種類とどちらか一方）',
            '상세 동작 프롬프트(아래 동작 유형과 택일)',
        ],
        [
            '动作组画风 / 规范预设',
            'Action style / specification preset',
            'アクションの画風・仕様プリセット',
            '동작 스타일 / 규격 프리셋',
        ],
        [
            '像素 + Q版精灵（推荐）',
            'Pixel + chibi sprite (Recommended)',
            'ピクセル＋ちびスプライト（推奨）',
            '픽셀 + 치비 스프라이트(권장)',
        ],
        ['像素 + 略高细节', 'Pixel + more detail', 'ピクセル＋高ディテール', '픽셀 + 높은 디테일'],
        ['扁平 2D 游戏立绘', 'Flat 2D game character', 'フラット2Dゲーム立ち絵', '플랫 2D 게임 일러스트'],
        [
            '不追加（仅用上方造型描述）',
            'No addition (use description above only)',
            '追加なし（上の造形説明のみ）',
            '추가 안 함(위 외형 설명만 사용)',
        ],
        ['动作类型（可多选）', 'Action types (multiple)', 'アクション種類（複数選択可）', '동작 유형(복수 선택)'],
        ['待机', 'Idle', '待機', '대기'],
        ['跑', 'Run', '走る', '달리기'],
        ['跳', 'Jump', 'ジャンプ', '점프'],
        ['攻击', 'Attack', '攻撃', '공격'],
        ['每动作帧数', 'Frames per action', 'アクションごとのフレーム数', '동작당 프레임 수'],
        ['2 帧', '2 frames', '2フレーム', '2 프레임'],
        ['4 帧', '4 frames', '4フレーム', '4 프레임'],
        ['8 帧', '8 frames', '8フレーム', '8 프레임'],
        ['单帧尺寸', 'Frame size', 'フレームサイズ', '프레임 크기'],
        [
            '即梦 Seedream（火山方舟 API）',
            'Seedream (Volcengine Ark API)',
            'Seedream（Volcengine Ark API）',
            'Seedream(Volcengine Ark API)',
        ],
        ['配置', 'settings', '設定', '설정'],
        ['批量生成动作组', 'Generate action group', 'アクションを一括生成', '동작 그룹 일괄 생성'],
        ['正在生成 0/0 …', 'Generating 0/0...', '生成中 0/0…', '생성 중 0/0…'],
        ['预览与导出', 'Preview & Export', 'プレビューと書き出し', '미리보기 및 내보내기'],
        [
            '动作组预览与导出',
            'Action preview & export',
            'アクションのプレビューと書き出し',
            '동작 미리보기 및 내보내기',
        ],
        ['导出为', 'Export as', '書き出し形式', '내보내기 형식'],
        ['ZIP 按动作', 'ZIP by action', 'ZIP（アクション別）', 'ZIP 동작별'],
        ['ZIP 按帧', 'ZIP by frame', 'ZIP（フレーム別）', 'ZIP 프레임별'],
        [
            'Spritesheet → 素材库',
            'Spritesheet → Asset library',
            'スプライトシート → アセット',
            '스프라이트시트 → 에셋 라이브러리',
        ],
        ['全部帧 → 素材库', 'All frames → Asset library', '全フレーム → アセット', '모든 프레임 → 에셋 라이브러리'],
        [
            'Spine / Unity 导入说明',
            'Spine / Unity import guide',
            'Spine / Unity インポートガイド',
            'Spine / Unity 가져오기 안내',
        ],
        [
            '上传角色线稿 / 草图，按三视图预设 + 尺寸 + 强度生成',
            'Upload character line art or a sketch and generate a',
            'キャラクター線画・ラフをアップロードし、プリセット・サイズ・強度から',
            '캐릭터 선화 또는 스케치를 업로드하고 프리셋·크기·강도로',
        ],
        [
            '；再结合角色提示词与动作组规范，批量生成',
            '; then combine the character prompt and action specification to generate',
            'を生成します。続いてキャラクタープロンプトとアクション仕様から',
            '를 생성합니다. 이어서 캐릭터 프롬프트와 동작 규격을 결합해',
        ],
        [
            '并导出精灵图 / ZIP。当前人物动作组仅使用',
            'and export a spritesheet / ZIP. Character actions currently use',
            'を一括生成し、スプライトシート／ZIPへ書き出します。現在は',
            '을 일괄 생성하고 스프라이트시트 / ZIP으로 내보냅니다. 현재는',
        ],
        [
            '白底黑线或清晰草图均可；将用于图生图生成「正面 / 侧面 / 背面」三视图参考图。',
            'Use clean black line art on white or a clear sketch. It will generate front, side, and back reference views.',
            '白地の黒線画または鮮明なラフを使用できます。正面・側面・背面の参照三面図を生成します。',
            '흰 배경의 검은 선화 또는 선명한 스케치를 사용할 수 있으며 정면·측면·후면 삼면도를 생성합니다.',
        ],
        [
            '即梦最小像素要求为 921600，已自动过滤不支持尺寸。',
            'Seedream requires at least 921,600 pixels; unsupported sizes are hidden automatically.',
            'Seedreamは921,600ピクセル以上が必要です。非対応サイズは自動で除外されます。',
            'Seedream은 최소 921,600픽셀이 필요하며 지원하지 않는 크기는 자동으로 제외됩니다.',
        ],
        [
            '与「动作类型（可多选）」互斥：二者只能使用一个，避免动作控制冲突。',
            'Mutually exclusive with Action Types: use only one to avoid conflicting action controls.',
            '「アクション種類」とは同時に使えません。競合を避けるため、どちらか一方を使用してください。',
            '‘동작 유형’과 동시에 사용할 수 없습니다. 동작 제어 충돌을 피하려면 하나만 사용하세요.',
        ],
        [
            '会追加到每一帧提示词前部，并与三视图设定一起用于 Seedream 生成。',
            'Prepended to every frame prompt and combined with the three-view settings for Seedream.',
            '各フレームのプロンプト先頭へ追加し、三面図設定と共にSeedreamで使用します。',
            '각 프레임 프롬프트 앞에 추가되며 삼면도 설정과 함께 Seedream 생성에 사용됩니다.',
        ],
        [
            '低于 921600 像素会被即梦拒绝。',
            'Seedream rejects images below 921,600 pixels.',
            '921,600ピクセル未満はSeedreamで拒否されます。',
            '921,600픽셀 미만은 Seedream에서 거부됩니다.',
        ],
        [
            '动作组仅使用即梦。请在',
            'Action groups use Seedream only. Configure it in',
            'アクション生成はSeedreamのみ対応しています。',
            '동작 그룹은 Seedream만 사용합니다.',
        ],
        [
            '并重启后端。',
            'and restart the backend.',
            'で設定し、バックエンドを再起動してください。',
            '에서 설정하고 백엔드를 다시 시작하세요.',
        ],

        // Tool titles and placeholders.
        ['移动 (V)', 'Move (V)', '移動 (V)', '이동 (V)'],
        ['画笔 (B)', 'Brush (B)', 'ブラシ (B)', '브러시 (B)'],
        ['橡皮擦 (E)', 'Eraser (E)', '消しゴム (E)', '지우개 (E)'],
        ['矩形选区 (M)', 'Rectangular selection (M)', '矩形選択 (M)', '사각형 선택 (M)'],
        ['油漆桶 (G)', 'Fill (G)', '塗りつぶし (G)', '채우기 (G)'],
        ['吸管 (I)', 'Eyedropper (I)', 'スポイト (I)', '스포이드 (I)'],
        ['画笔大小', 'Brush size', 'ブラシサイズ', '브러시 크기'],
        ['不透明度', 'Opacity', '不透明度', '불투명도'],
        ['填充容差', 'Fill tolerance', '塗りつぶし許容値', '채우기 허용 오차'],
        ['前景色', 'Foreground color', '描画色', '전경색'],
        ['撤销 (Ctrl+Z)', 'Undo (Ctrl+Z)', '元に戻す (Ctrl+Z)', '실행 취소 (Ctrl+Z)'],
        ['重做 (Ctrl+Y)', 'Redo (Ctrl+Y)', 'やり直す (Ctrl+Y)', '다시 실행 (Ctrl+Y)'],
        ['放大', 'Zoom in', '拡大', '확대'],
        ['缩小', 'Zoom out', '縮小', '축소'],
        ['适应画布', 'Fit canvas', 'キャンバスに合わせる', '캔버스에 맞춤'],
        ['重置', 'Reset', 'リセット', '초기화'],
        ['关闭', 'Close', '閉じる', '닫기'],
        ['图片预览', 'Image preview', '画像プレビュー', '이미지 미리보기'],
        ['选择万相模型', 'Select Wanxiang model', '万相モデルを選択', '완샹 모델 선택'],
        ['选择千问模型', 'Select Qwen model', 'Qwenモデルを選択', 'Qwen 모델 선택'],
        ['多模态模型', 'Multimodal model', 'マルチモーダルモデル', '멀티모달 모델'],
        ['预设参考图', 'Preset reference image', 'プリセット参照画像', '프리셋 참조 이미지'],
        [
            '例：把背景换成星空，保留角色不变',
            'Example: Replace the background with a starry sky and keep the character',
            '例：キャラクターはそのままに、背景を星空へ変更',
            '예: 캐릭터는 유지하고 배경을 별이 빛나는 하늘로 변경',
        ],
        [
            '请描述画面内容、风格、颜色、构图等；线稿模式下可描述希望的上色或成图效果。',
            'Describe the content, style, colors, and composition. In sketch mode, describe the desired coloring or final result.',
            '内容、スタイル、色、構図などを説明してください。線画モードでは希望する彩色や完成イメージを入力できます。',
            '화면 내용, 스타일, 색상, 구도 등을 설명하세요. 선화 모드에서는 원하는 채색 또는 완성 효과를 설명할 수 있습니다.',
        ],
        [
            '点击下方按钮生成专业 Prompt...',
            'Use the button below to generate a professional prompt...',
            '下のボタンでプロ向けプロンプトを生成...',
            '아래 버튼을 눌러 전문 프롬프트 생성...',
        ],
        [
            '例如：古风襦裙、双马尾、手持木剑等（会与上方预设及角色造型合并）',
            'Example: traditional dress, twin tails, wooden sword (merged with the preset and character design)',
            '例：古風の衣装、ツインテール、木刀など（プリセットとキャラクター造形へ統合）',
            '예: 전통 의상, 양갈래 머리, 목검 등(프리셋 및 캐릭터 외형과 결합)',
        ],
        [
            '例：连续出拳并前冲，重心前倾，双臂摆动明显，动作连贯。填写后将锁定动作类型多选。',
            'Example: Punch repeatedly while moving forward, leaning in with clear arm movement. Entering this locks action-type selection.',
            '例：連続パンチしながら前進。重心を前に、腕を大きく振り、動きを滑らかに。入力すると種類の複数選択は無効になります。',
            '예: 연속으로 주먹을 내지르며 전진하고, 무게중심을 앞으로 두며 양팔을 크게 움직입니다. 입력하면 동작 유형 다중 선택이 잠깁니다.',
        ],
        [
            '越低越贴近草图轮廓',
            'Lower follows the sketch more closely',
            '低いほどラフの輪郭に忠実',
            '낮을수록 스케치 윤곽에 가까움',
        ],
        [
            '将三视图保存到素材库，可在「资产微调」中打开编辑',
            'Save the three-view sheet to the library for editing in Asset Editor',
            '三面図をアセットへ保存し、「アセット微調整」で編集できます',
            '삼면도를 에셋 라이브러리에 저장하고 ‘에셋 미세 조정’에서 편집할 수 있습니다',
        ],
        [
            '适用于 Unity、Godot 的 2D Spritesheet/Animation 工作流',
            'For Unity and Godot 2D spritesheet/animation workflows',
            'Unity・Godotの2Dスプライトシート／アニメーション向け',
            'Unity·Godot 2D 스프라이트시트/애니메이션 워크플로용',
        ],
        [
            '适用于自研工具链、Unity/Godot 导入脚本读取元数据',
            'For custom pipelines and Unity/Godot import scripts with metadata',
            '独自ツールチェーンやUnity/Godotのメタデータ読込向け',
            '자체 도구 체인 및 Unity/Godot 메타데이터 가져오기용',
        ],
        [
            '适用于 Unity、Godot、Cocos 按动作目录批量导入',
            'For importing action folders into Unity, Godot, or Cocos',
            'Unity・Godot・Cocosへアクション別に一括インポート',
            'Unity·Godot·Cocos 동작 폴더 일괄 가져오기용',
        ],
        [
            '适用于通用引擎与 DCC 工具逐帧检查/导入（Unity、Godot、Spine）',
            'For frame-by-frame review/import in engines and DCC tools',
            '汎用エンジンやDCCツールでのフレーム確認・読込向け',
            '범용 엔진 및 DCC 도구의 프레임별 검토/가져오기용',
        ],
        [
            '将拼合的 Spritesheet 保存到素材库',
            'Save the assembled spritesheet to the asset library',
            '結合したスプライトシートをアセットへ保存',
            '결합된 스프라이트시트를 에셋 라이브러리에 저장',
        ],
        [
            '将所有动作帧逐张保存到素材库',
            'Save every action frame to the asset library',
            '全アクションフレームを個別にアセットへ保存',
            '모든 동작 프레임을 에셋 라이브러리에 개별 저장',
        ],
    ];

    const TRADITIONAL_CHARS = {
        图: '圖',
        风: '風',
        选: '選',
        择: '擇',
        设: '設',
        计: '計',
        颜: '顏',
        色: '色',
        类: '類',
        页: '頁',
        栏: '欄',
        单: '單',
        导: '導',
        览: '覽',
        插: '插',
        画: '畫',
        现: '現',
        简: '簡',
        约: '約',
        渐: '漸',
        变: '變',
        拟: '擬',
        配: '配',
        调: '調',
        对: '對',
        标: '標',
        准: '準',
        竖: '豎',
        屏: '屏',
        横: '橫',
        云: '雲',
        仅: '僅',
        务: '務',
        商: '商',
        线: '線',
        稿: '稿',
        成: '成',
        品: '品',
        迁: '遷',
        移: '移',
        扩: '擴',
        除: '除',
        传: '傳',
        支: '支',
        持: '持',
        张: '張',
        应: '應',
        用: '用',
        强: '強',
        显: '顯',
        缩: '縮',
        参: '參',
        压: '壓',
        详: '詳',
        优: '優',
        戏: '戲',
        击: '擊',
        数: '數',
        组: '組',
        动: '動',
        帧: '幀',
        与: '與',
        输: '輸',
        寸: '寸',
        结: '結',
        果: '果',
        将: '將',
        这: '這',
        里: '裡',
        资: '資',
        产: '產',
        暂: '暫',
        无: '無',
        填: '填',
        项: '項',
        库: '庫',
        词: '詞',
        额: '額',
        预: '預',
        则: '則',
        开: '開',
        关: '關',
        复: '復',
        制: '製',
        删: '刪',
        当: '當',
        编: '編',
        辑: '輯',
        储: '儲',
        称: '稱',
        载: '載',
        写: '寫',
        实: '實',
        态: '態',
        从: '從',
        后: '後',
        术: '術',
        并: '並',
        块: '塊',
        为: '為',
        启: '啟',
        闭: '閉',
        毕: '畢',
        圆: '圓',
        药: '藥',
        战: '戰',
        话: '話',
        边: '邊',
        发: '發',
        质: '質',
        轻: '輕',
        过: '過',
        滤: '濾',
        细: '細',
        统: '統',
        请: '請',
        试: '試',
        误: '誤',
        确: '確',
        认: '認',
        该: '該',
        获: '獲',
        取: '取',
        创: '創',
        帐: '帳',
        户: '戶',
        档: '檔',
    };

    const copy = new Map(ROWS.map((row) => [row[0], row]));
    const textSources = new WeakMap();
    const attributeSources = new WeakMap();
    let translating = false;
    let observer = null;

    function language() {
        return window.i18n && typeof window.i18n.getLanguage === 'function' ? window.i18n.getLanguage() : 'zh';
    }

    function toTraditional(value) {
        return Array.from(value)
            .map((char) => TRADITIONAL_CHARS[char] || char)
            .join('');
    }

    function translate(source) {
        const lang = language();
        if (lang === 'zh') return source;
        if (lang === 'zht') return toTraditional(source);
        const row = copy.get(source);
        if (!row) return source;
        return row[{ en: 1, ja: 2, ko: 3 }[lang]] || source;
    }

    function translateTextNode(node) {
        const raw = node.nodeValue || '';
        const trimmed = raw.trim();
        if (!trimmed) return;
        const source = textSources.get(node) || trimmed;
        if (!copy.has(source)) return;
        textSources.set(node, source);
        const next = translate(source);
        node.nodeValue = raw.replace(trimmed, next);
    }

    function translateAttributes(element) {
        const names = ['placeholder', 'title', 'aria-label', 'alt'];
        let sources = attributeSources.get(element);
        if (!sources) {
            sources = {};
            attributeSources.set(element, sources);
        }
        names.forEach((name) => {
            const current = element.getAttribute && element.getAttribute(name);
            if (!current) return;
            const trimmed = current.trim();
            let source = sources[name] || trimmed;
            if (copy.has(trimmed) && trimmed !== translate(source)) {
                source = trimmed;
            }
            if (!copy.has(source)) return;
            sources[name] = source;
            const next = translate(source);
            if (current !== next) element.setAttribute(name, next);
        });
    }

    function apply(root) {
        if (translating || !root) return;
        translating = true;
        try {
            if (root.nodeType === Node.TEXT_NODE) {
                translateTextNode(root);
                return;
            }
            if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
            if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            let node = walker.nextNode();
            while (node) {
                if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
                else translateAttributes(node);
                node = walker.nextNode();
            }
        } finally {
            translating = false;
        }
    }

    function start() {
        apply(document.body);
        observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach(apply);
                if (mutation.type === 'attributes') translateAttributes(mutation.target);
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'],
        });
    }

    window.aiGeneratorTranslate = translate;
    window.aiGeneratorApplyTranslations = () => apply(document.body);
    window.addEventListener('languageChanged', () => {
        requestAnimationFrame(() => apply(document.body));
    });
    window.addEventListener('beforeunload', () => observer && observer.disconnect());

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
