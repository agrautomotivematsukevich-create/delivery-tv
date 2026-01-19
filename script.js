// ================================================================
// ВСТАВЬТЕ ВАШУ ССЫЛКУ НИЖЕ:
const scriptUrl = 'https://script.google.com/macros/s/AKfycbzIzPaYqxLdSCrMxJsvCuFylVZc0vRRqad1KJG3cBvy9Gq4hYgT-jGh92j3f231_BzeUQ/exec'; 
// ================================================================

const CONTAINER_IMG_SRC = 'container.svg'; 

let lunchStartStr = "11:30";
let lunchEndStr = "12:00";
let serverLang = "RU"; 
let localLang = localStorage.getItem('warehouse_lang');
let shiftChart = null;
let historyChart = null;

const TRANSLATIONS = {
    RU: {
        title: "Мониторинг Склада", progress: "Общий прогресс", next: "Следующий контейнер", list: "Активные разгрузки",
        lunch: "ОБЕДЕННЫЙ ПЕРЕРЫВ", victory: "ПЛАН ВЫПОЛНЕН!", status_active: "В РАБОТЕ", status_pause: "ПАУЗА", status_wait: "ОЖИДАНИЕ",
        lunch_left: "До конца:", lunch_soon: "Скоро работа", empty: "Нет активных разгрузок", min: "мин.", locale: "ru-RU", 
        eta_prefix: "ПРИБУДЕТ ЧЕРЕЗ: ", delay_prefix: "ОПОЗДАНИЕ: ",
        lbl_start: "НАЧАЛО", lbl_dur: "В РАБОТЕ",
        // STATS
        tab_shift: "Смена", tab_analytics: "Аналитика", tab_lots: "Лоты",
        stat_done: "Выгружено", stat_wait: "В очереди",
        a_week: "Объем", a_avg: "Среднее время", a_best: "Рекорд",
        type_bs: "КУЗОВНОЙ", type_as: "СБОРКА", type_ps: "ПОКРАСКА",
        btn_driver: "Водитель", drv_title: "Очередь выгрузки",
        s_done: "ВЫПОЛНЕНО", s_wait: "ОСТАЛОСЬ",
        no_schedule: "На сегодня нет расписания",
        lots_info: "Статистика по Лотам",
        // MODALS
        login_title: "Вход", reg_title: "Регистрация", 
        btn_login: "Войти", btn_reg: "Отправить", btn_cancel: "Отмена",
        btn_to_reg: "Регистрация", btn_to_log: "Вернуться ко входу"
    },
    EN_CN: {
        title: "Warehouse / 仓库监控", progress: "Progress / 总体进度", next: "Next / 下一个集装箱", list: "Active / 正在卸货",
        lunch: "LUNCH / 午休时间", victory: "COMPLETED / 计划完成", status_active: "ACTIVE / 进行中", status_pause: "PAUSED / 暂停", status_wait: "WAITING / 等待中",
        lunch_left: "Left / 剩余:", lunch_soon: "Back soon / 即将开始", empty: "No Tasks / 无活动任务", min: "min / 分", locale: "zh-CN", 
        eta_prefix: "ETA / 预计: ", delay_prefix: "DELAY / 延迟: ",
        lbl_start: "START / 开始", lbl_dur: "DURATION / 持续",
        // STATS
        tab_shift: "Shift / 班次", tab_analytics: "Analytics / 分析", tab_lots: "Lots / 批次",
        stat_done: "Unloaded / 已卸载", stat_wait: "Queue / 排队",
        a_week: "Volume / 数量", a_avg: "Avg Time / 平均时间", a_best: "Best / 最佳",
        type_bs: "BODY SHOP", type_as: "ASSEMBLY", type_ps: "PAINT SHOP",
        btn_driver: "Driver / 司机", drv_title: "Queue / 排队",
        s_done: "DONE", s_wait: "LEFT",
        no_schedule: "No Schedule for Today / 今日无排程",
        lots_info: "Lot Statistics / 批次统计",
        // MODALS
        login_title: "Login / 登录", reg_title: "Register / 注册",
        btn_login: "Enter / 进入", btn_reg: "Send / 发送", btn_cancel: "Cancel / 取消",
        btn_to_reg: "Registration / 注册", btn_to_log: "Back to Login / 返回"
    }
};

function formatFriendlyTime(minutes) {
    if (isNaN(minutes)) return "0 мин";
    if (minutes < 60) return `${minutes} мин`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}ч ${m}м`;
}

function calculateTimeDiff(timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const targetH = parseInt(match[1]);
    const targetM = parseInt(match[2]);
    const now = new Date();
    let target = new Date();
    target.setHours(targetH, targetM, 0, 0);
    let diffMinutes = (target - now) / 60000;
    if (diffMinutes < -720) { target.setDate(target.getDate() + 1); diffMinutes = (target - now) / 60000; }
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
    safeSet('txt_no_schedule', t.no_schedule);
    
    // Stats & Tabs
    safeSet('tab_shift', t.tab_shift); safeSet('tab_analytics', t.tab_analytics); safeSet('tab_lots', t.tab_lots);
    safeSet('txt_stat_done', t.stat_done); safeSet('txt_stat_wait', t.stat_wait);
    safeSet('txt_a_week', t.a_week); safeSet('txt_a_avg', t.a_avg); safeSet('txt_a_best', t.a_best);
    safeSet('txt_s_done', t.s_done); safeSet('txt_s_wait', t.s_wait);
    safeSet('txt_lots_info', t.lots_info);
    
    // Driver
    safeSet('txt_btn_driver', t.btn_driver); safeSet('txt_drv_title', t.drv_title);

    // Modals
    safeSet('txt_login_title', t.login_title); safeSet('btn_login_enter', t.btn_login);
    safeSet('txt_reg_title', t.reg_title); safeSet('btn_reg_send', t.btn_reg);
    safeSet('btn_cancel_1', t.btn_cancel); safeSet('btn_cancel_2', t.btn_cancel);
    safeSet('btn_to_reg', t.btn_to_reg); safeSet('btn_to_log', t.btn_to_log);

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

// === TABS & STATS LOGIC ===
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('content_' + tabName).classList.add('active');
    document.getElementById('tab_' + tabName).classList.add('active');
}

function openStats() {
    document.getElementById('statsModal').classList.add('open');
    loadStatistics(false); // Mode normal
}
function openDriverMode() {
    document.getElementById('driverModal').classList.add('open');
    loadStatistics(true); // Mode driver
}
function closeStats() {
    document.getElementById('statsModal').classList.remove('open');
}

async function loadStatistics(isDriverMode) {
    const doneList = document.getElementById('statDoneList');
    const waitList = isDriverMode ? document.getElementById('driverQueueList') : document.getElementById('statWaitList');
    
    if(!isDriverMode) doneList.innerHTML = '<div style="color:#777;text-align:center;">Loading...</div>';
    waitList.innerHTML = '<div style="color:#777;text-align:center;">Loading...</div>';
    
    try {
        const t = TRANSLATIONS[determineEffectiveLang()] || TRANSLATIONS["RU"];
        
        // 1. Текущая смена
        const response = await fetch(`${scriptUrl}?nocache=${Date.now()}&mode=get_stats`);
        const data = await response.json();
        
        let doneHtml = "", waitHtml = "", dCount = 0, wCount = 0;
        data.forEach(item => {
            let typeBadge = "";
            if (!isDriverMode) {
                let rt = item.type ? item.type.trim() : "";
                if (rt === "BS") typeBadge = `<span class="mini-badge bs">${t.type_bs}</span>`;
                else if (rt === "AS") typeBadge = `<span class="mini-badge as">${t.type_as}</span>`;
                else if (rt === "PS") typeBadge = `<span class="mini-badge ps">${t.type_ps}</span>`;
            }
            
            if (item.status === "DONE") {
                dCount++;
                doneHtml += `<div class="stats-row"><div class="row-id"><span class="material-icons" style="color:#30D158;font-size:1rem;">check_circle</span> ${item.id} ${typeBadge}</div><div class="row-time">${item.time}</div></div>`;
            } else if (item.status === "WAIT") {
                wCount++;
                let style = isDriverMode ? 'padding:15px 0; border-bottom:1px solid rgba(255,255,255,0.1); font-size:1.2rem;' : '';
                waitHtml += `<div class="stats-row" style="${style}"><div class="row-id"><span class="material-icons" style="color:#777;font-size:1rem;">schedule</span> ${item.id} ${typeBadge}</div><div class="row-time">${item.time}</div></div>`;
            }
        });
        
        if (!isDriverMode) {
            document.getElementById('statDoneCount').innerText = dCount;
            document.getElementById('statWaitCount').innerText = wCount;
            document.getElementById('sumDone').innerText = dCount;
            document.getElementById('sumWait').innerText = wCount;
            
            doneList.innerHTML = dCount > 0 ? doneHtml : '<div style="color:#555;text-align:center;padding:20px;">-</div>';
            updateShiftChart(dCount, wCount);
            loadHistory();
        }
        waitList.innerHTML = wCount > 0 ? waitHtml : '<div style="color:#555;text-align:center;padding:20px;">-</div>';
        
    } catch(e) { console.error(e); }
}

async function loadHistory() {
    try {
        const start = document.getElementById('dateStart').value;
        const end = document.getElementById('dateEnd').value;
        const url = `${scriptUrl}?nocache=${Date.now()}&mode=get_history${start ? '&start='+start : ''}${end ? '&end='+end : ''}`;
        
        const response = await fetch(url);
        const data = await response.json();
        const historyData = data.days;
        const lotsData = data.lots;
        
        // 1. График
        let totalVol = 0, totalAvg = 0, daysWithData = 0, bestTime = 999;
        let labels = [], values = [];
        // Сортировка по дате (backend может вернуть как попало)
        historyData.sort((a, b) => a.date.localeCompare(b.date));
        
        historyData.forEach(day => {
            labels.push(day.date); values.push(day.done); totalVol += day.done;
            if (day.avgTime > 0) { totalAvg += day.avgTime; daysWithData++; if (day.avgTime < bestTime) bestTime = day.avgTime; }
        });
        
        let finalAvg = daysWithData > 0 ? Math.round(totalAvg / daysWithData) : 0;
        if (bestTime === 999) bestTime = 0;
        
        document.getElementById('val_week_total').innerText = totalVol;
        document.getElementById('val_week_avg').innerHTML = `${finalAvg} <span style="font-size:1rem;opacity:0.5">min</span>`;
        document.getElementById('val_week_best').innerHTML = `${bestTime} <span style="font-size:1rem;opacity:0.5">min</span>`;
        updateHistoryChart(labels, values);

        // 2. Лоты
        let lotsHtml = "";
        lotsData.forEach(lot => {
            lotsHtml += `<div class="stats-row"><div class="row-id">${lot.name}</div><div class="row-time" style="color:white;font-weight:700;">${lot.count}</div></div>`;
        });
        document.getElementById('lotsList').innerHTML = lotsHtml || '<div style="color:#555;text-align:center;">No Data</div>';

    } catch(e) { console.error("History Error", e); }
}

function updateShiftChart(done, wait) {
    const ctx = document.getElementById('shiftChart').getContext('2d');
    if (shiftChart) shiftChart.destroy();
    shiftChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Done', 'Queue'], datasets: [{ data: [done, wait], backgroundColor: ['#30D158', '#333'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '75%' }
    });
}

function updateHistoryChart(labels, data) {
    const ctx = document.getElementById('historyChart').getContext('2d');
    if (historyChart) historyChart.destroy();
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Containers', data: data, borderColor: '#0A84FF', backgroundColor: 'rgba(10, 132, 255, 0.1)', fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }, x: { grid: { display: false }, ticks: { color: '#888' } } } }
    });
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
        let driverState = "SHOW"; // Default
        
        if (fullText.includes("###LANG###")) {
            const parts = fullText.split("###LANG###");
            const afterLang = parts[1].split("###DRIVER###");
            const sLang = afterLang[0].trim();
            if (sLang && TRANSLATIONS[sLang]) serverLang = sLang;
            if (afterLang.length > 1) driverState = afterLang[1].trim();
            csvData = parts[0];
        } else { if (!serverLang) serverLang = "RU"; }
        applyLanguage(determineEffectiveLang());

        const drvBtn = document.getElementById('driverBtn');
        if (driverState === "SHOW") drvBtn.classList.add('visible'); else drvBtn.classList.remove('visible');

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

        if (r1 && r1[2] === "NO_SCHEDULE") {
            document.body.classList.add('is-noschedule');
            return;
        } else {
            document.body.classList.remove('is-noschedule');
        }

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
                    document.body.classList.add('is-victory'); 
                    document.getElementById('victoryStat').innerText = `${done} / ${total}`;
                }
            } else {
                if (document.body.classList.contains('is-victory')) document.body.classList.remove('is-victory'); 
            }
            document.getElementById('nid').innerText = r1[2].trim();
            
            const ninf = r1[3] ? r1[3].trim() : "";
            const idiv = document.getElementById('ninfo');
            
            const diffMinutes = calculateTimeDiff(ninf);
            if (diffMinutes !== null) {
                const prettyTime = formatFriendlyTime(Math.abs(diffMinutes));
                if (diffMinutes >= 0) idiv.innerHTML = `⏱ <span class="time-text">${t.eta_prefix} ${prettyTime}</span>`;
                else idiv.innerHTML = `⚠️ <span class="warn-text">${t.delay_prefix} ${prettyTime}</span>`;
            } else { 
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