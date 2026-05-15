// 全局状态管理
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
    initWelcomeModule();
    initNavigation();
    initIntroModule();
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
});

// 欢迎模块
function initWelcomeModule() {
    // 搜索功能
    const searchForm = document.querySelector('.hero-form');
    const searchInput = document.getElementById('search-input');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchTerm = searchInput.value.toLowerCase().trim();
            
            if (searchTerm) {
                const modules = document.querySelectorAll('.module');
                let found = false;
                
                modules.forEach(module => {
                    const moduleId = module.id;
                    const moduleName = module.querySelector('h2')?.textContent.toLowerCase() || '';
                    const moduleContent = module.textContent.toLowerCase();
                    
                    if (moduleName.includes(searchTerm) || moduleContent.includes(searchTerm)) {
                        switchModule(moduleId);
                        found = true;
                    }
                });
                
                if (!found) {
                    alert(`未找到与"${searchTerm}"相关的内容`);
                }
            }
        });
    }
    
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
    
    // 下拉菜单功能 - 使用更简单的选择器
    const navButtons = document.querySelectorAll('a[onclick^="openNavItem"]');
    navButtons.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const navId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            const allNavs = document.querySelectorAll('.w3-dropdown-content');
            const targetNav = document.getElementById('nav_' + navId);
            
            allNavs.forEach(function(nav) {
                if (nav !== targetNav) {
                    nav.classList.add('w3-hide');
                }
            });
            
            if (targetNav) {
                targetNav.classList.toggle('w3-hide');
            }
        });
    });
    
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
    const navLinks = document.querySelectorAll('.nav-link, [data-module]');
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

// 全局函数供 onclick 调用
function openNavItem(navId) {
    toggleNavItem(navId);
}

// 搜索功能
function search() {
    const input = document.getElementById('search-input');
    const searchTerm = input.value.toLowerCase().trim();
    
    if (searchTerm) {
        // 简单搜索实现
        const modules = document.querySelectorAll('.module');
        let found = false;
        
        modules.forEach(module => {
            const moduleId = module.id;
            const moduleName = module.querySelector('h2')?.textContent.toLowerCase() || '';
            const moduleContent = module.textContent.toLowerCase();
            
            if (moduleName.includes(searchTerm) || moduleContent.includes(searchTerm)) {
                switchModule(moduleId);
                found = true;
                
                // 高亮显示搜索结果
                const content = module.innerHTML;
                const highlighted = content.replace(
                    new RegExp(`(${searchTerm})`, 'gi'),
                    '<span class="search-highlight">$1</span>'
                );
                module.innerHTML = highlighted;
            }
        });
        
        if (!found) {
            alert(`未找到与"${searchTerm}"相关的内容`);
        }
    }
    
    return false;
}

// 移动端菜单控制
function toggleMobileMenu() {
    document.getElementById('mobileMenuModal').style.display = 'block';
}

function closeMobileMenu() {
    document.getElementById('mobileMenuModal').style.display = 'none';
}

function switchModule(moduleId) {
    const modules = document.querySelectorAll('.module');
    const targetModule = document.getElementById(moduleId);
    
    if (!targetModule) {
        console.error('Module not found:', moduleId);
        return;
    }
    
    modules.forEach(module => module.classList.remove('active'));
    targetModule.classList.add('active');
    state.currentModule = moduleId;
}

// 情境导入模块
function initIntroModule() {
    const sceneButtons = document.querySelectorAll('.scene-btn');
    sceneButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetScene = btn.dataset.target;
            const scenes = document.querySelectorAll('.scene');
            scenes.forEach(scene => scene.classList.remove('active'));
            document.querySelector(`.scene[data-scene="${targetScene}"]`).classList.add('active');
        });
    });

    // 动画效果
    animateScore();
    animateNames();
    animateCountdown();
}

function animateScore() {
    const scoreSpan = document.querySelector('.score');
    let score = 0;
    const interval = setInterval(() => {
        score += Math.floor(Math.random() * 10) + 1;
        scoreSpan.textContent = score;
        if (score >= 100) clearInterval(interval);
    }, 200);
}

function animateNames() {
    const names = ['张三', '李四', '王五', '赵六', '小明'];
    const nameSpan = document.querySelector('.name');
    let index = 0;
    setInterval(() => {
        index = (index + 1) % names.length;
        nameSpan.textContent = names[index];
    }, 1500);
}

function animateCountdown() {
    const countdownSpan = document.querySelector('.countdown');
    let count = 10;
    const interval = setInterval(() => {
        count--;
        countdownSpan.textContent = count;
        if (count <= 0) {
            count = 10;
        }
    }, 1000);
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
            boxLabelArea.textContent = value;
            codeLabel.textContent = value;
            variableBox.style.borderColor = '#667eea';
        } else if (type === 'data') {
            currentValue = value;
            currentValueType = dataType;
            boxValueArea.textContent = value;
            codeValue.textContent = dataType === 'text' ? `"${value}"` : value;
            
            if (dataType === 'number') {
                variableBox.style.borderColor = '#28a745';
                boxType.textContent = '类型: 数字';
            } else {
                variableBox.style.borderColor = '#17a2b8';
                boxType.textContent = '类型: 文字';
            }
        }
    });
}

// 命名小法官模块
function initJudgeModule() {
    const validBtn = document.getElementById('btn-valid');
    const invalidBtn = document.getElementById('btn-invalid');
    const feedback = document.getElementById('judge-feedback');
    const scoreDisplay = document.getElementById('judge-score');

    function showCurrentQuestion() {
        const current = state.judgeQuestions[state.currentJudgeIndex];
        document.getElementById('current-variable').textContent = current.name;
        feedback.textContent = '';
    }

    function checkAnswer(isValid) {
        const current = state.judgeQuestions[state.currentJudgeIndex];
        if (isValid === current.valid) {
            feedback.textContent = `✅ 回答正确！${current.reason}`;
            feedback.style.color = '#28a745';
            state.judgeScore++;
            scoreDisplay.textContent = state.judgeScore;
        } else {
            feedback.textContent = `❌ 回答错误！${current.reason}`;
            feedback.style.color = '#dc3545';
        }

        setTimeout(() => {
            state.currentJudgeIndex = (state.currentJudgeIndex + 1) % state.judgeQuestions.length;
            showCurrentQuestion();
        }, 1500);
    }

    validBtn.addEventListener('click', () => checkAnswer(true));
    invalidBtn.addEventListener('click', () => checkAnswer(false));

    showCurrentQuestion();
}

// 实践操作模块
function initPracticeModule() {
    const levelButtons = document.querySelectorAll('.level-btn');
    const instructionText = document.getElementById('instruction-text');
    const codeInput = document.getElementById('code-input');
    const runBtn = document.getElementById('run-code');
    const outputContent = document.getElementById('output-content');

    const levels = {
        1: {
            instruction: '补全代码：给变量name赋值为"小明"并打印输出',
            template: '# 在这里编写代码\nname = \nprint(name)',
            solution: ['name = "小明"', 'name = "小明"\n', 'name = \'小明\'', 'name = \'小明\'\n']
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
            codeInput.value = levels[level].template;
            outputContent.textContent = '';
        });
    });

    runBtn.addEventListener('click', () => {
        const code = codeInput.value;
        const level = state.currentLevel;
        
        try {
            // 简单的代码执行模拟
            let output = '';
            const lines = code.split('\n');
            
            const variables = {};
            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('#')) return;
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
                    const varName = line.slice(6, -1).trim();
                    if (variables[varName] !== undefined) {
                        output += variables[varName] + '\n';
                    } else {
                        output += varName + '\n';
                    }
                }
            });
            
            outputContent.textContent = output || '无输出';
            outputContent.style.color = '#a6e22e';
        } catch (e) {
            outputContent.textContent = '错误: ' + e.message;
            outputContent.style.color = '#f92672';
        }
    });
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
            feedback.style.color = '#28a745';
        } else {
            feedback.textContent = '🎉 执行完成！最终结果: x=10, y=7, z=17';
            feedback.style.color = '#667eea';
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

    function showBug(index) {
        const bug = state.bugs[index];
        bugCode.textContent = bug.code;
        
        // 清空现有选项
        optionsContainer.innerHTML = '<p>请选择正确的修复方案：</p>';
        
        // 添加新选项
        bug.options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.textContent = option.text;
            btn.dataset.index = idx;
            btn.addEventListener('click', () => checkBugAnswer(option.correct));
            optionsContainer.appendChild(btn);
        });
        
        feedback.textContent = '';
    }

    function checkBugAnswer(isCorrect) {
        if (isCorrect) {
            feedback.textContent = '✅ 修复成功！获得一枚勋章！';
            feedback.style.color = '#28a745';
            state.debugMedals++;
            medalCount.textContent = state.debugMedals;
        } else {
            feedback.textContent = '❌ 修复失败，再试试吧！';
            feedback.style.color = '#dc3545';
        }

        setTimeout(() => {
            nextBtn.click();
        }, 1500);
    }

    prevBtn.addEventListener('click', () => {
        state.currentBugIndex = (state.currentBugIndex - 1 + state.bugs.length) % state.bugs.length;
        showBug(state.currentBugIndex);
    });

    nextBtn.addEventListener('click', () => {
        state.currentBugIndex = (state.currentBugIndex + 1) % state.bugs.length;
        showBug(state.currentBugIndex);
    });

    showBug(state.currentBugIndex);
}

// 扩展思维模块
function initExtendModule() {
    const challengeButtons = document.querySelectorAll('.challenge-btn');
    const swapChallenge = document.getElementById('swap-challenge');
    const combineChallenge = document.getElementById('combine-challenge');
    const generateSentenceBtn = document.getElementById('generate-sentence');
    const combineOutput = document.getElementById('combine-output');

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

    generateSentenceBtn.addEventListener('click', () => {
        const name = document.getElementById('combine-name').value;
        const age = document.getElementById('combine-age').value;
        const hobby = document.getElementById('combine-hobby').value;
        
        const sentence = `大家好！我叫${name}，今年${age}岁，我喜欢${hobby}。`;
        combineOutput.textContent = sentence;
    });
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

        // 绘制雷达图
        drawRadarChart(score);
    });

    function drawRadarChart(score) {
        const canvas = document.getElementById('radar-canvas');
        const ctx = canvas.getContext('2d');
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
            ctx.strokeStyle = '#ddd';
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
            ctx.strokeStyle = '#ddd';
            ctx.stroke();
            
            // 绘制标签
            ctx.fillStyle = '#333';
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
        ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#667eea';
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
            ctx.fillStyle = '#667eea';
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
        
        if (!output) return;
        
        const text = `name = "小明"
age = 12
score = 95.5`;
        
        output.textContent = '';
        
        if (cursor) {
            output.appendChild(cursor);
        }
        
        let charIndex = 0;
        
        function typeCharacter() {
            if (charIndex < text.length) {
                const char = text[charIndex];
                if (char === '\n') {
                    output.insertBefore(document.createElement('br'), cursor);
                } else {
                    output.insertBefore(document.createTextNode(char), cursor);
                }
                charIndex++;
                setTimeout(typeCharacter, 100);
            }
        }
        
        setTimeout(typeCharacter, 500);
    });
}

// 滚动显示效果
function initScrollReveal() {
    const modules = document.querySelectorAll('.module');
    const featureCards = document.querySelectorAll('.feature-card');
    const quickStartContent = document.querySelector('.quick-start-content');
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
        
        // 检测quick-start-content并触发打字机效果
        if (quickStartContent && !quickStartContent.classList.contains('visible')) {
            const rect = quickStartContent.getBoundingClientRect();
            if (rect.top < windowHeight * 0.7) {
                quickStartContent.classList.add('visible');
                
                // 打字机效果在显示后延迟启动
                if (!typewriterStarted) {
                    typewriterStarted = true;
                    setTimeout(startTypewriterEffect, 300);
                }
            }
        }
    }
    
    // 初始检测
    setTimeout(checkScroll, 100);
    
    // 滚动事件监听
    window.addEventListener('scroll', checkScroll);
}
