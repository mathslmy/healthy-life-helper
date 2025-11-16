export async function showFinance(MODULE_NAME, ctx, saveSettings, debugLog, content) {
  const container = content;
  container.style.display = 'block';
  container.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">收支平衡</div>

    <!-- 收入标签 -->
    <div style="margin-bottom:6px;">
      <div><b>收入标签</b></div>
      <div style="display:flex;gap:6px;margin-top:4px;">
        <input id="ha-income-input" placeholder="输入新收入标签" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;">
        <button id="ha-income-add" class="ha-btn" style="width:50px;">➕</button>
        <button id="ha-income-del" class="ha-btn" style="width:50px;">🗑️</button>
      </div>
      <div id="ha-income-tags" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;"></div>
    </div>

    <!-- 支出标签 -->
    <div style="margin-bottom:6px;">
      <div><b>支出标签</b></div>
      <div style="display:flex;gap:6px;margin-top:4px;">
        <input id="ha-expense-input" placeholder="输入新支出标签" style="flex:1;padding:4px;border:1px solid #ccc;border-radius:4px;">
        <button id="ha-expense-add" class="ha-btn" style="width:50px;">➕</button>
        <button id="ha-expense-del" class="ha-btn" style="width:50px;">🗑️</button>
      </div>
      <div id="ha-expense-tags" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;"></div>
    </div>

    <!-- 汇总 -->
    <div id="ha-finance-summary" style="margin:10px 0;padding:6px;border:1px solid #ddd;background:#f9f9f9;">
      <div>当月总收入：<span id="ha-total-income">0</span> 元</div>
      <div>当月总支出：<span id="ha-total-expense">0</span> 元</div>
      <div><b>当月结余：</b><span id="ha-total-balance">0</span> 元</div>
    </div>

    <!-- 功能按钮 -->
    <div style="display:flex;gap:8px;margin-bottom:6px;">
      <button id="ha-income-analysis" class="ha-btn" style="flex:1;">收入分析</button>
      <button id="ha-expense-analysis" class="ha-btn" style="flex:1;">支出分析</button>
      <button id="ha-detail" class="ha-btn" style="flex:1;">收支明细</button>
    </div>

    <!-- 输出区 -->
    <div id="ha-finance-result" style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#fafafa;white-space:pre-wrap;min-height:60px;max-height:300px;overflow:auto;"></div>
  `;

  const state = ctx.extensionSettings[MODULE_NAME];
  if (!state.finance) {
    state.finance = { incomeTags: [], expenseTags: [], records: [] };
    saveSettings();
  }

  const { finance } = state;
  const now = new Date();
  const ym = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');

  const incomeEl = document.getElementById('ha-income-tags');
  const expenseEl = document.getElementById('ha-expense-tags');
  const totalIncomeEl = document.getElementById('ha-total-income');
  const totalExpenseEl = document.getElementById('ha-total-expense');
  const balanceEl = document.getElementById('ha-total-balance');
  const resultEl = document.getElementById('ha-finance-result');
  let delMode = { income: false, expense: false };

  // 🔍 查找世界书文件
  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) return WI;
      }
      toastr.warning('未找到 “健康生活助手” 世界书');
      return null;
    } catch (e) {
      toastr.error('查找世界书异常: ' + e.message);
      return null;
    }
  }

  // 🧾 写入世界书
  async function appendToWorldInfoFinance() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return;

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};

      let incomeUID = null, expenseUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable) {
          if (comment.includes('收入') || entry.title === '收入') incomeUID = entry.uid;
          if (comment.includes('支出') || entry.title === '支出') expenseUID = entry.uid;
        }
      }

      if (!incomeUID && !expenseUID) {
        toastr.info('未找到 “收入/支出” 条目，请在世界书中创建。');
        return;
      }

      const all = ctx.extensionSettings[MODULE_NAME].finance.records || [];
      const incomeList = all.filter(r => r.type === 'income').map((r,i)=>
        `${i+1}. ${new Date(r.date).toLocaleString()} ${r.tag}${r.name?`(${r.name})`:''}：${r.value}元`
      );
      const expenseList = all.filter(r => r.type === 'expense').map((r,i)=>
        `${i+1}. ${new Date(r.date).toLocaleString()} ${r.tag}${r.name?`(${r.name})`:''}：${r.value}元`
      );

      const ctxObj = globalThis.SillyTavern.getContext();
      const setField = ctxObj.SlashCommandParser.commands['setentryfield'].callback;

      if (incomeUID)
        await setField({file:fileId, uid:incomeUID, field:'content'}, incomeList.join('\n'));
      if (expenseUID)
        await setField({file:fileId, uid:expenseUID, field:'content'}, expenseList.join('\n'));

      toastr.success('世界书已同步 ✅');
    } catch (e) {
      toastr.error('写入世界书失败：' + e.message);
    }
  }

  // 标签渲染与点击
  function renderTags() {
    function render(el, list, type) {
      el.innerHTML = '';
      list.forEach(tag => {
        const btn = document.createElement('div');
        btn.textContent = tag;
        btn.style.cssText = 'padding:4px 8px;border:1px solid #aaa;border-radius:6px;cursor:pointer;background:#fff;';
        btn.addEventListener('click', async () => {
          if (delMode[type]) {
            const idx = list.indexOf(tag);
            if (idx >= 0) list.splice(idx, 1);
            saveSettings();
            renderTags();
            toastr.info(`已删除${type === 'income' ? '收入' : '支出'}标签`);
          } else {
            const name = prompt('输入名称（可留空）', '');
            const value = prompt('输入金额（元）', '');
            if (!value || isNaN(parseFloat(value))) return toastr.warning('金额无效');
            const rec = { type, tag, name: name || '', value: parseFloat(value), date: new Date().toISOString() };
            finance.records.push(rec);
            saveSettings();
            await appendToWorldInfoFinance();
            updateSummary();
            toastr.success(`${type === 'income' ? '收入' : '支出'}记录已添加`);
          }
        });
        el.appendChild(btn);
      });
    }
    render(incomeEl, finance.incomeTags, 'income');
    render(expenseEl, finance.expenseTags, 'expense');
  }

  function updateSummary() {
    const monthRecords = finance.records.filter(r => r.date.startsWith(ym));
    const totalIncome = monthRecords.filter(r => r.type === 'income').reduce((a, b) => a + b.value, 0);
    const totalExpense = monthRecords.filter(r => r.type === 'expense').reduce((a, b) => a + b.value, 0);
    totalIncomeEl.textContent = totalIncome.toFixed(2);
    totalExpenseEl.textContent = totalExpense.toFixed(2);
    balanceEl.textContent = (totalIncome - totalExpense).toFixed(2);
  }

  // 标签添加/删除
  document.getElementById('ha-income-add').addEventListener('click', () => {
    const v = document.getElementById('ha-income-input').value.trim();
    if (v && !finance.incomeTags.includes(v)) {
      finance.incomeTags.push(v);
      saveSettings();
      renderTags();
      toastr.success('已添加收入标签');
    }
  });
  document.getElementById('ha-expense-add').addEventListener('click', () => {
    const v = document.getElementById('ha-expense-input').value.trim();
    if (v && !finance.expenseTags.includes(v)) {
      finance.expenseTags.push(v);
      saveSettings();
      renderTags();
      toastr.success('已添加支出标签');
    }
  });
  document.getElementById('ha-income-del').addEventListener('click', e => {
    delMode.income = !delMode.income;
    e.target.style.background = delMode.income ? '#f88' : '';
    toastr.info(delMode.income ? '收入删除模式开启' : '收入删除模式关闭');
  });
  document.getElementById('ha-expense-del').addEventListener('click', e => {
    delMode.expense = !delMode.expense;
    e.target.style.background = delMode.expense ? '#f88' : '';
    toastr.info(delMode.expense ? '支出删除模式开启' : '支出删除模式关闭');
  });

  // 分析
  document.getElementById('ha-income-analysis').addEventListener('click', () => {
    const monthRecords = finance.records.filter(r => r.type === 'income' && r.date.startsWith(ym));
    const byTag = {};
    monthRecords.forEach(r => (byTag[r.tag] = (byTag[r.tag] || 0) + r.value));
    const sorted = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
    resultEl.innerText = '当月收入分析：\n' + sorted.map(([t, v]) => `${t}: ${v.toFixed(2)}元`).join('\n');
  });
  document.getElementById('ha-expense-analysis').addEventListener('click', () => {
    const monthRecords = finance.records.filter(r => r.type === 'expense' && r.date.startsWith(ym));
    const byTag = {};
    monthRecords.forEach(r => (byTag[r.tag] = (byTag[r.tag] || 0) + r.value));
    const sorted = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
    resultEl.innerText = '当月支出分析：\n' + sorted.map(([t, v]) => `${t}: ${v.toFixed(2)}元`).join('\n');
  });

  // 收支明细
  document.getElementById('ha-detail').addEventListener('click', () => {
    const sorted = [...finance.records].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sorted.length === 0) {
      resultEl.innerText = '暂无收支记录。';
      return;
    }
    resultEl.innerHTML = '';
    sorted.forEach((r, idx) => {
      const div = document.createElement('div');
      div.style.cssText = 'border-bottom:1px solid #ddd;padding:4px 0;display:flex;justify-content:space-between;align-items:center;';
      const text = document.createElement('span');
      text.textContent = `${new Date(r.date).toLocaleString()} [${r.type === 'income' ? '收入' : '支出'}] ${r.tag}${r.name ? `(${r.name})` : ''}：${r.value}元`;
      const tools = document.createElement('div');
      const edit = document.createElement('button');
      edit.textContent = '✏️';
      edit.style.cssText = 'margin-right:6px;cursor:pointer;';
      const del = document.createElement('button');
      del.textContent = '🗑️';
      del.style.cssText = 'cursor:pointer;';
      edit.addEventListener('click', async () => {
        const newName = prompt('修改名称（可留空）', r.name);
        const newVal = prompt('修改金额（元）', r.value);
        if (!newVal || isNaN(parseFloat(newVal))) return toastr.warning('金额无效');
        r.name = newName || '';
        r.value = parseFloat(newVal);
        saveSettings();
        await appendToWorldInfoFinance();
        updateSummary();
        toastr.success('记录已更新');
        document.getElementById('ha-detail').click();
      });
      del.addEventListener('click', async () => {
        if (!confirm('确认删除该记录？')) return;
        finance.records.splice(idx, 1);
        saveSettings();
        await appendToWorldInfoFinance();
        updateSummary();
        toastr.info('记录已删除');
        document.getElementById('ha-detail').click();
      });
      tools.append(edit, del);
      div.append(text, tools);
      resultEl.appendChild(div);
    });
  });

  renderTags();
  updateSummary();
}

