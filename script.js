// ================================================================
// ВСТАВЬТЕ ВАШУ ССЫЛКУ НИЖЕ:
const scriptUrl = 'https://script.google.com/macros/s/AKfycbyOqLhDtXG9gL9Qes0QX0SNMeoEqvafHG416bnN1umyTz8haiHeFohKxuRX2MBYpMUgzw/exec'; 
// ================================================================

const CONTAINER_IMG_SRC = 'container.svg'; 

let lunchStartStr = "11:30";
let lunchEndStr = "12:00";
let serverLang = "RU"; 
let localLang = localStorage.getItem('warehouse_lang');

const TRANSLATIONS = {
    RU: {
        title: "Мониторинг Склада", progress: "Общий прогресс", next: "Следующий контейнер", list: "Активные разгрузки",
        lunch: "ОБЕДЕННЫЙ ПЕРЕРЫВ", victory: "ПЛАН ВЫПОЛНЕН!", status_active: "В РАБОТЕ", status_pause: "ПАУЗА", status_wait: "ОЖИДАНИЕ",
        lunch_left: "До конца:", lunch_soon: "Скоро работа", empty: "Нет активных разгрузок", min: "мин.", locale: "ru-RU", 
        eta_prefix: "ПРИБУДЕТ ЧЕРЕЗ: ", delay_prefix: "ОПОЗДАНИЕ: ",
        lbl_start: "НАЧАЛО", lbl_dur: "В РАБОТЕ",
        stat_title: "Статистика смены", stat_done: "Выгружено", stat_wait: "В очереди", menu_stat: "Статистика выгрузки",
        type_bs: "КУЗОВНОЙ", type_as: "СБОРКА", type_ps: "ПОКРАСКА"
    },
    EN_CN: {
        title: "Warehouse / 仓库监控", progress: "Progress / 总体进度", next: "Next / 下一个集装箱", list: "Active / 正在卸货",
        lunch: "LUNCH / 午休时间", victory: "COMPLETED / 计划完成", status_active: "ACTIVE / 进行中", status_pause: "PAUSED / 暂停", status_wait: "WAITING / 等待中",
        lunch_left: "Left / 剩余:", lunch_soon: "Back soon / 即将开始", empty: "No Tasks / 无活动任务", min: "min / 分", locale: "zh-CN", 
        eta_prefix: "ETA / 预计: ", delay_prefix: "DELAY / 延迟: ",
        lbl_start: "START / 开始", lbl_dur: "DURATION / 持续",
        stat_title: "Shift Statistics / 班次统计", stat_done: "Unloaded / 已卸载", stat_wait: "Queue / 排队", menu_stat: "Statistics / 统计",
        type_bs: "BODY SHOP", type_as: "ASSEMBLY", type_ps: "PAINT SHOP"
    }
};

// Форматирование минут в "1ч 20м"
function formatFriendlyTime(minutes) {
    if (isNaN(minutes)) return "0 мин";
    if (minutes < 60) return `${minutes} мин`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}ч ${m}м`;
}

// Расчет разницы времени для "Следующего контейнера"
function calculateTimeDiff(timeStr) {
    // timeStr формата "HH:MM"
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const targetH = parseInt(match[1]);
    const targetM = parseInt(match[2]);
    
    const now = new Date();
    let target = new Date();
    target.setHours(targetH, targetM, 0, 0);

    // Вычисляем разницу в минутах
    let diffMinutes = (target - now) / 60000;

    // Логика перехода через сутки:
    // Если разница меньше -12 часов (например, сейчас 23:00, а цель 01:00), значит это завтра (+24ч)
    // Если разница больше +12 часов (вряд ли для склада), можно считать ошибкой или оставить как есть
    if (diffMinutes < -720) { 
        target.setDate(target.getDate() + 1);
        diffMinutes = (target - now) / 60000;
    }

    return Math.round(diffMinutes);
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function determineEffectiveLang() { return localLang ? localLang : serverLang; }

function toggleLocalLang() {
    if (!localLang) localLang = 'RU';
    else if (localLang === 'RU') localLang = 'EN_CN';
    else localLang = null;
    if (localLang) localStorage.setItem('warehouse_lang', localLang);
    else localStorage.removeItem('warehouse_lang');
    applyLanguage(determineEffectiveLang());
    updateLocalLangBtn();
}

function updateLocalLangBtn() {
    const btn = document.getElementById('localLangBtn');
    const label = document.getElementById('localLangLabel');
    if(!btn) return;
    if (localLang) {
        btn.classList.add('active');
        label.innerText = localLang === 'RU' ? 'RU' : 'EN/CN';
        btn.style.borderColor = '#007bff';
        const icon = btn.querySelector('.lang-icon');
        if(icon) icon.style.color = '#007bff';
        label.style.color = '#007bff';
    } else {
        btn.classList.remove('active');
        label.innerText = 'AUTO';
        btn.style.borderColor = '#444';
        const icon = btn.querySelector('.lang-icon');
        if(icon) icon.style.color = '#a0a0a0';
        label.style.color = '#a0a0a0';
    }
}

function applyLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    const t = TRANSLATIONS[lang];
    const safeSet = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    safeSet('txt_title', t.title); safeSet('txt_progress', t.progress); safeSet('txt_next', t.next);
    safeSet('txt_list', t.list); safeSet('txt_lunch', t.lunch); safeSet('txt_victory', t.victory);
    
    safeSet('txt_stat_title', t.stat_title);
    safeSet('txt_stat_done', t.stat_done);
    safeSet('txt_stat_wait', t.stat_wait);
    safeSet('txt_menu_stat', t.menu_stat);

    const emptyMsg = document.querySelector('.empty-message');
    if (emptyMsg) emptyMsg.innerText = t.empty;
}

function showToast(text, type) {
    const toast = document.getElementById('adminToast');
    const txt = document.getElementById('toastText');
    const icon = toast.querySelector('.toast-icon');
    if (txt) txt.innerText = text;
    if (icon) icon.innerText = type === 'success' ? 'check_circle' : 'error';
    if (toast) {
        toast.className = `admin-toast show ${type}`; 
        setTimeout(() => { toast.className = 'admin-toast'; }, 6000);
    }
}

function openLogin() { 
    document.getElementById('modalLogin').classList.add('open'); 
    setTimeout(() => document.getElementById('adminUser').focus(), 100); 
}
function closeModals() { 
    document.getElementById('modalLogin').classList.remove('open'); 
    document.getElementById('modalRegister').classList.remove('open');
    document.getElementById('adminPass').value = "";
}
function openRegister() {
    document.getElementById('modalLogin').classList.remove('open');
    document.getElementById('modalRegister').classList.add('open');
    setTimeout(() => document.getElementById('regName').focus(), 100);
}
function backToLogin() {
    document.getElementById('modalRegister').classList.remove('open');
    document.getElementById('modalLogin').classList.add('open');
}

// === УПРАВЛЕНИЕ СТАТИСТИКОЙ ===
function openStats() {
    document.getElementById('statsModal').classList.add('open');
    loadStatistics();
}
function closeStats() {
    document.getElementById('statsModal').classList.remove('open');
}

async function loadStatistics() {
    const doneList = document.getElementById('statDoneList');
    const waitList = document.getElementById('statWaitList');
    const doneCount = document.getElementById('statDoneCount');
    const waitCount = document.getElementById('statWaitCount');
    
    doneList.innerHTML = '<div style="color:#777; text-align:center;">Загрузка...</div>';
    waitList.innerHTML = '<div style="color:#777; text-align:center;">Загрузка...</div>';
    
    try {
        const response = await fetch(`${scriptUrl}?nocache=${Date.now()}&mode=get_stats`);
        const data = await response.json();
        
        const t = TRANSLATIONS[determineEffectiveLang()] || TRANSLATIONS["RU"];
        
        let doneHtml = "";
        let waitHtml = "";
        let dCount = 0;
        let wCount = 0;
        
        data.forEach(item => {
            let typeBadge = "";
            let rawType = item.type ? item.type.trim() : "";
            
            if (rawType === "BS") typeBadge = `<span class="mini-badge bs">${t.type_bs}</span>`;
            else if (rawType === "AS") typeBadge = `<span class="mini-badge as">${t.type_as}</span>`;
            else if (rawType === "PS") typeBadge = `<span class="mini-badge ps">${t.type_ps}</span>`;
            
            if (item.status === "DONE") {
                dCount++;
                doneHtml += `
                    <div class="stats-item done-item">
                        <div class="stats-item-left">
                            <div class="stats-item-id">${item.id} ${typeBadge}</div>
                        </div>
                        <div class="stats-item-time">🏁 ${item.time}</div>
                    </div>`;
            } else if (item.status === "WAIT") {
                wCount++;
                waitHtml += `
                    <div class="stats-item wait-item">
                        <div class="stats-item-left">
                            <div class="stats-item-id">${item.id} ${typeBadge}</div>
                        </div>
                        <div class="stats-item-time">⏱ ${item.time}</div>
                    </div>`;
            }
        });
        
        doneCount.innerText = dCount;
        waitCount.innerText = wCount;
        
        doneList.innerHTML = dCount > 0 ? doneHtml : '<div style="color:#555; text-align:center;">Пусто</div>';
        waitList.innerHTML = wCount > 0 ? waitHtml : '<div style="color:#555; text-align:center;">Всё готово</div>';
        
    } catch(e) {
        doneList.innerHTML = '<div style="color:red;">Ошибка</div>';
        waitList.innerHTML = '<div style="color:red;">Ошибка</div>';
        console.error(e);
    }
}

async function checkLogin() {
    const u = document.getElementById('adminUser').value.trim();
    const p = document.getElementById('adminPass').value.trim();
    if (!u || !p) { showToast("Введите данные", "error"); return; }
    showToast("Проверка...", "success");
    const hash = await sha256(p); 
    try {
        const r = await fetch(`${scriptUrl}?nocache=${Date.now()}&mode=login&user=${encodeURIComponent(u)}&hash=${hash}`);
        const txt = await r.text();
        if (txt.includes("CORRECT")) {
            sessionStorage.setItem('warehouse_auth', JSON.stringify({ user: u, pass: hash }));
            window.location.href = "admin.html";
        } else if (txt.includes("PENDING")) {
            showToast("Аккаунт ожидает подтверждения", "error");
        } else if (txt.includes("WRONG")) {
            showToast("Неверный логин или пароль", "error");
        } else {
            showToast("Ошибка: " + txt, "error");
        }
    } catch(e) { showToast("Сбой сети", "error"); console.error(e); }
}

async function doRegister() {
    const name = document.getElementById('regName').value.trim();
    const u = document.getElementById('regUser').value.trim();
    const p = document.getElementById('regPass').value.trim();
    if (!name || !u || !p) { showToast("Заполните все поля", "error"); return; }
    showToast("Отправка...", "success");
    const hash = await sha256(p);
    try {
        const url = `${scriptUrl}?nocache=${Date.now()}&mode=register&user=${encodeURIComponent(u)}&hash=${hash}&name=${encodeURIComponent(name)}`;
        const r = await fetch(url);
        const txt = await r.text();
        if (txt.includes("REGISTERED")) {
            showToast("Отправлено! Ждите одобрения.", "success");
            setTimeout(backToLogin, 2000);
        } else if (txt.includes("EXISTS")) {
            showToast("Логин занят", "error");
        } else {
            showToast("Ошибка: " + txt, "error");
        }
    } catch(e) { showToast("Сбой сети", "error"); console.error(e); }
}

function launchVictoryConfetti() {
     var duration = 5 * 60 * 1000; var end = Date.now() + duration;
     (function frame() {
         confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ffc107', '#28a745', '#ffffff'] });
         confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ffc107', '#28a745', '#ffffff'] });
         if (Date.now() < end) requestAnimationFrame(frame);
     }());
}

updateLocalLangBtn();
setInterval(() => {
    const d = new Date();
    document.getElementById('clock').innerText = d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
    const t = TRANSLATIONS[determineEffectiveLang()] || TRANSLATIONS["RU"];
    document.getElementById('date').innerText = d.toLocaleDateString(t.locale, {weekday:'long', day:'numeric', month:'long'});
    checkLunchTime(d);
}, 1000);

function checkLunchTime(now) {
    const [startH, startM] = lunchStartStr.split(':').map(Number);
    const [endH, endM] = lunchEndStr.split(':').map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    const start = startH * 60 + startM;
    const end = endH * 60 + endM; 
    const testUntil = localStorage.getItem('lunch_test_until');
    const isTest = testUntil && parseInt(testUntil) > Date.now();
    const isLunch = (cur >= start && cur < end) || isTest;
    const t = TRANSLATIONS[determineEffectiveLang()];
    
    if (isLunch) {
        if (!document.body.classList.contains('is-lunch')) document.body.classList.add('is-lunch');
        let target = new Date(); target.setHours(endH, endM, 0, 0);
        if (isTest) target = new Date(parseInt(testUntil));
        let diff = target - now;
        document.getElementById('lunchTimer').innerText = diff > 0 ? `${t.lunch_left} ${Math.ceil(diff/60000)} ${t.min}` : t.lunch_soon;
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
            if (sLang && TRANSLATIONS[sLang]) serverLang = sLang;
            csvData = parts[0];
        } else { if (!serverLang) serverLang = "RU"; }
        applyLanguage(determineEffectiveLang());

        if (csvData.includes("###LUNCH###")) {
            const parts = csvData.split("###LUNCH###");
            const times = parts[1].trim().split('|');
            if (times.length == 2) { lunchStartStr = times[0]; lunchEndStr = times[1]; }
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
        const t = TRANSLATIONS[determineEffectiveLang()] || TRANSLATIONS["RU"]; 

        if (r1 && r1.length > 2) {
            const st = r1[0].trim();
            const btn = document.getElementById('sts');
            btn.className = 'status-btn ' + (st==="ACTIVE"?"active":(st==="PAUSE"?"pause":"wait"));
            btn.innerText = st==="ACTIVE"?t.status_active:(st==="PAUSE"?t.status_pause:t.status_wait);

            const counts = r1[1].split('|');
            const done = parseInt(counts[0]) || 0;
            const total = parseInt(counts[1]) || 0;
            document.getElementById('cnt').innerText = `${done} / ${total}`;
            const p = total > 0 ? Math.round((done/total)*100) : 0;
            document.getElementById('pct').innerText = p + '%';
            document.getElementById('ring').style.strokeDashoffset = 942 - (942 * p / 100);
            if (!document.body.classList.contains('is-lunch')) {
                document.getElementById('ring').style.stroke = st === "ACTIVE" ? "var(--accent-green)" : (st === "PAUSE" ? "#555" : "var(--accent-yellow)");
            }
            if (total > 0 && done === total && !document.body.classList.contains('is-lunch')) {
                if (!document.body.classList.contains('is-victory')) {
                    document.body.classList.add('is-victory'); launchVictoryConfetti(); 
                    document.getElementById('victoryStat').innerText = `${done} / ${total}`;
                }
            } else {
                if (document.body.classList.contains('is-victory')) document.body.classList.remove('is-victory'); 
            }
            document.getElementById('nid').innerText = r1[2].trim();
            
            // --- ЛОГИКА ДЛЯ СЛЕДУЮЩЕГО КОНТЕЙНЕРА (ИСПРАВЛЕНА ОШИБКА) ---
            const ninf = r1[3] ? r1[3].trim() : "";
            const idiv = document.getElementById('ninfo');
            
            // Ищем время в строке (например, 08:00)
            const diffMinutes = calculateTimeDiff(ninf);
            
            // Если смогли посчитать разницу
            if (diffMinutes !== null) {
                const prettyTime = formatFriendlyTime(Math.abs(diffMinutes));
                
                if (diffMinutes >= 0) {
                    // Время еще не наступило (или сейчас)
                    idiv.innerHTML = `⏱ <span class="time-text">${t.eta_prefix} ${prettyTime}</span>`;
                } else {
                    // Время уже прошло
                    idiv.innerHTML = `⚠️ <span class="warn-text">${t.delay_prefix} ${prettyTime}</span>`;
                }
            } else { 
                // Если времени в ячейке нет (просто текст)
                idiv.innerHTML = ninf; 
            }
        }

        const listEl = document.getElementById('list');
        let newDataMap = new Map();
        
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] && rows[i][0].includes('|')) {
                 let parts = rows[i][0].split('|');
                 let id = parts[0].trim();
                 let time = parts[1].trim();
                 let dur = 0;
                 if (parts[2]) {
                     let drRaw = parts[2].trim().replace(/[,"]/g, '');
                     dur = parseInt(drRaw); if (isNaN(dur)) dur = 0;
                 }
                 
                 let ws = parts[3] ? parts[3].trim() : ""; 
                 
                 newDataMap.set(id, { time, dur, ws });
            }
        }
        
        if (newDataMap.size > 0) {
            const emptyMsg = listEl.querySelector('.empty-message');
            if (emptyMsg) emptyMsg.remove();
        }

        const currentChildren = Array.from(listEl.querySelectorAll('.list-item:not(.remove-item)'));
        currentChildren.forEach(el => {
            if (!newDataMap.has(el.getAttribute('data-id'))) {
                el.classList.add('remove-item');
                setTimeout(() => { if (el.parentNode) el.remove(); checkEmpty(); }, 1000);
            }
        });
        
        newDataMap.forEach((data, id) => {
            let existingEl = listEl.querySelector(`.list-item[data-id="${id}"]:not(.remove-item)`);
            let isOverdue = data.dur > 30;
            let overdueClass = isOverdue ? 'overdue' : '';
            let iconHtml = isOverdue ? '<span style="font-size:30px">⚠️</span>' : `<img src="${CONTAINER_IMG_SRC}" class="container-img" alt="box">`;
            
            let badgeClass = 'badge-other';
            if (data.ws === 'BS') badgeClass = 'badge-bs';
            if (data.ws === 'AS') badgeClass = 'badge-as';
            if (data.ws === 'PS') badgeClass = 'badge-ps';
            let wsHtml = data.ws ? `<span class="badge ${badgeClass}">${data.ws}</span>` : '';

            // --- КАРТОЧКА С ПОДПИСЯМИ ---
            let innerHTML = `
                <div class="col-icon">${iconHtml}</div>
                <div class="col-main">
                    <span class="id-text">${id}</span>
                    ${wsHtml}
                </div>
                <div class="col-right">
                    <div class="stat-box">
                        <div class="stat-label">${t.lbl_start}</div>
                        <div class="stat-value">${data.time}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">${t.lbl_dur}</div>
                        <div class="stat-value val-dur">${formatFriendlyTime(data.dur)}</div>
                    </div>
                </div>
            `;
            
            if (existingEl) {
                if (existingEl.innerHTML !== innerHTML) existingEl.innerHTML = innerHTML;
                if (isOverdue) existingEl.classList.add('overdue'); else existingEl.classList.remove('overdue');
            } else {
                let newEl = document.createElement('div');
                newEl.className = `list-item ${overdueClass} slide-in`;
                newEl.setAttribute('data-id', id);
                newEl.innerHTML = innerHTML;
                listEl.prepend(newEl);
            }
        });
        
        if (newDataMap.size === 0) checkEmpty();
        function checkEmpty() {
             const alive = listEl.querySelectorAll('.list-item:not(.remove-item)');
             const em = listEl.querySelector('.empty-message');
             if (alive.length === 0 && !em) listEl.innerHTML = `<div class="empty-message">${t.empty}</div>`;
             else if (alive.length > 0 && em) em.remove();
        }

    } catch(e) { console.log("Update error:", e); }
}

async function logVisit() {
    const ua = navigator.userAgent; 
    let ip = "Не определен";
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (data && data.ip) ip = data.ip;
    } catch (e) { console.warn("IP fail", e); }

    try {
        const url = `${scriptUrl}?mode=log_visit&ua=${encodeURIComponent(ua)}&ip=${encodeURIComponent(ip)}`;
        await fetch(url);
    } catch (e) { console.error("Log error", e); }
}

logVisit();
setInterval(update, 3000);
update();