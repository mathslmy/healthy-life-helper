export async function showMental(MODULE_NAME, ctx, saveSettings, debugLog, content) {
    content.style.display = 'block';
    content.innerHTML = `<div style="font-weight:600;margin-bottom:6px">心理健康</div>
        <div style="margin-bottom:6px">
            <button id="ha-emotion" class="ha-btn" style="margin-bottom:6px">情绪记录</button>
            <button id="ha-attention-shift" class="ha-btn" style="margin-bottom:6px;margin-left:6px">转移注意力</button>
            <button id="ha-thought-chain" class="ha-btn" style="margin-bottom:6px;margin-left:6px">思维链识别</button>
        </div>
        <div style="margin-bottom:6px">
            <button id="ha-confession" class="ha-btn" style="margin-bottom:6px">忏悔室</button>
            <button id="ha-listen-confession" class="ha-btn" style="margin-bottom:6px;margin-left:6px">聆听忏悔</button>
            <button id="ha-mental-stats" class="ha-btn" style="margin-bottom:6px;margin-left:6px">心理统计</button>
        </div>
        <div style="margin-bottom:6px">
            <label style="display:block;font-size:12px;color:#666">正念冥想计时(分钟,0=即时指导)</label>
            <input id="ha-meditation-min" type="range" min="0" max="30" step="5" value="5" style="width:150px"/>
            <span id="ha-meditation-val">5</span> 分钟
            <span id="ha-medit-timer" style="margin-left:12px;color:#007acc;font-weight:600"></span>
            <button id="ha-start-medit" class="ha-btn" style="margin-left:8px">开始</button>
            <button id="ha-stop-medit" class="ha-btn" style="margin-left:8px;display:none">结束</button>
        </div>
        <div id="ha-mental-subpanel" style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
        </div>
        <div id="ha-mental-log" class="ha-small"></div>`;
    
    const logEl = document.getElementById('ha-mental-log');
    const subPanel = document.getElementById('ha-mental-subpanel');
    const slider = document.getElementById('ha-meditation-min');
    const sliderVal = document.getElementById('ha-meditation-val');
    const timerEl = document.getElementById('ha-medit-timer');
    const btnStart = document.getElementById('ha-start-medit');
    const btnStop = document.getElementById('ha-stop-medit');
    let timerId = null;
    let startTime = null;
    let targetDuration = 0;
    
    slider.addEventListener('input', () => {
        sliderVal.innerText = slider.value;
    });
    
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
            toastr.error('查找世界书文件失败: ' + e.message);
            return null;
        }
    }
    
    // === 通用函数: 追加到世界书条目 ===
    async function appendToWorldInfoEntry(keyword, contentText) {
        try {
            const fileId = await findHealthWorldFile();
            if (!fileId) {
                toastr.warning('未找到世界书文件');
                return;
            }
            const moduleWI = await import('/scripts/world-info.js');
            const worldInfo = await moduleWI.loadWorldInfo(fileId);
            const entries = worldInfo.entries || {};
            
            let targetUID = null;
            for (const id in entries) {
                const entry = entries[id];
                const comment = entry.comment || '';
                if (!entry.disable && (comment.includes(keyword) || entry.title === keyword)) {
                    targetUID = entry.uid;
                    break;
                }
            }
            
            if (!targetUID) {
                toastr.warning(`未找到"${keyword}"条目`);
                return;
            }
            
            const recLine = `${new Date().toLocaleString()}:${contentText}`;
            const existing = entries[targetUID].content || '';
            const newContent = existing + (existing ? '\n' : '') + recLine;
            
            await globalThis.SillyTavern.getContext()
                .SlashCommandParser.commands['setentryfield']
                .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
            
            toastr.success(`已同步到世界书"${keyword}"条目`);
        } catch (e) {
            toastr.error(`写入世界书失败: ${e.message}`);
        }
    }
    
    // === 从localStorage获取条目 ===
    function getLocalStorageEntries(storageKey) {
        const entries = ctx.extensionSettings[MODULE_NAME][storageKey] || [];
        return entries.map((entry, index) => ({
            text: entry.text || entry,
            ts: entry.ts || '',
            index: index,
            enabled: entry.enabled !== false // 默认启用
        }));
    }
    
    // === 删除localStorage中的条目 ===
    function deleteLocalStorageEntry(storageKey, index) {
        if (!ctx.extensionSettings[MODULE_NAME][storageKey]) return;
        ctx.extensionSettings[MODULE_NAME][storageKey].splice(index, 1);
        saveSettings();
    }
    
    // === 更新localStorage中条目的启用状态 ===
    function updateLocalStorageEntryEnabled(storageKey, index, enabled) {
        if (!ctx.extensionSettings[MODULE_NAME][storageKey]) return;
        const entry = ctx.extensionSettings[MODULE_NAME][storageKey][index];
        if (typeof entry === 'object') {
            entry.enabled = enabled;
        } else {
            // 如果是旧格式的字符串,转换为对象
            ctx.extensionSettings[MODULE_NAME][storageKey][index] = {
                text: entry,
                ts: new Date().toISOString(),
                enabled: enabled
            };
        }
        saveSettings();
    }
    
    // === 编辑localStorage中的条目 ===
    function editLocalStorageEntry(storageKey, index, newText) {
        if (!ctx.extensionSettings[MODULE_NAME][storageKey]) return;
        const entry = ctx.extensionSettings[MODULE_NAME][storageKey][index];
        if (typeof entry === 'object') {
            entry.text = newText;
        } else {
            ctx.extensionSettings[MODULE_NAME][storageKey][index] = {
                text: newText,
                ts: new Date().toISOString(),
                enabled: true
            };
        }
        saveSettings();
    }
    
    // === 从世界书删除某行 ===
    async function deleteLineFromWorldInfo(keyword, lineText) {
        try {
            const fileId = await findHealthWorldFile();
            if (!fileId) return false;
            
            const moduleWI = await import('/scripts/world-info.js');
            const worldInfo = await moduleWI.loadWorldInfo(fileId);
            const entries = worldInfo.entries || {};
            
            let targetUID = null;
            let targetContent = '';
            for (const id in entries) {
                const entry = entries[id];
                const comment = entry.comment || '';
                if (!entry.disable && (comment.includes(keyword) || entry.title === keyword)) {
                    targetUID = entry.uid;
                    targetContent = entry.content || '';
                    break;
                }
            }
            
            if (!targetUID) return false;
            
            const lines = targetContent.split('\n');
            const newLines = lines.filter(line => line !== lineText);
            const newContent = newLines.join('\n');
            
            await globalThis.SillyTavern.getContext()
                .SlashCommandParser.commands['setentryfield']
                .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
            
            return true;
        } catch (e) {
            toastr.error(`从世界书删除失败: ${e.message}`);
            return false;
        }
    }
    
    // === 读取世界书忏悔内容(用于聆听忏悔) ===
    async function getWorldInfoConfession() {
        try {
            const fileId = await findHealthWorldFile();
            if (!fileId) return '';
            
            const moduleWI = await import('/scripts/world-info.js');
            const worldInfo = await moduleWI.loadWorldInfo(fileId);
            const entries = worldInfo.entries || {};
            
            for (const id in entries) {
                const entry = entries[id];
                const comment = entry.comment || '';
                if (!entry.disable && (comment.includes('忏悔') || entry.title === '忏悔')) {
                    return entry.content || '';
                }
            }
            return '';
        } catch (e) {
            toastr.error('读取忏悔记录失败: ' + e.message);
            return '';
        }
    }
    
    // === 情绪记录 ===
    document.getElementById('ha-emotion').addEventListener('click', () => {
        const txt = prompt('记录当前情绪(例如:轻松 / 焦虑 / 愉快):', '');
        if (!txt) return;
        
        if (!ctx.extensionSettings[MODULE_NAME].mental) {
            ctx.extensionSettings[MODULE_NAME].mental = [];
        }
        
        ctx.extensionSettings[MODULE_NAME].mental.push({
            text: txt,
            ts: new Date().toISOString(),
            enabled: true
        });
        saveSettings();
        toastr.success('情绪已记录');
        renderLog();
        appendToWorldInfoEntry('心理', txt);
    });
    
    // === 思维链识别 ===
    document.getElementById('ha-thought-chain').addEventListener('click', () => {
        const txt = prompt('请输入当前的思维链:', '');
        if (!txt) return;
        
        if (!ctx.extensionSettings[MODULE_NAME].thoughtChains) {
            ctx.extensionSettings[MODULE_NAME].thoughtChains = [];
        }
        
        ctx.extensionSettings[MODULE_NAME].thoughtChains.push({
            text: txt,
            ts: new Date().toISOString(),
            enabled: true
        });
        saveSettings();
        toastr.success('思维链已记录');
        appendToWorldInfoEntry('思维链', txt);
    });
    
    // === 忏悔室 ===
    document.getElementById('ha-confession').addEventListener('click', () => {
        const txt = prompt('请书写最近犯的错:', '');
        if (!txt) return;
        
        if (!ctx.extensionSettings[MODULE_NAME].confessions) {
            ctx.extensionSettings[MODULE_NAME].confessions = [];
        }
        
        ctx.extensionSettings[MODULE_NAME].confessions.push({
            text: txt,
            ts: new Date().toISOString(),
            enabled: true
        });
        saveSettings();
        toastr.success('忏悔已记录');
        appendToWorldInfoEntry('忏悔', txt);
    });
    
    // === 聆听忏悔 ===
    document.getElementById('ha-listen-confession').addEventListener('click', async () => {
        try {
            const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
            if (!api.url) {
                toastr.warning('未配置独立 API');
                return;
            }
            
            subPanel.innerText = '正在聆听忏悔...';
            
            const confessionContent = await getWorldInfoConfession();
            if (!confessionContent) {
                subPanel.innerText = '暂无忏悔记录';
                return;
            }
            
            const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
            
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
                            content: '你是一位富有同理心的心理辅导者,请对用户的忏悔内容给予温和、理解和建设性的回应。'
                        },
                        {
                            role: 'user',
                            content: `以下是用户的忏悔记录:\n${confessionContent}\n\n请给予理解和建议。`
                        }
                    ],
                    max_tokens: 5000
                })
            });
            
            if (!res.ok) throw new Error('HTTP ' + res.status);
            
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
            subPanel.innerText = text;
            subPanel.scrollTop = subPanel.scrollHeight;
            
        } catch (e) {
            subPanel.innerText = 'API 请求失败:' + (e.message || e);
            toastr.error('聆听忏悔失败: ' + e.message);
        }
    });
    
    // === 转移注意力 ===
    document.getElementById('ha-attention-shift').addEventListener('click', async () => {
        try {
            const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
            if (!api.url) {
                toastr.warning('未配置独立 API');
                return;
            }
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
                <button id="modal-loading-close" class="ha-btn" style="margin-top:15px;">关闭</button>
            `;
            document.body.appendChild(modal);
            
            modal.querySelector('#modal-loading-close').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
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
                            content: '生成5个转移注意力的活动建议,每个建议包含活动名称、简短描述和英文图片提示词。\n转移注意力的活动不要太老套,要尽量有趣新颖具体,避免像传统心理咨询那样软绵绵小心翼翼给一些宽泛没什么错却也没什么用的建议。\n英文提示词务必使用以下方式生成:生成符合描述的若干单词短语,将其用%拼接。例如:描述是蓝天下一个女人在街上散步,对应的英文提示词就是a%woman%walking%street%blue%sky,提示词不可出现空格与其他标点符号,必须用%连接,提示词不要太长,选取最符合描述的其中一个画面即可,不要出现数字,使用。\n请严格返回 JSON 数组格式,如:[{"title":"活动","description":"说明","imagePrompt":"英文提示词"}]'
                        },
                        {
                            role: 'user',
                            content: '务必仅返回 JSON,无任何多余文本或注释。'
                        }
                    ],
                    max_tokens: 5000
                })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            let responseText = data.choices?.[0]?.message?.content || '';
            responseText = responseText
                .replace(/^```(?:json)?/i, '')
                .replace(/```$/, '')
                .trim();
            let options;
            try {
                options = JSON.parse(responseText);
                if (typeof options === 'string') {
                    options = JSON.parse(options);
                }
                if (!Array.isArray(options)) throw new Error('不是数组格式');
            } catch (e) {
                toastr.warning('API 返回格式异常,使用默认选项');
                options = [
                    { title: "散步", description: "到户外散步15分钟,呼吸新鲜空气", imagePrompt: "peaceful%walking%nature" },
                    { title: "听音乐", description: "听一些舒缓的音乐放松心情", imagePrompt: "relaxing%headphones%music" },
                    { title: "绘画", description: "随意画画,表达内心感受", imagePrompt: "person%painting%artwork" },
                    { title: "深呼吸", description: "做5分钟深呼吸练习", imagePrompt: "meditation%deep%breathing" },
                    { title: "整理房间", description: "整理一小块区域,获得成就感", imagePrompt: "organizing%clean%room" }
                ];
            }
            options = options.map(opt => ({
                ...opt,
                imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(opt.imagePrompt)}`
            }));
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
                modal.querySelector('#modal-adopt').addEventListener('click', async () => {
                    const selected = options[currentIndex];
                    await appendToWorldInfoEntry('注意力转移', `${selected.title}:${selected.description}`);
                    toastr.success('已采纳注意力转移方案');
                    document.body.removeChild(modal);
                });
                modal.querySelector('#modal-close').addEventListener('click', () => {
                    document.body.removeChild(modal);
                });
            }
            updateModal();
        } catch (e) {
            toastr.error('生成失败:' + (e.message || e));
        }
    });
    
    // === 心理统计 ===
    document.getElementById('ha-mental-stats').addEventListener('click', () => {
        const statsModal = document.createElement('div');
        statsModal.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            max-height: 80vh;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 200000;
            padding: 20px;
            overflow-y: auto;
        `;
        statsModal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
        <h3 style="margin:0;">心理统计</h3>
        <button id="stats-close" class="ha-btn">关闭</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button id="stats-emotion" class="ha-btn">情绪统计</button>
        <button id="stats-meditation" class="ha-btn">正念统计</button>
        <button id="stats-thought" class="ha-btn">思维链统计</button>
        <button id="stats-confession" class="ha-btn">忏悔统计</button>
    </div>
    <div id="stats-content" style="margin-top:15px;"></div>
`;
        document.body.appendChild(statsModal);
        
        statsModal.querySelector('#stats-close').addEventListener('click', () => {
            document.body.removeChild(statsModal);
        });
        
        async function showStatsList(storageKey, keyword) {
            const contentDiv = statsModal.querySelector('#stats-content');
            contentDiv.innerHTML = '<div>加载中...</div>';
            
            const entries = getLocalStorageEntries(storageKey);
            
            if (entries.length === 0) {
                contentDiv.innerHTML = '<div>暂无记录</div>';
                return;
            }
            
            let html = '<div style="max-height:400px;overflow-y:auto;">';
            entries.forEach((entry) => {
                const displayText = entry.text.length > 50 ? entry.text.substring(0, 50) + '...' : entry.text;
                const statusColor = entry.enabled ? '#28a745' : '#6c757d';
                html += `
                    <div style="border:1px solid #ddd;padding:8px;margin:5px 0;border-radius:4px;">
                        <div style="margin-bottom:6px;font-size:13px;color:${statusColor};">
                            ${entry.enabled ? '✓' : '✗'} ${displayText}
                        </div>
                        <div style="display:flex;gap:3px;flex-wrap:wrap;">
                            <button class="ha-btn edit-entry" data-index="${entry.index}" style="font-size:11px;padding:2px 6px;">编辑</button>
                            <button class="ha-btn delete-entry" data-index="${entry.index}" style="font-size:11px;padding:2px 6px;">删除</button>
                            ${entry.enabled 
                                ? `<button class="ha-btn disable-entry" data-index="${entry.index}" style="font-size:11px;padding:2px 6px;">取消启用</button>`
                                : `<button class="ha-btn enable-entry" data-index="${entry.index}" style="font-size:11px;padding:2px 6px;">启用</button>`
                            }
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            contentDiv.innerHTML = html;
            
            // 编辑按钮
            contentDiv.querySelectorAll('.edit-entry').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const index = parseInt(btn.dataset.index);
                    const entry = entries.find(e => e.index === index);
                    const newText = prompt('编辑内容:', entry.text);
                    if (!newText || newText === entry.text) return;
                    
                    editLocalStorageEntry(storageKey, index, newText);
                    
                    // 如果启用状态,更新世界书
                    if (entry.enabled) {
                        const fullOldLine = `${new Date(entry.ts).toLocaleString()}:${entry.text}`;
                        await deleteLineFromWorldInfo(keyword, fullOldLine);
                        await appendToWorldInfoEntry(keyword, newText);
                    }
                    
                    toastr.success('编辑成功');
                    showStatsList(storageKey, keyword);
                });
            });
            
            // 删除按钮
            contentDiv.querySelectorAll('.delete-entry').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('确定要删除此条记录吗?')) return;
                    
                    const index = parseInt(btn.dataset.index);
                    const entry = entries.find(e => e.index === index);
                    
                    // 如果启用状态,从世界书删除
                    if (entry.enabled) {
                        const fullLine = `${new Date(entry.ts).toLocaleString()}:${entry.text}`;
                        await deleteLineFromWorldInfo(keyword, fullLine);
                    }
                    
                    // 从localStorage删除
                    deleteLocalStorageEntry(storageKey, index);
                    
                    toastr.success('删除成功');
                    showStatsList(storageKey, keyword);
                });
            });
            
            // 取消启用按钮
            contentDiv.querySelectorAll('.disable-entry').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const index = parseInt(btn.dataset.index);
                    const entry = entries.find(e => e.index === index);
                    
                    // 只从世界书删除
                    const fullLine = `${new Date(entry.ts).toLocaleString()}:${entry.text}`;
                    await deleteLineFromWorldInfo(keyword, fullLine);
                    
                    // 更新localStorage的启用状态
                    updateLocalStorageEntryEnabled(storageKey, index, false);
                    
                    toastr.success('已取消启用');
                    showStatsList(storageKey, keyword);
                });
            });
            
            // 启用按钮
            contentDiv.querySelectorAll('.enable-entry').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const index = parseInt(btn.dataset.index);
                    const entry = entries.find(e => e.index === index);
                    
                    // 同步到世界书
                    await appendToWorldInfoEntry(keyword, entry.text);
                    
                    // 更新localStorage的启用状态
                    updateLocalStorageEntryEnabled(storageKey, index, true);
                    
                    toastr.success('已启用并同步到世界书');
                    showStatsList(storageKey, keyword);
                });
            });
        }
        
        statsModal.querySelector('#stats-emotion').addEventListener('click', () => {
            showStatsList('mental', '心理');
        });
        
        statsModal.querySelector('#stats-meditation').addEventListener('click', () => {
            showStatsList('meditation', '冥想');
        });
        
        statsModal.querySelector('#stats-thought').addEventListener('click', () => {
            showStatsList('thoughtChains', '思维链');
        });
        
        statsModal.querySelector('#stats-confession').addEventListener('click', () => {
            showStatsList('confessions', '忏悔');
        });
    });
    
    // === 冥想开始 ===
    btnStart.addEventListener('click', async () => {
        const mins = Number(slider.value);
        targetDuration = mins;
        startTime = new Date();
        timerEl.innerText = '';
        btnStart.style.display = 'none';
        btnStop.style.display = 'inline-block';
        
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
        
        try {
            const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
            if (!api.url) {
                subPanel.innerText = '未配置独立 API,示例提示:深呼吸、放松身体、正念冥想。';
                toastr.warning('未配置独立 API');
                return;
            }
            
            const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
            
            const history = getLocalStorageEntries('mental').map(m => 
                `${m.ts}:${m.text}`
            ).join('\n');
            
            const promptText = mins === 0 
                ? `请根据以下用户情绪记录,立即给出一段简短正念指导和放松提示:\n${history || '无记录'}`
                : `请提供一段正念冥想指导,时长约 ${mins} 分钟,根据用户历史情绪记录:\n${history || '无记录'}`;
            
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})
                },
                body: JSON.stringify({
                    model: api.model,
                    messages: [
                        { role: 'system', content: '你是心理健康指导专家,为用户提供正念冥想与情绪缓解建议。' },
                        { role: 'user', content: promptText }
                    ],
                    max_tokens: 5000
                })
            });
            
            if (!res.ok) throw new Error('HTTP ' + res.status);
            
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
            subPanel.innerText = text;
            subPanel.scrollTop = subPanel.scrollHeight;
            
        } catch (e) {
            subPanel.innerText = 'API 请求失败:' + (e.message || e);
            toastr.error('正念指导调用失败: ' + e.message);
        }
    });
    
    // === 冥想结束 ===
    function stopMeditation() {
        if (!startTime) return;
        const duration = Math.floor((Date.now() - startTime.getTime()) / 60000);
        clearInterval(timerId);
        timerId = null;
        btnStart.style.display = 'inline-block';
        btnStop.style.display = 'none';
        timerEl.innerText = `本次冥想结束,共进行 ${duration} 分钟`;
        
        // 保存到localStorage
        if (!ctx.extensionSettings[MODULE_NAME].meditation) {
            ctx.extensionSettings[MODULE_NAME].meditation = [];
        }
        
        const record = {
            text: `本次冥想 ${duration} 分钟`,
            ts: new Date().toISOString(),
            enabled: true
        };
        ctx.extensionSettings[MODULE_NAME].meditation.push(record);
        saveSettings();
        
        // 同步到世界书
        appendToWorldInfoEntry('冥想', record.text);
        
        startTime = null;
    }
    btnStop.addEventListener('click', stopMeditation);
    
    function renderLog() {
        const arr = ctx.extensionSettings[MODULE_NAME].mental || [];
        logEl.innerText = `已记录 ${arr.length} 条情绪记录(存储在扩展设置与世界书中)`;
    }
    renderLog();
}

