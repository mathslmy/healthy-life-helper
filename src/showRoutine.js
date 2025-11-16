export async function showRoutine(MODULE_NAME, ctx, saveSettings, debugLog, content){  
  const container = content;  
  container.style.display = 'block';  
  container.innerHTML = `  
    <div style="font-weight:600;margin-bottom:6px">规律作息</div>  
    <div style="display:flex;gap:8px;margin-bottom:6px">  
      <button id="ha-wake" class="ha-btn" style="flex:1">起床打卡</button>  
      <button id="ha-sleep" class="ha-btn" style="flex:1">入睡打卡</button>  
    </div>  
    <div style="display:flex;gap:8px;margin-bottom:6px">  
      <button id="ha-wake-manual" class="ha-btn" style="flex:1">手动起床</button>  
      <button id="ha-sleep-manual" class="ha-btn" style="flex:1">手动入睡</button>  
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
    </div>
    <div id="ha-routine-log" class="ha-small"></div>  
  `;  
  const wakeBtn = document.getElementById('ha-wake');  
  const sleepBtn = document.getElementById('ha-sleep');  
  const wakeManualBtn = document.getElementById('ha-wake-manual');  
  const sleepManualBtn = document.getElementById('ha-sleep-manual');  
  const logEl = document.getElementById('ha-routine-log');  
  const subPanel = document.getElementById('ha-subpanel');
  async function findHealthWorldFile() {  
    try {  
      const moduleWI = await import('/scripts/world-info.js');  
      const selected = moduleWI.selected_world_info || [];  
      console.log('[健康生活助手] selected_world_info:', selected);
      for (const WI of selected) {  
        if (WI.includes('健康生活助手')) {  
          toastr.info('匹配到世界书文件: ' + WI, '世界书');
          return WI;  
        }  
      }  
      toastr.warning('未找到名为 "健康生活助手" 的世界书文件', '世界书');
      return null;  
    } catch (e) {  
      toastr.error('查找世界书文件异常: ' + (e.message || e), '错误');
      return null;  
    }  
  }  
  async function appendToWorldInfoSleepLog(type, label){  
    try {  
      const fileId = await findHealthWorldFile();  
      if (!fileId) { 
        toastr.warning('未找到世界书文件，跳过写入', '写入世界书'); 
        return; 
      }  
      const moduleWI = await import('/scripts/world-info.js');  
      const worldInfo = await moduleWI.loadWorldInfo(fileId);  
      const entries = worldInfo.entries || {};  
      let targetUID = null;  
      for (const id in entries) {  
        const entry = entries[id];  
        const comment = entry.comment || '';  
        if (!entry.disable && (comment.includes('睡眠') || comment.includes('健康生活助手/睡眠') || entry.title === '睡眠' )) {  
          targetUID = entry.uid;  
          break;  
        }  
      }  
      if (!targetUID) {  
        toastr.warning('未找到睡眠 entry（未创建），写入被跳过', '世界书');
        return;  
      }  
      const recLine = `${type === 'wake' ? '起床' : '入睡'} 打卡 @ ${label}`;  
      const existing = entries[targetUID].content || '';  
      const newContent = existing + (existing ? '\n' : '') + recLine;  
      await globalThis.SillyTavern.getContext()  
        .SlashCommandParser.commands['setentryfield']  
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);  
      toastr.success('已写入世界书: ' + recLine, '写入成功');
    } catch (e) {  
      toastr.error('写入世界书失败: ' + (e.message || e), '错误');
    }  
  }  
  function appendSleepRecord(type, customTime = null){  
    const now = customTime || new Date();  
    const rec = { type, ts: now.toISOString(), label: now.toLocaleString() };  
    ctx.extensionSettings[MODULE_NAME].sleep.push(rec);  
    saveSettings();  
    const text = `${type === 'wake' ? '起床' : '入睡'} 打卡：\n${now.toLocaleString()}`;  
    toastr.success(text, '打卡成功');
    renderLog();  
    appendToWorldInfoSleepLog(type, now.toLocaleString());  
  }  
  // 手动选择时间的函数
  function openManualTimeDialog(type) {
    const typeText = type === 'wake' ? '起床' : '入睡';
    const dialog = document.createElement('div');
    
    dialog.innerHTML = `
      <div style="background:#fff;padding:8px;border-radius:6px;box-shadow:0 1px 6px rgba(0,0,0,0.12);max-width:320px;margin:auto;">
        <div style="font-weight:600;margin-bottom:6px;">手动${typeText}打卡</div>
        <label style="font-size:13px">日期:</label><br>
        <input id="manual-sleep-date" type="date" style="width:100%;margin-bottom:6px;padding:4px;"><br>
        <label style="font-size:13px">时间:</label><br>
        <input id="manual-sleep-time" type="time" style="width:100%;margin-bottom:6px;padding:4px;"><br>
        <div style="text-align:right;margin-top:8px;">
          <button id="manual-sleep-ok" class="ha-btn">确定</button>
          <button id="manual-sleep-cancel" class="ha-btn" style="margin-left:6px;">取消</button>
        </div>
      </div>
    `;
    
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '8px',
      left: '8px',
      right: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    });
    
    container.appendChild(dialog);
    
    // 设置默认值为当前时间
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    dialog.querySelector('#manual-sleep-date').value = dateStr;
    dialog.querySelector('#manual-sleep-time').value = timeStr;
    
    dialog.querySelector('#manual-sleep-cancel').onclick = () => dialog.remove();
    dialog.querySelector('#manual-sleep-ok').onclick = () => {
      const date = dialog.querySelector('#manual-sleep-date').value;
      const time = dialog.querySelector('#manual-sleep-time').value;
      
      if (!date || !time) {
        toastr.warning('请选择完整的日期和时间', '输入不完整');
        return;
      }
      
      const selectedDateTime = new Date(`${date}T${time}`);
      
      if (isNaN(selectedDateTime.getTime())) {
        toastr.error('无效的日期时间', '错误');
        return;
      }
      
      appendSleepRecord(type, selectedDateTime);
      dialog.remove();
    };
  }
  wakeBtn.addEventListener('click', () => appendSleepRecord('wake'));  
  sleepBtn.addEventListener('click', () => appendSleepRecord('sleep'));  
  wakeManualBtn.addEventListener('click', () => openManualTimeDialog('wake'));
  sleepManualBtn.addEventListener('click', () => openManualTimeDialog('sleep'));
  // 助眠按钮
  document.getElementById('ha-sleep-help').addEventListener('click', async () => {  
    const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};  
    subPanel.innerText = '正在获取助眠建议...';  
    subPanel.scrollTop = subPanel.scrollHeight;
    if (!api.url) {  
      subPanel.innerText = '未配置独立 API，默认提示：保持卧室安静、黑暗，避免咖啡因，睡前放松。';  
      subPanel.scrollTop = subPanel.scrollHeight;  
      toastr.info('未配置 API，显示默认提示', '助眠');
      return;  
    }  
    try {  
      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';  
      toastr.info('正在请求助眠建议...', 'API 调用');
      
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
      
      if (!res.ok) throw new Error('HTTP ' + res.status);  
      const data = await res.json();  
      const text = data.choices?.[0]?.message?.content || (data.result || JSON.stringify(data));  
      subPanel.innerText = text;  
      subPanel.scrollTop = subPanel.scrollHeight;  
      toastr.success('助眠建议已生成', 'API 调用成功');
    } catch (e) {  
      subPanel.innerText = 'API 请求失败：' + (e.message || e);  
      subPanel.scrollTop = subPanel.scrollHeight;  
      toastr.error('助眠调用失败: ' + (e.message || e), 'API 错误');
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
          break;  
        }  
      }  
      if (!targetContent) { 
        subPanel.innerText = '世界书中未找到睡眠条目或内容为空'; 
        subPanel.scrollTop = subPanel.scrollHeight;  
        toastr.warning('睡眠条目为空', '分析');
        return; 
      }  
      const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};  
      if (!api.url) {  
        subPanel.innerText = '未配置独立 API，无法进行分析。';  
        subPanel.scrollTop = subPanel.scrollHeight;  
        toastr.warning('未配置 API', '分析');
        return;  
      }  
      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';  
      toastr.info('正在分析睡眠质量...', 'API 调用');
      
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
      
      if (!res.ok) throw new Error('HTTP ' + res.status);  
      const data = await res.json();  
      const text = data.choices?.[0]?.message?.content || JSON.stringify(data);  
      subPanel.innerText = text;  
      subPanel.scrollTop = subPanel.scrollHeight;  
      toastr.success('睡眠质量分析完成', 'API 调用成功');
    } catch (e) {  
      subPanel.innerText = '分析失败：' + (e.message || e);  
      subPanel.scrollTop = subPanel.scrollHeight;  
      toastr.error('分析异常: ' + (e.message || e), '错误');
    }  
  });
  function renderLog(){  
    const arr = ctx.extensionSettings[MODULE_NAME].sleep || [];  
    logEl.innerText = `已记录 ${arr.length} 条（存储在扩展设置与世界书中）`;  
  }  
  renderLog();  
}

  
