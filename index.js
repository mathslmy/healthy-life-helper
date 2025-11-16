// 健康生活助手 - 模块化版本

//You'll likely need to import extension_settings, getContext, and loadExtensionSettings from extensions.js
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

//You'll likely need to import some other functions from the main script
import { saveSettingsDebounced } from "../../../../script.js";

// 导入工具函数
import { enableDrag } from './src/utils.js';

// 导入所有功能模块
import { showWardrobe } from './src/showWardrobe.js';
import { showPomodoro } from './src/showPomodoro.js';
import { showRoutine } from './src/showRoutine.js';
import { showDiet } from './src/showDiet.js';
import { showMental } from './src/showMental.js';
import { showExercise } from './src/showExercise.js';
import { showFinance } from './src/showFinance.js';
import { showWishes } from './src/showWishes.js';
import { showSocial } from './src/showSocial.js';
import { showTodo } from './src/showTodo.js';
import { showMemo } from './src/showMemo.js';
import { showBgm } from './src/showBgm.js';
import { showClearBook } from './src/showClearBook.js';
import { showApiConfig } from './src/showApiConfig.js';

const MODULE_NAME = '健康生活助手';

// 等待 SillyTavern 环境准备（若已经存在则立刻用）
function ready(fn) {
  if (window.SillyTavern && SillyTavern.getContext) return fn();
  const i = setInterval(() => {
    if (window.SillyTavern && SillyTavern.getContext) {
      clearInterval(i);
      fn();
    }
  }, 200);
  // 超时后仍尝试执行
  setTimeout(fn, 5000);
}

// 初始化扩展
ready(() => {
  console.log('[健康生活助手] 开始初始化...');
  try {
    const ctx = SillyTavern.getContext();
    console.log('[健康生活助手] 获取 context 成功');

    // 初始化 extensionSettings 存储
    if (!ctx.extensionSettings[MODULE_NAME]) {
      ctx.extensionSettings[MODULE_NAME] = {
        sleep: [],
        diet: [],
        mental: [],
        meditation: [],
        thoughtChains: [],
        confessions: [],
        exercise: [],
        wishes: [],
        social: {},
        todo: [],
        memo: [],
        bgmTags: [],
        pomodoro: {
          timeBlocks: [],
          tagBlocks: [],
          records: [],
          selectedTimeBlock: null,
          selectedTag: null,
          session: null,
          tagDeleteMode: false,
          timeDeleteMode: false,
          notifyConfig: {
            vibrate: true,
            ring: true,
            ringUrl: ''
          }
        },
        // wardrobe 正确结构
        wardrobe: {
          items: [],
          tags: {
            top: [],
            bottom: [],
            shoes: [],
            accessory: [],
            outfit: []
          }
        },
        // finance 正确结构 - 匹配 showFinance 的期望
        finance: {
          incomeTags: [],
          expenseTags: [],
          records: []
        },
        apiConfig: {}
      };
      if (ctx.saveSettingsDebounced) {
        ctx.saveSettingsDebounced();
      }
    } else {
      // 验证并修复现有数据结构
      const settings = ctx.extensionSettings[MODULE_NAME];

      // 修复 wardrobe
      if (!settings.wardrobe || Array.isArray(settings.wardrobe)) {
        settings.wardrobe = {
          items: [],
          tags: {
            top: [],
            bottom: [],
            shoes: [],
            accessory: [],
            outfit: []
          }
        };
      }

      // 修复 finance - 检查旧格式并转换
      if (!settings.finance) {
        settings.finance = {
          incomeTags: [],
          expenseTags: [],
          records: []
        };
      } else if (settings.finance.income !== undefined || settings.finance.expense !== undefined) {
        // 从旧格式迁移到新格式
        const oldFinance = settings.finance;
        settings.finance = {
          incomeTags: oldFinance.income || [],
          expenseTags: oldFinance.expense || [],
          records: oldFinance.records || []
        };
      } else {
        // 确保所有必需的属性存在
        settings.finance.incomeTags = settings.finance.incomeTags || [];
        settings.finance.expenseTags = settings.finance.expenseTags || [];
        settings.finance.records = settings.finance.records || [];
      }

      // 修复 pomodoro - 检查旧格式并转换
      if (!settings.pomodoro || Array.isArray(settings.pomodoro)) {
        const oldRecords = Array.isArray(settings.pomodoro) ? settings.pomodoro : [];
        settings.pomodoro = {
          timeBlocks: [],
          tagBlocks: [],
          records: oldRecords,
          selectedTimeBlock: null,
          selectedTag: null,
          session: null,
          tagDeleteMode: false,
          timeDeleteMode: false,
          notifyConfig: {
            vibrate: true,
            ring: true,
            ringUrl: ''
          }
        };
      } else {
        // 确保所有必需的属性存在
        settings.pomodoro.timeBlocks = settings.pomodoro.timeBlocks || [];
        settings.pomodoro.tagBlocks = settings.pomodoro.tagBlocks || [];
        settings.pomodoro.records = settings.pomodoro.records || [];
        if (!settings.pomodoro.notifyConfig) {
          settings.pomodoro.notifyConfig = {
            vibrate: true,
            ring: true,
            ringUrl: ''
          };
        }
      }

      // 确保其他数组存在
      settings.sleep = settings.sleep || [];
      settings.diet = settings.diet || [];
      settings.mental = settings.mental || [];
      settings.meditation = settings.meditation || [];
      settings.thoughtChains = settings.thoughtChains || [];
      settings.confessions = settings.confessions || [];
      settings.exercise = settings.exercise || [];
      settings.wishes = settings.wishes || [];
      settings.todo = settings.todo || [];
      settings.memo = settings.memo || [];
      settings.bgmTags = settings.bgmTags || [];
      settings.social = settings.social || {};

      // 迁移旧格式的心理健康数据到新格式(带enabled字段)
      if (settings.mental && settings.mental.length > 0) {
        settings.mental = settings.mental.map(item => {
          if (typeof item === 'string') {
            return {
              text: item,
              ts: new Date().toISOString(),
              enabled: true
            };
          } else if (item.enabled === undefined) {
            return {
              ...item,
              enabled: true
            };
          }
          return item;
        });
      }

      if (settings.meditation && settings.meditation.length > 0) {
        settings.meditation = settings.meditation.map(item => {
          if (typeof item === 'string') {
            return {
              text: item,
              ts: new Date().toISOString(),
              enabled: true
            };
          } else if (item.enabled === undefined) {
            return {
              ...item,
              enabled: true
            };
          }
          return item;
        });
      }

      if (settings.thoughtChains && settings.thoughtChains.length > 0) {
        settings.thoughtChains = settings.thoughtChains.map(item => {
          if (typeof item === 'string') {
            return {
              text: item,
              ts: new Date().toISOString(),
              enabled: true
            };
          } else if (item.enabled === undefined) {
            return {
              ...item,
              enabled: true
            };
          }
          return item;
        });
      }

      if (settings.confessions && settings.confessions.length > 0) {
        settings.confessions = settings.confessions.map(item => {
          if (typeof item === 'string') {
            return {
              text: item,
              ts: new Date().toISOString(),
              enabled: true
            };
          } else if (item.enabled === undefined) {
            return {
              ...item,
              enabled: true
            };
          }
          return item;
        });
      }

      if (ctx.saveSettingsDebounced) {
        ctx.saveSettingsDebounced();
      }
    }

    // 创建 DOM
    if (document.getElementById('health-assistant-fab')) {
      console.log('[健康生活助手] FAB 已存在，跳过初始化');
      return;
    }

    console.log('[健康生活助手] 开始创建 DOM 元素...');

    const fab = document.createElement('div');
    fab.id = 'health-assistant-fab';
    fab.title = '健康生活助手';
    fab.innerText = '🍀';
    document.body.appendChild(fab);
    console.log('[健康生活助手] FAB 按钮已添加到页面');

    // 启用拖动
    enableDrag(fab);
    console.log('[健康生活助手] 拖动功能已启用');

    const panel = document.createElement('div');
    panel.id = 'health-assistant-panel';
    panel.innerHTML = `
      <div class="ha-header">
        <div>
          <div style="font-weight:600">健康生活助手</div>
          <div id="ha-datetime" style="font-size:12px;color:#666"></div>
        </div>
        <div style="font-size:12px; color:#999; align-self:center">v0.1</div>
      </div>

      <div class="ha-grid">
        <div class="ha-btn" data-key="routine">规律作息</div>
        <div class="ha-btn" data-key="diet">健康饮食</div>
        <div class="ha-btn" data-key="mental">心理健康</div>
        <div class="ha-btn" data-key="exercise">适度运动</div>
        <div class="ha-btn" data-key="wardrobe">用户衣柜</div>
        <div class="ha-btn" data-key="finance">收支平衡</div>
        <div class="ha-btn" data-key="wishes">心愿清单</div>
        <div class="ha-btn" data-key="social">习惯养成</div>
        <div class="ha-btn" data-key="todo">待办事项</div>
        <div class="ha-btn" data-key="pomodoro">专注番茄</div>
        <div class="ha-btn" data-key="memo">随笔备忘</div>
        <div class="ha-btn" data-key="bgm">背景音乐</div>
        <div class="ha-btn" data-key="apiconf">独立API</div>
        <div class="ha-btn" data-key="clearbook">清除数据</div>
      </div>

      <div id="ha-content-area" class="ha-subpanel" style="display:block;">
        <div class="ha-small">请选择一个功能</div>
      </div>
    `;
    document.body.appendChild(panel);
    console.log('[健康生活助手] 主面板已添加到页面');

    // 更新时钟
    const dtEl = panel.querySelector('#ha-datetime');
    function updateClock(){
      const d = new Date();
      dtEl.innerText = d.toLocaleString();
    }
    updateClock();
    setInterval(updateClock, 1000);

    // 面板切换
    fab.addEventListener('click', () => {
      const newDisplay = panel.style.display === 'block' ? 'none' : 'block';
      panel.style.display = newDisplay;
      console.log('[健康生活助手] 面板切换为:', newDisplay);
    });

    // 简单的 helper：保存 settings
    function saveSettings() {
      if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
      else console.warn('saveSettingsDebounced not available - changes may not persist until reload');
    }

    // 调试日志（轻量）
    function debugLog(...args) {
      // 打开 window.DEBUG_HEALTH_ASSISTANT 可查看日志
      if (window.DEBUG_HEALTH_ASSISTANT) console.log('[健康生活助手]', ...args);
    }

    // 打开各主面板
    const content = panel.querySelector('#ha-content-area');
    panel.querySelectorAll('.ha-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        console.log('[健康生活助手] 点击按钮:', key);
        if (key === 'routine') showRoutine(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'diet') showDiet(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'mental') showMental(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'exercise') showExercise(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'finance') showFinance(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'wardrobe') showWardrobe(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'wishes') showWishes(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'social') showSocial(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'todo') showTodo(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'pomodoro') showPomodoro(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'memo') showMemo(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'bgm') showBgm(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'clearbook') showClearBook(MODULE_NAME, ctx, saveSettings, debugLog, content);
        else if (key === 'apiconf') showApiConfig(MODULE_NAME, ctx, saveSettings, debugLog, content);
      });
    });

    console.log('[健康生活助手] 初始化完成！');

  } catch (err) {
    console.error('健康生活助手初始化失败', err);
  }
});
