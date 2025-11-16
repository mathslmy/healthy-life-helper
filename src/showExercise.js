export async function showExercise(MODULE_NAME, ctx, saveSettings, debugLog, content) {
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
