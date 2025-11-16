export async function showSocial(MODULE_NAME, ctx, saveSettings, debugLog, content) {
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

