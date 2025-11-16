export async function showTodo(MODULE_NAME, ctx, saveSettings, debugLog, content) {
  try { 
    const cs = window.getComputedStyle(content);
    if (cs.position === 'static' || !cs.position) content.style.position = 'relative';
  } catch (e) {}
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">待办事项</div>
    <div style="margin-bottom:6px;">
      <button id="ha-todo-sort-date" class="ha-btn" style="margin-right:4px">按ddl排序</button>
      <button id="ha-todo-sort-priority" class="ha-btn">按优先级排序</button>
      <button id="ha-todo-calendar" class="ha-btn" style="margin-left:4px">日历</button>
      <button id="ha-todo-add-btn" class="ha-btn" style="margin-left:8px">添加待办</button>
    </div>
    <div id="ha-todo-list" class="ha-small" style="margin-bottom:6px;"></div>
    <div id="ha-todo-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
      <div style="font-size:11px;color:#666;">📡 后端状态: <span id="backend-status">检查中...</span></div>
    </div>
  `;
  
  const listEl = document.getElementById('ha-todo-list');
  const debugEl = document.getElementById('ha-todo-subpanel');
  const backendStatusEl = document.getElementById('backend-status');
  const btnCalendar = document.getElementById('ha-todo-calendar');
  
  let backendClient = null;
  let backendReady = false;
  
  function debugLog(...args) {
    const ts = new Date().toLocaleTimeString();
    const msg = `[${ts}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    if (debugEl) {
      debugEl.innerHTML += `<div style="font-size:11px;color:#333;">${msg}</div>`;
      debugEl.scrollTop = debugEl.scrollHeight;
    }
    console.log('[待办模块]', ...args);
  }
  
  class TodoBackendClient {
    constructor() {
      this.eventSource = null;
      this.isConnected = false;
      this.backendUrl = 'http://localhost:8765';
    }
    
    connect() {
      if (this.eventSource) this.eventSource.close();
      debugLog('正在连接后端...');
      this.eventSource = new EventSource(`${this.backendUrl}/events`);
      
      this.eventSource.onopen = () => {
        debugLog('后端已连接 ✓');
        this.isConnected = true;
        backendReady = true;
        backendStatusEl.textContent = '已连接 ✅';
        backendStatusEl.style.color = 'green';
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          debugLog('解析消息失败:', err);
        }
      };
      
      this.eventSource.onerror = () => {
        debugLog('后端连接断开');
        this.isConnected = false;
        backendReady = false;
        backendStatusEl.textContent = '未连接 ❌';
        backendStatusEl.style.color = 'red';
        this.eventSource.close();
        setTimeout(() => this.connect(), 5000);
      };
    }
    
    handleMessage(message) {
      const { type, data } = message;
      debugLog('收到消息:', type);
      
      switch (type) {
        case 'CONNECTED':
          debugLog('后端就绪');
          break;
        case 'TODO_NOTIFICATION_FIRED':
          debugLog('待办通知已触发:', data.todoName);
          const todo = todos.find(t => t.id === data.todoId);
          if (todo) {
            todo.notifyScheduled = false;
            saveSettings();
            render();
          }
          if (typeof toastr !== 'undefined') {
            toastr.warning(`任务截止: ${data.todoName}`, '⏰ 待办提醒', { timeOut: 10000 });
          }
          break;
      }
    }
    
    async syncTodos(todos) {
      if (!this.isConnected) {
        debugLog('后端未连接，无法同步');
        return false;
      }
      try {
        const response = await fetch(`${this.backendUrl}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ todos: todos })
        });
        if (response.ok) {
          debugLog('待办列表已同步到后端');
          return true;
        }
      } catch (err) {
        debugLog('同步失败:', err.message);
      }
      return false;
    }
    
    disconnect() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      this.isConnected = false;
    }
  }
  
  backendClient = new TodoBackendClient();
  backendClient.connect();
  
  if (!ctx.extensionSettings[MODULE_NAME].todo) ctx.extensionSettings[MODULE_NAME].todo = [];
  let todos = ctx.extensionSettings[MODULE_NAME].todo;
  
  todos.forEach(t => {
    if (t.notifyScheduled === undefined) t.notifyScheduled = false;
    if (!t.id) t.id = 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  });
  
async function scheduleNotification(todo) {
  if (!backendReady) {
    if (typeof toastr !== 'undefined') toastr.error('后端未连接');
    return false;
  }
  if (!todo.due) {
    if (typeof toastr !== 'undefined') toastr.info('该待办无截止时间');
    return false;
  }
  
  // 🔥 关键：先设置 notifyScheduled = true
  todo.notifyScheduled = true;
  
  let dueDateTime;
  if (todo.due.includes('T')) {
    dueDateTime = new Date(todo.due);
  } else {
    dueDateTime = new Date(todo.due + 'T08:00:00');
  }
  const now = new Date();
  const delay = dueDateTime.getTime() - now.getTime();
  if (delay <= 0) {
    if (typeof toastr !== 'undefined') toastr.warning('截止时间已过');
    todo.notifyScheduled = false;
    return false;
  }
  
  // 🔥 同步到后端
  const success = await backendClient.syncTodos(todos);
  if (success) {
    const dateStr = dueDateTime.toLocaleString('zh-CN');
    if (typeof toastr !== 'undefined') {
      toastr.success(`已预约通知: ${dateStr}`, '🎯 通知已设置');
    }
    debugLog('通知已调度:', todo.name, dateStr);
    return true;
  } else {
    todo.notifyScheduled = false;
    if (typeof toastr !== 'undefined') toastr.error('通知预约失败');
    return false;
  }
}
  
  async function cancelNotification(todo) {
    if (!backendReady) return;
    await backendClient.syncTodos(todos);
    if (typeof toastr !== 'undefined') toastr.info('已取消通知预约');
    debugLog('通知已取消:', todo.name);
  }
  
  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) return WI;
      }
      return null;
    } catch { return null; }
  }
  
  async function appendToWorldInfoTodoLog() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return;
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('待办') || entry.title === '待办')) {
          targetUID = entry.uid;
          break;
        }
      }
      if (!targetUID) return;
      const arr = todos.map((t,i)=>{
        const due = t.due ? `截止:${t.due}` : '';
        const status = t.done ? '完成' : (t.due && new Date() > new Date(t.due) ? '过期' : '进行中');
        const notify = t.notifyScheduled ? '[🎯已预约]' : '';
        return `${i+1}. [${status}] ${t.name} 优先:${t.priority} 标签:${t.tag} ${due} ${notify}`;
      });
      const newContent = arr.join('\n');
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
    } catch (e) {
      debugLog('写入世界书失败:', e.message || e);
    }
  }
  
  function render(sortMode='date') {
    let arr = [...todos];
    if (sortMode === 'date') {
      arr.sort((a,b)=>{
        const da = a.due ? new Date(a.due) : new Date(0);
        const db = b.due ? new Date(b.due) : new Date(0);
        return da - db;
      });
    } else if (sortMode === 'priority') {
      arr.sort((a,b)=>b.priority-a.priority);
    }
    listEl.innerHTML = '';
    arr.forEach((t,i)=>{
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.marginBottom = '4px';
      const status = t.done ? '完成' : (t.due && new Date() > new Date(t.due) ? '过期' : '进行中');
      const dueText = t.due ? `截止:${t.due}` : '';
      const focusedTime = t.focused ? `已专注:${Math.floor(t.focused / 60)}分钟` : '';
      const textSpan = document.createElement('span');
      textSpan.style.flex = '1';
      textSpan.style.wordBreak = 'break-word';
      textSpan.innerText = `${i+1}. [${status}] ${t.name} 优先:${t.priority} 标签:${t.tag} ${dueText} ${focusedTime}`;
      div.appendChild(textSpan);
      
      const btnNotify = document.createElement('button');
      btnNotify.innerText = '🎯';
      btnNotify.className = 'ha-btn';
      btnNotify.style.marginLeft = '4px';
      btnNotify.style.backgroundColor = t.notifyScheduled ? '#FFD700' : '#fff';
      btnNotify.style.border = '1px solid ' + (t.notifyScheduled ? '#FFD700' : '#ccc');
      btnNotify.onclick = async () => {
        if (t.notifyScheduled) {
          t.notifyScheduled = false;
          await cancelNotification(t);
        } else {
          const success = await scheduleNotification(t);
          if (success) t.notifyScheduled = true;
        }
        saveSettings();
        render(sortMode);
        appendToWorldInfoTodoLog();
      };
      div.appendChild(btnNotify);
      
      const btnDone = document.createElement('button');
      btnDone.innerText = '完成';
      btnDone.className = 'ha-btn';
      btnDone.style.marginLeft = '4px';
      btnDone.onclick = async ()=>{
        t.done=true;
        if (t.notifyScheduled) {
          await cancelNotification(t);
          t.notifyScheduled = false;
        }
        saveSettings();
        render(sortMode);
        appendToWorldInfoTodoLog();
      };
      div.appendChild(btnDone);
      
      const btnEdit = document.createElement('button');
      btnEdit.innerText = '编辑';
      btnEdit.className = 'ha-btn';
      btnEdit.style.marginLeft = '4px';
      btnEdit.onclick = ()=>openTodoDialog(t,sortMode);
      div.appendChild(btnEdit);
      
      const btnDel = document.createElement('button');
      btnDel.innerText = '删除';
      btnDel.className = 'ha-btn';
      btnDel.style.marginLeft = '4px';
      btnDel.onclick = async ()=>{
        if (!confirm('确认删除该待办?')) return;
        if (t.notifyScheduled) await cancelNotification(t);
        todos.splice(todos.indexOf(t),1);
        saveSettings();
        render(sortMode);
        appendToWorldInfoTodoLog();
      };
      div.appendChild(btnDel);
      listEl.appendChild(div);
    });
    appendToWorldInfoTodoLog();
  }
  
  function openTodoDialog(t,sortMode) {
    const dialog = document.createElement('div');
    const isNew = !t;
    const todo = t || {name:'',due:'',priority:3,tag:''};
    const dueDate = todo.due ? (todo.due.split('T')[0]||'') : '';
    const dueTime = todo.due ? (todo.due.split('T')[1]||'') : '';
    dialog.innerHTML = `
      <div style="background:#fff;padding:8px;border-radius:6px;box-shadow:0 1px 6px rgba(0,0,0,0.12);max-width:320px;margin:auto;">
        <div style="font-weight:600;margin-bottom:0px;">${isNew?'添加':'编辑'}待办</div>
        <label style="font-size:13px">名称:</label><br>
        <input id="todo-name" type="text" style="width:100%;margin-bottom:0px;padding:0px;" value="${escapeHtml(todo.name)}"><br>
        <label style="font-size:13px">截止日期:</label><br>
        <input id="todo-date" type="date" style="width:100%;margin-bottom:0px;padding:0px;"><br>
        <label style="font-size:13px">截止时间:</label><br>
        <input id="todo-time" type="time" style="width:100%;margin-bottom:0px;padding:0px;"><br>
        <label style="font-size:13px">优先级:</label><br>
        <input id="todo-priority" type="number" min="1" max="5" value="${todo.priority}" style="width:100%;margin-bottom:0px;padding:0px;"><br>
        <label style="font-size:13px">标签:</label><br>
        <input id="todo-tag" type="text" style="width:100%;margin-bottom:0px;padding:0px;" value="${escapeHtml(todo.tag)}"><br>
        <div style="text-align:right;">
          <button id="todo-ok" class="ha-btn">确定</button>
          <button id="todo-cancel" class="ha-btn" style="margin-left:6px;">取消</button>
        </div>
      </div>`;
    Object.assign(dialog.style,{position:'absolute',top:'8px',left:'8px',right:'8px',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99999});
    content.appendChild(dialog);
    dialog.querySelector('#todo-date').value=dueDate;
    dialog.querySelector('#todo-time').value=dueTime;
    dialog.querySelector('#todo-cancel').onclick=()=>dialog.remove();
    dialog.querySelector('#todo-ok').onclick= async ()=>{
      const name=dialog.querySelector('#todo-name').value.trim();
      if(!name)return alert('名称不能为空');
      const date=dialog.querySelector('#todo-date').value;
      const time=dialog.querySelector('#todo-time').value;
      const due=date?(time?`${date}T${time}`:date):'';
      const priority=parseInt(dialog.querySelector('#todo-priority').value)||3;
      const tag=dialog.querySelector('#todo-tag').value.trim();
      if(isNew){
        const id='todo_'+Date.now()+'_'+Math.random().toString(36).substr(2,9);
        todos.push({id,name,due,priority,tag,done:false,notifyScheduled:false});
      }else{
        const oldDue = t.due;
        t.name=name;
        t.due=due;
        t.priority=priority;
        t.tag=tag;
        if (t.notifyScheduled && oldDue !== due) {
          await cancelNotification(t);
          if (due) {
            const success = await scheduleNotification(t);
            t.notifyScheduled = success;
          } else {
            t.notifyScheduled = false;
          }
        }
      }
      saveSettings();
      if (backendClient && backendReady) {
        await backendClient.syncTodos(todos);
      }
      render(sortMode);
      appendToWorldInfoTodoLog();
      dialog.remove();
    };
  }
  
  document.getElementById('ha-todo-add-btn').onclick=()=>openTodoDialog(null,'date');
  document.getElementById('ha-todo-sort-date').onclick=()=>render('date');
  document.getElementById('ha-todo-sort-priority').onclick=()=>render('priority');
  
  btnCalendar.addEventListener('click', ()=>{
    const dialog=document.createElement('div');
    dialog.innerHTML=`
      <div style="background:#fff;padding:10px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:800px;width:95%;margin:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <button id="cal-day" class="ha-btn" style="margin-right:4px;">当日</button>
            <button id="cal-week" class="ha-btn" style="margin-right:4px;">7天</button>
            <button id="cal-month" class="ha-btn">当月</button>
          </div>
          <button id="cal-close" class="ha-btn" style="font-size:12px;">关闭</button>
        </div>
        <div id="cal-panel" style="max-height:480px;overflow:auto;font-size:13px;white-space:pre-wrap;border-top:1px solid #ddd;padding-top:6px;"></div>
      </div>`;
    Object.assign(dialog.style,{position:'absolute',top:'6px',left:'4px',right:'4px',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:99999});
    content.appendChild(dialog);
    const panel=dialog.querySelector('#cal-panel');
    
    function renderDay(){
      const now=new Date();
      const dateStr=now.toISOString().split('T')[0];
      let text=`📅 ${dateStr} 当日任务\n\n`;
      const start=new Date(dateStr+'T00:00');
      for(let h=0;h<24;h+=2){
        const slotStart=new Date(start.getTime()+h*3600*1000);
        const slotEnd=new Date(start.getTime()+(h+2)*3600*1000);
        const slotTasks=todos.filter(t=>t.due && new Date(t.due)>=slotStart && new Date(t.due)<slotEnd);
        const timeLabel=slotStart.toTimeString().slice(0,5)+' - '+slotEnd.toTimeString().slice(0,5);
        if(slotTasks.length){
          text+=`⏰ ${timeLabel}\n`;
          slotTasks.forEach(tt=>{
            const status=tt.done?'✅':'🔸';
            const notify=tt.notifyScheduled?'🎯':'';
            text+=`  ${status}${notify} ${tt.name} (优先:${tt.priority})\n`;
          });
        }
      }
      panel.innerText=text || '今日暂无任务。';
    }
    
    function renderWeek(){
      const now=new Date();
      const todayStr=now.toISOString().split('T')[0];
      let text=`📅 ${todayStr} 起未来7天任务\n\n`;
      for(let i=0;i<7;i++){
        const d=new Date(now.getTime()+i*86400000);
        const dayStr=d.toISOString().split('T')[0];
        const dayTasks=todos.filter(t=>t.due && t.due.startsWith(dayStr));
        if(dayTasks.length){
          text+=`📆 ${dayStr}\n`;
          dayTasks.forEach(tt=>{
            const status=tt.done?'✅':'🔸';
            const notify=tt.notifyScheduled?'🎯':'';
            text+=`  ${status}${notify} ${tt.name} (优先:${tt.priority})\n`;
          });
          text+='\n';
        }
      }
      panel.innerText=text || '未来7天暂无任务。';
    }
    
    function renderMonth(){
      const now=new Date();
      const year=now.getFullYear();
      const month=now.getMonth();
      const firstDay=new Date(year,month,1);
      const lastDay=new Date(year,month+1,0);
      const startWeekday=firstDay.getDay();
      const totalDays=lastDay.getDate();
      panel.style.padding='0';
      panel.style.margin='0';
      panel.style.lineHeight='1';
      panel.style.fontSize='0';
      panel.style.overflow='hidden';
      let gridHTML=`<div style="text-align:center;font-weight:600;margin:0 0 2px 0;padding:0;line-height:1;font-size:13px;">📅 ${year}年${month+1}月</div>`;
      gridHTML+=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0;margin:0 0 2px 0;padding:0;font-weight:600;font-size:12px;">`+
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">日</div>`+
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">一</div>`+
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">二</div>`+
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">三</div>`+
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">四</div>`+
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">五</div>`+
        `<div style="display:flex;align-items:center;justify-content:center;height:28px;">六</div>`+
        `</div>`;
      gridHTML+=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:11px;line-height:1;grid-auto-rows:28px;margin-top:0;">`;
      for(let i=0;i<startWeekday;i++)gridHTML+=`<div></div>`;
      for(let day=1;day<=totalDays;day++){
        const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dayTasks=todos.filter(t=>t.due && t.due.startsWith(dateStr));
        const hasTasks=dayTasks.length>0;
        const todayStr=new Date().toISOString().split('T')[0];
        const isToday=dateStr===todayStr;
        const bg=hasTasks?'rgba(144,238,144,0.4)':isToday?'rgba(0,128,255,0.1)':'#f8f8f8';
        const border='1px solid #ccc';
        const color=hasTasks?'#000':'#999';
        let inner=`<div style="font-weight:600;font-size:11px;margin-bottom:1px;">${day}</div>`;
        inner+=hasTasks?`<div style="font-size:12px;font-weight:600;">${dayTasks.length}</div>`:`<div style="color:#bbb;">无</div>`;
        gridHTML+=`<div class="cal-cell" data-date="${dateStr}" style="background:${bg};border:${border};border-radius:3px;padding:1px 0;cursor:pointer;color:${color};display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:28px;line-height:1.2;">${inner}</div>`;
      }
      gridHTML+=`</div>`;
      panel.innerHTML=gridHTML;
      panel.querySelectorAll('.cal-cell').forEach(cell=>{
        cell.addEventListener('click',()=>{
          const d=cell.dataset.date;
          const dayTasks=todos.filter(t=>t.due && t.due.startsWith(d));
          const popup=document.createElement('div');
          popup.innerHTML=`<div style="background:#fff;border:1px solid #ccc;border-radius:6px;padding:8px;box-shadow:0 2px 8px rgba(0,0,0,0.2);max-width:320px;"><div style="font-weight:600;margin-bottom:4px;">📅 ${d} 的任务</div><div style="max-height:240px;overflow:auto;font-size:13px;">${dayTasks.length?dayTasks.map(t=>{const status=t.done?'✅':'🔸';const notify=t.notifyScheduled?'🎯':'';const dueTime=(t.due.split('T')[1]||'').slice(0,5);return `<div>${status}${notify}${escapeHtml(t.name)} ${dueTime?`(${dueTime})`:''}</div>`;}).join(''):'<div>暂无任务。</div>'}</div><div style="text-align:right;margin-top:6px;"><button class="ha-btn cal-close-mini" style="font-size:12px;">关闭</button></div></div>`;
          Object.assign(popup.style,{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%, -50%)',zIndex:100000,display:'flex',justifyContent:'center',alignItems:'center'});
          content.appendChild(popup);
          popup.querySelector('.cal-close-mini').onclick=()=>popup.remove();
        });
      });
    }
    
    dialog.querySelector('#cal-day').onclick=renderDay;
    dialog.querySelector('#cal-week').onclick=renderWeek;
    dialog.querySelector('#cal-month').onclick=renderMonth;
    dialog.querySelector('#cal-close').onclick=()=>dialog.remove();
    renderDay();
  });
  
  function escapeHtml(str){return str?String(str).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])):'';}
  
  render();
}
