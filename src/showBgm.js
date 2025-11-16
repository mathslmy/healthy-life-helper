export async function showBgm(MODULE_NAME, ctx, saveSettings, debugLog, content) {
  const container = content;
  container.style.display = 'block';
  container.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">🎵 背景音乐</div>

    <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">
      <input id="ha-bgm-tag-input" type="text" placeholder="标签名" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;">
      <button id="ha-bgm-add" class="ha-btn">➕</button>
      <button id="ha-bgm-del" class="ha-btn">🗑️</button>
      <button id="ha-bgm-star" class="ha-btn">⭐</button>
    </div>

    <div id="ha-bgm-tags" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;"></div>

    <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">
      <input id="ha-bgm-search" type="text" placeholder="搜索歌名/歌手" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;">
      <input id="ha-bgm-limit" type="number" min="1" value="10" title="返回条数" style="width:60px;padding:4px;border:1px solid #ccc;border-radius:4px;">
      <button id="ha-bgm-query" class="ha-btn">🔎</button>
    </div>

    <div id="ha-bgm-list" style="border:1px solid #ddd;padding:6px;border-radius:6px;background:#fafafa;min-height:80px;max-height:300px;overflow:auto;white-space:pre-wrap;"></div>
  `;

  const tagInput = document.getElementById('ha-bgm-tag-input');
  const tagArea = document.getElementById('ha-bgm-tags');
  const listArea = document.getElementById('ha-bgm-list');
  const addBtn = document.getElementById('ha-bgm-add');
  const delBtn = document.getElementById('ha-bgm-del');
  const starBtn = document.getElementById('ha-bgm-star');
  const searchBtn = document.getElementById('ha-bgm-query');
  const searchInput = document.getElementById('ha-bgm-search');
  const limitInput = document.getElementById('ha-bgm-limit');
  const debug = (...args) => console.log('[BGM]', ...args);
  const state = { deleteMode: false };
  const tags = ctx.extensionSettings[MODULE_NAME].bgmTags || [];
  
  const savedLimit = ctx.extensionSettings[MODULE_NAME].bgmLimit || 10;
  limitInput.value = savedLimit;

  limitInput.onchange = () => {
    const val = parseInt(limitInput.value) || 10;
    ctx.extensionSettings[MODULE_NAME].bgmLimit = val;
    saveSettings();
  };

  function toaster(msg, type = 'info') {
    window.toastr?.[type] ? toastr[type](msg) : alert(msg);
  }

  function saveTags() {
    ctx.extensionSettings[MODULE_NAME].bgmTags = tags;
    saveSettings();
    renderTags();
  }

  function renderTags() {
    tagArea.innerHTML = '';
    tags.forEach(tag => {
      const btn = document.createElement('div');
      btn.textContent = tag.name;
      btn.style.cssText = `
        padding:2px 8px;
        border-radius:12px;
        background:${tag.enabled ? '#8fd3f4' : '#ddd'};
        cursor:pointer;
      `;
      btn.addEventListener('click', () => {
        if (state.deleteMode) {
          const idx = tags.indexOf(tag);
          if (idx >= 0) tags.splice(idx, 1);
          saveTags();
        } else {
          tag.enabled = !tag.enabled;
          saveTags();
        }
      });
      tagArea.appendChild(btn);
    });
  }

  renderTags();

  addBtn.onclick = () => {
    const name = tagInput.value.trim();
    if (!name) return;
    if (!tags.some(t => t.name === name)) tags.push({ name, enabled: true });
    tagInput.value = '';
    saveTags();
  };

  delBtn.onclick = () => {
    state.deleteMode = !state.deleteMode;
    delBtn.style.background = state.deleteMode ? '#f88' : '';
  };

  starBtn.onclick = async () => {
    listArea.innerText = '正在读取 ❤️音乐 条目...';
    const songs = await readWorldMusicEntry('❤️音乐');
    if (!songs) {
      listArea.innerText = '未找到 ❤️音乐 条目';
      return;
    }
    renderList(songs);
  };

  searchBtn.onclick = async () => {
    const kw = searchInput.value.trim();
    const limit = parseInt(limitInput.value) || 10;
    const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
    listArea.innerText = '正在搜索...';

    try {
      if (!api.url) {
        const local = localSearch(kw, limit);
        renderList(local);
        toaster('未配置独立API，使用本地示例数据', 'warning');
        return;
      }
      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
      const enabledTags = tags.filter(t => t.enabled).map(t => t.name);
      const skipList = await readWorldMusicEntry('🖤音乐') || [];
      let prompt;
      if (!kw) {
        prompt = `请推荐${limit}首符合这些标签的歌曲（格式"歌名 - 歌手"）,每行一条，不要输出歌手和歌名以外的内容。排除以下音乐。\n标签：${enabledTags.join('、')}\n排除：${skipList.join('、')}`;
      } else {
        prompt = `请推荐${limit}首与"${kw}"相关的歌曲，格式为"歌名 - 歌手"。不要输出歌手和歌名以外的内容例如推荐语。`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})
        },
        body: JSON.stringify({
          model: api.model,
          messages: [
            { role: 'system', content: '你是音乐助手，负责返回歌单。' },
            { role: 'user', content: prompt }
          ]
        })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      const list = text.split('\n').filter(Boolean).map(x => x.replace(/^\d+[.、]/, '').trim());
      renderList(list.length ? list : ['（未返回有效数据）']);
    } catch (e) {
      debug('API搜索失败', e);
      listArea.innerText = 'API调用失败：' + e.message;
      toaster('API请求失败', 'error');
    }
  };

  function localSearch(kw, limit) {
    if (!kw) {
      const enabledTags = tags.filter(t => t.enabled).map(t => t.name);
      return enabledTags.slice(0, limit).map(t => `${t} - 未知歌手`);
    } else {
      return Array.from({ length: limit }, (_, i) => `${kw} 相关歌曲 ${i + 1} - 示例歌手`);
    }
  }

  // 🎵 播放器核心变量
  let Music_Audio = new Audio();
  let Music_List = [];
  let Music_Index = 0;
  let Music_Mode = 'sequence';
  let Lyrics_Data = [];
  let Current_Lyric_Index = -1;
  let Float_Bar_Active = false;
  
  // 🔧 新增: 当前播放状态(用于恢复播放器)
  let Current_Playing_Song = null; // { name, artist }
  let Is_Currently_Playing = false;

  // ==================== 悬浮栏功能 (改进版) ====================

  // 📍 读取悬浮栏位置
  function loadFloatBarPosition() {
    try {
      const saved = localStorage.getItem('ha-float-bar-position');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      debug('读取悬浮栏位置失败', e);
    }
    // 默认位置
    return { top: '50%', right: '10px', transform: 'translateY(-50%)' };
  }

  // 💾 保存悬浮栏位置
  function saveFloatBarPosition(position) {
    try {
      localStorage.setItem('ha-float-bar-position', JSON.stringify(position));
    } catch (e) {
      debug('保存悬浮栏位置失败', e);
    }
  }

  function createFloatBar() {
    if (document.getElementById('ha-float-bar')) return;

    const floatBar = document.createElement('div');
    floatBar.id = 'ha-float-bar';
    floatBar.innerHTML = `
      <div id="ha-float-lyric" style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">等待播放...</div>
      <button id="ha-float-show" style="background:none;border:none;font-size:18px;cursor:pointer;padding:0 8px;color:#4169E1;">🎵</button>
    `;
    
    floatBar.style.cssText = `
      position: fixed;
      background: rgba(248, 248, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(65, 105, 225, 0.3);
      border-radius: 20px;
      padding: 8px 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      width: 250px;
      z-index: 99998;
      cursor: move;
      user-select: none;
      transition: opacity 0.3s ease;
    `;

    // 📍 恢复上次位置
    const savedPos = loadFloatBarPosition();
    if (savedPos.top) floatBar.style.top = savedPos.top;
    if (savedPos.right) floatBar.style.right = savedPos.right;
    if (savedPos.left) floatBar.style.left = savedPos.left;
    if (savedPos.transform) floatBar.style.transform = savedPos.transform;

    // 移动端适配
    if (window.innerWidth <= 768) {
      floatBar.style.fontSize = '12px';
      floatBar.style.padding = '6px 10px';
    }

    document.body.appendChild(floatBar);

    // 拖动功能
    let isDragging = false;
    let startX, startY, initialX, initialY;

    floatBar.addEventListener('mousedown', startDrag);
    floatBar.addEventListener('touchstart', startDrag);

    function startDrag(e) {
      if (e.target.id === 'ha-float-show') return;

      isDragging = true;
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      
      const rect = floatBar.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      floatBar.style.transition = 'none';
      e.preventDefault();
    }

    function doDrag(e) {
      if (!isDragging) return;

      const touch = e.touches ? e.touches[0] : e;
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      let newX = initialX + deltaX;
      let newY = initialY + deltaY;

      const maxX = window.innerWidth - floatBar.offsetWidth - 10;
      const maxY = window.innerHeight - floatBar.offsetHeight - 10;

      newX = Math.max(10, Math.min(newX, maxX));
      newY = Math.max(10, Math.min(newY, maxY));

      floatBar.style.left = newX + 'px';
      floatBar.style.top = newY + 'px';
      floatBar.style.right = 'auto';
      floatBar.style.transform = 'none';
    }

    function stopDrag() {
      if (!isDragging) return;
      isDragging = false;
      floatBar.style.transition = 'opacity 0.3s ease';
      
      // 💾 保存当前位置
      const rect = floatBar.getBoundingClientRect();
      saveFloatBarPosition({
        top: rect.top + 'px',
        left: rect.left + 'px',
        right: 'auto',
        transform: 'none'
      });
    }

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('touchmove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);

    // 🎵 点击返回播放器 (不重新播放)
    document.getElementById('ha-float-show').onclick = (e) => {
      e.stopPropagation();
      showMusicPlayerWithoutReplay();
    };

    Float_Bar_Active = true;
  }

  function updateFloatLyric() {
    const floatLyric = document.getElementById('ha-float-lyric');
    if (!floatLyric) return;

    if (Current_Lyric_Index >= 0 && Lyrics_Data[Current_Lyric_Index]) {
      const text = Lyrics_Data[Current_Lyric_Index].text;
      floatLyric.textContent = text;
      
      if (floatLyric.scrollWidth > floatLyric.clientWidth) {
        floatLyric.style.animation = 'scroll-lyric 8s linear infinite';
      } else {
        floatLyric.style.animation = 'none';
      }
    } else {
      floatLyric.textContent = Music_Audio.paused ? '已暂停' : '播放中...';
      floatLyric.style.animation = 'none';
    }
  }

  function removeFloatBar() {
    const floatBar = document.getElementById('ha-float-bar');
    if (floatBar) floatBar.remove();
    Float_Bar_Active = false;
  }

  // 🔧 新增: 不重新播放地打开播放器
  function showMusicPlayerWithoutReplay() {
    removeFloatBar();
    
    if (Current_Playing_Song) {
      // 重建播放器UI,但不调用playSong
      openMusicPlayerUI(Current_Playing_Song.name, Current_Playing_Song.artist, true);
    }
  }

  // 添加滚动动画样式
  if (!document.getElementById('ha-float-animations')) {
    const style = document.createElement('style');
    style.id = 'ha-float-animations';
    style.textContent = `
      @keyframes scroll-lyric {
        0%, 10% { transform: translateX(0); }
        90%, 100% { transform: translateX(-50%); }
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== 解析 LRC 格式歌词 ====================
  
  function parseLRC(lrcText) {
    if (!lrcText) return [];
    
    const lines = lrcText.split('\n');
    const lyrics = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
    
    for (const line of lines) {
      const matches = [...line.matchAll(timeRegex)];
      if (matches.length === 0) continue;
      
      const text = line.replace(timeRegex, '').trim();
      if (!text) continue;
      
      for (const match of matches) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const milliseconds = parseInt(match[3].padEnd(3, '0'));
        const time = minutes * 60 + seconds + milliseconds / 1000;
        
        lyrics.push({ time, text });
      }
    }
    
    return lyrics.sort((a, b) => a.time - b.time);
  }

  // ==================== 渲染歌曲列表 ====================
  
  async function renderList(songs) {
    listArea.innerHTML = '';
    const likes = await readWorldMusicEntry('❤️音乐') || [];
    const skips = await readWorldMusicEntry('🖤音乐') || [];

    Music_List = songs.map(s => {
      const [name, artist = '未知'] = s.split('-').map(x => x.trim());
      return { name, artist };
    });

    songs.forEach((song, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:4px;border-bottom:1px solid #eee;';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = song;
      const btns = document.createElement('div');
      const like = document.createElement('button');
      const skip = document.createElement('button');
      const play = document.createElement('button');
      like.textContent = '❤️';
      skip.textContent = '🖤';
      play.textContent = '🎵';
      like.className = skip.className = play.className = 'ha-btn';

      if (likes.includes(song)) like.style.background = '#faa';
      if (skips.includes(song)) skip.style.background = '#aaa';

      btns.append(play, like, skip);
      row.append(nameSpan, btns);
      listArea.appendChild(row);

      like.onclick = async e => {
        e.stopPropagation();
        if (likes.includes(song)) {
          await removeWorldMusicEntry('❤️音乐', song);
          toaster(`已从 ❤️音乐 移除: ${song}`, 'info');
        } else {
          await writeWorldMusicEntry('❤️音乐', song);
          toaster(`已加入 ❤️音乐: ${song}`, 'success');
        }
        renderList(songs);
      };

      skip.onclick = async e => {
        e.stopPropagation();
        if (skips.includes(song)) {
          await removeWorldMusicEntry('🖤音乐', song);
          toaster(`已从 🖤音乐 移除: ${song}`, 'info');
        } else {
          await writeWorldMusicEntry('🖤音乐', song);
          toaster(`已加入 🖤音乐: ${song}`, 'warning');
        }
        renderList(songs);
      };

      play.onclick = e => {
        e.stopPropagation();
        Music_Index = i;
        openMusicPlayer(Music_List[i].name, Music_List[i].artist);
      };
    });
  }

  // ==================== 播放器 UI (拆分版本) ====================
  
  // 🔧 拆分: 打开播放器并播放歌曲
  async function openMusicPlayer(name, artist) {
    await openMusicPlayerUI(name, artist, false);
  }

  // 🔧 新增: 打开播放器UI (可选是否重新播放)
  async function openMusicPlayerUI(name, artist, skipPlay = false) {
    let existing = document.getElementById('ha-music-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'ha-music-popup';
    popup.innerHTML = `
      <div style="
        background:#F8F8FF;color:#fff;border-radius:12px;
        width:90%;max-width:420px;max-height:80vh;
        position:fixed;left:10px;top:50px;
        box-shadow:0 4px 20px rgba(0,0,0,0.4);
        display:flex;flex-direction:column;
        overflow:hidden;z-index:99999;">
        
        <div style="padding:10px 16px;font-weight:600;color:#778899;display:flex;justify-content:space-between;align-items:center;">
          <span>🎵 ${name} - ${artist}</span>
          <div style="display:flex;gap:8px;">
            <button id="ha-music-float" style="background:none;border:none;color:#778899;font-size:16px;cursor:pointer;" title="悬浮显示">📌</button>
            <button id="ha-music-close" style="background:none;border:none;color:#778899;font-size:18px;cursor:pointer;">✖</button>
          </div>
        </div>
        
        <div id="ha-music-lyrics" style="flex:1;padding:10px 14px;font-size:13px;overflow-y:auto;text-align:center;color:#ccc;white-space:pre-wrap;">加载歌词中...</div>
        
        <div style="padding:6px 10px;">
          <input type="range" id="ha-progress" min="0" max="100" value="0" step="0.1" style="width:100%;">
        </div>

        <div style="padding:8px;border-top:1px solid #444;display:flex;align-items:center;justify-content:center;gap:12px;">
          <button id="ha-prev" class="ha-btn">⏮️</button>
          <button id="ha-play" class="ha-btn">▶️</button>
          <button id="ha-next" class="ha-btn">⏭️</button>
        </div>
        
        <div style="padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
          <button id="ha-mode" class="ha-btn" style="font-size:13px;">🔁 顺序播放</button>
          <input type="range" id="ha-volume" min="0" max="1" step="0.01" value="0.7" style="width:120px;">
        </div>
      </div>`;
    document.body.appendChild(popup);

    // 关闭按钮
    document.getElementById('ha-music-close').onclick = () => {
      popup.remove();
      removeFloatBar();
    };

    // 悬浮按钮
    document.getElementById('ha-music-float').onclick = () => {
      if (Float_Bar_Active) {
        removeFloatBar();
      } else {
        createFloatBar();
        popup.remove();
      }
    };

    document.getElementById('ha-volume').oninput = e => (Music_Audio.volume = e.target.value);
    document.getElementById('ha-play').onclick = togglePlay;
    document.getElementById('ha-prev').onclick = playPrev;
    document.getElementById('ha-next').onclick = playNext;
    document.getElementById('ha-mode').onclick = toggleMode;

    // 🔧 关键修复: 如果是从悬浮栏返回,不重新播放
    if (skipPlay) {
      // 恢复歌词显示
      if (Lyrics_Data.length > 0) {
        renderLyrics();
      } else {
        const lyricBox = document.getElementById('ha-music-lyrics');
        if (lyricBox) {
          lyricBox.innerHTML = '<div style="padding:20px;color:#666;">暂无歌词</div>';
        }
      }
      
      // 恢复播放按钮状态
      const playBtn = document.getElementById('ha-play');
      if (playBtn) {
        playBtn.textContent = Music_Audio.paused ? '▶️' : '⏸️';
      }
      
      // 恢复进度条
      const progress = document.getElementById('ha-progress');
      if (progress && Music_Audio.duration) {
        progress.value = (Music_Audio.currentTime / Music_Audio.duration) * 100;
      }
      
      // 重新绑定进度条事件
      if (progress) {
        progress.oninput = e => {
          if (!Music_Audio.duration) return;
          const pct = e.target.value / 100;
          Music_Audio.currentTime = pct * Music_Audio.duration;
        };
      }
    } else {
      // 首次播放
      await playSong(name, artist);
      
      const progress = document.getElementById('ha-progress');
      if (progress) {
        progress.oninput = e => {
          if (!Music_Audio.duration) return;
          const pct = e.target.value / 100;
          Music_Audio.currentTime = pct * Music_Audio.duration;
        };
      }
    }
  }

  function toggleMode() {
    const modes = ['sequence', 'random', 'single'];
    Music_Mode = modes[(modes.indexOf(Music_Mode) + 1) % modes.length];
    const label =
      Music_Mode === 'sequence' ? '🔁 顺序播放' :
      Music_Mode === 'random' ? '🔀 随机播放' : '🔂 单曲循环';
    const modeBtn = document.getElementById('ha-mode');
    if (modeBtn) modeBtn.textContent = label;
  }

  function togglePlay() {
    const playBtn = document.getElementById('ha-play');
    if (Music_Audio.paused) {
      Music_Audio.play();
      if (playBtn) playBtn.textContent = '⏸️';
      Is_Currently_Playing = true;
    } else {
      Music_Audio.pause();
      if (playBtn) playBtn.textContent = '▶️';
      Is_Currently_Playing = false;
    }
  }

  function playPrev() {
    if (Music_List.length === 0) return;
    Music_Index = (Music_Index - 1 + Music_List.length) % Music_List.length;
    openMusicPlayer(Music_List[Music_Index].name, Music_List[Music_Index].artist);
  }

  function playNext() {
    if (Music_List.length === 0) return;
    if (Music_Mode === 'random')
      Music_Index = Math.floor(Math.random() * Music_List.length);
    else
      Music_Index = (Music_Index + 1) % Music_List.length;
    openMusicPlayer(Music_List[Music_Index].name, Music_List[Music_Index].artist);
  }

  // ==================== 播放歌曲 ====================
  
  async function playSong(name, artist) {
    const lyricBox = document.getElementById('ha-music-lyrics');
    if (!lyricBox) {
      debug('找不到歌词容器');
      return;
    }
    
    // 🔧 保存当前播放歌曲
    Current_Playing_Song = { name, artist };
    Is_Currently_Playing = true;
    
    debug(`[播放] ${name} - ${artist}`);
    
    Lyrics_Data = [];
    Current_Lyric_Index = -1;
    
    lyricBox.innerHTML = '<div style="padding:20px;color:#999;text-align:center;">🎶 加载中...</div>';
    
    try {
      const lyricData = await getLyricsData(name, artist);
      Lyrics_Data = parseLRC(lyricData.lrc);
      
      if (Lyrics_Data.length > 0) {
        renderLyrics();
        debug(`[歌词] 已加载 ${Lyrics_Data.length} 行`);
      } else {
        lyricBox.innerHTML = '<div style="padding:20px;color:#666;text-align:center;">暂无歌词</div>';
      }
      
      const loadingTip = document.createElement('div');
      loadingTip.id = 'music-loading-indicator';
      loadingTip.style.cssText = `
        position: sticky;
        bottom: 0;
        background: rgba(248,248,255,0.95);
        backdrop-filter: blur(5px);
        padding: 12px;
        text-align: center;
        color: #4169E1;
        font-size: 12px;
      `;
      loadingTip.innerHTML = '🔍 正在搜索音源...<br><span style="font-size:10px;color:#999;">网易云 / QQ音乐</span>';
      lyricBox.appendChild(loadingTip);
      
      const url = await getMusicUrl(name, artist);
      
      const indicator = document.getElementById('music-loading-indicator');
      if (indicator) indicator.remove();
      
      if (!url) {
        const errorTip = document.createElement('div');
        errorTip.style.cssText = `
          margin: 15px 10px;
          padding: 12px;
          background: rgba(255,107,107,0.1);
          border: 1px solid rgba(255,107,107,0.3);
          border-radius: 8px;
          color: #ff6b6b;
          text-align: center;
          font-size: 13px;
        `;
        errorTip.innerHTML = '❌ 找不到可用音源<br><span style="font-size:11px;color:#999;">已尝试: 网易云、QQ音乐</span>';
        lyricBox.appendChild(errorTip);
        toaster(`找不到音源: ${name} - ${artist}`, 'error');
        return;
      }
      
      Music_Audio.src = url;
      await Music_Audio.play();
      
      const playBtn = document.getElementById('ha-play');
      if (playBtn) playBtn.textContent = '⏸️';
      
      Music_Audio.ontimeupdate = updateLyrics;
      
      toaster(`🎵 ${name} - ${artist}`, 'success');
      
    } catch (error) {
      debug('[播放] 异常:', error);
      lyricBox.innerHTML = `<div style="padding:20px;color:#ff6b6b;text-align:center;">❌ 加载失败</div>`;
      toaster('播放失败', 'error');
    }
  }

  // ==================== 获取歌词数据 ====================
  
  async function getLyricsData(name, artist) {
    try {
      const cleanName = (name || '').replace(/\s/g, "");
      const cleanArtist = (artist || '').replace(/\s/g, "");
      const keyword = cleanArtist ? `${cleanName}-${cleanArtist}` : cleanName;
      
      const searchRes = await fetch(`https://api.vkeys.cn/v2/music/netease?word=${encodeURIComponent(keyword)}`);
      const searchData = await searchRes.json();
      
      if (!searchData?.data?.length) return { lrc: '', tlyric: '' };
      
      const songId = searchData.data[0].id;
      const lyricRes = await fetch(`https://api.vkeys.cn/v2/music/netease/lyric?id=${songId}`);
      const lyricData = await lyricRes.json();
      
      return {
        lrc: lyricData?.data?.lrc || lyricData?.data?.lyric || '',
        tlyric: lyricData?.data?.trans || lyricData?.data?.tlyric || ''
      };
    } catch (error) {
      debug('[歌词] 获取失败:', error);
      return { lrc: '', tlyric: '' };
    }
  }

  // ==================== 渲染歌词 ====================
  
  function renderLyrics() {
    const lyricBox = document.getElementById('ha-music-lyrics');
    if (!lyricBox) return;
    
    lyricBox.innerHTML = '';
    
    if (Lyrics_Data.length === 0) {
      lyricBox.innerHTML = '<div style="padding:20px;color:#666;">暂无歌词</div>';
      return;
    }
    
    const fragment = document.createDocumentFragment();
    
    Lyrics_Data.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'lyric-line';
      div.setAttribute('data-index', index);
      div.textContent = item.text;
      div.style.cssText = `
        padding: 8px 4px;
        color: #B0C4DE;
        font-size: 13px;
        line-height: 1.6;
        transition: all 0.3s ease;
        cursor: pointer;
      `;
      
      div.onclick = () => {
        if (Music_Audio.duration && !isNaN(Music_Audio.duration)) {
          Music_Audio.currentTime = item.time;
        }
      };
      
      fragment.appendChild(div);
    });
    
    lyricBox.appendChild(fragment);
  }

  // ==================== 更新歌词高亮 ====================
  
  function updateLyrics() {
    if (!Music_Audio.duration || Lyrics_Data.length === 0) return;
    
    const currentTime = Music_Audio.currentTime;
    const progress = document.getElementById('ha-progress');
    
    if (progress && !isNaN(Music_Audio.duration)) {
      progress.value = (currentTime / Music_Audio.duration) * 100;
    }
    
    let targetIndex = -1;
    for (let i = Lyrics_Data.length - 1; i >= 0; i--) {
      if (currentTime >= Lyrics_Data[i].time) {
        targetIndex = i;
        break;
      }
    }
    
    if (targetIndex === Current_Lyric_Index) return;
    
    Current_Lyric_Index = targetIndex;
    
    const lyricBox = document.getElementById('ha-music-lyrics');
    if (lyricBox) {
      const lines = lyricBox.querySelectorAll('.lyric-line');
      
      lines.forEach((line, index) => {
        if (index === targetIndex) {
          line.style.color = '#4169E1';
          line.style.fontSize = '15px';
          line.style.fontWeight = 'bold';
          line.style.transform = 'scale(1.05)';
          
          const containerHeight = lyricBox.clientHeight;
          const lineTop = line.offsetTop;
          const lineHeight = line.offsetHeight;
          const scrollTarget = lineTop - (containerHeight / 2) + (lineHeight / 2);
          
          lyricBox.scrollTo({
            top: Math.max(0, scrollTarget),
            behavior: 'smooth'
          });
        } else {
          line.style.color = '#B0C4DE';
          line.style.fontSize = '13px';
          line.style.fontWeight = 'normal';
          line.style.transform = 'scale(1)';
        }
      });
    }
    
    updateFloatLyric();
  }

  Music_Audio.onended = () => {
    if (Music_Mode === 'single') {
      Music_Audio.play();
    } else {
      playNext();
    }
  };

  // ==================== 获取音源 ====================
  
  async function checkAudioAvailability(url) {
    return new Promise((resolve) => {
      const tester = new Audio();
      let timer;

      const onLoaded = () => {
        cleanup();
        resolve(true);
      };

      const onError = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        tester.removeEventListener('loadedmetadata', onLoaded);
        tester.removeEventListener('error', onError);
        clearTimeout(timer);
        tester.src = '';
      };

      tester.preload = 'metadata';
      tester.src = url;
      timer = setTimeout(onError, 3000);

      tester.addEventListener('loadedmetadata', onLoaded);
      tester.addEventListener('error', onError);
    });
  }

  async function getMusicUrl(name, artist = '') {
    const cleanName = (name || '').replace(/\s/g, "");
    const cleanArtist = (artist || '').replace(/\s/g, "");
    const keyword = cleanArtist ? `${cleanName}-${cleanArtist}` : cleanName;
    
    debug(`[音源] 搜索: ${keyword}`);

    let url = await tryNetease(keyword);
    if (url) return url;

    debug(`[音源] 网易云失败,尝试QQ音乐`);
    url = await tryTencent(keyword);
    if (url) return url;

    if (cleanArtist) {
      debug(`[音源] 尝试仅用歌名`);
      url = await tryNetease(cleanName);
      if (url) return url;

      url = await tryTencent(cleanName);
      if (url) return url;
    }

    debug(`[音源] 所有方案失败`);
    return '';
  }

  async function tryNetease(keyword) {
    try {
      const searchRes = await fetch(`https://api.vkeys.cn/v2/music/netease?word=${encodeURIComponent(keyword)}`);
      const searchData = await searchRes.json();
      
      if (!searchData?.data?.length) return '';

      const ids = searchData.data.map(item => item.id).filter(Boolean);

      for (const id of ids) {
        try {
          const detailRes = await fetch(`https://api.vkeys.cn/v2/music/netease?id=${id}`);
          const detailData = await detailRes.json();
          const url = detailData?.data?.url;

          if (url && await checkAudioAvailability(url)) {
            debug(`[网易云] ✅ ID=${id}`);
            return url;
          }
        } catch (e) {
          debug(`[网易云] ID=${id} 失败`, e);
        }
      }
      return '';
    } catch (error) {
      debug('[网易云] 异常', error);
      return '';
    }
  }

  async function tryTencent(keyword) {
    try {
      const searchRes = await fetch(`https://api.vkeys.cn/v2/music/tencent?word=${encodeURIComponent(keyword)}`);
      const searchData = await searchRes.json();
      
      if (!searchData?.data?.length) return '';

      const ids = [];
      for (const item of searchData.data) {
        if (item.id && !String(item.song || '').match(/live/gi)) {
          ids.push(item.id);
        }
        if (item.grp) {
          for (const grp of item.grp) {
            if (grp.id && !String(grp.song || '').match(/live/gi)) {
              ids.push(grp.id);
            }
          }
        }
      }

      for (const id of ids) {
        try {
          const detailRes = await fetch(`https://api.vkeys.cn/v2/music/tencent?id=${id}`);
          const detailData = await detailRes.json();
          const url = detailData?.data?.url;

          if (url && await checkAudioAvailability(url)) {
            debug(`[QQ音乐] ✅ ID=${id}`);
            return url;
          }
        } catch (e) {
          debug(`[QQ音乐] ID=${id} 失败`, e);
        }
      }
      return '';
    } catch (error) {
      debug('[QQ音乐] 异常', error);
      return '';
    }
  }

  // ==================== 世界书接口 ====================
  
  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) if (WI.includes('健康生活助手')) return WI;
      return null;
    } catch (e) {
      debug('findHealthWorldFile异常', e);
      return null;
    }
  }

  async function readWorldMusicEntry(label) {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return null;
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      for (const id in entries) {
        const entry = entries[id];
        if (!entry.disable && (entry.title === label || (entry.comment || '').includes(label))) {
          const content = entry.content || '';
          return content.split('\n').filter(Boolean);
        }
      }
      return null;
    } catch (e) {
      debug('readWorldMusicEntry异常', e);
      return null;
    }
  }

  async function writeWorldMusicEntry(label, songLine) {
    const fileId = await findHealthWorldFile();
    if (!fileId) return;
    const moduleWI = await import('/scripts/world-info.js');
    const worldInfo = await moduleWI.loadWorldInfo(fileId);
    const entries = worldInfo.entries || {};
    let targetUID = null;
    for (const id in entries) {
      const entry = entries[id];
      if (!entry.disable && (entry.title === label || (entry.comment || '').includes(label))) {
        targetUID = entry.uid;
        break;
      }
    }
    if (!targetUID) return;
    const existing = entries[targetUID].content || '';
    if (existing.includes(songLine)) return;
    const newContent = existing + (existing ? '\n' : '') + songLine;
    await ctx.SlashCommandParser.commands['setentryfield']
      .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
  }

  async function removeWorldMusicEntry(label, songLine) {
    const fileId = await findHealthWorldFile();
    if (!fileId) return;
    const moduleWI = await import('/scripts/world-info.js');
    const worldInfo = await moduleWI.loadWorldInfo(fileId);
    const entries = worldInfo.entries || {};
    for (const id in entries) {
      const entry = entries[id];
      if (!entry.disable && (entry.title === label || (entry.comment || '').includes(label))) {
        const arr = (entry.content || '').split('\n').filter(Boolean);
        const newArr = arr.filter(line => line.trim() !== songLine.trim());
        const newContent = newArr.join('\n');
        await ctx.SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: entry.uid, field: 'content' }, newContent);
        break;
      }
    }
  }
}

