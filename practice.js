// practice.js - 练习测试完整版（含教材筛选、音效与自动跳转）

document.addEventListener('DOMContentLoaded', function() {
    // 1. 检查数据源
    if (!window.WordLearningApp || !window.WordLearningApp.wordData) {
        console.error("未找到单词数据，请确保 main.js 已正确加载");
        return;
    }

    const app = {
        // 状态变量
        currentMode: 'en-to-cn',
        currentBook: '九年级上册', // 默认教材
        currentUnit: '',           // 初始化为空
        questionCount: 10,
        questions: [],
        currentQuestionIndex: 0,
        score: 0,
        timer: null,
        timeRemaining: 30,
        correctCount: 0,
        incorrectCount: 0,
        mistakes: [],

        // DOM 元素缓存
        elements: {
            modeSelection: document.getElementById('mode-selection'),
            settings: document.getElementById('quiz-settings'),
            interface: document.getElementById('quiz-interface'),
            results: document.getElementById('quiz-results'),
            unitSelector: document.getElementById('unit-selector'),
            bookSelector: document.getElementById('quiz-book-selector'),
            
            // 答题界面元素
            questionText: document.getElementById('question-text'),
            questionHint: document.getElementById('question-hint'),
            optionsContainer: document.getElementById('options-container'),
            inputContainer: document.getElementById('input-container'),
            answerInput: document.getElementById('answer-input'),
            submitBtn: document.getElementById('submit-answer-btn'),
            feedbackContainer: document.getElementById('feedback-container'),
            feedbackTitle: document.getElementById('feedback-title'),
            feedbackText: document.getElementById('feedback-text'),
            nextBtn: document.getElementById('next-question-btn'),
            scoreDisplay: document.getElementById('quiz-score'),
            progressDisplay: document.getElementById('quiz-progress'),
            timerText: document.getElementById('timer-text'),
            timerCircle: document.getElementById('timer-circle')
        },

        init: function() {
            this.generateUnitSelector();
            this.bindEvents();
        },

        bindEvents: function() {
            // 监听教材选择
            if (this.elements.bookSelector) {
                this.elements.bookSelector.addEventListener('change', (e) => {
                    this.currentBook = e.target.value;
                    this.generateUnitSelector(); 
                });
            }

            // 模式选择
            document.querySelectorAll('.quiz-mode-card').forEach(card => {
                card.addEventListener('click', () => {
                    const mode = card.dataset.mode;
                    this.selectMode(mode);
                });
            });

            // 题目数量选择
            document.querySelectorAll('.quiz-count-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.quiz-count-btn').forEach(b => {
                        b.className = 'quiz-count-btn bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors';
                    });
                    btn.className = 'quiz-count-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors';
                    this.questionCount = parseInt(btn.dataset.count);
                });
            });

            // 开始测试按钮
            const startBtn = document.getElementById('start-quiz-btn');
            if(startBtn) startBtn.addEventListener('click', () => this.startQuiz());
            
            // 下一题按钮 (手动)
            if(this.elements.nextBtn) this.elements.nextBtn.addEventListener('click', () => this.nextQuestion());
            
            // 提交答案按钮 (拼写模式)
            if(this.elements.submitBtn) this.elements.submitBtn.addEventListener('click', () => this.checkSpelling());
            
            // 键盘回车提交
            if(this.elements.answerInput) {
                this.elements.answerInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.checkSpelling();
                });
            }
            
            // 结果页按钮
            const retryBtn = document.getElementById('retry-quiz-btn');
            const backBtn = document.getElementById('back-to-mode-btn');
            if(retryBtn) retryBtn.addEventListener('click', () => location.reload());
            if(backBtn) backBtn.addEventListener('click', () => location.reload());
        },

        // --- 导航逻辑 ---

        generateUnitSelector: function() {
            if(!this.elements.unitSelector) return;
            this.elements.unitSelector.innerHTML = '';
            
            const allUnits = Object.keys(window.WordLearningApp.wordData);
            const filteredUnits = allUnits.filter(key => key.startsWith(this.currentBook));

            if (filteredUnits.length === 0) {
                this.elements.unitSelector.innerHTML = '<p class="col-span-4 text-center text-gray-500 py-4">该教材暂无数据</p>';
                return;
            }
            
            filteredUnits.forEach((unitKey, index) => {
                const btn = document.createElement('button');
                const baseClass = 'unit-btn px-3 py-2 rounded-lg transition-colors text-sm ';
                const activeClass = 'bg-blue-500 text-white hover:bg-blue-600';
                const inactiveClass = 'bg-gray-200 text-gray-700 hover:bg-blue-500 hover:text-white';
                
                if (index === 0) {
                    btn.className = baseClass + activeClass;
                    this.currentUnit = unitKey;
                } else {
                    btn.className = baseClass + inactiveClass;
                }
                
                const displayName = unitKey.includes('_') ? unitKey.split('_')[1] : unitKey;
                btn.textContent = displayName;
                btn.dataset.unit = unitKey;
                
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.unit-btn').forEach(b => {
                        b.className = baseClass + inactiveClass;
                    });
                    btn.className = baseClass + activeClass;
                    this.currentUnit = unitKey;
                });
                
                this.elements.unitSelector.appendChild(btn);
            });
        },

        selectMode: function(mode) {
            this.currentMode = mode;
            window.currentQuizMode = mode;
            this.elements.modeSelection.classList.add('hidden');
            this.elements.settings.classList.remove('hidden');
        },

        // --- 核心答题逻辑 ---

        startQuiz: function() {
            this.generateQuestions();
            
            if (this.questions.length === 0) {
                alert("该单元暂时没有数据！");
                return;
            }

            this.elements.settings.classList.add('hidden');
            this.elements.interface.classList.remove('hidden');
            
            this.currentQuestionIndex = 0;
            this.score = 0;
            this.correctCount = 0;
            this.incorrectCount = 0;
            this.mistakes = [];
            
            const unitDisplayName = this.currentUnit.includes('_') ? this.currentUnit.split('_')[1] : this.currentUnit;
            document.getElementById('current-mode').textContent = this.getModeName();
            document.getElementById('current-quiz-unit').textContent = unitDisplayName;

            this.showQuestion();
        },

        getModeName: function() {
            const names = {
                'en-to-cn': '英译中',
                'cn-to-en': '中译英',
                'listening': '听力测试',
                'timed': '限时挑战'
            };
            return names[this.currentMode] || '测试';
        },

        generateQuestions: function() {
            const allWords = window.WordLearningApp.wordData[this.currentUnit] || [];
            const shuffled = [...allWords].sort(() => 0.5 - Math.random());
            this.questions = shuffled.slice(0, this.questionCount);
        },

        showQuestion: function() {
            const currentQ = this.questions[this.currentQuestionIndex];
            
            this.elements.progressDisplay.textContent = `${this.currentQuestionIndex + 1} / ${this.questions.length}`;
            this.elements.scoreDisplay.textContent = this.score;
            
            // 隐藏反馈，显示选项/输入框
            this.elements.feedbackContainer.classList.add('hidden');
            if(this.elements.answerInput) this.elements.answerInput.value = '';
            
            // 确保选项容器可见（如果之前被隐藏）
            this.elements.optionsContainer.classList.remove('hidden'); 

            if (this.currentMode === 'cn-to-en') {
                this.elements.questionText.textContent = currentQ.translation;
                this.elements.questionHint.textContent = `词性: ${currentQ.pos || '未知'}`;
                this.elements.optionsContainer.classList.add('hidden');
                this.elements.inputContainer.classList.remove('hidden');
                setTimeout(() => this.elements.answerInput.focus(), 100);
            } else {
                this.elements.questionText.textContent = currentQ.word;
                this.elements.questionHint.textContent = currentQ.phonetic || '请选择正确的中文释义';
                this.elements.inputContainer.classList.add('hidden');
                this.elements.optionsContainer.classList.remove('hidden');
                this.renderOptions(currentQ);
            }
            
            if (this.currentMode === 'listening') {
                this.playAudio(currentQ.word);
                this.elements.questionText.textContent = "🔊 点击播放";
                this.elements.questionText.style.cursor = "pointer";
                this.elements.questionText.onclick = () => this.playAudio(currentQ.word);
            }

            this.startTimer();
        },

        renderOptions: function(currentQ) {
            this.elements.optionsContainer.innerHTML = '';
            
            const allWords = window.WordLearningApp.wordData[this.currentUnit];
            const distractors = allWords
                .filter(w => w.word !== currentQ.word)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
            
            const options = [...distractors, currentQ].sort(() => 0.5 - Math.random());
            
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'quiz-option w-full bg-gray-100 hover:bg-blue-50 p-4 rounded-lg text-left border border-gray-200 mb-2 transition-all';
                btn.textContent = opt.translation;
                btn.onclick = () => this.checkAnswer(opt, currentQ, btn);
                this.elements.optionsContainer.appendChild(btn);
            });
        },

        startTimer: function() {
            clearInterval(this.timer);
            this.timeRemaining = this.currentMode === 'cn-to-en' ? 60 : 15; 
            this.updateTimerUI();
            
            this.timer = setInterval(() => {
                this.timeRemaining--;
                this.updateTimerUI();
                if (this.timeRemaining <= 0) {
                    this.handleTimeout();
                }
            }, 1000);
        },

        updateTimerUI: function() {
            if(!this.elements.timerText) return;
            this.elements.timerText.textContent = this.timeRemaining;
            const totalTime = this.currentMode === 'cn-to-en' ? 60 : 15;
            const offset = 283 - (this.timeRemaining / totalTime) * 283;
            if(this.elements.timerCircle) this.elements.timerCircle.style.strokeDashoffset = offset;
        },

        playAudio: function(text) {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            }
        },

        // --- 判题逻辑 ---

        // 【关键修改 1】选择题判题逻辑：答对自动跳转
        checkAnswer: function(selected, correct, btnElement) {
            clearInterval(this.timer);
            const isCorrect = selected.word === correct.word;
            
            const allBtns = this.elements.optionsContainer.querySelectorAll('button');
            allBtns.forEach(b => b.disabled = true);

            if (isCorrect) {
                // 答对：变绿，播放音效
                btnElement.classList.add('correct', 'bg-green-500', 'text-white');
                this.handleCorrect();
                
                // ✨ 自动跳转：延迟1秒后直接下一题 (跳过反馈页)
                setTimeout(() => this.nextQuestion(), 1000);
            } else {
                // 答错：变红，显示正确答案，播放错误音效
                btnElement.classList.add('incorrect', 'bg-red-500', 'text-white');
                allBtns.forEach(b => {
                    if (b.textContent === correct.translation) {
                        b.classList.add('correct', 'bg-green-500', 'text-white');
                    }
                });
                this.handleIncorrect(correct);
                
                // 答错时依然显示详细解析，让用户看清楚
                setTimeout(() => this.showFeedback(isCorrect, correct), 1000);
            }
        },

        // 【关键修改 2】拼写题判题逻辑：答对自动跳转
        checkSpelling: function() {
            const input = this.elements.answerInput.value.trim().toLowerCase();
            const correct = this.questions[this.currentQuestionIndex];
            
            if (!input) return;
            clearInterval(this.timer);

            const isCorrect = input === correct.word.toLowerCase();
            
            // 无论对错，先显示反馈弹窗（因为拼写需要看正确答案确认）
            this.showFeedback(isCorrect, correct);

            if (isCorrect) {
                this.handleCorrect();
                // ✨ 自动跳转：延迟1秒后下一题
                setTimeout(() => this.nextQuestion(), 1000);
            } else {
                this.handleIncorrect(correct);
                // 答错不自动跳转，等待用户点击“下一题”
            }
        },

        handleCorrect: function() {
            this.score += 10;
            this.correctCount++;
            if(window.playSound) window.playSound('correct'); 
        },

        handleIncorrect: function(question) {
            this.incorrectCount++;
            this.mistakes.push(question);
            this.elements.interface.classList.add('shake-error');
            if(window.playSound) window.playSound('wrong'); 
            setTimeout(() => this.elements.interface.classList.remove('shake-error'), 500);
        },

        handleTimeout: function() {
            clearInterval(this.timer);
            const correct = this.questions[this.currentQuestionIndex];
            this.handleIncorrect(correct);
            this.showFeedback(false, correct, true);
        },

        showFeedback: function(isCorrect, question, isTimeout = false) {
            this.elements.feedbackContainer.classList.remove('hidden');
            this.elements.optionsContainer.classList.add('hidden');
            this.elements.inputContainer.classList.add('hidden');

            if (isCorrect) {
                this.elements.feedbackTitle.textContent = "回答正确！🎉";
                this.elements.feedbackTitle.className = "text-2xl font-bold mb-2 text-green-600";
            } else {
                this.elements.feedbackTitle.textContent = isTimeout ? "时间到！⏰" : "回答错误 💔";
                this.elements.feedbackTitle.className = "text-2xl font-bold mb-2 text-red-600";
            }
            
            this.elements.feedbackText.innerHTML = `
                <span class="text-xl font-bold">${question.word}</span><br>
                ${question.phonetic}<br>
                ${question.translation}
            `;
        },

        nextQuestion: function() {
            this.currentQuestionIndex++;
            if (this.currentQuestionIndex < this.questions.length) {
                this.showQuestion();
            } else {
                this.finishQuiz();
            }
        },

        finishQuiz: function() {
            this.elements.interface.classList.add('hidden');
            this.elements.results.classList.remove('hidden');
            
            document.getElementById('final-score').textContent = this.score;
            document.getElementById('correct-count').textContent = this.correctCount;
            document.getElementById('incorrect-count').textContent = this.incorrectCount;
            
            const accuracy = this.questions.length > 0 ? Math.round((this.correctCount / this.questions.length) * 100) : 0;
            document.getElementById('accuracy-percentage').textContent = accuracy + '%';
            document.getElementById('accuracy-bar').style.width = accuracy + '%';
        }
    };

    app.init();
});