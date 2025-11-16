export async function showDiet(MODULE_NAME, ctx, saveSettings, debugLog, content) {
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

