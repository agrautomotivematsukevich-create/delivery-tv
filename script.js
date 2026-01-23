// ================================================================
// ВАЖНО: Вставьте сюда актуальную ссылку Web App
const scriptUrl = 'https://script.google.com/macros/s/AKfycbwHlxk0aI3HeCPqA9pZDvh1UqMfJpvHZ42OQsHPxKOgQ2VKxVd_jvuEKuO_ar6DSZOlxQ/exec'; 
// ================================================================

const CONTAINER_IMG_SRC = 'container.svg'; 

let serverLang = "RU"; 
let localLang = localStorage.getItem('warehouse_lang') || "RU";
let currentUser = JSON.parse(localStorage.getItem('warehouse_user'));
let currentTaskAction = null; 
let photoFiles = { 1: null, 2: null };
let currentPhotoIdx = 0;
let shiftChart = null;

let globalDone = 0;
let globalTotal = 0;

const TRANSLATIONS = {
    RU: {
        title: "Мониторинг Склада", progress: "ОБЩИЙ ПРОГРЕСС", next: "СЛЕДУЮЩИЙ", list: "АКТИВНЫЕ",
        lunch: "ОБЕД", victory: "ПЛАН ВЫПОЛНЕН!", 
        status_active: "В РАБОТЕ", status_pause: "ПАУЗА", status_wait: "ОЖИДАНИЕ",
        eta_prefix: "ЧЕРЕЗ: ", delay_prefix: "ОПОЗДАНИЕ: ",
        lbl_start: "НАЧАЛО", lbl_dur: "В РАБОТЕ",
        stats_title: "СТАТИСТИКА", stat_done: "ГОТОВО", stat_queue: "ОЧЕРЕДЬ",
        list_done: "ВЫГРУЖЕНО", list_wait: "В ОЧЕРЕДИ",
        drv_title: "Терминал", btn_login: "Войти", btn_start: "НАЧАТЬ", btn_finish: "ЗАВЕРШИТЬ",
        lbl_photo1: "Общее фото (Сзади)", lbl_photo2: "Фото пломбы", lbl_photo_empty: "Фото пустого",
        msg_uploading: "Загрузка...", msg_success: "Успешно!",
        login_title: "Вход", reg_title: "Регистрация", empty: "Нет задач",
        btn_reg: "Отправить", btn_cancel: "Отмена"
    },
    EN_CN: {
        title: "Warehouse Monitor / 仓库监控", progress: "PROGRESS / 进度", next: "NEXT / 下一个", list: "ACTIVE TASKS / 任务",
        lunch: "LUNCH BREAK / 午休", victory: "COMPLETED! / 完成", 
        status_active: "ACTIVE / 运行", status_pause: "PAUSED / 暂停", status_wait: "WAITING / 等待",
        eta_prefix: "ETA / 预计: ", delay_prefix: "DELAY / 延迟: ",
        lbl_start: "START / 开始", lbl_dur: "DURATION / 持续",
        stats_title: "STATISTICS / 统计", stat_done: "DONE / 完成", stat_queue: "QUEUE / 排队",
        list_done: "UNLOADED / 已卸载", list_wait: "QUEUE / 等待中",
        drv_title: "Terminal / 终端", btn_login: "Login / 登录", btn_start: "START / 开始", btn_finish: "FINISH / 完成",
        lbl_photo1: "General Photo / 照片", lbl_photo2: "Seal Photo / 封条", lbl_photo_empty: "Empty Photo / 空箱",
        msg_uploading: "Uploading... / 上传中", msg_success: "Success! / 成功",
        login_title: "Login / 登录", reg_title: "Register / 注册", empty: "No tasks / 无任务",
        btn_reg: "Send / 发送", btn_cancel: "Cancel / 取消"
    }
};

function t(key) { return TRANSLATIONS[localLang][key] || key; }
function formatFriendlyTime(m) { if(isNaN(m))return "0м"; if(m<60)return m+"м"; return Math.floor(m/60)+"ч "+(m%60)+"м"; }
function calculateTimeDiff(timeStr) { const match = timeStr.match(/(\d{1,2}):(\d{2})/); if (!match) return null; const targetH = parseInt(match[1]); const targetM = parseInt(match[2]); const now = new Date(); let target = new Date(); target.setHours(targetH, targetM, 0, 0); let diffMinutes = (target - now) / 60000; if (diffMinutes < -720) { target.setDate(target.getDate() + 1); diffMinutes = (target - now) / 60000; } return Math.round(diffMinutes); }
function showToast(text, type) { const toast = document.getElementById('adminToast'); document.getElementById('toastText').innerText = text; toast.className = `admin-toast show ${type}`; setTimeout(() => toast.className = 'admin-toast', 3000); }

// === INIT (ГЛАВНАЯ ТОЧКА ВХОДА) ===
function init() {
    // Всегда показываем главный экран
    const main = document.getElementById('mainScreen');
    if (main) main.classList.add('active');

    // Если вошли - показываем кнопку и обновляем данные оператора в фоне
    if (currentUser) {
        checkSession();
        // Запускаем обновление оператора в фоне, чтобы данные были свежие при открытии
        setInterval(loadOperatorTasks, 15000); 
    }

    // Запускаем основное обновление (дашборд)
    setInterval(update, 5000);
    update();
    
    applyLanguage();
    setInterval(updateClock, 1000);
}

// === AUTH ===
function checkSession() {
    const txt = document.getElementById('authBtnText');
    const drvBtn = document.getElementById('driverBtn');
    const icon = document.querySelector('#authBtn .material-icons');
    
    if (currentUser) {
        if(txt) txt.innerText = currentUser.name;
        if(drvBtn) drvBtn.classList.add('visible'); 
        if(icon) icon.style.display = 'none'; 
    } else {
        if(txt) txt.innerText = t('btn_login');
        if(drvBtn) drvBtn.classList.remove('visible');
        if(icon) icon.style.display = 'inline-block';
    }
}

function handleAuthClick() { 
    if (currentUser) {
        document.getElementById('profileModal').classList.add('open');
        document.getElementById('profName').innerText = currentUser.name;
    } else openLogin(); 
}

function doLogout() { 
    localStorage.removeItem('warehouse_user'); 
    currentUser = null; 
    closeModals(); 
    window.location.reload(); 
}

async function checkLogin() {
    const u = document.getElementById('adminUser').value.trim();
    const p = document.getElementById('adminPass').value.trim();
    if (!u || !p) return;
    const msgBuffer = new TextEncoder().encode(p);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    try {
        const r = await fetch(`${scriptUrl}?nocache=${Date.now()}&mode=login&user=${encodeURIComponent(u)}&hash=${hashHex}`);
        const txt = await r.text();
        if (txt.includes("CORRECT")) {
            currentUser = { user: u, name: u }; 
            localStorage.setItem('warehouse_user', JSON.stringify(currentUser));
            closeModals(); 
            window.location.reload(); // Перезагрузка для применения
        } else showToast("Ошибка входа", "error");
    } catch(e) { console.error(e); }
}

async function doRegister() {
    const name = document.getElementById('regName').value.trim();
    const u = document.getElementById('regUser').value.trim();
    const p = document.getElementById('regPass').value.trim();
    if (!name || !u || !p) return;
    const msgBuffer = new TextEncoder().encode(p);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    try {
        await fetch(`${scriptUrl}?nocache=${Date.now()}&mode=register&user=${encodeURIComponent(u)}&hash=${hashHex}&name=${encodeURIComponent(name)}`);
        showToast("Заявка отправлена", "success"); backToLogin();
    } catch(e) { console.error(e); }
}

// === UI FUNCTIONS ===
function toggleLocalLang() { localLang = (localLang === 'RU') ? 'EN_CN' : 'RU'; localStorage.setItem('warehouse_lang', localLang); applyLanguage(); }
function applyLanguage() { 
    const lbl = document.getElementById('localLangLabel');
    if(lbl) lbl.innerText = localLang === 'RU' ? 'RU' : 'EN';
    checkSession();
}

function openLogin() { document.getElementById('modalLogin').classList.add('open'); }
function openRegister() { closeModals(); document.getElementById('modalRegister').classList.add('open'); }
function backToLogin() { closeModals(); openLogin(); }
function closeModals() { document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('open')); }

// === FIXED: MISSING FUNCTIONS ===
function closeActionModal() {
    document.getElementById('actionModal').classList.remove('open');
}

function openStats() {
    document.getElementById('statsModal').classList.add('open');
    loadStatistics(false); 
}
function closeStats() { document.getElementById('statsModal').classList.remove('open'); }

// Открывает Терминал как МОДАЛЬНОЕ ОКНО
function openDriverMode() { 
    if (!currentUser) { openLogin(); return; }
    document.getElementById('driverModal').classList.add('open'); 
    loadStatistics(true); 
}
function closeDriverMode() {
    document.getElementById('driverModal').classList.remove('open');
}

// === DATA LOADING ===
// Эта функция теперь используется только для обновления списка в фоне или при открытии модалки, но не для отрисовки страницы
async function loadOperatorTasks() {
    // Оставляем пустым, так как теперь используем loadStatistics(true) для терминала
}

async function loadStatistics(isDriverMode) {
    // Выбираем правильный контейнер: если режим водителя -> модалка терминала, иначе -> модалка статистики
    const list = isDriverMode ? document.getElementById('driverQueueList') : document.getElementById('statWaitList');
    if(list) list.innerHTML = '<div style="text-align:center;color:#888;">Загрузка...</div>';
    
    try {
        const response = await fetch(`${scriptUrl}?nocache=${Date.now()}&mode=get_operator_tasks`);
        const data = await response.json();
        
        let htmlList = "";
        let dCount = 0, wCount = 0;

        data.forEach(task => {
            let id = task.id;
            let time = task.start_time || task.eta || "";
            let status = task.status;
            let phone = task.phone;

            if (status === "DONE") {
                dCount++; // Подсчет выполненных
            } else {
                wCount++;
                
                // Элемент списка (общий стиль)
                let badgeClass = "mat-badge";
                if ((task.type || "").includes("BS")) badgeClass += " BS";
                else if ((task.type || "").includes("AS")) badgeClass += " AS";
                else if ((task.type || "").includes("PS")) badgeClass += " PS";
                let typeHtml = `<span class="${badgeClass}" style="margin-left:10px; font-size:0.7rem;">${task.type||""}</span>`;

                if (isDriverMode) {
                    // ТЕРМИНАЛ: С кнопками действий и телефоном
                    let phoneBtn = phone ? `<a href="tel:${phone}" class="btn-call" style="width:36px; height:36px; margin-right:10px;"><i class="material-icons" style="font-size:1rem;">call</i></a>` : "";
                    
                    let actionBtn = "";
                    if (status === "WAIT") {
                        actionBtn = `<button onclick="handleTaskClick('${id}', 'WAIT', '${task.type}')" style="background:var(--accent-blue); border:none; padding:8px 15px; border-radius:8px; color:white; font-weight:700;">НАЧАТЬ</button>`;
                    } else {
                        actionBtn = `<button onclick="handleTaskClick('${id}', 'ACTIVE', '${task.type}')" style="background:var(--accent-green); border:none; padding:8px 15px; border-radius:8px; color:black; font-weight:700;">ЗАВЕРШИТЬ</button>`;
                    }

                    htmlList += `
                    <div class="mini-item" style="padding:15px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; flex-direction:column;">
                            <div style="display:flex; align-items:center;">
                                <span class="mini-id" style="font-size:1.4rem">${id}</span>
                                ${typeHtml}
                            </div>
                            <span class="mini-time" style="opacity:0.5">${time}</span>
                        </div>
                        <div style="display:flex; align-items:center;">
                            ${phoneBtn}
                            ${actionBtn}
                        </div>
                    </div>`;
                } else {
                    // СТАТИСТИКА (Очередь): Просто список
                    htmlList += `<div class="mini-item"><span class="mini-id">${id}</span><span class="mini-time">${time}</span></div>`;
                }
            }
        });

        if (isDriverMode) {
            list.innerHTML = htmlList || `<div style="text-align:center; padding:20px; color:#888;">${t('empty')}</div>`;
        } else {
            // Для окна статистики заполняем списки
            if(document.getElementById('statWaitList')) document.getElementById('statWaitList').innerHTML = htmlList;
            
            // Обновляем цифры из глобальных переменных (с дашборда)
            const elDC = document.getElementById('statDoneCount'); if(elDC) elDC.innerText = globalDone;
            const elWC = document.getElementById('statWaitCount'); if(elWC) elWC.innerText = (globalTotal - globalDone);
            const elSD = document.getElementById('sumDone'); if(elSD) elSD.innerText = globalDone;
            const elSW = document.getElementById('sumWait'); if(elSW) elSW.innerText = (globalTotal - globalDone);
            
            updateShiftChart(globalDone, (globalTotal - globalDone));
        }
    } catch(e) { console.error("StatsLoad Error:", e); }
}

// === ACTION LOGIC ===
function handleTaskClick(id, status, type) {
    const isStart = (status === 'WAIT');
    currentTaskAction = { id: id, type: isStart ? 'start' : 'finish' };
    document.getElementById('actionTitle').innerText = `${id} (${isStart ? t('btn_start') : t('btn_finish')})`;
    
    // Сброс и показ модалки
    document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('selected'));
    currentTaskAction.zone = null;
    photoFiles = {1:null, 2:null};
    document.getElementById('status_photo1').innerText = "";
    document.getElementById('status_photo2').innerText = "";
    document.getElementById('deferUpload').checked = false;

    if (isStart) {
        document.getElementById('zoneSelectBlock').style.display = 'block';
        document.getElementById('area_photo2').style.display = 'flex';
        document.getElementById('lbl_photo1').innerText = t('lbl_photo1');
        document.getElementById('btnAction').innerText = t('btn_start');
    } else {
        document.getElementById('zoneSelectBlock').style.display = 'none';
        document.getElementById('area_photo2').style.display = 'none';
        document.getElementById('lbl_photo1').innerText = t('lbl_photo_empty');
        document.getElementById('btnAction').innerText = t('btn_finish');
    }
    document.getElementById('actionModal').classList.add('open');
}

function selectZone(el, zone) {
    document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    currentTaskAction.zone = zone;
}

function triggerFile(idx) { currentPhotoIdx = idx; document.getElementById('fileInput').click(); }
function handleFile(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        document.getElementById(`status_photo${currentPhotoIdx}`).innerText = '...';
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                // УВЕЛИЧЕНО КАЧЕСТВО ФОТО
                const scale = 1600 / img.width; 
                canvas.width = 1600;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                let fileNameSuffix = currentTaskAction.type === 'start' ? (currentPhotoIdx == 1 ? "_General" : "_Seal") : "_Empty";
                photoFiles[currentPhotoIdx] = {
                    data: canvas.toDataURL('image/jpeg', 0.9), // Качество 90%
                    mime: 'image/jpeg',
                    name: `${currentTaskAction.id}${fileNameSuffix}.jpg`
                };
                document.getElementById(`status_photo${currentPhotoIdx}`).innerText = '✓';
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
    input.value = '';
}

async function submitTaskAction() {
    const act = currentTaskAction;
    const btn = document.getElementById('btnAction');
    if (act.type === 'start' && !act.zone) { showToast("Выберите зону", "error"); return; }
    const defer = document.getElementById('deferUpload').checked;
    let urlGen = "", urlSeal = "", urlEmpty = "";

    if (!defer) {
        btn.innerText = t('msg_uploading');
        for (let k in photoFiles) {
            if (photoFiles[k]) {
                try {
                    const res = await fetch(scriptUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({ mode: 'upload_photo', image: photoFiles[k].data, mimeType: photoFiles[k].mime, filename: photoFiles[k].name })
                    });
                    const resData = await res.json();
                    if(resData.status === "SUCCESS") {
                        if (act.type === 'start') { if (k == 1) urlGen = resData.url; if (k == 2) urlSeal = resData.url; } 
                        else urlEmpty = resData.url;
                    }
                } catch(e) {}
            }
        }
    }
    
    btn.innerText = "...";
    const url = `${scriptUrl}?mode=task_action&id=${act.id}&act=${act.type}&op=${encodeURIComponent(currentUser.name)}&zone=${act.zone || ''}&pGen=${encodeURIComponent(urlGen)}&pSeal=${encodeURIComponent(urlSeal)}&pEmpty=${encodeURIComponent(urlEmpty)}`;
    await fetch(url);
    showToast(t('msg_success'), "success");
    closeActionModal();
    if (currentUser) loadStatistics(true); // Обновляем список терминала
}

// === MAIN SCREEN LOGIC ===
function updateShiftChart(done, wait) { 
    const canvas = document.getElementById('shiftChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d'); 
    if (shiftChart) shiftChart.destroy(); 
    shiftChart = new Chart(ctx, { 
        type: 'doughnut', 
        data: { labels: ['Done', 'Queue'], datasets: [{ data: [done, wait], backgroundColor: ['#30D158', '#333'], borderWidth: 0 }] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '85%' } 
    }); 
}

function updateClock() { const d = new Date(); document.getElementById('clock').innerText = d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}); document.getElementById('date').innerText = d.toLocaleDateString('ru-RU', {weekday:'long', day:'numeric', month:'long'}); }

async function update() {
    try {
        const res = await fetch(scriptUrl + '?nocache=' + Date.now());
        const text = await res.text();
        
        const intro = document.getElementById('intro');
        if(intro && !intro.classList.contains('hidden')) {
            intro.style.opacity = '0';
            setTimeout(() => { if(intro) intro.remove(); }, 800);
        }

        if(!text.includes("DOCTYPE")) {
            const parts = text.split("###MSG###");
            const lines = parts[0].split('\n');
            const r1 = lines[0].split(';'); 

            if (r1.length > 2) {
                const st = r1[0].trim();
                const counts = r1[1].split('|');
                const done = parseInt(counts[0]) || 0;
                const total = parseInt(counts[1]) || 0;
                
                globalDone = done;
                globalTotal = total;

                document.getElementById('cnt').innerText = `${done} / ${total}`;
                const p = total > 0 ? Math.round((done/total)*100) : 0;
                document.getElementById('pct').innerText = p + '%';
                
                const ring = document.getElementById('ring');
                if(ring) ring.style.strokeDashoffset = 942 - (942 * p / 100);
                
                const stsBtn = document.getElementById('sts');
                if(stsBtn) {
                    stsBtn.className = "status-badge " + (st==="ACTIVE"?"active":(st==="PAUSE"?"pause":"wait"));
                    stsBtn.innerText = st === "ACTIVE" ? t('status_active') : (st === "PAUSE" ? t('status_pause') : t('status_wait'));
                }

                document.getElementById('nid').innerText = r1[2].trim();
                document.getElementById('ninfo').innerText = r1[3].trim();
                
                if (total > 0 && done === total) document.body.classList.add('is-special');
                else document.body.classList.remove('is-special');
            }

            const listEl = document.getElementById('list');
            // Простая очистка и заполнение
            if(listEl) {
                let newData = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].includes('|')) {
                         let parts = lines[i].split('|');
                         newData.push({id: parts[0], start: parts[1], zone: parts[4] });
                    }
                }
                
                let html = "";
                newData.forEach(d => {
                    let zoneHtml = d.zone ? `<span class="badge" style="background:#555;">${d.zone}</span>` : '';
                    html += '<div class="list-item"><div class="col-icon"><img src="' + CONTAINER_IMG_SRC + '" class="container-img"></div><div class="col-main"><span class="id-text">' + d.id + '</span> ' + zoneHtml + '</div><div class="col-right"><div class="stat-box"><div class="stat-label">' + t('lbl_start') + '</div><div class="stat-value">' + d.start + '</div></div></div></div>';
                });
                listEl.innerHTML = html;
            }
        }
    } catch(e) { console.error(e); }
}

init();