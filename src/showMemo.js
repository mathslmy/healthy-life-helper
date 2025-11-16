export async function showMemo(MODULE_NAME, ctx, saveSettings, debugLog, content) {
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




// 🎵 最终完整解决方案 - 可直接替换使用












// ==================== 使用说明 ====================

/**
 * 使用方法:
 * 
 * 1. 完整替换你的 playSong() 函数
 * 2. 确保 getMusicUrl() 函数已经是改进版(双平台支持)
 * 3. 确保页面有 id="ha-music-lyrics" 的歌词容器
 * 4. 确保 toaster() 函数可用
 * 
 * 核心改进:
 * ✅ 歌词先加载并立即显示
 * ✅ "正在搜索音源"提示追加在底部(不覆盖歌词)
 * ✅ 音源加载完成后自动移除提示
 * ✅ 错误信息也追加在底部
 * ✅ 所有状态提示都使用 appendChild,不用 textContent
 * 
 * 测试建议:
 * 1. 测试有歌词的歌曲
 * 2. 测试无歌词的歌曲
 * 3. 测试找不到音源的情况
 * 4. 测试网络异常情况
 */


// 🎵 修复点击冲突的版本

// 问题分析：
// 1. 播放器的外层 popup 有全屏半透明背景 (width: 100%, height: 100%)
// 2. 这个背景层的 z-index: 99998
// 3. 悬浮栏的 z-index: 99999
// 4. 当播放器隐藏时(display: none)，背景层也隐藏了
// 5. 但点击悬浮栏时，会先显示播放器(包括背景层)
// 6. 背景层立即覆盖了悬浮栏，导致无法继续交互






// 🎵 重构版 showBgm - 使用全局单例模式管理播放器和悬浮栏

// 🎵 完整的 showBgm 函数 - 包含悬浮栏功能

// 🎵 修复后的完整 showBgm 函数
// 修复内容:
// 1. 播放器位置改为 left:10px; top:50px;
// 2. 悬浮栏宽度280px + 位置记忆
// 3. 点击🎵返回播放器不会重新播放(保持播放状态)

