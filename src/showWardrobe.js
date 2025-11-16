export async function showWardrobe(MODULE_NAME, ctx, saveSettings, debugLog, content) {
  try { 
    const cs = window.getComputedStyle(content);
    if (cs.position === 'static' || !cs.position) content.style.position = 'relative';
  } catch (e) {}
  
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">用户衣柜</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:6px;">
      <button class="ha-btn wardrobe-tab" data-type="top">上衣</button>
      <button class="ha-btn wardrobe-tab" data-type="bottom">下装</button>
      <button class="ha-btn wardrobe-tab" data-type="shoes">鞋袜</button>
      <button class="ha-btn wardrobe-tab" data-type="accessory">配饰</button>
      <button class="ha-btn wardrobe-tab" data-type="outfit">套装</button>
    </div>
    <div id="wardrobe-content"></div>
  `;
  if (!ctx.extensionSettings[MODULE_NAME].wardrobe) {
    ctx.extensionSettings[MODULE_NAME].wardrobe = {
      items: [], // 所有衣物
      tags: {
        top: [],
        bottom: [],
        shoes: [],
        accessory: [],
        outfit: []
      }
    };
  }
  let currentType = 'top';
  let tagDeleteMode = false;
  
  const typeConfig = {
    top: { name: '上衣', emoji: '👚' },
    bottom: { name: '下装', emoji: '👖' },
    shoes: { name: '鞋袜', emoji: '👟' },
    accessory: { name: '配饰', emoji: '🧣' },
    outfit: { name: '套装', emoji: '🥼' }
  };
  function debugLog(...args) {
    const ts = new Date().toLocaleTimeString();
    const msg = `[${ts}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    console.log('[衣柜]', ...args);
  }
  // 查找健康助手世界书文件
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
 // 写入世界书着装条目
async function updateWardrobeWorldInfo() {
  try {
    const fileId = await findHealthWorldFile();
    if (!fileId) { 
      debugLog('写入世界书: 未找到世界书文件，跳过写入'); 
      return; 
    }

    const moduleWI = await import('/scripts/world-info.js');
    const worldInfo = await moduleWI.loadWorldInfo(fileId);
    const entries = worldInfo.entries || {};
    debugLog('loadWorldInfo entries count:', Object.keys(entries).length);
    
    let targetUID = null;
    for (const id in entries) {
      const entry = entries[id];
      const comment = entry.comment || '';
      if (!entry.disable && (comment.includes('着装') || entry.title === '着装')) {
        targetUID = entry.uid;
        debugLog('找到着装 entry: uid=', targetUID, 'comment=', comment);
        break;
      }
    }
    
    if (!targetUID) {
      debugLog('未找到着装 entry（未创建），写入被跳过。');
      return;
    }
    
    const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
    
    // 检查是否有穿着的套装
    const wornOutfit = wardrobe.items.find(item => item.type === 'outfit' && item.worn);
    
    let newContent = '当前着装:\n';
    
    if (wornOutfit) {
      // 如果穿着套装，显示套装信息
      newContent += `\n【套装】${wornOutfit.name}\n`;
      if (wornOutfit.tags && wornOutfit.tags.length) {
        newContent += `  标签: ${wornOutfit.tags.join(', ')}\n`;
      }
      if (wornOutfit.description) {
        newContent += `  描述: ${wornOutfit.description}\n`;
      }
      if (wornOutfit.composition) {
        newContent += `  组成:\n`;
        ['top', 'bottom', 'shoes', 'accessory'].forEach(type => {
          if (wornOutfit.composition[type] && wornOutfit.composition[type].length) {
            const typeName = { top: '上衣', bottom: '下装', shoes: '鞋袜', accessory: '配饰' }[type];
            const items = wornOutfit.composition[type].map(id => {
              const item = wardrobe.items.find(i => i.id === id);
              if (item) {
                let itemStr = item.name;
                if (item.tags && item.tags.length) itemStr += ` [${item.tags.join(',')}]`;
                if (item.description) itemStr += ` (${item.description})`;
                return itemStr;
              }
              return '?';
            });
            newContent += `    ${typeName}: ${items.join('; ')}\n`;
          }
        });
      }
    } else {
      // 否则显示单件衣物
      const wornItems = wardrobe.items.filter(item => item.worn && item.type !== 'outfit');
      
      if (wornItems.length === 0) {
        newContent = '当前未穿戴任何衣物';
      } else {
        const parts = {
          top: wornItems.filter(i => i.type === 'top'),
          bottom: wornItems.filter(i => i.type === 'bottom'),
          shoes: wornItems.filter(i => i.type === 'shoes'),
          accessory: wornItems.filter(i => i.type === 'accessory')
        };
        
        ['top', 'bottom', 'shoes', 'accessory'].forEach(type => {
          if (parts[type].length) {
            const typeName = { top: '上衣', bottom: '下装', shoes: '鞋袜', accessory: '配饰' }[type];
            newContent += `\n【${typeName}】\n`;
            parts[type].forEach(item => {
              newContent += `  ${item.name}\n`;
              if (item.tags && item.tags.length) {
                newContent += `    标签: ${item.tags.join(', ')}\n`;
              }
              if (item.description) {
                newContent += `    描述: ${item.description}\n`;
              }
            });
          }
        });
      }
    }
    
    debugLog('准备写入 world entry:', { file: fileId, uid: targetUID, content: newContent });
    await globalThis.SillyTavern.getContext()
      .SlashCommandParser.commands['setentryfield']
      .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
    
    debugLog('写入世界书成功:', newContent);
  } catch (e) {
    debugLog('写入世界书失败:', e.message || e);
  }
}
  // 保存设置
  function saveSettings() {
    if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
    updateWardrobeWorldInfo();
  }
  // 渲染标签区域
  function renderTags(type) { const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe; // 确保 tags[type] 存在 
  if (!wardrobe.tags[type]) { wardrobe.tags[type] = []; } const tags = wardrobe.tags[type]; 
    
    let html = `
      <div style="margin-bottom:4px;">
        <input id="tag-input" type="text" placeholder="输入标签名" style="width:120px;margin-right:4px;padding:2px;font-size:12px;">
        <button id="add-tag-btn" class="ha-btn" style="padding:2px 6px;font-size:12px;">➕</button>
        <button id="delete-tag-btn" class="ha-btn" style="margin-left:4px;padding:2px 6px;font-size:12px;background:${tagDeleteMode ? '#ffcccc' : '#fff'}">🗑️</button>
      </div>
      <div id="tags-container" style="margin-bottom:4px;min-height:24px;">
    `;
    
    tags.forEach((tag, idx) => {
      const bgColor = tag.enabled ? '#90EE90' : '#ddd';
      html += `<button class="tag-btn ha-btn" data-idx="${idx}" style="margin:2px;padding:1px 6px;font-size:11px;line-height:1.4;height:auto;background:${bgColor}">${escapeHtml(tag.name)}</button>`;
    });
    
    html += `</div>`;
    return html;
  }
  // 渲染搜索区域
  function renderSearchArea() {
    return `
      <div style="margin-bottom:6px;">
        <input id="search-input" type="text" placeholder="搜索名称" style="width:120px;margin-right:4px;padding:2px;font-size:12px;">
        <button id="search-btn" class="ha-btn" style="padding:2px 8px;font-size:12px;">🔎</button>
        <button id="add-item-btn" class="ha-btn" style="margin-left:8px;padding:2px 8px;font-size:12px;">添加</button>
      </div>
    `;
  }
  // 渲染衣物列表
function renderItems(type, searchName = '', enabledTagsOnly = false) {
  const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
  // 确保 tags[type] 存在
  if (!wardrobe.tags[type]) {
    wardrobe.tags[type] = [];
  }
  const allTags = wardrobe.tags[type];
  const enabledTags = allTags.filter(t => t.enabled).map(t => t.name);
  
  // 确保 items 数组存在
  if (!wardrobe.items) {
    wardrobe.items = [];
  }
  
    
    let items = wardrobe.items.filter(item => item.type === type);
    
    // 标签过滤（与逻辑）
    if (enabledTagsOnly && enabledTags.length > 0) {
      items = items.filter(item => {
        const itemTags = item.tags || [];
        return enabledTags.every(tag => itemTags.includes(tag));
      });
    }
    
    // 名称过滤
    if (searchName) {
      items = items.filter(item => item.name.includes(searchName));
    }
    
    let html = '<div id="items-list">';
    
    if (items.length === 0) {
      html += '<div style="color:#999;font-size:12px;">暂无符合条件的衣物</div>';
    } else {
      items.forEach(item => {
        const emoji = typeConfig[type].emoji;
        const wornStyle = item.worn ? 'background:#FFD700;' : '';
        html += `
          <div style="display:flex;align-items:center;margin-bottom:4px;padding:4px;border:1px solid #ddd;border-radius:4px;">
            <div style="flex:1;word-break:break-word;font-size:13px;">
              <strong>${escapeHtml(item.name)}</strong>
              ${item.tags && item.tags.length ? `<span style="font-size:10px;color:#666;">[${item.tags.join(', ')}]</span>` : ''}
              ${item.description ? `<div style="font-size:11px;color:#888;">${escapeHtml(item.description)}</div>` : ''}
            </div>
            <button class="ha-btn edit-item-btn" data-id="${item.id}" style="margin-left:4px;padding:2px 6px;font-size:12px;">✏️</button>
            <button class="ha-btn delete-item-btn" data-id="${item.id}" style="margin-left:4px;padding:2px 6px;font-size:12px;">🗑️</button>
            <button class="ha-btn wear-item-btn" data-id="${item.id}" style="margin-left:4px;padding:2px 6px;font-size:12px;${wornStyle}">${emoji}</button>
          </div>
        `;
      });
    }
    
    html += '</div>';
    return html;
  }
  // 渲染套装特殊界面
  function renderOutfitPanel() {
    const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
    
    let html = `
      ${renderTags('outfit')}
      ${renderSearchArea()}
    `;
    
    const outfits = wardrobe.items.filter(item => item.type === 'outfit');
    
    html += '<div id="items-list">';
    if (outfits.length === 0) {
      html += '<div style="color:#999;font-size:12px;">暂无套装</div>';
    } else {
      outfits.forEach(outfit => {
        const wornStyle = outfit.worn ? 'background:#FFD700;' : '';
        html += `
          <div style="margin-bottom:6px;padding:6px;border:1px solid #ddd;border-radius:4px;">
            <div style="display:flex;align-items:center;margin-bottom:4px;">
              <strong style="flex:1;font-size:13px;">${escapeHtml(outfit.name)}</strong>
              <button class="ha-btn edit-item-btn" data-id="${outfit.id}" style="padding:2px 6px;font-size:12px;">✏️</button>
              <button class="ha-btn delete-item-btn" data-id="${outfit.id}" style="margin-left:4px;padding:2px 6px;font-size:12px;">🗑️</button>
              <button class="ha-btn wear-item-btn" data-id="${outfit.id}" style="margin-left:4px;padding:2px 6px;font-size:12px;${wornStyle}">🥼</button>
            </div>
            <div style="font-size:10px;color:#666;">
              ${outfit.composition ? formatOutfitComposition(outfit.composition) : ''}
            </div>
          </div>
        `;
      });
    }
    html += '</div>';
    
    return html;
  }
  // 格式化套装组成
  function formatOutfitComposition(composition) {
    if (!composition) return '';
    let parts = [];
    if (composition.top && composition.top.length) parts.push(`上衣:${composition.top.map(id => {
      const item = ctx.extensionSettings[MODULE_NAME].wardrobe.items.find(i => i.id === id);
      return item ? item.name : '?';
    }).join(',')}`);
    if (composition.bottom && composition.bottom.length) parts.push(`下装:${composition.bottom.map(id => {
      const item = ctx.extensionSettings[MODULE_NAME].wardrobe.items.find(i => i.id === id);
      return item ? item.name : '?';
    }).join(',')}`);
    if (composition.shoes && composition.shoes.length) parts.push(`鞋袜:${composition.shoes.map(id => {
      const item = ctx.extensionSettings[MODULE_NAME].wardrobe.items.find(i => i.id === id);
      return item ? item.name : '?';
    }).join(',')}`);
    if (composition.accessory && composition.accessory.length) parts.push(`配饰:${composition.accessory.map(id => {
      const item = ctx.extensionSettings[MODULE_NAME].wardrobe.items.find(i => i.id === id);
      return item ? item.name : '?';
    }).join(',')}`);
    return parts.join(' | ');
  }
  // 渲染主面板
  function renderPanel(type) {
    const wardrobeContent = document.getElementById('wardrobe-content');
    currentType = type;
    tagDeleteMode = false;
    
    // 高亮当前标签页
    document.querySelectorAll('.wardrobe-tab').forEach(btn => {
      btn.style.background = btn.dataset.type === type ? '#90EE90' : '#fff';
    });
    
    if (type === 'outfit') {
      wardrobeContent.innerHTML = renderOutfitPanel();
    } else {
      wardrobeContent.innerHTML = `
        ${renderTags(type)}
        ${renderSearchArea()}
        ${renderItems(type)}
      `;
    }
    
    attachEventListeners(type);
  }
  // 绑定事件监听器
  function attachEventListeners(type) {
    const wardrobeContent = document.getElementById('wardrobe-content');
    
    // 添加标签
    const addTagBtn = wardrobeContent.querySelector('#add-tag-btn');
if (addTagBtn) {
  addTagBtn.onclick = () => {
    const input = wardrobeContent.querySelector('#tag-input');
    const tagName = input.value.trim();
    if (!tagName) return;
    
    const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
    // 确保 tags[type] 存在
    if (!wardrobe.tags[type]) {
      wardrobe.tags[type] = [];
    }
        
        if (wardrobe.tags[type].some(t => t.name === tagName)) {
          if (typeof toastr !== 'undefined') toastr.warning('标签已存在');
          return;
        }
        
        wardrobe.tags[type].push({ name: tagName, enabled: false });
        input.value = '';
        saveSettings();
        renderPanel(type);
      };
    }
    
    // 删除标签模式切换
    const deleteTagBtn = wardrobeContent.querySelector('#delete-tag-btn');
    if (deleteTagBtn) {
      deleteTagBtn.onclick = () => {
        tagDeleteMode = !tagDeleteMode;
        deleteTagBtn.style.background = tagDeleteMode ? '#ffcccc' : '#fff';
      };
    }
    
    // 标签点击
    wardrobeContent.querySelectorAll('.tag-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
        
        if (tagDeleteMode) {
          if (confirm(`确认删除标签"${wardrobe.tags[type][idx].name}"?`)) {
            wardrobe.tags[type].splice(idx, 1);
            saveSettings();
            renderPanel(type);
          }
        } else {
          wardrobe.tags[type][idx].enabled = !wardrobe.tags[type][idx].enabled;
          saveSettings();
          renderPanel(type);
        }
      };
    });
    
    // 搜索
    const searchBtn = wardrobeContent.querySelector('#search-btn');
    if (searchBtn) {
      searchBtn.onclick = () => {
        const searchInput = wardrobeContent.querySelector('#search-input');
        const searchName = searchInput.value.trim();
        
        const itemsList = wardrobeContent.querySelector('#items-list');
        itemsList.outerHTML = renderItems(type, searchName, true);
        attachItemEventListeners(type);
      };
    }
    
    // 添加衣物
    const addItemBtn = wardrobeContent.querySelector('#add-item-btn');
    if (addItemBtn) {
      addItemBtn.onclick = () => {
        if (type === 'outfit') {
          openOutfitDialog(null);
        } else {
          openItemDialog(type, null);
        }
      };
    }
    
    attachItemEventListeners(type);
  }
  // 绑定衣物操作事件
  function attachItemEventListeners(type) {
    const wardrobeContent = document.getElementById('wardrobe-content');
    
    // 编辑
    wardrobeContent.querySelectorAll('.edit-item-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
        const item = wardrobe.items.find(i => i.id === id);
        if (item) {
          if (type === 'outfit') {
            openOutfitDialog(item);
          } else {
            openItemDialog(type, item);
          }
        }
      };
    });
    
    // 删除
    wardrobeContent.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
        const item = wardrobe.items.find(i => i.id === id);
        
        if (item && confirm(`确认删除"${item.name}"?`)) {
          const idx = wardrobe.items.indexOf(item);
          wardrobe.items.splice(idx, 1);
          saveSettings();
          renderPanel(type);
          if (typeof toastr !== 'undefined') toastr.success('已删除');
        }
      };
    });
    
    // 穿戴/脱下
    wardrobeContent.querySelectorAll('.wear-item-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
        const item = wardrobe.items.find(i => i.id === id);
        
        if (item) {
          if (type === 'outfit') {
            // 套装的穿脱逻辑
            if (item.worn) {
              // 脱下套装 - 只改变套装状态，不影响单件衣物
              item.worn = false;
              if (typeof toastr !== 'undefined') {
                toastr.info(`已脱下套装: ${item.name}`);
              }
            } else {
              // 穿上套装 - 先脱下其他套装，然后应用此套装
              wardrobe.items.forEach(i => {
                if (i.type === 'outfit') i.worn = false;
              });
              item.worn = true;
              applyOutfit(item);
              if (typeof toastr !== 'undefined') {
                toastr.success(`已穿上套装: ${item.name}`);
              }
            }
          } else {
            // 单件衣物的穿脱逻辑
            item.worn = !item.worn;
            // 穿脱单件衣物时，脱下所有套装
            wardrobe.items.forEach(i => {
              if (i.type === 'outfit') i.worn = false;
            });
            if (typeof toastr !== 'undefined') {
              toastr.info(item.worn ? `已穿上 ${item.name}` : `已脱下 ${item.name}`);
            }
          }
          saveSettings();
          renderPanel(type);
        }
      };
    });
  }
  // 应用套装（将套装中的衣物设为穿着）
  function applyOutfit(outfit) {
    const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
    const comp = outfit.composition;
    
    if (!comp) return;
    
    // 先把所有非套装衣物设为未穿着
    wardrobe.items.forEach(item => {
      if (item.type !== 'outfit') item.worn = false;
    });
    
    // 穿上套装中的衣物
    ['top', 'bottom', 'shoes', 'accessory'].forEach(type => {
      if (comp[type] && comp[type].length) {
        comp[type].forEach(id => {
          const item = wardrobe.items.find(i => i.id === id);
          if (item) item.worn = true;
        });
      }
    });
  }
  // 打开衣物编辑对话框
  function openItemDialog(type, item) {
    const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
    const isNew = !item;
    const data = item || { name: '', tags: [], description: '', imageUrl: '', type: type, worn: false };
    
    const allTags = wardrobe.tags[type] || [];
    
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="background:#fff;padding:8px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:400px;margin:auto;">
        <div style="font-weight:600;margin-bottom:6px;">${isNew ? '添加' : '编辑'}${typeConfig[type].name}</div>
        
        <label style="font-size:13px">名称:</label><br>
        <input id="item-name" type="text" style="width:100%;margin-bottom:6px;padding:2px;" value="${escapeHtml(data.name)}"><br>
        
        <label style="font-size:13px">标签:</label><br>
        <div id="tag-selection" style="margin-bottom:6px;min-height:30px;border:1px solid #ddd;padding:4px;border-radius:4px;">
          ${allTags.map((tag, idx) => {
            const checked = data.tags && data.tags.includes(tag.name) ? 'checked' : '';
            return `<label style="display:inline-block;margin:2px;font-size:12px;"><input type="checkbox" class="tag-checkbox" value="${escapeHtml(tag.name)}" ${checked}> ${escapeHtml(tag.name)}</label>`;
          }).join('')}
          ${allTags.length === 0 ? '<span style="color:#999;font-size:11px;">暂无标签</span>' : ''}
        </div>
        
        <label style="font-size:13px">描述:</label><br>
        <textarea id="item-desc" rows="2" style="width:100%;margin-bottom:6px;padding:2px;">${escapeHtml(data.description || '')}</textarea><br>
        
        <label style="font-size:13px">图片链接:</label><br>
        <input id="item-image" type="text" style="width:100%;margin-bottom:6px;padding:2px;" value="${escapeHtml(data.imageUrl || '')}"><br>
        
        <div style="text-align:right;">
          <button id="item-save" class="ha-btn">保存</button>
          <button id="item-cancel" class="ha-btn" style="margin-left:6px;">取消</button>
        </div>
      </div>
    `;
    
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '20px',
      left: '20px',
      right: '20px',
      bottom: '20px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      zIndex: 99999,
      overflow: 'auto'
    });
    
    content.appendChild(dialog);
    
    dialog.querySelector('#item-cancel').onclick = () => dialog.remove();
    dialog.querySelector('#item-save').onclick = () => {
      const name = dialog.querySelector('#item-name').value.trim();
      if (!name) {
        alert('名称不能为空');
        return;
      }
      
      const selectedTags = Array.from(dialog.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);
      const description = dialog.querySelector('#item-desc').value.trim();
      const imageUrl = dialog.querySelector('#item-image').value.trim();
      
      if (isNew) {
        const id = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        wardrobe.items.push({
          id,
          type,
          name,
          tags: selectedTags,
          description,
          imageUrl,
          worn: false
        });
      } else {
        item.name = name;
        item.tags = selectedTags;
        item.description = description;
        item.imageUrl = imageUrl;
      }
      
      saveSettings();
      renderPanel(type);
      dialog.remove();
      
      if (typeof toastr !== 'undefined') {
        toastr.success(isNew ? '添加成功' : '保存成功');
      }
    };
  }
  // 打开套装编辑对话框
  function openOutfitDialog(outfit) {
    const wardrobe = ctx.extensionSettings[MODULE_NAME].wardrobe;
    const isNew = !outfit;
    const data = outfit || { name: '', tags: [], description: '', composition: {} };
    
    // 获取当前已穿着的衣物
    const wornItems = {
      top: wardrobe.items.filter(i => i.type === 'top' && i.worn).map(i => i.id),
      bottom: wardrobe.items.filter(i => i.type === 'bottom' && i.worn).map(i => i.id),
      shoes: wardrobe.items.filter(i => i.type === 'shoes' && i.worn).map(i => i.id),
      accessory: wardrobe.items.filter(i => i.type === 'accessory' && i.worn).map(i => i.id)
    };
    
    const composition = isNew ? wornItems : (data.composition || {});
    
    const allTags = wardrobe.tags['outfit'] || [];
    
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="background:#fff;padding:8px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:400px;margin:auto;max-height:90vh;overflow:auto;">
        <div style="font-weight:600;margin-bottom:6px;">${isNew ? '添加' : '编辑'}套装</div>
        
        <label style="font-size:13px">名称:</label><br>
        <input id="outfit-name" type="text" style="width:100%;margin-bottom:6px;padding:2px;" value="${escapeHtml(data.name)}"><br>
        
        <label style="font-size:13px">标签:</label><br>
        <div id="tag-selection" style="margin-bottom:6px;min-height:30px;border:1px solid #ddd;padding:4px;border-radius:4px;">
          ${allTags.map((tag, idx) => {
            const checked = data.tags && data.tags.includes(tag.name) ? 'checked' : '';
            return `<label style="display:inline-block;margin:2px;font-size:12px;"><input type="checkbox" class="tag-checkbox" value="${escapeHtml(tag.name)}" ${checked}> ${escapeHtml(tag.name)}</label>`;
          }).join('')}
          ${allTags.length === 0 ? '<span style="color:#999;font-size:11px;">暂无标签</span>' : ''}
        </div>
        
        <label style="font-size:13px">描述:</label><br>
        <textarea id="outfit-desc" rows="2" style="width:100%;margin-bottom:6px;padding:2px;">${escapeHtml(data.description || '')}</textarea><br>
        
        <div style="font-size:12px;color:#666;margin-bottom:6px;">
          ${isNew ? '套装将包含当前已穿着的衣物' : '套装组成:'}
        </div>
        <div style="font-size:10px;color:#888;margin-bottom:6px;padding:4px;background:#f5f5f5;border-radius:4px;">
          ${formatOutfitComposition(composition) || '无'}
        </div>
        
        <div style="text-align:right;">
          <button id="outfit-save" class="ha-btn">保存</button>
          <button id="outfit-cancel" class="ha-btn" style="margin-left:6px;">取消</button>
        </div>
      </div>
    `;
    
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '20px',
      left: '20px',
      right: '20px',
      bottom: '20px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      zIndex: 99999,
      overflow: 'auto'
    });
    
    content.appendChild(dialog);
    
    dialog.querySelector('#outfit-cancel').onclick = () => dialog.remove();
    dialog.querySelector('#outfit-save').onclick = () => {
      const name = dialog.querySelector('#outfit-name').value.trim();
      if (!name) {
        alert('名称不能为空');
        return;
      }
      
      const selectedTags = Array.from(dialog.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);
      const description = dialog.querySelector('#outfit-desc').value.trim();
      
      if (isNew) {
        const id = 'outfit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        wardrobe.items.push({
          id,
          type: 'outfit',
          name,
          tags: selectedTags,
          description,
          composition: wornItems,
          worn: false
        });
      } else {
        outfit.name = name;
        outfit.tags = selectedTags;
        outfit.description = description;
        // 保持原有组成不变
      }
      
      saveSettings();
      renderPanel('outfit');
      dialog.remove();
      
      if (typeof toastr !== 'undefined') {
        toastr.success(isNew ? '添加成功' : '保存成功');
      }
    };
  }
  function escapeHtml(str) {
    return str ? String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '';
  }
  // 标签页切换
  document.querySelectorAll('.wardrobe-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      renderPanel(type);
    });
  });
  // 初始显示上衣
  renderPanel('top');
}
