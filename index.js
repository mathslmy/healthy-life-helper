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
          <div class="ha-btn" data-key="wishes">心愿清单</div>
          <div class="ha-btn" data-key="social">习惯养成</div>
          <div class="ha-btn" data-key="todo">待办事项</div>
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
          else if (key === 'wishes') showWishes();
          else if (key === 'social') showSocial();
          else if (key === 'todo') showTodo();
          else if (key === 'clearbook') showClearBook();
          else if (key === 'apiconf') showApiConfig();
        });
      });

      // --------- 各模块内容（最小实现） ----------
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
        max_tokens: 2000  
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
        max_tokens: 2000 
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
          max_tokens: 2000
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
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">心理健康</div>
    <button id="ha-emotion" class="ha-btn" style="width:100%;margin-bottom:6px">情绪记录</button>
    <div style="margin-bottom:6px">
      <label style="display:block;font-size:12px;color:#666">正面冥想计时（分钟，0=即时指导）</label>
      <input id="ha-meditation-min" type="range" min="0" max="30" step="5" value="5" style="width:200px"/>
      <span id="ha-meditation-val">5</span> 分钟
      <button id="ha-start-medit" class="ha-btn" style="margin-left:8px">开始</button>
    </div>
    <div id="ha-mental-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
    </div>
    <div id="ha-mental-log" class="ha-small"></div>
    <div id="ha-mental-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>
  `;

  const logEl = document.getElementById('ha-mental-log');
  const debugEl = document.getElementById('ha-mental-debug');
  const subPanel = document.getElementById('ha-mental-subpanel');
  const slider = document.getElementById('ha-meditation-min');
  const sliderVal = document.getElementById('ha-meditation-val');

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
      if (!fileId) { debugLog('写入世界书: 未找到世界书文件，跳过写入'); return; }

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

  document.getElementById('ha-emotion').addEventListener('click', () => {
    const txt = prompt('记录当前情绪（例如：轻松 / 焦虑 / 愉快）：','');
    if (!txt) return;
    const now = new Date();
    ctx.extensionSettings[MODULE_NAME].mental.push({ text: txt, ts: now.toISOString() });
    saveSettings();
    alert('情绪已记录');
    renderLog();
    appendToWorldInfoMentalLog(txt);
  });

  document.getElementById('ha-start-medit').addEventListener('click', async () => {
    const mins = Number(slider.value);
    subPanel.innerText = `正在准备正念指导（${mins} 分钟）...`;
    subPanel.scrollTop = subPanel.scrollHeight;

    try {
      const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
      if (!api.url) {
        subPanel.innerText = '未配置独立 API，示例提示：深呼吸、放松身体、正念冥想。';
        debugLog('正念指导: 未配置 API');
        return;
      }

      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
      debugLog('正念指导调用: 请求将发送到', endpoint, 'model:', api.model);

      const history = ctx.extensionSettings[MODULE_NAME].mental.map(m => `${m.ts}：${m.text}`).join('\n');
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
          max_tokens: 2000
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
          max_tokens: 2000
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
    <div id="ha-wish-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>
  `;

  const listEl = document.getElementById('ha-wish-list');
  const subPanel = document.getElementById('ha-wish-subpanel');
  const debugEl = document.getElementById('ha-wish-debug');

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

  async function appendToWorldInfoWishLog(wishObj) {
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
        if (!entry.disable && (comment.includes('心愿') || entry.title === '心愿')) {
          targetUID = entry.uid;
          debugLog('找到心愿 entry: uid=', targetUID, 'comment=', comment);
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

      debugLog('准备写入 world entry:', { file: fileId, uid: targetUID });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);

      debugLog('写入世界书成功，当前心愿条目行数:', arr.length);
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
        appendToWorldInfoWishLog(arr[i]);
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
        appendToWorldInfoWishLog(arr[i]);
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
        appendToWorldInfoWishLog({});
      });
      div.appendChild(btnDel);

      listEl.appendChild(div);
    });
    appendToWorldInfoWishLog({});
  }

  document.getElementById('ha-wish-add').addEventListener('click', ()=>{
    const txt = prompt('输入心愿：','');
    if (!txt) return;
    if (!ctx.extensionSettings[MODULE_NAME].wishes) ctx.extensionSettings[MODULE_NAME].wishes=[];
    ctx.extensionSettings[MODULE_NAME].wishes.push({text: txt, done:false});
    saveSettings();
    render();
  });

  render();
}

      async function showSocial() {
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">社会化</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-social-config" class="ha-btn" style="flex:1">配置新习惯</button>
    </div>
    <div id="ha-social-list" class="ha-small" style="margin-bottom:6px"></div>
    <div id="ha-social-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
    </div>
    <div id="ha-social-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>
  `;

  const listEl = document.getElementById('ha-social-list');
  const subPanel = document.getElementById('ha-social-subpanel');
  const debugEl = document.getElementById('ha-social-debug');

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

  async function appendToWorldInfoHabitLog() {
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
        if (!entry.disable && (comment.includes('习惯') || entry.title === '习惯')) {
          targetUID = entry.uid;
          debugLog('找到习惯 entry: uid=', targetUID, 'comment=', comment);
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

      debugLog('准备写入 world entry:', { file: fileId, uid: targetUID });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);

      debugLog('写入世界书成功，当前习惯条目行数:', arr.length);
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
    appendToWorldInfoHabitLog();
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
  });

  render();
}
async function showTodo() {
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">待办事项</div>
    <div style="margin-bottom:6px;">
      <button id="ha-todo-sort-date" class="ha-btn" style="margin-right:4px">按截止日期排序</button>
      <button id="ha-todo-sort-priority" class="ha-btn">按优先级排序</button>
      <button id="ha-todo-add-btn" class="ha-btn" style="margin-left:8px">添加待办</button>
    </div>
    <div id="ha-todo-list" class="ha-small" style="margin-bottom:6px;"></div>
    <div id="ha-todo-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
    </div>
    <div id="ha-todo-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>
  `;

  const listEl = document.getElementById('ha-todo-list');
  const subPanel = document.getElementById('ha-todo-subpanel');
  const debugEl = document.getElementById('ha-todo-debug');

  function debugLog(...args) {
    const ts = new Date().toLocaleTimeString();
    const msg = `[${ts}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    debugEl.innerText += msg + "\n";
    debugEl.scrollTop = debugEl.scrollHeight;
    console.log('[健康生活助手]', ...args);
  }

  if (!ctx.extensionSettings[MODULE_NAME].todo) ctx.extensionSettings[MODULE_NAME].todo = [];
  let todos = ctx.extensionSettings[MODULE_NAME].todo;

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

  async function appendToWorldInfoTodoLog() {
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
        if (!entry.disable && (comment.includes('待办') || entry.title === '待办')) {
          targetUID = entry.uid;
          debugLog('找到待办 entry: uid=', targetUID, 'comment=', comment);
          break;
        }
      }

      if (!targetUID) {
        debugLog('未找到待办 entry（未创建），写入被跳过。');
        return;
      }

      const arr = todos.map((t,i)=>{
        const due = t.due ? `截止:${t.due}` : '';
        const status = t.done ? '完成' : (new Date() > new Date(t.due) ? '过期' : '进行中');
        return `${i+1}. [${status}] ${t.name} 优先:${t.priority} 标签:${t.tag} ${due}`;
      });

      const newContent = arr.join('\n');

      debugLog('准备写入 world entry:', { file: fileId, uid: targetUID });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);

      debugLog('写入世界书成功，当前待办条目行数:', arr.length);
    } catch (e) {
      debugLog('写入世界书失败:', e.message || e);
    }
  }

  function render(sortMode='date') {
    let arr = [...todos];
    if (sortMode === 'date') {
      arr.sort((a,b)=>new Date(a.due||0)-new Date(b.due||0));
    } else if (sortMode === 'priority') {
      arr.sort((a,b)=>b.priority-a.priority);
    }

    listEl.innerHTML = '';
    arr.forEach((t,i)=>{
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.marginBottom = '4px';

      const status = t.done ? '完成' : (new Date() > new Date(t.due) ? '过期' : '进行中');
      const dueText = t.due ? `截止:${t.due}` : '';
      const textSpan = document.createElement('span');
      textSpan.style.flex = '1';
      textSpan.innerText = `${i+1}. [${status}] ${t.name} 优先:${t.priority} 标签:${t.tag} ${dueText}`;
      div.appendChild(textSpan);

      const btnDone = document.createElement('button');
      btnDone.innerText = '完成';
      btnDone.className = 'ha-btn';
      btnDone.style.marginLeft = '4px';
      btnDone.addEventListener('click', ()=>{
        t.done = true;
        saveSettings();
        render(sortMode);
        appendToWorldInfoTodoLog();
      });
      div.appendChild(btnDone);

      const btnEdit = document.createElement('button');
      btnEdit.innerText = '编辑';
      btnEdit.className = 'ha-btn';
      btnEdit.style.marginLeft = '4px';
      btnEdit.addEventListener('click', ()=>{
        const name = prompt('待办名称', t.name);
        if (name===null) return;
        const due = prompt('截止日期时间 (YYYY-MM-DD HH:MM)', t.due || '');
        if (due===null) return;
        const priority = parseInt(prompt('优先级 (1-5)', t.priority||3));
        if (isNaN(priority)) return;
        const tag = prompt('标签', t.tag||'');
        t.name=name; t.due=due; t.priority=priority; t.tag=tag;
        saveSettings();
        render(sortMode);
        appendToWorldInfoTodoLog();
      });
      div.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.innerText = '删除';
      btnDel.className = 'ha-btn';
      btnDel.style.marginLeft = '4px';
      btnDel.addEventListener('click', ()=>{
        if (!confirm('确认删除该待办？')) return;
        todos.splice(todos.indexOf(t),1);
        saveSettings();
        render(sortMode);
        appendToWorldInfoTodoLog();
      });
      div.appendChild(btnDel);

      listEl.appendChild(div);
    });

    appendToWorldInfoTodoLog();
  }

  document.getElementById('ha-todo-add-btn').addEventListener('click', ()=>{
    const name = prompt('待办名称','');
    if (!name) return;
    const due = prompt('截止日期时间 (YYYY-MM-DD HH:MM)','');
    const priority = parseInt(prompt('优先级 (1-5)','3')) || 3;
    const tag = prompt('标签','');
    const id = 'todo_' + Date.now();
    todos.push({ id, name, due, priority, tag, done:false });
    saveSettings();
    render();
  });

  document.getElementById('ha-todo-sort-date').addEventListener('click', ()=>render('date'));
  document.getElementById('ha-todo-sort-priority').addEventListener('click', ()=>render('priority'));

  render();
}
async function showClearBook() {
  content.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:6px;">
      <button id="ha-clear-sleep" class="ha-clear-btn">清除睡眠数据</button>
      <button id="ha-clear-diet" class="ha-clear-btn">清除饮食数据</button>
      <button id="ha-clear-mental" class="ha-clear-btn">清除心理数据</button>
      <button id="ha-clear-exercise" class="ha-clear-btn">清除运动数据</button>
      <button id="ha-clear-wishes" class="ha-clear-btn">清除心愿数据</button>
      <button id="ha-clear-social" class="ha-clear-btn">清除习惯数据</button>
      <button id="ha-clear-todo" class="ha-clear-btn">清除待办数据</button>
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
        if(!entry.disable && (comment.includes(entryName) || entry.title === entryName)){
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

  async function clearAll(){
    await clearSleep();
    await clearDiet();
    await clearMental();
    await clearExercise();
    await clearWishes();
    await clearSocial();
    await clearTodo();
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