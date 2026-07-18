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

        // Login
        'login.welcome': { zh: '欢迎回来，开发者', zht: '歡迎回來，開發者', en: 'Welcome back, Developer', ja: 'おかえりなさい、開発者様', ko: '돌아오셨습니다, 개발자님' },
        'login.subtitle': { zh: '登录您的账户继续创建游戏UI资产', zht: '登入您的帳戶繼續建立遊戲UI資產', en: 'Sign in to continue creating game UI assets', ja: 'ゲームUIアセットの作成を続けるにはサインインしてください', ko: '게임 UI 에셋 제작을 계속하려면 로그인하세요' },
        'login.email': { zh: '邮箱地址', zht: '電子郵件地址', en: 'Email', ja: 'メールアドレス', ko: '이메일' },
        'login.password': { zh: '密码', zht: '密碼', en: 'Password', ja: 'パスワード', ko: '비밀번호' },
        'login.remember': { zh: '记住我', zht: '記住我', en: 'Remember me', ja: 'ログイン情報を保存', ko: '로그인 유지' },
        'login.forgot': { zh: '忘记密码？', zht: '忘記密碼？', en: 'Forgot password?', ja: 'パスワードをお忘れですか？', ko: '비밀번호를 잊으셨나요?' },
        'login.submit': { zh: '登录账户', zht: '登入帳戶', en: 'Sign In', ja: 'サインイン', ko: '로그인' },
        'login.noAccount': { zh: '还没有账户？', zht: '還沒有帳戶？', en: "Don't have an account?", ja: 'アカウントをお持ちでないですか？', ko: '계정이 없으신가요?' },
        'login.register': { zh: '立即注册', zht: '立即註冊', en: 'Register', ja: '登録', ko: '회원가입' },
        'login.registerTitle': { zh: '创建账户', zht: '建立帳戶', en: 'Create Account', ja: '新規アカウント作成', ko: '새 계정 만들기' },
        'login.registerSubtitle': { zh: '注册成为 Artifex 开发者', zht: '註冊成為 Artifex 開發者', en: 'Register as an Artifex developer', ja: 'Artifex開発者として登録', ko: 'Artifex 개발자로 등록' },
        'login.username': { zh: '用户名', zht: '使用者名稱', en: 'Username', ja: 'ユーザー名', ko: '사용자 이름' },
        'login.confirmPassword': { zh: '确认密码', zht: '確認密碼', en: 'Confirm Password', ja: 'パスワード確認', ko: '비밀번호 확인' },
        'login.showPassword': { zh: '显示密码', zht: '顯示密碼', en: 'Show password', ja: 'パスワードを表示', ko: '비밀번호 표시' },
        'login.setPassword': { zh: '设置密码', zht: '設定密碼', en: 'Set Password', ja: 'パスワード設定', ko: '비밀번호 설정' },
        'login.hasAccount': { zh: '已有账户？', zht: '已有帳戶？', en: 'Already have an account?', ja: 'アカウントをお持ちですか？', ko: '이미 계정이 있으신가요?' },
        'login.loginNow': { zh: '立即登录', zht: '立即登入', en: 'Sign In', ja: 'サインイン', ko: '로그인' },
        'login.agreeTerms': { zh: '我同意', zht: '我同意', en: 'I agree to the', ja: '以下に同意します', ko: '다음에 동의합니다' },
        'login.terms': { zh: '服务条款', zht: '服務條款', en: 'Terms', ja: '利用規約', ko: '이용약관' },
        'login.privacy': { zh: '隐私政策', zht: '隱私政策', en: 'Privacy Policy', ja: 'プライバシーポリシー', ko: '개인정보처리방침' },

        // Dashboard
        'dashboard.welcome': { zh: '欢迎回来', zht: '歡迎回來', en: 'Welcome back', ja: 'おかえりなさい', ko: '돌아오셨습니다' },
        'dashboard.quickTools': { zh: '快捷工具', zht: '快捷工具', en: 'Quick Tools', ja: 'クイックツール', ko: '빠른 도구' },
        'dashboard.recentProjects': { zh: '最近项目', zht: '最近專案', en: 'Recent Projects', ja: '最近のプロジェクト', ko: '최근 프로젝트' },
        'dashboard.newProject': { zh: '新建项目', zht: '新建專案', en: 'New Project', ja: '新規プロジェクト', ko: '새 프로젝트' },
        'dashboard.viewAll': { zh: '查看全部', zht: '檢視全部', en: 'View All', ja: 'すべて表示', ko: '전체 보기' },
        'dashboard.searchPlaceholder': { zh: '搜索项目、资产或文档...', zht: '搜尋專案、資產或文件...', en: 'Search projects, assets or docs...', ja: 'プロジェクト、アセット、ドキュメントを検索...', ko: '프로젝트, 에셋, 문서 검색...' },
        'dashboard.aiGenerate': { zh: 'AI生成', zht: 'AI生成', en: 'AI Generate', ja: 'AI生成', ko: 'AI 생성' },
        'dashboard.aiGenerateDesc': { zh: '使用AI自动生成UI资产', zht: '使用AI自動生成UI資產', en: 'Auto-generate UI assets with AI', ja: 'AIでUIアセットを自動生成', ko: 'AI로 UI 에셋 자동 생성' },
        'dashboard.assetsDesc': { zh: '访问游戏UI素材资源', zht: '存取遊戲UI素材資源', en: 'Access game UI assets', ja: 'ゲームUI素材にアクセス', ko: '게임 UI 에셋 접근' },
        'dashboard.newProjectDesc': { zh: '创建全新的UI设计项目', zht: '建立全新的UI設計專案', en: 'Create a new UI design project', ja: '新しいUIデザインプロジェクトを作成', ko: '새 UI 디자인 프로젝트 만들기' },

        // Project Management
        'pm.createProject': { zh: '创建新项目', zht: '建立新專案', en: 'Create New Project', ja: '新規プロジェクト作成', ko: '새 프로젝트 만들기' },
        'pm.projectName': { zh: '项目名称', zht: '專案名稱', en: 'Project Name', ja: 'プロジェクト名', ko: '프로젝트 이름' },
        'pm.projectDesc': { zh: '项目描述', zht: '專案描述', en: 'Description', ja: 'プロジェクト説明', ko: '설명' },
        'pm.projectType': { zh: '项目类型', zht: '專案類型', en: 'Project Type', ja: 'プロジェクトタイプ', ko: '프로젝트 유형' },
        'pm.empty': { zh: '暂无项目，点击上方按钮创建', zht: '暫無專案，點擊上方按鈕建立', en: 'No projects yet. Click the button above to create one.', ja: 'プロジェクトがありません。上のボタンから作成してください。', ko: '프로젝트가 없습니다. 위 버튼을 클릭하여 만드세요.' },

        // Asset Library
        'al.title': { zh: '素材库', zht: '素材庫', en: 'Asset Library', ja: 'アセットライブラリ', ko: '에셋 라이브러리' },
        'al.upload': { zh: '上传素材', zht: '上傳素材', en: 'Upload', ja: 'アップロード', ko: '업로드' },
        'al.empty': { zh: '暂无素材，试试上传一些文件', zht: '暫無素材，試試上傳一些檔案', en: 'No assets yet. Try uploading some files.', ja: 'アセットがありません。ファイルをアップロードしてみてください。', ko: '에셋이 없습니다. 파일을 업로드해 보세요.' },
        'al.batchDelete': { zh: '批量删除', zht: '批次刪除', en: 'Batch Delete', ja: '一括削除', ko: '일괄 삭제' },
        'al.selected': { zh: '已选', zht: '已選', en: 'Selected', ja: '選択済み', ko: '선택됨' },

        // User Center
        'uc.personalInfo': { zh: '个人信息', zht: '個人資訊', en: 'Personal Info', ja: '個人情報', ko: '개인정보' },
        'uc.apiSettings': { zh: 'API设置', zht: 'API設定', en: 'API Settings', ja: 'API設定', ko: 'API 설정' },
        'uc.changePassword': { zh: '修改密码', zht: '修改密碼', en: 'Change Password', ja: 'パスワード変更', ko: '비밀번호 변경' },
        'uc.permissions': { zh: '权限设置', zht: '權限設定', en: 'Permissions', ja: '権限設定', ko: '권한 설정' },
        'uc.avatarUpload': { zh: '头像上传', zht: '頭像上傳', en: 'Avatar Upload', ja: 'アバターアップロード', ko: '아바타 업로드' },
        'uc.activityLog': { zh: '活动日志', zht: '活動日誌', en: 'Activity Log', ja: 'アクティビティログ', ko: '활동 로그' },
        'uc.personalCenter': { zh: '个人中心', zht: '個人中心', en: 'Personal Center', ja: 'パーソナルセンター', ko: '개인 센터' },
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
        'uc.projectCount': { zh: '创建项目数', zht: '建立專案數', en: 'Projects Created', ja: '作成プロジェクト数', ko: '생성 프로젝트 수' },
        'uc.completedProjects': { zh: '已完成项目', zht: '已完成專案', en: 'Completed', ja: '完了プロジェクト', ko: '완료된 프로젝트' },
        'uc.savedTemplates': { zh: '收藏模板数', zht: '收藏範本數', en: 'Saved Templates', ja: '保存テンプレート数', ko: '저장된 템플릿 수' },
        'uc.registrationTime': { zh: '账户注册时间', zht: '帳戶註冊時間', en: 'Registered', ja: '登録日', ko: '가입일' },
        'uc.lastLogin': { zh: '上次登录时间', zht: '上次登入時間', en: 'Last Login', ja: '最終ログイン', ko: '마지막 로그인' },
        'uc.privacySecurity': { zh: '隐私与安全设置', zht: '隱私與安全設定', en: 'Privacy & Security', ja: 'プライバシーとセキュリティ', ko: '개인정보 및 보안' },
        'uc.profileVisibility': { zh: '个人资料可见性', zht: '個人資料可見性', en: 'Profile Visibility', ja: 'プロフィールの公開設定', ko: '프로필 공개 설정' },
        'uc.profileVisibilityDesc': { zh: '允许其他用户查看我的个人资料', zht: '允許其他使用者檢視我的個人資料', en: 'Allow others to view my profile', ja: '他のユーザーにプロフィールを表示', ko: '다른 사용자가 내 프로필을 볼 수 있도록 허용' },
        'uc.allowDownload': { zh: '允许下载我的作品', zht: '允許下載我的作品', en: 'Allow downloading my work', ja: '作品のダウンロードを許可', ko: '작품 다운로드 허용' },
        'uc.allowDownloadDesc': { zh: '允许其他用户下载我上传的UI作品', zht: '允許其他使用者下載我上傳的UI作品', en: 'Allow others to download my uploaded UI work', ja: '他のユーザーがアップロードしたUI作品をダウンロード可能に', ko: '다른 사용자가 내가 업로드한 UI 작품을 다운로드할 수 있도록 허용' },
        'uc.receiveMessages': { zh: '接收消息', zht: '接收訊息', en: 'Receive Messages', ja: 'メッセージ受信', ko: '메시지 수신' },
        'uc.receiveMessagesDesc': { zh: '允许其他用户给我发送私信', zht: '允許其他使用者給我發送私訊', en: 'Allow others to send me private messages', ja: '他のユーザーからのダイレクトメッセージを許可', ko: '다른 사용자가 나에게 쪽지를 보낼 수 있도록 허용' },
        'uc.emailNotifications': { zh: '邮件通知', zht: '郵件通知', en: 'Email Notifications', ja: 'メール通知', ko: '이메일 알림' },
        'uc.emailNotificationsDesc': { zh: '接收重要更新和活动邮件通知', zht: '接收重要更新和活動郵件通知', en: 'Receive important updates and activity notifications', ja: '重要な更新とアクティビティのメール通知を受信', ko: '중요한 업데이트 및 활동 알림 수신' },
        'uc.twoFactor': { zh: '双重验证', zht: '雙重驗證', en: 'Two-Factor Auth', ja: '二要素認証', ko: '2단계 인증' },
        'uc.twoFactorDesc': { zh: '启用账户双重验证保护', zht: '啟用帳戶雙重驗證保護', en: 'Enable two-factor authentication', ja: '二要素認証を有効にする', ko: '2단계 인증 활성화' },
        'uc.browseHistory': { zh: '浏览历史记录', zht: '瀏覽歷史記錄', en: 'Browse History', ja: '閲覧履歴', ko: '瀏覽 기록' },
        'uc.browseHistoryDesc': { zh: '保存我的浏览和搜索历史记录', zht: '儲存我的瀏覽和搜尋歷史記錄', en: 'Save my browsing and search history', ja: '閲覧・検索履歴を保存', ko: '瀏覽 및 검색 기록 저장' },
        'uc.saveSettings': { zh: '保存设置', zht: '儲存設定', en: 'Save Settings', ja: '設定を保存', ko: '설정 저장' },
        'uc.uploadAvatar': { zh: '上传新头像', zht: '上傳新頭像', en: 'Upload Avatar', ja: 'アバターをアップロード', ko: '아바타 업로드' },
        'uc.resetAvatar': { zh: '恢复默认头像', zht: '恢復預設頭像', en: 'Reset Avatar', ja: 'デフォルトに戻す', ko: '기본 아바타로 복원' },
        'uc.avatarHistory': { zh: '头像历史', zht: '頭像歷史', en: 'Avatar History', ja: 'アバター履歴', ko: '아바타 기록' },
        'uc.avatarFormats': { zh: '支持JPG、PNG、GIF格式，建议尺寸200x200像素', zht: '支援JPG、PNG、GIF格式，建議尺寸200x200像素', en: 'Supports JPG, PNG, GIF. Recommended 200x200px', ja: 'JPG、PNG、GIF対応。200x200px推奨', ko: 'JPG, PNG, GIF 지원. 200x200px 권장' },

        // AI Generate
        'ai.textToImage': { zh: '文生图', zht: '文生圖', en: 'Text to Image', ja: 'テキストから画像', ko: '텍스트→이미지' },
        'ai.imgToImg': { zh: '图生图', zht: '圖生圖', en: 'Image to Image', ja: '画像から画像', ko: '이미지→이미지' },
        'ai.styleTransfer': { zh: '风格迁移', zht: '風格遷移', en: 'Style Transfer', ja: 'スタイル転送', ko: '스타일 전송' },
        'ai.generate': { zh: '生成', zht: '生成', en: 'Generate', ja: '生成', ko: '생성' },
        'ai.templates': { zh: '游戏 UI 模板', zht: '遊戲 UI 範本', en: 'Game UI Templates', ja: 'ゲームUIテンプレート', ko: '게임 UI 템플릿' },
        'ai.extractPalette': { zh: '提取调色板', zht: '提取調色盤', en: 'Extract Palette', ja: 'パレット抽出', ko: '팔레트 추출' },
        'ai.assetEditor': { zh: '资产微调', zht: '資產微調', en: 'Asset Editor', ja: 'アセット微調整', ko: '에셋 미세 조정' },
        'ai.imageGenerate': { zh: '图片生成', zht: '圖片生成', en: 'Image Generate', ja: '画像生成', ko: '이미지 생성' },
        'ai.actionGroup': { zh: '角色动作组', zht: '角色動作組', en: 'Action Group', ja: 'キャラクターアクション', ko: '캐릭터 액션 그룹' },

        // Notifications
        'notif.title': { zh: '消息中心', zht: '訊息中心', en: 'Notifications', ja: '通知センター', ko: '알림 센터' },
        'notif.all': { zh: '全部消息', zht: '全部訊息', en: 'All', ja: 'すべて', ko: '전체' },
        'notif.unread': { zh: '未读消息', zht: '未讀訊息', en: 'Unread', ja: '未読', ko: '읽지 않음' },
        'notif.system': { zh: '系统通知', zht: '系統通知', en: 'System', ja: 'システム', ko: '시스템' },
        'notif.markAllRead': { zh: '全部已读', zht: '全部已讀', en: 'Mark all read', ja: 'すべて既読にする', ko: '모두 읽음 처리' },
        'notif.viewAll': { zh: '查看所有通知', zht: '檢視所有通知', en: 'View all notifications', ja: 'すべての通知を見る', ko: '모든 알림 보기' },

        // Footer / Misc
        'misc.poweredBy': { zh: '由 AI 驱动', zht: '由 AI 驅動', en: 'Powered by AI', ja: 'AI搭載', ko: 'AI 기반' },
        'misc.menu': { zh: '菜单', zht: '選單', en: 'Menu', ja: 'メニュー', ko: '메뉴' },
        'misc.notifications': { zh: '通知', zht: '通知', en: 'Notifications', ja: '通知', ko: '알림' },

        // Theme Settings
        'uc.themeSetting': { zh: '主题风格', zht: '主題風格', en: 'Theme Style', ja: 'テーマスタイル', ko: '테마 스타일' },
        'uc.themeOff': { zh: '赛博朋克', zht: '賽博朋克', en: 'Cyberpunk', ja: 'サイバーパンク', ko: '사이버펑크' },
        'uc.themeAuto': { zh: '跟随语言地区', zht: '跟隨語言地區', en: 'Follow Language & Region', ja: '言語・地域に合わせる', ko: '언어 및 지역 따르기' },
        'uc.themeDesc': { zh: '开启后页面风格将根据您的语言和地区自动变化，也可手动选择', zht: '開啟後頁面風格將根據您的語言和地區自動變化，也可手動選擇', en: 'When enabled, page style adapts to your language & region. You can also choose manually.', ja: '有効にすると、言語・地域に合わせてページスタイルが変わります。手動選択も可能です。', ko: '활성화하면 언어 및 지역에 따라 페이지 스타일이 변경됩니다. 수동 선택도 가능합니다.' },
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
        try { localStorage.setItem('artifex-lang', lang); } catch (e) { /* Safari private */ }
        applyTranslations();
        document.documentElement.lang = lang;
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
        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
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
        document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
            el.title = t(el.getAttribute('data-i18n-title'));
        });
        // Translate elements with data-i18n-aria attribute
        document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
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
    window.i18n = { t: t, setLanguage: setLanguage, getLanguage: getLanguage, getLanguages: getLanguages, applyTranslations: applyTranslations };
