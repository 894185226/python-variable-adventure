// ===== API 层（连接后端 MySQL 数据库） =====
// 后端地址配置
const API_BASE = 'http://localhost:3000/api';

// 调试开关：生产环境设为 false
const DEBUG = false;
const log = { log: DEBUG ? console.log.bind(console) : () => {}, warn: console.warn.bind(console), error: console.error.bind(console) };

// 通用错误提示条
function showToast(message, type = 'error') {
    const container = document.getElementById('achievementToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `achievement-toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = `
        <div class="achievement-toast-icon">${type === 'error' ? '⚠️' : '✅'}</div>
        <div class="achievement-toast-body">
            <div class="achievement-toast-title">${type === 'error' ? '提示' : '成功'}</div>
            <div class="achievement-toast-desc">${message}</div>
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
    }, 3000);
}

// 按钮加载态管理
function setButtonLoading(btn, loading) {
    if (!btn) return;
    const originalHTML = btn._originalHTML || btn.innerHTML;
    if (loading) {
        btn._originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span> 处理中...';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn._originalHTML;
        delete btn._originalHTML;
    }
}

// 暗色主题切换
const THEME_KEY = 'pv_theme';
function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcon(false);
    } else {
        // 默认暗色主题
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon(true);
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem(THEME_KEY, 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
    }
    updateThemeIcon(!isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'far fa-moon';
    }
}

// 图片懒加载渐入
function initLazyImages() {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        img.addEventListener('load', () => img.classList.add('loaded'));
        if (img.complete) img.classList.add('loaded');
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initLazyImages();
});

const API = {
    // 通用 fetch 封装
    async _fetch(url, options = {}) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                throw new Error(`服务器错误 (${res.status})`);
            }
            return await res.json();
        } catch (e) {
            if (e.name === 'TypeError' && e.message.includes('fetch')) {
                throw new Error('无法连接服务器，请确认后端已启动');
            }
            throw e;
        }
    },

    // 注册
    async register(username, password, displayName) {
        return await this._fetch(API_BASE + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, displayName })
        });
    },
    // 登录
    async login(username, password) {
        return await this._fetch(API_BASE + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
    },
    // 获取用户学习进度
    async getProgress(username) {
        return await this._fetch(API_BASE + '/progress/' + encodeURIComponent(username));
    },
    // 标记模块完成
    async markModuleCompleted(username, moduleId, score) {
        return await this._fetch(API_BASE + '/progress/mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, moduleId, score })
        });
    },
    // 颁发成就
    async awardAchievement(username, achievementId) {
        return await this._fetch(API_BASE + '/achievement/award', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, achievementId })
        });
    }
};

// ===== 本地进度管理（未登录时用 localStorage 持久化） =====
const LOCAL_PROGRESS_KEY = 'pv_local_progress';
const LOCAL_ACHIEVEMENTS_KEY = 'pv_local_achievements';

function getLocalProgress() {
    try {
        const data = localStorage.getItem(LOCAL_PROGRESS_KEY);
        return data ? JSON.parse(data) : { modules: {}, achievements: {}, loginDates: [] };
    } catch (e) {
        return { modules: {}, achievements: {}, loginDates: [] };
    }
}

function saveLocalProgress(progress) {
    try {
        localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
        log.warn('localStorage 存储失败，可能已满');
    }
}

function getLocalAchievements() {
    try {
        const data = localStorage.getItem(LOCAL_ACHIEVEMENTS_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

function saveLocalAchievement(achId) {
    const ach = getLocalAchievements();
    ach[achId] = new Date().toISOString();
    try {
        localStorage.setItem(LOCAL_ACHIEVEMENTS_KEY, JSON.stringify(ach));
    } catch (e) {
        log.warn('localStorage 存储失败');
    }
}

// 登录时将本地进度同步到后端
async function syncLocalProgressToBackend(username) {
    const localProgress = getLocalProgress();
    const localAchievements = getLocalAchievements();
    const modules = Object.keys(localProgress.modules);

    if (modules.length === 0 && Object.keys(localAchievements).length === 0) return;

    log.log(`正在同步 ${modules.length} 个模块进度到服务器...`);

    // 同步模块进度
    for (const moduleId of modules) {
        try {
            await API.markModuleCompleted(username, moduleId);
        } catch (e) {
            log.warn(`同步模块 ${moduleId} 失败:`, e.message);
        }
    }

    // 同步成就
    for (const achId of Object.keys(localAchievements)) {
        try {
            await API.awardAchievement(username, achId);
        } catch (e) {
            log.warn(`同步成就 ${achId} 失败:`, e.message);
        }
    }

    // 同步完成后清除本地数据
    try {
        localStorage.removeItem(LOCAL_PROGRESS_KEY);
        localStorage.removeItem(LOCAL_ACHIEVEMENTS_KEY);
    } catch (e) {
        log.warn('清除本地缓存失败');
    }
}

// 会话管理（仅存当前用户名，敏感操作走后端）
function getCurrentUser() {
    const data = sessionStorage.getItem('pv_current_user');
    return data ? JSON.parse(data) : null;
}
function setCurrentUser(user) {
    if (user) {
        sessionStorage.setItem('pv_current_user', JSON.stringify(user));
    } else {
        sessionStorage.removeItem('pv_current_user');
    }
}

// 成就定义
const ACHIEVEMENTS = [
    { id: 'beginner', icon: '⭐', name: '入门之星', desc: '完成情境导入和知识讲解', check: (p) => p.modules['intro'] && p.modules['lesson'] },
    { id: 'judge', icon: '⚖️', name: '公正小法官', desc: '在命名小法官中获得8分以上', check: (p) => p.modules['judge'] },
    { id: 'debugger', icon: '🔧', name: '调试能手', desc: '修复所有bug（完成错误调试诊所）', check: (p) => p.modules['debug'] },
    { id: 'creator', icon: '🎨', name: '创意达人', desc: '完成创意项目制作', check: (p) => p.modules['project'] },
    { id: 'champion', icon: '🏆', name: '全能学霸', desc: '完成全部10个模块', check: (p) => Object.keys(p.modules).length >= 10 },
    { id: 'tracer', icon: '🔍', name: '追踪大师', desc: '完成值追踪挑战', check: (p) => p.modules['trace'] },
    { id: 'explorer', icon: '🧪', name: '实验先锋', desc: '完成类比实验室', check: (p) => p.modules['lab'] },
    { id: 'coder', icon: '💻', name: '编程新星', desc: '完成实践操作', check: (p) => p.modules['practice'] }
];

// 受保护的模块（需要登录才能访问，welcome 和 achievement 除外）
const PROTECTED_MODULES = ['intro', 'lesson', 'judge', 'debug', 'practice', 'trace', 'lab', 'extend', 'project', 'test'];
let pendingModuleId = null; // 登录后要跳转的目标模块

// ===== 用户认证系统 =====
function openLoginModal() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        // 已登录，询问是否退出
        if (confirm(currentUser.displayName + '，你要退出登录吗？')) {
            setCurrentUser(null);
            updateLoginUI();
            // 退出后刷新页面，回到未登录状态（仅显示基础介绍）
            location.reload();
        }
        return;
    }
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    pendingModuleId = null;
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    pendingModuleId = null;
}

function closeAllModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'none';
    pendingModuleId = null;
}

// 保留兼容旧调用
function closeLoginModal_old() {
    closeAllModals();
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    const submitBtn = document.querySelector('#loginForm .form-submit-btn');

    setButtonLoading(submitBtn, true);
    let result;
    try {
        result = await API.login(username, password);
    } catch (e) {
        errorEl.textContent = e.message || '网络错误，请稍后重试';
        errorEl.classList.remove('w3-hide');
        setButtonLoading(submitBtn, false);
        return false;
    }
    setButtonLoading(submitBtn, false);

    if (!result.success) {
        errorEl.textContent = result.error;
        errorEl.classList.remove('w3-hide');
        return false;
    }

    // 登录成功
    setCurrentUser(result.user);
    closeLoginModal();
    updateLoginUI();
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    errorEl.classList.add('w3-hide');
    
    // 同步本地进度到后端
    await syncLocalProgressToBackend(result.user.username);
    
    // 刷新成就墙
    renderAchievementWall();

    // 如果有待跳转的目标模块，自动跳转
    if (pendingModuleId) {
        const target = pendingModuleId;
        pendingModuleId = null;
        switchModule(target);
    }
    
    return false;
}

async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const displayName = document.getElementById('regDisplayName').value.trim();
    const errorEl = document.getElementById('registerError');
    const submitBtn = document.querySelector('#registerForm .form-submit-btn');

    if (username.length < 2) {
        errorEl.textContent = '用户名至少需要2个字符！';
        errorEl.classList.remove('w3-hide');
        return false;
    }
    if (password.length < 4) {
        errorEl.textContent = '密码至少需要4个字符！';
        errorEl.classList.remove('w3-hide');
        return false;
    }

    setButtonLoading(submitBtn, true);
    let result;
    try {
        result = await API.register(username, password, displayName);
    } catch (e) {
        errorEl.textContent = e.message || '网络错误，请稍后重试';
        errorEl.classList.remove('w3-hide');
        setButtonLoading(submitBtn, false);
        return false;
    }
    setButtonLoading(submitBtn, false);

    if (!result.success) {
        errorEl.textContent = result.error;
        errorEl.classList.remove('w3-hide');
        return false;
    }

    // 注册成功，自动登录
    setCurrentUser({ username, displayName });
    closeRegisterModal();
    updateLoginUI();
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regDisplayName').value = '';
    renderAchievementWall();

    // 如果有待跳转的目标模块，自动跳转
    if (pendingModuleId) {
        const target = pendingModuleId;
        pendingModuleId = null;
        switchModule(target);
    }
    
    return false;
}

function updateLoginUI() {
    const currentUser = getCurrentUser();
    const btnText = document.getElementById('loginBtnText');
    const btn = document.querySelector('.signin-btn');
    
    if (currentUser) {
        btnText.textContent = currentUser.displayName;
        btn.classList.add('logged-in');
        btn.title = '点击退出登录';
    } else {
        btnText.textContent = '登录';
        btn.classList.remove('logged-in');
        btn.title = '';
    }
}

// ===== 学习进度追踪 =====
async function markModuleCompleted(moduleId) {
    const currentUser = getCurrentUser();

    if (currentUser) {
        // 已登录：保存到后端
        try {
            await API.markModuleCompleted(currentUser.username, moduleId);
        } catch (e) {
            log.error('保存进度失败，将存入本地:', e.message);
            saveLocalModule(moduleId);
        }

        // 检查并颁发成就
        try {
            const newAch = await checkAndAwardAchievements(currentUser.username);
            if (newAch.length > 0) {
                log.log('新成就：', newAch);
                newAch.forEach(ach => showAchievementToast(ach));
            }
        } catch (e) {
            log.error('检查成就失败:', e.message);
        }
    } else {
        // 未登录：存入 localStorage
        saveLocalModule(moduleId);
        // 本地也检查成就
        checkLocalAchievements();
    }
}

// 保存单个模块到 localStorage
function saveLocalModule(moduleId) {
    const progress = getLocalProgress();
    if (!progress.modules[moduleId]) {
        progress.modules[moduleId] = true;
        if (!progress.loginDates.includes(new Date().toLocaleDateString('zh-CN'))) {
            progress.loginDates.push(new Date().toLocaleDateString('zh-CN'));
        }
        saveLocalProgress(progress);
    }
}

// 检查本地成就
function checkLocalAchievements() {
    const progress = getLocalProgress();
    const earned = getLocalAchievements();
    let hasNew = false;

    ACHIEVEMENTS.forEach(ach => {
        if (!earned[ach.id] && ach.check(progress)) {
            saveLocalAchievement(ach.id);
            showAchievementToast(ach);
            hasNew = true;
        }
    });

    if (hasNew) {
        renderAchievementWall();
    }
}

async function checkAndAwardAchievements(username) {
    try {
        const progress = await API.getProgress(username);
        const newAchievements = [];
        
        for (const ach of ACHIEVEMENTS) {
            if (ach.check(progress)) {
                if (!progress.achievements[ach.id]) {
                    try {
                        await API.awardAchievement(username, ach.id);
                        newAchievements.push(ach);
                    } catch (e) {
                        log.warn(`颁发成就 ${ach.id} 失败:`, e.message);
                    }
                }
            }
        }
        
        return newAchievements;
    } catch (e) {
        log.error('检查成就失败:', e.message);
        return [];
    }
}

// ===== 成就弹出提示 =====
function showAchievementToast(achievement) {
    const container = document.getElementById('achievementToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div class="achievement-toast-icon">${achievement.icon}</div>
        <div class="achievement-toast-body">
            <div class="achievement-toast-title">🏆 成就达成</div>
            <div class="achievement-toast-name">${achievement.name}</div>
            <div class="achievement-toast-desc">${achievement.desc}</div>
        </div>
    `;

    container.appendChild(toast);

    // 2.5秒后播放消失动画，3秒后移除元素
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }, 2500);
}

// ===== 成就墙渲染 =====
async function renderAchievementWall() {
    const currentUser = getCurrentUser();
    const userNameEl = document.getElementById('achievementUserName');
    const mapGrid = document.getElementById('mapGrid');
    const progressSummary = document.getElementById('progressSummary');
    const progressBar = document.getElementById('progressBar');
    const achievementList = document.getElementById('achievementList');
    const learningStats = document.getElementById('learningStats');

    let progress;

    if (!currentUser) {
        // 未登录状态：使用 localStorage 数据
        progress = getLocalProgress();
        const achievements = getLocalAchievements();

        if (userNameEl) userNameEl.textContent = '未登录 - 进度已本地保存，登录后可同步！';

        updateMapGrid(progress);

        const completedCount = Object.keys(progress.modules).length;
        const totalModules = 10;
        const percent = Math.round((completedCount / totalModules) * 100);

        if (progressSummary) {
            progressSummary.textContent = `总进度：${completedCount}/${totalModules} 模块完成 (${percent}%)`;
        }
        if (progressBar) {
            progressBar.style.width = percent + '%';
            progressBar.textContent = percent + '%';
        }

        // 显示成就列表
        if (achievementList) {
            achievementList.innerHTML = ACHIEVEMENTS.map(ach => {
                const earned = !!achievements[ach.id];
                const dateStr = earned ? new Date(achievements[ach.id]).toLocaleDateString('zh-CN') : '';
                return `
                    <div class="achievement-item ${earned ? 'earned' : 'locked'}">
                        <span class="ach-icon">${ach.icon}</span>
                        <div class="ach-info">
                            <h4>${ach.icon} ${ach.name}</h4>
                            <p>${ach.desc}</p>
                        </div>
                        ${earned ? `<span class="achievement-date">${dateStr}</span>` : '<span class="achievement-date">未获得</span>'}
                    </div>
                `;
            }).join('');
        }

        // 学习统计
        if (learningStats) {
            learningStats.style.display = 'block';
            document.getElementById('statCompleted').textContent = completedCount;
            document.getElementById('statAchievements').textContent = Object.keys(achievements).length;
            document.getElementById('statDays').textContent = progress.loginDates.length;
        }
        return;
    }

    // 已登录：使用后端数据
    try {
        progress = await API.getProgress(currentUser.username);
    } catch (e) {
        log.error('获取进度失败:', e.message);
        if (achievementList) achievementList.innerHTML = '<p style="text-align:center;color:#999;">无法连接服务器，请检查网络</p>';
        return;
    }

    if (userNameEl) {
        userNameEl.textContent = currentUser.displayName + ' 的学习成果';
    }
    
    // 更新探险地图
    updateMapGrid(progress);
    
    // 更新进度条
    const completedCount = Object.keys(progress.modules).length;
    const totalModules = 10;
    const percent = Math.round((completedCount / totalModules) * 100);
    
    if (progressSummary) {
        progressSummary.textContent = `总进度：${completedCount}/${totalModules} 模块完成 (${percent}%)`;
    }
    if (progressBar) {
        progressBar.style.width = percent + '%';
        progressBar.textContent = percent + '%';
    }
    
    // 更新成就列表
    if (achievementList) {
        achievementList.innerHTML = ACHIEVEMENTS.map(ach => {
            const earnedDate = progress.achievements[ach.id];
            const earned = !!earnedDate;
            const dateStr = earnedDate ? new Date(earnedDate).toLocaleDateString('zh-CN') : '';
            return `
                <div class="achievement-item ${earned ? 'earned' : 'locked'}">
                    <span class="ach-icon">${ach.icon}</span>
                    <div class="ach-info">
                        <h4>${ach.icon} ${ach.name}</h4>
                        <p>${ach.desc}</p>
                    </div>
                    ${earned ? `<span class="achievement-date">${dateStr}</span>` : '<span class="achievement-date">未获得</span>'}
                </div>
            `;
        }).join('');
    }
    
    // 更新学习统计
    if (learningStats) {
        learningStats.style.display = 'block';
        document.getElementById('statCompleted').textContent = completedCount;
        document.getElementById('statAchievements').textContent = Object.keys(progress.achievements).length;
        document.getElementById('statDays').textContent = progress.loginDates.length;
    }
}

function updateMapGrid(progress) {
    const mapItems = document.querySelectorAll('.map-item[data-module-id]');
    if (!mapItems.length) return;
    
    mapItems.forEach(item => {
        const moduleId = item.getAttribute('data-module-id');
        if (progress && progress.modules[moduleId]) {
            item.classList.add('completed');
        } else {
            item.classList.remove('completed');
        }
    });
}
const state = {
    currentModule: 'welcome',
    judgeScore: 0,
    judgeQuestions: [
        { name: 'my_name', valid: true, reason: '符合命名规则' },
        { name: '2name', valid: false, reason: '不能以数字开头' },
        { name: 'user-name', valid: false, reason: '不能包含连字符' },
        { name: 'class', valid: false, reason: 'class是Python关键字' },
        { name: 'Age', valid: true, reason: '符合命名规则' },
        { name: 'my name', valid: false, reason: '不能包含空格' },
        { name: '_private', valid: true, reason: '可以以下划线开头' },
        { name: '姓名', valid: true, reason: 'Python支持中文变量名' },
        { name: 'if', valid: false, reason: 'if是Python关键字' },
        { name: 'score123', valid: true, reason: '符合命名规则' }
    ],
    currentJudgeIndex: 0,
    debugMedals: 0,
    currentBugIndex: 0,
    bugs: [
        {
            code: 'print(score)',
            question: '这段代码会报错，为什么？',
            options: [
                { text: 'print拼写错误', correct: false },
                { text: '变量score未定义', correct: true },
                { text: '缺少分号', correct: false },
                { text: '括号不匹配', correct: false }
            ]
        },
        {
            code: 'name = 小明',
            question: '这段代码会报错，为什么？',
            options: [
                { text: '变量名错误', correct: false },
                { text: '字符串需要加引号', correct: true },
                { text: '赋值符号错误', correct: false },
                { text: '缺少括号', correct: false }
            ]
        },
        {
            code: '2age = 12',
            question: '这段代码会报错，为什么？',
            options: [
                { text: '数字不能赋值给变量', correct: false },
                { text: '变量名不能以数字开头', correct: true },
                { text: '缺少等号', correct: false },
                { text: '语法错误', correct: false }
            ]
        },
        {
            code: 'my name = "张三"',
            question: '这段代码会报错，为什么？',
            options: [
                { text: '变量名不能有空格', correct: true },
                { text: '字符串格式错误', correct: false },
                { text: '缺少引号', correct: false },
                { text: '赋值错误', correct: false }
            ]
        },
        {
            code: 'x = 5\ny = x + "2"',
            question: '这段代码会报错，为什么？',
            options: [
                { text: '变量y未定义', correct: false },
                { text: '不能将数字和字符串直接相加', correct: true },
                { text: '缺少分号', correct: false },
                { text: '缩进错误', correct: false }
            ]
        }
    ],
    testAnswers: {},
    questions: [
        {
            question: '以下哪个是合法的Python变量名？',
            options: ['2var', 'my-var', 'my_var', 'var!'],
            correct: 2
        },
        {
            question: '语句 x = 10 的含义是？',
            options: ['x等于10', '将10赋值给x', 'x加10', 'x减10'],
            correct: 1
        },
        {
            question: '执行 x = 5; x = x + 1 后，x的值是？',
            options: ['5', '6', '1', '错误'],
            correct: 1
        },
        {
            question: '以下哪个是Python的关键字？',
            options: ['name', 'age', 'class', 'score'],
            correct: 2
        },
        {
            question: '交换两个变量a和b的值，需要？',
            options: ['直接交换', '引入临时变量', '使用加法', '无法交换'],
            correct: 1
        }
    ],
    traceStep: 0,
    traceVariables: { x: '?', y: '?', z: '?' },
    currentLevel: 1
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化主题
    initTheme();
    // 初始化用户登录UI
    updateLoginUI();
    
    initWelcomeModule();
    initNavigation();
    initIntroModule();
    initLessonModule();
    initLabModule();
    initJudgeModule();
    initPracticeModule();
    initTraceModule();
    initDebugModule();
    initExtendModule();
    initProjectModule();
    initTestModule();
    initTypewriterEffect();
    initScrollReveal();
    
    // 如果在成就墙模块，刷新显示
    renderAchievementWall();

    // 全局键盘快捷键
    window.addEventListener('keydown', (e) => {
        // Esc - 关闭所有弹窗
        if (e.key === 'Escape') {
            closeAllModals();
            closeMobileMenu();
        }
        // Ctrl+K / Cmd+K - 聚焦搜索框
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

    // 浏览器前进/后退支持
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        if (hash && hash !== state.currentModule) {
            switchModule(hash);
        }
    });

    // 初始 hash 处理（支持书签直接跳转）
    const initHash = window.location.hash.replace('#', '');
    if (initHash && initHash !== 'welcome') {
        switchModule(initHash);
    }
});

// 欢迎模块
function initWelcomeModule() {
    const startBtn = document.getElementById('start-learning');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // 切换到情境导入模块
            switchModule('intro');
        });
    }
}

// 导航模块 - W3Schools风格下拉菜单
function initNavigation() {
    // Logo链接点击事件 - 返回首页
    const logoLink = document.querySelector('.logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', function(e) {
            e.preventDefault();
            switchModule('welcome');
        });
    }
    
    // 下拉菜单功能由全局 openNavItem 函数处理（HTML onclick 调用）
    // 此处不再重复绑定事件，避免冲突
    
    // 点击页面其他地方关闭下拉菜单
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.w3-top')) {
            const allNavs = document.querySelectorAll('.w3-dropdown-content');
            allNavs.forEach(nav => nav.classList.add('w3-hide'));
        }
    });
    
    // 移动端菜单
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            const moduleId = this.dataset.module;
            switchModule(moduleId);
            closeMobileMenu();
        });
    });
    
    // 导航链接（包含所有带有 data-module 属性的链接）
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link, .w3-button[data-module]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const moduleId = this.dataset.module;
            if (moduleId) {
                switchModule(moduleId);
            }
            
            // 关闭下拉菜单
            const allNavs = document.querySelectorAll('.w3-dropdown-content');
            allNavs.forEach(nav => nav.classList.add('w3-hide'));
        });
    });
    
    // 页脚链接
    const footerLinks = document.querySelectorAll('.footer-section a[href^="#"]');
    footerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const moduleId = this.getAttribute('href').substring(1);
            switchModule(moduleId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// 全局函数 - 打开导航菜单（供HTML onclick调用）
function openNavItem(navId) {
    const allNavs = document.querySelectorAll('.w3-dropdown-content');
    const targetNav = document.getElementById('nav_' + navId);
    
    // 隐藏其他菜单
    allNavs.forEach(function(nav) {
        if (nav !== targetNav) {
            nav.classList.add('w3-hide');
        }
    });
    
    // 切换当前菜单
    if (targetNav) {
        targetNav.classList.toggle('w3-hide');
    }
}

// 切换下拉菜单
function toggleNavItem(navId) {
    const allNavs = document.querySelectorAll('.w3-dropdown-content');
    const targetNav = document.getElementById(`nav_${navId}`);
    
    if (targetNav) {
        allNavs.forEach(nav => {
            if (nav.id !== `nav_${navId}`) {
                nav.classList.add('w3-hide');
            }
        });
        
        if (targetNav.classList.contains('w3-hide')) {
            targetNav.classList.remove('w3-hide');
        } else {
            targetNav.classList.add('w3-hide');
        }
    }
}

// ===== 搜索关键词映射 =====
const SEARCH_KEYWORDS = [
    { keywords: ['变量', 'variable', '盒子', '情境', '场景', '导入', '介绍'], moduleId: 'intro', name: '情境导入', icon: '🎬', desc: '了解为什么需要变量' },
    { keywords: ['实验室', '拖拽', '标签', '数据', '拖动', '类比'], moduleId: 'lab', name: '生活类比实验室', icon: '🧪', desc: '拖拽体验变量概念' },
    { keywords: ['知识', '讲解', '概念', '命名', '规则', '赋值', '赋值符号', '学习', '教程'], moduleId: 'lesson', name: '知识讲解', icon: '📚', desc: '学习变量核心概念' },
    { keywords: ['法官', '合法', '非法', '判断', '命名规则', '判断题'], moduleId: 'judge', name: '命名小法官', icon: '⚖️', desc: '判断变量名合法性' },
    { keywords: ['实践', '操作', '代码', '运行', '编程', '练习', '写代码'], moduleId: 'practice', name: '实践操作', icon: '💻', desc: '动手编写变量代码' },
    { keywords: ['追踪', '值', '跟踪', '变量值', '变化'], moduleId: 'trace', name: '值追踪挑战', icon: '🔍', desc: '追踪变量值变化' },
    { keywords: ['错误', 'bug', '调试', '修复', '诊所', '纠错', '改错'], moduleId: 'debug', name: '错误调试诊所', icon: '🏥', desc: '找出并修复代码bug' },
    { keywords: ['扩展', '思维', '挑战', '交换', '拼接', '句子'], moduleId: 'extend', name: '扩展思维', icon: '🚀', desc: '高阶变量操作挑战' },
    { keywords: ['创意', '项目', '名片', '制作', '生成'], moduleId: 'project', name: '创意迷你项目', icon: '🎨', desc: '制作个人电子名片' },
    { keywords: ['测验', '测试', '考试', '小测', '题目', '选择题'], moduleId: 'test', name: '课堂小测', icon: '📝', desc: '检验学习成果' },
    { keywords: ['成就', '进度', '成果', '墙', '学习记录', '探险地图'], moduleId: 'achievement', name: '成就墙', icon: '🏆', desc: '查看学习成果与成就' }
];

// 根据输入文本匹配模块
function matchModules(searchTerm) {
    if (!searchTerm) return SEARCH_KEYWORDS.map(m => ({ ...m, score: 0 }));
    const term = searchTerm.toLowerCase();
    const results = [];
    
    SEARCH_KEYWORDS.forEach(entry => {
        let maxScore = 0;
        entry.keywords.forEach(kw => {
            const lowerKw = kw.toLowerCase();
            if (lowerKw === term) {
                maxScore = Math.max(maxScore, 100); // 完全匹配
            } else if (lowerKw.startsWith(term)) {
                maxScore = Math.max(maxScore, 80); // 前缀匹配
            } else if (lowerKw.includes(term)) {
                maxScore = Math.max(maxScore, 50); // 包含匹配
            } else {
                // 模糊匹配：计算最长公共子序列
                const lcsLen = longestCommonSubseq(term, lowerKw);
                const ratio = lcsLen / Math.max(term.length, lowerKw.length);
                if (ratio > 0.5) {
                    maxScore = Math.max(maxScore, Math.round(ratio * 30));
                }
            }
        });
        if (maxScore > 0 || !searchTerm) {
            results.push({ ...entry, score: maxScore });
        }
    });
    
    results.sort((a, b) => b.score - a.score);
    return results;
}

// 最长公共子序列长度
function longestCommonSubseq(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}

// 搜索建议下拉
function showSearchSuggestions(inputId) {
    try {
        const input = document.getElementById(inputId);
        if (!input) return;
        const searchTerm = input.value.trim();
        const results = matchModules(searchTerm).slice(0, 6);

        // 找到对应的建议容器
        const suggestionsId = inputId === 'hero-search-input' ? 'hero-search-suggestions' : 'search-suggestions';
        const suggestionsEl = document.getElementById(suggestionsId);
        if (!suggestionsEl) return;

        if (results.length === 0 || !searchTerm) {
            suggestionsEl.classList.remove('active');
        } else {
            suggestionsEl.innerHTML = results.map(r => `
                <div class="search-suggestion-item" onclick="navigateToModule('${r.moduleId}')">
                    <span class="search-suggestion-icon">${r.icon}</span>
                    <div>
                        <div class="search-suggestion-text">${r.name}</div>
                        <div class="search-suggestion-desc">${r.desc}</div>
                    </div>
                </div>
            `).join('');
            suggestionsEl.classList.add('active');
        }
    } catch (e) {
        log.error('搜索建议出错:', e);
    }
}

// 跳转到模块
function navigateToModule(moduleId) {
    try {
        // 隐藏所有建议下拉
        document.querySelectorAll('.search-suggestions').forEach(el => el.classList.remove('active'));
        switchModule(moduleId);
    } catch (e) {
        log.error('导航出错:', e);
    }
}

// 搜索功能（提交时调用）
function search(inputId) {
    try {
        const input = document.getElementById(inputId);
        if (!input) return false;
        const searchTerm = input.value.trim();
        if (!searchTerm) return false;

        const results = matchModules(searchTerm);
        if (results.length > 0) {
            // 隐藏建议下拉
            document.querySelectorAll('.search-suggestions').forEach(el => el.classList.remove('active'));
            switchModule(results[0].moduleId);
        } else {
            alert(`未找到与"${searchTerm}"相关的内容，请尝试：变量、代码、调试、测验等关键词`);
        }
    } catch (e) {
        log.error('搜索出错:', e);
    }
    return false;
}

// 点击其他地方关闭搜索建议
document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container') && !e.target.closest('.hero-form')) {
        document.querySelectorAll('.search-suggestions').forEach(el => el.classList.remove('active'));
    }
});

// 移动端菜单控制
function toggleMobileMenu() {
    document.getElementById('mobileMenuModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // 锁定背景滚动
}

function closeMobileMenu() {
    document.getElementById('mobileMenuModal').style.display = 'none';
    document.body.style.overflow = ''; // 恢复滚动
}

function switchModule(moduleId) {
    const modules = document.querySelectorAll('.module');
    const targetModule = document.getElementById(moduleId);
    
    if (!targetModule) {
        log.error('Module not found:', moduleId);
        return;
    }

    // 检查是否需要登录
    if (PROTECTED_MODULES.includes(moduleId)) {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            // 未登录：记录目标模块，弹出登录弹窗
            pendingModuleId = moduleId;
            openLoginModal();
            return;
        }
    }
    
    // 离开情境导入时清理动画，避免内存泄漏
    if (state.currentModule === 'intro') {
        stopIntroAnimations();
    }
    
    modules.forEach(module => module.classList.remove('active'));
    targetModule.classList.add('active');
    state.currentModule = moduleId;

    // 更新 URL hash（用于书签和浏览器前进后退）
    window.location.hash = '#' + moduleId;

    // 高亮导航栏当前模块
    updateNavActiveState(moduleId);

    // 注意：不再在此处自动标记模块完成
    // 各模块需在用户实际完成交互后才调用 markModuleCompleted()
    
    // 如果切换到成就墙页面，刷新显示
    if (moduleId === 'achievement') {
        renderAchievementWall();
    }
    // 如果切换到知识讲解，刷新按钮状态
    if (moduleId === 'lesson') {
        refreshLessonButton();
    }

    // 平滑滚动到模块顶部
    setTimeout(() => {
        targetModule.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
}

// 更新导航栏激活状态
function updateNavActiveState(moduleId) {
    // 桌面端导航项（仅下拉菜单触发按钮）
    document.querySelectorAll('.w3-bar > .w3-bar-item.w3-hide-small > .w3-button.w3-hover-green').forEach(item => {
        item.classList.remove('active-nav');
    });
    // 移动端导航项
    document.querySelectorAll('.mobile-nav-link').forEach(item => {
        item.classList.remove('active-nav');
    });
    
    // 根据当前模块高亮对应导航项
    const navMap = {
        'intro': 'tutorials',
        'lesson': 'tutorials',
        'lab': 'tutorials',
        'practice': 'practice',
        'judge': 'practice',
        'trace': 'practice',
        'debug': 'challenge',
        'extend': 'challenge',
        'test': 'challenge',
        'project': 'project',
        'achievement': 'project'
    };
    
    const navId = navMap[moduleId];
    if (navId) {
        const desktopBtns = document.querySelectorAll('.w3-bar > .w3-bar-item.w3-hide-small > .w3-button.w3-hover-green');
        desktopBtns.forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            if (onclick.includes(`'${navId}'`)) {
                btn.classList.add('active-nav');
            }
        });
    }
}

// 情境导入模块
function initIntroModule() {
    const sceneButtons = document.querySelectorAll('.scene-btn');
    const visitedScenes = new Set();

    sceneButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetScene = btn.dataset.target;
            const scenes = document.querySelectorAll('.scene');
            scenes.forEach(scene => scene.classList.remove('active'));
            document.querySelector(`.scene[data-scene="${targetScene}"]`).classList.add('active');

            // 追踪场景访问，三个场景都看过才算完成
            visitedScenes.add(targetScene);
            if (visitedScenes.size >= 3) {
                markModuleCompleted('intro');
            }
        });
    });

    // 动画效果
    startIntroAnimations();
}

// 情境导入动画管理（存储 interval ID 避免内存泄漏）
const _introAnimIntervals = [];

function startIntroAnimations() {
    animateScore();
    animateNames();
    animateCountdown();
}

function stopIntroAnimations() {
    _introAnimIntervals.forEach(id => clearInterval(id));
    _introAnimIntervals.length = 0;
}

function animateScore() {
    const scoreSpan = document.querySelector('.score');
    if (!scoreSpan) return;
    let score = 0;
    _introAnimIntervals.push(setInterval(() => {
        score += Math.floor(Math.random() * 10) + 1;
        scoreSpan.textContent = score;
        if (score >= 100) score = 0;
    }, 200));
}

function animateNames() {
    const names = ['张三', '李四', '王五', '赵六', '小明'];
    const nameSpan = document.querySelector('.name');
    if (!nameSpan) return;
    let index = 0;
    _introAnimIntervals.push(setInterval(() => {
        index = (index + 1) % names.length;
        nameSpan.textContent = names[index];
    }, 1500));
}

function animateCountdown() {
    const countdownSpan = document.querySelector('.countdown');
    if (!countdownSpan) return;
    let count = 10;
    _introAnimIntervals.push(setInterval(() => {
        count--;
        countdownSpan.textContent = count;
        if (count <= 0) {
            count = 10;
        }
    }, 1000));
}

// 知识讲解模块
function initLessonModule() {
    const completeBtn = document.getElementById('lesson-complete-btn');
    if (!completeBtn) return;

    completeBtn.addEventListener('click', async () => {
        await markModuleCompleted('lesson');
        completeBtn.textContent = '✅ 已学完';
        completeBtn.disabled = true;
        completeBtn.style.opacity = '0.6';
    });

    // 检查是否已完成，更新按钮状态
    refreshLessonButton();
}

async function refreshLessonButton() {
    const completeBtn = document.getElementById('lesson-complete-btn');
    if (!completeBtn) return;
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    try {
        const progress = await API.getProgress(currentUser.username);
        if (progress.modules['lesson']) {
            completeBtn.textContent = '✅ 已学完';
            completeBtn.disabled = true;
            completeBtn.style.opacity = '0.6';
        }
    } catch (e) {
        // 静默处理
    }
}

// 生活类比实验室模块
function initLabModule() {
    const dragItems = document.querySelectorAll('.drag-item');
    const variableBox = document.getElementById('variable-box');
    const boxLabelArea = document.getElementById('box-label-area');
    const boxValueArea = document.getElementById('box-value-area');
    const boxType = document.getElementById('box-type');
    const codeLabel = document.querySelector('.code-label');
    const codeValue = document.querySelector('.code-value');

    let currentLabel = '';
    let currentValue = '';
    let currentValueType = '';
    let labLabelDropped = false;
    let labValueDropped = false;

    function checkLabComplete() {
        if (labLabelDropped && labValueDropped) {
            markModuleCompleted('lab');
        }
    }

    dragItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('type', item.dataset.type);
            e.dataTransfer.setData('value', item.dataset.value);
            if (item.classList.contains('text')) {
                e.dataTransfer.setData('dataType', 'text');
            } else if (item.classList.contains('number')) {
                e.dataTransfer.setData('dataType', 'number');
            }
        });
    });

    variableBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        variableBox.classList.add('dragover');
    });

    variableBox.addEventListener('dragleave', () => {
        variableBox.classList.remove('dragover');
    });

    variableBox.addEventListener('drop', (e) => {
        e.preventDefault();
        variableBox.classList.remove('dragover');

        const type = e.dataTransfer.getData('type');
        const value = e.dataTransfer.getData('value');
        const dataType = e.dataTransfer.getData('dataType');

        if (type === 'label') {
            currentLabel = value;
            labLabelDropped = true;
            boxLabelArea.textContent = value;
            codeLabel.textContent = value;
            variableBox.style.borderColor = 'var(--primary-purple)';
        } else if (type === 'data') {
            currentValue = value;
            labValueDropped = true;
            currentValueType = dataType;
            boxValueArea.textContent = value;
            codeValue.textContent = dataType === 'text' ? `"${value}"` : value;
            
            if (dataType === 'number') {
                variableBox.style.borderColor = 'var(--success)';
                boxType.textContent = '类型: 数字';
            } else {
                variableBox.style.borderColor = 'var(--info)';
                boxType.textContent = '类型: 文字';
            }
        }
        checkLabComplete();
    });
}

// 命名小法官模块
function initJudgeModule() {
    const validBtn = document.getElementById('btn-valid');
    const invalidBtn = document.getElementById('btn-invalid');
    const feedback = document.getElementById('judge-feedback');
    const scoreDisplay = document.getElementById('judge-score');
    const answeredDisplay = document.getElementById('judge-answered');
    const resetBtn = document.getElementById('judge-reset-btn');

    // 使用全局 state 追踪评分
    if (typeof state.judgeAnswered === 'undefined') state.judgeAnswered = 0;
    if (typeof state.judgeScore === 'undefined') state.judgeScore = 0;
    let shuffledQuestions = [...state.judgeQuestions]; // 打乱的副本

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // 初始打乱
    shuffleArray(shuffledQuestions);

    function resetJudge() {
        state.judgeAnswered = 0;
        state.judgeScore = 0;
        scoreDisplay.textContent = '0';
        answeredDisplay.textContent = '0';
        shuffleArray(shuffledQuestions);
        state.currentJudgeIndex = 0;
        feedback.textContent = '';
        validBtn.disabled = false;
        invalidBtn.disabled = false;
        resetBtn.style.display = 'none';
        showCurrentQuestion();
    }

    function showCurrentQuestion() {
        const current = shuffledQuestions[state.currentJudgeIndex];
        document.getElementById('current-variable').textContent = current.name;
        feedback.textContent = '';
    }

    function checkAnswer(isValid) {
        if (validBtn.disabled) return;

        const current = shuffledQuestions[state.currentJudgeIndex];
        const questionEl = document.getElementById('current-variable');
        
        if (isValid === current.valid) {
            feedback.textContent = `✅ 回答正确！${current.reason}`;
            feedback.className = 'feedback-correct';
            state.judgeScore++;
            scoreDisplay.textContent = state.judgeScore;
            scoreDisplay.classList.add('bounce-in');
            setTimeout(() => scoreDisplay.classList.remove('bounce-in'), 500);

            if (state.judgeScore >= 8) {
                markModuleCompleted('judge');
            }
        } else {
            feedback.textContent = `❌ 回答错误！${current.reason}`;
            feedback.className = 'feedback-wrong';
            if (questionEl) {
                questionEl.classList.add('shake');
                setTimeout(() => questionEl.classList.remove('shake'), 500);
            }
        }

        setTimeout(() => {
            state.judgeAnswered++;
            answeredDisplay.textContent = state.judgeAnswered;

            state.currentJudgeIndex = (state.currentJudgeIndex + 1) % shuffledQuestions.length;

            if (state.judgeAnswered >= 10) {
                // 10题答完，禁用按钮，显示重置
                validBtn.disabled = true;
                invalidBtn.disabled = true;
                resetBtn.style.display = 'block';
                return;
            }

            showCurrentQuestion();
        }, 1500);
    }

    validBtn.addEventListener('click', () => checkAnswer(true));
    invalidBtn.addEventListener('click', () => checkAnswer(false));
    resetBtn.addEventListener('click', resetJudge);

    showCurrentQuestion();
}

// 实践操作模块
function initPracticeModule() {
    const levelButtons = document.querySelectorAll('.level-btn');
    const instructionText = document.getElementById('instruction-text');
    const codeInputEl = document.getElementById('code-input');
    const runBtn = document.getElementById('run-code');
    const outputContent = document.getElementById('output-content');
    let practiceCompleted = false;

    // CodeMirror 加载检测与降级
    let editor; // 统一编辑器接口
    const cmLoaded = typeof CodeMirror !== 'undefined';

    if (cmLoaded) {
        editor = CodeMirror(codeInputEl, {
            value: '# 在这里编写代码\nname = \nprint(name)',
            mode: 'python',
            theme: 'monokai',
            lineNumbers: true,
            gutters: ['CodeMirror-linenumbers'],
            indentUnit: 4,
            smartIndent: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            extraKeys: {
                'Ctrl-Enter': runCode,
                'Cmd-Enter': runCode
            }
        });
        // 强制刷新行号区域，同步 gutter 宽度
        setTimeout(() => {
            editor.refresh();
            // 读取 CodeMirror 计算的 margin-left，同步设置 gutter 宽度
            const sizer = codeInputEl.querySelector('.CodeMirror-sizer');
            if (sizer) {
                const marginLeft = parseInt(getComputedStyle(sizer).marginLeft) || 0;
                const gutters = codeInputEl.querySelector('.CodeMirror-gutters');
                const gutter = codeInputEl.querySelector('.CodeMirror-gutter');
                if (gutters && marginLeft > 0) {
                    gutters.style.width = marginLeft + 'px';
                    gutters.style.minWidth = marginLeft + 'px';
                }
                if (gutter && marginLeft > 0) {
                    gutter.style.width = marginLeft + 'px';
                }
            }
        }, 150);
    } else {
        // 降级方案：使用原生 textarea
        log.warn('CodeMirror 加载失败，已降级为原生编辑器');
        codeInputEl.innerHTML = '<textarea id="code-input-fallback" style="width:100%;height:200px;font-family:monospace;font-size:0.95rem;padding:12px;border-radius:10px;border:2px solid var(--border-light);resize:vertical;"># 在这里编写代码\nname = \nprint(name)</textarea>';
        const textarea = document.getElementById('code-input-fallback');
        editor = {
            getValue: () => textarea.value,
            setValue: (v) => { textarea.value = v; }
        };
        // 为 textarea 绑快捷键
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                runCode();
            }
        });
    }

    const levels = {
        1: {
            instruction: '补全代码：给变量name赋值为"小明"并打印输出',
            template: '# 在这里编写代码\nname = \nprint(name)',
            solution: ['name = "小明"', 'name = "小明"\n', "name = '小明'", "name = '小明'\n"]
        },
        2: {
            instruction: '定义两个变量：name赋值为"小红"，age赋值为12，然后打印它们',
            template: '# 在这里编写代码\nname = \nage = \nprint(name)\nprint(age)',
            solution: ['name = "小红"\nage = 12', 'name = "小红"\nage = 12\n']
        },
        3: {
            instruction: '修改变量值：先给x赋值5，然后让x增加3，最后打印x',
            template: '# 在这里编写代码\nx = \nx = \nprint(x)',
            solution: ['x = 5\nx = x + 3', 'x = 5\nx = x + 3\n', 'x = 5\nx = 8', 'x = 5\nx = 8\n']
        }
    };

    levelButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const level = parseInt(btn.dataset.level);
            state.currentLevel = level;
            levelButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            instructionText.textContent = levels[level].instruction;
            editor.setValue(levels[level].template);
            outputContent.textContent = '';
        });
    });

    function runCode() {
        const code = editor.getValue();
        
        try {
            let output = '';
            const lines = code.split('\n');
            
            const variables = {};
            lines.forEach(line => {
                line = line.trim();
                if (!line || line.startsWith('#')) return;
                if (line.includes('=')) {
                    const parts = line.split('=');
                    const varName = parts[0].trim();
                    let varValue = parts.slice(1).join('=').trim();
                    
                    // 处理字符串
                    if ((varValue.startsWith('"') && varValue.endsWith('"')) || 
                        (varValue.startsWith('\'') && varValue.endsWith('\''))) {
                        variables[varName] = varValue.slice(1, -1);
                    } else if (!isNaN(varValue)) {
                        variables[varName] = parseInt(varValue);
                    } else {
                        variables[varName] = varValue;
                    }
                } else if (line.startsWith('print(')) {
                    const match = line.match(/print\((.*)\)/);
                    if (match) {
                        const varName = match[1].trim();
                        if (variables[varName] !== undefined) {
                            output += variables[varName] + '\n';
                        } else {
                            output += varName + '\n';
                        }
                    }
                }
            });
            
            outputContent.textContent = output || '无输出';
            outputContent.style.color = 'var(--monokai-output)';
            if (!practiceCompleted) {
                practiceCompleted = true;
                markModuleCompleted('practice');
            }
        } catch (e) {
            outputContent.textContent = '错误: ' + e.message;
            outputContent.style.color = 'var(--monokai-error)';
        }
    }

    runBtn.addEventListener('click', runCode);
}

// 值追踪挑战模块
function initTraceModule() {
    const stepBtn = document.getElementById('step-forward');
    const resetBtn = document.getElementById('reset-trace');
    const feedback = document.getElementById('trace-feedback');

    const steps = [
        { x: 5, y: '?', z: '?', line: 0 },
        { x: 5, y: 7, z: '?', line: 1 },
        { x: 10, y: 7, z: '?', line: 2 },
        { x: 10, y: 7, z: 17, line: 3 }
    ];

    function updateDisplay() {
        const current = steps[state.traceStep];
        document.getElementById('value-x').textContent = current.x;
        document.getElementById('value-y').textContent = current.y;
        document.getElementById('value-z').textContent = current.z;
    }

    stepBtn.addEventListener('click', () => {
        if (state.traceStep < steps.length - 1) {
            state.traceStep++;
            updateDisplay();
            
            const lineTexts = ['x = 5', 'y = x + 2', 'x = 10', 'z = x + y'];
            feedback.textContent = `执行: ${lineTexts[state.traceStep]}`;
            feedback.style.color = 'var(--success)';
        } else {
            feedback.textContent = '🎉 执行完成！最终结果: x=10, y=7, z=17';
            feedback.style.color = 'var(--primary-purple)';
            // 记录值追踪完成
            markModuleCompleted('trace');
        }
    });

    resetBtn.addEventListener('click', () => {
        state.traceStep = 0;
        updateDisplay();
        feedback.textContent = '';
    });

    updateDisplay();
}

// 错误调试诊所模块
function initDebugModule() {
    const bugCode = document.getElementById('bug-code');
    const optionsContainer = document.getElementById('debug-options');
    const feedback = document.getElementById('debug-feedback');
    const prevBtn = document.getElementById('prev-bug');
    const nextBtn = document.getElementById('next-bug');
    const medalCount = document.querySelector('#debug-medal span');
    const bugProgress = document.getElementById('bug-progress');

    // 追踪已修复的 bug（使用索引集合）
    let fixedBugs = new Set();

    function updateBugProgress() {
        if (bugProgress) {
            bugProgress.textContent = `${fixedBugs.size}/${state.bugs.length} 已修复`;
        }
    }

    function showBug(index) {
        const bug = state.bugs[index];
        bugCode.textContent = bug.code;
        
        // 清空现有选项
        optionsContainer.innerHTML = '';
        
        // 如果已修复，显示修复状态
        if (fixedBugs.has(index)) {
            feedback.textContent = '✅ 这个 bug 已修复！';
            feedback.className = 'feedback-correct';
            optionsContainer.innerHTML = '<p style="color: var(--success); font-weight:bold;">✅ 已修复，太棒了！</p>';
            return;
        }

        feedback.textContent = '';
        const hint = document.createElement('p');
        hint.textContent = '请选择正确的修复方案：';
        optionsContainer.appendChild(hint);
        
        // 添加新选项
        bug.options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.textContent = option.text;
            btn.dataset.index = idx;
            btn.addEventListener('click', () => checkBugAnswer(option.correct, index));
            optionsContainer.appendChild(btn);
        });
    }

    function checkBugAnswer(isCorrect, bugIndex) {
        if (fixedBugs.has(bugIndex)) return;

        if (isCorrect) {
            feedback.textContent = '✅ 修复成功！获得一枚勋章！';
            feedback.className = 'feedback-correct';
            state.debugMedals++;
            medalCount.textContent = state.debugMedals;
            medalCount.parentElement.classList.add('bounce-in');
            setTimeout(() => medalCount.parentElement.classList.remove('bounce-in'), 500);
            
            fixedBugs.add(bugIndex);
            updateBugProgress();
            
            if (fixedBugs.size >= state.bugs.length) {
                markModuleCompleted('debug');
                setTimeout(() => {
                    feedback.textContent = '🎉 全部 bug 修复完毕！你是调试高手！';
                }, 1000);
            }
        } else {
            feedback.textContent = '❌ 修复失败，再试试吧！';
            feedback.className = 'feedback-wrong';
            const bugDisplay = document.getElementById('bug-code');
            if (bugDisplay) {
                bugDisplay.classList.add('shake');
                setTimeout(() => bugDisplay.classList.remove('shake'), 500);
            }
        }

        setTimeout(() => {
            showBug(bugIndex);
        }, 1500);
    }

    function findNextUnfixedBug(currentIndex, direction) {
        const total = state.bugs.length;
        // 如果全部修复，返回当前
        if (fixedBugs.size >= total) return currentIndex;

        let next = currentIndex;
        for (let i = 0; i < total; i++) {
            next = (next + direction + total) % total;
            if (!fixedBugs.has(next)) return next;
        }
        return currentIndex;
    }

    prevBtn.addEventListener('click', () => {
        state.currentBugIndex = findNextUnfixedBug(state.currentBugIndex, -1);
        showBug(state.currentBugIndex);
    });

    nextBtn.addEventListener('click', () => {
        state.currentBugIndex = findNextUnfixedBug(state.currentBugIndex, 1);
        showBug(state.currentBugIndex);
    });

    // 重置功能
    const resetBtn = document.getElementById('debug-reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            fixedBugs.clear();
            state.debugMedals = 0;
            medalCount.textContent = '0';
            updateBugProgress();
            state.currentBugIndex = 0;
            showBug(0);
        });
    }

    updateBugProgress();
    showBug(state.currentBugIndex);
}

// 扩展思维模块
function initExtendModule() {
    const challengeButtons = document.querySelectorAll('.challenge-btn');
    const swapChallenge = document.getElementById('swap-challenge');
    const combineChallenge = document.getElementById('combine-challenge');
    const generateSentenceBtn = document.getElementById('generate-sentence');
    const combineOutput = document.getElementById('combine-output');

    // 使用全局 state 追踪扩展模块进度
    if (typeof state.extendSwapDone === 'undefined') state.extendSwapDone = false;
    if (typeof state.extendSentenceDone === 'undefined') state.extendSentenceDone = false;

    function checkExtendComplete() {
        if (state.extendSwapDone && state.extendSentenceDone) {
            markModuleCompleted('extend');
        }
    }

    // 挑战切换
    challengeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const challenge = btn.dataset.challenge;
            challengeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (challenge === 'swap') {
                swapChallenge.style.display = 'block';
                combineChallenge.style.display = 'none';
            } else {
                swapChallenge.style.display = 'none';
                combineChallenge.style.display = 'block';
            }
        });
    });

    // ---------- 挑战1：变量交换交互 ----------
    const swapStepBtn = document.getElementById('swap-step-btn');
    const swapResetBtn = document.getElementById('swap-reset-btn');
    const swapStepText = document.getElementById('swap-step-text');
    const glassASpan = document.querySelector('#glass-a .glass-content');
    const glassBSpan = document.querySelector('#glass-b .glass-content');
    const glassTempSpan = document.querySelector('#glass-temp .glass-content');

    let swapStep = 0;
    const swapData = { a: '🍎', b: '🍊', temp: '' };

    function highlightCodeLine(step) {
        document.querySelectorAll('#swap-code-block .code-line[data-step]').forEach(el => {
            el.classList.remove('active');
            if (parseInt(el.dataset.step) === step) {
                el.classList.add('active');
            }
        });
    }

    function updateSwapDisplay() {
        glassASpan.textContent = swapData.a || '空';
        glassBSpan.textContent = swapData.b || '空';
        glassTempSpan.textContent = swapData.temp || '空';
    }

    if (swapStepBtn) {
        swapStepBtn.addEventListener('click', () => {
            swapStep++;

            if (swapStep === 1) {
                // Step 1: temp = a
                swapData.temp = swapData.a;
                swapData.a = '';
                swapStepText.textContent = '步骤 1/3：temp = a  →  🍎 移到了"临时"杯';
                highlightCodeLine(1);
                updateSwapDisplay();
            } else if (swapStep === 2) {
                // Step 2: a = b
                swapData.a = swapData.b;
                swapData.b = '';
                swapStepText.textContent = '步骤 2/3：a = b  →  🍊 移到了 A 杯';
                highlightCodeLine(2);
                updateSwapDisplay();
            } else if (swapStep === 3) {
                // Step 3: b = temp
                swapData.b = swapData.temp;
                swapData.temp = '';
                swapStepText.textContent = '步骤 3/3：b = temp  →  🍎 移到了 B 杯，交换完成！';
                highlightCodeLine(3);
                swapStepBtn.disabled = true;
                swapStepBtn.textContent = '✓ 交换完成';
                updateSwapDisplay();
                state.extendSwapDone = true;
                checkExtendComplete();
            }
        });
    }

    if (swapResetBtn) {
        swapResetBtn.addEventListener('click', () => {
            swapStep = 0;
            swapData.a = '🍎';
            swapData.b = '🍊';
            swapData.temp = '';
            swapStepBtn.disabled = false;
            swapStepBtn.textContent = '▶ 开始交换';
            swapStepText.textContent = '点击"开始交换"观察变量交换过程';
            highlightCodeLine(0);
            updateSwapDisplay();
        });
    }

    // ---------- 挑战2：句子拼接 ----------
    if (generateSentenceBtn) {
        generateSentenceBtn.addEventListener('click', () => {
            const name = document.getElementById('combine-name').value;
            const age = document.getElementById('combine-age').value;
            const hobby = document.getElementById('combine-hobby').value;
            
            const sentence = `大家好！我叫${name}，今年${age}岁，我喜欢${hobby}。`;
            combineOutput.textContent = sentence;
            state.extendSentenceDone = true;
            checkExtendComplete();
        });
    }
}

// 创意迷你项目模块
function initProjectModule() {
    const generateCardBtn = document.getElementById('generate-card');

    generateCardBtn.addEventListener('click', () => {
        const name = document.getElementById('card-name').value;
        const age = document.getElementById('card-age').value;
        const hobby = document.getElementById('card-hobby').value;
        const dream = document.getElementById('card-dream').value;

        document.getElementById('preview-name').textContent = name;
        document.getElementById('preview-age').textContent = age;
        document.getElementById('preview-hobby').textContent = hobby;
        document.getElementById('preview-dream').textContent = dream;
        
        // 记录项目完成
        markModuleCompleted('project');
    });
}

// 课堂小测模块
function initTestModule() {
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const prevBtn = document.getElementById('prev-question');
    const nextBtn = document.getElementById('next-question');
    const submitBtn = document.getElementById('submit-test');
    const progressDisplay = document.getElementById('test-progress');
    const testResult = document.getElementById('test-result');
    const questionContainer = document.getElementById('question-container');
    const testControls = document.querySelector('.test-controls');
    const finalScore = document.getElementById('final-score');
    const finalGrade = document.getElementById('final-grade');

    let currentQuestion = 0;

    function showQuestion(index) {
        const question = state.questions[index];
        questionText.textContent = question.question;
        progressDisplay.textContent = index + 1;
        
        // 清空现有选项
        optionsContainer.innerHTML = '';
        
        // 添加新选项
        question.options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.textContent = option;
            btn.dataset.index = idx;
            
            // 如果已有答案，高亮显示
            if (state.testAnswers[index] === idx) {
                btn.classList.add('selected');
            }
            
            btn.addEventListener('click', () => {
                state.testAnswers[index] = idx;
                // 移除其他选项的高亮
                optionsContainer.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
            
            optionsContainer.appendChild(btn);
        });
    }

    prevBtn.addEventListener('click', () => {
        if (currentQuestion > 0) {
            currentQuestion--;
            showQuestion(currentQuestion);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestion < state.questions.length - 1) {
            currentQuestion++;
            showQuestion(currentQuestion);
        }
    });

    submitBtn.addEventListener('click', () => {
        // 计算得分
        let score = 0;
        state.questions.forEach((q, idx) => {
            if (state.testAnswers[idx] === q.correct) {
                score++;
            }
        });

        finalScore.textContent = score;
        
        // 计算评级
        const percentage = (score / state.questions.length) * 100;
        let grade;
        if (percentage >= 90) grade = '🏆 优秀';
        else if (percentage >= 70) grade = '👍 良好';
        else if (percentage >= 60) grade = '✅ 及格';
        else grade = '📚 继续加油';
        finalGrade.textContent = grade;

        // 显示结果
        questionContainer.style.display = 'none';
        testControls.style.display = 'none';
        testResult.style.display = 'block';
        
        // 记录测试完成
        markModuleCompleted('test');

        // 绘制雷达图
        drawRadarChart(score);
    });

    function drawRadarChart(score) {
        const canvas = document.getElementById('radar-canvas');
        const ctx = canvas.getContext('2d');
        // 从 CSS 变量读取主题颜色
        const rootStyle = getComputedStyle(document.documentElement);
        const radarAxis = rootStyle.getPropertyValue('--radar-axis').trim();
        const primaryPurple = rootStyle.getPropertyValue('--primary-purple').trim();
        const textPrimary = rootStyle.getPropertyValue('--text-primary').trim();
        
        // 将 hex 颜色转为 rgba
        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        const fillColor = hexToRgba(primaryPurple, 0.3);
        
        const centerX = 150;
        const centerY = 150;
        const radius = 100;
        const labels = ['变量定义', '命名规则', '赋值操作', '调试能力', '综合应用'];
        
        // 根据得分计算各维度能力
        const values = [];
        for (let i = 0; i < 5; i++) {
            // 根据得分分布各维度能力
            if (score >= 5) values.push(3);
            else if (score >= 4) values.push(i < 4 ? 3 : 2);
            else if (score >= 3) values.push(i < 3 ? 3 : i < 4 ? 2 : 1);
            else if (score >= 2) values.push(i < 2 ? 2 : 1);
            else values.push(i === 0 ? 1 : 0);
        }

        // 绘制背景网格
        for (let r = radius / 3; r <= radius; r += radius / 3) {
            ctx.beginPath();
            for (let i = 0; i < labels.length; i++) {
                const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
                const x = centerX + r * Math.cos(angle);
                const y = centerY + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = radarAxis;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 绘制坐标轴
        for (let i = 0; i < labels.length; i++) {
            const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = radarAxis;
            ctx.stroke();
            
            // 绘制标签
            ctx.fillStyle = textPrimary;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            const labelX = centerX + (radius + 20) * Math.cos(angle);
            const labelY = centerY + (radius + 20) * Math.sin(angle);
            ctx.fillText(labels[i], labelX, labelY);
        }

        // 绘制数据区域
        ctx.beginPath();
        for (let i = 0; i < labels.length; i++) {
            const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
            const value = values[i];
            const r = (value / 3) * radius;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = primaryPurple;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制数据点
        for (let i = 0; i < labels.length; i++) {
            const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
            const value = values[i];
            const r = (value / 3) * radius;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = primaryPurple;
            ctx.fill();
        }
    }

    showQuestion(currentQuestion);
}

// 打字机效果初始化（不自动启动）
function initTypewriterEffect() {
    // 不自动启动，等待滚动显示后再启动
}

// 启动打字机效果
function startTypewriterEffect() {
    const containers = document.querySelectorAll('.typewriter-container');
    
    containers.forEach((container) => {
        const output = container.querySelector('.typewriter-output');
        const cursor = container.querySelector('.typewriter-cursor');
        
        // 防止重复执行：如果已经有内容，跳过
        if (!output || output.textContent.trim().length > 0) return;
        
        const text = `# 变量赋值演示
name = "小明"
age = 14
favorite_color = "蓝色"

# 打印变量值
print("我叫", name)
print("我今年", age, "岁")
print("我喜欢", favorite_color)`;
        
        output.textContent = '';
        if (cursor) cursor.style.display = 'inline-block';
        
        // 使用 Array.from 正确拆分 Unicode 字符
        const chars = Array.from(text);
        let charIndex = 0;
        
        function typeCharacter() {
            if (charIndex < chars.length) {
                const char = chars[charIndex];
                if (char === '\n') {
                    output.appendChild(document.createElement('br'));
                } else if (char === '\r') {
                    // 跳过 Windows 换行符中的 \r
                } else {
                    output.appendChild(document.createTextNode(char));
                }
                charIndex++;
                const delay = char === '\n' ? 200 : 60;
                setTimeout(typeCharacter, delay);
            } else {
                // 打字完成后隐藏光标
                if (cursor) {
                    setTimeout(() => { cursor.style.display = 'none'; }, 2000);
                }
            }
        }
        
        setTimeout(typeCharacter, 500);
    });
}

// 滚动显示效果
function initScrollReveal() {
    const modules = document.querySelectorAll('.module');
    const featureCards = document.querySelectorAll('.feature-card');
    const typewriterContainer = document.querySelector('.typewriter-container');
    let typewriterStarted = false;
    
    // 页面加载时显示第一个模块和可见的feature-card
    const firstModule = document.querySelector('.module');
    if (firstModule) {
        firstModule.classList.add('active');
    }
    
    // 初始检测feature-card
    setTimeout(() => {
        const windowHeight = window.innerHeight;
        featureCards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            if (rect.top < windowHeight * 0.8) {
                card.classList.add('visible');
            }
        });
    }, 100);
    
    // 滚动检测
    function checkScroll() {
        const windowHeight = window.innerHeight;
        
        // 检测模块
        modules.forEach((module) => {
            const rect = module.getBoundingClientRect();
            const moduleTop = rect.top;
            const moduleHeight = rect.height;
            
            // 当模块进入视口70%时激活
            if (moduleTop < windowHeight * 0.7 && moduleTop + moduleHeight > 0) {
                module.classList.add('active');
            }
        });
        
        // 检测feature-card
        featureCards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            if (rect.top < windowHeight * 0.8) {
                card.classList.add('visible');
            }
        });
        
        // 检测typewriter-container并触发打字机效果
        if (typewriterContainer && !typewriterStarted) {
            const rect = typewriterContainer.getBoundingClientRect();
            if (rect.top < windowHeight * 0.7) {
                typewriterStarted = true;
                setTimeout(startTypewriterEffect, 300);
            }
        }
    }
    
    // 初始检测
    setTimeout(checkScroll, 100);
    
    // 滚动事件监听（节流处理，减少 CPU 消耗）
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        if (scrollTimer) return;
        scrollTimer = setTimeout(() => {
            checkScroll();
            // 回到顶部按钮显示/隐藏
            const backToTopBtn = document.getElementById('backToTopBtn');
            if (backToTopBtn) {
                if (window.scrollY > 400) {
                    backToTopBtn.classList.add('visible');
                } else {
                    backToTopBtn.classList.remove('visible');
                }
            }
            scrollTimer = null;
        }, 100);
    });

    // 使用 IntersectionObserver 处理 .reveal 系列元素的滚动入场
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });

        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
            revealObserver.observe(el);
        });
    } else {
        // 降级：直接显示所有元素
        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
            el.classList.add('revealed');
        });
    }
}

// 回到顶部
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================================================================
//   科技感增强动画 - Tech Enhancement Animations
// ================================================================

// ----- 粒子背景 Canvas 动画 -----
function initParticleCanvas() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;
    let mouseX = 0;
    let mouseY = 0;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', () => {
        resize();
        initParticles();
    });

    // 鼠标跟踪
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    class Particle {
        constructor() {
            this.reset();
            this.y = Math.random() * canvas.height; // 初始随机分布
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = -10;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedY = Math.random() * 0.6 + 0.2;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.hue = Math.random() > 0.5 ? 160 : 230; // 绿色或蓝紫色
        }
        update() {
            this.y += this.speedY;
            this.x += this.speedX;

            // 鼠标吸引效果
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                const angle = Math.atan2(dy, dx);
                const force = (150 - dist) / 150 * 0.03;
                this.x -= Math.cos(angle) * force;
                this.y -= Math.sin(angle) * force;
            }

            if (this.y > canvas.height + 10 || this.x < -10 || this.x > canvas.width + 10) {
                this.reset();
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 70%, 55%, ${this.opacity})`;
            ctx.fill();
        }
    }

    function initParticles() {
        const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
        particles = Array.from({ length: count }, () => new Particle());
    }

    // 连线
    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(4, 170, 109, ${(120 - dist) / 120 * 0.12})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        drawLines();
        animationId = requestAnimationFrame(animate);
    }

    initParticles();
    animate();

    // 页面不可见时暂停，节省资源
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationId);
        } else {
            animate();
        }
    });
}

// ----- 数字雨效果（Hero 区域） -----
function initDigitalRain() {
    const hero = document.querySelector('.hero-section');
    if (!hero) return;

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ';
    const container = document.createElement('div');
    container.className = 'digital-rain';
    container.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;';
    hero.insertBefore(container, hero.firstChild);

    const columns = Math.floor(hero.offsetWidth / 30);
    const drops = [];

    for (let i = 0; i < columns; i++) {
        const span = document.createElement('span');
        span.className = 'digital-rain-char';
        span.style.left = (i * 30 + Math.random() * 20) + 'px';
        span.style.animationDuration = (Math.random() * 4 + 6) + 's';
        span.style.animationDelay = (Math.random() * 5) + 's';
        span.textContent = chars[Math.floor(Math.random() * chars.length)];
        container.appendChild(span);
        drops.push(span);
    }

    // 定期更新字符
    setInterval(() => {
        if (document.hidden) return;
        drops.forEach(span => {
            if (Math.random() > 0.7) {
                span.textContent = chars[Math.floor(Math.random() * chars.length)];
            }
        });
    }, 2000);
}

// ----- 数据流SVG动画 -----
function initDataFlowLines() {
    // 为特征卡片区域添加数据流线
    const featuresSection = document.querySelector('.features-section');
    if (!featuresSection) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'data-flow-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:0;';

    // 创建几条流动线
    const lines = [
        { x1: '10%', y1: '20%', x2: '90%', y2: '80%' },
        { x1: '90%', y1: '10%', x2: '10%', y2: '90%' },
        { x1: '5%', y1: '50%', x2: '95%', y2: '50%' }
    ];

    lines.forEach((line, i) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        path.setAttribute('x1', line.x1);
        path.setAttribute('y1', line.y1);
        path.setAttribute('x2', line.x2);
        path.setAttribute('y2', line.y2);
        path.setAttribute('stroke', 'rgba(4, 170, 109, 0.06)');
        path.setAttribute('stroke-width', '1');
        path.setAttribute('stroke-dasharray', '8,12');
        path.style.animation = `dashFlow ${3 + i * 2}s linear infinite`;
        svg.appendChild(path);
    });

    featuresSection.style.position = 'relative';
    featuresSection.insertBefore(svg, featuresSection.firstChild);
}

// 虚线流动动画 keyframes（动态注入）
(function injectDataFlowKeyframes() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes dashFlow {
            0% { stroke-dashoffset: 40; }
            100% { stroke-dashoffset: 0; }
        }
    `;
    document.head.appendChild(style);
})();

// ----- 鼠标光晕跟随 -----
function initMouseGlow() {
    const glow = document.createElement('div');
    glow.className = 'mouse-glow';
    glow.style.cssText = `
        position: fixed;
        width: 400px;
        height: 400px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(4,170,109,0.04) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
        transform: translate(-50%, -50%);
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(glow);

    let timeout;
    document.addEventListener('mousemove', (e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
        glow.style.opacity = '1';
        clearTimeout(timeout);
        timeout = setTimeout(() => { glow.style.opacity = '0'; }, 2000);
    });
}

// ----- 初始化所有科技感动画 -----
function initTechEnhancements() {
    initParticleCanvas();
    initDigitalRain();
    initDataFlowLines();
    initMouseGlow();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTechEnhancements);
} else {
    initTechEnhancements();
}
