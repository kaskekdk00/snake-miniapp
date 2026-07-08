// مقداردهی اولیه به وب اپ تلگرام
const tg = window.Telegram.WebApp;
tg.expand(); // بزرگ کردن صفحه بازی در تلگرام

// داده‌های ذخیره شده کاربر
let userData = {
    currentLevel: 1,
    coins: 50,
    stars: {} // فرمت: { 'level_1': 3 }
};

// بارگذاری اطلاعات از LocalStorage در صورت وجود
if (localStorage.getItem('diff_game_data')) {
    userData = JSON.parse(localStorage.getItem('diff_game_data'));
}

// تنظیم نام کاربر از تلگرام
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    document.getElementById('user-name').innerText = tg.initDataUnsafe.user.first_name;
}

// ساختار سختی مراحل طبق فرمول شما
function getLevelConfig(lvl) {
    if (lvl <= 10) return { diffs: 1, hearts: 3 };
    if (lvl <= 20) return { diffs: 1, hearts: 4 };
    if (lvl <= 30) return { diffs: 2, hearts: 4 };
    if (lvl <= 50) return { diffs: 3, hearts: 3 };
    if (lvl <= 70) return { diffs: 4, hearts: 2 };
    if (lvl <= 90) return { diffs: 5, hearts: 2 };
    return { diffs: 6, hearts: 1 }; // ۹۱ تا ۱۰۰
}

// ایجاد ۱۰۰ مرحله به صورت داینامیک
const totalLevelsCount = 100;
const levels = [];

// آبجکت‌های گرافیکی پیش‌فرض جهت شبیه‌سازی مراحل (تست بدون نیاز به آپلود فایل تصویری)
const sampleShapes = [
    '<circle cx="50" cy="50" r="20" fill="#f44336"/> <rect x="150" y="30" width="40" height="40" fill="#2196f3"/>',
    '<polygon points="100,20 40,80 160,80" fill="#4caf50"/> <circle cx="250" cy="60" r="25" fill="#ffeb3b"/>',
    '<rect x="20" y="20" width="80" height="50" fill="#9c27b0"/> <circle cx="200" cy="50" r="30" fill="#ff9800"/>'
];

for (let i = 1; i <= totalLevelsCount; i++) {
    const config = getLevelConfig(i);
    
    // مختصات تفاوت‌ها بر اساس درصد (X و Y بین 5 تا 95 درصد قاب تصویر)
    const diffsCoordinates = [
        { id: 1, x: 25, y: 40, found: false, radius: 8 },
        { id: 2, x: 55, y: 30, found: false, radius: 8 },
        { id: 3, x: 75, y: 65, found: false, radius: 8 },
        { id: 4, x: 40, y: 70, found: false, radius: 8 },
        { id: 5, x: 15, y: 80, found: false, radius: 8 },
        { id: 6, x: 85, y: 20, found: false, radius: 8 },
        { id: 7, x: 50, y: 50, found: false, radius: 8 }
    ].slice(0, config.diffs); // انتخاب تعداد تفاوت بر اساس سختی مرحله

    levels.push({
        levelNum: i,
        isDemo: true, 
        shapes: sampleShapes[i % sampleShapes.length], 
        diffs: diffsCoordinates,
        maxHearts: config.hearts
    });
}

// متغیرهای وضعیت بازی کنونی
let activeLevel = null;
let currentHearts = 0;

// مدیریت صفحات
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    if(screenId === 'home-screen') {
        document.getElementById('total-coins').innerText = userData.coins;
    }
}

function saveData() {
    localStorage.setItem('diff_game_data', JSON.stringify(userData));
}

// ساخت دکمه‌های صفحه انتخاب مرحله
function buildLevelsGrid() {
    const grid = document.getElementById('levels-grid');
    grid.innerHTML = '';
    
    levels.forEach(lvl => {
        const card = document.createElement('div');
        card.classList.add('level-card');
        
        const isLocked = lvl.levelNum > userData.currentLevel;
        
        if (isLocked) {
            card.classList.add('locked');
            card.innerHTML = `<div>${lvl.levelNum}</div><div>🔒</div>`;
        } else {
            if (lvl.levelNum === userData.currentLevel) {
                card.classList.add('active-level');
            }
            let starsStr = '';
            const starsEarned = userData.stars['level_' + lvl.levelNum] || 0;
            for(let s=0; s<3; s++) starsStr += s < starsEarned ? '★' : '☆';
            
            card.innerHTML = `
                <div>${lvl.levelNum}</div>
                <div class="level-stars">${starsStr}</div>
            `;
            card.addEventListener('click', () => startLevel(lvl.levelNum));
        }
        grid.appendChild(card);
    });
}

// شروع یک مرحله خاص
function startLevel(lvlNum) {
    activeLevel = JSON.parse(JSON.stringify(levels[lvlNum - 1])); // کپی عمیق داده مرحله برای ریست وضعیت
    currentHearts = activeLevel.maxHearts;
    
    document.getElementById('current-level-num').innerText = activeLevel.levelNum;
    document.getElementById('game-coins-count').innerText = userData.coins;
    updateGameHeader();
    
    // رندر کردن تصاویر نمونه
    renderLevelImages();
    
    showScreen('game-screen');
}

function updateGameHeader() {
    const foundCount = activeLevel.diffs.filter(d => d.found).length;
    const leftCount = activeLevel.diffs.length - foundCount;
    document.getElementById('diff-left').innerText = leftCount;
    
    let heartsStr = '';
    for(let h=0; h < activeLevel.maxHearts; h++) {
        heartsStr += h < currentHearts ? '❤️' : '🖤';
    }
    document.getElementById('hearts-left').innerText = heartsStr;
}

function renderLevelImages() {
    const topCanvas = document.getElementById('img-top');
    const bottomCanvas = document.getElementById('img-bottom');
    
    topCanvas.innerHTML = '';
    bottomCanvas.innerHTML = '';
    
    // ایجاد SVG برای تصویر بالا و پایین به عنوان دمو
    let svgTopHtml = `<svg width="100%" height="100%" viewBox="0 0 300 225" style="background:#f0f4c3;">${activeLevel.shapes}</svg>`;
    
    // تصویر دوم شامل ایجاد دایره‌های تفاوت نامرئی
    let svgBottomHtml = `<svg width="100%" height="100%" viewBox="0 0 300 225" style="background:#e6ee9c;">${activeLevel.shapes}`;
    
    // رسم تفاوت‌های واقعی در تصاویر دمو گرافیکی جهت تشخیص چشم
    activeLevel.diffs.forEach(diff => {
        svgBottomHtml += `<circle cx="${diff.x * 3}" cy="${diff.y * 2.25}" r="7" fill="#ff5722"/>`;
    });
    svgBottomHtml += `</svg>`;
    
    topCanvas.innerHTML = svgTopHtml;
    bottomCanvas.innerHTML = svgBottomHtml;
    
    // افزودن نقاط کلیک روی هر دو تصویر
    [topCanvas, bottomCanvas].forEach(canvas => {
        activeLevel.diffs.forEach(diff => {
            const clickArea = document.createElement('div');
            clickArea.classList.add('clickable-area');
            clickArea.style.left = diff.x + '%';
            clickArea.style.top = diff.y + '%';
            clickArea.style.width = (diff.radius * 2) + '%';
            clickArea.style.height = (diff.radius * 2.6) + '%';
            
            clickArea.addEventListener('click', (e) => {
                e.stopPropagation(); // جلوگیری از ثبت کلیک اشتباه روی پس‌زمینه
                handleDiffClick(diff.id);
            });
            canvas.appendChild(clickArea);
        });
        
        // کلیک روی جای اشتباه
        canvas.addEventListener('click', (e) => {
            if(e.target === canvas || e.target.tagName === 'svg' || e.target.tagName === 'rect' || e.target.tagName === 'circle') {
                const rect = canvas.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                handleWrongClick(x, y);
            }
        });
    });
}

// زدن روی تفاوت درست
function handleDiffClick(diffId) {
    const diff = activeLevel.diffs.find(d => d.id === diffId);
    if (diff.found) return;
    
    diff.found = true;
    
    // نشانه‌گذاری دایره سبز روی هر دو تصویر
    showMarker(diff.x, diff.y, 'found-marker');
    updateGameHeader();
    
    // بررسی اتمام مرحله
    const allFound = activeLevel.diffs.every(d => d.found);
    if (allFound) {
        endLevel(true);
    }
}

// زدن روی نقطه اشتباه
function handleWrongClick(x, y) {
    currentHearts--;
    showMarker(x, y, 'wrong-marker');
    updateGameHeader();
    
    // لرزش خفیف گوشی با API تلگرام در صورت کلیک اشتباه
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
    }
    
    if (currentHearts <= 0) {
        endLevel(false);
    }
}

function showMarker(x, y, className) {
    ['img-top', 'img-bottom'].forEach(canvasId => {
        const canvas = document.getElementById(canvasId);
        const marker = document.createElement('div');
        marker.classList.add(className);
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        marker.style.width = '30px';
        marker.style.height = '30px';
        canvas.appendChild(marker);
        
        if(className === 'wrong-marker') {
            setTimeout(() => marker.remove(), 600);
        }
    });
}

// دکمه راهنما (اصلاح شده)
document.getElementById('btn-hint').addEventListener('click', () => {
    if (userData.coins < 15) {
        tg.showAlert('سکه کافی ندارید! برای راهنمایی به ۱۵ سکه نیاز است.');
        return;
    }
    
    const unFoundDiff = activeLevel.diffs.find(d => !d.found);
    if (unFoundDiff) {
        userData.coins -= 15;
        document.getElementById('game-coins-count').innerText = userData.coins;
        saveData();
        handleDiffClick(unFoundDiff.id);
    }
});

// پایان مرحله (برد یا باخت)
function endLevel(isWin) {
    const modal = document.getElementById('game-modal');
    const title = document.getElementById('modal-title');
    const msg = document.getElementById('modal-message');
    const starsContainer = document.getElementById('modal-stars');
    const nextBtn = document.getElementById('modal-btn-next');
    const retryBtn = document.getElementById('modal-btn-retry');
    
    starsContainer.innerHTML = '';
    
    if (isWin) {
        title.innerText = 'پیروز شدید! 🎉';
        let starsEarned = 1;
        if (currentHearts === activeLevel.maxHearts) starsEarned = 3;
        else if (currentHearts >= activeLevel.maxHearts / 2) starsEarned = 2;
        
        let starsStr = '';
        for(let s=0; s<3; s++) starsStr += s < starsEarned ? '★' : '☆';
        starsContainer.innerText = starsStr;
        
        const coinsReward = starsEarned * 10;
        userData.coins += coinsReward;
        msg.innerText = `شما ${starsEarned} ستاره و ${coinsReward} سکه دریافت کردید.`;
        
        userData.stars['level_' + activeLevel.levelNum] = Math.max(userData.stars['level_' + activeLevel.levelNum] || 0, starsEarned);
        
        if (activeLevel.levelNum === userData.currentLevel && userData.currentLevel < totalLevelsCount) {
            userData.currentLevel++;
        }
        
        nextBtn.style.display = 'block';
        retryBtn.style.display = 'none';
        
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } else {
        title.innerText = 'باختید! 😢';
        msg.innerText = 'فرصت‌های شما تمام شد. دوباره تلاش کنید.';
        nextBtn.style.display = 'none';
        retryBtn.style.display = 'block';
    }
    
    saveData();
    modal.classList.add('active');
}

// رویدادهای ناوبری دکمه‌ها
document.getElementById('btn-start').addEventListener('click', () => {
    startLevel(userData.currentLevel);
});

document.getElementById('btn-levels').addEventListener('click', () => {
    buildLevelsGrid();
    showScreen('levels-screen');
});

document.getElementById('btn-back-to-home').addEventListener('click', () => showScreen('home-screen'));
document.getElementById('btn-back-to-levels').addEventListener('click', () => {
    buildLevelsGrid();
    showScreen('levels-screen');
});

document.getElementById('modal-btn-next').addEventListener('click', () => {
    document.getElementById('game-modal').classList.remove('active');
    if (activeLevel.levelNum < totalLevelsCount) {
        startLevel(activeLevel.levelNum + 1);
    } else {
        showScreen('levels-screen');
    }
});

document.getElementById('modal-btn-retry').addEventListener('click', () => {
    document.getElementById('game-modal').classList.remove('active');
    startLevel(activeLevel.levelNum);
});

// در ابتدا صفحه اصلی را نمایش بده
showScreen('home-screen');
