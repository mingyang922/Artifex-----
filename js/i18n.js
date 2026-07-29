/**
 * Artifex i18n - 多语言支持
 */
'use strict';

const LANGUAGES = {
    zh: { name: '简体中文', flag: '\u{1F1E8}\u{1F1F3}' },
    zht: { name: '繁體中文', flag: '\u{1F1F9}\u{1F1FC}' },
    en: { name: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
    ja: { name: '日本語', flag: '\u{1F1EF}\u{1F1F5}' },
    ko: { name: '한국어', flag: '\u{1F1F0}\u{1F1F7}' },
};

// Translation dictionary - only translate UI chrome, not user content
const TRANSLATIONS = {
    // Navigation
    'nav.home': { zh: '主页', zht: '主頁', en: 'Home', ja: 'ホーム', ko: '홈' },
    'nav.projects': { zh: '项目管理', zht: '專案管理', en: 'Projects', ja: 'プロジェクト', ko: '프로젝트' },
    'nav.ai': { zh: 'AI 生成', zht: 'AI 生成', en: 'AI Generate', ja: 'AI生成', ko: 'AI 생성' },
    'nav.assets': { zh: '素材库', zht: '素材庫', en: 'Assets', ja: 'アセット', ko: '에셋' },
    'nav.presets': { zh: '风格预设', zht: '風格預設', en: 'Presets', ja: 'プリセット', ko: '프리셋' },
    'nav.account': { zh: '账户', zht: '帳戶', en: 'Account', ja: 'アカウント', ko: '계정' },
    'nav.admin': { zh: '管理面板', zht: '管理面板', en: 'Admin', ja: '管理者', ko: '관리자' },

    // Common
    'common.search': { zh: '搜索', zht: '搜尋', en: 'Search', ja: '検索', ko: '검색' },
    'common.save': { zh: '保存', zht: '儲存', en: 'Save', ja: '保存', ko: '저장' },
    'common.cancel': { zh: '取消', zht: '取消', en: 'Cancel', ja: 'キャンセル', ko: '취소' },
    'common.delete': { zh: '删除', zht: '刪除', en: 'Delete', ja: '削除', ko: '삭제' },
    'common.edit': { zh: '编辑', zht: '編輯', en: 'Edit', ja: '編集', ko: '편집' },
    'common.create': { zh: '创建', zht: '建立', en: 'Create', ja: '作成', ko: '생성' },
    'common.confirm': { zh: '确认', zht: '確認', en: 'Confirm', ja: '確認', ko: '확인' },
    'common.close': { zh: '关闭', zht: '關閉', en: 'Close', ja: '閉じる', ko: '닫기' },
    'common.back': { zh: '返回', zht: '返回', en: 'Back', ja: '戻る', ko: '뒤로' },
    'common.loading': { zh: '加载中...', zht: '載入中...', en: 'Loading...', ja: '読み込み中...', ko: '로딩 중...' },
    'common.noData': { zh: '暂无数据', zht: '暫無資料', en: 'No data', ja: 'データなし', ko: '데이터 없음' },
    'common.success': { zh: '成功', zht: '成功', en: 'Success', ja: '成功', ko: '성공' },
    'common.error': { zh: '错误', zht: '錯誤', en: 'Error', ja: 'エラー', ko: '오류' },
    'common.select': { zh: '请选择', zht: '請選擇', en: 'Select', ja: '選択してください', ko: '선택하세요' },
    'common.prompt': { zh: '操作提示', zht: '操作提示', en: 'Notice', ja: 'お知らせ', ko: '알림' },

    // Login
    'login.welcome': {
        zh: '欢迎回来，开发者',
        zht: '歡迎回來，開發者',
        en: 'Welcome back, Developer',
        ja: 'おかえりなさい、開発者様',
        ko: '돌아오셨습니다, 개발자님',
    },
    'login.subtitle': {
        zh: '登录您的账户继续创建游戏UI资产',
        zht: '登入您的帳戶繼續建立遊戲UI資產',
        en: 'Sign in to continue creating game UI assets',
        ja: 'ゲームUIアセットの作成を続けるにはサインインしてください',
        ko: '게임 UI 에셋 제작을 계속하려면 로그인하세요',
    },
    'login.email': { zh: '邮箱地址', zht: '電子郵件地址', en: 'Email', ja: 'メールアドレス', ko: '이메일' },
    'login.password': { zh: '密码', zht: '密碼', en: 'Password', ja: 'パスワード', ko: '비밀번호' },
    'login.remember': { zh: '记住我', zht: '記住我', en: 'Remember me', ja: 'ログイン情報を保存', ko: '로그인 유지' },
    'login.forgot': {
        zh: '忘记密码？',
        zht: '忘記密碼？',
        en: 'Forgot password?',
        ja: 'パスワードをお忘れですか？',
        ko: '비밀번호를 잊으셨나요?',
    },
    'login.submit': { zh: '登录账户', zht: '登入帳戶', en: 'Sign In', ja: 'サインイン', ko: '로그인' },
    'login.noAccount': {
        zh: '还没有账户？',
        zht: '還沒有帳戶？',
        en: "Don't have an account?",
        ja: 'アカウントをお持ちでないですか？',
        ko: '계정이 없으신가요?',
    },
    'login.register': { zh: '立即注册', zht: '立即註冊', en: 'Register', ja: '登録', ko: '회원가입' },
    'login.registerTitle': {
        zh: '创建账户',
        zht: '建立帳戶',
        en: 'Create Account',
        ja: '新規アカウント作成',
        ko: '새 계정 만들기',
    },
    'login.registerSubtitle': {
        zh: '注册成为 Artifex 开发者',
        zht: '註冊成為 Artifex 開發者',
        en: 'Register as an Artifex developer',
        ja: 'Artifex開発者として登録',
        ko: 'Artifex 개발자로 등록',
    },
    'login.username': { zh: '用户名', zht: '使用者名稱', en: 'Username', ja: 'ユーザー名', ko: '사용자 이름' },
    'login.confirmPassword': {
        zh: '确认密码',
        zht: '確認密碼',
        en: 'Confirm Password',
        ja: 'パスワード確認',
        ko: '비밀번호 확인',
    },
    'login.showPassword': {
        zh: '显示密码',
        zht: '顯示密碼',
        en: 'Show password',
        ja: 'パスワードを表示',
        ko: '비밀번호 표시',
    },
    'login.setPassword': {
        zh: '设置密码',
        zht: '設定密碼',
        en: 'Set Password',
        ja: 'パスワード設定',
        ko: '비밀번호 설정',
    },
    'login.hasAccount': {
        zh: '已有账户？',
        zht: '已有帳戶？',
        en: 'Already have an account?',
        ja: 'アカウントをお持ちですか？',
        ko: '이미 계정이 있으신가요?',
    },
    'login.loginNow': { zh: '立即登录', zht: '立即登入', en: 'Sign In', ja: 'サインイン', ko: '로그인' },
    'login.agreeTerms': {
        zh: '我同意',
        zht: '我同意',
        en: 'I agree to the',
        ja: '以下に同意します',
        ko: '다음에 동의합니다',
    },
    'login.terms': { zh: '服务条款', zht: '服務條款', en: 'Terms', ja: '利用規約', ko: '이용약관' },
    'login.privacy': {
        zh: '隐私政策',
        zht: '隱私政策',
        en: 'Privacy Policy',
        ja: 'プライバシーポリシー',
        ko: '개인정보처리방침',
    },

    // Dashboard
    'dashboard.welcome': {
        zh: '欢迎回来',
        zht: '歡迎回來',
        en: 'Welcome back',
        ja: 'おかえりなさい',
        ko: '돌아오셨습니다',
    },
    'dashboard.quickTools': {
        zh: '快捷工具',
        zht: '快捷工具',
        en: 'Quick Tools',
        ja: 'クイックツール',
        ko: '빠른 도구',
    },
    'dashboard.recentProjects': {
        zh: '最近项目',
        zht: '最近專案',
        en: 'Recent Projects',
        ja: '最近のプロジェクト',
        ko: '최근 프로젝트',
    },
    'dashboard.newProject': {
        zh: '新建项目',
        zht: '新建專案',
        en: 'New Project',
        ja: '新規プロジェクト',
        ko: '새 프로젝트',
    },
    'dashboard.viewAll': { zh: '查看全部', zht: '檢視全部', en: 'View All', ja: 'すべて表示', ko: '전체 보기' },
    'dashboard.searchPlaceholder': {
        zh: '搜索项目、资产或文档...',
        zht: '搜尋專案、資產或文件...',
        en: 'Search projects, assets or docs...',
        ja: 'プロジェクト、アセット、ドキュメントを検索...',
        ko: '프로젝트, 에셋, 문서 검색...',
    },
    'dashboard.aiGenerate': { zh: 'AI生成', zht: 'AI生成', en: 'AI Generate', ja: 'AI生成', ko: 'AI 생성' },
    'dashboard.aiGenerateDesc': {
        zh: '使用AI自动生成UI资产',
        zht: '使用AI自動生成UI資產',
        en: 'Auto-generate UI assets with AI',
        ja: 'AIでUIアセットを自動生成',
        ko: 'AI로 UI 에셋 자동 생성',
    },
    'dashboard.assetsDesc': {
        zh: '访问游戏UI素材资源',
        zht: '存取遊戲UI素材資源',
        en: 'Access game UI assets',
        ja: 'ゲームUI素材にアクセス',
        ko: '게임 UI 에셋 접근',
    },
    'dashboard.newProjectDesc': {
        zh: '创建全新的UI设计项目',
        zht: '建立全新的UI設計專案',
        en: 'Create a new UI design project',
        ja: '新しいUIデザインプロジェクトを作成',
        ko: '새 UI 디자인 프로젝트 만들기',
    },

    // Project Management
    'pm.createProject': {
        zh: '创建新项目',
        zht: '建立新專案',
        en: 'Create New Project',
        ja: '新規プロジェクト作成',
        ko: '새 프로젝트 만들기',
    },
    'pm.projectName': {
        zh: '项目名称',
        zht: '專案名稱',
        en: 'Project Name',
        ja: 'プロジェクト名',
        ko: '프로젝트 이름',
    },
    'pm.projectDesc': { zh: '项目描述', zht: '專案描述', en: 'Description', ja: 'プロジェクト説明', ko: '설명' },
    'pm.projectType': {
        zh: '项目类型',
        zht: '專案類型',
        en: 'Project Type',
        ja: 'プロジェクトタイプ',
        ko: '프로젝트 유형',
    },
    'pm.empty': {
        zh: '暂无项目，点击上方按钮创建',
        zht: '暫無專案，點擊上方按鈕建立',
        en: 'No projects yet. Click the button above to create one.',
        ja: 'プロジェクトがありません。上のボタンから作成してください。',
        ko: '프로젝트가 없습니다. 위 버튼을 클릭하여 만드세요.',
    },
    'pm.title': {
        zh: '项目管理',
        zht: '專案管理',
        en: 'Project Management',
        ja: 'プロジェクト管理',
        ko: '프로젝트 관리',
    },
    'pm.pageTitle': {
        zh: '项目管理 - Artifex',
        zht: '專案管理 - Artifex',
        en: 'Project Management - Artifex',
        ja: 'プロジェクト管理 - Artifex',
        ko: '프로젝트 관리 - Artifex',
    },
    'pm.sketchToAsset': {
        zh: '从线稿生成',
        zht: '從線稿生成',
        en: 'Generate from Sketch',
        ja: '線画から生成',
        ko: '스케치로 생성',
    },
    'pm.descToAsset': {
        zh: '从描述生成',
        zht: '從描述生成',
        en: 'Generate from Description',
        ja: '説明から生成',
        ko: '설명으로 생성',
    },
    'pm.newProject': { zh: '新建项目', zht: '新建專案', en: 'New Project', ja: '新規プロジェクト', ko: '새 프로젝트' },
    'pm.myProjects': { zh: '我的项目', zht: '我的專案', en: 'My Projects', ja: 'マイプロジェクト', ko: '내 프로젝트' },
    'pm.emptyStart': {
        zh: '暂无项目，点击“新建项目”开始创建',
        zht: '暫無專案，點擊「新建專案」開始建立',
        en: 'No projects yet. Click “New Project” to get started.',
        ja: 'プロジェクトがありません。「新規プロジェクト」から作成してください。',
        ko: '프로젝트가 없습니다. “새 프로젝트”를 눌러 시작하세요.',
    },
    'pm.openCreateAria': {
        zh: '点击打开新建项目表单',
        zht: '點擊開啟新建專案表單',
        en: 'Open the new project form',
        ja: '新規プロジェクトフォームを開く',
        ko: '새 프로젝트 양식 열기',
    },
    'pm.quickTemplates': {
        zh: '快速模板',
        zht: '快速範本',
        en: 'Quick Templates',
        ja: 'クイックテンプレート',
        ko: '빠른 템플릿',
    },
    'pm.blankProject': {
        zh: '空白项目',
        zht: '空白專案',
        en: 'Blank Project',
        ja: '空のプロジェクト',
        ko: '빈 프로젝트',
    },
    'pm.fromScratch': {
        zh: '从零开始',
        zht: '從零開始',
        en: 'Start from scratch',
        ja: 'ゼロから始める',
        ko: '처음부터 시작',
    },
    'pm.tplRpg': { zh: 'RPG 游戏', zht: 'RPG 遊戲', en: 'RPG Game', ja: 'RPGゲーム', ko: 'RPG 게임' },
    'pm.tplRpgDesc': {
        zh: '角色 / 地图 / UI / 道具',
        zht: '角色 / 地圖 / UI / 道具',
        en: 'Characters / Maps / UI / Items',
        ja: 'キャラクター / マップ / UI / アイテム',
        ko: '캐릭터 / 지도 / UI / 아이템',
    },
    'pm.tplPlatformer': { zh: '平台跳跃', zht: '平台跳躍', en: 'Platformer', ja: 'プラットフォーマー', ko: '플랫포머' },
    'pm.tplPlatformerDesc': {
        zh: '角色 / 背景 / 平台 / 道具',
        zht: '角色 / 背景 / 平台 / 道具',
        en: 'Characters / Backgrounds / Platforms / Items',
        ja: 'キャラクター / 背景 / 足場 / アイテム',
        ko: '캐릭터 / 배경 / 플랫폼 / 아이템',
    },
    'pm.tplPuzzle': { zh: '消除游戏', zht: '消除遊戲', en: 'Match Puzzle', ja: 'マッチパズル', ko: '매치 퍼즐' },
    'pm.tplPuzzleDesc': {
        zh: '宝石 / 特效 / UI / 背景',
        zht: '寶石 / 特效 / UI / 背景',
        en: 'Gems / Effects / UI / Backgrounds',
        ja: '宝石 / エフェクト / UI / 背景',
        ko: '보석 / 효과 / UI / 배경',
    },
    'pm.tplUiKit': { zh: 'UI 套件', zht: 'UI 套件', en: 'UI Kit', ja: 'UIキット', ko: 'UI 키트' },
    'pm.tplUiKitDesc': {
        zh: '按钮 / 血条 / 弹窗 / 图标',
        zht: '按鈕 / 血條 / 彈窗 / 圖示',
        en: 'Buttons / Health Bars / Dialogs / Icons',
        ja: 'ボタン / HPバー / ダイアログ / アイコン',
        ko: '버튼 / 체력 바 / 대화상자 / 아이콘',
    },
    'pm.projectNameRequired': {
        zh: '项目名称*',
        zht: '專案名稱*',
        en: 'Project Name*',
        ja: 'プロジェクト名*',
        ko: '프로젝트 이름*',
    },
    'pm.namePlaceholder': {
        zh: '输入项目名称',
        zht: '輸入專案名稱',
        en: 'Enter a project name',
        ja: 'プロジェクト名を入力',
        ko: '프로젝트 이름 입력',
    },
    'pm.descPlaceholder': {
        zh: '简要描述项目用途',
        zht: '簡要描述專案用途',
        en: 'Briefly describe the project',
        ja: 'プロジェクトの用途を簡潔に説明',
        ko: '프로젝트 용도를 간단히 설명',
    },
    'pm.typeUi': { zh: 'UI设计', zht: 'UI設計', en: 'UI Design', ja: 'UIデザイン', ko: 'UI 디자인' },
    'pm.typeGame': { zh: '游戏界面', zht: '遊戲介面', en: 'Game Interface', ja: 'ゲーム画面', ko: '게임 인터페이스' },
    'pm.typeCharacter': {
        zh: '角色设计',
        zht: '角色設計',
        en: 'Character Design',
        ja: 'キャラクターデザイン',
        ko: '캐릭터 디자인',
    },
    'pm.typeEnvironment': {
        zh: '场景设计',
        zht: '場景設計',
        en: 'Environment Design',
        ja: '背景デザイン',
        ko: '환경 디자인',
    },
    'pm.typeOther': { zh: '其他', zht: '其他', en: 'Other', ja: 'その他', ko: '기타' },
    'pm.typeAction': { zh: '动作游戏', zht: '動作遊戲', en: 'Action Game', ja: 'アクションゲーム', ko: '액션 게임' },
    'pm.typeRoleplay': { zh: '角色扮演', zht: '角色扮演', en: 'Role-playing', ja: 'ロールプレイング', ko: '롤플레잉' },
    'pm.typeStrategy': {
        zh: '策略游戏',
        zht: '策略遊戲',
        en: 'Strategy Game',
        ja: 'ストラテジーゲーム',
        ko: '전략 게임',
    },
    'pm.typeSimulation': {
        zh: '模拟经营',
        zht: '模擬經營',
        en: 'Simulation',
        ja: 'シミュレーション',
        ko: '시뮬레이션',
    },
    'pm.typePuzzle': { zh: '益智解谜', zht: '益智解謎', en: 'Puzzle', ja: 'パズル', ko: '퍼즐' },
    'pm.uncategorized': { zh: '未分类', zht: '未分類', en: 'Uncategorized', ja: '未分類', ko: '미분류' },
    'pm.openAiAfterCreate': {
        zh: '创建后直接进入 AI 生成',
        zht: '建立後直接進入 AI 生成',
        en: 'Open AI Generate after creation',
        ja: '作成後にAI生成を開く',
        ko: '생성 후 AI 생성 열기',
    },
    'pm.editProject': {
        zh: '编辑项目',
        zht: '編輯專案',
        en: 'Edit Project',
        ja: 'プロジェクトを編集',
        ko: '프로젝트 편집',
    },
    'pm.versionHistory': {
        zh: '版本历史',
        zht: '版本歷史',
        en: 'Version History',
        ja: 'バージョン履歴',
        ko: '버전 기록',
    },
    'pm.shareProject': {
        zh: '分享项目',
        zht: '分享專案',
        en: 'Share Project',
        ja: 'プロジェクトを共有',
        ko: '프로젝트 공유',
    },
    'pm.shareLink': { zh: '分享链接', zht: '分享連結', en: 'Share Link', ja: '共有リンク', ko: '공유 링크' },
    'pm.shareHelp': {
        zh: '复制链接分享给他人，对方可以查看和编辑此项目。',
        zht: '複製連結分享給他人，對方可以檢視和編輯此專案。',
        en: 'Copy the link to let others view and edit this project.',
        ja: 'リンクをコピーすると、他のユーザーがこのプロジェクトを表示・編集できます。',
        ko: '링크를 복사하면 다른 사용자가 이 프로젝트를 보고 편집할 수 있습니다.',
    },
    'pm.copyLink': { zh: '复制链接', zht: '複製連結', en: 'Copy Link', ja: 'リンクをコピー', ko: '링크 복사' },
    'pm.assetsManagement': {
        zh: '项目素材管理',
        zht: '專案素材管理',
        en: 'Project Assets',
        ja: 'プロジェクト素材管理',
        ko: '프로젝트 에셋 관리',
    },
    'pm.addAsset': { zh: '添加素材', zht: '新增素材', en: 'Add Asset', ja: '素材を追加', ko: '에셋 추가' },
    'pm.assetName': { zh: '素材名称', zht: '素材名稱', en: 'Asset Name', ja: '素材名', ko: '에셋 이름' },
    'pm.assetContent': {
        zh: '素材URL或内容（可选）',
        zht: '素材URL或內容（選填）',
        en: 'Asset URL or content (optional)',
        ja: '素材URLまたは内容（任意）',
        ko: '에셋 URL 또는 내용(선택)',
    },
    'pm.noLocalFile': {
        zh: '未选择本地文件',
        zht: '未選擇本機檔案',
        en: 'No local file selected',
        ja: 'ローカルファイル未選択',
        ko: '로컬 파일 선택 안 됨',
    },
    'pm.add': { zh: '添加', zht: '新增', en: 'Add', ja: '追加', ko: '추가' },
    'pm.sketchTitle': {
        zh: '从线稿生成素材',
        zht: '從線稿生成素材',
        en: 'Generate Asset from Sketch',
        ja: '線画から素材を生成',
        ko: '스케치로 에셋 생성',
    },
    'pm.sketchUrl': {
        zh: '线稿图片URL*',
        zht: '線稿圖片URL*',
        en: 'Sketch Image URL*',
        ja: '線画画像URL*',
        ko: '스케치 이미지 URL*',
    },
    'pm.sketchUrlPlaceholder': {
        zh: '输入线稿图片的URL',
        zht: '輸入線稿圖片的URL',
        en: 'Enter the sketch image URL',
        ja: '線画画像のURLを入力',
        ko: '스케치 이미지 URL 입력',
    },
    'pm.descTitle': {
        zh: '从描述生成素材',
        zht: '從描述生成素材',
        en: 'Generate Asset from Description',
        ja: '説明から素材を生成',
        ko: '설명으로 에셋 생성',
    },
    'pm.assetDescription': {
        zh: '素材描述*',
        zht: '素材描述*',
        en: 'Asset Description*',
        ja: '素材の説明*',
        ko: '에셋 설명*',
    },
    'pm.assetPromptPlaceholder': {
        zh: '详细描述你想要的素材，例如：一个穿着太空服的卡通角色，蓝色背景，像素风格',
        zht: '詳細描述你想要的素材，例如：一個穿著太空服的卡通角色，藍色背景，像素風格',
        en: 'Describe the asset in detail, e.g. a cartoon character in a spacesuit, blue background, pixel art',
        ja: '希望する素材を詳しく説明してください。例：宇宙服を着たキャラクター、青い背景、ピクセルアート',
        ko: '원하는 에셋을 자세히 설명하세요. 예: 우주복을 입은 만화 캐릭터, 파란 배경, 픽셀 아트',
    },
    'pm.targetStyle': {
        zh: '目标风格',
        zht: '目標風格',
        en: 'Target Style',
        ja: 'ターゲットスタイル',
        ko: '대상 스타일',
    },
    'pm.outputType': { zh: '输出类型', zht: '輸出類型', en: 'Output Type', ja: '出力タイプ', ko: '출력 유형' },
    'pm.styleCartoon': { zh: '卡通风格', zht: '卡通風格', en: 'Cartoon', ja: 'カートゥーン', ko: '카툰' },
    'pm.styleAnime': { zh: '动漫风格', zht: '動漫風格', en: 'Anime', ja: 'アニメ', ko: '애니메이션' },
    'pm.styleRealistic': { zh: '写实风格', zht: '寫實風格', en: 'Realistic', ja: 'リアル', ko: '사실적' },
    'pm.stylePixel': { zh: '像素风格', zht: '像素風格', en: 'Pixel Art', ja: 'ピクセルアート', ko: '픽셀 아트' },
    'pm.styleHandDrawn': { zh: '手绘风格', zht: '手繪風格', en: 'Hand-drawn', ja: '手描き', ko: '손그림' },
    'pm.startGenerate': { zh: '开始生成', zht: '開始生成', en: 'Generate', ja: '生成開始', ko: '생성 시작' },
    'pm.unifyStyle': {
        zh: '统一项目风格',
        zht: '統一專案風格',
        en: 'Unify Project Style',
        ja: 'プロジェクトのスタイルを統一',
        ko: '프로젝트 스타일 통일',
    },
    'pm.unifyHelp': {
        zh: '此操作将对项目中的所有素材应用统一的风格。处理时间可能较长，请耐心等待。',
        zht: '此操作將對專案中的所有素材套用統一風格。處理時間可能較長，請耐心等待。',
        en: 'This applies one style to every asset in the project and may take some time.',
        ja: 'プロジェクト内のすべての素材に同じスタイルを適用します。処理に時間がかかる場合があります。',
        ko: '프로젝트의 모든 에셋에 동일한 스타일을 적용하며 시간이 걸릴 수 있습니다.',
    },
    'pm.startUnify': { zh: '开始统一', zht: '開始統一', en: 'Apply Style', ja: '統一開始', ko: '통일 시작' },
    'pm.assetImage': { zh: '图片', zht: '圖片', en: 'Image', ja: '画像', ko: '이미지' },
    'pm.assetIcon': { zh: '图标', zht: '圖示', en: 'Icon', ja: 'アイコン', ko: '아이콘' },
    'pm.assetButton': { zh: '按钮', zht: '按鈕', en: 'Button', ja: 'ボタン', ko: '버튼' },
    'pm.assetComponent': { zh: '组件', zht: '元件', en: 'Component', ja: 'コンポーネント', ko: '컴포넌트' },
    'pm.assetCharacter': { zh: '角色', zht: '角色', en: 'Character', ja: 'キャラクター', ko: '캐릭터' },
    'pm.assetEnvironment': { zh: '场景', zht: '場景', en: 'Environment', ja: '背景', ko: '환경' },
    'pm.assetProp': { zh: '道具', zht: '道具', en: 'Prop', ja: '小道具', ko: '소품' },
    'pm.assetEffect': { zh: '特效', zht: '特效', en: 'Effect', ja: 'エフェクト', ko: '효과' },
    'pm.assetAnimation': { zh: '动画', zht: '動畫', en: 'Animation', ja: 'アニメーション', ko: '애니메이션' },
    'pm.noDescription': { zh: '无描述', zht: '無描述', en: 'No description', ja: '説明なし', ko: '설명 없음' },
    'pm.createdAt': { zh: '创建时间', zht: '建立時間', en: 'Created', ja: '作成日時', ko: '생성 시간' },
    'pm.version': { zh: '版本', zht: '版本', en: 'Version', ja: 'バージョン', ko: '버전' },
    'pm.assetCount': { zh: '素材数', zht: '素材數', en: 'Assets', ja: '素材数', ko: '에셋 수' },
    'pm.edit': { zh: '编辑', zht: '編輯', en: 'Edit', ja: '編集', ko: '편집' },
    'pm.deleteProject': {
        zh: '删除项目',
        zht: '刪除專案',
        en: 'Delete Project',
        ja: 'プロジェクトを削除',
        ko: '프로젝트 삭제',
    },
    'pm.history': { zh: '版本', zht: '版本', en: 'History', ja: '履歴', ko: '기록' },
    'pm.share': { zh: '分享', zht: '分享', en: 'Share', ja: '共有', ko: '공유' },
    'pm.assets': { zh: '素材', zht: '素材', en: 'Assets', ja: '素材', ko: '에셋' },
    'pm.manageAssets': { zh: '管理素材', zht: '管理素材', en: 'Manage Assets', ja: '素材を管理', ko: '에셋 관리' },
    'pm.invalidInput': { zh: '输入有误', zht: '輸入有誤', en: 'Invalid Input', ja: '入力エラー', ko: '입력 오류' },
    'pm.enterSketchUrl': {
        zh: '请先填写线稿图片 URL。',
        zht: '請先填寫線稿圖片 URL。',
        en: 'Enter a sketch image URL first.',
        ja: '線画画像のURLを入力してください。',
        ko: '먼저 스케치 이미지 URL을 입력하세요.',
    },
    'pm.enterDescription': {
        zh: '请先填写素材描述。',
        zht: '請先填寫素材描述。',
        en: 'Enter an asset description first.',
        ja: '素材の説明を入力してください。',
        ko: '먼저 에셋 설명을 입력하세요.',
    },
    'pm.gotIt': { zh: '知道了', zht: '知道了', en: 'Got it', ja: '了解', ko: '확인' },
    'pm.linkCopied': {
        zh: '分享链接已复制！',
        zht: '分享連結已複製！',
        en: 'Share link copied!',
        ja: '共有リンクをコピーしました！',
        ko: '공유 링크를 복사했습니다!',
    },
    'pm.deleteProjectConfirm': {
        zh: '确定删除该项目？此操作不可恢复！',
        zht: '確定刪除該專案？此操作無法復原！',
        en: 'Delete this project? This cannot be undone.',
        ja: 'このプロジェクトを削除しますか？元に戻せません。',
        ko: '이 프로젝트를 삭제할까요? 되돌릴 수 없습니다.',
    },
    'pm.deleteAsset': { zh: '删除素材', zht: '刪除素材', en: 'Delete Asset', ja: '素材を削除', ko: '에셋 삭제' },
    'pm.deleteAssetConfirm': {
        zh: '确定删除此素材？',
        zht: '確定刪除此素材？',
        en: 'Delete this asset?',
        ja: 'この素材を削除しますか？',
        ko: '이 에셋을 삭제할까요?',
    },
    'pm.noVersions': {
        zh: '暂无版本历史记录',
        zht: '暫無版本歷史記錄',
        en: 'No version history yet',
        ja: 'バージョン履歴はありません',
        ko: '버전 기록이 없습니다',
    },
    'pm.noAssetsStart': {
        zh: '暂无素材，点击添加素材按钮开始添加',
        zht: '暫無素材，點擊新增素材按鈕開始新增',
        en: 'No assets yet. Click Add Asset to get started.',
        ja: '素材がありません。「素材を追加」から追加してください。',
        ko: '에셋이 없습니다. 에셋 추가를 눌러 시작하세요.',
    },
    'pm.projectNameEmpty': {
        zh: '项目名称不能为空！',
        zht: '專案名稱不能為空！',
        en: 'Project name is required.',
        ja: 'プロジェクト名を入力してください。',
        ko: '프로젝트 이름을 입력하세요.',
    },
    'pm.loadFailed': {
        zh: '加载项目列表失败，请刷新重试',
        zht: '載入專案清單失敗，請重新整理後再試',
        en: 'Could not load projects. Refresh and try again.',
        ja: 'プロジェクトを読み込めませんでした。再読み込みしてください。',
        ko: '프로젝트를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.',
    },
    'pm.saveFailed': {
        zh: '保存项目失败',
        zht: '儲存專案失敗',
        en: 'Could not save the project.',
        ja: 'プロジェクトを保存できませんでした。',
        ko: '프로젝트를 저장하지 못했습니다.',
    },
    'pm.createFailed': {
        zh: '创建项目失败',
        zht: '建立專案失敗',
        en: 'Could not create the project.',
        ja: 'プロジェクトを作成できませんでした。',
        ko: '프로젝트를 생성하지 못했습니다.',
    },
    'pm.createSuccess': {
        zh: '项目创建成功！',
        zht: '專案建立成功！',
        en: 'Project created!',
        ja: 'プロジェクトを作成しました！',
        ko: '프로젝트를 생성했습니다!',
    },
    'pm.updateSuccess': {
        zh: '项目更新成功！',
        zht: '專案更新成功！',
        en: 'Project updated!',
        ja: 'プロジェクトを更新しました！',
        ko: '프로젝트를 업데이트했습니다!',
    },
    'pm.deleteFailed': {
        zh: '删除项目失败，请重试',
        zht: '刪除專案失敗，請再試一次',
        en: 'Could not delete the project. Try again.',
        ja: 'プロジェクトを削除できませんでした。もう一度お試しください。',
        ko: '프로젝트를 삭제하지 못했습니다. 다시 시도하세요.',
    },
    'pm.assetNameEmpty': {
        zh: '素材名称不能为空！',
        zht: '素材名稱不能為空！',
        en: 'Asset name is required.',
        ja: '素材名を入力してください。',
        ko: '에셋 이름을 입력하세요.',
    },
    'pm.assetSourceEmpty': {
        zh: '请填写素材URL/内容，或选择一个本地文件！',
        zht: '請填寫素材URL/內容，或選擇一個本機檔案！',
        en: 'Enter an asset URL/content or select a local file.',
        ja: '素材のURL・内容を入力するか、ローカルファイルを選択してください。',
        ko: '에셋 URL/내용을 입력하거나 로컬 파일을 선택하세요.',
    },
    'pm.readFailed': { zh: '读取失败', zht: '讀取失敗', en: 'Read Failed', ja: '読み込みエラー', ko: '읽기 실패' },
    'pm.readFileFailed': {
        zh: '读取本地文件失败，或文件过大（非图片建议小于1MB）。请压缩后重试。',
        zht: '讀取本機檔案失敗，或檔案過大（非圖片建議小於1MB）。請壓縮後再試。',
        en: 'Could not read the local file, or it is too large (keep non-images under 1 MB). Compress it and try again.',
        ja: 'ローカルファイルを読み込めないか、サイズが大きすぎます（画像以外は1MB未満を推奨）。圧縮して再試行してください。',
        ko: '로컬 파일을 읽지 못했거나 너무 큽니다(이미지가 아닌 파일은 1MB 미만 권장). 압축 후 다시 시도하세요.',
    },
    'pm.assetAdded': {
        zh: '素材添加成功！',
        zht: '素材新增成功！',
        en: 'Asset added!',
        ja: '素材を追加しました！',
        ko: '에셋을 추가했습니다!',
    },
    'pm.assetSynced': {
        zh: '已同步到素材库。',
        zht: '已同步到素材庫。',
        en: 'Synced to the asset library.',
        ja: '素材ライブラリに同期しました。',
        ko: '에셋 라이브러리에 동기화했습니다.',
    },
    'pm.assetSyncFailed': {
        zh: '但同步到素材库失败，请稍后重试。',
        zht: '但同步到素材庫失敗，請稍後再試。',
        en: 'However, syncing to the asset library failed. Try again later.',
        ja: 'ただし、素材ライブラリへの同期に失敗しました。後でもう一度お試しください。',
        ko: '하지만 에셋 라이브러리 동기화에 실패했습니다. 나중에 다시 시도하세요.',
    },
    'pm.assetSyncComplete': {
        zh: '素材同步完成',
        zht: '素材同步完成',
        en: 'Asset Sync Complete',
        ja: '素材の同期完了',
        ko: '에셋 동기화 완료',
    },
    'pm.viewLibraryQuestion': {
        zh: '是否前往素材库查看？',
        zht: '是否前往素材庫查看？',
        en: 'Open the asset library now?',
        ja: '素材ライブラリを開きますか？',
        ko: '에셋 라이브러리로 이동할까요?',
    },
    'pm.goToLibrary': {
        zh: '前往素材库',
        zht: '前往素材庫',
        en: 'Open Asset Library',
        ja: '素材ライブラリへ',
        ko: '에셋 라이브러리 열기',
    },
    'pm.stayHere': {
        zh: '留在当前页',
        zht: '留在目前頁面',
        en: 'Stay Here',
        ja: 'このページに留まる',
        ko: '현재 페이지에 머물기',
    },
    'pm.storageWarning': {
        zh: '提示：本地存储空间接近上限，建议及时清理不需要的素材。',
        zht: '提示：本機儲存空間接近上限，建議及時清理不需要的素材。',
        en: 'Local storage is nearly full. Consider removing assets you no longer need.',
        ja: 'ローカルストレージの空き容量が少なくなっています。不要な素材を削除してください。',
        ko: '로컬 저장 공간이 거의 가득 찼습니다. 불필요한 에셋을 정리하세요.',
    },

    // Asset Library
    'al.title': { zh: '素材库', zht: '素材庫', en: 'Asset Library', ja: 'アセットライブラリ', ko: '에셋 라이브러리' },
    'al.upload': { zh: '上传素材', zht: '上傳素材', en: 'Upload', ja: 'アップロード', ko: '업로드' },
    'al.empty': {
        zh: '暂无素材，试试上传一些文件',
        zht: '暫無素材，試試上傳一些檔案',
        en: 'No assets yet. Try uploading some files.',
        ja: 'アセットがありません。ファイルをアップロードしてみてください。',
        ko: '에셋이 없습니다. 파일을 업로드해 보세요.',
    },
    'al.batchDelete': { zh: '批量删除', zht: '批次刪除', en: 'Batch Delete', ja: '一括削除', ko: '일괄 삭제' },
    'al.selected': { zh: '已选', zht: '已選', en: 'Selected', ja: '選択済み', ko: '선택됨' },

    // User Center
    'uc.personalInfo': { zh: '个人信息', zht: '個人資訊', en: 'Personal Info', ja: '個人情報', ko: '개인정보' },
    'uc.apiSettings': { zh: 'API设置', zht: 'API設定', en: 'API Settings', ja: 'API設定', ko: 'API 설정' },
    'uc.changePassword': {
        zh: '修改密码',
        zht: '修改密碼',
        en: 'Change Password',
        ja: 'パスワード変更',
        ko: '비밀번호 변경',
    },
    'uc.permissions': { zh: '权限设置', zht: '權限設定', en: 'Permissions', ja: '権限設定', ko: '권한 설정' },
    'uc.avatarUpload': {
        zh: '头像上传',
        zht: '頭像上傳',
        en: 'Avatar Upload',
        ja: 'アバターアップロード',
        ko: '아바타 업로드',
    },
    'uc.activityLog': {
        zh: '活动日志',
        zht: '活動日誌',
        en: 'Activity Log',
        ja: 'アクティビティログ',
        ko: '활동 로그',
    },
    'uc.personalCenter': {
        zh: '个人中心',
        zht: '個人中心',
        en: 'Personal Center',
        ja: 'パーソナルセンター',
        ko: '개인 센터',
    },
    'uc.basicInfo': { zh: '基本信息', zht: '基本資訊', en: 'Basic Info', ja: '基本情報', ko: '기본 정보' },
    'uc.userId': { zh: '用户ID', zht: '使用者ID', en: 'User ID', ja: 'ユーザーID', ko: '사용자 ID' },
    'uc.role': { zh: '身份', zht: '身份', en: 'Role', ja: '役割', ko: '역할' },
    'uc.email': { zh: '电子邮箱', zht: '電子郵件', en: 'Email', ja: 'メールアドレス', ko: '이메일' },
    'uc.nickname': { zh: '昵称', zht: '暱稱', en: 'Nickname', ja: 'ニックネーム', ko: '닉네임' },
    'uc.gender': { zh: '性别', zht: '性別', en: 'Gender', ja: '性別', ko: '성별' },
    'uc.bio': { zh: '个人简介', zht: '個人簡介', en: 'Bio', ja: '自己紹介', ko: '자기소개' },
    'uc.country': { zh: '国家/地区', zht: '國家/地區', en: 'Country/Region', ja: '国/地域', ko: '국가/지역' },
    'uc.language': { zh: '偏好语言', zht: '偏好語言', en: 'Language', ja: '言語', ko: '언어' },
    'uc.editInfo': { zh: '修改信息', zht: '修改資訊', en: 'Edit Info', ja: '情報を編集', ko: '정보 수정' },
    'uc.saveChanges': { zh: '保存更改', zht: '儲存變更', en: 'Save Changes', ja: '変更を保存', ko: '변경 저장' },
    'uc.cancel': { zh: '取消', zht: '取消', en: 'Cancel', ja: 'キャンセル', ko: '취소' },
    'uc.accountStats': { zh: '账户统计', zht: '帳戶統計', en: 'Account Stats', ja: 'アカウント統計', ko: '계정 통계' },
    'uc.projectCount': {
        zh: '创建项目数',
        zht: '建立專案數',
        en: 'Projects Created',
        ja: '作成プロジェクト数',
        ko: '생성 프로젝트 수',
    },
    'uc.completedProjects': {
        zh: '已完成项目',
        zht: '已完成專案',
        en: 'Completed',
        ja: '完了プロジェクト',
        ko: '완료된 프로젝트',
    },
    'uc.savedTemplates': {
        zh: '收藏模板数',
        zht: '收藏範本數',
        en: 'Saved Templates',
        ja: '保存テンプレート数',
        ko: '저장된 템플릿 수',
    },
    'uc.registrationTime': { zh: '账户注册时间', zht: '帳戶註冊時間', en: 'Registered', ja: '登録日', ko: '가입일' },
    'uc.lastLogin': {
        zh: '上次登录时间',
        zht: '上次登入時間',
        en: 'Last Login',
        ja: '最終ログイン',
        ko: '마지막 로그인',
    },
    'uc.privacySecurity': {
        zh: '隐私与安全设置',
        zht: '隱私與安全設定',
        en: 'Privacy & Security',
        ja: 'プライバシーとセキュリティ',
        ko: '개인정보 및 보안',
    },
    'uc.profileVisibility': {
        zh: '个人资料可见性',
        zht: '個人資料可見性',
        en: 'Profile Visibility',
        ja: 'プロフィールの公開設定',
        ko: '프로필 공개 설정',
    },
    'uc.profileVisibilityDesc': {
        zh: '允许其他用户查看我的个人资料',
        zht: '允許其他使用者檢視我的個人資料',
        en: 'Allow others to view my profile',
        ja: '他のユーザーにプロフィールを表示',
        ko: '다른 사용자가 내 프로필을 볼 수 있도록 허용',
    },
    'uc.allowDownload': {
        zh: '允许下载我的作品',
        zht: '允許下載我的作品',
        en: 'Allow downloading my work',
        ja: '作品のダウンロードを許可',
        ko: '작품 다운로드 허용',
    },
    'uc.allowDownloadDesc': {
        zh: '允许其他用户下载我上传的UI作品',
        zht: '允許其他使用者下載我上傳的UI作品',
        en: 'Allow others to download my uploaded UI work',
        ja: '他のユーザーがアップロードしたUI作品をダウンロード可能に',
        ko: '다른 사용자가 내가 업로드한 UI 작품을 다운로드할 수 있도록 허용',
    },
    'uc.receiveMessages': {
        zh: '接收消息',
        zht: '接收訊息',
        en: 'Receive Messages',
        ja: 'メッセージ受信',
        ko: '메시지 수신',
    },
    'uc.receiveMessagesDesc': {
        zh: '允许其他用户给我发送私信',
        zht: '允許其他使用者給我發送私訊',
        en: 'Allow others to send me private messages',
        ja: '他のユーザーからのダイレクトメッセージを許可',
        ko: '다른 사용자가 나에게 쪽지를 보낼 수 있도록 허용',
    },
    'uc.emailNotifications': {
        zh: '邮件通知',
        zht: '郵件通知',
        en: 'Email Notifications',
        ja: 'メール通知',
        ko: '이메일 알림',
    },
    'uc.emailNotificationsDesc': {
        zh: '接收重要更新和活动邮件通知',
        zht: '接收重要更新和活動郵件通知',
        en: 'Receive important updates and activity notifications',
        ja: '重要な更新とアクティビティのメール通知を受信',
        ko: '중요한 업데이트 및 활동 알림 수신',
    },
    'uc.twoFactor': { zh: '双重验证', zht: '雙重驗證', en: 'Two-Factor Auth', ja: '二要素認証', ko: '2단계 인증' },
    'uc.twoFactorDesc': {
        zh: '启用账户双重验证保护',
        zht: '啟用帳戶雙重驗證保護',
        en: 'Enable two-factor authentication',
        ja: '二要素認証を有効にする',
        ko: '2단계 인증 활성화',
    },
    'uc.browseHistory': {
        zh: '浏览历史记录',
        zht: '瀏覽歷史記錄',
        en: 'Browse History',
        ja: '閲覧履歴',
        ko: '瀏覽 기록',
    },
    'uc.browseHistoryDesc': {
        zh: '保存我的浏览和搜索历史记录',
        zht: '儲存我的瀏覽和搜尋歷史記錄',
        en: 'Save my browsing and search history',
        ja: '閲覧・検索履歴を保存',
        ko: '瀏覽 및 검색 기록 저장',
    },
    'uc.saveSettings': { zh: '保存设置', zht: '儲存設定', en: 'Save Settings', ja: '設定を保存', ko: '설정 저장' },
    'uc.uploadAvatar': {
        zh: '上传新头像',
        zht: '上傳新頭像',
        en: 'Upload Avatar',
        ja: 'アバターをアップロード',
        ko: '아바타 업로드',
    },
    'uc.resetAvatar': {
        zh: '恢复默认头像',
        zht: '恢復預設頭像',
        en: 'Reset Avatar',
        ja: 'デフォルトに戻す',
        ko: '기본 아바타로 복원',
    },
    'uc.avatarHistory': {
        zh: '头像历史',
        zht: '頭像歷史',
        en: 'Avatar History',
        ja: 'アバター履歴',
        ko: '아바타 기록',
    },
    'uc.avatarFormats': {
        zh: '支持JPG、PNG、GIF格式，建议尺寸200x200像素',
        zht: '支援JPG、PNG、GIF格式，建議尺寸200x200像素',
        en: 'Supports JPG, PNG, GIF. Recommended 200x200px',
        ja: 'JPG、PNG、GIF対応。200x200px推奨',
        ko: 'JPG, PNG, GIF 지원. 200x200px 권장',
    },

    // AI Generate
    'ai.textToImage': { zh: '文生图', zht: '文生圖', en: 'Text to Image', ja: 'テキストから画像', ko: '텍스트→이미지' },
    'ai.imgToImg': { zh: '图生图', zht: '圖生圖', en: 'Image to Image', ja: '画像から画像', ko: '이미지→이미지' },
    'ai.styleTransfer': {
        zh: '风格迁移',
        zht: '風格遷移',
        en: 'Style Transfer',
        ja: 'スタイル転送',
        ko: '스타일 전송',
    },
    'ai.generate': { zh: '生成', zht: '生成', en: 'Generate', ja: '生成', ko: '생성' },
    'ai.templates': {
        zh: '游戏 UI 模板',
        zht: '遊戲 UI 範本',
        en: 'Game UI Templates',
        ja: 'ゲームUIテンプレート',
        ko: '게임 UI 템플릿',
    },
    'ai.extractPalette': {
        zh: '提取调色板',
        zht: '提取調色盤',
        en: 'Extract Palette',
        ja: 'パレット抽出',
        ko: '팔레트 추출',
    },
    'ai.assetEditor': {
        zh: '资产微调',
        zht: '資產微調',
        en: 'Asset Editor',
        ja: 'アセット微調整',
        ko: '에셋 미세 조정',
    },
    'ai.imageGenerate': { zh: '图片生成', zht: '圖片生成', en: 'Image Generate', ja: '画像生成', ko: '이미지 생성' },
    'ai.actionGroup': {
        zh: '角色动作组',
        zht: '角色動作組',
        en: 'Action Group',
        ja: 'キャラクターアクション',
        ko: '캐릭터 액션 그룹',
    },

    // Notifications
    'notif.title': { zh: '消息中心', zht: '訊息中心', en: 'Notifications', ja: '通知センター', ko: '알림 센터' },
    'notif.all': { zh: '全部消息', zht: '全部訊息', en: 'All', ja: 'すべて', ko: '전체' },
    'notif.unread': { zh: '未读消息', zht: '未讀訊息', en: 'Unread', ja: '未読', ko: '읽지 않음' },
    'notif.system': { zh: '系统通知', zht: '系統通知', en: 'System', ja: 'システム', ko: '시스템' },
    'notif.markAllRead': {
        zh: '全部已读',
        zht: '全部已讀',
        en: 'Mark all read',
        ja: 'すべて既読にする',
        ko: '모두 읽음 처리',
    },
    'notif.viewAll': {
        zh: '查看所有通知',
        zht: '檢視所有通知',
        en: 'View all notifications',
        ja: 'すべての通知を見る',
        ko: '모든 알림 보기',
    },

    // Footer / Misc
    'misc.poweredBy': { zh: '由 AI 驱动', zht: '由 AI 驅動', en: 'Powered by AI', ja: 'AI搭載', ko: 'AI 기반' },
    'misc.menu': { zh: '菜单', zht: '選單', en: 'Menu', ja: 'メニュー', ko: '메뉴' },
    'misc.notifications': { zh: '通知', zht: '通知', en: 'Notifications', ja: '通知', ko: '알림' },

    // Theme Settings
    'uc.themeSetting': { zh: '主题风格', zht: '主題風格', en: 'Theme Style', ja: 'テーマスタイル', ko: '테마 스타일' },
    'uc.themeOff': { zh: '赛博朋克', zht: '賽博朋克', en: 'Cyberpunk', ja: 'サイバーパンク', ko: '사이버펑크' },
    'uc.themeAuto': {
        zh: '跟随语言地区',
        zht: '跟隨語言地區',
        en: 'Follow Language & Region',
        ja: '言語・地域に合わせる',
        ko: '언어 및 지역 따르기',
    },
    'uc.themeDesc': {
        zh: '开启后页面风格将根据您的语言和地区自动变化，也可手动选择',
        zht: '開啟後頁面風格將根據您的語言和地區自動變化，也可手動選擇',
        en: 'When enabled, page style adapts to your language & region. You can also choose manually.',
        ja: '有効にすると、言語・地域に合わせてページスタイルが変わります。手動選択も可能です。',
        ko: '활성화하면 언어 및 지역에 따라 페이지 스타일이 변경됩니다. 수동 선택도 가능합니다.',
    },
    'uc.themeChina': { zh: '华夏丹青', zht: '華夏丹青', en: 'Ink Wash', ja: '水墨画', ko: '수묵화' },
    'uc.themeJapan': { zh: '和風物語', zht: '和風物語', en: 'Ukiyo-e', ja: '和風物語', ko: '우키요에' },
    'uc.themeKorea': { zh: '韩流霓虹', zht: '韓流霓虹', en: 'K-Neon', ja: 'K-ネオン', ko: 'K-네온' },
    'uc.themeUk': { zh: '英伦油画', zht: '英倫油畫', en: 'Oil Painting', ja: '油絵', ko: '유화' },
    'uc.themeTc': { zh: '華夏雅韻', zht: '華夏雅韻', en: 'Classical CN', ja: '古典中華', ko: '고전중화' },
};

let currentLang = localStorage.getItem('artifex-lang') || 'zh';

function t(key) {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[currentLang] || entry.zh || key;
}

function setLanguage(lang) {
    if (!LANGUAGES[lang]) return;
    currentLang = lang;
    try {
        localStorage.setItem('artifex-lang', lang);
    } catch (_e) {
        /* Safari private */
    }
    applyTranslations();
    document.documentElement.lang = { zh: 'zh-CN', zht: 'zh-Hant', en: 'en', ja: 'ja', ko: 'ko' }[lang] || lang;
    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function getLanguage() {
    return currentLang;
}

function getLanguages() {
    return LANGUAGES;
}

function applyTranslations() {
    document.documentElement.lang =
        { zh: 'zh-CN', zht: 'zh-Hant', en: 'en', ja: 'ja', ko: 'ko' }[currentLang] || currentLang;
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (el.tagName === 'INPUT' && el.type !== 'submit' && el.type !== 'checkbox') {
            el.placeholder = text;
        } else if (el.tagName === 'TEXTAREA') {
            el.placeholder = text;
        } else {
            el.textContent = text;
        }
    });
    // Translate elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
        el.title = t(el.getAttribute('data-i18n-title'));
    });
    // Translate elements with data-i18n-aria attribute
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
}

// Auto-apply on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslations);
} else {
    applyTranslations();
}

// Expose globally
window.i18n = {
    t: t,
    setLanguage: setLanguage,
    getLanguage: getLanguage,
    getLanguages: getLanguages,
    applyTranslations: applyTranslations,
};
