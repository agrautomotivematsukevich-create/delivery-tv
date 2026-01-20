// ================================================================
// ВАША ССЫЛКА (УБЕДИТЕСЬ, ЧТО ОНА АКТУАЛЬНА)
const scriptUrl = 'https://script.google.com/macros/s/AKfycbyCkZEUelOtAj-_GTZxmglwyLguXndfIuNiGX_Y-Fwgj8d5y8-ySLLd3Q0_V81n7wI9OA/exec'; 
// ================================================================

const CONTAINER_IMG_SRC = 'container.svg'; 

let serverLang = "RU"; 
let localLang = "RU"; // Принудительно Русский
let currentUser = JSON.parse(localStorage.getItem('warehouse_user'));
let currentTaskAction = null; 
let photoFiles = { 1: null, 2: null };
let currentPhotoIdx = 0;

const TRANSLATIONS = {
    RU: {
        title: "Мониторинг Склада", progress: "ОБЩИЙ ПРОГРЕСС", next: "СЛЕДУЮЩИЙ", list: "АКТИВНЫЕ РАЗГРУЗКИ",
        lunch: "ОБЕДЕННЫЙ ПЕРЕРЫВ", victory: "ПЛАН ВЫПОЛНЕН!", 
        status_active: "В РАБОТЕ", status_pause: "ПАУЗА", status_wait: "ОЖИДАНИЕ",
        eta_prefix: "ЧЕРЕЗ: ", delay_prefix: "ОПОЗДАНИЕ: ",
        lbl_start: "НАЧАЛО", lbl_dur: "В РАБОТЕ",
        stat_done: "Выгружено", stat_wait: "В очереди",
        drv_title: "Терминал водителя", btn_login: "Войти", btn_start: "НАЧАТЬ", btn_finish: "ЗАВЕРШИТЬ",
        lbl_photo1: "Общее фото (Сзади)", lbl_photo2: "Фото пломбы", lbl_photo_empty: "Фото пустого",
        msg_uploading: "Загрузка...", msg_success: "Успешно!",
        login_title: "Вход", reg_title: "Регистрация", empty: "Нет активных задач",
        btn_reg: "Отправить", btn_cancel: "Отмена"
    }
};

function t(key) { return TRANSLATIONS["RU"][key] || key; }
function formatFriendlyTime(m) { if(isNaN(m))return "0м"; if(m<60)return m+"м"; return Math.floor(m/60)+"ч "+(m%60)+"м"; }
function calculateTimeDiff(timeStr) { const match = timeStr.match(/(\d{1,2}):(\d{2})/); if (!match) return null; const targetH = parseInt(match[1]); const targetM = parseInt(match[2]); const now = new Date(); let target = new Date(); target.setHours(targetH, targetM, 0, 0); let diffMinutes = (target - now) / 60000; if (diffMinutes < -720) { target.setDate(target.getDate() + 1); diffMinutes = (target - now) / 60000; } return Math.round(diffMinutes); }
function showToast(text, type) { const toast = document.getElementById('adminToast'); document.getElementById('toastText').innerText = text; toast.style.opacity = '1'; setTimeout(() => toast.style.opacity = '0', 3000); }

// === UI UPDATES ===
function updateClock() {
    const d = new Date();
    document.getElementById('clock').innerText = d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
    document.getElementById('date').innerText = d.toLocaleDateString('ru-RU', {weekday:'long', day:'numeric', month:'long'});
}

function applyStaticText() {
    document.getElementById('txt_title').innerText = t('title');
    document.getElementById('txt_progress').innerText = t('progress');
    document.getElementById('txt_next').innerText = t('next');
    document.getElementById('txt_list').innerText = t('list');
    document.getElementById('txt_lunch').innerText = t('lunch');
    document.getElementById('txt_victory').innerText = t('victory');
    checkSession();
}

async function update() {
    try {
        const res = await fetch(scriptUrl + '?nocache=' + Date.now());
        const text = await res.text();
        if(!text.includes("DOCTYPE")) {
            const parts = text.split("###MSG###");
            const csvData = parts[0];
            const rows = csvData.split('\n').map(r => r.split(';')); 
            const r1 = rows[0]; 

            if (r1 && r1.length > 2) {
                const st = r1[0].trim(); // ACTIVE, WAIT, PAUSE
                
                // Статус кнопка
                const stsBtn = document.getElementById('sts');
                stsBtn.className = 'status-badge ' + (st==="ACTIVE"?"active":(st==="PAUSE"?"pause":"wait"));
                stsBtn.innerText = t('status_' + st.toLowerCase());

                // Круг (Желтый при ожидании)
                const ring = document.getElementById('ring');
                if (st === "WAIT") ring.style.stroke = "var(--accent-yellow)";
                else if (st === "PAUSE") ring.style.stroke = "#555";
                else ring.style.stroke = "var(--accent-green)";

                const counts = r1[1].split('|');
                const done = parseInt(counts[0]) || 0;
                const total = parseInt(counts[1]) || 0;
                document.getElementById('cnt').innerText = `${done} / ${total}`;
                const p = total > 0 ? Math.round((done/total)*100) : 0;
                document.getElementById('pct').innerText = p + '%';
                ring.style.strokeDashoffset = 942 - (942 * p / 100);
                
                document.getElementById('nid').innerText = r1[2].trim();
                const ninf = r1[3] ? r1[3].trim() : "";
                const diffMinutes = calculateTimeDiff(ninf);
                if (diffMinutes !== null) {
                    const prettyTime = formatFriendlyTime(Math.abs(diffMinutes));
                    document.getElementById('ninfo').innerHTML = diffMinutes >= 0 ? `⏱ ${t.eta_prefix} ${prettyTime}` : `⚠️ ${t.delay_prefix} ${prettyTime}`;
                } else { document.getElementById('ninfo').innerHTML = ninf; }
                
                // Проверка на победу (все сделано)
                if (total > 0 && done === total) document.body.classList.add('is-special');
                else document.body.classList.remove('is-special');
            }

            // Список активных
            const listEl = document.getElementById('list');
            let newDataMap = new Map();
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] && rows[i][0].includes('|')) {
                     let parts = rows[i][0].split('|');
                     newDataMap.set(parts[0], { start: parts[1], dur: parts[2], zone: parts[4] });
                }
            }
            
            const currentChildren = Array.from(listEl.querySelectorAll('.list-item'));
            currentChildren.forEach(el => { if (!newDataMap.has(el.getAttribute('data-id'))) el.remove(); });
            
            if (newDataMap.size === 0) listEl.innerHTML = `<div class="empty-msg">${t('empty')}</div>`;
            else {
                const emptyMsg = listEl.querySelector('.empty-msg');
                if(emptyMsg) emptyMsg.remove();
            }

            newDataMap.forEach((d, id) => {
                let existing = listEl.querySelector(`.list-item[data-id="${id}"]`);
                let zoneHtml = d.zone ? `<span class="item-zone">${d.zone}</span>` : '';
                let innerHTML = `
                    <div class="col-icon"><img src="${CONTAINER_IMG_SRC}" alt="Box"></div>
                    <div class="col-main"><span class="item-id">${id}</span> ${zoneHtml}</div>
                    <div class="col-right">
                        <div class="stat-box"><div class="stat-label">${t('lbl_start')}</div><div class="stat-val">${d.start}</div></div>
                        <div class="stat-box"><div class="stat-label">${t('lbl_dur')}</div><div class="stat-val val-green">${formatFriendlyTime(parseInt(d.dur))}</div></div>
                    </div>`;
                if (existing) { if (existing.innerHTML !== innerHTML) existing.innerHTML = innerHTML; } 
                else {
                    let div = document.createElement('div');
                    div.className = 'list-item';
                    div.setAttribute('data-id', id);
                    div.innerHTML = innerHTML;
                    listEl.prepend(div);
                }
            });
        }
    } catch(e) {}
}

// === AUTH & REGISTRATION (FIXED) ===
function checkSession() {
    const txt = document.getElementById('authBtnText');
    const drvBtn = document.getElementById('driverBtn');
    if (currentUser) {
        if(txt) txt.innerText = currentUser.name;
        if(drvBtn) drvBtn.classList.add('visible'); 
    } else {
        if(txt) txt.innerText = t('btn_login');
        if(drvBtn) drvBtn.classList.remove('visible');
    }
}
function handleAuthClick() { 
    if (currentUser) { document.getElementById('profileModal').classList.add('open'); document.getElementById('profName').innerText = currentUser.name; } 
    else openLogin(); 
}
function doLogout() { localStorage.removeItem('warehouse_user'); currentUser = null; document.getElementById('profileModal').classList.remove('open'); checkSession(); window.location.reload(); }

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
            currentUser = { user: u, name: u }; // Можно улучшить, если сервер вернет имя
            localStorage.setItem('warehouse_user', JSON.stringify(currentUser));
            if (txt.includes("ADMIN")) sessionStorage.setItem('warehouse_auth', JSON.stringify({user:u, pass:hashHex}));
            closeModals(); checkSession(); showToast("Добро пожаловать!", "success");
        } else showToast("Ошибка входа", "error");
    } catch(e) { console.error(e); }
}

async function doRegister() {
    const name = document.getElementById('regName').value.trim();
    const u = document.getElementById('regUser').value.trim();
    const p = document.getElementById('regPass').value.trim();
    
    if(!name || !u || !p) { showToast("Заполните все поля", "error"); return; }
    
    // Хешируем пароль перед отправкой
    const msgBuffer = new TextEncoder().encode(p);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    try {
        const r = await fetch(`${scriptUrl}?nocache=${Date.now()}&mode=register&user=${encodeURIComponent(u)}&hash=${hashHex}&name=${encodeURIComponent(name)}`);
        const txt = await r.text();
        if (txt.includes("REGISTERED")) {
            showToast("Заявка отправлена!", "success");
            backToLogin();
        } else if (txt.includes("EXISTS")) {
            showToast("Логин занят", "error");
        } else {
            showToast("Ошибка сервера", "error");
        }
    } catch(e) { console.error(e); }
}

// === WORKER TERMINAL & PHOTOS ===
function openDriverMode() { if (!currentUser) { openLogin(); return; } document.getElementById('driverModal').classList.add('open'); loadStatistics(true); }

function handleTaskClick(id, status, type) {
    const isStart = (status === 'WAIT');
    currentTaskAction = { id: id, type: isStart ? 'start' : 'finish' };
    document.getElementById('actionTitle').innerText = `${id} (${isStart ? 'НАЧАТЬ' : 'ЗАКОНЧИТЬ'})`;
    
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
        document.getElementById(`status_photo${currentPhotoIdx}`).innerHTML = '<span style="color:#FFD60A">Сжатие...</span>';
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const scale = 800 / img.width;
                canvas.width = 800;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                let fileNameSuffix = currentTaskAction.type === 'start' ? (currentPhotoIdx == 1 ? "_General" : "_Seal") : "_Empty";
                photoFiles[currentPhotoIdx] = {
                    data: canvas.toDataURL('image/jpeg', 0.6), 
                    mime: 'image/jpeg',
                    name: `${currentTaskAction.id}${fileNameSuffix}.jpg`
                };
                document.getElementById(`status_photo${currentPhotoIdx}`).innerHTML = '<span style="color:#30D158">Готово ✓</span>';
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
    if (act.type === 'start' && !act.zone) { showToast("Выберите зону!", "error"); return; }
    const defer = document.getElementById('deferUpload').checked;
    let urlGen = "", urlSeal = "", urlEmpty = "";

    if (!defer && (photoFiles[1] || (act.type === 'start' && photoFiles[2]))) {
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
    
    btn.innerText = "Сохранение...";
    const url = `${scriptUrl}?mode=task_action&id=${act.id}&act=${act.type}&op=${encodeURIComponent(currentUser.name)}&zone=${act.zone || ''}&pGen=${encodeURIComponent(urlGen)}&pSeal=${encodeURIComponent(urlSeal)}&pEmpty=${encodeURIComponent(urlEmpty)}`;
    await fetch(url);
    showToast(t('msg_success'), 'success');
    closeActionModal();
    loadStatistics(true); 
}

// === UI UTILS ===
function closeActionModal() { document.getElementById('actionModal').classList.remove('open'); }
function openLogin() { document.getElementById('modalLogin').classList.add('open'); }
function openRegister() { closeModals(); document.getElementById('modalRegister').classList.add('open'); }
function backToLogin() { closeModals(); openLogin(); }
function closeModals() { document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('open')); }
function openStats() { document.getElementById('statsModal').classList.add('open'); }
function closeStats() { document.getElementById('statsModal').classList.remove('open'); }
function switchTab(tabName) { document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active')); document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active')); document.getElementById('content_' + tabName).classList.add('active'); document.getElementById('tab_' + tabName).classList.add('active'); }

async function loadStatistics(isDriverMode) {
    const list = isDriverMode ? document.getElementById('driverQueueList') : null;
    if(list) list.innerHTML = '<div style="text-align:center;color:#888;">Загрузка...</div>';
    try {
        const response = await fetch(`${scriptUrl}?nocache=${Date.now()}&mode=get_stats`);
        const data = await response.json();
        let htmlWait = "";
        data.forEach(item => {
            let clickAttr = isDriverMode ? `onclick="handleTaskClick('${item.id}', '${item.status}', '${item.type}')"` : "";
            let rowHtml = `<div class="stats-row" ${clickAttr} style="cursor:pointer; padding:15px; border-bottom:1px solid rgba(255,255,255,0.1);"><div class="row-id">${item.id}</div><div class="row-time">${item.status}</div></div>`;
            if (item.status !== "DONE") htmlWait += rowHtml;
        });
        if (isDriverMode && list) list.innerHTML = htmlWait || '<div style="text-align:center;color:#888;">Нет задач</div>';
    } catch(e) {}
}

applyStaticText();
setInterval(updateClock, 1000);
setInterval(update, 5000); 
update();