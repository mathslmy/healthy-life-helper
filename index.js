// 健康生活助手 - 最小可运行版 + 完整独立API模块升级（仅修改 index.js）

//You'll likely need to import extension_settings, getContext, and loadExtensionSettings from extensions.js
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

//You'll likely need to import some other functions from the main script
import { saveSettingsDebounced } from "../../../../script.js";

(function () {
  const MODULE_NAME = '健康生活助手';

  // 等待 SillyTavern 环境准备（若已经存在则立刻用）
  function ready(fn) {
    if (window.SillyTavern && SillyTavern.getContext) return fn();
    const i = setInterval(() => {
      if (window.SillyTavern && SillyTavern.getContext) {
        clearInterval(i);
        fn();
      }
    }, 200);
    // 超时后仍尝试执行
    setTimeout(fn, 5000);
  }

  ready(() => {
    try {
      const ctx = SillyTavern.getContext();
      // 初始化 extensionSettings 存储
      if (!ctx.extensionSettings[MODULE_NAME]) {
        ctx.extensionSettings[MODULE_NAME] = {
          sleep: [],       // 存起床/入睡打卡记录
          diet: [],        // 饮食记录
          mental: [],      // 心理记录
          exercise: [],    // 运动记录
          wishes: [],      // 心愿清单
          social: {},      // 社会化相关
          todo: [], // 待办事项
          memo: [],
          bgmTags: [], 
          pomodoro: {
      timeBlocks: [],
      tagBlocks: [],
      records: [],
      selectedTimeBlock: null,
      selectedTag: null,
      session: null,
      tagDeleteMode: false,
      timeDeleteMode: false,
      notifyConfig: {
        vibrate: true,
        ring: true,
        ringUrl: ''
      }
    },// 备忘录
          apiConfig: {}    // 独立 API 配置
        };
        if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
      }

      // 创建 DOM
      if (document.getElementById('health-assistant-fab')) return; // 防重复

      const fab = document.createElement('div');
fab.id = 'health-assistant-fab';
fab.title = '健康生活助手';
fab.innerText = '🍀';
document.body.appendChild(fab);



// 拖动逻辑（适配手机端）
function enableDrag(element) {
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  // 恢复保存的位置
  const savedPosition = localStorage.getItem('health-assistant-fab-position');
  if (savedPosition) {
    const { x, y } = JSON.parse(savedPosition);
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  }

  function dragStart(e) {
    if (e.type === "touchstart") {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }

    if (e.target === element) {
      isDragging = true;
      element.style.cursor = 'grabbing';
    }
  }

  function dragEnd(e) {
    if (!isDragging) return;
    
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    element.style.cursor = 'grab';

    // 保存位置
    const rect = element.getBoundingClientRect();
    localStorage.setItem('health-assistant-fab-position', JSON.stringify({
      x: rect.left,
      y: rect.top
    }));
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();

    if (e.type === "touchmove") {
      currentX = e.touches[0].clientX - initialX;
      currentY = e.touches[0].clientY - initialY;
    } else {
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
    }

    xOffset = currentX;
    yOffset = currentY;

    // 计算新位置
    let newLeft = currentX;
    let newTop = currentY;

    // 获取窗口尺寸和元素尺寸
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;

    // 限制在窗口内
    newLeft = Math.max(0, Math.min(newLeft, windowWidth - elementWidth));
    newTop = Math.max(0, Math.min(newTop, windowHeight - elementHeight));

    // 设置位置
    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transform = "translate(0, 0)";
  }

  // 鼠标事件
  element.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  // 触摸事件
  element.addEventListener('touchstart', dragStart, { passive: false });
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('touchend', dragEnd);

  // 防止点击时触发拖动
  element.addEventListener('click', (e) => {
    if (xOffset !== 0 || yOffset !== 0) {
      e.stopPropagation();
      xOffset = 0;
      yOffset = 0;
    }
  });

  // 窗口大小改变时，确保按钮在可视区域内
  window.addEventListener('resize', () => {
    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let newLeft = rect.left;
    let newTop = rect.top;
    
    // 调整位置确保在窗口内
    newLeft = Math.max(0, Math.min(newLeft, windowWidth - element.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, windowHeight - element.offsetHeight));
    
    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
  });
}

// 启用拖动
enableDrag(fab);

      const panel = document.createElement('div');
      panel.id = 'health-assistant-panel';
      panel.innerHTML = `
        <div class="ha-header">
          <div>
            <div style="font-weight:600">健康生活助手</div>
            <div id="ha-datetime" style="font-size:12px;color:#666"></div>
          </div>
          <div style="font-size:12px; color:#999; align-self:center">v0.1</div>
        </div>

        <div class="ha-grid">
          <div class="ha-btn" data-key="routine">规律作息</div>
          <div class="ha-btn" data-key="diet">健康饮食</div>
          <div class="ha-btn" data-key="mental">心理健康</div>
          <div class="ha-btn" data-key="exercise">适度运动</div>
          <div class="ha-btn" data-key="finance">收支平衡</div>
          <div class="ha-btn" data-key="wishes">心愿清单</div>
          <div class="ha-btn" data-key="social">习惯养成</div>
          <div class="ha-btn" data-key="todo">待办事项</div>
          <div class="ha-btn" data-key="pomodoro">专注番茄</div>
          <div class="ha-btn" data-key="memo">随笔备忘</div>
          <div class="ha-btn" data-key="bgm">背景音乐</div>
          <div class="ha-btn" data-key="apiconf">独立API</div>
          <div class="ha-btn" data-key="clearbook">清除数据</div>
        </div>

        <div id="ha-content-area" class="ha-subpanel" style="display:block;">
          <div class="ha-small">请选择一个功能</div>
        </div>
      `;
      document.body.appendChild(panel);

      // 更新时钟
      const dtEl = panel.querySelector('#ha-datetime');
      function updateClock(){
        const d = new Date();
        dtEl.innerText = d.toLocaleString();
      }
      updateClock();
      setInterval(updateClock, 1000);

      // 面板切换
      fab.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
      });

      // 简单的 helper：保存 settings
      function saveSettings() {
        if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
        else console.warn('saveSettingsDebounced not available - changes may not persist until reload');
      }

      // 调试日志（轻量）
      function debugLog(...args) {
        // 打开 window.DEBUG_HEALTH_ASSISTANT 可查看日志
        if (window.DEBUG_HEALTH_ASSISTANT) console.log('[健康生活助手]', ...args);
      }

      // 打开各主面板（最小实现）
      const content = panel.querySelector('#ha-content-area');
      panel.querySelectorAll('.ha-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          if (key === 'routine') showRoutine();
          else if (key === 'diet') showDiet();
          else if (key === 'mental') showMental();
          else if (key === 'exercise') showExercise();
          else if (key === 'finance') showFinance();
          else if (key === 'wishes') showWishes();
          else if (key === 'social') showSocial();
          else if (key === 'todo') showTodo();
          else if (key === 'pomodoro') showPomodoro();
          else if (key === 'memo') showMemo();
          else if (key === 'bgm') showBgm();
          else if (key === 'clearbook') showClearBook();
          else if (key === 'apiconf') showApiConfig();
        });
      });

      // --------- 各模块内容（最小实现） ----------
// 专注番茄钟模块 v3 - 后台计时版本 + 系统通知
async function showPomodoro() {
  try {
    const cs = window.getComputedStyle(content);
    if (cs.position === 'static' || !cs.position) content.style.position = 'relative';
  } catch (e) {}

  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:8px">专注番茄钟</div>
    
    <!-- 第一行：时间输入 + 音乐控制 -->
    <div style="display:flex;gap:4px;margin-bottom:8px;align-items:center;flex-wrap:wrap;">
      <input id="pom-time-input" type="number" placeholder="分钟" min="0" max="120" value=""
             style="width:80px;padding:4px;">
      <button id="pom-time-add" class="ha-btn" style="padding:4px 8px;">➕</button>
      <button id="pom-time-del" class="ha-btn" style="padding:4px 8px;">🗑️</button>
      <button id="pom-bgm-play" class="ha-btn" style="padding:4px 8px;">🎵</button>
      <button id="pom-bgm-next" class="ha-btn" style="padding:4px 8px;">⏯️</button>
      <input id="pom-bgm-volume" type="range" min="0" max="100" value="30"
             style="width:80px;cursor:pointer;">
      
    </div>
    
    <!-- 时间块显示区 -->
    <div id="pom-time-blocks" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;min-height:24px;"></div>
    
    <!-- 第二行：标题和待办/习惯 -->
    <div style="display:flex;gap:4px;margin-bottom:8px;align-items:center;">
      <input id="pom-title-input" type="text" placeholder="专注标题（可留空）"
             style="flex:1;padding:4px;">
      <button id="pom-todo-btn" class="ha-btn">待办</button>
      <button id="pom-habit-btn" class="ha-btn">习惯</button>
    </div>
    
    <!-- 第三行：标签管理 -->
    <div style="display:flex;gap:4px;margin-bottom:8px;align-items:center;">
      <input id="pom-tag-input" type="text" placeholder="标签"
             style="flex:1;padding:4px;">
      <button id="pom-tag-add" class="ha-btn" style="padding:4px 8px;">➕</button>
      <button id="pom-tag-del" class="ha-btn" style="padding:4px 8px;">🗑️</button>
      <button id="pom-notify-btn" class="ha-btn" style="padding:4px 8px;">🔔</button>
    </div>
    
    <!-- 标签显示区 -->
    <div id="pom-tag-blocks" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;min-height:24px;"></div>
    
    <!-- 第四行：操作按钮 -->
    <div style="display:flex;gap:4px;margin-bottom:8px;">
      <button id="pom-start-btn" class="ha-btn" style="flex:1;">开始</button>
      <button id="pom-stats-btn" class="ha-btn" style="flex:1;">统计</button>
      <button id="pom-delete-btn" class="ha-btn" style="flex:1;">删除</button>
    </div>
  `;

  // ====== 状态管理 ======
  if (!ctx.extensionSettings[MODULE_NAME].pomodoro) {
    ctx.extensionSettings[MODULE_NAME].pomodoro = {
      timeBlocks: [],
      tagBlocks: [],
      records: [],
      selectedTimeBlock: null,
      selectedTag: null,
      session: null,
      tagDeleteMode: false,
      timeDeleteMode: false,
      notifyConfig: {
        vibrate: true,
        ring: true,
        ringUrl: ''
      }
    };
    if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
  }

  const pm = ctx.extensionSettings[MODULE_NAME].pomodoro;

  // ====== 世界书操作 ======
  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) return WI;
      }
      return null;
    } catch { return null; }
  }

  async function appendToWorldInfoFocus() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return;
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      
      // 更新专注记录条目
      let focusUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('专注记录') || entry.title === '专注记录')) {
          focusUID = entry.uid;
          break;
        }
      }
      
      if (focusUID) {
        const arr = pm.records.map((r) => {
          const mins = Math.floor(r.duration / 60);
          const tags = r.tags.length ? `[${r.tags.join(',')}]` : '';
          return `• ${r.title || '(无标题)'} ${mins}分钟 ${tags}`;
        });
        const newContent = arr.join('\n');
        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: focusUID, field: 'content' }, newContent);
      }

      // 更新待办条目
      let todoUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('待办') || entry.title === '待办')) {
          todoUID = entry.uid;
          break;
        }
      }

      if (todoUID) {
        const todos = ctx.extensionSettings[MODULE_NAME].todo || [];
        const arr = todos.map((t, i) => {
          const due = t.due ? `截止:${t.due}` : '';
          const status = t.done ? '完成' : (t.due && new Date() > new Date(t.due) ? '过期' : '进行中');
          const focused = t.focused ? `已专注:${Math.floor(t.focused / 60)}分钟` : '';
          return `${i+1}. [${status}] ${t.name} 优先:${t.priority} 标签:${t.tag} ${due} ${focused}`;
        });
        const newContent = arr.join('\n');
        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: todoUID, field: 'content' }, newContent);
      }
    } catch (e) {
      toastr.error('同步世界书失败');
    }
  }

  // ====== 音乐播放模块 ======
  let bgmAudio = null;
  let bgmIsPlaying = false;
  let currentBgmIndex = 0;
  
  const bgmList = [
    { name: '雨声', url: '/scripts/extensions/third-party/healthy-life-helper/BGM/1_雨声.mp3' },
    { name: '森林', url: '/scripts/extensions/third-party/healthy-life-helper/BGM/2_森林.mp3' },
    { name: '咖啡厅', url: '/scripts/extensions/third-party/healthy-life-helper/BGM/3_咖啡厅.mp3' }
  ];

  function updateBgmDisplay() {
    const nameEl = document.getElementById('pom-bgm-name');
    const playBtn = document.getElementById('pom-bgm-play');
    if (nameEl) {
      nameEl.innerText = bgmList[currentBgmIndex].name;
      nameEl.style.color = bgmIsPlaying ? '#4CAF50' : '#666';
    }
    if (playBtn) {
      playBtn.innerText = bgmIsPlaying ? '⏸️' : '🎵';
    }
  }

  function playBgm() {
    if (!bgmAudio) {
      bgmAudio = new Audio(bgmList[currentBgmIndex].url);
      bgmAudio.loop = true;
      const volValue = document.getElementById('pom-bgm-volume')?.value || 30;
      bgmAudio.volume = volValue / 100;
    }

    if (bgmIsPlaying) {
      bgmAudio.pause();
      bgmIsPlaying = false;
    } else {
      bgmAudio.play().catch(e => toastr.error('播放BGM失败'));
      bgmIsPlaying = true;
    }
    updateBgmDisplay();
  }

  function nextBgm() {
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio = null;
    }
    currentBgmIndex = (currentBgmIndex + 1) % bgmList.length;
    bgmIsPlaying = false;
    updateBgmDisplay();
    toastr.info(`已切换到: ${bgmList[currentBgmIndex].name}`);
  }

  // ====== 系统通知模块 ======
  async function triggerSystemNotification() {
    const cfg = pm.notifyConfig;
    
    // 1. 尝试调用系统通知 API（需要HTTPS和用户授权）
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('番茄钟完成', {
          body: '专注时间已到！',
          icon: '🎯',
          tag: 'pomodoro-complete'
        });
        return;
      }
    } catch (e) {}

    // 2. 震动通知
    if (cfg.vibrate && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
      } catch (e) {}
    }

    // 3. 音频通知
    if (cfg.ring) {
      try {
        // 尝试调用系统原生通知音
        if (cfg.ringUrl) {
          const audio = new Audio(cfg.ringUrl);
          audio.volume = 1;
          await audio.play();
        } else {
          // 使用Web Audio API生成铃声（保证可用）
          const ctx_audio = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = ctx_audio.createOscillator();
          const gainNode = ctx_audio.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(ctx_audio.destination);
          
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.3, ctx_audio.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx_audio.currentTime + 0.5);
          
          oscillator.start(ctx_audio.currentTime);
          oscillator.stop(ctx_audio.currentTime + 0.5);
        }
      } catch (e) {}
    }
  }

  // ====== 计时会话面板 ======
  function showSessionPanel() {
    const timeBlockIdx = pm.selectedTimeBlock;
    if (timeBlockIdx === null) {
      toastr.error('请先选择一个时间块');
      return;
    }

    const targetMins = pm.timeBlocks[timeBlockIdx];
    const targetSecs = targetMins === 0 ? null : targetMins * 60;

    let elapsed = 0;
    let isPaused = false;
    let isComplete = false;
    
    // 后台计时变量
    let lastTimestamp = Date.now();
    let backgroundTimer = null;

    const sessionDialog = document.createElement('div');
    sessionDialog.innerHTML = `
      <div style="background:#fff;padding:16px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-height:300px;width:320px;margin:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="font-size:14px;color:#666;" id="session-timeinfo">已用时长 / 剩余时长</div>
          <button id="session-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div style="text-align:center;margin-bottom:12px;">
          <div style="font-size:28px;font-weight:600;" id="session-timer">00:00:00</div>
        </div>
        <div style="display:flex;gap:4px;margin-bottom:12px;">
          <textarea id="session-notes" placeholder="输入笔记/想法..."
                    style="flex:1;width:100%;height:120px;padding:6px;border:1px solid #ddd;border-radius:3px;font-size:12px;resize:none;"></textarea>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:12px;">
          <button id="session-pause" class="ha-btn" style="flex:1;">暂停</button>
          <button id="session-end" class="ha-btn" style="flex:1;">结束</button>
        </div>
      </div>`;
    Object.assign(sessionDialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    content.appendChild(sessionDialog);

    const timerDisplay = sessionDialog.querySelector('#session-timer');
    const timeInfoDisplay = sessionDialog.querySelector('#session-timeinfo');
    const notesArea = sessionDialog.querySelector('#session-notes');
    const pauseBtn = sessionDialog.querySelector('#session-pause');
    const endBtn = sessionDialog.querySelector('#session-end');
    const closeBtn = sessionDialog.querySelector('#session-close');

    function updateDisplay() {
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      timerDisplay.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      
      if (targetSecs === null) {
        timeInfoDisplay.innerText = '已用时长 / --';
      } else {
        const remainSecs = Math.max(0, targetSecs - elapsed);
        const remainH = Math.floor(remainSecs / 3600);
        const remainM = Math.floor((remainSecs % 3600) / 60);
        const remainS = remainSecs % 60;
        timeInfoDisplay.innerText = `已用 ${m}:${String(s).padStart(2, '0')} / 剩余 ${String(remainM).padStart(2, '0')}:${String(remainS).padStart(2, '0')}`;
      }
    }

    async function endSession() {
      isComplete = true;
      if (backgroundTimer) clearInterval(backgroundTimer);

      const title = document.getElementById('pom-title-input').value.trim();
      const tagIdx = pm.selectedTag;
      const tags = tagIdx !== null ? [pm.tagBlocks[tagIdx]] : [];

      let source = 'custom';
      const todos = ctx.extensionSettings[MODULE_NAME].todo || [];
      const social = ctx.extensionSettings[MODULE_NAME].social || {};

      let matchedTodoIdx = -1;
      let matchedHabitId = null;

      if (title) {
        for (let i = 0; i < todos.length; i++) {
          if (todos[i].name === title) {
            source = 'todo';
            matchedTodoIdx = i;
            break;
          }
        }
        if (source === 'custom') {
          for (const habitId in social) {
            if (social[habitId].name === title) {
              source = 'habit';
              matchedHabitId = habitId;
              break;
            }
          }
        }
      }

      const record = {
        title: title || '(无标题)',
        source: source,
        duration: elapsed,
        tags: tags,
        timestamp: new Date().toISOString(),
        notes: notesArea.value
      };
      pm.records.push(record);

      if (source === 'todo' && matchedTodoIdx >= 0) {
        const todo = todos[matchedTodoIdx];
        todo.focused = (todo.focused || 0) + elapsed;
      } else if (source === 'habit' && matchedHabitId) {
        social[matchedHabitId].logs = social[matchedHabitId].logs || [];
        social[matchedHabitId].logs.push({ ts: new Date().toISOString(), duration: elapsed });
      }

      saveSettings();
      await appendToWorldInfoFocus();

      // 触发系统通知
      await triggerSystemNotification();

      sessionDialog.remove();
      toastr.success('番茄钟已完成！');
    }

   function handleBackgroundTick() {
  if (isComplete) return;  // ✅ 只在完成时才停止
  const now = Date.now();
  const deltaSeconds = Math.floor((now - lastTimestamp) / 1000);
  lastTimestamp = now;
  if (!isPaused && deltaSeconds > 0) {
    elapsed += deltaSeconds;      // ✅ 只有不暂停时才累加时间
    updateDisplay();
  } else if (isPaused) {
    lastTimestamp = now;          // ✅ 暂停时重置时间戳
  }
}

    // 启动后台计时（每100ms检查一次）
    backgroundTimer = setInterval(handleBackgroundTick, 1000);
    lastTimestamp = Date.now();
    updateDisplay();

    pauseBtn.onclick = () => {
      isPaused = !isPaused;
      pauseBtn.innerText = isPaused ? '继续' : '暂停';
      if (!isPaused) {
        lastTimestamp = Date.now();
      }
    };

    endBtn.onclick = async () => {
  await endSession();  // ✅ 正确处理 async
};

    closeBtn.onclick = () => {
      isComplete = true;
      if (backgroundTimer) clearInterval(backgroundTimer);
      sessionDialog.remove();
      toastr.warning('已取消本次专注');
    };
  }

  // ====== 时间块管理 ======
  function renderTimeBlocks() {
    const container = document.getElementById('pom-time-blocks');
    container.innerHTML = '';
    pm.timeBlocks.forEach((mins, idx) => {
      const div = document.createElement('div');
      const isActive = pm.selectedTimeBlock === idx;
      const label = mins === 0 ? '正计时' : `${mins}分`;
      div.innerText = label;
      div.style.cssText = `
        padding:4px 10px;
        border-radius:12px;
        cursor:pointer;
        background:${isActive ? '#4CAF50' : '#e0e0e0'};
        color:${isActive ? '#fff' : '#333'};
        font-weight:400;
        user-select:none;
        border:2px solid ${isActive ? '#45a049' : '#ccc'};
        font-size:14px;
      `;
      
      if (pm.timeDeleteMode) {
        div.onclick = () => {
          pm.timeBlocks.splice(idx, 1);
          saveSettings();
          renderTimeBlocks();
          toastr.success('时间块已删除');
        };
      } else {
        div.onclick = () => {
          pm.selectedTimeBlock = pm.selectedTimeBlock === idx ? null : idx;
          saveSettings();
          renderTimeBlocks();
        };
      }
      container.appendChild(div);
    });
  }

  // ====== 标签块管理 ======
  function renderTagBlocks() {
    const container = document.getElementById('pom-tag-blocks');
    container.innerHTML = '';
    pm.tagBlocks.forEach((tag, idx) => {
      const div = document.createElement('div');
      const isActive = pm.selectedTag === idx;
      div.innerText = tag;
      div.style.cssText = `
        padding:4px 10px;
        border-radius:12px;
        cursor:pointer;
        user-select:none;background:${isActive ? '#2196F3' : '#e8e8e8'};
        color:${isActive ? '#fff' : '#333'};
        font-weight:400;
        user-select:none;
        border:2px solid ${isActive ? '#1976D2' : '#ccc'};
        font-size:14px;
      `;
      
      if (pm.tagDeleteMode) {
        div.onclick = () => {
          pm.tagBlocks.splice(idx, 1);
          if (pm.selectedTag === idx) pm.selectedTag = null;
          saveSettings();
          renderTagBlocks();
          toastr.success('标签已删除');
        };
      } else {
        div.onclick = () => {
          pm.selectedTag = pm.selectedTag === idx ? null : idx;
          saveSettings();
          renderTagBlocks();
        };
      }
      container.appendChild(div);
    });
  }

  // ====== 待办弹窗 ======
  function showTodoPopup() {
    const todos = ctx.extensionSettings[MODULE_NAME].todo || [];
    const now = new Date();
    const activeTodos = todos.filter(t => !t.done && (!t.due || new Date(t.due) >= now));
    const expiredTodos = todos.filter(t => !t.done && t.due && new Date(t.due) < now);
    const allTodos = [...activeTodos, ...expiredTodos];

    if (allTodos.length === 0) {
      toastr.warning('暂无进行中或过期的待办');
      return;
    }

    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:300px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>选择待办</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div id="popup-list" style="max-height:300px;overflow-y:auto;font-size:13px;"></div>
      </div>`;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    content.appendChild(dialog);

    const listEl = dialog.querySelector('#popup-list');
    allTodos.forEach((todo, idx) => {
      const div = document.createElement('div');
      div.style.cssText = `
        padding:6px;
        margin-bottom:4px;
        background:#f5f5f5;
        border-radius:3px;
        cursor:pointer;
        border-left:3px solid ${todo.done ? '#4CAF50' : '#ff9800'};
      `;
      const dueText = todo.due ? ` (${todo.due.split('T')[0]})` : '';
      div.innerText = `${todo.name}${dueText}`;
      div.onclick = () => {
        document.getElementById('pom-title-input').value = todo.name;
        dialog.remove();
        toastr.success(`已注入待办: ${todo.name}`);
      };
      listEl.appendChild(div);
    });

    dialog.querySelector('#popup-close').onclick = () => dialog.remove();
  }

  // ====== 习惯弹窗 ======
  function showHabitPopup() {
    const social = ctx.extensionSettings[MODULE_NAME].social || {};
    const habits = Object.values(social);

    if (habits.length === 0) {
      toastr.warning('暂无配置习惯');
      return;
    }

    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:300px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>选择习惯</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div id="popup-list" style="max-height:300px;overflow-y:auto;font-size:13px;"></div>
      </div>`;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    content.appendChild(dialog);

    const listEl = dialog.querySelector('#popup-list');
    habits.forEach((habit, idx) => {
      const div = document.createElement('div');
      div.style.cssText = `
        padding:6px;
        margin-bottom:4px;
        background:#f5f5f5;
        border-radius:3px;
        cursor:pointer;
        border-left:3px solid #2196F3;
      `;
      div.innerText = `${habit.name} [${habit.frequency}]`;
      div.onclick = () => {
        document.getElementById('pom-title-input').value = habit.name;
        dialog.remove();
        toastr.success(`已注入习惯: ${habit.name}`);
      };
      listEl.appendChild(div);
    });

    dialog.querySelector('#popup-close').onclick = () => dialog.remove();
  }

  // ====== 通知配置弹窗 ======
  function showNotifyConfig() {
    const dialog = document.createElement('div');
    const cfg = pm.notifyConfig;
    dialog.innerHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:300px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>通知设置</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div style="margin-bottom:8px;">
          <label style="display:flex;align-items:center;margin-bottom:6px;font-size:13px;">
            <input id="vibrate-check" type="checkbox" ${cfg.vibrate ? 'checked' : ''} style="margin-right:6px;">
            震动
          </label>
          <label style="display:flex;align-items:center;font-size:13px;">
            <input id="ring-check" type="checkbox" ${cfg.ring ? 'checked' : ''} style="margin-right:6px;">
            响铃
          </label>
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-size:13px;">铃声URL：</label>
          <input id="ring-url-input" type="text" placeholder="https://..." value="${cfg.ringUrl}"
                 style="width:100%;padding:4px;font-size:12px;">
        </div>
        <div style="text-align:right;">
          <button id="notify-ok" class="ha-btn">确定</button>
        </div>
      </div>`;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    content.appendChild(dialog);

    dialog.querySelector('#notify-ok').onclick = () => {
      cfg.vibrate = dialog.querySelector('#vibrate-check').checked;
      cfg.ring = dialog.querySelector('#ring-check').checked;
      cfg.ringUrl = dialog.querySelector('#ring-url-input').value;
      saveSettings();
      dialog.remove();
      toastr.success('通知设置已保存');
    };
    dialog.querySelector('#popup-close').onclick = () => dialog.remove();
  }

  // ====== 统计面板 ======
  function showStatsPanel() {
    const dialog = document.createElement('div');
    let statsHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-height:300px;width:300px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>专注统计</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div id="stats-content" style="max-height:180px;overflow-y:auto;font-size:13px;margin-bottom:8px;">`;

    const tagStats = {};
    let totalDuration = 0;
    pm.records.forEach(r => {
      totalDuration += r.duration;
      const tag = r.tags.length > 0 ? r.tags[0] : '(无标签)';
      if (!tagStats[tag]) tagStats[tag] = 0;
      tagStats[tag] += r.duration;
    });

    statsHTML += `<div style="font-weight:600;margin-bottom:6px;">总计：${Math.floor(totalDuration / 60)}分钟</div>`;
    for (const tag in tagStats) {
      const mins = Math.floor(tagStats[tag] / 60);
      statsHTML += `<div style="margin-bottom:4px;">📍 ${tag}: ${mins}分钟</div>`;
    }

    statsHTML += `</div>
      <div style="display:flex;gap:6px;">
        <button id="stats-sync" class="ha-btn" style="flex:1;">同步世界书</button>
        <button id="stats-close" class="ha-btn" style="flex:1;">关闭</button>
      </div>
    </div>`;

    dialog.innerHTML = statsHTML;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    content.appendChild(dialog);

    dialog.querySelector('#stats-sync').onclick = async () => {
      try {
        const fileId = await findHealthWorldFile();
        if (!fileId) {
          toastr.error('未找到健康生活助手世界书');
          return;
        }
        const moduleWI = await import('/scripts/world-info.js');
        const worldInfo = await moduleWI.loadWorldInfo(fileId);
        const entries = worldInfo.entries || {};
        let targetUID = null;
        for (const id in entries) {
          const entry = entries[id];
          const comment = entry.comment || '';
          if (!entry.disable && (comment.includes('专注统计') || entry.title === '专注统计')) {
            targetUID = entry.uid;
            break;
          }
        }
        if (!targetUID) {
          toastr.error('未找到专注统计条目');
          return;
        }

        let statsContent = `总计：${Math.floor(totalDuration / 60)}分钟\n\n`;
        for (const tag in tagStats) {
          const mins = Math.floor(tagStats[tag] / 60);
          statsContent += `📍 ${tag}: ${mins}分钟\n`;
        }

        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: targetUID, field: 'content' }, statsContent);

        toastr.success('已同步到世界书');
        dialog.remove();
      } catch (e) {
        toastr.error('同步失败: ' + e.message);
      }
    };

    dialog.querySelector('#stats-close').onclick = () => dialog.remove();
    dialog.querySelector('#popup-close').onclick = () => dialog.remove();
  }

  // ====== 删除记录面板 ======
  let deleteDialogInstance = null;

  function showDeletePanel() {
    if (deleteDialogInstance) {
      deleteDialogInstance.remove();
      deleteDialogInstance = null;
    }

    const dialog = document.createElement('div');
    let html = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-height:300px;width:320px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>删除专注记录</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div id="delete-list" style="max-height:200px;overflow-y:auto;font-size:13px;"></div>
      </div>`;

    dialog.innerHTML = html;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    content.appendChild(dialog);
    deleteDialogInstance = dialog;

    const listEl = dialog.querySelector('#delete-list');

    function renderDeleteList() {
      listEl.innerHTML = '';
      pm.records.forEach((record, idx) => {
        const div = document.createElement('div');
        const mins = Math.floor(record.duration / 60);
        const tags = record.tags.length ? `[${record.tags.join(',')}]` : '';
        div.style.cssText = `
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:6px;
          margin-bottom:4px;
          background:#f5f5f5;
          border-radius:3px;
        `;
        div.innerHTML = `
          <span>${record.title} ${mins}分 ${tags}</span>
          <button class="ha-btn" style="padding:2px 6px;font-size:12px;">删除</button>
        `;
        div.querySelector('button').onclick = () => {
          pm.records.splice(idx, 1);
          saveSettings();
          appendToWorldInfoFocus();
          renderDeleteList();
          toastr.success('记录已删除');
        };
        listEl.appendChild(div);
      });
    }

    renderDeleteList();

    dialog.querySelector('#popup-close').onclick = () => {
      dialog.remove();
      deleteDialogInstance = null;
    };
  }

  // ====== 事件监听 ======
  document.getElementById('pom-time-add').onclick = () => {
    const inputVal = document.getElementById('pom-time-input').value.trim();
    const val = inputVal === '' || inputVal === '0' ? 0 : (parseInt(inputVal) || 25);
    if (val !== 0 && (val < 1 || val > 120)) {
      toastr.error('请输入1-120之间的数字或0(正计时)');
      return;
    }
    pm.timeBlocks.push(val);
    saveSettings();
    renderTimeBlocks();
    toastr.success(`添加${val === 0 ? '正计时' : val + '分钟'}时间块`);
  };

  document.getElementById('pom-time-del').onclick = () => {
    pm.timeDeleteMode = !pm.timeDeleteMode;
    document.getElementById('pom-time-del').style.background = pm.timeDeleteMode ? '#ff9800' : '';
    renderTimeBlocks();
  };

  document.getElementById('pom-tag-add').onclick = () => {
    const tag = document.getElementById('pom-tag-input').value.trim();
    if (!tag) {
      toastr.error('请输入标签名');
      return;
    }
    pm.tagBlocks.push(tag);
    document.getElementById('pom-tag-input').value = '';
    saveSettings();
    renderTagBlocks();
    toastr.success(`已添加标签: ${tag}`);
  };

  document.getElementById('pom-tag-del').onclick = () => {
    pm.tagDeleteMode = !pm.tagDeleteMode;
    document.getElementById('pom-tag-del').style.background = pm.tagDeleteMode ? '#ff9800' : '';
    renderTagBlocks();
  };

  // BGM 按钮处理
  const bgmPlayBtn = document.getElementById('pom-bgm-play');
  const bgmNextBtn = document.getElementById('pom-bgm-next');
  const bgmVolume = document.getElementById('pom-bgm-volume');

  bgmPlayBtn.addEventListener('click', playBgm);
  bgmNextBtn.addEventListener('click', nextBgm);
  bgmVolume.addEventListener('input', (e) => {
    if (bgmAudio) {
      bgmAudio.volume = e.target.value / 100;
    }
  });

  document.getElementById('pom-notify-btn').onclick = showNotifyConfig;
  document.getElementById('pom-todo-btn').onclick = showTodoPopup;
  document.getElementById('pom-habit-btn').onclick = showHabitPopup;
  document.getElementById('pom-start-btn').onclick = showSessionPanel;
  document.getElementById('pom-stats-btn').onclick = showStatsPanel;
  document.getElementById('pom-delete-btn').onclick = showDeletePanel;

  // ====== 初始化渲染 ======
  renderTimeBlocks();
  renderTagBlocks();
  updateBgmDisplay();
}

  
      
      
      
      
      
      async function showRoutine(){  
  const container = content;  
  container.style.display = 'block';  
  container.innerHTML = `  
    <div style="font-weight:600;margin-bottom:6px">规律作息</div>  
    <div style="display:flex;gap:8px;margin-bottom:6px">  
      <button id="ha-wake" class="ha-btn" style="flex:1">起床打卡</button>  
      <button id="ha-sleep" class="ha-btn" style="flex:1">入睡打卡</button>  
    </div>  
    <div style="display:flex;gap:8px;margin-bottom:6px">  
      <button id="ha-sleep-help" class="ha-btn" style="flex:1">助眠</button>  
      <button id="ha-sleep-analysis" class="ha-btn" style="flex:1">睡眠质量分析</button>  
    </div>  
    <div id="ha-subpanel" 
     style="
       margin-top:6px;
       padding:6px;
       border:1px solid #ddd;
       background:#f9f9f9;
       white-space:pre-wrap;
       min-height:60px;
       max-height:200px;
       overflow:auto;
       display:block;
     ">
</div></div>
    <div id="ha-routine-log" class="ha-small"></div>  
    <div id="ha-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;  
      max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>  
  `;  

  const wakeBtn = document.getElementById('ha-wake');  
  const sleepBtn = document.getElementById('ha-sleep');  
  const logEl = document.getElementById('ha-routine-log');  
  const debugEl = document.getElementById('ha-debug');  
  const subPanel = document.getElementById('ha-subpanel');  // 预留固定面板

  function debugLog(...args){  
    const ts = new Date().toLocaleTimeString();  
    const msg = `[${ts}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');  
    debugEl.innerText += msg + "\n";  
    debugEl.scrollTop = debugEl.scrollHeight;  
    console.log('[健康生活助手]', ...args);  
  }  

  async function findHealthWorldFile() {  
    try {  
      const moduleWI = await import('/scripts/world-info.js');  
      const selected = moduleWI.selected_world_info || [];  
      debugLog('selected_world_info:', selected);  
      for (const WI of selected) {  
        if (WI.includes('健康生活助手')) {  
          debugLog('匹配到世界书文件:', WI);  
          return WI;  
        }  
      }  
      debugLog('未找到名为 "健康生活助手" 的世界书文件');  
      return null;  
    } catch (e) {  
      debugLog('findHealthWorldFile 异常:', e.message || e);  
      return null;  
    }  
  }  

  async function appendToWorldInfoSleepLog(type, label){  
    try {  
      const fileId = await findHealthWorldFile();  
      if (!fileId) { debugLog('写入世界书: 未找到世界书文件，跳过写入'); return; }  

      const moduleWI = await import('/scripts/world-info.js');  
      const worldInfo = await moduleWI.loadWorldInfo(fileId);  
      const entries = worldInfo.entries || {};  
      debugLog('loadWorldInfo entries count:', Object.keys(entries).length);  

      let targetUID = null;  
      for (const id in entries) {  
        const entry = entries[id];  
        const comment = entry.comment || '';  
        if (!entry.disable && (comment.includes('睡眠') || comment.includes('健康生活助手/睡眠') || entry.title === '睡眠' )) {  
          targetUID = entry.uid;  
          debugLog('找到睡眠 entry: uid=', targetUID, 'comment=', comment);  
          break;  
        }  
      }  

      if (!targetUID) {  
        debugLog('未找到睡眠 entry（未创建）。写入被跳过。');  
        return;  
      }  

      const recLine = `${type === 'wake' ? '起床' : '入睡'} 打卡 @ ${label}`;  
      const existing = entries[targetUID].content || '';  
      const newContent = existing + (existing ? '\n' : '') + recLine;  

      debugLog('准备写入 world entry:', { file: fileId, uid: targetUID, newLine: recLine });  
      await globalThis.SillyTavern.getContext()  
        .SlashCommandParser.commands['setentryfield']  
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);  

      debugLog('写入世界书成功:', recLine);  
    } catch (e) {  
      debugLog('写入世界书失败:', e.message || e);  
    }  
  }  

  function appendSleepRecord(type){  
    const now = new Date();  
    const rec = { type, ts: now.toISOString(), label: now.toLocaleString() };  
    ctx.extensionSettings[MODULE_NAME].sleep.push(rec);  
    saveSettings();  
    const text = `${type === 'wake' ? '起床' : '入睡'} 打卡：\n${now.toLocaleString()}`;  
    alert(text);  
    renderLog();  
    appendToWorldInfoSleepLog(type, now.toLocaleString());  
  }  

  wakeBtn.addEventListener('click', () => appendSleepRecord('wake'));  
  sleepBtn.addEventListener('click', () => appendSleepRecord('sleep'));  

  // 助眠按钮
document.getElementById('ha-sleep-help').addEventListener('click', async () => {  
  const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};  
  subPanel.innerText = '正在获取助眠建议...';  
  subPanel.scrollTop = subPanel.scrollHeight;  // 滚动到底部

  if (!api.url) {  
    subPanel.innerText = '未配置独立 API，默认提示：保持卧室安静、黑暗，避免咖啡因，睡前放松。';  
    subPanel.scrollTop = subPanel.scrollHeight;  
    debugLog('助眠调用: 未配置 API');  
    return;  
  }  

  try {  
    const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';  
    debugLog('助眠调用: 请求将发送到', endpoint, 'model:', api.model);  
    const res = await fetch(endpoint, {  
      method: 'POST',  
      headers: {  
        'Content-Type': 'application/json',  
        ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})  
      },  
      body: JSON.stringify({  
        model: api.model,  
        messages: [{ role: 'system', content: '提供一些哄睡助眠措施帮user放下手机入眠。' }],  
        max_tokens: 5000  
      })  
    });  
    debugLog('助眠调用: HTTP 状态', res.status);  
    if (!res.ok) throw new Error('HTTP ' + res.status);  
    const data = await res.json();  
    const text = data.choices?.[0]?.message?.content || (data.result || JSON.stringify(data));  
    subPanel.innerText = text;  
    subPanel.scrollTop = subPanel.scrollHeight;  
    debugLog('助眠调用: 返回摘录', text.slice(0,200));  
  } catch (e) {  
    subPanel.innerText = 'API 请求失败：' + (e.message || e);  
    subPanel.scrollTop = subPanel.scrollHeight;  
    debugLog('助眠调用失败:', e.message || e);  
  }  
});  

// 睡眠质量分析按钮
document.getElementById('ha-sleep-analysis').addEventListener('click', async () => {  
  subPanel.innerText = '正在分析睡眠质量...';  
  subPanel.scrollTop = subPanel.scrollHeight;  

  try {  
    const fileId = await findHealthWorldFile();  
    if (!fileId) { 
      subPanel.innerText = '未找到世界书（健康生活助手.json）'; 
      subPanel.scrollTop = subPanel.scrollHeight;  
      debugLog('分析: 未找到世界书文件'); 
      return; 
    }  

    const moduleWI = await import('/scripts/world-info.js');  
    const worldInfo = await moduleWI.loadWorldInfo(fileId);  
    const entries = worldInfo.entries || {};  
    let targetContent = '';  
    for (const id in entries) {  
      const entry = entries[id];  
      const comment = entry.comment || '';  
      if (!entry.disable && (comment.includes('睡眠') || comment.includes('健康生活助手/睡眠') || entry.title === '睡眠')) {  
        targetContent = entry.content || '';  
        debugLog('分析: 找到睡眠 entry uid=', entry.uid);  
        break;  
      }  
    }  

    if (!targetContent) { 
      subPanel.innerText = '世界书中未找到睡眠条目或内容为空'; 
      subPanel.scrollTop = subPanel.scrollHeight;  
      debugLog('分析: 睡眠条目为空'); 
      return; 
    }  

    const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};  
    if (!api.url) {  
      subPanel.innerText = '未配置独立 API，无法进行分析。';  
      subPanel.scrollTop = subPanel.scrollHeight;  
      debugLog('分析: 未配置 API');  
      return;  
    }  

    const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';  
    debugLog('分析调用: 请求将发送到', endpoint, 'model:', api.model);  
    const res = await fetch(endpoint, {  
      method: 'POST',  
      headers: {  
        'Content-Type': 'application/json',  
        ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})  
      },  
      body: JSON.stringify({  
        model: api.model,  
        messages: [  
          { role: 'system', content: '你是健康顾问，请分析用户的睡眠记录并给出改善建议。' },  
          { role: 'user', content: targetContent }  
        ],  
        max_tokens: 5000 
      })  
    });  
    debugLog('分析调用: HTTP 状态', res.status);  
    if (!res.ok) throw new Error('HTTP ' + res.status);  
    const data = await res.json();  
    const text = data.choices?.[0]?.message?.content || JSON.stringify(data);  
    subPanel.innerText = text;  
    subPanel.scrollTop = subPanel.scrollHeight;  
    debugLog('分析调用: 返回摘录', text.slice(0,200));  
  } catch (e) {  
    subPanel.innerText = '分析失败：' + (e.message || e);  
    subPanel.scrollTop = subPanel.scrollHeight;  
    debugLog('分析异常:', e.message || e);  
  }  
});

  function renderLog(){  
    const arr = ctx.extensionSettings[MODULE_NAME].sleep || [];  
    logEl.innerText = `已记录 ${arr.length} 条（存储在扩展设置与世界书中）`;  
  }  
  renderLog();  
}

  
      async function showDiet() {
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">健康饮食</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-breakfast" class="ha-btn" style="flex:1">早餐</button>
      <button id="ha-lunch" class="ha-btn" style="flex:1">午餐</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-dinner" class="ha-btn" style="flex:1">晚餐</button>
      <button id="ha-other" class="ha-btn" style="flex:1">其他记录</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-diet-advice" class="ha-btn" style="flex:1">饮食建议（API）</button>
    </div>
    <div id="ha-diet-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
    </div>
    <div id="ha-diet-log" class="ha-small"></div>
    <div id="ha-diet-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>
  `;

  const logEl = document.getElementById('ha-diet-log');
  const debugEl = document.getElementById('ha-diet-debug');
  const subPanel = document.getElementById('ha-diet-subpanel');

  function debugLog(...args) {
    const ts = new Date().toLocaleTimeString();
    const msg = `[${ts}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    debugEl.innerText += msg + "\n";
    debugEl.scrollTop = debugEl.scrollHeight;
    console.log('[健康生活助手]', ...args);
  }

  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      debugLog('selected_world_info:', selected);
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          debugLog('匹配到世界书文件:', WI);
          return WI;
        }
      }
      debugLog('未找到名为 "健康生活助手" 的世界书文件');
      return null;
    } catch (e) {
      debugLog('findHealthWorldFile 异常:', e.message || e);
      return null;
    }
  }

  async function appendToWorldInfoDietLog(meal, contentText) {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) { debugLog('写入世界书: 未找到世界书文件，跳过写入'); return; }

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      debugLog('loadWorldInfo entries count:', Object.keys(entries).length);

      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('饮食') || entry.title === '饮食')) {
          targetUID = entry.uid;
          debugLog('找到饮食 entry: uid=', targetUID, 'comment=', comment);
          break;
        }
      }

      if (!targetUID) {
        debugLog('未找到饮食 entry（未创建），写入被跳过。');
        return;
      }

      const recLine = `${meal} @ ${new Date().toLocaleString()} ：${contentText}`;
      const existing = entries[targetUID].content || '';
      const newContent = existing + (existing ? '\n' : '') + recLine;

      debugLog('准备写入 world entry:', { file: fileId, uid: targetUID, newLine: recLine });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);

      debugLog('写入世界书成功:', recLine);
    } catch (e) {
      debugLog('写入世界书失败:', e.message || e);
    }
  }

  function recordDiet(meal) {
    const text = prompt(`记录 ${meal} 内容：`, '');
    if (!text) return;
    const now = new Date();
    ctx.extensionSettings[MODULE_NAME].diet.push({ meal, text, ts: now.toISOString() });
    saveSettings();
    alert(`${meal} 已记录：${text}`);
    renderLog();
    appendToWorldInfoDietLog(meal, text);
  }

  ['breakfast', 'lunch', 'dinner', 'other'].forEach(id => {
    const el = document.getElementById(`ha-${id}`);
    if (el) el.addEventListener('click', () => recordDiet(id));
  });

  document.getElementById('ha-diet-advice').addEventListener('click', async () => {
    subPanel.innerText = '正在获取饮食建议...';
    subPanel.scrollTop = subPanel.scrollHeight;

    try {
      const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
      if (!api.url) {
        subPanel.innerText = '未配置独立 API，示例建议：早餐优先蛋白质、全谷物；午餐/晚餐控制份量，多蔬菜。';
        debugLog('饮食建议: 未配置 API');
        return;
      }

      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
      debugLog('饮食建议调用: 请求将发送到', endpoint, 'model:', api.model);

      const history = ctx.extensionSettings[MODULE_NAME].diet.map(d => `${d.meal}：${d.text}`).join('\n');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})
        },
        body: JSON.stringify({
          model: api.model,
          messages: [
            { role: 'system', content: '你是健康顾问，请根据用户饮食记录提供科学合理的饮食建议。' },
            { role: 'user', content: history || '用户未提供饮食记录' }
          ],
          max_tokens: 5000
        })
      });
      debugLog('饮食建议调用: HTTP 状态', res.status);
      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
      subPanel.innerText = text;
      subPanel.scrollTop = subPanel.scrollHeight;
      debugLog('饮食建议调用: 返回摘录', text.slice(0, 200));
    } catch (e) {
      subPanel.innerText = 'API 请求失败：' + (e.message || e);
      subPanel.scrollTop = subPanel.scrollHeight;
      debugLog('饮食建议调用失败:', e.message || e);
    }
  });

  function renderLog() {
    const arr = ctx.extensionSettings[MODULE_NAME].diet || [];
    logEl.innerText = `已记录 ${arr.length} 条饮食记录（存储在扩展设置与世界书中）`;
  }

  renderLog();
}

 async function showMental() {
    content.style.display = 'block';
    content.innerHTML = `<div style="font-weight:600;margin-bottom:6px">心理健康</div>
        <div style="margin-bottom:6px">
            <button id="ha-emotion" class="ha-btn" style="margin-bottom:6px">情绪记录</button>
            <button id="ha-attention-shift" class="ha-btn" style="margin-bottom:6px;margin-left:6px">转移注意力</button>
            <button id="ha-thought-chain" class="ha-btn" style="margin-bottom:6px;margin-left:6px">思维链识别</button>
        </div>
        <div style="margin-bottom:6px">
            <label style="display:block;font-size:12px;color:#666">正念冥想计时（分钟，0=即时指导）</label>
            <input id="ha-meditation-min" type="range" min="0" max="30" step="5" value="5" style="width:150px"/>
            <span id="ha-meditation-val">5</span> 分钟
            <span id="ha-medit-timer" style="margin-left:12px;color:#007acc;font-weight:600"></span>
            <button id="ha-start-medit" class="ha-btn" style="margin-left:8px">开始</button>
            <button id="ha-stop-medit" class="ha-btn" style="margin-left:8px;display:none">结束</button>
        </div>
        <div id="ha-mental-subpanel" style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
        </div>
        <div id="ha-mental-log" class="ha-small"></div>
        <div id="ha-mental-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>`;
    const logEl = document.getElementById('ha-mental-log');
    const debugEl = document.getElementById('ha-mental-debug');
    const subPanel = document.getElementById('ha-mental-subpanel');
    const slider = document.getElementById('ha-meditation-min');
    const sliderVal = document.getElementById('ha-meditation-val');
    const timerEl = document.getElementById('ha-medit-timer');
    const btnStart = document.getElementById('ha-start-medit');
    const btnStop = document.getElementById('ha-stop-medit');
    let timerId = null;
    let startTime = null;
    let targetDuration = 0; // 分钟
    slider.addEventListener('input', () => {
        sliderVal.innerText = slider.value;
    });
    function debugLog(...args) {
        const ts = new Date().toLocaleTimeString();
        const msg = `[${ts}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        debugEl.innerText += msg + "\n";
        debugEl.scrollTop = debugEl.scrollHeight;
        console.log('[健康生活助手]', ...args);
    }
    async function findHealthWorldFile() {
        try {
            const moduleWI = await import('/scripts/world-info.js');
            const selected = moduleWI.selected_world_info || [];
            debugLog('selected_world_info:', selected);
            for (const WI of selected) {
                if (WI.includes('健康生活助手')) {
                    debugLog('匹配到世界书文件:', WI);
                    return WI;
                }
            }
            debugLog('未找到名为 "健康生活助手" 的世界书文件');
            return null;
        } catch (e) {
            debugLog('findHealthWorldFile 异常:', e.message || e);
            return null;
        }
    }
    async function appendToWorldInfoMentalLog(contentText) {
        try {
            const fileId = await findHealthWorldFile();
            if (!fileId) {
                debugLog('写入世界书: 未找到世界书文件，跳过写入');
                return;
            }
            const moduleWI = await import('/scripts/world-info.js');
            const worldInfo = await moduleWI.loadWorldInfo(fileId);
            const entries = worldInfo.entries || {};
            debugLog('loadWorldInfo entries count:', Object.keys(entries).length);
            
            let targetUID = null;
            for (const id in entries) {
                const entry = entries[id];
                const comment = entry.comment || '';
                if (!entry.disable && (comment.includes('心理') || entry.title === '心理')) {
                    targetUID = entry.uid;
                    debugLog('找到心理 entry: uid=', targetUID, 'comment=', comment);
                    break;
                }
            }
            
            if (!targetUID) {
                debugLog('未找到心理 entry（未创建），写入被跳过。');
                return;
            }
            
            const recLine = `${new Date().toLocaleString()}：${contentText}`;
            const existing = entries[targetUID].content || '';
            const newContent = existing + (existing ? '\n' : '') + recLine;
            
            debugLog('准备写入 world entry:', { file: fileId, uid: targetUID, newLine: recLine });
            await globalThis.SillyTavern.getContext()
                .SlashCommandParser.commands['setentryfield']
                .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
            
            debugLog('写入世界书成功:', recLine);
        } catch (e) {
            debugLog('写入世界书失败:', e.message || e);
        }
    }
    // === 新增：写入冥想条目 ===
    async function appendToWorldInfoMeditationLog(durationMinutes) {
        try {
            const fileId = await findHealthWorldFile();
            if (!fileId) return;
            
            const moduleWI = await import('/scripts/world-info.js');
            const worldInfo = await moduleWI.loadWorldInfo(fileId);
            const entries = worldInfo.entries || {};
            
            let targetUID = null;
            for (const id in entries) {
                const entry = entries[id];
                const comment = entry.comment || '';
                if (!entry.disable && (comment.includes('冥想') || entry.title === '冥想')) {
                    targetUID = entry.uid;
                    break;
                }
            }
            
            if (!targetUID) return;
            
            const recLine = `${new Date().toLocaleString()}：本次冥想 ${durationMinutes} 分钟`;
            const existing = entries[targetUID].content || '';
            const newContent = existing + (existing ? '\n' : '') + recLine;
            
            await globalThis.SillyTavern.getContext()
                .SlashCommandParser.commands['setentryfield']
                .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
            
            debugLog('冥想记录写入成功:', recLine);
        } catch (e) {
            debugLog('冥想写入失败:', e.message || e);
        }
    }
    // === 新增：写入思维链条目 ===
    async function appendToWorldInfoThoughtChain(thoughtText) {
        try {
            const fileId = await findHealthWorldFile();
            if (!fileId) return;
            
            const moduleWI = await import('/scripts/world-info.js');
            const worldInfo = await moduleWI.loadWorldInfo(fileId);
            const entries = worldInfo.entries || {};
            
            let targetUID = null;
            for (const id in entries) {
                const entry = entries[id];
                const comment = entry.comment || '';
                if (!entry.disable && (comment.includes('思维链') || entry.title === '思维链')) {
                    targetUID = entry.uid;
                    break;
                }
            }
            
            if (!targetUID) return;
            
            const recLine = `${new Date().toLocaleString()}：${thoughtText}`;
            const existing = entries[targetUID].content || '';
            const newContent = existing + (existing ? '\n' : '') + recLine;
            
            await globalThis.SillyTavern.getContext()
                .SlashCommandParser.commands['setentryfield']
                .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
            
            debugLog('思维链记录写入成功:', recLine);
        } catch (e) {
            debugLog('思维链写入失败:', e.message || e);
        }
    }
    // === 新增：写入注意力转移条目（先清空） ===
    async function setWorldInfoAttentionShift(selectedOption) {
        try {
            const fileId = await findHealthWorldFile();
            if (!fileId) return;
            
            const moduleWI = await import('/scripts/world-info.js');
            const worldInfo = await moduleWI.loadWorldInfo(fileId);
            const entries = worldInfo.entries || {};
            
            let targetUID = null;
            for (const id in entries) {
                const entry = entries[id];
                const comment = entry.comment || '';
                if (!entry.disable && (comment.includes('注意力转移') || entry.title === '注意力转移')) {
                    targetUID = entry.uid;
                    break;
                }
            }
            
            if (!targetUID) return;
            
            const newContent = `${new Date().toLocaleString()}：${selectedOption}`;
            
            await globalThis.SillyTavern.getContext()
                .SlashCommandParser.commands['setentryfield']
                .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
            
            debugLog('注意力转移记录写入成功:', newContent);
        } catch (e) {
            debugLog('注意力转移写入失败:', e.message || e);
        }
    }
    document.getElementById('ha-emotion').addEventListener('click', () => {
        const txt = prompt('记录当前情绪（例如：轻松 / 焦虑 / 愉快）：','');
        if (!txt) return;
        const now = new Date();
        ctx.extensionSettings[MODULE_NAME].mental.push({
            text: txt,
            ts: now.toISOString()
        });
        saveSettings();
        alert('情绪已记录');
        renderLog();
        appendToWorldInfoMentalLog(txt);
    });
    // === 新增：思维链识别按钮 ===
    document.getElementById('ha-thought-chain').addEventListener('click', () => {
        const txt = prompt('请输入当前的思维链：', '');
        if (!txt) return;
        appendToWorldInfoThoughtChain(txt);
        alert('思维链已记录');
    });
  // === 新增：转移注意力按钮 ===
document.getElementById('ha-attention-shift').addEventListener('click', async () => {
    try {
        const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
        if (!api.url) {
            toastr.warning('未配置独立 API');
            debugLog('注意力转移: 未配置 API');
            return;
        }

        // === 创建弹窗 ===
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 320px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 200000;
            padding: 20px;
            text-align: center;
        `;
        modal.innerHTML = `
            <div style="font-size:16px;margin-bottom:10px;">正在生成注意力转移选项...</div>
            <div class="loading-dots" style="font-size:24px;letter-spacing:3px;">⏳</div>
        `;
        document.body.appendChild(modal);

        // === API 调用 ===
        const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
        debugLog('注意力转移: 调用接口', endpoint, 'model:', api.model);

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})
            },
            body: JSON.stringify({
                model: api.model,
                messages: [
                    {
                        role: 'system',
                        content: '生成5个转移注意力的活动建议，每个建议包含活动名称、简短描述和英文图片提示词。\n转移注意力的活动不要太老套，要尽量有趣新颖具体，避免像传统心理咨询那样软绵绵小心翼翼给一些宽泛没什么错却也没什么用的建议。\n英文提示词务必使用以下方式生成:生成符合描述的若干单词短语，将其用%拼接。例如:描述是蓝天下一个女人在街上散步，对应的英文提示词就是a%woman%walking%street%blue%sky,提示词不可出现空格与其他标点符号，必须用%连接，提示词不要太长，选取最符合描述的其中一个画面即可，不要出现数字，使用。\n请严格返回 JSON 数组格式，如：[{"title":"活动","description":"说明","imagePrompt":"英文提示词"}]'
                    },
                    {
                        role: 'user',
                        content: '务必仅返回 JSON，无任何多余文本或注释。'
                    }
                ],
                max_tokens: 5000
            })
        });

        debugLog('注意力转移: HTTP 状态', res.status);
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        let responseText = data.choices?.[0]?.message?.content || '';
        debugLog(`注意力转移: 返回完整内容 (${responseText.length} 字符)`, responseText);

        // === 🧹 清理 Markdown 包裹的 JSON ===
        responseText = responseText
            .replace(/^```(?:json)?/i, '')  // 移除开头的 ``` 或 ```json
            .replace(/```$/, '')            // 移除结尾的 ```
            .trim();

        // === 解析 JSON，带多层容错 ===
        let options;
        try {
            options = JSON.parse(responseText);
            if (typeof options === 'string') {
                options = JSON.parse(options); // 若模型返回二次嵌套字符串
            }
            if (!Array.isArray(options)) throw new Error('不是数组格式');
        } catch (e) {
            debugLog('注意力转移: JSON 解析失败，使用默认值', e.message);
            toastr.warning('API 返回格式异常，使用默认选项');
            options = [
                { title: "散步", description: "到户外散步15分钟，呼吸新鲜空气", imagePrompt: "peaceful walking in nature" },
                { title: "听音乐", description: "听一些舒缓的音乐放松心情", imagePrompt: "relaxing with headphones music" },
                { title: "绘画", description: "随意画画，表达内心感受", imagePrompt: "person painting artwork" },
                { title: "深呼吸", description: "做5分钟深呼吸练习", imagePrompt: "meditation deep breathing" },
                { title: "整理房间", description: "整理一小块区域，获得成就感", imagePrompt: "organizing clean room" }
            ];
        }

        // === 为每个选项生成图片 URL ===
        options = options.map(opt => ({
            ...opt,
            imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(opt.imagePrompt)}`
        }));

        // === UI更新函数 ===
        let currentIndex = 0;
        function updateModal() {
            const current = options[currentIndex];
            modal.innerHTML = `
                <div>
                    <img src="${current.imageUrl}" style="width:100%;height:200px;object-fit:cover;border-radius:8px;margin-bottom:15px;">
                    <h3 style="margin:10px 0">${current.title}</h3>
                    <p style="margin:10px 0;color:#666">${current.description}</p>
                    <div style="margin-top:20px">
                        <button id="modal-prev" class="ha-btn" style="margin-right:10px">←</button>
                        <button id="modal-adopt" class="ha-btn" style="margin-right:10px">采纳</button>
                        <button id="modal-next" class="ha-btn" style="margin-right:10px">→</button>
                        <button id="modal-close" class="ha-btn">关闭</button>
                    </div>
                </div>
            `;

            modal.querySelector('#modal-prev').addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + options.length) % options.length;
                updateModal();
            });
            modal.querySelector('#modal-next').addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % options.length;
                updateModal();
            });
            modal.querySelector('#modal-adopt').addEventListener('click', () => {
                const selected = options[currentIndex];
                setWorldInfoAttentionShift(`${selected.title}：${selected.description}`);
                toastr.success('已采纳注意力转移方案');
                document.body.removeChild(modal);
            });
            modal.querySelector('#modal-close').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        }

        updateModal();

    } catch (e) {
        debugLog('注意力转移生成失败:', e.message || e);
        toastr.error('生成失败：' + (e.message || e));
    }
});
    // === 冥想开始 ===
    btnStart.addEventListener('click', async () => {
        const mins = Number(slider.value);
        targetDuration = mins;
        startTime = new Date();
        timerEl.innerText = ''; // 清空计时显示
        btnStart.style.display = 'none';
        btnStop.style.display = 'inline-block';
        // 启动计时器
        if (timerId) clearInterval(timerId);
        timerId = setInterval(() => {
            const elapsedSec = Math.floor((Date.now() - startTime.getTime()) / 1000);
            if (mins === 0) {
                timerEl.innerText = `已进行 ${Math.floor(elapsedSec / 60)}分${elapsedSec % 60}秒`;
            } else {
                const totalSec = mins * 60;
                const remain = totalSec - elapsedSec;
                if (remain >= 0) {
                    timerEl.innerText = `剩余 ${Math.floor(remain / 60)}分${remain % 60}秒`;
                } else {
                    stopMeditation();
                }
            }
        }, 1000);
        // 保持原有 API 调用逻辑
        try {
            const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
            if (!api.url) {
                subPanel.innerText = '未配置独立 API，示例提示：深呼吸、放松身体、正念冥想。';
                debugLog('正念指导: 未配置 API');
                return;
            }
            
            const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
            debugLog('正念指导调用: 请求将发送到', endpoint, 'model:', api.model);
            
            const history = ctx.extensionSettings[MODULE_NAME].mental.map(m => 
                `${m.ts}：${m.text}`
            ).join('\n');
            
            const promptText = mins === 0 
                ? `请根据以下用户情绪记录，立即给出一段简短正念指导和放松提示：\n${history || '无记录'}`
                : `请提供一段正念冥想指导，时长约 ${mins} 分钟，根据用户历史情绪记录：\n${history || '无记录'}`;
            
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})
                },
                body: JSON.stringify({
                    model: api.model,
                    messages: [
                        { role: 'system', content: '你是心理健康指导专家，为用户提供正念冥想与情绪缓解建议。' },
                        { role: 'user', content: promptText }
                    ],
                    max_tokens: 5000
                })
            });
            
            debugLog('正念指导调用: HTTP 状态', res.status);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
            subPanel.innerText = text;
            subPanel.scrollTop = subPanel.scrollHeight;
            
            debugLog('正念指导调用: 返回摘录', text.slice(0, 200));
        } catch (e) {
            subPanel.innerText = 'API 请求失败：' + (e.message || e);
            subPanel.scrollTop = subPanel.scrollHeight;
            debugLog('正念指导调用失败:', e.message || e);
        }
    });
    // === 冥想结束 ===
    function stopMeditation() {
        if (!startTime) return;
        const duration = Math.floor((Date.now() - startTime.getTime()) / 60000); // 实际分钟数
        clearInterval(timerId);
        timerId = null;
        btnStart.style.display = 'inline-block';
        btnStop.style.display = 'none';
        timerEl.innerText = `本次冥想结束，共进行 ${duration} 分钟`;
        appendToWorldInfoMeditationLog(duration);
        startTime = null;
    }
    btnStop.addEventListener('click', stopMeditation);
    function renderLog() {
        const arr = ctx.extensionSettings[MODULE_NAME].mental || [];
        logEl.innerText = `已记录 ${arr.length} 条情绪记录（存储在扩展设置与世界书中）`;
    }
    renderLog();
}

      async function showExercise() {
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">适度运动</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-exercise-log" class="ha-btn" style="flex:1">运动打卡</button>
      <button id="ha-exercise-analysis" class="ha-btn" style="flex:1">运动分析（API）</button>
    </div>
    <div id="ha-exercise-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
    </div>
    <div id="ha-exercise-list" class="ha-small"></div>
    <div id="ha-exercise-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>
  `;

  const listEl = document.getElementById('ha-exercise-list');
  const debugEl = document.getElementById('ha-exercise-debug');
  const subPanel = document.getElementById('ha-exercise-subpanel');

  function debugLog(...args) {
    const ts = new Date().toLocaleTimeString();
    const msg = `[${ts}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    debugEl.innerText += msg + "\n";
    debugEl.scrollTop = debugEl.scrollHeight;
    console.log('[健康生活助手]', ...args);
  }

  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      debugLog('selected_world_info:', selected);
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          debugLog('匹配到世界书文件:', WI);
          return WI;
        }
      }
      debugLog('未找到名为 "健康生活助手" 的世界书文件');
      return null;
    } catch (e) {
      debugLog('findHealthWorldFile 异常:', e.message || e);
      return null;
    }
  }

  async function appendToWorldInfoExerciseLog(contentText) {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) { debugLog('写入世界书: 未找到世界书文件，跳过写入'); return; }

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      debugLog('loadWorldInfo entries count:', Object.keys(entries).length);

      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('运动') || entry.title === '运动')) {
          targetUID = entry.uid;
          debugLog('找到运动 entry: uid=', targetUID, 'comment=', comment);
          break;
        }
      }

      if (!targetUID) {
        debugLog('未找到运动 entry（未创建），写入被跳过。');
        return;
      }

      const recLine = `${new Date().toLocaleString()}：${contentText}`;
      const existing = entries[targetUID].content || '';
      const newContent = existing + (existing ? '\n' : '') + recLine;

      debugLog('准备写入 world entry:', { file: fileId, uid: targetUID, newLine: recLine });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);

      debugLog('写入世界书成功:', recLine);
    } catch (e) {
      debugLog('写入世界书失败:', e.message || e);
    }
  }

  function recordExercise() {
    const txt = prompt('记录运动（例如：跑步 30 分钟 / 徒步 5km）：','');
    if (!txt) return;
    const now = new Date();
    ctx.extensionSettings[MODULE_NAME].exercise.push({ text: txt, ts: now.toISOString() });
    saveSettings();
    alert('运动已记录');
    renderList();
    appendToWorldInfoExerciseLog(txt);
  }

  document.getElementById('ha-exercise-log').addEventListener('click', recordExercise);

  document.getElementById('ha-exercise-analysis').addEventListener('click', async () => {
    subPanel.innerText = '正在分析运动数据...';
    subPanel.scrollTop = subPanel.scrollHeight;

    try {
      const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
      if (!api.url) {
        subPanel.innerText = '未配置独立 API，示例提示：保持每周适度运动，注意热身与拉伸。';
        debugLog('运动分析: 未配置 API');
        return;
      }

      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
      debugLog('运动分析调用: 请求将发送到', endpoint, 'model:', api.model);

      const history = ctx.extensionSettings[MODULE_NAME].exercise.map(e => `${e.ts}：${e.text}`).join('\n');
      const promptText = history || '用户未提供运动记录';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})
        },
        body: JSON.stringify({
          model: api.model,
          messages: [
            { role: 'system', content: '你是健康运动顾问，请根据用户运动记录分析运动情况并给出科学建议。' },
            { role: 'user', content: promptText }
          ],
          max_tokens: 5000
        })
      });

      debugLog('运动分析调用: HTTP 状态', res.status);
      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
      subPanel.innerText = text;
      subPanel.scrollTop = subPanel.scrollHeight;
      debugLog('运动分析调用: 返回摘录', text.slice(0, 200));
    } catch (e) {
      subPanel.innerText = 'API 请求失败：' + (e.message || e);
      subPanel.scrollTop = subPanel.scrollHeight;
      debugLog('运动分析调用失败:', e.message || e);
    }
  });

  function renderList() {
    const arr = ctx.extensionSettings[MODULE_NAME].exercise || [];
    listEl.innerText = `已记录 ${arr.length} 条运动日志（存储在扩展设置与世界书中）`;
  }

  renderList();
}
async function showFinance() {
  const container = content;
  container.style.display = 'block';
  container.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">收支平衡</div>

    <!-- 收入标签 -->
    <div style="margin-bottom:6px;">
      <div><b>收入标签</b></div>
      <div style="display:flex;gap:6px;margin-top:4px;">
        <input id="ha-income-input" placeholder="输入新收入标签" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;">
        <button id="ha-income-add" class="ha-btn" style="width:50px;">➕</button>
        <button id="ha-income-del" class="ha-btn" style="width:50px;">🗑️</button>
      </div>
      <div id="ha-income-tags" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;"></div>
    </div>

    <!-- 支出标签 -->
    <div style="margin-bottom:6px;">
      <div><b>支出标签</b></div>
      <div style="display:flex;gap:6px;margin-top:4px;">
        <input id="ha-expense-input" placeholder="输入新支出标签" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;">
        <button id="ha-expense-add" class="ha-btn" style="width:50px;">➕</button>
        <button id="ha-expense-del" class="ha-btn" style="width:50px;">🗑️</button>
      </div>
      <div id="ha-expense-tags" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;"></div>
    </div>

    <!-- 汇总 -->
    <div id="ha-finance-summary" style="margin:10px 0;padding:6px;border:1px solid #ddd;background:#f9f9f9;">
      <div>当月总收入：<span id="ha-total-income">0</span> 元</div>
      <div>当月总支出：<span id="ha-total-expense">0</span> 元</div>
      <div><b>当月结余：</b><span id="ha-total-balance">0</span> 元</div>
    </div>

    <!-- 功能按钮 -->
    <div style="display:flex;gap:8px;margin-bottom:6px;">
      <button id="ha-income-analysis" class="ha-btn" style="flex:1;">收入分析</button>
      <button id="ha-expense-analysis" class="ha-btn" style="flex:1;">支出分析</button>
      <button id="ha-detail" class="ha-btn" style="flex:1;">收支明细</button>
    </div>

    <!-- 输出区 -->
    <div id="ha-finance-result" style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#fafafa;white-space:pre-wrap;min-height:60px;max-height:300px;overflow:auto;"></div>
  `;

  const state = ctx.extensionSettings[MODULE_NAME];
  if (!state.finance) {
    state.finance = { incomeTags: [], expenseTags: [], records: [] };
    saveSettings();
  }

  const { finance } = state;
  const now = new Date();
  const ym = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');

  const incomeEl = document.getElementById('ha-income-tags');
  const expenseEl = document.getElementById('ha-expense-tags');
  const totalIncomeEl = document.getElementById('ha-total-income');
  const totalExpenseEl = document.getElementById('ha-total-expense');
  const balanceEl = document.getElementById('ha-total-balance');
  const resultEl = document.getElementById('ha-finance-result');
  let delMode = { income: false, expense: false };

  // 🔍 查找世界书文件
  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) return WI;
      }
      toastr.warning('未找到 “健康生活助手” 世界书');
      return null;
    } catch (e) {
      toastr.error('查找世界书异常: ' + e.message);
      return null;
    }
  }

  // 🧾 写入世界书
  async function appendToWorldInfoFinance() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return;

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};

      let incomeUID = null, expenseUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable) {
          if (comment.includes('收入') || entry.title === '收入') incomeUID = entry.uid;
          if (comment.includes('支出') || entry.title === '支出') expenseUID = entry.uid;
        }
      }

      if (!incomeUID && !expenseUID) {
        toastr.info('未找到 “收入/支出” 条目，请在世界书中创建。');
        return;
      }

      const all = ctx.extensionSettings[MODULE_NAME].finance.records || [];
      const incomeList = all.filter(r => r.type === 'income').map((r,i)=>
        `${i+1}. ${new Date(r.date).toLocaleString()} ${r.tag}${r.name?`(${r.name})`:''}：${r.value}元`
      );
      const expenseList = all.filter(r => r.type === 'expense').map((r,i)=>
        `${i+1}. ${new Date(r.date).toLocaleString()} ${r.tag}${r.name?`(${r.name})`:''}：${r.value}元`
      );

      const ctxObj = globalThis.SillyTavern.getContext();
      const setField = ctxObj.SlashCommandParser.commands['setentryfield'].callback;

      if (incomeUID)
        await setField({file:fileId, uid:incomeUID, field:'content'}, incomeList.join('\n'));
      if (expenseUID)
        await setField({file:fileId, uid:expenseUID, field:'content'}, expenseList.join('\n'));

      toastr.success('世界书已同步 ✅');
    } catch (e) {
      toastr.error('写入世界书失败：' + e.message);
    }
  }

  // 标签渲染与点击
  function renderTags() {
    function render(el, list, type) {
      el.innerHTML = '';
      list.forEach(tag => {
        const btn = document.createElement('div');
        btn.textContent = tag;
        btn.style.cssText = 'padding:4px 8px;border:1px solid #aaa;border-radius:6px;cursor:pointer;background:#fff;';
        btn.addEventListener('click', async () => {
          if (delMode[type]) {
            const idx = list.indexOf(tag);
            if (idx >= 0) list.splice(idx, 1);
            saveSettings();
            renderTags();
            toastr.info(`已删除${type === 'income' ? '收入' : '支出'}标签`);
          } else {
            const name = prompt('输入名称（可留空）', '');
            const value = prompt('输入金额（元）', '');
            if (!value || isNaN(parseFloat(value))) return toastr.warning('金额无效');
            const rec = { type, tag, name: name || '', value: parseFloat(value), date: new Date().toISOString() };
            finance.records.push(rec);
            saveSettings();
            await appendToWorldInfoFinance();
            updateSummary();
            toastr.success(`${type === 'income' ? '收入' : '支出'}记录已添加`);
          }
        });
        el.appendChild(btn);
      });
    }
    render(incomeEl, finance.incomeTags, 'income');
    render(expenseEl, finance.expenseTags, 'expense');
  }

  function updateSummary() {
    const monthRecords = finance.records.filter(r => r.date.startsWith(ym));
    const totalIncome = monthRecords.filter(r => r.type === 'income').reduce((a, b) => a + b.value, 0);
    const totalExpense = monthRecords.filter(r => r.type === 'expense').reduce((a, b) => a + b.value, 0);
    totalIncomeEl.textContent = totalIncome.toFixed(2);
    totalExpenseEl.textContent = totalExpense.toFixed(2);
    balanceEl.textContent = (totalIncome - totalExpense).toFixed(2);
  }

  // 标签添加/删除
  document.getElementById('ha-income-add').addEventListener('click', () => {
    const v = document.getElementById('ha-income-input').value.trim();
    if (v && !finance.incomeTags.includes(v)) {
      finance.incomeTags.push(v);
      saveSettings();
      renderTags();
      toastr.success('已添加收入标签');
    }
  });
  document.getElementById('ha-expense-add').addEventListener('click', () => {
    const v = document.getElementById('ha-expense-input').value.trim();
    if (v && !finance.expenseTags.includes(v)) {
      finance.expenseTags.push(v);
      saveSettings();
      renderTags();
      toastr.success('已添加支出标签');
    }
  });
  document.getElementById('ha-income-del').addEventListener('click', e => {
    delMode.income = !delMode.income;
    e.target.style.background = delMode.income ? '#f88' : '';
    toastr.info(delMode.income ? '收入删除模式开启' : '收入删除模式关闭');
  });
  document.getElementById('ha-expense-del').addEventListener('click', e => {
    delMode.expense = !delMode.expense;
    e.target.style.background = delMode.expense ? '#f88' : '';
    toastr.info(delMode.expense ? '支出删除模式开启' : '支出删除模式关闭');
  });

  // 分析
  document.getElementById('ha-income-analysis').addEventListener('click', () => {
    const monthRecords = finance.records.filter(r => r.type === 'income' && r.date.startsWith(ym));
    const byTag = {};
    monthRecords.forEach(r => (byTag[r.tag] = (byTag[r.tag] || 0) + r.value));
    const sorted = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
    resultEl.innerText = '当月收入分析：\n' + sorted.map(([t, v]) => `${t}: ${v.toFixed(2)}元`).join('\n');
  });
  document.getElementById('ha-expense-analysis').addEventListener('click', () => {
    const monthRecords = finance.records.filter(r => r.type === 'expense' && r.date.startsWith(ym));
    const byTag = {};
    monthRecords.forEach(r => (byTag[r.tag] = (byTag[r.tag] || 0) + r.value));
    const sorted = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
    resultEl.innerText = '当月支出分析：\n' + sorted.map(([t, v]) => `${t}: ${v.toFixed(2)}元`).join('\n');
  });

  // 收支明细
  document.getElementById('ha-detail').addEventListener('click', () => {
    const sorted = [...finance.records].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sorted.length === 0) {
      resultEl.innerText = '暂无收支记录。';
      return;
    }
    resultEl.innerHTML = '';
    sorted.forEach((r, idx) => {
      const div = document.createElement('div');
      div.style.cssText = 'border-bottom:1px solid #ddd;padding:4px 0;display:flex;justify-content:space-between;align-items:center;';
      const text = document.createElement('span');
      text.textContent = `${new Date(r.date).toLocaleString()} [${r.type === 'income' ? '收入' : '支出'}] ${r.tag}${r.name ? `(${r.name})` : ''}：${r.value}元`;
      const tools = document.createElement('div');
      const edit = document.createElement('button');
      edit.textContent = '✏️';
      edit.style.cssText = 'margin-right:6px;cursor:pointer;';
      const del = document.createElement('button');
      del.textContent = '🗑️';
      del.style.cssText = 'cursor:pointer;';
      edit.addEventListener('click', async () => {
        const newName = prompt('修改名称（可留空）', r.name);
        const newVal = prompt('修改金额（元）', r.value);
        if (!newVal || isNaN(parseFloat(newVal))) return toastr.warning('金额无效');
        r.name = newName || '';
        r.value = parseFloat(newVal);
        saveSettings();
        await appendToWorldInfoFinance();
        updateSummary();
        toastr.success('记录已更新');
        document.getElementById('ha-detail').click();
      });
      del.addEventListener('click', async () => {
        if (!confirm('确认删除该记录？')) return;
        finance.records.splice(idx, 1);
        saveSettings();
        await appendToWorldInfoFinance();
        updateSummary();
        toastr.info('记录已删除');
        document.getElementById('ha-detail').click();
      });
      tools.append(edit, del);
      div.append(text, tools);
      resultEl.appendChild(div);
    });
  });

  renderTags();
  updateSummary();
}

     async function showWishes() {
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">心愿清单</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-wish-add" class="ha-btn" style="flex:1">记录心愿</button>
    </div>
    <div id="ha-wish-list" class="ha-small" style="margin-bottom:6px"></div>
    <div id="ha-wish-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
    </div>
  `;
  const listEl = document.getElementById('ha-wish-list');
  const subPanel = document.getElementById('ha-wish-subpanel');
  function debugLog(...args) {
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    toastr.info(msg, '健康生活助手');
    console.log('[健康生活助手]', ...args);
  }
  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          return WI;
        }
      }
      return null;
    } catch (e) {
      debugLog('findHealthWorldFile 异常:', e.message || e);
      return null;
    }
  }
  async function appendToWorldInfoWishLog() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) { debugLog('写入世界书: 未找到世界书文件，跳过写入'); return; }
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('心愿') || entry.title === '心愿')) {
          targetUID = entry.uid;
          break;
        }
      }
      if (!targetUID) {
        debugLog('未找到心愿 entry（未创建），写入被跳过。');
        return;
      }
      // 格式化心愿内容
      const arr = ctx.extensionSettings[MODULE_NAME].wishes.map((w,i)=>{
        return `${i+1}. [${w.done?'完成':'未完成'}] ${w.text}`;
      });
      const newContent = arr.join('\n');
      debugLog('写入世界书:', { file: fileId, uid: targetUID, 行数: arr.length });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
    } catch (e) {
      debugLog('写入世界书失败:', e.message || e);
    }
  }
  function render() {
    const arr = ctx.extensionSettings[MODULE_NAME].wishes || [];
    listEl.innerHTML = '';
    if (!arr.length) {
      listEl.innerText = '暂无心愿';
      return;
    }
    arr.forEach((w,i)=>{
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.marginBottom = '4px';
      const textSpan = document.createElement('span');
      textSpan.innerText = `${i+1}. [${w.done?'完成':'未完成'}] ${w.text}`;
      textSpan.style.flex = '1';
      div.appendChild(textSpan);
      const btnDone = document.createElement('button');
      btnDone.innerText = '完成';
      btnDone.className = 'ha-btn';
      btnDone.style.marginLeft = '4px';
      btnDone.addEventListener('click', ()=>{
        arr[i].done = true;
        saveSettings();
        render();
        appendToWorldInfoWishLog();
      });
      div.appendChild(btnDone);
      const btnEdit = document.createElement('button');
      btnEdit.innerText = '编辑';
      btnEdit.className = 'ha-btn';
      btnEdit.style.marginLeft = '4px';
      btnEdit.addEventListener('click', ()=>{
        const newText = prompt('编辑心愿内容', arr[i].text);
        if (newText===null) return;
        if (newText==='') arr.splice(i,1);
        else arr[i].text = newText;
        saveSettings();
        render();
        appendToWorldInfoWishLog();
      });
      div.appendChild(btnEdit);
      const btnDel = document.createElement('button');
      btnDel.innerText = '删除';
      btnDel.className = 'ha-btn';
      btnDel.style.marginLeft = '4px';
      btnDel.addEventListener('click', ()=>{
        if (!confirm('确认删除该心愿？')) return;
        arr.splice(i,1);
        saveSettings();
        render();
        appendToWorldInfoWishLog();
      });
      div.appendChild(btnDel);
      listEl.appendChild(div);
    });
  }
  document.getElementById('ha-wish-add').addEventListener('click', ()=>{
    const txt = prompt('输入心愿：','');
    if (!txt) return;
    if (!ctx.extensionSettings[MODULE_NAME].wishes) ctx.extensionSettings[MODULE_NAME].wishes=[];
    ctx.extensionSettings[MODULE_NAME].wishes.push({text: txt, done:false});
    saveSettings();
    render();
    appendToWorldInfoWishLog();
  });
  render();
}

     async function showSocial() {
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">习惯</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-social-config" class="ha-btn" style="flex:1">配置新习惯</button>
    </div>
    <div id="ha-social-list" class="ha-small" style="margin-bottom:6px"></div>
    <div id="ha-social-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
    </div>
  `;
  const listEl = document.getElementById('ha-social-list');
  const subPanel = document.getElementById('ha-social-subpanel');
  function debugLog(...args) {
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    toastr.info(msg, '健康生活助手');
    console.log('[健康生活助手]', ...args);
  }
  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          return WI;
        }
      }
      return null;
    } catch (e) {
      debugLog('findHealthWorldFile 异常:', e.message || e);
      return null;
    }
  }
  async function appendToWorldInfoHabitLog() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) { debugLog('写入世界书: 未找到世界书文件，跳过写入'); return; }
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('习惯') || entry.title === '习惯')) {
          targetUID = entry.uid;
          break;
        }
      }
      if (!targetUID) {
        debugLog('未找到习惯 entry（未创建），写入被跳过。');
        return;
      }
      const arr = Object.values(ctx.extensionSettings[MODULE_NAME].social || {}).map((h, idx) => {
        return `${idx+1}. ${h.name} [${h.frequency}] 标签:${h.tag} 已打卡:${(h.logs||[]).length}次`;
      });
      const newContent = arr.join('\n');
      debugLog('写入世界书:', { file: fileId, uid: targetUID, 行数: arr.length });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
    } catch (e) {
      debugLog('写入世界书失败:', e.message || e);
    }
  }
  function render() {
    const s = ctx.extensionSettings[MODULE_NAME].social || {};
    listEl.innerHTML = '';
    const keys = Object.keys(s);
    if (!keys.length) {
      listEl.innerText = '无已配置习惯';
      return;
    }
    keys.forEach((k, idx)=>{
      const habit = s[k];
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.marginBottom = '4px';
      const textSpan = document.createElement('span');
      textSpan.innerText = `${idx+1}. ${habit.name} [${habit.frequency}] 标签:${habit.tag} 已打卡:${(habit.logs||[]).length}次`;
      textSpan.style.flex = '1';
      div.appendChild(textSpan);
      const btnCheckin = document.createElement('button');
      btnCheckin.innerText = '打卡';
      btnCheckin.className = 'ha-btn';
      btnCheckin.style.marginLeft = '4px';
      btnCheckin.addEventListener('click', ()=>{
        habit.logs = habit.logs || [];
        habit.logs.push({ ts: new Date().toISOString() });
        saveSettings();
        render();
        appendToWorldInfoHabitLog();
      });
      div.appendChild(btnCheckin);
      const btnEdit = document.createElement('button');
      btnEdit.innerText = '编辑';
      btnEdit.className = 'ha-btn';
      btnEdit.style.marginLeft = '4px';
      btnEdit.addEventListener('click', ()=>{
        const name = prompt('编辑习惯名称', habit.name);
        if (name===null) return;
        const freq = prompt('编辑习惯频率（如每天1次）', habit.frequency);
        if (freq===null) return;
        const tag = prompt('编辑标签', habit.tag);
        if (tag===null) return;
        habit.name = name; habit.frequency=freq; habit.tag=tag;
        saveSettings();
        render();
        appendToWorldInfoHabitLog();
      });
      div.appendChild(btnEdit);
      const btnDel = document.createElement('button');
      btnDel.innerText = '删除';
      btnDel.className = 'ha-btn';
      btnDel.style.marginLeft = '4px';
      btnDel.addEventListener('click', ()=>{
        if (!confirm('确认删除该习惯？')) return;
        delete s[k];
        saveSettings();
        render();
        appendToWorldInfoHabitLog();
      });
      div.appendChild(btnDel);
      listEl.appendChild(div);
    });
  }
  document.getElementById('ha-social-config').addEventListener('click', ()=>{
    const name = prompt('输入习惯名称','');
    if (!name) return;
    const freq = prompt('输入频率（如每天1次，每周2次）','每天1次');
    const tag = prompt('输入标签','');
    if (!ctx.extensionSettings[MODULE_NAME].social) ctx.extensionSettings[MODULE_NAME].social={};
    const id = 'habit_' + Date.now();
    ctx.extensionSettings[MODULE_NAME].social[id] = { name, frequency: freq, tag, logs: [] };
    saveSettings();
    render();
    appendToWorldInfoHabitLog();
  });
  render();
}

async function showTodo() {
  try { 
    const cs = window.getComputedStyle(content);
    if (cs.position === 'static' || !cs.position) content.style.position = 'relative';
  } catch (e) {}
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">待办事项</div>
    <div style="margin-bottom:6px;">
      <button id="ha-todo-sort-date" class="ha-btn" style="margin-right:4px">按ddl排序</button>
      <button id="ha-todo-sort-priority" class="ha-btn">按优先级排序</button>
      <button id="ha-todo-calendar" class="ha-btn" style="margin-left:4px">日历</button>
      <button id="ha-todo-add-btn" class="ha-btn" style="margin-left:8px">添加待办</button>
    </div>
    <div id="ha-todo-list" class="ha-small" style="margin-bottom:6px;"></div>
    <div id="ha-todo-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
      <div style="font-size:11px;color:#666;">📡 Service Worker 状态: <span id="sw-status">检查中...</span></div>
    </div>
  `;
  const listEl = document.getElementById('ha-todo-list');
  const debugEl = document.getElementById('ha-todo-subpanel');
  const swStatusEl = document.getElementById('sw-status');
  const btnCalendar = document.getElementById('ha-todo-calendar');
  // Service Worker 控制器
  let swRegistration = null;
  let swReady = false;
  function debugLog(...args) {
    const ts = new Date().toLocaleTimeString();
    const msg = `[${ts}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (debugEl) {
      debugEl.innerHTML += `<div style="font-size:11px;color:#333;">${msg}</div>`;
      debugEl.scrollTop = debugEl.scrollHeight;
    }
    console.log('[健康生活助手]', ...args);
  }
  // 初始化 Service Worker
  async function initServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) {
        swStatusEl.textContent = '不支持 ❌';
        swStatusEl.style.color = 'red';
        debugLog('浏览器不支持 Service Worker');
        return false;
      }
      // 注册 Service Worker
      swRegistration = await navigator.serviceWorker.register('https://mathslmy.github.io/healthy-life-helper//hlh-todo-sw.js', {
        scope: '/'
      });
      debugLog('Service Worker 注册成功');
      // 等待 Service Worker 就绪
      await navigator.serviceWorker.ready;
      swReady = true;
      swStatusEl.textContent = '已激活 ✅';
      swStatusEl.style.color = 'green';
      debugLog('Service Worker 已就绪');
      // 请求通知权限
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        debugLog('通知权限:', permission);
      }
      // 监听 SW 消息
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      return true;
    } catch (error) {
      swStatusEl.textContent = '初始化失败 ❌';
      swStatusEl.style.color = 'red';
      debugLog('Service Worker 初始化失败:', error.message);
      return false;
    }
  }
  // 处理 SW 消息
  function handleSWMessage(event) {
    const { type, data } = event.data;
    
    debugLog('收到 SW 消息:', type, data);
    
    switch (type) {
      case 'NOTIFICATION_FIRED':
        // 通知已触发，更新 UI
        const todo = todos.find(t => t.id === data.todoId);
        if (todo) {
          todo.notifyScheduled = false;
          saveSettings();
          render();
        }
        if (typeof toastr !== 'undefined') {
          toastr.warning(`任务截止: ${data.todoName}`, '⏰ 待办提醒', { timeOut: 10000 });
        }
        break;
        
      case 'SHOW_TODO':
        // 从通知点击打开，定位到该待办
        debugLog('显示待办:', data.todoId);
        break;
    }
  }
  // 发送消息到 SW
  async function sendToSW(type, data) {
    if (!swReady || !navigator.serviceWorker.controller) {
      debugLog('Service Worker 未就绪');
      return { success: false, error: 'SW not ready' };
    }
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      navigator.serviceWorker.controller.postMessage(
        { type, data },
        [messageChannel.port2]
      );
      // 超时处理
      setTimeout(() => resolve({ success: false, error: 'timeout' }), 5000);
    });
  }
  if (!ctx.extensionSettings[MODULE_NAME].todo) ctx.extensionSettings[MODULE_NAME].todo = [];
  let todos = ctx.extensionSettings[MODULE_NAME].todo;
  // 确保每个待办都有 notifyScheduled 属性
  todos.forEach(t => {
    if (t.notifyScheduled === undefined) t.notifyScheduled = false;
    if (!t.id) t.id = 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  });
  // 调度通知到 SW
  async function scheduleNotification(todo) {
    if (!swReady) {
      if (typeof toastr !== 'undefined') {
        toastr.error('Service Worker 未就绪');
      }
      return false;
    }
    if (!todo.due) {
      if (typeof toastr !== 'undefined') {
        toastr.info('该待办无截止时间');
      }
      return false;
    }
    let dueDateTime;
    if (todo.due.includes('T')) {
      dueDateTime = new Date(todo.due);
    } else {
      dueDateTime = new Date(todo.due + 'T08:00:00');
    }
    const now = new Date();
    const delay = dueDateTime.getTime() - now.getTime();
    if (delay <= 0) {
      if (typeof toastr !== 'undefined') {
        toastr.warning('截止时间已过');
      }
      return false;
    }
    // 发送到 SW
    const result = await sendToSW('SCHEDULE_NOTIFICATION', {
      id: todo.id,
      name: todo.name,
      due: todo.due,
      priority: todo.priority,
      tag: todo.tag
    });
    if (result.success) {
      const dateStr = dueDateTime.toLocaleString('zh-CN');
      if (typeof toastr !== 'undefined') {
        toastr.success(`已预约通知: ${dateStr}`, '🎯 通知已设置');
      }
      debugLog('通知已调度:', todo.name, dateStr);
      return true;
    } else {
      if (typeof toastr !== 'undefined') {
        toastr.error('通知预约失败');
      }
      debugLog('通知调度失败:', result.error);
      return false;
    }
  }
  // 取消通知
  async function cancelNotification(todo) {
    if (!swReady) return;
    const result = await sendToSW('CANCEL_NOTIFICATION', {
      todoId: todo.id
    });
    if (result.success) {
      if (typeof toastr !== 'undefined') {
        toastr.info('已取消通知预约');
      }
      debugLog('通知已取消:', todo.name);
    }
  }
  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) return WI;
      }
      return null;
    } catch { return null; }
  }
  async function appendToWorldInfoTodoLog() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return;
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('待办') || entry.title === '待办')) {
          targetUID = entry.uid;
          break;
        }
      }
      if (!targetUID) return;
      const arr = todos.map((t,i)=>{
        const due = t.due ? `截止:${t.due}` : '';
        const status = t.done ? '完成' : (t.due && new Date() > new Date(t.due) ? '过期' : '进行中');
        const notify = t.notifyScheduled ? '[🎯已预约]' : '';
        return `${i+1}. [${status}] ${t.name} 优先:${t.priority} 标签:${t.tag} ${due} ${notify}`;
      });
      const newContent = arr.join('\n');
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
    } catch (e) {
      debugLog('写入世界书失败:', e.message || e);
    }
  }
  function render(sortMode='date') {
    let arr = [...todos];
    if (sortMode === 'date') {
      arr.sort((a,b)=>{
        const da = a.due ? new Date(a.due) : new Date(0);
        const db = b.due ? new Date(b.due) : new Date(0);
        return da - db;
      });
    } else if (sortMode === 'priority') {
      arr.sort((a,b)=>b.priority-a.priority);
    }
    listEl.innerHTML = '';
    arr.forEach((t,i)=>{
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.marginBottom = '4px';
      const status = t.done ? '完成' : (t.due && new Date() > new Date(t.due) ? '过期' : '进行中');
      const dueText = t.due ? `截止:${t.due}` : '';
      const focusedTime = t.focused ? `已专注:${Math.floor(t.focused / 60)}分钟` : '';
      const textSpan = document.createElement('span');
      textSpan.style.flex = '1';
      textSpan.style.wordBreak = 'break-word';
      textSpan.innerText = `${i+1}. [${status}] ${t.name} 优先:${t.priority} 标签:${t.tag} ${dueText} ${focusedTime}`;
      div.appendChild(textSpan);
      // 🎯 通知按钮
      const btnNotify = document.createElement('button');
      btnNotify.innerText = '🎯';
      btnNotify.className = 'ha-btn';
      btnNotify.style.marginLeft = '4px';
      btnNotify.style.backgroundColor = t.notifyScheduled ? '#FFD700' : '#fff';
      btnNotify.style.border = '1px solid ' + (t.notifyScheduled ? '#FFD700' : '#ccc');
      btnNotify.onclick = async () => {
        if (t.notifyScheduled) {
          // 取消通知
          t.notifyScheduled = false;
          await cancelNotification(t);
        } else {
          // 预约通知
          const success = await scheduleNotification(t);
          if (success) {
            t.notifyScheduled = true;
          }
        }
        saveSettings();
        render(sortMode);
        appendToWorldInfoTodoLog();
      };
      div.appendChild(btnNotify);
      const btnDone = document.createElement('button');
      btnDone.innerText = '完成';
      btnDone.className = 'ha-btn';
      btnDone.style.marginLeft = '4px';
      btnDone.onclick = async ()=>{
        t.done=true;
        if (t.notifyScheduled) {
          await cancelNotification(t);
          t.notifyScheduled = false;
        }
        saveSettings();
        render(sortMode);
        appendToWorldInfoTodoLog();
      };
      div.appendChild(btnDone);
      const btnEdit = document.createElement('button');
      btnEdit.innerText = '编辑';
      btnEdit.className = 'ha-btn';
      btnEdit.style.marginLeft = '4px';
      btnEdit.onclick = ()=>openTodoDialog(t,sortMode);
      div.appendChild(btnEdit);
      const btnDel = document.createElement('button');
      btnDel.innerText = '删除';
      btnDel.className = 'ha-btn';
      btnDel.style.marginLeft = '4px';
      btnDel.onclick = async ()=>{
        if (!confirm('确认删除该待办?')) return;
        if (t.notifyScheduled) {
          await cancelNotification(t);
        }
        todos.splice(todos.indexOf(t),1);
        saveSettings();
        render(sortMode);
        appendToWorldInfoTodoLog();
      };
      div.appendChild(btnDel);
      listEl.appendChild(div);
    });
    
    appendToWorldInfoTodoLog();
  }
  function openTodoDialog(t,sortMode) {
    const dialog = document.createElement('div');
    const isNew = !t;
    const todo = t || {name:'',due:'',priority:3,tag:''};
    const dueDate = todo.due ? (todo.due.split('T')[0]||'') : '';
    const dueTime = todo.due ? (todo.due.split('T')[1]||'') : '';
    dialog.innerHTML = `
      <div style="background:#fff;padding:8px;border-radius:6px;box-shadow:0 1px 6px rgba(0,0,0,0.12);max-width:320px;margin:auto;">
        <div style="font-weight:600;margin-bottom:0px;">${isNew?'添加':'编辑'}待办</div>
        <label style="font-size:13px">名称:</label><br>
        <input id="todo-name" type="text" style="width:100%;margin-bottom:0px;padding:0px;" value="${escapeHtml(todo.name)}"><br>
        <label style="font-size:13px">截止日期:</label><br>
        <input id="todo-date" type="date" style="width:100%;margin-bottom:0px;padding:0px;"><br>
        <label style="font-size:13px">截止时间:</label><br>
        <input id="todo-time" type="time" style="width:100%;margin-bottom:0px;padding:0px;"><br>
        <label style="font-size:13px">优先级:</label><br>
        <input id="todo-priority" type="number" min="1" max="5" value="${todo.priority}" style="width:100%;margin-bottom:0px;padding:0px;"><br>
        <label style="font-size:13px">标签:</label><br>
        <input id="todo-tag" type="text" style="width:100%;margin-bottom:0px;padding:0px;" value="${escapeHtml(todo.tag)}"><br>
        <div style="text-align:right;">
          <button id="todo-ok" class="ha-btn">确定</button>
          <button id="todo-cancel" class="ha-btn" style="margin-left:6px;">取消</button>
        </div>
      </div>`;
    Object.assign(dialog.style,{position:'absolute',top:'8px',left:'8px',right:'8px',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99999});
    content.appendChild(dialog);
    dialog.querySelector('#todo-date').value=dueDate;
    dialog.querySelector('#todo-time').value=dueTime;
    dialog.querySelector('#todo-cancel').onclick=()=>dialog.remove();
    dialog.querySelector('#todo-ok').onclick= async ()=>{
      const name=dialog.querySelector('#todo-name').value.trim();
      if(!name)return alert('名称不能为空');
      const date=dialog.querySelector('#todo-date').value;
      const time=dialog.querySelector('#todo-time').value;
      const due=date?(time?`${date}T${time}`:date):'';
      const priority=parseInt(dialog.querySelector('#todo-priority').value)||3;
      const tag=dialog.querySelector('#todo-tag').value.trim();
      if(isNew){
        const id='todo_'+Date.now()+'_'+Math.random().toString(36).substr(2,9);
        todos.push({id,name,due,priority,tag,done:false,notifyScheduled:false});
      }else{
        const oldDue = t.due;
        t.name=name;
        t.due=due;
        t.priority=priority;
        t.tag=tag;
        // 如果修改了截止时间且已预约通知,需要重新预约
        if (t.notifyScheduled && oldDue !== due) {
          await cancelNotification(t);
          if (due) {
            const success = await scheduleNotification(t);
            t.notifyScheduled = success;
          } else {
            t.notifyScheduled = false;
          }
        }
      }
      saveSettings();
      render(sortMode);
      appendToWorldInfoTodoLog();
      dialog.remove();
    };
  }
  document.getElementById('ha-todo-add-btn').onclick=()=>openTodoDialog(null,'date');
  document.getElementById('ha-todo-sort-date').onclick=()=>render('date');
  document.getElementById('ha-todo-sort-priority').onclick=()=>render('priority');
  // ==== 日历面板 ====
  btnCalendar.addEventListener('click', ()=>{
    const dialog=document.createElement('div');
    dialog.innerHTML=`
      <div style="background:#fff;padding:10px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:800px;width:95%;margin:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <button id="cal-day" class="ha-btn" style="margin-right:4px;">当日</button>
            <button id="cal-week" class="ha-btn" style="margin-right:4px;">7天</button>
            <button id="cal-month" class="ha-btn">当月</button>
          </div>
          <button id="cal-close" class="ha-btn" style="font-size:12px;">关闭</button>
        </div>
        <div id="cal-panel" style="max-height:480px;overflow:auto;font-size:13px;white-space:pre-wrap;border-top:1px solid #ddd;padding-top:6px;"></div>
      </div>`;
    Object.assign(dialog.style,{position:'absolute',top:'6px',left:'4px',right:'4px',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:99999});
    content.appendChild(dialog);
    const panel=dialog.querySelector('#cal-panel');
    function renderDay(){
      const now=new Date();
      const dateStr=now.toISOString().split('T')[0];
      let text=`📅 ${dateStr} 当日任务\n\n`;
      const start=new Date(dateStr+'T00:00');
      for(let h=0;h<24;h+=2){
        const slotStart=new Date(start.getTime()+h*3600*1000);
        const slotEnd=new Date(start.getTime()+(h+2)*3600*1000);
        const slotTasks=todos.filter(t=>t.due && new Date(t.due)>=slotStart && new Date(t.due)<slotEnd);
        const timeLabel=slotStart.toTimeString().slice(0,5)+' - '+slotEnd.toTimeString().slice(0,5);
        if(slotTasks.length){
          text+=`⏰ ${timeLabel}\n`;
          slotTasks.forEach(tt=>{
            const status=tt.done?'✅':'🔸';
            const notify=tt.notifyScheduled?'🎯':'';
            text+=`  ${status}${notify} ${tt.name} (优先:${tt.priority})\n`;
          });
        }
      }
      panel.innerText=text || '今日暂无任务。';
    }
    function renderWeek(){
      const now=new Date();
      const todayStr=now.toISOString().split('T')[0];
      let text=`📅 ${todayStr} 起未来7天任务\n\n`;
      for(let i=0;i<7;i++){
        const d=new Date(now.getTime()+i*86400000);
        const dayStr=d.toISOString().split('T')[0];
        const dayTasks=todos.filter(t=>t.due && t.due.startsWith(dayStr));
        if(dayTasks.length){
          text+=`📆 ${dayStr}\n`;
          dayTasks.forEach(tt=>{
            const status=tt.done?'✅':'🔸';
            const notify=tt.notifyScheduled?'🎯':'';
            text+=`  ${status}${notify} ${tt.name} (优先:${tt.priority})\n`;
          });
          text+='\n';
        }
      }
      panel.innerText=text || '未来7天暂无任务。';
    }
    function renderMonth() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startWeekday = firstDay.getDay();
      const totalDays = lastDay.getDate();
      panel.style.padding = '0';
      panel.style.margin = '0';
      panel.style.lineHeight = '1';
      panel.style.fontSize = '0';
      panel.style.overflow = 'hidden';
      let gridHTML = `<div style="text-align:center;font-weight:600;margin:0 0 2px 0;padding:0;line-height:1;font-size:13px;">📅 ${year}年${month + 1}月</div>`;
      gridHTML += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0;margin:0 0 2px 0;padding:0;font-weight:600;font-size:12px;">` +
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">日</div>` +
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">一</div>` +
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">二</div>` +
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">三</div>` +
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">四</div>` +
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">五</div>` +
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">六</div>` +
        `</div>`;
      gridHTML += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:11px;line-height:1;grid-auto-rows:28px;margin-top:0;">`;
      for (let i = 0; i < startWeekday; i++) gridHTML += `<div></div>`;
      for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dayTasks = todos.filter(t => t.due && t.due.startsWith(dateStr));
        const hasTasks = dayTasks.length > 0;
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        const bg = hasTasks ? 'rgba(144,238,144,0.4)' : isToday ? 'rgba(0,128,255,0.1)' : '#f8f8f8';
        const border = '1px solid #ccc';
        const color = hasTasks ? '#000' : '#999';
        let inner = `<div style="font-weight:600;font-size:11px;margin-bottom:1px;">${day}</div>`;
        inner += hasTasks
          ? `<div style="font-size:12px;font-weight:600;">${dayTasks.length}</div>`
          : `<div style="color:#bbb;">无</div>`;
        gridHTML += `<div class="cal-cell" data-date="${dateStr}" 
          style="background:${bg};border:${border};
                 border-radius:3px;padding:1px 0;
                 cursor:pointer;color:${color};
                 display:flex;flex-direction:column;
                 align-items:center;justify-content:center;
                 min-height:28px;line-height:1.2;">${inner}</div>`;
      }
      gridHTML += `</div>`;
      panel.innerHTML = gridHTML;
      panel.querySelectorAll('.cal-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          const d = cell.dataset.date;
          const dayTasks = todos.filter(t => t.due && t.due.startsWith(d));
          const popup = document.createElement('div');
          popup.innerHTML = `
            <div style="background:#fff;border:1px solid #ccc;border-radius:6px;
                        padding:8px;box-shadow:0 2px 8px rgba(0,0,0,0.2);max-width:320px;">
              <div style="font-weight:600;margin-bottom:4px;">📅 ${d} 的任务</div>
              <div style="max-height:240px;overflow:auto;font-size:13px;">
                ${
                  dayTasks.length
                    ? dayTasks.map(t => {
                        const status = t.done ? '✅' : '🔸';
                        const notify = t.notifyScheduled ? '🎯' : '';
                        const dueTime = (t.due.split('T')[1] || '').slice(0,5);
                        return `<div>${status}${notify}${escapeHtml(t.name)} ${dueTime ? `(${dueTime})` : ''}</div>`;
                      }).join('')
                    : '<div>暂无任务。</div>'
                }
              </div>
              <div style="text-align:right;margin-top:6px;">
                <button class="ha-btn cal-close-mini" style="font-size:12px;">关闭</button>
              </div>
            </div>`;
          Object.assign(popup.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          });
          content.appendChild(popup);
          popup.querySelector('.cal-close-mini').onclick = () => popup.remove();
        });
      });
    }
    dialog.querySelector('#cal-day').onclick=renderDay;
    dialog.querySelector('#cal-week').onclick=renderWeek;
    dialog.querySelector('#cal-month').onclick=renderMonth;
    dialog.querySelector('#cal-close').onclick=()=>dialog.remove();
    renderDay();
  });
  function escapeHtml(str){return str?String(str).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])):'';}
  // 初始化 Service Worker
  await initServiceWorker();
  
  render();
}
async function showMemo() {
  if (!ctx.extensionSettings[MODULE_NAME].memo) ctx.extensionSettings[MODULE_NAME].memo = [];
  const memos = ctx.extensionSettings[MODULE_NAME].memo;

  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">备忘录</div>
    <div style="margin-bottom:6px;">
      <textarea id="ha-memo-input" placeholder="输入备忘录..." 
        style="width:100%; min-height:60px; padding:4px; resize:vertical"></textarea>
      <button id="ha-memo-add" class="ha-btn" style="vertical-align:top; margin-left:6px;">添加 Memo</button>
    </div>
    <ul id="ha-memo-list" style="padding-left:18px; margin-top:6px;"></ul>
    <div id="ha-memo-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>
  `;

  const listEl = document.getElementById('ha-memo-list');
  const debugEl = document.getElementById('ha-memo-debug');

  function debugLog(...args) {
    const ts = new Date().toLocaleTimeString();
    const msg = `[${ts}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    debugEl.innerText += msg + "\n";
    debugEl.scrollTop = debugEl.scrollHeight;
    console.log('[健康生活助手][Memo]', ...args);
  }

  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      debugLog('selected_world_info:', selected);
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          debugLog('匹配到世界书文件:', WI);
          return WI;
        }
      }
      debugLog('未找到名为 "健康生活助手" 的世界书文件');
      return null;
    } catch (e) {
      debugLog('findHealthWorldFile 异常:', e.message || e);
      return null;
    }
  }

  async function appendToWorldInfoMemo() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) { debugLog('写入世界书: 未找到世界书文件，跳过写入'); return; }

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      debugLog('loadWorldInfo entries count:', Object.keys(entries).length);

      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('memo') || entry.title === 'memo')) {
          targetUID = entry.uid;
          debugLog('找到 memo entry: uid=', targetUID, 'comment=', comment);
          break;
        }
      }

      if (!targetUID) { debugLog('未找到 memo entry（未创建），写入被跳过。'); return; }

      // 仅同步共享的 memo
      const shared = memos.filter(m => m.shared);
      const arr = shared.map((m, i) => `${i+1}. [${m.date}] ${m.text}`);
      const newContent = arr.join('\n');

      debugLog('准备写入 world entry:', { file: fileId, uid: targetUID });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);

      debugLog('写入世界书成功，共享条目数:', arr.length);
    } catch (e) {
      debugLog('写入世界书失败:', e.message || e);
    }
  }

  function render() {
    listEl.innerHTML = '';
    memos.forEach((m, i) => {
      const li = document.createElement('li');
      li.style.marginBottom = '6px';
      li.style.display = 'flex';
      li.style.alignItems = 'center';

      // 共享选择放最前
      const chkShare = document.createElement('input');
      chkShare.type = 'checkbox';
      chkShare.checked = m.shared || false;
      chkShare.style.marginRight = '6px';
      chkShare.addEventListener('change', () => {
        m.shared = chkShare.checked;
        saveSettings();
        appendToWorldInfoMemo();
      });
      li.appendChild(chkShare);

      const span = document.createElement('span');
      span.style.flex = '1';
      span.innerText = `${i+1}. [${m.date}] ${m.text}`;
      li.appendChild(span);

      // 编辑按钮
      const btnEdit = document.createElement('button');
      btnEdit.innerText = '编辑';
      btnEdit.className = 'ha-btn';
      btnEdit.style.marginLeft = '6px';
      btnEdit.addEventListener('click', () => {
        const newText = prompt('编辑 Memo 内容', m.text);
        if (newText === null) return;
        m.text = newText;
        saveSettings();
        render();
        appendToWorldInfoMemo();
      });
      li.appendChild(btnEdit);

      // 删除按钮
      const btnDel = document.createElement('button');
      btnDel.innerText = '删除';
      btnDel.className = 'ha-btn';
      btnDel.style.marginLeft = '4px';
      btnDel.addEventListener('click', () => {
        if (!confirm('确认删除该 Memo？')) return;
        memos.splice(i, 1);
        saveSettings();
        render();
        appendToWorldInfoMemo();
      });
      li.appendChild(btnDel);

      listEl.appendChild(li);
    });

    appendToWorldInfoMemo();
  }

  // 添加 Memo
  content.querySelector('#ha-memo-add').addEventListener('click', () => {
    const input = content.querySelector('#ha-memo-input');
    const val = input.value.trim();
    if (!val) return;
    const now = new Date();
    const dateStr = now.toLocaleString();
    memos.push({ text: val, date: dateStr, shared: false });
    input.value = '';
    saveSettings();
    render();
  });

  render();
}
async function showBgm() {
  const container = content;
  container.style.display = 'block';
  container.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">🎵 背景音乐</div>

    <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">
      <input id="ha-bgm-tag-input" type="text" placeholder="标签名" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;">
      <button id="ha-bgm-add" class="ha-btn">➕</button>
      <button id="ha-bgm-del" class="ha-btn">🗑️</button>
      <button id="ha-bgm-star" class="ha-btn">⭐</button>
    </div>

    <div id="ha-bgm-tags" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;"></div>

    <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">
      <input id="ha-bgm-search" type="text" placeholder="搜索歌名/歌手" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;">
      <input id="ha-bgm-limit" type="number" min="1" value="10" title="返回条数" style="width:60px;padding:4px;border:1px solid #ccc;border-radius:4px;">
      <button id="ha-bgm-query" class="ha-btn">🔎</button>
    </div>

    <div id="ha-bgm-list" style="border:1px solid #ddd;padding:6px;border-radius:6px;background:#fafafa;min-height:80px;max-height:300px;overflow:auto;white-space:pre-wrap;"></div>
  `;

  const tagInput = document.getElementById('ha-bgm-tag-input');
  const tagArea = document.getElementById('ha-bgm-tags');
  const listArea = document.getElementById('ha-bgm-list');
  const addBtn = document.getElementById('ha-bgm-add');
  const delBtn = document.getElementById('ha-bgm-del');
  const starBtn = document.getElementById('ha-bgm-star');
  const searchBtn = document.getElementById('ha-bgm-query');
  const searchInput = document.getElementById('ha-bgm-search');
  const limitInput = document.getElementById('ha-bgm-limit');
  const debug = (...args) => console.log('[BGM]', ...args);
  const state = { deleteMode: false };
  const tags = ctx.extensionSettings[MODULE_NAME].bgmTags || [];
  // 初始化 limitInput 值
const savedLimit = ctx.extensionSettings[MODULE_NAME].bgmLimit || 10;
limitInput.value = savedLimit;

// 监听用户修改 limitInput
limitInput.onchange = () => {
  const val = parseInt(limitInput.value) || 10;
  ctx.extensionSettings[MODULE_NAME].bgmLimit = val;
  saveSettings();
};

  function toaster(msg, type = 'info') {
    window.toastr?.[type] ? toastr[type](msg) : alert(msg);
  }

  function saveTags() {
    ctx.extensionSettings[MODULE_NAME].bgmTags = tags;
    saveSettings();
    renderTags();
  }

  function renderTags() {
    tagArea.innerHTML = '';
    tags.forEach(tag => {
      const btn = document.createElement('div');
      btn.textContent = tag.name;
      btn.style.cssText = `
        padding:2px 8px;
        border-radius:12px;
        background:${tag.enabled ? '#8fd3f4' : '#ddd'};
        cursor:pointer;
      `;
      btn.addEventListener('click', () => {
        if (state.deleteMode) {
          const idx = tags.indexOf(tag);
          if (idx >= 0) tags.splice(idx, 1);
          saveTags();
        } else {
          tag.enabled = !tag.enabled;
          saveTags();
        }
      });
      tagArea.appendChild(btn);
    });
  }

  renderTags();

  addBtn.onclick = () => {
    const name = tagInput.value.trim();
    if (!name) return;
    if (!tags.some(t => t.name === name)) tags.push({ name, enabled: true });
    tagInput.value = '';
    saveTags();
  };

  delBtn.onclick = () => {
    state.deleteMode = !state.deleteMode;
    delBtn.style.background = state.deleteMode ? '#f88' : '';
  };

  // ⭐ 读取 ❤️音乐 条目
  starBtn.onclick = async () => {
    listArea.innerText = '正在读取 ❤️音乐 条目...';
    const songs = await readWorldMusicEntry('❤️音乐');
    if (!songs) {
      listArea.innerText = '未找到 ❤️音乐 条目';
      return;
    }
    renderList(songs);
  };

  // 🔎 搜索按钮
  searchBtn.onclick = async () => {
    const kw = searchInput.value.trim();
    const limit = parseInt(limitInput.value) || 10;
    const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
    listArea.innerText = '正在搜索...';

    try {
      if (!api.url) {
        const local = localSearch(kw, limit);
        renderList(local);
        toaster('未配置独立API，使用本地示例数据', 'warning');
        return;
      }
      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
      const enabledTags = tags.filter(t => t.enabled).map(t => t.name);
      const skipList = await readWorldMusicEntry('🖤音乐') || [];
      let prompt;
      if (!kw) {
        prompt = `请推荐${limit}首符合这些标签的歌曲（格式“歌名 - 歌手”）,每行一条，不要输出歌手和歌名以外的内容。排除以下音乐。\n标签：${enabledTags.join('、')}\n排除：${skipList.join('、')}`;
      } else {
        prompt = `请推荐${limit}首与“${kw}”相关的歌曲，格式为“歌名 - 歌手”。不要输出歌手和歌名以外的内容例如推荐语。`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})
        },
        body: JSON.stringify({
          model: api.model,
          messages: [
            { role: 'system', content: '你是音乐助手，负责返回歌单。' },
            { role: 'user', content: prompt }
          ]
        })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      const list = text.split('\n').filter(Boolean).map(x => x.replace(/^\d+[.、]/, '').trim());
      renderList(list.length ? list : ['（未返回有效数据）']);
    } catch (e) {
      debug('API搜索失败', e);
      listArea.innerText = 'API调用失败：' + e.message;
      toaster('API请求失败', 'error');
    }
  };

  function localSearch(kw, limit) {
    if (!kw) {
      const enabledTags = tags.filter(t => t.enabled).map(t => t.name);
      return enabledTags.slice(0, limit).map(t => `${t} - 未知歌手`);
    } else {
      return Array.from({ length: limit }, (_, i) => `${kw} 相关歌曲 ${i + 1} - 示例歌手`);
    }
  }

  // 🎵 播放器核心变量
  let Music_Audio = new Audio();
  let Music_List = [];
  let Music_Index = 0;
  let Music_Mode = 'sequence'; // sequence | random | single
  let Lyric_Timer = null;
  // 全局变量添加
let Lyrics_Data = []; // 存储解析后的歌词数据 [{time: seconds, text: "歌词"}]
let Current_Lyric_Index = -1; // 当前高亮的歌词索引
// 解析 LRC 格式歌词
function parseLRC(lrcText) {
  if (!lrcText) return [];
  
  const lines = lrcText.split('\n');
  const lyrics = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
  
  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length === 0) continue;
    
    // 提取歌词文本（去掉时间标签）
    const text = line.replace(timeRegex, '').trim();
    if (!text) continue;
    
    // 一行可能有多个时间标签
    for (const match of matches) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60 + seconds + milliseconds / 1000;
      
      lyrics.push({ time, text });
    }
  }
  
  // 按时间排序
  return lyrics.sort((a, b) => a.time - b.time);
}

  // 渲染歌曲列表
  async function renderList(songs) {
    listArea.innerHTML = '';
    const likes = await readWorldMusicEntry('❤️音乐') || [];
    const skips = await readWorldMusicEntry('🖤音乐') || [];

    Music_List = songs.map(s => {
      const [name, artist = '未知'] = s.split('-').map(x => x.trim());
      return { name, artist };
    });

    songs.forEach((song, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:4px;border-bottom:1px solid #eee;';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = song;
      const btns = document.createElement('div');
      const like = document.createElement('button');
      const skip = document.createElement('button');
      const play = document.createElement('button');
      like.textContent = '❤️';
      skip.textContent = '🖤';
      play.textContent = '🎵';
      like.className = skip.className = play.className = 'ha-btn';

      if (likes.includes(song)) like.style.background = '#faa';
      if (skips.includes(song)) skip.style.background = '#aaa';

      btns.append(play, like, skip);
      row.append(nameSpan, btns);
      listArea.appendChild(row);

      like.onclick = async e => {
        e.stopPropagation();
        if (likes.includes(song)) {
          await removeWorldMusicEntry('❤️音乐', song);
          toaster(`已从 ❤️音乐 移除: ${song}`, 'info');
        } else {
          await writeWorldMusicEntry('❤️音乐', song);
          toaster(`已加入 ❤️音乐: ${song}`, 'success');
        }
        renderList(songs);
      };

      skip.onclick = async e => {
        e.stopPropagation();
        if (skips.includes(song)) {
          await removeWorldMusicEntry('🖤音乐', song);
          toaster(`已从 🖤音乐 移除: ${song}`, 'info');
        } else {
          await writeWorldMusicEntry('🖤音乐', song);
          toaster(`已加入 🖤音乐: ${song}`, 'warning');
        }
        renderList(songs);
      };

      play.onclick = e => {
        e.stopPropagation();
        Music_Index = i;
        openMusicPlayer(Music_List[i]);
      };
    });
  }

  // 播放器 UI + 逻辑
  async function openMusicPlayer(songObj) {
    const { name, artist } = songObj;
    let existing = document.getElementById('ha-music-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'ha-music-popup';
    popup.innerHTML = `
  <div style="
    background:#F8F8FF;color:#fff;border-radius:12px;
    width:90%;max-width:420px;max-height:80vh;
    position:absolute;left:50%;top:50%;
    transform:translate(-50%,-50%);
    box-shadow:0 4px 20px rgba(0,0,0,0.4);
    display:flex;flex-direction:column;
    overflow:hidden;z-index:99999;">
    <div style="padding:10px 16px;font-weight:600;color:#778899;display:flex;justify-content:space-between;align-items:center;">
      <span>🎵 ${name} - ${artist}</span>
      <button id="ha-music-close" style="background:none;border:none;color:#778899;font-size:18px;">✖</button>
    </div>
    <div id="ha-music-lyrics" style="flex:1;padding:10px 14px;font-size:13px;overflow-y:auto;text-align:center;color:#ccc;white-space:pre-wrap;">加载歌词中...</div>
    
    <!-- 🎚️ 播放进度条 -->
    <div style="padding:6px 10px;">
      <input type="range" id="ha-progress" min="0" max="100" value="0" step="0.1" style="width:100%;">
    </div>

    <div style="padding:8px;border-top:1px solid #444;display:flex;align-items:center;justify-content:center;gap:12px;">
      <button id="ha-prev" class="ha-btn">⏮️</button>
      <button id="ha-play" class="ha-btn">▶️</button>
      <button id="ha-next" class="ha-btn">⏭️</button>
    </div>
    <div style="padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
      <button id="ha-mode" class="ha-btn" style="font-size:13px;">🔁 顺序播放</button>
      <input type="range" id="ha-volume" min="0" max="1" step="0.01" value="0.7" style="width:120px;">
    </div>
  </div>`;
    document.body.appendChild(popup);

    document.getElementById('ha-music-close').onclick = () => popup.remove();
    document.getElementById('ha-volume').oninput = e => (Music_Audio.volume = e.target.value);
    document.getElementById('ha-play').onclick = togglePlay;
    document.getElementById('ha-prev').onclick = playPrev;
    document.getElementById('ha-next').onclick = playNext;
    document.getElementById('ha-mode').onclick = toggleMode;

    await playSong(name, artist);
    const progress = document.getElementById('ha-progress');

// 实时更新播放进度
Music_Audio.ontimeupdate = () => {
  if (!Music_Audio.duration) return;
  progress.value = (Music_Audio.currentTime / Music_Audio.duration) * 100;
};

// 用户拖动进度条
progress.oninput = e => {
  if (!Music_Audio.duration) return;
  const pct = e.target.value / 100;
  Music_Audio.currentTime = pct * Music_Audio.duration;
};
  }

  function toggleMode() {
    const modes = ['sequence', 'random', 'single'];
    Music_Mode = modes[(modes.indexOf(Music_Mode) + 1) % modes.length];
    const label =
      Music_Mode === 'sequence' ? '🔁 顺序播放' :
      Music_Mode === 'random' ? '🔀 随机播放' : '🔂 单曲循环';
    document.getElementById('ha-mode').textContent = label;
  }

  function togglePlay() {
    if (Music_Audio.paused) {
      Music_Audio.play();
      document.getElementById('ha-play').textContent = '⏸️';
    } else {
      Music_Audio.pause();
      document.getElementById('ha-play').textContent = '▶️';
    }
  }

  function playPrev() {
    if (Music_List.length === 0) return;
    Music_Index = (Music_Index - 1 + Music_List.length) % Music_List.length;
    openMusicPlayer(Music_List[Music_Index]);
  }

  function playNext() {
    if (Music_List.length === 0) return;
    if (Music_Mode === 'random')
      Music_Index = Math.floor(Math.random() * Music_List.length);
    else
      Music_Index = (Music_Index + 1) % Music_List.length;
    openMusicPlayer(Music_List[Music_Index]);
  }

  // 更新 playSong 函数
async function playSong(name, artist) {
  const keyword = `${name}-${artist}`.trim();
  const lyricBox = document.getElementById('ha-music-lyrics');
  lyricBox.textContent = '🎶 正在加载歌词...';
  
  // 获取歌词
  const lyricData = await getLyricsData(keyword);
  Lyrics_Data = parseLRC(lyricData.lrc);
  
  // 初始化歌词显示
  if (Lyrics_Data.length > 0) {
    renderLyrics();
  } else {
    lyricBox.textContent = '暂无歌词';
  }
  
  // 加载音乐
  let url = await getMusicUrl(keyword);
  if (!url) {
    lyricBox.textContent = '找不到音源';
    return;
  }
  
  Music_Audio.src = url;
  Music_Audio.play();
  document.getElementById('ha-play').textContent = '⏸️';
  
  // 绑定时间更新事件
  Music_Audio.ontimeupdate = updateLyrics;
}

// 新的获取歌词函数，返回原始数据
async function getLyricsData(keyword) {
  try {
    const searchRes = await fetch(`https://api.vkeys.cn/v2/music/netease?word=${encodeURIComponent(keyword)}`);
    const searchData = await searchRes.json();
    const songId = searchData?.data?.[0]?.id;
    
    if (!songId) {
      return { lrc: '', tlyric: '' };
    }
    
    const lyricRes = await fetch(`https://api.vkeys.cn/v2/music/netease/lyric?id=${songId}`);
    const lyricData = await lyricRes.json();
    
    return {
      lrc: lyricData?.data?.lrc || lyricData?.data?.lyric || '',
      tlyric: lyricData?.data?.trans || lyricData?.data?.tlyric || ''
    };
  } catch (error) {
    console.error("getLyricsData 失败:", error);
    return { lrc: '', tlyric: '' };
  }
}

// 渲染歌词列表
function renderLyrics() {
  const lyricBox = document.getElementById('ha-music-lyrics');
  lyricBox.innerHTML = '';
  
  Lyrics_Data.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'lyric-line';
    div.setAttribute('data-index', index);
    div.textContent = item.text;
    div.style.cssText = `
      padding: 8px 0;
      color: #999;
      transition: all 0.3s ease;
      cursor: pointer;
    `;
    
    // 点击歌词跳转
    div.onclick = () => {
      if (Music_Audio.duration) {
        Music_Audio.currentTime = item.time;
      }
    };
    
    lyricBox.appendChild(div);
  });
}

// 更新歌词高亮和滚动
function updateLyrics() {
  if (!Music_Audio.duration || Lyrics_Data.length === 0) return;
  
  const currentTime = Music_Audio.currentTime;
  const progress = document.getElementById('ha-progress');
  
  // 更新进度条
  if (progress) {
    progress.value = (currentTime / Music_Audio.duration) * 100;
  }
  
  // 找到当前应该高亮的歌词
  let targetIndex = -1;
  for (let i = Lyrics_Data.length - 1; i >= 0; i--) {
    if (currentTime >= Lyrics_Data[i].time) {
      targetIndex = i;
      break;
    }
  }
  
  // 如果索引没变，不需要更新
  if (targetIndex === Current_Lyric_Index) return;
  
  Current_Lyric_Index = targetIndex;
  const lyricBox = document.getElementById('ha-music-lyrics');
  const lines = lyricBox.querySelectorAll('.lyric-line');
  
  lines.forEach((line, index) => {
    if (index === targetIndex) {
      // 当前行高亮
      line.style.color = '	#4169E1';
      line.style.fontSize = '15px';
      line.style.fontWeight = 'bold';
      
      // 滚动到中间位置
      const containerHeight = lyricBox.clientHeight;
      const lineTop = line.offsetTop;
      const lineHeight = line.offsetHeight;
      const scrollTarget = lineTop - (containerHeight / 2) + (lineHeight / 2);
      
      lyricBox.scrollTo({
        top: scrollTarget,
        behavior: 'smooth'
      });
    } else {
      // 其他行恢复正常
      line.style.color = '#B0C4DE';
      line.style.fontSize = '13px';
      line.style.fontWeight = 'normal';
    }
  });
}

// 修改播放器 UI 中的歌词容器样式
async function openMusicPlayer(songObj) {
  const { name, artist } = songObj;
  let existing = document.getElementById('ha-music-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'ha-music-popup';
  popup.innerHTML = `
  <div style="
    background:#F8F8FF;color:#fff;border-radius:12px;
    width:90%;max-width:420px;max-height:80vh;
    position:absolute;left:50%;top:50%;
    transform:translate(-50%,-50%);
    box-shadow:0 4px 20px rgba(0,0,0,0.4);
    display:flex;flex-direction:column;
    overflow:hidden;z-index:99999;">
    <div style="padding:10px 16px;font-weight:600;color:#778899;display:flex;justify-content:space-between;align-items:center;">
      <span>🎵 ${name} - ${artist}</span>
      <button id="ha-music-close" style="background:none;border:none;color:#778899;font-size:18px;">✖</button>
    </div>
    <div id="ha-music-lyrics" style="
      flex:1;
      padding:20px;
      font-size:13px;
      overflow-y:auto;
      overflow-x:hidden;
      text-align:center;
      color:#ccc;
      scroll-behavior:smooth;
    ">加载歌词中...</div>
    
    <!-- 🎚️ 播放进度条 -->
    <div style="padding:6px 10px;">
      <input type="range" id="ha-progress" min="0" max="100" value="0" step="0.1" style="width:100%;">
    </div>

    <div style="padding:8px;border-top:1px solid #444;display:flex;align-items:center;justify-content:center;gap:12px;">
      <button id="ha-prev" class="ha-btn">⏮️</button>
      <button id="ha-play" class="ha-btn">▶️</button>
      <button id="ha-next" class="ha-btn">⏭️</button>
    </div>
    <div style="padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
      <button id="ha-mode" class="ha-btn" style="font-size:13px;">🔁 顺序播放</button>
      <input type="range" id="ha-volume" min="0" max="1" step="0.01" value="0.7" style="width:120px;">
    </div>
  </div>`;
  document.body.appendChild(popup);

  document.getElementById('ha-music-close').onclick = () => {
    popup.remove();
    // 清理定时器
    if (Lyric_Timer) {
      clearInterval(Lyric_Timer);
      Lyric_Timer = null;
    }
  };
  
  document.getElementById('ha-volume').oninput = e => (Music_Audio.volume = e.target.value);
  document.getElementById('ha-play').onclick = togglePlay;
  document.getElementById('ha-prev').onclick = playPrev;
  document.getElementById('ha-next').onclick = playNext;
  document.getElementById('ha-mode').onclick = toggleMode;

  await playSong(name, artist);
  
  const progress = document.getElementById('ha-progress');
  // 用户拖动进度条
  progress.oninput = e => {
    if (!Music_Audio.duration) return;
    const pct = e.target.value / 100;
    Music_Audio.currentTime = pct * Music_Audio.duration;
  };
}

// 音频结束时处理
Music_Audio.onended = () => {
  if (Music_Mode === 'single') {
    Music_Audio.play();
  } else {
    playNext();
  }
};

  

  async function getMusicUrl(keyword) {
    try {
      const res = await fetch(`https://api.vkeys.cn/v2/music/netease?word=${keyword}`);
      const data = await res.json();
      if (!data?.data?.length) return '';
      const id = data.data[0].id;
      const r2 = await fetch(`https://api.vkeys.cn/v2/music/netease?id=${id}`);
      const d2 = await r2.json();
      return d2?.data?.url || '';
    } catch {
      return '';
    }
  }

  async function getLyrics(keyword) {
  try {
    // 先通过关键词搜索歌曲，获取网易云音乐的歌曲 ID
    const searchRes = await fetch(`https://api.vkeys.cn/v2/music/netease?word=${encodeURIComponent(keyword)}`);
    const searchData = await searchRes.json();
    const songId = searchData?.data?.[0]?.id;
    if (!songId) {
      console.warn("getLyrics: 未找到对应歌曲ID");
      return '暂无歌词';
    }

    // 使用网易云歌词接口获取歌词和翻译
    const lyricRes = await fetch(`https://api.vkeys.cn/v2/music/netease/lyric?id=${songId}`);
    const lyricData = await lyricRes.json();

    // 网易云歌词接口返回字段格式： data.lrc, data.lyric, data.trans, data.tlyric
    const lrcText = lyricData?.data?.lrc || lyricData?.data?.lyric;
    const transText = lyricData?.data?.trans || lyricData?.data?.tlyric;

    // 处理歌词文本
    if (!lrcText) {
      console.warn("getLyrics: 无歌词文本", lyricData);
      return '暂无歌词';
    }

    // 合并中英文歌词（如果有翻译）
    let lyricResult = lrcText;
    if (transText) {
      lyricResult += '\n\n---- 翻译 ----\n' + transText;
    }

    return lyricResult;
  } catch (error) {
    console.error("getLyrics 失败:", error);
    return '歌词加载失败';
  }
}



  // 世界书接口部分
  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) if (WI.includes('健康生活助手')) return WI;
      return null;
    } catch (e) {
      debug('findHealthWorldFile异常', e);
      return null;
    }
  }

  async function readWorldMusicEntry(label) {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return null;
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      for (const id in entries) {
        const entry = entries[id];
        if (!entry.disable && (entry.title === label || (entry.comment || '').includes(label))) {
          const content = entry.content || '';
          return content.split('\n').filter(Boolean);
        }
      }
      return null;
    } catch (e) {
      debug('readWorldMusicEntry异常', e);
      return null;
    }
  }

  async function writeWorldMusicEntry(label, songLine) {
    const fileId = await findHealthWorldFile();
    if (!fileId) return;
    const moduleWI = await import('/scripts/world-info.js');
    const worldInfo = await moduleWI.loadWorldInfo(fileId);
    const entries = worldInfo.entries || {};
    let targetUID = null;
    for (const id in entries) {
      const entry = entries[id];
      if (!entry.disable && (entry.title === label || (entry.comment || '').includes(label))) {
        targetUID = entry.uid;
        break;
      }
    }
    if (!targetUID) return;
    const existing = entries[targetUID].content || '';
    if (existing.includes(songLine)) return;
    const newContent = existing + (existing ? '\n' : '') + songLine;
    await ctx.SlashCommandParser.commands['setentryfield']
      .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
  }

  async function removeWorldMusicEntry(label, songLine) {
    const fileId = await findHealthWorldFile();
    if (!fileId) return;
    const moduleWI = await import('/scripts/world-info.js');
    const worldInfo = await moduleWI.loadWorldInfo(fileId);
    const entries = worldInfo.entries || {};
    for (const id in entries) {
      const entry = entries[id];
      if (!entry.disable && (entry.title === label || (entry.comment || '').includes(label))) {
        const arr = (entry.content || '').split('\n').filter(Boolean);
        const newArr = arr.filter(line => line.trim() !== songLine.trim());
        const newContent = newArr.join('\n');
        await ctx.SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: entry.uid, field: 'content' }, newContent);
        break;
      }
    }
  }
}

async function showClearBook() {
  content.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
      <button id="ha-clear-sleep" class="ha-clear-btn">清除睡眠数据</button>
      <button id="ha-clear-diet" class="ha-clear-btn">清除饮食数据</button>
      <button id="ha-clear-mental" class="ha-clear-btn">清除心理数据</button>
      <button id="ha-clear-exercise" class="ha-clear-btn">清除运动数据</button>
      <button id="ha-clear-wishes" class="ha-clear-btn">清除心愿数据</button>
      <button id="ha-clear-social" class="ha-clear-btn">清除习惯数据</button>
      <button id="ha-clear-todo" class="ha-clear-btn">清除待办数据</button>
      <button id="ha-clear-meditation" class="ha-clear-btn">清除冥想数据</button>
      <button id="ha-clear-memo" class="ha-clear-btn">清除Memo数据</button>
      <button id="ha-clear-all" class="ha-clear-btn">全部清除</button>
    </div>
    <div id="ha-clear-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>
  `;

  const debugEl = document.getElementById('ha-clear-debug');

  function debugLog(...args){
    const ts = new Date().toLocaleTimeString();
    const msg = `[${ts}] ` + args.map(a => typeof a==='string'?a:JSON.stringify(a)).join(' ');
    debugEl.innerText += msg + "\n";
    debugEl.scrollTop = debugEl.scrollHeight;
    console.log('[健康生活助手]', ...args);
  }

  async function findHealthWorldFile() {      
    try {      
      const moduleWI = await import('/scripts/world-info.js');      
      const selected = moduleWI.selected_world_info || [];      
      debugLog('selected_world_info:', selected);      
      for (const WI of selected) {      
        if (WI.includes('健康生活助手')) {      
          debugLog('匹配到世界书文件:', WI);      
          return WI;      
        }      
      }      
      debugLog('未找到名为 "健康生活助手" 的世界书文件');      
      return null;      
    } catch (e) {      
      debugLog('findHealthWorldFile 异常:', e.message || e);      
      return null;      
    }      
  }

  async function clearWorldEntry(entryName){
    try{
      const fileId = await findHealthWorldFile();
      if(!fileId){ debugLog(`未找到世界书文件，跳过清空: ${entryName}`); return; }

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      let targetUID = null;

      for(const id in entries){
        const entry = entries[id];
        const comment = entry.comment || '';
        if(!entry.disable && (comment.toLowerCase().includes(entryName.toLowerCase()) || entry.title === entryName)){
          targetUID = entry.uid;
          debugLog('找到条目: uid=', targetUID, 'entryName=', entryName);
          break;
        }
      }

      if(!targetUID){ debugLog(`未找到条目 ${entryName}，跳过`); return; }

      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, '');

      debugLog(`世界书条目已清空: ${entryName}`);
    }catch(e){
      debugLog(`清空世界书 ${entryName} 异常:`, e.message || e);
    }
  }

  async function clearSleep(){
    ctx.extensionSettings[MODULE_NAME].sleep = [];
    saveSettings();
    await clearWorldEntry('睡眠');
    alert('睡眠已清空');
  }

  async function clearDiet(){
    ctx.extensionSettings[MODULE_NAME].diet = [];
    saveSettings();
    await clearWorldEntry('饮食');
    alert('饮食已清空');
  }

  async function clearMental(){
    ctx.extensionSettings[MODULE_NAME].mental = [];
    saveSettings();
    await clearWorldEntry('心理');
    alert('心理已清空');
  }

  async function clearExercise(){
    ctx.extensionSettings[MODULE_NAME].exercise = [];
    saveSettings();
    await clearWorldEntry('运动');
    alert('运动已清空');
  }

  async function clearWishes(){
    ctx.extensionSettings[MODULE_NAME].wishes = [];
    saveSettings();
    await clearWorldEntry('心愿');
    alert('心愿已清空');
  }

  async function clearSocial(){
    ctx.extensionSettings[MODULE_NAME].social = {};
    saveSettings();
    await clearWorldEntry('习惯');
    alert('习惯已清空');
  }

  async function clearTodo(){
    ctx.extensionSettings[MODULE_NAME].todo = [];
    saveSettings();
    await clearWorldEntry('待办');
    alert('待办已清空');
  }

  async function clearMeditation(){
    ctx.extensionSettings[MODULE_NAME].meditation = [];
    saveSettings();
    await clearWorldEntry('冥想');
    alert('冥想已清空');
  }

  async function clearMemo(){
    ctx.extensionSettings[MODULE_NAME].memo = [];
    saveSettings();
    await clearWorldEntry('memo');
    alert('Memo已清空');
  }

  async function clearAll(){
    await clearSleep();
    await clearDiet();
    await clearMental();
    await clearExercise();
    await clearWishes();
    await clearSocial();
    await clearTodo();
    await clearMeditation();
    await clearMemo();
    ctx.extensionSettings[MODULE_NAME].apiConfig = {};
    saveSettings();
    alert('全部已清空');
  }

  document.getElementById('ha-clear-sleep').addEventListener('click', clearSleep);
  document.getElementById('ha-clear-diet').addEventListener('click', clearDiet);
  document.getElementById('ha-clear-mental').addEventListener('click', clearMental);
  document.getElementById('ha-clear-exercise').addEventListener('click', clearExercise);
  document.getElementById('ha-clear-wishes').addEventListener('click', clearWishes);
  document.getElementById('ha-clear-social').addEventListener('click', clearSocial);
  document.getElementById('ha-clear-todo').addEventListener('click', clearTodo);
  document.getElementById('ha-clear-meditation').addEventListener('click', clearMeditation);
  document.getElementById('ha-clear-memo').addEventListener('click', clearMemo);
  document.getElementById('ha-clear-all').addEventListener('click', clearAll);
}
      // ------------- 完整独立 API 配置模块（集成参考代码） -------------
      function showApiConfig(){
        content.style.display = 'block';
        // 使 content 相对定位，便于右上角设置按钮定位
        content.style.position = 'relative';
        const cfg = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
        content.innerHTML = `
          <div style="font-weight:600;margin-bottom:6px">独立 API 配置</div>

          <div style="margin-bottom:6px">
            <label style="font-size:12px;color:#666;display:block">API URL</label>
            <input id="ha-api-url" type="text" style="width:100%;padding:6px" value="${cfg.url || ''}" />
          </div>

          <div style="margin-bottom:6px">
            <label style="font-size:12px;color:#666;display:block">API Key</label>
            <input id="ha-api-key" type="text" style="width:100%;padding:6px" value="${cfg.key || ''}" />
          </div>

          <div style="margin-bottom:6px">
            <label style="font-size:12px;color:#666;display:block">模型</label>
            <select id="ha-api-model" style="width:100%;padding:6px"></select>
          </div>

          <div style="display:flex;gap:8px;margin-bottom:6px">
            <button id="ha-api-save" class="ha-btn" style="flex:1">保存配置</button>
            <button id="ha-api-test" class="ha-btn" style="flex:1">测试连接</button>
            <button id="ha-api-refresh" class="ha-btn" style="flex:1">刷新模型</button>
          </div>

          <div id="ha-api-status" class="ha-small"></div>
        `;

        // 小齿轮按钮（参考）
        const apiBtn = document.createElement('button');
        apiBtn.textContent = '⚙️';
        Object.assign(apiBtn.style, {
          position: 'absolute',
          top: '6px',
          right: '6px',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          fontSize: '16px'
        });
        content.appendChild(apiBtn);

        const apiModule = document.createElement('div');
        apiModule.id = 'api-module';
        Object.assign(apiModule.style, {
          marginTop: '28px',
          display: 'none'
        });
        content.appendChild(apiModule);

        apiBtn.addEventListener('click', async () => {
          apiModule.style.display = apiModule.style.display === 'none' ? 'block' : 'none';
          debugLog('切换API设置面板', apiModule.style.display);
          // 当面板第一次打开时，尝试自动拉取模型（如果未曾拉取过）
          if (apiModule.style.display === 'block') {
            try {
              await fetchAndPopulateModels(false); // 不强制，第一次会拉取一次并记录时间
            } catch (e) {
              // fetch 内部已经有 debugLog，这里仅捕获防止未处理的 promise
            }
          }
        });

        // API模块表单（包含刷新模型按钮）
        // （因已在 content.innerHTML 中提供基础表单，这里只负责将 apiModule 放置用于额外展示）
        apiModule.innerHTML = `
          <div style="font-size:12px;color:#666">（模型列表与额外信息会出现在此区域）</div>
        `;

        // 载入已有配置到 localStorage 兼容（保持向后兼容）
        const modelSelect = document.getElementById('ha-api-model');
        const savedModel = localStorage.getItem('independentApiModel') || cfg.model || '';

        // populateModelSelect 函数
        function populateModelSelect(models) {
          modelSelect.innerHTML = '';
          const uniq = Array.from(new Set(models || []));
          uniq.forEach(m => {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = m;
            modelSelect.appendChild(option);
          });
          if (savedModel) {
            let existing = Array.from(modelSelect.options).find(o => o.value === savedModel);
            if (existing) {
              existing.textContent = savedModel + '（已保存）';
              modelSelect.value = savedModel;
            } else {
              const opt = document.createElement('option');
              opt.value = savedModel;
              opt.textContent = savedModel + '（已保存）';
              modelSelect.insertBefore(opt, modelSelect.firstChild);
              modelSelect.value = savedModel;
            }
          } else if (modelSelect.options.length > 0) {
            modelSelect.selectedIndex = 0;
          }
        }

        const storedModelsRaw = localStorage.getItem('independentApiModels');
        if (storedModelsRaw) {
          try {
            const arr = JSON.parse(storedModelsRaw);
            if (Array.isArray(arr)) populateModelSelect(arr);
          } catch (e) { /* ignore parse errors */ }
        } else if (savedModel) {
          const option = document.createElement('option');
          option.value = savedModel;
          option.textContent = savedModel + '（已保存）';
          modelSelect.appendChild(option);
          modelSelect.value = savedModel;
        }

        // 保存配置
        document.getElementById('ha-api-save').addEventListener('click', () => {
          const url = document.getElementById('ha-api-url').value;
          const key = document.getElementById('ha-api-key').value;
          const model = modelSelect.value;
          if(!url || !model) {
            alert('请完整填写API信息（至少 URL 与 模型）');
            return;
          }
          // 将 Key 视为可选（但通常需要）
          localStorage.setItem('independentApiUrl', url);
          if (key) localStorage.setItem('independentApiKey', key);
          if (model) localStorage.setItem('independentApiModel', model);
          // 同步到 extensionSettings
          ctx.extensionSettings[MODULE_NAME].apiConfig = { url, key, model };
          saveSettings();
          // 标记选中 option 为已保存样式
          Array.from(modelSelect.options).forEach(o => {
            if (o.value === model) o.textContent = model + '（已保存）';
            else if (o.textContent.endsWith('（已保存）')) o.textContent = o.value;
          });
          document.getElementById('ha-api-status').textContent = '已保存';
          debugLog('保存API配置', {url, model});
        });

        // 测试连接（优先 GET /v1/models/{model}，fallback 到 chat/completions）
        document.getElementById('ha-api-test').addEventListener('click', async () => {
          const urlRaw = document.getElementById('ha-api-url').value || localStorage.getItem('independentApiUrl');
          const key = document.getElementById('ha-api-key').value || localStorage.getItem('independentApiKey');
          const model = modelSelect.value || localStorage.getItem('independentApiModel');

          if (!urlRaw || !model) return alert('请至少填写 API URL 与 模型');

          const baseUrl = urlRaw.replace(/\/$/, '');
          document.getElementById('ha-api-status').textContent = '正在测试模型：' + model + ' ...';
          debugLog('测试连接开始', { baseUrl, model });

          try {
            // 1) 先尝试 GET /v1/models/{model}（许多实现支持）
            let res = await fetch(`${baseUrl}/v1/models/${encodeURIComponent(model)}`, {
              headers: { ...(key ? { 'Authorization': `Bearer ${key}` } : {}) }
            });

            if (res.ok) {
              const info = await res.json();
              document.getElementById('ha-api-status').textContent = `模型 ${model} 可用（metadata 校验通过）`;
              debugLog('GET /v1/models/{model} 成功', info);
              return;
            }

            // 2) 若 1) 不可用，退回到一次极轻量的 chat/completions 验证
            debugLog('GET model 信息失败，尝试用 chat/completions 验证', { status: res.status });
            res = await fetch(`${baseUrl}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                ...(key ? { 'Authorization': `Bearer ${key}` } : {}),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 1
              })
            });

            if (!res.ok) throw new Error(`chat/completions 返回 HTTP ${res.status}`);

            const data = await res.json();
            document.getElementById('ha-api-status').textContent = `模型 ${model} 可用（通过 chat/completions 验证）`;
            debugLog('chat/completions 验证成功', data);
          } catch (e) {
            document.getElementById('ha-api-status').textContent = '连接失败: ' + (e.message || e);
            debugLog('测试连接失败', e.message || e);
          }
        });

        // 刷新模型（手动强制拉取）
        document.getElementById('ha-api-refresh').addEventListener('click', async () => {
          debugLog('手动触发刷新模型');
          await fetchAndPopulateModels(true); // 强制拉取
        });

        // 解析常见的模型列表响应结构，返回字符串数组（模型 id）
        function parseModelIdsFromResponse(data) {
          try {
            if (!data) return [];
            if (Array.isArray(data.data)) return data.data.map(m => m.id || m.model || m.name).filter(Boolean);
            if (Array.isArray(data.models)) return data.models.map(m => m.id || m.model || m.name).filter(Boolean);
            if (Array.isArray(data)) return data.map(m => m.id || m.model || m.name).filter(Boolean);
            // 有些实现直接返回 { model: 'xxx' } 或 { id: 'xxx' }
            if (data.model) return [data.model];
            if (data.id) return [data.id];
          } catch (e) { /* ignore */ }
          return [];
        }

        // 从独立 API 拉取模型并填充下拉框。
        // force=true 表示绕过“记过一次”的检查，强制拉取。
        async function fetchAndPopulateModels(force = false) {
          const url = document.getElementById('ha-api-url').value || localStorage.getItem('independentApiUrl');
          const key = document.getElementById('ha-api-key').value || localStorage.getItem('independentApiKey');
          if (!url || !key) {
            debugLog('拉取模型失败', '未配置 URL 或 Key');
            document.getElementById('ha-api-status').textContent = '请先在上方填写 API URL 和 API Key，然后保存或点击刷新。';
            return;
          }

          const lastFetch = localStorage.getItem('independentApiModelsFetchedAt');
          if (!force && lastFetch) {
            // 已经记录过一次拉取时间，不再自动重复拉取（可以手动刷新）
            const ts = new Date(parseInt(lastFetch, 10));
            document.getElementById('ha-api-status').textContent = `模型已在 ${ts.toLocaleString()} 拉取过一次。若需更新请点击“刷新模型”。`;
            debugLog('跳过自动拉取模型（已记过一次）', { lastFetch: ts.toString() });
            return;
          }

          document.getElementById('ha-api-status').textContent = '正在拉取模型...';
          debugLog('开始拉取模型', { url, force });
          try {
            const res = await fetch(`${url.replace(/\/$/, '')}/v1/models`, {
              headers: { ...(key ? { 'Authorization': `Bearer ${key}` } : {}) }
            });
            if(!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            debugLog('拉取模型返回原始数据', data);

            const ids = parseModelIdsFromResponse(data);
            if (ids.length === 0) {
              document.getElementById('ha-api-status').textContent = '未从 API 返回可用模型。';
              debugLog('未解析到模型ID', data);
              return;
            }

            // 保存模型列表到 localStorage（便于下次加载）
            localStorage.setItem('independentApiModels', JSON.stringify(ids));
            const now = Date.now();
            localStorage.setItem('independentApiModelsFetchedAt', String(now)); // 记过一次（时间戳）
            populateModelSelect(ids);

            document.getElementById('ha-api-status').textContent = `拉取成功，已填充 ${ids.length} 个模型（最后拉取: ${new Date(now).toLocaleString()}）。`;
            debugLog('拉取模型成功', { count: ids.length, first: ids[0] });
          } catch (e) {
            document.getElementById('ha-api-status').textContent = '拉取模型失败: ' + e.message;
            debugLog('拉取模型失败', e.message);
          }
        }

        // 首次打开时尝试拉取（非强制：会遵循已拉取过则不重复）
        fetchAndPopulateModels(false);
      }

     

    } catch (err) {
      console.error('健康生活助手初始化失败', err);
    }
  });
})();