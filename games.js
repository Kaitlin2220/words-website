// games.js - 单词游戏完整版（含开局记忆预览功能）

document.addEventListener('DOMContentLoaded', function() {
    // 1. 检查数据源
    if (!window.WordLearningApp || !window.WordLearningApp.wordData) {
        console.error("未找到单词数据，请确保 main.js 已正确加载");
        return;
    }

    const gameApp = {
        currentBook: '九年级上册',
        currentUnit: '',
        currentGame: null,
        
        // 游戏通用变量
        cards: [],
        hasFlippedCard: false,
        lockBoard: false, // 锁定点击
        firstCard: null,
        secondCard: null,
        matchesFound: 0,
        totalPairs: 8,
        score: 0,
        timerInterval: null,
        seconds: 0,

        // --- 初始化 ---
        init: function() {
            this.generateUnitSelector();
            this.bindEvents();
        },

        // --- 绑定事件 ---
        bindEvents: function() {
            // 教材选择
            const bookSel = document.getElementById('game-book-selector');
            if(bookSel) {
                bookSel.addEventListener('change', (e) => {
                    this.currentBook = e.target.value;
                    this.generateUnitSelector();
                });
            }

            // 游戏卡片点击
            document.querySelectorAll('.game-card').forEach(card => {
                card.addEventListener('click', () => {
                    const gameType = card.dataset.game;
                    this.selectGame(gameType);
                });
            });

            // 难度选择
            document.querySelectorAll('.difficulty-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.difficulty-btn').forEach(b => {
                        b.classList.remove('bg-green-500', 'text-white');
                        b.classList.add('bg-gray-300', 'text-gray-700');
                    });
                    btn.classList.remove('bg-gray-300', 'text-gray-700');
                    btn.classList.add('bg-green-500', 'text-white');
                });
            });

            // 开始游戏
            const startBtn = document.getElementById('start-game-btn');
            if(startBtn) {
                startBtn.addEventListener('click', () => this.startGame());
            }

            // 功能按钮
            const shuffleBtn = document.getElementById('shuffle-btn');
            if(shuffleBtn) shuffleBtn.addEventListener('click', () => this.shuffleCards());

            // 返回与重玩
            const backBtns = ['back-to-games-btn', 'try-other-game-btn'];
            backBtns.forEach(id => {
                const btn = document.getElementById(id);
                if(btn) btn.addEventListener('click', () => this.backToMenu());
            });

            const playAgainBtn = document.getElementById('play-again-btn');
            if(playAgainBtn) playAgainBtn.addEventListener('click', () => this.startGame());
        },

        // --- 导航逻辑 ---
        generateUnitSelector: function() {
            const selector = document.getElementById('game-unit-selector');
            if(!selector) return;
            selector.innerHTML = ''; 
            const allKeys = Object.keys(window.WordLearningApp.wordData);
            const filteredUnits = allKeys.filter(key => key.startsWith(this.currentBook));

            if (filteredUnits.length === 0) {
                selector.innerHTML = '<p class="col-span-4 text-center text-gray-500 py-4">该教材暂无数据</p>';
                return;
            }

            filteredUnits.forEach((unitKey, index) => {
                const btn = document.createElement('button');
                const baseClass = 'game-unit-btn px-3 py-2 rounded-lg transition-colors text-sm ';
                const activeClass = 'bg-purple-500 text-white hover:bg-purple-600';
                const inactiveClass = 'bg-gray-200 text-gray-700 hover:bg-purple-500 hover:text-white';
                
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
                    document.querySelectorAll('.game-unit-btn').forEach(b => {
                        b.className = baseClass + inactiveClass;
                    });
                    btn.className = baseClass + activeClass;
                    this.currentUnit = unitKey;
                });
                selector.appendChild(btn);
            });
        },

        selectGame: function(gameType) {
            this.currentGame = gameType;
            document.getElementById('game-selection').classList.add('hidden');
            document.getElementById('game-settings').classList.remove('hidden');
            
            const titles = { 
                'matching': '单词消消乐设置', 
                'memory': '记忆翻牌设置', 
                'puzzle': '单词拼图设置' 
            };
            const titleEl = document.getElementById('settings-title');
            if(titleEl) titleEl.textContent = titles[gameType] || '游戏设置';
        },

        backToMenu: function() {
            document.querySelectorAll('section[id$="-game"], #game-results, #game-settings').forEach(el => {
                el.classList.add('hidden');
            });
            document.getElementById('game-selection').classList.remove('hidden');
            clearInterval(this.timerInterval);
        },

        startGame: function() {
            const activeUnitBtn = document.querySelector('.game-unit-btn.bg-purple-500');
            if (activeUnitBtn) this.currentUnit = activeUnitBtn.dataset.unit;

            document.getElementById('game-settings').classList.add('hidden');
            document.getElementById('game-results').classList.add('hidden');

            if (this.currentGame === 'matching') {
                this.initMatchingGame();
            } else if (this.currentGame === 'memory') {
                this.initMemoryGame();
            } else {
                alert('该游戏模式正在开发中！');
                this.backToMenu();
            }
        },

        // ==========================================
        // 🎮 游戏 1：单词消消乐 (Matching Game)
        // ==========================================
        initMatchingGame: function() {
            document.getElementById('matching-game').classList.remove('hidden');
            const allWords = window.WordLearningApp.wordData[this.currentUnit] || [];
            if(allWords.length < 8) {
                alert(`该单元单词不足8个，无法开始游戏！`);
                this.backToMenu();
                return;
            }

            const selectedWords = [...allWords].sort(() => 0.5 - Math.random()).slice(0, 8);
            this.totalPairs = 8;
            this.cards = [];
            selectedWords.forEach(w => {
                this.cards.push({ type: 'word', text: w.word, id: w.word });
                this.cards.push({ type: 'def', text: w.translation, id: w.word });
            });

            this.score = 0;
            this.matchesFound = 0;
            this.renderBoard('matching-board');
            this.startTimer('matching-time'); // 消消乐直接开始计时
            this.updateStats('matching-score', 'matching-pairs');
        },

        // ==========================================
        // 🎮 游戏 2：记忆翻牌 (Memory Game)
        // ==========================================
        initMemoryGame: function() {
            document.getElementById('memory-game').classList.remove('hidden');
            const allWords = window.WordLearningApp.wordData[this.currentUnit] || [];
            if(allWords.length < 6) {
                alert(`该单元单词不足6个，无法开始游戏！`);
                this.backToMenu();
                return;
            }

            const selectedWords = [...allWords].sort(() => 0.5 - Math.random()).slice(0, 6);
            this.totalPairs = 6;
            this.cards = [];
            selectedWords.forEach(w => {
                this.cards.push({ type: 'word', text: w.word, id: w.word });
                this.cards.push({ type: 'def', text: w.translation, id: w.word });
            });

            this.score = 0;
            this.matchesFound = 0;
            this.renderMemoryBoard();
            this.updateStats('memory-score', 'memory-flips');
            
            // 🆕 核心逻辑：开局预览
            this.previewCards(); 
        },

        // 🆕 开局预览功能
        previewCards: function() {
            // 1. 锁定界面，防止点击
            this.lockBoard = true;
            const timeEl = document.getElementById('memory-time');
            if(timeEl) timeEl.textContent = "记忆中...";

            // 2. 翻开所有牌
            const allCards = document.querySelectorAll('.memory-card');
            allCards.forEach(card => {
                // 模拟翻开的样式 (移除蓝色背景，显示文字)
                card.classList.remove('bg-blue-500', 'text-white', 'text-3xl');
                card.classList.add('bg-white', 'text-gray-800', 'border-2', 'border-blue-500', 'text-lg');
                card.textContent = card.dataset.content; // 显示真实内容
            });

            // 3. 4秒后盖上
            setTimeout(() => {
                allCards.forEach(card => {
                    // 恢复背面样式
                    card.classList.remove('bg-white', 'text-gray-800', 'border-2', 'border-blue-500', 'text-lg');
                    card.classList.add('bg-blue-500', 'text-white', 'text-3xl');
                    card.textContent = '?';
                });
                
                // 4. 解锁并开始计时
                this.lockBoard = false;
                this.startTimer('memory-time');
            }, 4000); // 4000毫秒 = 4秒
        },

        // --- 渲染逻辑 (消消乐) ---
        renderBoard: function(elementId) {
            const board = document.getElementById(elementId);
            board.innerHTML = '';
            this.resetBoardState();
            this.cards.sort(() => 0.5 - Math.random());

            this.cards.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = 'word-tile bg-white border-2 border-purple-200 rounded-xl p-4 flex items-center justify-center text-center cursor-pointer hover:bg-purple-50 transition-all shadow-sm h-32 select-none text-gray-800 font-medium';
                if (card.text.length > 12) cardEl.classList.add('text-sm');
                else cardEl.classList.add('text-xl');
                
                cardEl.textContent = card.text;
                cardEl.dataset.id = card.id;
                
                cardEl.addEventListener('click', () => this.flipCard(cardEl));
                board.appendChild(cardEl);
            });
        },

        // --- 渲染逻辑 (记忆翻牌) ---
        renderMemoryBoard: function() {
            const board = document.getElementById('memory-board');
            board.innerHTML = '';
            board.className = 'grid grid-cols-4 gap-4 max-w-4xl mx-auto';
            
            this.resetBoardState();
            this.cards.sort(() => 0.5 - Math.random());

            this.cards.forEach(card => {
                const cardEl = document.createElement('div');
                // 初始状态：背面
                cardEl.className = 'memory-card bg-blue-500 rounded-xl h-32 flex items-center justify-center text-white text-3xl font-bold cursor-pointer shadow-md transition-transform transform hover:scale-105';
                cardEl.textContent = '?'; 
                cardEl.dataset.id = card.id;
                // 🆕 关键：把内容存在 dataset 里，供预览时读取
                cardEl.dataset.content = card.text;
                
                cardEl.addEventListener('click', () => this.flipMemoryCard(cardEl, card.text));
                board.appendChild(cardEl);
            });
        },

        // --- 交互逻辑 (消消乐) ---
        flipCard: function(card) {
            if (this.lockBoard) return;
            if (card === this.firstCard) return;
            if (card.classList.contains('matched')) return;

            card.classList.add('bg-blue-500', 'text-white', 'border-blue-600');
            card.classList.remove('bg-white', 'text-gray-800');

            if (!this.hasFlippedCard) {
                this.hasFlippedCard = true;
                this.firstCard = card;
                return;
            }
            this.secondCard = card;
            this.checkForMatch(false);
        },

        // --- 交互逻辑 (记忆翻牌) ---
        flipMemoryCard: function(card, text) {
            if (this.lockBoard) return;
            if (card === this.firstCard) return;
            if (card.classList.contains('matched')) return;

            card.classList.remove('bg-blue-500', 'text-white', 'text-3xl');
            card.classList.add('bg-white', 'text-gray-800', 'border-2', 'border-blue-500', 'text-lg');
            card.textContent = text;
            if(window.playSound) window.playSound('click');

            if (!this.hasFlippedCard) {
                this.hasFlippedCard = true;
                this.firstCard = card;
                return;
            }
            this.secondCard = card;
            this.checkForMatch(true);
        },

        // --- 判定逻辑 ---
        checkForMatch: function(isMemoryMode) {
            const isMatch = this.firstCard.dataset.id === this.secondCard.dataset.id;
            if (isMatch) {
                this.disableCards(isMemoryMode);
            } else {
                this.unflipCards(isMemoryMode);
            }
        },

        disableCards: function(isMemoryMode) {
            if (window.playSound) window.playSound('correct');
            if (isMemoryMode) {
                [this.firstCard, this.secondCard].forEach(card => {
                    card.classList.remove('border-blue-500');
                    card.classList.add('bg-green-100', 'border-green-500', 'matched', 'cursor-default');
                });
                this.score += 150;
            } else {
                [this.firstCard, this.secondCard].forEach(card => {
                    card.classList.remove('bg-blue-500', 'border-blue-600');
                    card.classList.add('matched', 'bg-green-500', 'opacity-0', 'transform', 'scale-0');
                });
                this.score += 100;
            }
            this.matchesFound++;
            this.updateStats(
                isMemoryMode ? 'memory-score' : 'matching-score', 
                isMemoryMode ? 'memory-flips' : 'matching-pairs'
            );
            this.resetBoardState();
            if (this.matchesFound === this.totalPairs) {
                setTimeout(() => this.gameOver(), 500);
            }
        },

        unflipCards: function(isMemoryMode) {
            this.lockBoard = true;
            if (window.playSound) window.playSound('wrong');
            if (isMemoryMode) {
                this.firstCard.classList.add('bg-red-100');
                this.secondCard.classList.add('bg-red-100');
            } else {
                this.firstCard.classList.add('bg-red-500', 'border-red-600');
                this.secondCard.classList.add('bg-red-500', 'border-red-600');
            }
            setTimeout(() => {
                if (isMemoryMode) {
                    [this.firstCard, this.secondCard].forEach(card => {
                        card.className = 'memory-card bg-blue-500 rounded-xl h-32 flex items-center justify-center text-white text-3xl font-bold cursor-pointer shadow-md transition-transform transform hover:scale-105';
                        card.textContent = '?';
                    });
                } else {
                    [this.firstCard, this.secondCard].forEach(card => {
                        card.classList.remove('bg-red-500', 'bg-blue-500', 'text-white', 'border-red-600', 'border-blue-600');
                        card.classList.add('bg-white', 'text-gray-800');
                    });
                }
                this.resetBoardState();
            }, 1000);
        },

        resetBoardState: function() {
            [this.hasFlippedCard, this.lockBoard] = [false, false];
            [this.firstCard, this.secondCard] = [null, null];
        },

        shuffleCards: function() {
            if(this.currentGame === 'memory') {
                this.renderMemoryBoard();
                this.previewCards(); // 重洗后也重新预览
            } else {
                this.renderBoard('matching-board');
            }
        },

        startTimer: function(elementId) {
            clearInterval(this.timerInterval);
            this.seconds = 0;
            const timeEl = document.getElementById(elementId);
            this.timerInterval = setInterval(() => {
                this.seconds++;
                const mins = Math.floor(this.seconds / 60).toString().padStart(2, '0');
                const secs = (this.seconds % 60).toString().padStart(2, '0');
                if(timeEl) timeEl.textContent = `${mins}:${secs}`;
            }, 1000);
        },

        updateStats: function(scoreId, countId) {
            const scoreEl = document.getElementById(scoreId);
            const countEl = document.getElementById(countId);
            if(scoreEl) scoreEl.textContent = this.score;
            if(countEl) countEl.textContent = `${this.matchesFound}/${this.totalPairs}`;
        },

        gameOver: function() {
            clearInterval(this.timerInterval);
            document.getElementById('matching-game').classList.add('hidden');
            document.getElementById('memory-game').classList.add('hidden');
            document.getElementById('game-results').classList.remove('hidden');
            document.getElementById('final-game-score').textContent = this.score;
            
            let timeText = '00:00';
            if (this.currentGame === 'matching') {
                timeText = document.getElementById('matching-time').textContent;
            } else if (this.currentGame === 'memory') {
                timeText = document.getElementById('memory-time').textContent;
            }
            document.getElementById('game-time').textContent = timeText;
        }
    };

    gameApp.init();
});