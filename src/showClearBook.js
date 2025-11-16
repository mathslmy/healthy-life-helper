export async function showClearBook(MODULE_NAME, ctx, saveSettings, debugLog, content) {
  content.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;">
      <button id="ha-clear-sleep" class="ha-clear-btn">清除睡眠数据</button>
      <button id="ha-clear-diet" class="ha-clear-btn">清除饮食数据</button>
      <button id="ha-clear-mental" class="ha-clear-btn">清除心理数据</button>
      <button id="ha-clear-exercise" class="ha-clear-btn">清除运动数据</button>
      <button id="ha-clear-wishes" class="ha-clear-btn">清除心愿数据</button>
      <button id="ha-clear-social" class="ha-clear-btn">清除习惯数据</button>
      <button id="ha-clear-todo" class="ha-clear-btn">清除待办数据</button>
      <button id="ha-clear-memo" class="ha-clear-btn">清除Memo数据</button>
      <button id="ha-clear-wardrobe" class="ha-clear-btn">清除衣柜数据</button>
      <button id="ha-clear-finance" class="ha-clear-btn">清除收支数据</button>
      <button id="ha-clear-pomodoro" class="ha-clear-btn">清除番茄数据</button>
      <button id="ha-clear-music" class="ha-clear-btn">清除音乐数据</button>
      <button id="ha-clear-all" class="ha-clear-btn" style="grid-column: span 4;">全部清除</button>
    </div>
    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin-top:12px;">
      <button id="ha-auto-clear" class="ha-period-btn">自动清除</button>
      <button id="ha-clear-1day" class="ha-period-btn">1天</button>
      <button id="ha-clear-7day" class="ha-period-btn">7天</button>
      <button id="ha-clear-1month" class="ha-period-btn">1月</button>
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

  // 加载清除模式设置
  function loadClearMode() {
    const settings = ctx.extensionSettings[MODULE_NAME] || {};
    const mode = settings.autoClearMode || null;
    if (mode) {
      document.querySelectorAll('.ha-period-btn').forEach(btn => {
        btn.style.backgroundColor = '';
        btn.style.color = '';
      });
      const btnId = mode === 1 ? 'ha-clear-1day' : mode === 7 ? 'ha-clear-7day' : 'ha-clear-1month';
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.style.backgroundColor = '#dc3545';
        btn.style.color = '#fff';
      }
    }
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

  async function updateWorldEntry(entryName, content){
    try{
      const fileId = await findHealthWorldFile();
      if(!fileId){ debugLog(`未找到世界书文件，跳过更新: ${entryName}`); return; }

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
        .callback({ file: fileId, uid: targetUID, field: 'content' }, content);

      debugLog(`世界书条目已更新: ${entryName}`);
    }catch(e){
      debugLog(`更新世界书 ${entryName} 异常:`, e.message || e);
    }
  }

  function clearLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      debugLog(`localStorage已清空: ${key}`);
    } catch (e) {
      debugLog(`清空localStorage ${key} 异常:`, e.message || e);
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
    // 清除所有心理健康相关数据
    ctx.extensionSettings[MODULE_NAME].mental = [];
    ctx.extensionSettings[MODULE_NAME].meditation = [];
    ctx.extensionSettings[MODULE_NAME].thoughtChains = [];
    ctx.extensionSettings[MODULE_NAME].confessions = [];
    saveSettings();
    
    // 清除所有相关世界书条目
    await clearWorldEntry('心理');
    await clearWorldEntry('冥想');
    await clearWorldEntry('思维链');
    await clearWorldEntry('忏悔');
    await clearWorldEntry('注意力转移');
    
    debugLog('心理健康数据已全部清空: mental, meditation, thoughtChains, confessions');
    alert('心理数据已清空(包括情绪、冥想、思维链、忏悔、注意力转移)');
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

  async function clearMemo(){
    ctx.extensionSettings[MODULE_NAME].memo = [];
    saveSettings();
    await clearWorldEntry('memo');
    alert('Memo已清空');
  }

  async function clearWardrobe(){
    ctx.extensionSettings[MODULE_NAME].wardrobe = {
      items: [],
      tags: {
        top: [],
        bottom: [],
        shoes: [],
        accessory: [],
        outfit: []
      }
    };
    saveSettings();
    clearLocalStorage('wardrobe');
    await clearWorldEntry('衣柜');
    alert('衣柜已清空');
  }

  async function clearFinance() {
    ctx.extensionSettings[MODULE_NAME].finance = {
      incomeTags: [],
      expenseTags: [],
      records: []
    };
    saveSettings();
    clearLocalStorage('ha-finance');
    await clearWorldEntry('收入');
    await clearWorldEntry('支出');
    alert('财务数据已清除');
  }

  async function clearPomodoro(){
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
    saveSettings();
    clearLocalStorage('pomodoro');
    await clearWorldEntry('专注记录');
    await clearWorldEntry('专注统计');
    alert('番茄已清空');
  }

  async function clearMusic(){
    ctx.extensionSettings[MODULE_NAME].music = [];
    saveSettings();
    clearLocalStorage('music');
    await clearWorldEntry('❤️音乐');
    await clearWorldEntry('🖤音乐');
    alert('音乐已清空');
  }

  async function clearAll(){
    // 清除各模块数据，但保留正确的数据结构
    ctx.extensionSettings[MODULE_NAME].sleep = [];
    ctx.extensionSettings[MODULE_NAME].diet = [];
    ctx.extensionSettings[MODULE_NAME].mental = [];
    ctx.extensionSettings[MODULE_NAME].meditation = [];
    ctx.extensionSettings[MODULE_NAME].thoughtChains = [];
    ctx.extensionSettings[MODULE_NAME].confessions = [];
    ctx.extensionSettings[MODULE_NAME].exercise = [];
    ctx.extensionSettings[MODULE_NAME].wishes = [];
    ctx.extensionSettings[MODULE_NAME].social = {};
    ctx.extensionSettings[MODULE_NAME].todo = [];
    ctx.extensionSettings[MODULE_NAME].memo = [];

    ctx.extensionSettings[MODULE_NAME].wardrobe = {
      items: [],
      tags: {
        top: [],
        bottom: [],
        shoes: [],
        accessory: [],
        outfit: []
      }
    };

    ctx.extensionSettings[MODULE_NAME].finance = {
      incomeTags: [],
      expenseTags: [],
      records: []
    };

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
    
    ctx.extensionSettings[MODULE_NAME].music = [];

    saveSettings();

    // 清除 localStorage
    clearLocalStorage('wardrobe');
    clearLocalStorage('finance');
    clearLocalStorage('pomodoro');
    clearLocalStorage('music');

    // 清除世界书条目
    await clearWorldEntry('睡眠');
    await clearWorldEntry('饮食');
    await clearWorldEntry('心理');
    await clearWorldEntry('冥想');
    await clearWorldEntry('思维链');
    await clearWorldEntry('忏悔');
    await clearWorldEntry('注意力转移');
    await clearWorldEntry('运动');
    await clearWorldEntry('心愿');
    await clearWorldEntry('习惯');
    await clearWorldEntry('待办');
    await clearWorldEntry('memo');
    await clearWorldEntry('衣柜');
    await clearWorldEntry('收入');
    await clearWorldEntry('支出');
    await clearWorldEntry('专注记录');
    await clearWorldEntry('专注统计');
    await clearWorldEntry('❤️音乐');
    await clearWorldEntry('🖤音乐');

    alert('全部数据已清空（保留API配置）');
  }

  // 解析文本日期时间格式 "2025/10/12 15:05:36"
  function parseTextDate(line) {
    const match = line.match(/^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/);
    if (match) {
      return new Date(match[1].replace(/\//g, '-'));
    }
    return null;
  }

  // 解析待办截止日期 "截止:2025-10-17T00:00"
  function parseTodoDate(line) {
    const match = line.match(/截止:(\d{4}-\d{2}-\d{2}T?\d{0,2}:?\d{0,2})/);
    if (match) {
      return new Date(match[1]);
    }
    return null;
  }

  // 检查待办是否已完成
  function isTodoCompleted(line) {
    return line.includes('[完成]') || line.includes('[过期]');
  }

  // 清除过期数据
  async function clearExpiredData(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTime = cutoffDate.getTime();

    debugLog(`开始清除 ${days} 天前的数据，截止时间: ${cutoffDate.toLocaleString()}`);

    const settings = ctx.extensionSettings[MODULE_NAME] || {};
    
    // 从世界书读取数据并清除
    const fileId = await findHealthWorldFile();
    if (!fileId) {
      debugLog('未找到世界书文件，无法清除');
      alert('未找到世界书文件');
      return;
    }

    const moduleWI = await import('/scripts/world-info.js');
    const worldInfo = await moduleWI.loadWorldInfo(fileId);
    const entries = worldInfo.entries || {};

    // 时间相关模块 - 按照时间删除localStorage和世界书
    const timeBasedModules = {
      '睡眠': 'sleep',
      '饮食': 'diet',
      '心理': 'mental',
      '冥想': 'meditation',
      '思维链': 'thoughtChains',
      '忏悔': 'confessions',
      '运动': 'exercise',
      'memo': 'memo'
    };
    
    for (const [entryName, storageKey] of Object.entries(timeBasedModules)) {
      // 查找对应的世界书条目
      let targetUID = null;
      let targetEntry = null;
      
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes(entryName) || entry.title === entryName)) {
          targetUID = entry.uid;
          targetEntry = entry;
          debugLog(`找到条目: ${entryName}, uid=${targetUID}`);
          break;
        }
      }

      if (!targetEntry || !targetEntry.content) {
        debugLog(`条目 ${entryName} 无内容，跳过`);
        continue;
      }

      // 按行分割内容
      const lines = targetEntry.content.split('\n');
      const filteredLines = [];
      let removed = 0;

      for (const line of lines) {
        if (!line.trim()) {
          filteredLines.push(line);
          continue;
        }

        const lineDate = parseTextDate(line);
        if (lineDate && lineDate.getTime() < cutoffTime) {
          removed++;
          debugLog(`删除过期行: ${line.substring(0, 50)}...`);
        } else {
          filteredLines.push(line);
        }
      }

      if (removed > 0) {
        debugLog(`${entryName}: 删除 ${removed} 条过期数据，剩余 ${filteredLines.length} 行`);
        const newContent = filteredLines.join('\n');
        await updateWorldEntry(entryName, newContent);
        
        // 同时清除localStorage中的过期数据
        if (settings[storageKey] && Array.isArray(settings[storageKey])) {
          const originalLength = settings[storageKey].length;
          settings[storageKey] = settings[storageKey].filter(item => {
            const itemDate = item.ts ? new Date(item.ts) : null;
            return !itemDate || itemDate.getTime() >= cutoffTime;
          });
          const removedFromStorage = originalLength - settings[storageKey].length;
          if (removedFromStorage > 0) {
            debugLog(`${storageKey}: 从localStorage删除 ${removedFromStorage} 条过期数据`);
          }
        }
      }
    }

    // 待办(todo): 仅清除过期且已完成的
    let todoUID = null;
    let todoEntry = null;
    
    for (const id in entries) {
      const entry = entries[id];
      const comment = entry.comment || '';
      if (!entry.disable && (comment.includes('待办') || entry.title === '待办')) {
        todoUID = entry.uid;
        todoEntry = entry;
        debugLog(`找到待办条目, uid=${todoUID}`);
        break;
      }
    }

    if (todoEntry && todoEntry.content) {
      const lines = todoEntry.content.split('\n');
      const filteredLines = [];
      let removed = 0;

      for (const line of lines) {
        if (!line.trim()) {
          filteredLines.push(line);
          continue;
        }

        const todoDate = parseTodoDate(line);
        const isCompleted = isTodoCompleted(line);
        
        // 只删除过期且已完成的
        if (todoDate && todoDate.getTime() < cutoffTime && isCompleted) {
          removed++;
          debugLog(`删除过期待办: ${line.substring(0, 50)}...`);
        } else {
          filteredLines.push(line);
        }
      }

      if (removed > 0) {
        debugLog(`待办: 删除 ${removed} 条过期且已完成的待办，剩余 ${filteredLines.length} 行`);
        const newContent = filteredLines.join('\n');
        await updateWorldEntry('待办', newContent);
        clearLocalStorage('todo');
      }
    }

    // 用户衣柜(wardrobe): localStorage不删除，清空世界书条目
    let wardrobeUID = null;
    let wardrobeEntry = null;
    
    for (const id in entries) {
      const entry = entries[id];
      const comment = entry.comment || '';
      if (!entry.disable && (comment.includes('衣柜') || entry.title === '衣柜')) {
        wardrobeUID = entry.uid;
        wardrobeEntry = entry;
        debugLog(`找到衣柜条目, uid=${wardrobeUID}`);
        break;
      }
    }

    if (wardrobeEntry && wardrobeEntry.content) {
      await clearWorldEntry('衣柜');
      debugLog('衣柜世界书条目已清空');
    }

    // 注意力转移: 清空世界书条目
    await clearWorldEntry('注意力转移');
    debugLog('注意力转移世界书条目已清空');

    // 收支平衡(finance)、心愿清单(wishes)、音乐(music): 不删除
    debugLog(`finance, wishes, music: 跳过清除（保留所有数据）`);

    // 番茄钟(pomodoro)和习惯(social): 不删除
    debugLog(`pomodoro, social: 跳过清除（保留所有数据）`);

    // 同步更新extensionSettings
    saveSettings();
    debugLog(`清除完成！`);
    alert(`已清除 ${days} 天前的过期数据`);
  }

  // 设置定期清除
  function setupAutoClear() {
    const settings = ctx.extensionSettings[MODULE_NAME] || {};
    const mode = settings.autoClearMode;
    
    if (!mode) {
      debugLog('未设置自动清除模式');
      return;
    }

    const lastClear = settings.lastAutoClear || 0;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    let shouldClear = false;
    
    if (mode === 1) {
      // 每天清除
      shouldClear = (now - lastClear) >= dayMs;
    } else if (mode === 7) {
      // 每7天清除
      shouldClear = (now - lastClear) >= (7 * dayMs);
    } else if (mode === 30) {
      // 每30天清除
      shouldClear = (now - lastClear) >= (30 * dayMs);
    }

    if (shouldClear) {
      debugLog(`自动清除模式: ${mode}天，执行清除`);
      clearExpiredData(mode).then(() => {
        settings.lastAutoClear = now;
        saveSettings();
      });
    }
  }

  // 按钮事件
  document.getElementById('ha-clear-sleep').addEventListener('click', clearSleep);
  document.getElementById('ha-clear-diet').addEventListener('click', clearDiet);
  document.getElementById('ha-clear-mental').addEventListener('click', clearMental);
  document.getElementById('ha-clear-exercise').addEventListener('click', clearExercise);
  document.getElementById('ha-clear-wishes').addEventListener('click', clearWishes);
  document.getElementById('ha-clear-social').addEventListener('click', clearSocial);
  document.getElementById('ha-clear-todo').addEventListener('click', clearTodo);
  document.getElementById('ha-clear-memo').addEventListener('click', clearMemo);
  document.getElementById('ha-clear-wardrobe').addEventListener('click', clearWardrobe);
  document.getElementById('ha-clear-finance').addEventListener('click', clearFinance);
  document.getElementById('ha-clear-pomodoro').addEventListener('click', clearPomodoro);
  document.getElementById('ha-clear-music').addEventListener('click', clearMusic);
  document.getElementById('ha-clear-all').addEventListener('click', clearAll);

  // 周期清除按钮
  document.getElementById('ha-clear-1day').addEventListener('click', async () => {
    await clearExpiredData(1);
    document.querySelectorAll('.ha-period-btn').forEach(btn => {
      btn.style.backgroundColor = '';
      btn.style.color = '';
    });
    document.getElementById('ha-clear-1day').style.backgroundColor = '#dc3545';
    document.getElementById('ha-clear-1day').style.color = '#fff';
    ctx.extensionSettings[MODULE_NAME].autoClearMode = 1;
    saveSettings();
  });

  document.getElementById('ha-clear-7day').addEventListener('click', async () => {
    await clearExpiredData(7);
    document.querySelectorAll('.ha-period-btn').forEach(btn => {
      btn.style.backgroundColor = '';
      btn.style.color = '';
    });
    document.getElementById('ha-clear-7day').style.backgroundColor = '#dc3545';
    document.getElementById('ha-clear-7day').style.color = '#fff';
    ctx.extensionSettings[MODULE_NAME].autoClearMode = 7;
    saveSettings();
  });

  document.getElementById('ha-clear-1month').addEventListener('click', async () => {
    await clearExpiredData(30);
    document.querySelectorAll('.ha-period-btn').forEach(btn => {
      btn.style.backgroundColor = '';
      btn.style.color = '';
    });
    document.getElementById('ha-clear-1month').style.backgroundColor = '#dc3545';
    document.getElementById('ha-clear-1month').style.color = '#fff';
    ctx.extensionSettings[MODULE_NAME].autoClearMode = 30;
    saveSettings();
  });

  document.getElementById('ha-auto-clear').addEventListener('click', () => {
    const settings = ctx.extensionSettings[MODULE_NAME] || {};
    if (!settings.autoClearMode) {
      alert('请先选择清除周期（1天/7天/1月）');
      return;
    }
    debugLog(`启动自动清除模式: ${settings.autoClearMode}天`);
    setupAutoClear();
    alert(`自动清除已启动，将按 ${settings.autoClearMode} 天周期清除过期数据`);
  });

  // 加载设置并初始化
  loadClearMode();
  setupAutoClear();
}



      // ------------- 完整独立 API 配置模块（集成参考代码） -------------
