export async function showPomodoro(MODULE_NAME, ctx, saveSettings, debugLog, content) {
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
             style="width:60px;padding:4px;">
      <button id="pom-time-add" class="ha-btn" style="padding:4px 8px;">➕</button>
      <button id="pom-time-del" class="ha-btn" style="padding:4px 8px;">🗑️</button>
      <button id="pom-bgm-play" class="ha-btn" style="padding:4px 8px;">🎵</button>
      <button id="pom-bgm-next" class="ha-btn" style="padding:4px 8px;">⏯️</button>
      <input id="pom-bgm-volume" type="range" min="0" max="100" value="30"
             style="width:60px;cursor:pointer;">
      
    </div>
    
    <!-- 时间块显示区 -->
    <div id="pom-time-blocks" style="display:flex;flex-wrap:wrap;gap:2px;margin-bottom:4px;min-height:24px;"></div>
    
    <!-- 第二行：标题和待办/习惯 -->
    <div style="display:flex;gap:4px;margin-bottom:8px;align-items:center;">
      <input id="pom-title-input" type="text" placeholder="专注标题（可留空）"
             style="width:180px;padding:4px;">
      <button id="pom-todo-btn" class="ha-btn">待办</button>
      <button id="pom-habit-btn" class="ha-btn">习惯</button>
    </div>
    
    <!-- 第三行：标签管理 -->
    <div style="display:flex;gap:4px;margin-bottom:8px;align-items:center;">
      <input id="pom-tag-input" type="text" placeholder="标签"
             style="width:120px;padding:4px;">
      <button id="pom-tag-add" class="ha-btn" style="padding:4px 8px;">➕</button>
      <button id="pom-tag-del" class="ha-btn" style="padding:4px 8px;">🗑️</button>
      <button id="pom-notify-btn" class="ha-btn" style="padding:4px 8px;">🔔</button>
    </div>
    
    <!-- 标签显示区 -->
    <div id="pom-tag-blocks" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;min-height:24px;"></div>
    
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
  // Note: ctx is passed as parameter

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
        padding:2px 8px;
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
        padding:2px 8px;
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

  
      
      
      
      
      
