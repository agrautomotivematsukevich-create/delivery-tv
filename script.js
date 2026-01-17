// === НАСТРОЙКИ ===
const scriptUrl = 'https://script.google.com/macros/s/AKfycbwTJjS5ROp2Q12a57o2LLHj3TVdDMpcDunmp_GibynfbtugNBFPSH1AwyAgh2acZQp3pQ/exec'; 
const CONTAINER_IMG_SRC = 'container.svg'; 

let currentUser = ""; 
let currentPassword = ""; 
let currentLang = "RU"; 
let isLunchTestMode = false; 
let lunchStartStr = "11:30";
let lunchEndStr = "12:00";

// === СЛОВАРЬ ===
const TRANSLATIONS = {
    RU: {
        title: "Мониторинг Склада",
        progress: "Общий прогресс",
        next: "Следующий контейнер",
        list: "Активные разгрузки",
        lunch: "ОБЕДЕННЫЙ ПЕРЕРЫВ",
        victory: "ПЛАН ВЫПОЛНЕН!",
        status_active: "В РАБОТЕ",
        status_pause: "ПАУЗА",
        status_wait: "ОЖИДАНИЕ",
        lunch_left: "До конца:",
        lunch_soon: "Скоро работа",
        empty: "Нет активных разгрузок",
        min: "мин.",
        locale: "ru-RU",
        eta_prefix: "ПРИБУДЕТ: ", 
        delay_prefix: "ОПОЗДАНИЕ: "
    },
    EN_CN: {
        title: "Warehouse / 仓库监控",
        progress: "Progress / 总体进度",
        next: "Next / 下一个集装箱",
        list: "Active / 正在卸货",
        lunch: "LUNCH / 午休时间",
        victory: "COMPLETED / 计划完成",
        status_active: "ACTIVE / 进行中",
        status_pause: "PAUSED / 暂停",
        status_wait: "WAITING / 等待中",
        lunch_left: "Left / 剩余:",
        lunch_soon: "Back soon / 即将开始",
        empty: "No Tasks / 无活动任务",
        min: "min / 分",
        locale: "zh-CN",
        eta_prefix: "ETA / 预计: ",
        delay_prefix: "DELAY / 延迟: "
    }
};

// --- УВЕДОМЛЕНИЯ (TOAST) ---
function showToast(text, type) {
    const toast = document.getElementById('adminToast');
    const txt = document.getElementById('toastText');
    const icon = toast.querySelector('.toast-icon');
    
    txt.innerText = text;
    icon.innerText = type === 'success' ? 'check_circle' : 'error';
    
    toast.className = `admin-toast show ${type}`; 
    setTimeout(() => { toast.className = 'admin-toast'; }, 3000);
}

function applyLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    const t = TRANSLATIONS[lang];

    document.getElementById('txt_title').innerText = t.title;
    document.getElementById('txt_progress').innerText = t.progress;
    document.getElementById('txt_next').innerText = t.next;
    document.getElementById('txt_list').innerText = t.list;
    document.getElementById('txt_lunch').innerText = t.lunch;
    document.getElementById('txt_victory').innerText = t.victory;
    
    const emptyMsg = document.querySelector('.empty-message');
    if (emptyMsg) emptyMsg.innerText = t.empty;
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.innerText.includes("RU") && lang === "RU") btn.classList.add('active');
        else if (btn.innerText.includes("CN") && lang === "EN_CN") btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function openLogin() {
    document.getElementById('modalLogin').classList.add('open');
    document.getElementById('adminUser').focus();
}

function closeModals() {
    document.getElementById('modalLogin').classList.remove('open');
    document.getElementById('modalAdmin').classList.remove('open');
    document.getElementById('adminPass').value = ""; 
}

// --- ЛОГИН ---
async function checkLogin() {
    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value.trim();

    if (!user || !pass) {
        showToast("Введите логин и пароль", "error");
        return;
    }

    showToast("Проверка...", "success");

    try {
        const url = `${scriptUrl}?nocache=${Date.now()}&mode=login&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`;
        const response = await fetch(url);
        const result = await response.text();

        if (result.includes("CORRECT")) {
            currentUser = user;
            currentPassword = pass;
            document.getElementById('modalLogin').classList.remove('open');
            document.getElementById('modalAdmin').classList.add('open');
            showToast("Успешный вход", "success");
        } else {
            showToast("Неверные данные", "error");
        }
    } catch (e) {
        showToast("Ошибка сети", "error");
    }
}

// --- НАСТРОЙКИ ---
async function setLang(lang) {
    applyLanguage(lang); 
    showToast("Сохранение...", "success");
    try {
        await fetch(`${scriptUrl}?nocache=${Date.now()}&mode=set_lang&lang=${lang}&user=${currentUser}&pass=${currentPassword}`);
        showToast("Язык сохранен!", "success");
    } catch(e) { showToast("Ошибка", "error"); }
}

async function saveLunchTime() {
    const start = document.getElementById('lunchStartInput').value;
    const end = document.getElementById('lunchEndInput').value;
    if (!start || !end) return;
    showToast("Сохранение...", "success");
    try {
        const url = `${scriptUrl}?nocache=${Date.now()}&mode=set_lunch&start=${start}&end=${end}&user=${currentUser}&pass=${currentPassword}`;
        const response = await fetch(url);
        if ((await response.text()).includes("LUNCH_UPDATED")) {
            showToast("Обед обновлен!", "success");
            lunchStartStr = start; lunchEndStr = end;
            setTimeout(() => { update(); }, 1000);
        } else { showToast("Ошибка", "error"); }
    } catch (e) { showToast("Ошибка сети", "error"); }
}

async function sendMessage() {
    const text = document.getElementById('msgInput').value;
    const duration = document.getElementById('timeInput').value;
    if (!text) { showToast("Введите текст", "error"); return; }
    showToast("Отправка...", "success");
    try {
        const url = `${scriptUrl}?nocache=${Date.now()}&mode=write&text=${encodeURIComponent(text)}&pass=${encodeURIComponent(currentPassword)}&user=${encodeURIComponent(currentUser)}&dur=${duration}`;
        const response = await fetch(url);
        if ((await response.text()).includes("SUCCESS")) {
            showToast("Опубликовано!", "success");
            document.getElementById('msgInput').value = "";
            setTimeout(() => { update(); closeModals(); }, 2000);
        } else { showToast("Ошибка", "error"); }
    } catch (e) { showToast("Ошибка сети", "error"); }
}

// --- НОВАЯ ФУНКЦИЯ: УДАЛЕНИЕ СООБЩЕНИЯ ---
async function clearMessage() {
    showToast("Удаление...", "success");
    try {
        // Отправляем пустой текст чтобы очистить ячейку
        const url = `${scriptUrl}?nocache=${Date.now()}&mode=write&text=&pass=${encodeURIComponent(currentPassword)}&user=${encodeURIComponent(currentUser)}&dur=0`;
        const response = await fetch(url);
        if ((await response.text()).includes("SUCCESS")) {
            showToast("Сообщение удалено!", "success");
            document.getElementById('msgInput').value = "";
            setTimeout(() => { update(); closeModals(); }, 2000);
        } else { showToast("Ошибка", "error"); }
    } catch (e) { showToast("Ошибка сети", "error"); }
}

// --- ИСПРАВЛЕННЫЙ ТЕСТ ОБЕДА ---
function testLunch() {
    isLunchTestMode = true;
    checkLunchTime(new Date()); // Применяем сразу
    closeModals();
    showToast("Тест запущен (10с)", "success");
    
    // Гарантированное выключение через 10 сек
    setTimeout(() => { 
        isLunchTestMode = false; 
        checkLunchTime(new Date()); // Принудительный сброс
        showToast("Тест завершен", "success");
    }, 10000);
}

function launchVictoryConfetti() {
     var duration = 5 * 60 * 1000; 
     var end = Date.now() + duration;
     (function frame() {
         confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ffc107', '#28a745', '#ffffff'] });
         confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ffc107', '#28a745', '#ffffff'] });
         if (Date.now() < end) requestAnimationFrame(frame);
     }());
}

let previousActiveIDs = new Set();
let isFirstRun = true;

setInterval(() => {
    const d = new Date();
    document.getElementById('clock').innerText = d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS["RU"];
    const locale = t.locale || 'ru-RU';
    document.getElementById('date').innerText = d.toLocaleDateString(locale, {weekday:'long', day:'numeric', month:'long'});
    checkLunchTime(d);
}, 1000);

function checkLunchTime(now) {
    const [startH, startM] = lunchStartStr.split(':').map(Number);
    const [endH, endM] = lunchEndStr.split(':').map(Number);
    const nowH = now.getHours();
    const nowM = now.getMinutes();
    const nowTotal = nowH * 60 + nowM; 
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    const isLunch = (nowTotal >= startTotal && nowTotal < endTotal);
    const t = TRANSLATIONS[currentLang];
    
    if (isLunch || isLunchTestMode) {
        if (!document.body.classList.contains('is-lunch')) document.body.classList.add('is-lunch');
        let target = new Date(); target.setHours(endH, endM, 0, 0);
        if (isLunchTestMode) diff = 15 * 60 * 1000;
        let diff = target - now;
        document.getElementById('lunchTimer').innerText = diff > 0 ? `${t.lunch_left} ${Math.ceil(diff / 60000)} ${t.min}` : t.lunch_soon;
    } else {
        if (document.body.classList.contains('is-lunch')) document.body.classList.remove('is-lunch');
    }
}

async function update() {
    try {
        const res = await fetch(scriptUrl + '?nocache=' + new Date().getTime());
        const fullText = await res.text();
        if (!fullText || fullText.includes("DOCTYPE")) return;

        let csvData = fullText;
        let adminMessage = "";
        
        if (fullText.includes("###LANG###")) {
            const parts = fullText.split("###LANG###");
            const sLang = parts[1].trim(); 
            if (sLang && TRANSLATIONS[sLang] && sLang !== currentLang) applyLanguage(sLang);
            csvData = parts[0];
        } else if (!currentLang) applyLanguage("RU");

        if (csvData.includes("###LUNCH###")) {
            const parts = csvData.split("###LUNCH###");
            const times = parts[1].trim().split('|');
            if (times.length == 2 && (lunchStartStr !== times[0] || lunchEndStr !== times[1])) {
                lunchStartStr = times[0]; lunchEndStr = times[1];
                const sInp = document.getElementById('lunchStartInput');
                const eInp = document.getElementById('lunchEndInput');
                if(document.activeElement !== sInp) sInp.value = lunchStartStr;
                if(document.activeElement !== eInp) eInp.value = lunchEndStr;
            }
            csvData = parts[0];
        }

        if (csvData.includes("###MSG###")) {
            const parts = csvData.split("###MSG###");
            csvData = parts[0];
            adminMessage = parts[1] ? parts[1].trim() : "";
        }

        const msgBar = document.getElementById('messageBar');
        const msgText = document.getElementById('messageText');
        if (adminMessage.length > 0) {
            msgText.innerText = adminMessage;
            msgBar.classList.add('visible');
            document.body.classList.add('has-message');
        } else {
            msgBar.classList.remove('visible');
            document.body.classList.remove('has-message');
        }

        const rows = csvData.split('\n').map(r => r.split(';')); 
        const r1 = rows[0]; 
        const t = TRANSLATIONS[currentLang] || TRANSLATIONS["RU"]; 

        if (r1 && r1.length > 2) {
            const st = r1[0].trim();
            const btn = document.getElementById('sts');
            btn.className = 'status-btn';
            
            if (st === "ACTIVE") { btn.innerText = t.status_active; btn.classList.add('active'); } 
            else if (st === "PAUSE") { btn.innerText = t.status_pause; btn.classList.add('pause'); } 
            else { btn.innerText = t.status_wait; btn.classList.add('wait'); }

            const counts = r1[1].split('|');
            const done = parseInt(counts[0]) || 0;
            const total = parseInt(counts[1]) || 0;
            document.getElementById('cnt').innerText = `${done} / ${total}`;
            
            const p = total > 0 ? Math.round((done/total)*100) : 0;
            document.getElementById('pct').innerText = p + '%';
            const ring = document.getElementById('ring');
            ring.style.strokeDashoffset = 942 - (942 * p / 100);
            
            if (!document.body.classList.contains('is-lunch')) {
                ring.style.stroke = st === "ACTIVE" ? "var(--accent-green)" : (st === "PAUSE" ? "#555" : "var(--accent-yellow)");
            }

            if (total > 0 && done === total && !document.body.classList.contains('is-lunch')) {
                if (!document.body.classList.contains('is-victory')) {
                    document.body.classList.add('is-victory'); 
                    launchVictoryConfetti(); 
                    document.getElementById('victoryStat').innerText = `${done} / ${total}`;
                }
            } else {
                if (document.body.classList.contains('is-victory')) document.body.classList.remove('is-victory'); 
            }

            document.getElementById('nid').innerText = r1[2].trim();
            const ninf = r1[3] ? r1[3].trim() : "";
            const idiv = document.getElementById('ninfo');
            
            if (ninf.includes("ОПОЗДАНИЕ") || ninf.includes("DELAY")) {
                idiv.innerHTML = `⚠️ <span class="warn-text">${t.delay_prefix} ${ninf.replace(/[^0-9]/g, '')} ${t.min}</span>`;
            } else if (ninf.includes("ПРИБУДЕТ") || ninf.includes("ETA")) {
                idiv.innerHTML = `⏱ <span class="time-text">${t.eta_prefix} ${ninf.replace(/[^0-9]/g, '')} ${t.min}</span>`;
            } else {
                idiv.innerHTML = ninf;
            }
        }

        const listEl = document.getElementById('list');
        let newDataMap = new Map();
        for (let i = 1; i < rows.length; i++) {
            let parts = rows[i];
            if (parts.length >= 1 && parts[0].includes('|')) {
                 let subParts = parts[0].split('|');
                 let id = subParts[0].trim();
                 let time = subParts[1].trim();
                 let durRaw = subParts[2].trim().replace(/[,"]/g, '');
                 let dur = parseInt(durRaw); if (isNaN(dur)) dur = 0;
                 newDataMap.set(id, { time, dur });
            }
        }
        const currentChildren = Array.from(listEl.querySelectorAll('.list-item:not(.remove-item)'));
        currentChildren.forEach(el => {
            const id = el.getAttribute('data-id');
            if (!newDataMap.has(id)) {
                el.classList.add('remove-item');
                setTimeout(() => { if (el.parentNode) el.remove(); checkEmpty(); }, 750);
            }
        });
        newDataMap.forEach((data, id) => {
            let existingEl = listEl.querySelector(`.list-item[data-id="${id}"]:not(.remove-item)`);
            let isOverdue = data.dur > 30;
            let overdueClass = isOverdue ? 'overdue' : '';
            let iconHtml = isOverdue ? '<span style="font-size:30px">⚠️</span>' : `<img src="${CONTAINER_IMG_SRC}" class="container-img" alt="box">`;
            let innerHTML = `<span>${iconHtml}</span><span>${id}</span><span>${data.time}</span><span>${data.dur} ${t.min}</span>`;
            if (existingEl) {
                if (existingEl.innerHTML !== innerHTML) existingEl.innerHTML = innerHTML;
                if (isOverdue) existingEl.classList.add('overdue');
                else existingEl.classList.remove('overdue');
            } else {
                let newEl = document.createElement('div');
                newEl.className = `list-item ${overdueClass}`;
                if (!isFirstRun) newEl.classList.add('new-item'); 
                newEl.setAttribute('data-id', id);
                newEl.innerHTML = innerHTML;
                const emptyMsg = listEl.querySelector('.empty-message');
                if (emptyMsg) emptyMsg.remove();
                listEl.prepend(newEl);
            }
        });
        isFirstRun = false;
        if (newDataMap.size === 0) checkEmpty();
        function checkEmpty() {
             const alive = listEl.querySelectorAll('.list-item:not(.remove-item)');
             if (alive.length === 0 && !listEl.querySelector('.empty-message')) {
                 listEl.innerHTML = `<div class="empty-message">${t.empty}</div>`;
             }
        }
    } catch(e) { console.log("Update error:", e); }
}

setInterval(update, 3000);
update();