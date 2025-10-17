// hlh-todo-sw.js - 健康生活助手待办通知 Service Worker
const SW_VERSION = 'hlh-todo-v1';
const NOTIFICATION_TAG_PREFIX = 'hlh-todo-';
// 存储所有待办通知的调度信息
let scheduledNotifications = new Map();
// Service Worker 安装
self.addEventListener('install', (event) => {
  console.log('[HLH-Todo SW] Installing...', SW_VERSION);
  self.skipWaiting();
});
// Service Worker 激活
self.addEventListener('activate', (event) => {
  console.log('[HLH-Todo SW] Activating...', SW_VERSION);
  event.waitUntil(
    clients.claim().then(() => {
      console.log('[HLH-Todo SW] Ready to handle notifications');
      // 加载已保存的通知调度
      return loadScheduledNotifications();
    })
  );
});
// 监听来自主线程的消息
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  console.log('[HLH-Todo SW] Received message:', type, data);
  
  switch (type) {
    case 'SCHEDULE_NOTIFICATION':
      await scheduleNotification(data);
      event.ports[0].postMessage({ success: true });
      break;
      
    case 'CANCEL_NOTIFICATION':
      await cancelNotification(data.todoId);
      event.ports[0].postMessage({ success: true });
      break;
      
    case 'GET_SCHEDULED':
      const scheduled = Array.from(scheduledNotifications.values());
      event.ports[0].postMessage({ scheduled });
      break;
      
    case 'CLEAR_ALL':
      await clearAllNotifications();
      event.ports[0].postMessage({ success: true });
      break;
      
    default:
      console.warn('[HLH-Todo SW] Unknown message type:', type);
  }
});
// 调度通知
async function scheduleNotification(todo) {
  try {
    const { id, name, due, priority, tag } = todo;
    
    if (!due) {
      console.warn('[HLH-Todo SW] Cannot schedule notification without due date');
      return false;
    }
    
    // 解析截止时间
    let dueDateTime;
    if (due.includes('T')) {
      dueDateTime = new Date(due);
    } else {
      dueDateTime = new Date(due + 'T08:00:00');
    }
    
    const now = new Date();
    const delay = dueDateTime.getTime() - now.getTime();
    
    if (delay <= 0) {
      console.warn('[HLH-Todo SW] Due time has passed:', due);
      return false;
    }
    
    // 保存调度信息
    const scheduleData = {
      id,
      name,
      due: dueDateTime.toISOString(),
      priority,
      tag,
      scheduledAt: now.toISOString(),
      fireAt: dueDateTime.toISOString()
    };
    
    scheduledNotifications.set(id, scheduleData);
    
    // 持久化存储
    await saveScheduledNotifications();
    
    // 设置定时器（注意：SW 可能会被终止，所以我们使用轮询检查）
    console.log(`[HLH-Todo SW] Scheduled notification for: ${name} at ${dueDateTime.toISOString()}`);
    
    // 启动轮询检查器
    startNotificationChecker();
    
    return true;
  } catch (error) {
    console.error('[HLH-Todo SW] Error scheduling notification:', error);
    return false;
  }
}
// 取消通知
async function cancelNotification(todoId) {
  if (scheduledNotifications.has(todoId)) {
    scheduledNotifications.delete(todoId);
    await saveScheduledNotifications();
    console.log(`[HLH-Todo SW] Cancelled notification for: ${todoId}`);
    return true;
  }
  return false;
}
// 清除所有通知
async function clearAllNotifications() {
  scheduledNotifications.clear();
  await saveScheduledNotifications();
  console.log('[HLH-Todo SW] Cleared all notifications');
}
// 通知检查器（每分钟检查一次）
let checkerInterval = null;
function startNotificationChecker() {
  if (checkerInterval) return;
  
  checkerInterval = setInterval(async () => {
    await checkAndFireNotifications();
  }, 60000); // 每分钟检查一次
  
  // 立即执行一次检查
  checkAndFireNotifications();
}
// 检查并触发到期的通知
async function checkAndFireNotifications() {
  const now = new Date();
  const toFire = [];
  
  for (const [id, data] of scheduledNotifications.entries()) {
    const fireTime = new Date(data.fireAt);
    
    // 如果当前时间 >= 触发时间，则触发通知
    if (now >= fireTime) {
      toFire.push(data);
    }
  }
  
  // 触发所有到期的通知
  for (const data of toFire) {
    await fireNotification(data);
    scheduledNotifications.delete(data.id);
  }
  
  if (toFire.length > 0) {
    await saveScheduledNotifications();
  }
  
  // 如果没有待触发的通知，停止检查器
  if (scheduledNotifications.size === 0 && checkerInterval) {
    clearInterval(checkerInterval);
    checkerInterval = null;
  }
}
// 触发通知
async function fireNotification(data) {
  try {
    console.log('[HLH-Todo SW] Firing notification:', data.name);
    
    // 显示系统通知
    await self.registration.showNotification('⏰ 待办提醒', {
      body: `任务截止: ${data.name}`,
      icon: '/img/logo.png',
      badge: '/img/logo.png',
      tag: NOTIFICATION_TAG_PREFIX + data.id,
      requireInteraction: true,
      data: {
        todoId: data.id,
        todoName: data.name,
        priority: data.priority,
        tag: data.tag
      },
      actions: [
        { action: 'view', title: '查看' },
        { action: 'close', title: '关闭' }
      ]
    });
    
    // 通知主页面
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({
        type: 'NOTIFICATION_FIRED',
        data: {
          todoId: data.id,
          todoName: data.name
        }
      });
    }
    
    // 震动（如果支持）
    if ('vibrate' in navigator) {
      try {
        await self.registration.vibrate([200, 100, 200, 100, 200]);
      } catch (e) {}
    }
    
  } catch (error) {
    console.error('[HLH-Todo SW] Error firing notification:', error);
  }
}
// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const todoId = event.notification.data.todoId;
  
  if (action === 'view') {
    // 打开或聚焦主窗口
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // 尝试聚焦现有窗口
          for (const client of clientList) {
            if (client.url.includes('claude.ai') && 'focus' in client) {
              return client.focus().then(() => {
                // 通知页面显示该待办
                client.postMessage({
                  type: 'SHOW_TODO',
                  data: { todoId }
                });
              });
            }
          }
          // 如果没有窗口，打开新窗口
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});
// 持久化存储调度信息
async function saveScheduledNotifications() {
  try {
    const data = Array.from(scheduledNotifications.entries());
    await self.caches.open(SW_VERSION).then((cache) => {
      return cache.put(
        new Request('/hlh-todo-scheduled'),
        new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
    console.log('[HLH-Todo SW] Saved scheduled notifications:', data.length);
  } catch (error) {
    console.error('[HLH-Todo SW] Error saving scheduled notifications:', error);
  }
}
// 加载调度信息
async function loadScheduledNotifications() {
  try {
    const cache = await self.caches.open(SW_VERSION);
    const response = await cache.match('/hlh-todo-scheduled');
    
    if (response) {
      const data = await response.json();
      scheduledNotifications = new Map(data);
      console.log('[HLH-Todo SW] Loaded scheduled notifications:', scheduledNotifications.size);
      
      // 启动检查器
      if (scheduledNotifications.size > 0) {
        startNotificationChecker();
      }
    }
  } catch (error) {
    console.error('[HLH-Todo SW] Error loading scheduled notifications:', error);
    scheduledNotifications = new Map();
  }
}
// 周期性唤醒（防止 SW 休眠）
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'hlh-todo-check') {
    event.waitUntil(checkAndFireNotifications());
  }
});
console.log('[HLH-Todo SW] Service Worker script loaded');