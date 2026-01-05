// 英语单词复习网站 - 主要JavaScript文件

// 全局变量 (预设默认结构，防止未初始化报错)
let wordData = {};
let currentUnit = 'Unit 1';
let currentWordIndex = 0;
let isCardFlipped = false;
let learningProgress = {
    learnedWords: [],
    streakDays: 0,
    accuracyRate: 0,
    lastStudyDate: null,
    studyTime: 0
};
let difficultyMarks = {};
let isEnglishMode = true; // true=显示英文(猜中文), false=显示中文(猜英文)

// DOM元素
let currentWordElement, currentPhoneticElement, currentTranslationElement, currentPosElement;
let progressBar, currentWordIndexElement, totalUnitWordsElement, currentUnitTitleElement;
let easyCountElement, mediumCountElement, hardCountElement;
let prevBtn, nextBtn, pronunciationBtn;
let difficultyEasyBtn, difficultyMediumBtn, difficultyHardBtn;
let unitCardsContainer, learningSection, finishUnitBtn;

// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    
    // 【关键修复 1】必须先加载进度，再加载数据！
    loadLearningProgress(); 
    loadWordData(); 
    
    setupEventListeners();
    
    // 页面加载动画
    if(typeof anime !== 'undefined') {
        anime({
            targets: '.floating-animation',
            translateY: [-20, 0],
            opacity: [0, 1],
            duration: 1000,
            easing: 'easeOutExpo'
        });
    }
});

// 初始化DOM元素
function initializeElements() {
    currentWordElement = document.getElementById('current-word');
    currentPhoneticElement = document.getElementById('current-phonetic');
    currentTranslationElement = document.getElementById('current-translation');
    currentPosElement = document.getElementById('current-pos');
    progressBar = document.getElementById('progress-bar');
    currentWordIndexElement = document.getElementById('current-word-index');
    totalUnitWordsElement = document.getElementById('total-unit-words');
    currentUnitTitleElement = document.getElementById('current-unit-title');
    easyCountElement = document.getElementById('easy-count');
    mediumCountElement = document.getElementById('medium-count');
    hardCountElement = document.getElementById('hard-count');
    prevBtn = document.getElementById('prev-btn');
    nextBtn = document.getElementById('next-btn');
    pronunciationBtn = document.getElementById('pronunciation-btn');
    difficultyEasyBtn = document.getElementById('difficulty-easy');
    difficultyMediumBtn = document.getElementById('difficulty-medium');
    difficultyHardBtn = document.getElementById('difficulty-hard');
    unitCardsContainer = document.getElementById('unit-cards');
    learningSection = document.getElementById('learning-section');
    finishUnitBtn = document.getElementById('finish-unit-btn');
}

// 加载单词数据
async function loadWordData() {
    try {
        if (window.wordData) {
            wordData = window.wordData;
            
            if (!window.WordLearningApp) window.WordLearningApp = {};
            window.WordLearningApp.wordData = wordData;

            console.log('✅ 单词数据加载成功！共加载单元:', Object.keys(wordData).length);
            
            // 初始化界面
            updateStatistics();
            generateUnitCards();
            
        } else {
            console.warn("window.wordData 未定义，请检查 word_data.js 是否引入");
        }
    } catch (error) {
        console.error('❌ 加载失败:', error);
    }
}

// 加载学习进度 (【关键修复 2】增加 try-catch 应对浏览器隐私拦截)
function loadLearningProgress() {
    try {
        const saved = localStorage.getItem('wordLearningProgress');
        if (saved) {
            learningProgress = JSON.parse(saved);
        }
        
        const savedMarks = localStorage.getItem('difficultyMarks');
        if (savedMarks) {
            difficultyMarks = JSON.parse(savedMarks);
        }
    } catch (e) {
        console.warn("⚠️ 无法访问本地存储(可能被浏览器拦截)，将使用临时模式:", e);
        // 使用默认值，不做任何操作，保证程序不崩
    }
    
    // 确保数据结构完整 (防止旧数据导致报错)
    if (!learningProgress.learnedWords) learningProgress.learnedWords = [];
}

// 保存学习进度 (增加 try-catch)
function saveLearningProgress() {
    try {
        localStorage.setItem('wordLearningProgress', JSON.stringify(learningProgress));
        localStorage.setItem('difficultyMarks', JSON.stringify(difficultyMarks));
    } catch (e) {
        console.warn("⚠️ 无法保存进度到本地:", e);
    }
}

// 设置事件监听器
function setupEventListeners() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if(mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
        mobileMenu.addEventListener('click', () => mobileMenu.classList.add('hidden'));
    }

    const wordCard = document.getElementById('word-card');
    if(wordCard) wordCard.addEventListener('click', flipCard);

    if(prevBtn) prevBtn.addEventListener('click', showPreviousWord);
    if(nextBtn) nextBtn.addEventListener('click', showNextWord);
    if(pronunciationBtn) pronunciationBtn.addEventListener('click', playPronunciation);

    if(difficultyEasyBtn) difficultyEasyBtn.addEventListener('click', () => markDifficulty('easy'));
    if(difficultyMediumBtn) difficultyMediumBtn.addEventListener('click', () => markDifficulty('medium'));
    if(difficultyHardBtn) difficultyHardBtn.addEventListener('click', () => markDifficulty('hard'));

    if(finishUnitBtn) finishUnitBtn.addEventListener('click', finishUnit);

    document.addEventListener('keydown', handleKeyboardShortcuts);

    const bookSelector = document.getElementById('book-selector');
    if (bookSelector) {
        bookSelector.addEventListener('change', generateUnitCards);
    }
}

// 生成单元卡片
function generateUnitCards() {
    const selector = document.getElementById('book-selector');
    const currentBook = selector ? selector.value : "九年级上册";
    
    if (!unitCardsContainer) return;
    unitCardsContainer.innerHTML = ''; 
    
    const allUnits = Object.keys(wordData);
    const filteredUnits = allUnits.filter(unit => unit.startsWith(currentBook));
    
    if (filteredUnits.length === 0) {
        unitCardsContainer.innerHTML = `
            <div class="col-span-2 md:col-span-4 text-center py-8">
                <p class="text-gray-500 text-lg">📭 未找到 "${currentBook}" 的数据</p>
            </div>
        `;
        return;
    }

    filteredUnits.forEach(unitKey => {
        const words = wordData[unitKey];
        const displayTitle = unitKey.includes('_') ? unitKey.split('_')[1] : unitKey;
        const unitNumber = displayTitle.replace(/[^0-9]/g, '');
        
        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer border border-gray-100';
        card.innerHTML = `
            <div class="text-center">
                <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-md">
                    <span class="text-white font-bold text-xl">${unitNumber || 'U'}</span>
                </div>
                <h4 class="text-xl font-bold text-gray-900 mb-2">${displayTitle}</h4>
                <p class="text-gray-600 mb-4 text-sm">${words.length} 个单词</p>
                <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div class="bg-gradient-to-r from-blue-500 to-orange-500 h-2 rounded-full transition-all duration-1000" style="width: ${getUnitProgress(unitKey)}%"></div>
                </div>
                <button class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors font-medium text-sm">
                    开始学习
                </button>
            </div>
        `;
        
        card.addEventListener('click', () => selectUnit(unitKey));
        unitCardsContainer.appendChild(card);
    });
}

function selectUnit(unit) {
    currentUnit = unit;
    currentWordIndex = 0;
    isCardFlipped = false;
    learningSection.classList.remove('hidden');
    learningSection.scrollIntoView({ behavior: 'smooth' });
    updateCurrentWord();
    updateProgress();
    updateUnitStats();
    resetCardFlip();
}

function updateCurrentWord() {
    const words = wordData[currentUnit];
    if (!words || words.length === 0) return;
    
    const currentWord = words[currentWordIndex];
    isEnglishMode = Math.random() > 0.5;

    if (currentWordElement) currentWordElement.textContent = currentWord.word;
    if (currentPhoneticElement) currentPhoneticElement.textContent = currentWord.phonetic;
    if (currentTranslationElement) currentTranslationElement.textContent = currentWord.translation;
    if (currentPosElement) currentPosElement.textContent = currentWord.pos;
    if (currentUnitTitleElement) currentUnitTitleElement.textContent = currentUnit.split('_')[1] || currentUnit;
    
    const elementsToReset = [currentWordElement, currentPhoneticElement, currentTranslationElement, currentPosElement];
    elementsToReset.forEach(el => {
        if(el) {
            el.classList.remove('opacity-0', 'blur-md', 'select-none'); 
            el.classList.add('transition-all', 'duration-300', 'opacity-100', 'blur-none');
        }
    });

    if (isEnglishMode) {
        if (currentTranslationElement) {
            currentTranslationElement.classList.remove('opacity-100', 'blur-none');
            currentTranslationElement.classList.add('opacity-0', 'blur-md');
        }
        if (currentPosElement) {
            currentPosElement.classList.remove('opacity-100');
            currentPosElement.classList.add('opacity-0');
        }
    } else {
        if (currentWordElement) {
            currentWordElement.classList.remove('opacity-100', 'blur-none');
            currentWordElement.classList.add('opacity-0', 'blur-md', 'select-none');
        }
        if (currentPhoneticElement) {
            currentPhoneticElement.classList.remove('opacity-100', 'blur-none');
            currentPhoneticElement.classList.add('opacity-0', 'blur-md');
        }
    }

    if (currentWordIndexElement) currentWordIndexElement.textContent = currentWordIndex + 1;
    if (totalUnitWordsElement) totalUnitWordsElement.textContent = words.length;
    updateDifficultyButtons();
}

function flipCard(e) {
    if (e && (e.target.tagName === 'BUTTON' || e.target.closest('button'))) return;
    const wordCard = document.getElementById('word-card');
    if (!wordCard) return;

    isCardFlipped = !isCardFlipped;
    const allElements = [currentWordElement, currentPhoneticElement, currentTranslationElement, currentPosElement];

    if (isCardFlipped) {
        allElements.forEach(el => {
            if(el) {
                el.classList.remove('opacity-0', 'blur-md', 'select-none');
                el.classList.add('opacity-100', 'blur-none');
            }
        });
        if (!isEnglishMode) playPronunciation(); 
    } else {
        if (isEnglishMode) {
            if (currentTranslationElement) {
                currentTranslationElement.classList.remove('opacity-100', 'blur-none');
                currentTranslationElement.classList.add('opacity-0', 'blur-md');
            }
            if (currentPosElement) {
                currentPosElement.classList.remove('opacity-100');
                currentPosElement.classList.add('opacity-0');
            }
        } else {
            if (currentWordElement) {
                currentWordElement.classList.remove('opacity-100', 'blur-none');
                currentWordElement.classList.add('opacity-0', 'blur-md', 'select-none');
            }
            if (currentPhoneticElement) {
                currentPhoneticElement.classList.remove('opacity-100', 'blur-none');
                currentPhoneticElement.classList.add('opacity-0', 'blur-md');
            }
        }
    }
    
    if(typeof anime !== 'undefined') {
        anime({
            targets: wordCard,
            scale: [1, 1.02, 1],
            duration: 300,
            easing: 'easeOutQuad'
        });
    }
}

function resetCardFlip() {
    const wordCard = document.getElementById('word-card');
    isCardFlipped = false;
    if(wordCard) wordCard.classList.remove('flipped');
}

function updateProgress() {
    const words = wordData[currentUnit];
    if(words && words.length > 0) {
        const progress = ((currentWordIndex + 1) / words.length) * 100;
        if(progressBar) progressBar.style.width = `${progress}%`;
    }
}

function updateUnitStats() {
    const words = wordData[currentUnit];
    if(!words) return;
    let easyCount = 0, mediumCount = 0, hardCount = 0;
    
    words.forEach((word, index) => {
        const wordKey = `${currentUnit}-${index}`;
        const difficulty = difficultyMarks[wordKey] || 'medium';
        switch (difficulty) {
            case 'easy': easyCount++; break;
            case 'medium': mediumCount++; break;
            case 'hard': hardCount++; break;
        }
    });
    
    if(easyCountElement) easyCountElement.textContent = easyCount;
    if(mediumCountElement) mediumCountElement.textContent = mediumCount;
    if(hardCountElement) hardCountElement.textContent = hardCount;
}

function showPreviousWord() {
    if (currentWordIndex > 0) {
        currentWordIndex--;
        updateCurrentWord();
        updateProgress();
        resetCardFlip();
        anime({ targets: '#word-card', translateX: [50, 0], opacity: [0.5, 1], duration: 300, easing: 'easeOutQuad' });
    }
}

function showNextWord() {
    const words = wordData[currentUnit];
    if (words && currentWordIndex < words.length - 1) {
        currentWordIndex++;
        updateCurrentWord();
        updateProgress();
        resetCardFlip();
        anime({ targets: '#word-card', translateX: [-50, 0], opacity: [0.5, 1], duration: 300, easing: 'easeOutQuad' });
    }
}

function playPronunciation() {
    const words = wordData[currentUnit];
    if(!words) return;
    const currentWord = words[currentWordIndex];
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        if(pronunciationBtn) {
            pronunciationBtn.innerHTML = '🔊 播放中...';
            pronunciationBtn.disabled = true;
        }
        utterance.onend = () => {
            if(pronunciationBtn) {
                pronunciationBtn.innerHTML = '🔊 发音';
                pronunciationBtn.disabled = false;
            }
        };
        window.speechSynthesis.speak(utterance);
    } else {
        alert('您的浏览器不支持语音合成功能');
    }
}

function markDifficulty(difficulty) {
    const wordKey = `${currentUnit}-${currentWordIndex}`;
    difficultyMarks[wordKey] = difficulty;
    saveLearningProgress();
    updateDifficultyButtons();
    updateUnitStats();
    const button = document.getElementById(`difficulty-${difficulty}`);
    if(button) {
        anime({ targets: button, scale: [1, 1.1, 1], duration: 300, easing: 'easeInOutQuad' });
    }
}

function updateDifficultyButtons() {
    const wordKey = `${currentUnit}-${currentWordIndex}`;
    const currentDifficulty = difficultyMarks[wordKey] || 'medium';
    const baseClass = 'text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105';
    
    if(difficultyEasyBtn) difficultyEasyBtn.className = `bg-green-500 hover:bg-green-600 ${baseClass} ${currentDifficulty === 'easy' ? 'ring-4 ring-green-300' : ''}`;
    if(difficultyMediumBtn) difficultyMediumBtn.className = `bg-yellow-500 hover:bg-yellow-600 ${baseClass} ${currentDifficulty === 'medium' ? 'ring-4 ring-yellow-300' : ''}`;
    if(difficultyHardBtn) difficultyHardBtn.className = `bg-red-500 hover:bg-red-600 ${baseClass} ${currentDifficulty === 'hard' ? 'ring-4 ring-red-300' : ''}`;
}

function finishUnit() {
    if (!learningProgress.learnedWords.includes(currentUnit)) {
        learningProgress.learnedWords.push(currentUnit);
    }
    learningProgress.lastStudyDate = new Date().toISOString().split('T')[0];
    saveLearningProgress();
    
    anime({
        targets: '#finish-unit-btn',
        scale: [1, 1.2, 1],
        backgroundColor: ['#10b981', '#059669', '#10b981'],
        duration: 1000,
        easing: 'easeInOutQuad',
        complete: () => {
            alert('恭喜！您已完成 ' + currentUnit + ' 的学习！');
            updateStatistics();
            generateUnitCards(); 
        }
    });
}

function startQuickReview() {
    // 复习逻辑同上，为节省篇幅略，核心逻辑未变
    const difficultWords = [];
    Object.keys(difficultyMarks).forEach(key => {
        if (difficultyMarks[key] === 'hard') {
            const [unit, index] = key.split('-');
            difficultWords.push({ unit, index: parseInt(index) });
        }
    });
    if (difficultWords.length > 0) {
        const randomWord = difficultWords[Math.floor(Math.random() * difficultWords.length)];
        selectUnit(randomWord.unit);
        currentWordIndex = randomWord.index;
        updateCurrentWord();
        updateProgress();
    } else {
        alert('您还没有标记为困难的单词，请先学习一些单词！');
    }
}

function handleKeyboardShortcuts(event) {
    if (!learningSection || learningSection.classList.contains('hidden')) return;
    switch (event.key) {
        case 'ArrowLeft': event.preventDefault(); showPreviousWord(); break;
        case 'ArrowRight': event.preventDefault(); showNextWord(); break;
        case ' ': event.preventDefault(); flipCard(); break;
        case 'p': case 'P': event.preventDefault(); playPronunciation(); break;
    }
}

// 【关键修复 3】更新统计 (增加空值保护)
function updateStatistics() {
    const totalWordsElement = document.getElementById('total-words');
    const learnedWordsElement = document.getElementById('learned-words');
    const learningStreakElement = document.getElementById('learning-streak');
    const accuracyRateElement = document.getElementById('accuracy-rate');
    
    let totalWords = 0;
    if(wordData) {
        Object.values(wordData).forEach(unitWords => {
            totalWords += unitWords ? unitWords.length : 0;
        });
    }
    
    if(totalWordsElement) totalWordsElement.textContent = totalWords;
    // 使用可选链 ?. 或 默认值 防止报错
    if(learnedWordsElement) learnedWordsElement.textContent = learningProgress.learnedWords ? learningProgress.learnedWords.length : 0;
    if(learningStreakElement) learningStreakElement.textContent = learningProgress.streakDays || 0;
    if(accuracyRateElement) accuracyRateElement.textContent = (learningProgress.accuracyRate || 0) + '%';
}

function getUnitProgress(unit) {
    if (learningProgress.learnedWords && learningProgress.learnedWords.includes(unit)) {
        return 100;
    }
    return 0;
}

window.WordLearningApp = {
    wordData,
    learningProgress,
    difficultyMarks,
    saveLearningProgress,
    loadLearningProgress
};

// 音效系统 (保持不变)
const audioFiles = {
    click: new Audio('resources/sounds/click.mp3'),
    correct: new Audio('resources/sounds/correct.mp3'),
    wrong: new Audio('resources/sounds/wrong.mp3')
};
window.playSound = function(type) {
    const sound = audioFiles[type];
    if (sound) {
        sound.currentTime = 0; 
        sound.play().catch(e => console.log('音频播放失败:', e));
    }
};
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('game-card') || e.target.classList.contains('word-tile')) {
        window.playSound('click');
    }
});