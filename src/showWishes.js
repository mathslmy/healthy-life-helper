export async function showWishes(MODULE_NAME, ctx, saveSettings, debugLog, content) {
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

