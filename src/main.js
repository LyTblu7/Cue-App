const { invoke } = window.__TAURI__.core;
const { listen, emit } = window.__TAURI__.event;

// Глобальные переменные состояния
let activeTimers = [];
let activeFocusTimerId = null;
let globalInterval = null;
let isPinned = false;
let isCompact = false;

// Элементы UI экранов
const appWindow = document.getElementById('app-window');
const dashboardScreen = document.getElementById('dashboard-screen');
const setupScreen = document.getElementById('setup-screen');
const settingsScreen = document.getElementById('settings-screen');
const focusScreen = document.getElementById('focus-screen');

// Кнопки навигации и добавления
const addTimerHeaderBtn = document.getElementById('add-timer-header-btn');
const emptyAddBtn = document.getElementById('empty-add-btn');
const setupBackBtn = document.getElementById('setup-back-btn');
const settingsBtn = document.getElementById('settings-btn');
const focusPinBtn = document.getElementById('focus-pin-btn');
const focusCloseBtn = document.getElementById('focus-close-btn');
const closeBtn = document.getElementById('close-btn');
const settingsBackBtn = document.getElementById('settings-back-btn');
const focusBackBtn = document.getElementById('focus-back-btn');

// Элементы создания таймера
const startBtn = document.getElementById('start-timer-btn');
const timerNameInput = document.getElementById('timer-name');
const presetBtns = document.querySelectorAll('.preset-btn');
const timePickerTrigger = document.getElementById('time-picker-trigger');
const timePickerFlyout = document.getElementById('time-picker-flyout');
const pickerTimeDisplay = document.getElementById('picker-time-display');
const wheelMinutes = document.getElementById('wheel-minutes');
const wheelSeconds = document.getElementById('wheel-seconds');
const pickerConfirm = document.getElementById('picker-confirm');
const pickerCancel = document.getElementById('picker-cancel');

// Переменные состояния TimePicker
let selectedMinutes = 15;
let selectedSeconds = 0;

// Элементы экрана фокуса (виджета)
const focusTimeDisplay = document.getElementById('focus-time-display');
const focusTitleDisplay = document.getElementById('focus-title-display');
const focusProgressCircle = document.getElementById('focus-progress-circle');
const focusPauseBtn = document.getElementById('focus-pause-btn');
const focusDeleteBtn = document.getElementById('focus-delete-btn');

// Настройка кругового прогресс-бара
const focusRadius = focusProgressCircle.r.baseVal.value;
const focusCircumference = focusRadius * 2 * Math.PI;
focusProgressCircle.style.strokeDasharray = `${focusCircumference} ${focusCircumference}`;
focusProgressCircle.style.strokeDashoffset = focusCircumference;

// Списки таймеров
const timersListEl = document.getElementById('timers-list');
const emptyStateEl = document.getElementById('empty-state');

// Настройки приложения (по умолчанию выключены/включены)
const appSettings = {
  sound: true,
  notifications: true,
  autohide: false,
  lang: 'uk',
  timeFormat: '24h',
  theme: 'system'
};

const translations = {
  uk: {
    titleActiveTimers: 'Активні таймери',
    textEmptyState: 'Немає активних таймерів',
    btnCreateTimerEmpty: 'Створити таймер',
    btnBackToList: 'До списку',
    labelTimerName: 'Назва таймера',
    placeholderTimerName: 'Наприклад: Зарядка для очей',
    labelCustomTime: 'Або виберіть час',
    btnStartTimer: 'Запустити таймер',
    btnFocusBack: 'Панель',
    textFocusPause: 'Пауза',
    textFocusResume: 'Продовжити',
    textFocusRestart: 'Перезапустити',
    textFocusDelete: 'Скинути',
    btnSettingsBack: 'Назад',
    titleSound: 'Звукові сигнали',
    descSound: 'Звук після завершення',
    titleNotifications: 'Сповіщення',
    descNotifications: 'Системні спливаючі повідомлення',
    titleAutohide: 'Згортати при статрі',
    descAutohide: 'Приховувати вікно в трей при запуску',
    titleLang: 'Мова інтерфейсу',
    descLang: 'Виберіть мову програми',
    titleTimeFormat: 'Формат часу',
    descTimeFormat: '12-годинний (AM/PM) або 24-годинний формат',
    titleTheme: 'Тема оформлення',
    descTheme: 'Виберіть темну, світлу або системну тему',
    themeLight: 'Світла',
    themeDark: 'Темна',
    themeSystem: 'Системна',
    presetMin: 'хв',
    presetSec: 'сек',
    timerDone: 'Готово!',
    timeFrom: 'з',
    deleteTitle: 'Вилучити',
    loopOnTitle: 'Повторять нескінченно',
    loopOffTitle: 'Вимкнути повтор',
    notifyFinishedTitle: 'Час вийшов!',
    notifyLoopTitle: 'Повтор таймера!',
    defaultBreakName: 'Перерва'
  },
  en: {
    titleActiveTimers: 'Active timers',
    textEmptyState: 'No active timers',
    btnCreateTimerEmpty: 'Create timer',
    btnBackToList: 'To list',
    labelTimerName: 'Timer name',
    placeholderTimerName: 'e.g., Eye gymnastics',
    labelCustomTime: 'Or choose time',
    btnStartTimer: 'Start timer',
    btnFocusBack: 'Dashboard',
    textFocusPause: 'Pause',
    textFocusResume: 'Resume',
    textFocusRestart: 'Restart',
    textFocusDelete: 'Reset',
    btnSettingsBack: 'Back',
    titleSound: 'Sound signals',
    descSound: 'Play sound when finished',
    titleNotifications: 'Notifications',
    descNotifications: 'System notification popups',
    titleAutohide: 'Minimize on start',
    descAutohide: 'Hide window to tray on start',
    titleLang: 'App language',
    descLang: 'Select app language',
    titleTimeFormat: 'Time format',
    descTimeFormat: 'Choose 12-hour (AM/PM) or 24-hour format',
    titleTheme: 'App theme',
    descTheme: 'Choose dark, light, or system theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    presetMin: 'min',
    presetSec: 'sec',
    timerDone: 'Finished!',
    timeFrom: 'of',
    deleteTitle: 'Delete',
    loopOnTitle: 'Repeat infinitely',
    loopOffTitle: 'Disable repeat',
    notifyFinishedTitle: 'Time is up!',
    notifyLoopTitle: 'Timer loop!',
    defaultBreakName: 'Break'
  }
};

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function applyLanguage(lang) {
  const t = translations[lang] || translations.uk;
  
  safeSetText('title-active-timers', t.titleActiveTimers);
  safeSetText('text-empty-state', t.textEmptyState);
  safeSetText('btn-create-timer-empty', t.btnCreateTimerEmpty);
  safeSetText('btn-back-to-list', t.btnBackToList);
  safeSetText('label-timer-name', t.labelTimerName);
  const nameInput = document.getElementById('timer-name');
  if (nameInput) nameInput.placeholder = t.placeholderTimerName;
  safeSetText('label-custom-time', t.labelCustomTime);
  safeSetText('btn-start-timer', t.btnStartTimer);
  safeSetText('btn-focus-back', t.btnFocusBack);
  
  const focusPauseSpan = document.getElementById('text-focus-pause');
  if (focusPauseSpan) {
    const isPaused = activeFocusTimerId && activeTimers.find(t => t.id === activeFocusTimerId)?.isPaused;
    focusPauseSpan.textContent = isPaused ? t.textFocusResume : t.textFocusPause;
  }
  safeSetText('text-focus-delete', t.textFocusDelete);
  safeSetText('btn-settings-back', t.btnSettingsBack);
  
  safeSetText('title-sound', t.titleSound);
  safeSetText('desc-sound', t.descSound);
  safeSetText('title-notifications', t.titleNotifications);
  safeSetText('desc-notifications', t.descNotifications);
  safeSetText('title-autohide', t.titleAutohide);
  safeSetText('desc-autohide', t.descAutohide);
  safeSetText('title-lang', t.titleLang);
  safeSetText('desc-lang', t.descLang);
  safeSetText('title-time-format', t.titleTimeFormat);
  safeSetText('desc-time-format', t.descTimeFormat);
  
  const titleTheme = document.getElementById('title-theme');
  if (titleTheme) titleTheme.textContent = t.titleTheme;
  const descTheme = document.getElementById('desc-theme');
  if (descTheme) descTheme.textContent = t.descTheme;
  
  safeSetText('opt-theme-light', t.themeLight);
  safeSetText('opt-theme-dark', t.themeDark);
  safeSetText('opt-theme-system', t.themeSystem);
  
  presetBtns.forEach(btn => {
    btn.textContent = `${btn.dataset.time} ${t.presetMin}`;
  });
  
  if (nameInput && (nameInput.value === 'Перерва' || nameInput.value === 'Break' || nameInput.value === 'Перерыв')) {
    nameInput.value = t.defaultBreakName;
  }
}

// Управление темами (светлая, темная, системная)
function applyTheme(theme) {
  const root = document.documentElement;
  let actualTheme = theme;
  
  if (theme === 'system') {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    actualTheme = systemPrefersDark ? 'dark' : 'light';
  }
  
  if (actualTheme === 'dark') {
    root.classList.add('dark-theme');
  } else {
    root.classList.remove('dark-theme');
  }
  
  invoke('change_theme', { theme: actualTheme });
}

// Слушаем изменение системной темы (Auto Dark Mode и стандартные параметры ОС)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (appSettings.theme === 'system') {
    applyTheme('system');
  }
});

// Переключение экранов
function showScreen(target) {
  [dashboardScreen, setupScreen, settingsScreen, focusScreen].forEach(s => {
    s.classList.remove('active');
  });
  target.classList.add('active');
}

// Загрузка настроек из localStorage
function loadSettings() {
  const saved = localStorage.getItem('cue-settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(appSettings, parsed);
    } catch (e) {
      console.error('Ошибка парсинга настроек:', e);
    }
  }
  
  // Обновление состояния чекбоксов
  document.getElementById('setting-sound').checked = appSettings.sound;
  document.getElementById('setting-notifications').checked = appSettings.notifications;
  document.getElementById('setting-autohide').checked = appSettings.autohide;
  
  // Обновление кастомных селектов
  const langWrapper = document.getElementById('lang-select-wrapper');
  if (langWrapper) {
    langWrapper.querySelectorAll('.custom-option').forEach(opt => {
      if (opt.dataset.value === appSettings.lang) {
        opt.classList.add('selected');
        langWrapper.querySelector('.custom-select-trigger span').textContent = opt.textContent;
      } else {
        opt.classList.remove('selected');
      }
    });
  }
  
  const formatWrapper = document.getElementById('format-select-wrapper');
  if (formatWrapper) {
    formatWrapper.querySelectorAll('.custom-option').forEach(opt => {
      if (opt.dataset.value === appSettings.timeFormat) {
        opt.classList.add('selected');
        formatWrapper.querySelector('.custom-select-trigger span').textContent = opt.textContent;
      } else {
        opt.classList.remove('selected');
      }
    });
  }
  
  const themeWrapper = document.getElementById('theme-select-wrapper');
  if (themeWrapper) {
    themeWrapper.querySelectorAll('.custom-option').forEach(opt => {
      if (opt.dataset.value === appSettings.theme) {
        opt.classList.add('selected');
        const span = themeWrapper.querySelector('.custom-select-trigger span');
        if (span) span.textContent = opt.textContent;
      } else {
        opt.classList.remove('selected');
      }
    });
  }
  
  applyTheme(appSettings.theme);
  applyLanguage(appSettings.lang);
}

// Сохранение настроек в localStorage
function saveSettings() {
  localStorage.setItem('cue-settings', JSON.stringify(appSettings));
}

// Сохранение таймеров в localStorage
function saveTimers() {
  localStorage.setItem('cue-timers', JSON.stringify(activeTimers));
  localStorage.setItem('cue-timers-timestamp', Date.now().toString());
}

// Загрузка таймеров из localStorage с расчетом прошедшего времени
function loadTimers() {
  const saved = localStorage.getItem('cue-timers');
  const savedTimestampStr = localStorage.getItem('cue-timers-timestamp');
  if (saved && savedTimestampStr) {
    try {
      const parsed = JSON.parse(saved);
      const lastSavedTimestamp = parseInt(savedTimestampStr);
      const elapsed = Math.floor((Date.now() - lastSavedTimestamp) / 1000);
      
      activeTimers = parsed.map(timer => {
        if (!timer.isPaused && !timer.isFinished) {
          if (elapsed > 0) {
            timer.secondsLeft -= elapsed;
            if (timer.secondsLeft <= 0) {
              if (timer.isLooped) {
                const totalCycle = timer.totalSeconds || 1;
                const overshoot = Math.abs(timer.secondsLeft);
                const cycles = Math.floor(overshoot / totalCycle) + 1;
                timer.secondsLeft = totalCycle - (overshoot % totalCycle);
              } else {
                timer.secondsLeft = 0;
                timer.isFinished = true;
                timer.isPaused = true;
              }
            }
          }
        }
        return timer;
      });
      
      const runningTimers = activeTimers.filter(t => !t.isPaused && !t.isFinished);
      if (runningTimers.length > 0) {
        startGlobalTicker();
      }
    } catch (e) {
      console.error('Ошибка загрузки таймеров:', e);
    }
  }
}

// Звук уведомления
function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const playTone = (time, freq, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(time);
    osc.stop(time + duration);
  };
  
  playTone(ctx.currentTime, 523.25, 0.4); // C5
  playTone(ctx.currentTime + 0.15, 659.25, 0.4); // E5
  playTone(ctx.currentTime + 0.3, 783.99, 0.5); // G5
}

// Уведомление
function showNotification(title, message) {
  if (!appSettings.notifications) return;
  
  if (Notification.permission === 'granted') {
    new Notification(title, { body: message });
  } else {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body: message });
      }
    });
  }
}

// Запрос разрешения при старте
if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
  Notification.requestPermission();
}

// Форматирование времени
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Функция скрытия окна
function hideWindow() {
  invoke('hide_window');
}

// Слушатели скрытия по системному событию
listen('hide-requested', () => {
  hideWindow();
});

listen('restore-dashboard', () => {
  isCompact = false;
  isPinned = false;
  activeFocusTimerId = null;
  appWindow.classList.remove('compact');
  focusPinBtn.classList.remove('active');
  showScreen(dashboardScreen);
});

listen('toggle-pause-timer', (event) => {
  togglePauseTimer(event.payload.id);
});

listen('delete-timer', (event) => {
  deleteTimer(event.payload.id);
});

// Кнопка закрытия/скрытия на шапке
closeBtn.addEventListener('click', () => {
  hideWindow();
});

// Закрепление окна сверху (в режиме фокуса / компактного виджета)
focusPinBtn.addEventListener('click', () => {
  isCompact = !isCompact;
  isPinned = isCompact;
  
  appWindow.classList.toggle('compact', isCompact);
  focusPinBtn.classList.toggle('active', isCompact);
  
  if (isCompact) {
    invoke('set_window_size', { width: 220, height: 220 });
    invoke('toggle_pin', { pinned: true });
  } else {
    invoke('set_window_size', { width: 320, height: 450 });
    invoke('toggle_pin', { pinned: false });
    invoke('reposition_to_tray');
  }
});

focusCloseBtn.addEventListener('click', () => {
  if (isCompact) {
    isCompact = false;
    isPinned = false;
    activeFocusTimerId = null;
    appWindow.classList.remove('compact');
    focusPinBtn.classList.remove('active');
    invoke('set_window_size', { width: 320, height: 450 });
    invoke('toggle_pin', { pinned: false });
    invoke('reposition_to_tray');
    showScreen(dashboardScreen);
  } else {
    hideWindow();
  }
});

// Навигация
addTimerHeaderBtn.addEventListener('click', () => {
  showScreen(setupScreen);
});

emptyAddBtn.addEventListener('click', () => {
  showScreen(setupScreen);
});

setupBackBtn.addEventListener('click', () => {
  showScreen(dashboardScreen);
});

focusBackBtn.addEventListener('click', () => {
  activeFocusTimerId = null;
  if (isCompact) {
    isCompact = false;
    isPinned = false;
    appWindow.classList.remove('compact');
    focusPinBtn.classList.remove('active');
    invoke('set_window_size', { width: 320, height: 450 });
    invoke('toggle_pin', { pinned: false });
    invoke('reposition_to_tray');
  } else if (isPinned) {
    isPinned = false;
    focusPinBtn.classList.remove('active');
    invoke('toggle_pin', { pinned: false });
    invoke('reposition_to_tray');
  }
  showScreen(dashboardScreen);
});

let settingsPrevScreen = dashboardScreen;
settingsBtn.addEventListener('click', () => {
  if (dashboardScreen.classList.contains('active')) {
    settingsPrevScreen = dashboardScreen;
  } else if (setupScreen.classList.contains('active')) {
    settingsPrevScreen = setupScreen;
  } else if (focusScreen.classList.contains('active')) {
    settingsPrevScreen = focusScreen;
  }
  showScreen(settingsScreen);
});

settingsBackBtn.addEventListener('click', () => {
  showScreen(settingsPrevScreen);
});

// Слушатели настроек
document.getElementById('setting-sound').addEventListener('change', (e) => {
  appSettings.sound = e.target.checked;
  saveSettings();
});
document.getElementById('setting-notifications').addEventListener('change', (e) => {
  appSettings.notifications = e.target.checked;
  saveSettings();
});
document.getElementById('setting-autohide').addEventListener('change', (e) => {
  appSettings.autohide = e.target.checked;
  saveSettings();
});

// Управление кастомным временем и пресетами
presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMinutes = parseInt(btn.dataset.time) || 15;
    selectedSeconds = 0;
    updatePickerDisplay();
  });
});

// Добавление нового таймера
startBtn.addEventListener('click', () => {
  const totalSeconds = (selectedMinutes * 60) + selectedSeconds;
  const defaultName = translations[appSettings.lang].defaultBreakName;
  const name = timerNameInput.value.trim() || defaultName;
  
  addTimer(name, totalSeconds);
});

function addTimer(name, totalSeconds) {
  const id = Math.random().toString(36).substring(2, 9);
  
  activeTimers.push({
    id,
    name,
    totalSeconds,
    secondsLeft: totalSeconds,
    isPaused: false,
    isFinished: false,
    isLooped: false
  });
  
  renderTimers();
  startGlobalTicker();
  updateTrayTooltipForTimers();
  saveTimers();
  
  showScreen(dashboardScreen);
  
  if (appSettings.autohide) {
    setTimeout(() => {
      hideWindow();
    }, 450);
  }
}

// Рендеринг таймеров на дашборде
function renderTimers() {
  if (activeTimers.length === 0) {
    timersListEl.innerHTML = '';
    emptyStateEl.style.display = 'flex';
    return;
  }
  
  emptyStateEl.style.display = 'none';
  
  const t = translations[appSettings.lang] || translations.uk;
  
  timersListEl.innerHTML = activeTimers.map(timer => {
    const isFinished = timer.isFinished;
    const isPaused = timer.isPaused;
    const isLooped = timer.isLooped;
    const percentage = isFinished ? 0 : (timer.secondsLeft / timer.totalSeconds) * 100;
    const progressWidth = Math.max(0, Math.min(100, percentage));
    
    let timeString = `${formatTime(timer.secondsLeft)} ${t.timeFrom} ${formatTime(timer.totalSeconds)}`;
    if (isFinished) {
      timeString = `${t.timerDone} (${formatTime(timer.totalSeconds)})`;
    }
    
    let actionIcon;
    if (isFinished) {
      actionIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`;
    } else if (isPaused) {
      actionIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    } else {
      actionIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    }
    
    const loopTooltip = isLooped ? t.loopOffTitle : t.loopOnTitle;
    const playTooltip = isFinished ? t.textFocusRestart : (isPaused ? t.textFocusResume : t.textFocusPause);
    const deleteTooltip = t.deleteTitle;
    
    return `
      <div class="timer-card ${isPaused ? 'paused' : ''} ${isFinished ? 'finished' : ''}" data-id="${timer.id}">
        <div class="timer-card-main">
          <div class="timer-card-info">
            <div class="timer-card-name" title="${escapeHtml(timer.name)}">${escapeHtml(timer.name)}</div>
            <div class="timer-card-time">${timeString}</div>
          </div>
          <div class="timer-card-actions">
            <button class="timer-card-btn loop-btn ${isLooped ? 'active' : ''}" data-id="${timer.id}" title="${loopTooltip}">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
            </button>
            <button class="timer-card-btn toggle-pause-btn" data-id="${timer.id}" title="${playTooltip}">
              ${actionIcon}
            </button>
            <button class="timer-card-btn delete delete-btn" data-id="${timer.id}" title="${deleteTooltip}">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        <div class="timer-card-progress-bar" style="width: ${progressWidth}%"></div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  const s = (str === null || str === undefined) ? '' : String(str);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Открытие экрана фокуса (виджета)
function openFocusScreen(id) {
  if (id === activeFocusTimerId && focusScreen.classList.contains('active')) return;
  const timer = activeTimers.find(t => t.id === id);
  if (timer) {
    activeFocusTimerId = id;
    
    // Сбрасываем круг в пустое состояние без анимации
    focusProgressCircle.style.transition = 'none';
    focusProgressCircle.style.strokeDashoffset = focusCircumference;
    
    // Форсируем перерисовку браузера (reflow)
    focusProgressCircle.getBoundingClientRect();
    
    // Возвращаем анимацию перехода
    focusProgressCircle.style.transition = 'stroke-dashoffset 0.35s ease-out';
    
    updateFocusScreen(timer);
    showScreen(focusScreen);
  }
}

// Обновление контента фокусного экрана
function updateFocusScreen(timer) {
  focusTitleDisplay.textContent = timer.name;
  
  const isFinished = timer.isFinished;
  const isPaused = timer.isPaused;
  const t = translations[appSettings.lang] || translations.uk;
  
  if (isFinished) {
    focusTimeDisplay.textContent = t.timerDone;
    focusProgressCircle.style.strokeDashoffset = focusCircumference;
    focusPauseBtn.querySelector('.btn-text').textContent = t.textFocusRestart;
    focusPauseBtn.querySelector('.btn-icon').innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`;
  } else {
    focusTimeDisplay.textContent = formatTime(timer.secondsLeft);
    const percentage = (timer.secondsLeft / timer.totalSeconds) * 100;
    const offset = focusCircumference - (percentage / 100) * focusCircumference;
    focusProgressCircle.style.strokeDashoffset = offset;
    
    if (isPaused) {
      focusPauseBtn.querySelector('.btn-text').textContent = t.textFocusResume;
      focusPauseBtn.querySelector('.btn-icon').innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>`;
    } else {
      focusPauseBtn.querySelector('.btn-text').textContent = t.textFocusPause;
      focusPauseBtn.querySelector('.btn-icon').innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    }
  }
}

// Слушатели кнопок экрана фокуса
focusPauseBtn.addEventListener('click', () => {
  if (activeFocusTimerId) {
    togglePauseTimer(activeFocusTimerId);
    const timer = activeTimers.find(t => t.id === activeFocusTimerId);
    if (timer) updateFocusScreen(timer);
  }
});

focusDeleteBtn.addEventListener('click', () => {
  if (activeFocusTimerId) {
    deleteTimer(activeFocusTimerId);
    activeFocusTimerId = null;
    if (isCompact) {
      isCompact = false;
      isPinned = false;
      appWindow.classList.remove('compact');
      focusPinBtn.classList.remove('active');
      invoke('set_window_size', { width: 320, height: 450 });
      invoke('toggle_pin', { pinned: false });
      invoke('reposition_to_tray');
    }
    showScreen(dashboardScreen);
  }
});

// Управление таймерами
function togglePauseTimer(id) {
  const timer = activeTimers.find(t => t.id === id);
  if (timer) {
    if (timer.isFinished) {
      timer.isFinished = false;
      timer.isPaused = false;
      timer.secondsLeft = timer.totalSeconds;
      renderTimers();
      startGlobalTicker();
      updateTrayTooltipForTimers();
    } else {
      timer.isPaused = !timer.isPaused;
      renderTimers();
      updateTrayTooltipForTimers();
    }
    // Если этот таймер сейчас открыт на фокусном экране, обновляем его
    if (activeFocusTimerId === id) {
      updateFocusScreen(timer);
    }
    saveTimers();
  }
}

function toggleLoopTimer(id) {
  const timer = activeTimers.find(t => t.id === id);
  if (timer) {
    timer.isLooped = !timer.isLooped;
    renderTimers();
    saveTimers();
  }
}

function deleteTimer(id) {
  activeTimers = activeTimers.filter(t => t.id !== id);
  const runningTimers = activeTimers.filter(t => !t.isPaused && !t.isFinished);
  if (runningTimers.length === 0 && globalInterval) {
    clearInterval(globalInterval);
    globalInterval = null;
  }
  
  if (activeFocusTimerId === id) {
    activeFocusTimerId = null;
    showScreen(dashboardScreen);
  }
  
  updateTrayTooltipForTimers();
  renderTimers();
  saveTimers();
}

// Системный трей
function resetTooltip() {
  invoke('update_tray_tooltip', { tooltip: 'Cue' });
}

function updateTrayTooltipForTimers() {
  const runningTimers = activeTimers.filter(t => !t.isPaused && !t.isFinished);
  if (runningTimers.length === 0) {
    resetTooltip();
    return;
  }
  const targetTimer = runningTimers.reduce((min, t) => t.secondsLeft < min.secondsLeft ? t : min, runningTimers[0]);
    
  invoke('update_tray_tooltip', { 
    tooltip: `Cue: ${targetTimer.name} (${formatTime(targetTimer.secondsLeft)})` 
  });
}

function updateTimerCardDOM(timer) {
  const card = timersListEl.querySelector(`.timer-card[data-id="${timer.id}"]`);
  if (!card) return;
  
  const t = translations[appSettings.lang] || translations.uk;
  const isFinished = timer.isFinished;
  const percentage = isFinished ? 0 : (timer.secondsLeft / timer.totalSeconds) * 100;
  const progressWidth = Math.max(0, Math.min(100, percentage));
  
  let timeString = `${formatTime(timer.secondsLeft)} ${t.timeFrom} ${formatTime(timer.totalSeconds)}`;
  if (isFinished) {
    timeString = `${t.timerDone} (${formatTime(timer.totalSeconds)})`;
  }
  
  const timeEl = card.querySelector('.timer-card-time');
  if (timeEl && timeEl.textContent !== timeString) {
    timeEl.textContent = timeString;
  }
  
  const progressEl = card.querySelector('.timer-card-progress-bar');
  if (progressEl) {
    progressEl.style.width = `${progressWidth}%`;
  }
}

// Глобальный таймер на 1 секунду
function startGlobalTicker() {
  if (globalInterval) return;
  globalInterval = setInterval(() => {
    let stateChanged = false;
    
    activeTimers.forEach(timer => {
      if (!timer.isPaused && !timer.isFinished && timer.secondsLeft > 0) {
        timer.secondsLeft--;
        
        // Обновляем DOM карточки точечно без перерисовки всей страницы
        updateTimerCardDOM(timer);
        
        if (timer.secondsLeft <= 0) {
          const t = translations[appSettings.lang] || translations.uk;
          if (timer.isLooped) {
            timer.secondsLeft = timer.totalSeconds;
            updateTimerCardDOM(timer);
            if (appSettings.sound) playBeep();
            if (appSettings.notifications) {
              showNotification(t.notifyLoopTitle, timer.name);
            }
          } else {
            timer.isFinished = true;
            timer.isPaused = true;
            stateChanged = true;
            if (appSettings.sound) playBeep();
            if (appSettings.notifications) {
              showNotification(t.notifyFinishedTitle, timer.name);
            }
          }
        }
      }
    });
    
    // Сохраняем состояние таймеров на каждом тике
    saveTimers();
    
    const runningTimers = activeTimers.filter(t => !t.isPaused && !t.isFinished);
    if (runningTimers.length === 0) {
      clearInterval(globalInterval);
      globalInterval = null;
      resetTooltip();
    } else {
      updateTrayTooltipForTimers();
    }
    
    // Если открыт фокусный экран, обновляем его данные в реальном времени
    if (activeFocusTimerId) {
      const timer = activeTimers.find(t => t.id === activeFocusTimerId);
      if (timer) {
        updateFocusScreen(timer);
      } else {
        activeFocusTimerId = null;
        showScreen(dashboardScreen);
      }
    }
    
    if (stateChanged) {
      renderTimers();
    }
  }, 1000);
}

function updateClock() {
  const clockEl = document.getElementById('header-clock');
  if (!clockEl) return;
  
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  if (appSettings.timeFormat === '12h') {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    clockEl.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
  } else {
    const hoursStr = hours.toString().padStart(2, '0');
    clockEl.textContent = `${hoursStr}:${minutes}:${seconds}`;
  }
}

function initCustomSelects() {
  const setupSelect = (wrapperId, defaultValue, onChange) => {
    const wrapper = document.getElementById(wrapperId);
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const optionsContainer = wrapper.querySelector('.custom-options');
    const options = wrapper.querySelectorAll('.custom-option');
    
    const setVal = (val) => {
      options.forEach(opt => {
        if (opt.dataset.value === val) {
          opt.classList.add('selected');
          const span = trigger.querySelector('span');
          if (span) span.textContent = opt.textContent;
        } else {
          opt.classList.remove('selected');
        }
      });
    };
    
    setVal(defaultValue);
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select').forEach(sel => {
        if (sel !== wrapper) sel.classList.remove('open');
      });
      wrapper.classList.toggle('open');
    });
    
    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.dataset.value;
        setVal(val);
        wrapper.classList.remove('open');
        onChange(val);
      });
    });
  };

  setupSelect('lang-select-wrapper', appSettings.lang, (val) => {
    appSettings.lang = val;
    saveSettings();
    applyLanguage(appSettings.lang);
    renderTimers();
    if (activeFocusTimerId) {
      const timer = activeTimers.find(t => t.id === activeFocusTimerId);
      if (timer) updateFocusScreen(timer);
    }
  });

  setupSelect('format-select-wrapper', appSettings.timeFormat, (val) => {
    appSettings.timeFormat = val;
    saveSettings();
    updateClock();
  });

  setupSelect('theme-select-wrapper', appSettings.theme, (val) => {
    appSettings.theme = val;
    saveSettings();
    applyTheme(val);
  });

  document.addEventListener('mousedown', (e) => {
    document.querySelectorAll('.custom-select').forEach(sel => {
      if (!sel.contains(e.target)) {
        sel.classList.remove('open');
      }
    });
  });
}

// Вспомогательные функции для Fluent TimePicker
function populateWheel(container, max) {
  container.innerHTML = '';
  
  // Верхний спейсер
  const topSpacer = document.createElement('div');
  topSpacer.className = 'wheel-spacer';
  container.appendChild(topSpacer);
  
  // Значения
  for (let i = 0; i <= max; i++) {
    const item = document.createElement('div');
    item.className = 'wheel-item';
    item.dataset.value = i;
    item.textContent = i.toString().padStart(2, '0');
    container.appendChild(item);
  }
  
  // Нижний спейсер
  const bottomSpacer = document.createElement('div');
  bottomSpacer.className = 'wheel-spacer';
  container.appendChild(bottomSpacer);
}

function initWheelScroll(container, onSelect) {
  container.addEventListener('scroll', () => {
    const items = container.querySelectorAll('.wheel-item');
    const index = Math.round(container.scrollTop / 32);
    const targetItem = items[index];
    if (targetItem && !targetItem.classList.contains('active')) {
      items.forEach(i => i.classList.remove('active'));
      targetItem.classList.add('active');
      onSelect(parseInt(targetItem.dataset.value));
    }
  });

  // Клик центрирует выбранный пункт
  container.addEventListener('click', (e) => {
    const item = e.target.closest('.wheel-item');
    if (item) {
      const items = Array.from(container.querySelectorAll('.wheel-item'));
      const index = items.indexOf(item);
      container.scrollTo({
        top: index * 32,
        behavior: 'smooth'
      });
    }
  });
}

function setWheelValue(container, value) {
  const items = Array.from(container.querySelectorAll('.wheel-item'));
  const item = items.find(i => parseInt(i.dataset.value) === value);
  if (item) {
    const index = items.indexOf(item);
    container.scrollTo({
      top: index * 32,
      behavior: 'instant'
    });
    items.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  }
}

function updatePickerDisplay() {
  const t = translations[appSettings.lang] || translations.uk;
  pickerTimeDisplay.textContent = `${selectedMinutes} ${t.presetMin} ${selectedSeconds.toString().padStart(2, '0')} ${t.presetSec}`;
}

function closePickerFlyout() {
  timePickerFlyout.classList.remove('open');
  timePickerTrigger.classList.remove('open');
}

// Инициализация
loadSettings();
loadTimers();
initCustomSelects();
renderTimers();
updateClock();
setInterval(updateClock, 1000);

// Инициализация колес прокрутки
populateWheel(wheelMinutes, 99);
populateWheel(wheelSeconds, 59);

initWheelScroll(wheelMinutes, (val) => {
  selectedMinutes = val;
});
initWheelScroll(wheelSeconds, (val) => {
  selectedSeconds = val;
});

// Открытие и закрытие TimePicker Flyout
timePickerTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  timePickerFlyout.classList.toggle('open');
  timePickerTrigger.classList.toggle('open');
  if (timePickerFlyout.classList.contains('open')) {
    setWheelValue(wheelMinutes, selectedMinutes);
    setWheelValue(wheelSeconds, selectedSeconds);
  }
});

pickerConfirm.addEventListener('click', (e) => {
  e.stopPropagation();
  const activeMin = wheelMinutes.querySelector('.wheel-item.active');
  const activeSec = wheelSeconds.querySelector('.wheel-item.active');
  if (activeMin) selectedMinutes = parseInt(activeMin.dataset.value);
  if (activeSec) selectedSeconds = parseInt(activeSec.dataset.value);
  updatePickerDisplay();
  closePickerFlyout();
  presetBtns.forEach(b => b.classList.remove('active'));
});

pickerCancel.addEventListener('click', (e) => {
  e.stopPropagation();
  closePickerFlyout();
});

// Закрытие при клике мимо оверлея
document.addEventListener('mousedown', (e) => {
  if (timePickerFlyout.classList.contains('open') && 
      !timePickerFlyout.contains(e.target) && 
      !timePickerTrigger.contains(e.target)) {
    closePickerFlyout();
  }
});

// Делегирование событий списка таймеров для производительности и безопасности
timersListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.timer-card-btn');
  if (btn) {
    e.stopPropagation();
    const id = btn.dataset.id;
    if (btn.classList.contains('toggle-pause-btn')) {
      togglePauseTimer(id);
    } else if (btn.classList.contains('loop-btn')) {
      toggleLoopTimer(id);
    } else if (btn.classList.contains('delete-btn')) {
      deleteTimer(id);
    }
    return;
  }
  
  const card = e.target.closest('.timer-card');
  if (card) {
    openFocusScreen(card.dataset.id);
  }
});

// Программное перетаскивание окна за любую неинтерактивную область (фикс для прозрачного фона Windows)
appWindow.addEventListener('mousedown', (e) => {
  const target = e.target;
  const isInteractive = target.closest('button') || 
                        target.closest('input') || 
                        target.closest('label') || 
                        target.closest('.timers-list') || 
                        target.closest('.settings-list') ||
                        target.closest('.custom-select') ||
                        target.closest('.custom-option') ||
                        target.closest('.custom-select-trigger') ||
                        target.closest('.time-picker-flyout') ||
                        target.closest('.fluent-time-picker');
  if (e.buttons === 1 && !isInteractive) {
    invoke('start_drag');
  }
});
