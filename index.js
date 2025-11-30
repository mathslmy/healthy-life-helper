// 健康生活助手 - 完整版本（包含睡眠、饮食、运动、心理健康、备忘录、财务、主题定期清除功能）

import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

(function () {
  const MODULE_NAME = '健康生活助手';

  function ready(fn) {
    if (window.SillyTavern && SillyTavern.getContext) return fn();
    const i = setInterval(() => {
      if (window.SillyTavern && SillyTavern.getContext) {
        clearInterval(i);
        fn();
      }
    }, 200);
    setTimeout(fn, 5000);
  }

ready(() => {
  try {
    const ctx = SillyTavern.getContext();
    
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
        todos: [],
        memo: [],
        reviews: [],
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
        finance: {
          incomeTags: [],
          expenseTags: [],
          records: []
        },
        theme: {
          mainBackground: null,
          subpanelBackground: null,
          mainColor: null,
          subpanelColor: null,
          buttonColor: null
        },
        apiConfig: {},
        sleepAutoClean: {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        },
        dietAutoClean: {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        },
        exerciseAutoClean: {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        },
        mentalAutoClean: {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        },
        memoAutoClean: {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        },
        financeAutoClean: {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        }
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
      
      // 修复 finance
      if (!settings.finance) {
        settings.finance = {
          incomeTags: [],
          expenseTags: [],
          records: []
        };
      } else if (settings.finance.income !== undefined || settings.finance.expense !== undefined) {
        const oldFinance = settings.finance;
        settings.finance = {
          incomeTags: oldFinance.income || [],
          expenseTags: oldFinance.expense || [],
          records: oldFinance.records || []
        };
      } else {
        settings.finance.incomeTags = settings.finance.incomeTags || [];
        settings.finance.expenseTags = settings.finance.expenseTags || [];
        settings.finance.records = settings.finance.records || [];
      }
      
      // 修复 theme
      if (!settings.theme) {
        settings.theme = {
          mainBackground: null,
          subpanelBackground: null,
          mainColor: null,
          subpanelColor: null,
          buttonColor: null
        };
      } else {
        if (settings.theme.mainColor === undefined) settings.theme.mainColor = null;
        if (settings.theme.subpanelColor === undefined) settings.theme.subpanelColor = null;
        if (settings.theme.buttonColor === undefined) settings.theme.buttonColor = null;
      }
      
      // 修复 pomodoro
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
      
      // 修复并转换 todos 数据格式
      if (!settings.todos) {
        settings.todos = [];
      } else if (Array.isArray(settings.todos)) {
        settings.todos = settings.todos.map(t => {
          if (!t.id) {
            t.id = 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          }
          
          if (t.name === undefined) t.name = '';
          if (t.due === undefined) t.due = '';
          if (t.priority === undefined) t.priority = 3;
          if (t.tag === undefined) t.tag = '';
          if (t.done === undefined) t.done = false;
          if (t.notifyScheduled === undefined) t.notifyScheduled = false;
          if (t.focused === undefined) t.focused = 0;
          
          if (t.recurrence === undefined) {
            t.recurrence = null;
          }
          
          return t;
        });
        
        console.log(`[健康生活助手] Todos 数据已转换: ${settings.todos.length} 条记录`);
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
      settings.memo = settings.memo || [];
      settings.reviews = settings.reviews || [];
      settings.bgmTags = settings.bgmTags || [];
      settings.social = settings.social || {};
      
      // 初始化各种定期清除配置
      if (!settings.sleepAutoClean) {
        settings.sleepAutoClean = {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        };
      }
      
      if (!settings.dietAutoClean) {
        settings.dietAutoClean = {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        };
      }
      
      if (!settings.exerciseAutoClean) {
        settings.exerciseAutoClean = {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        };
      }
      
      if (!settings.mentalAutoClean) {
        settings.mentalAutoClean = {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        };
      }
      
      if (!settings.memoAutoClean) {
        settings.memoAutoClean = {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        };
      }
      
      if (!settings.financeAutoClean) {
        settings.financeAutoClean = {
          days: 30,
          cleanLocalStorage: false,
          cleanWorldBook: false,
          lastCleanDate: null
        };
      }
      
      // 迁移旧格式数据
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
    
    
    // 睡眠定期清除调度逻辑
    function checkAndPerformSleepAutoClean() {
      const config = ctx.extensionSettings[MODULE_NAME].sleepAutoClean;
      if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentHour = now.getHours();
      
      const needsClean = !config.lastCleanDate || 
                        (config.lastCleanDate !== today && currentHour >= 4);
      
      if (needsClean) {
        console.log('[健康生活助手] 标记睡眠定期清除...');
        ctx.extensionSettings[MODULE_NAME].sleepAutoClean._needsClean = true;
        if (ctx.saveSettingsDebounced) {
          ctx.saveSettingsDebounced();
        }
      }
    }
    
    // 饮食定期清除调度逻辑
    function checkAndPerformDietAutoClean() {
      const config = ctx.extensionSettings[MODULE_NAME].dietAutoClean;
      if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentHour = now.getHours();
      
      const needsClean = !config.lastCleanDate || 
                        (config.lastCleanDate !== today && currentHour >= 4);
      
      if (needsClean) {
        console.log('[健康生活助手] 标记饮食定期清除...');
        ctx.extensionSettings[MODULE_NAME].dietAutoClean._needsClean = true;
        if (ctx.saveSettingsDebounced) {
          ctx.saveSettingsDebounced();
        }
      }
    }
    
    // 运动定期清除调度逻辑
    function checkAndPerformExerciseAutoClean() {
      const config = ctx.extensionSettings[MODULE_NAME].exerciseAutoClean;
      if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentHour = now.getHours();
      
      const needsClean = !config.lastCleanDate || 
                        (config.lastCleanDate !== today && currentHour >= 4);
      
      if (needsClean) {
        console.log('[健康生活助手] 标记运动定期清除...');
        ctx.extensionSettings[MODULE_NAME].exerciseAutoClean._needsClean = true;
        if (ctx.saveSettingsDebounced) {
          ctx.saveSettingsDebounced();
        }
      }
    }
    
    // 心理健康定期清除调度逻辑
    function checkAndPerformMentalAutoClean() {
      const config = ctx.extensionSettings[MODULE_NAME].mentalAutoClean;
      if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentHour = now.getHours();
      
      const needsClean = !config.lastCleanDate || 
                        (config.lastCleanDate !== today && currentHour >= 4);
      
      if (needsClean) {
        console.log('[健康生活助手] 标记心理健康定期清除...');
        ctx.extensionSettings[MODULE_NAME].mentalAutoClean._needsClean = true;
        if (ctx.saveSettingsDebounced) {
          ctx.saveSettingsDebounced();
        }
      }
    }
    
    // 备忘录定期清除调度逻辑
    function checkAndPerformMemoAutoClean() {
      const config = ctx.extensionSettings[MODULE_NAME].memoAutoClean;
      if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentHour = now.getHours();
      
      const needsClean = !config.lastCleanDate || 
                        (config.lastCleanDate !== today && currentHour >= 4);
      
      if (needsClean) {
        console.log('[健康生活助手] 标记备忘录定期清除...');
        ctx.extensionSettings[MODULE_NAME].memoAutoClean._needsClean = true;
        if (ctx.saveSettingsDebounced) {
          ctx.saveSettingsDebounced();
        }
      }
    }
    
    // 财务定期清除调度逻辑
    function checkAndPerformFinanceAutoClean() {
      const config = ctx.extensionSettings[MODULE_NAME].financeAutoClean;
      if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentHour = now.getHours();
      
      const needsClean = !config.lastCleanDate || 
                        (config.lastCleanDate !== today && currentHour >= 4);
      
      if (needsClean) {
        console.log('[健康生活助手] 标记财务定期清除...');
        ctx.extensionSettings[MODULE_NAME].financeAutoClean._needsClean = true;
        if (ctx.saveSettingsDebounced) {
          ctx.saveSettingsDebounced();
        }
      }
    }
    
    // 启动时统一执行定期清除
async function performAllAutoClean() {
  console.log('[健康生活助手] 开始检查所有模块的定期清除任务');
  
  const sleepConfig = ctx.extensionSettings[MODULE_NAME].sleepAutoClean;
  if (sleepConfig && sleepConfig._needsClean) {
    console.log('[健康生活助手] 执行睡眠定期清除');
    delete sleepConfig._needsClean;
    if (sleepConfig.cleanLocalStorage || sleepConfig.cleanWorldBook) {
      await performSleepAutoClean(sleepConfig.days);
      toastr.info(`已自动清除 ${sleepConfig.days} 天前的睡眠记录`, '定期清除');
    }
  }
  
  const dietConfig = ctx.extensionSettings[MODULE_NAME].dietAutoClean;
  if (dietConfig && dietConfig._needsClean) {
    console.log('[健康生活助手] 执行饮食定期清除');
    delete dietConfig._needsClean;
    if (dietConfig.cleanLocalStorage || dietConfig.cleanWorldBook) {
      await performDietAutoClean(dietConfig.days);
      toastr.info(`已自动清除 ${dietConfig.days} 天前的饮食记录`, '定期清除');
    }
  }
  
  const exerciseConfig = ctx.extensionSettings[MODULE_NAME].exerciseAutoClean;
  if (exerciseConfig && exerciseConfig._needsClean) {
    console.log('[健康生活助手] 执行运动定期清除');
    delete exerciseConfig._needsClean;
    if (exerciseConfig.cleanLocalStorage || exerciseConfig.cleanWorldBook) {
      await performExerciseAutoClean(exerciseConfig.days);
      toastr.info(`已自动清除 ${exerciseConfig.days} 天前的运动记录`, '定期清除');
    }
  }
  
  const mentalConfig = ctx.extensionSettings[MODULE_NAME].mentalAutoClean;
  if (mentalConfig && mentalConfig._needsClean) {
    console.log('[健康生活助手] 执行心理健康定期清除');
    delete mentalConfig._needsClean;
    if (mentalConfig.cleanLocalStorage || mentalConfig.cleanWorldBook) {
      await performMentalAutoClean(mentalConfig.days);
      toastr.info(`已自动清除 ${mentalConfig.days} 天前的心理记录`, '定期清除');
    }
  }
  
  const memoConfig = ctx.extensionSettings[MODULE_NAME].memoAutoClean;
  if (memoConfig && memoConfig._needsClean) {
    console.log('[健康生活助手] 执行备忘录定期清除');
    delete memoConfig._needsClean;
    if (memoConfig.cleanLocalStorage || memoConfig.cleanWorldBook) {
      await performMemoAutoClean(memoConfig.days);
      toastr.info(`已自动清除 ${memoConfig.days} 天前的备忘录`, '定期清除');
    }
  }
  
  const financeConfig = ctx.extensionSettings[MODULE_NAME].financeAutoClean;
  if (financeConfig && financeConfig._needsClean) {
    console.log('[健康生活助手] 执行财务定期清除');
    delete financeConfig._needsClean;
    if (financeConfig.cleanLocalStorage || financeConfig.cleanWorldBook) {
      await performFinanceAutoClean(financeConfig.days);
      toastr.info(`已自动清除 ${financeConfig.days} 天前的财务记录`, '定期清除');
    }
  }
  
  if (ctx.saveSettingsDebounced) {
    ctx.saveSettingsDebounced();
  }
  
  console.log('[健康生活助手] 定期清除检查完成');
}

// 睡眠定期清除函数
async function performSleepAutoClean(daysToKeep) {
  const config = ctx.extensionSettings[MODULE_NAME].sleepAutoClean;
  if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  function parseISODate(isoString) {
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  
  const records = ctx.extensionSettings[MODULE_NAME].sleep || [];
  
  if (config.cleanLocalStorage) {
    const filteredRecords = records.filter(rec => {
      const recDate = parseISODate(rec.ts);
      return recDate && recDate >= cutoffDate;
    });
    
    const removedCount = records.length - filteredRecords.length;
    if (removedCount > 0) {
      ctx.extensionSettings[MODULE_NAME].sleep = filteredRecords;
      saveSettings();
      console.log(`[健康生活助手] 自动清除: 从 localStorage 删除了 ${removedCount} 条睡眠记录`);
    }
  }
  
  if (config.cleanWorldBook) {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      let fileId = null;
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          fileId = WI;
          break;
        }
      }
      
      if (fileId) {
        const worldInfo = await moduleWI.loadWorldInfo(fileId);
        const entries = worldInfo.entries || {};
        
        let targetUID = null;
        for (const id in entries) {
          const entry = entries[id];
          const comment = entry.comment || '';
          if (!entry.disable && (comment.includes('睡眠') || entry.title === '睡眠')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (targetUID) {
          const currentRecords = ctx.extensionSettings[MODULE_NAME].sleep || [];
          const enabledRecords = currentRecords.filter(rec => rec.enabled !== false);
          
          const newContent = enabledRecords.map(rec => {
            const typeText = rec.type === 'wake' ? '起床' : '入睡';
            return `${typeText} 打卡 @ ${rec.ts}`;
          }).join('\n');
          
          await globalThis.SillyTavern.getContext()
            .SlashCommandParser.commands['setentryfield']
            .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
          
          console.log('[健康生活助手] 自动清除: 已同步睡眠世界书');
        }
      }
    } catch (e) {
      console.error('[健康生活助手] 自动清除睡眠世界书失败:', e);
    }
  }
  
  config.lastCleanDate = new Date().toISOString().split('T')[0];
  saveSettings();
}

// 饮食定期清除函数
async function performDietAutoClean(daysToKeep) {
  const config = ctx.extensionSettings[MODULE_NAME].dietAutoClean;
  if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  function parseISODate(isoString) {
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  
  const records = ctx.extensionSettings[MODULE_NAME].diet || [];
  
  if (config.cleanLocalStorage) {
    const filteredRecords = records.filter(rec => {
      const recDate = parseISODate(rec.ts);
      return recDate && recDate >= cutoffDate;
    });
    
    const removedCount = records.length - filteredRecords.length;
    if (removedCount > 0) {
      ctx.extensionSettings[MODULE_NAME].diet = filteredRecords;
      saveSettings();
      console.log(`[健康生活助手] 自动清除: 从 localStorage 删除了 ${removedCount} 条饮食记录`);
    }
  }
  
  if (config.cleanWorldBook) {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      let fileId = null;
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          fileId = WI;
          break;
        }
      }
      
      if (fileId) {
        const worldInfo = await moduleWI.loadWorldInfo(fileId);
        const entries = worldInfo.entries || {};
        
        let targetUID = null;
        for (const id in entries) {
          const entry = entries[id];
          const comment = entry.comment || '';
          if (!entry.disable && (comment.includes('饮食') || entry.title === '饮食')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (targetUID) {
          const currentRecords = ctx.extensionSettings[MODULE_NAME].diet || [];
          const enabledRecords = currentRecords.filter(rec => rec.enabled !== false);
          
          const newContent = enabledRecords.map(rec => {
            return `${rec.ts}:${rec.meal}:${rec.text}`;
          }).join('\n');
          
          await globalThis.SillyTavern.getContext()
            .SlashCommandParser.commands['setentryfield']
            .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
          
          console.log('[健康生活助手] 自动清除: 已同步饮食世界书');
        }
      }
    } catch (e) {
      console.error('[健康生活助手] 自动清除饮食世界书失败:', e);
    }
  }
  
  config.lastCleanDate = new Date().toISOString().split('T')[0];
  saveSettings();
}

// 运动定期清除函数
async function performExerciseAutoClean(daysToKeep) {
  const config = ctx.extensionSettings[MODULE_NAME].exerciseAutoClean;
  if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  function parseISODate(isoString) {
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  
  const records = ctx.extensionSettings[MODULE_NAME].exercise || [];
  
  if (config.cleanLocalStorage) {
    const filteredRecords = records.filter(rec => {
      const recDate = parseISODate(rec.ts);
      return recDate && recDate >= cutoffDate;
    });
    
    const removedCount = records.length - filteredRecords.length;
    if (removedCount > 0) {
      ctx.extensionSettings[MODULE_NAME].exercise = filteredRecords;
      saveSettings();
      console.log(`[健康生活助手] 自动清除: 从 localStorage 删除了 ${removedCount} 条运动记录`);
    }
  }
  
  if (config.cleanWorldBook) {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      let fileId = null;
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          fileId = WI;
          break;
        }
      }
      
      if (fileId) {
        const worldInfo = await moduleWI.loadWorldInfo(fileId);
        const entries = worldInfo.entries || {};
        
        let targetUID = null;
        for (const id in entries) {
          const entry = entries[id];
          const comment = entry.comment || '';
          if (!entry.disable && (comment.includes('运动') || entry.title === '运动')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (targetUID) {
          const currentRecords = ctx.extensionSettings[MODULE_NAME].exercise || [];
          const enabledRecords = currentRecords.filter(rec => rec.enabled !== false);
          
          function toLocalISOString(isoString) {
            try {
              const date = new Date(isoString);
              const offset = date.getTimezoneOffset();
              const localDate = new Date(date.getTime() - offset * 60000);
              return localDate.toISOString().slice(0, -1) + getTimezoneString();
            } catch (e) {
              return isoString;
            }
          }
          
          function getTimezoneString() {
            const offset = -new Date().getTimezoneOffset();
            const hours = Math.floor(Math.abs(offset) / 60);
            const minutes = Math.abs(offset) % 60;
            const sign = offset >= 0 ? '+' : '-';
            return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }
          
          const newContent = enabledRecords.map(rec => {
            const localISOTime = toLocalISOString(rec.ts);
            return `运动记录 @ ${localISOTime}:${rec.text}`;
          }).join('\n');
          
          await globalThis.SillyTavern.getContext()
            .SlashCommandParser.commands['setentryfield']
            .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
          
          console.log('[健康生活助手] 自动清除: 已同步运动世界书');
        }
      }
    } catch (e) {
      console.error('[健康生活助手] 自动清除运动世界书失败:', e);
    }
  }
  
  config.lastCleanDate = new Date().toISOString().split('T')[0];
  saveSettings();
}

// 心理健康定期清除函数
async function performMentalAutoClean(daysToKeep) {
  const config = ctx.extensionSettings[MODULE_NAME].mentalAutoClean;
  if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  function parseISODate(isoString) {
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  
  const storageKeys = ['mental', 'meditation', 'thoughtChains', 'confessions'];
  const keywords = ['心理', '冥想', '思维链', '忏悔'];
  
  for (let i = 0; i < storageKeys.length; i++) {
    const storageKey = storageKeys[i];
    const keyword = keywords[i];
    const records = ctx.extensionSettings[MODULE_NAME][storageKey] || [];
    
    if (config.cleanLocalStorage) {
      const filteredRecords = records.filter(rec => {
        const recDate = parseISODate(rec.ts);
        return recDate && recDate >= cutoffDate;
      });
      
      const removedCount = records.length - filteredRecords.length;
      if (removedCount > 0) {
        ctx.extensionSettings[MODULE_NAME][storageKey] = filteredRecords;
        console.log(`[健康生活助手] 自动清除: 从 localStorage/${storageKey} 删除了 ${removedCount} 条记录`);
      }
    }
    
    if (config.cleanWorldBook) {
      try {
        const moduleWI = await import('/scripts/world-info.js');
        const selected = moduleWI.selected_world_info || [];
        let fileId = null;
        for (const WI of selected) {
          if (WI.includes('健康生活助手')) {
            fileId = WI;
            break;
          }
        }
        
        if (fileId) {
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
          
          if (targetUID) {
            const currentRecords = ctx.extensionSettings[MODULE_NAME][storageKey] || [];
            const enabledRecords = currentRecords.filter(rec => rec.enabled !== false);
            
            const newContent = enabledRecords.map(rec => {
              return `${rec.ts}:${rec.text}`;
            }).join('\n');
            
            await globalThis.SillyTavern.getContext()
              .SlashCommandParser.commands['setentryfield']
              .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
            
            console.log(`[健康生活助手] 自动清除: 已同步世界书/${keyword}`);
          }
        }
      } catch (e) {
        console.error(`[健康生活助手] 自动清除世界书/${keyword}失败:`, e);
      }
    }
  }
  
  config.lastCleanDate = new Date().toISOString().split('T')[0];
  saveSettings();
}

// 备忘录定期清除函数
async function performMemoAutoClean(daysToKeep) {
  const config = ctx.extensionSettings[MODULE_NAME].memoAutoClean;
  if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  function parseISODate(isoString) {
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  
  const memos = ctx.extensionSettings[MODULE_NAME].memo || [];
  
  if (config.cleanLocalStorage) {
    const filteredMemos = memos.filter(m => {
      const memoDate = parseISODate(m.date);
      return memoDate && memoDate >= cutoffDate;
    });
    
    const removedCount = memos.length - filteredMemos.length;
    if (removedCount > 0) {
      ctx.extensionSettings[MODULE_NAME].memo = filteredMemos;
      saveSettings();
      console.log(`[健康生活助手] 自动清除: 从 localStorage 删除了 ${removedCount} 条备忘录`);
    }
  }
  
  if (config.cleanWorldBook) {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      let fileId = null;
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          fileId = WI;
          break;
        }
      }
      
      if (fileId) {
        const worldInfo = await moduleWI.loadWorldInfo(fileId);
        const entries = worldInfo.entries || {};
        
        let targetUID = null;
        for (const id in entries) {
          const entry = entries[id];
          const comment = entry.comment || '';
          if (!entry.disable && (comment.includes('memo') || entry.title === 'memo')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (targetUID) {
          const currentMemos = ctx.extensionSettings[MODULE_NAME].memo || [];
          const shared = currentMemos.filter(m => m.shared);
          const arr = shared.map((m, i) => `${i+1}. ${m.date} ${m.text}`);
          const newContent = arr.join('\n');
          
          await globalThis.SillyTavern.getContext()
            .SlashCommandParser.commands['setentryfield']
            .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
          
          console.log('[健康生活助手] 自动清除: 已同步备忘录世界书');
        }
      }
    } catch (e) {
      console.error('[健康生活助手] 自动清除备忘录世界书失败:', e);
    }
  }
  
  config.lastCleanDate = new Date().toISOString().split('T')[0];
  saveSettings();
}

// 财务定期清除函数
async function performFinanceAutoClean(daysToKeep) {
  const config = ctx.extensionSettings[MODULE_NAME].financeAutoClean;
  if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  function parseISODate(isoString) {
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  
  const records = ctx.extensionSettings[MODULE_NAME].finance.records || [];
  
  if (config.cleanLocalStorage) {
    const filteredRecords = records.filter(rec => {
      const recDate = parseISODate(rec.date);
      return recDate && recDate >= cutoffDate;
    });
    
    const removedCount = records.length - filteredRecords.length;
    if (removedCount > 0) {
      ctx.extensionSettings[MODULE_NAME].finance.records = filteredRecords;
      saveSettings();
      console.log(`[健康生活助手] 自动清除: 从 localStorage 删除了 ${removedCount} 条财务记录`);
    }
  }
  
  if (config.cleanWorldBook) {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      let fileId = null;
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          fileId = WI;
          break;
        }
      }
      
      if (fileId) {
        const worldInfo = await moduleWI.loadWorldInfo(fileId);
        const entries = worldInfo.entries || {};
        
        let incomeUID = null;
        let expenseUID = null;
        for (const id in entries) {
          const entry = entries[id];
          if (!entry.disable) {
            if (entry.title === '收入') incomeUID = entry.uid;
            if (entry.title === '支出') expenseUID = entry.uid;
          }
        }
        
        if (incomeUID) {
          const currentRecords = ctx.extensionSettings[MODULE_NAME].finance.records || [];
          const incomeList = currentRecords
            .filter(r => r.type === 'income')
            .map((r, i) => `${i+1}. ${r.date} ${r.tag}${r.name?`(${r.name})`:''}:${r.value}元`);
          
          const newContent = incomeList.join('\n');
          
          await globalThis.SillyTavern.getContext()
            .SlashCommandParser.commands['setentryfield']
            .callback({ file: fileId, uid: incomeUID, field: 'content' }, newContent);
          
          console.log('[健康生活助手] 自动清除: 已同步"收入"世界书');
        }
        
        if (expenseUID) {
          const currentRecords = ctx.extensionSettings[MODULE_NAME].finance.records || [];
          const expenseList = currentRecords
            .filter(r => r.type === 'expense')
            .map((r, i) => `${i+1}. ${r.date} ${r.tag}${r.name?`(${r.name})`:''}:${r.value}元`);
          
          const newContent = expenseList.join('\n');
          
          await globalThis.SillyTavern.getContext()
            .SlashCommandParser.commands['setentryfield']
            .callback({ file: fileId, uid: expenseUID, field: 'content' }, newContent);
          
          console.log('[健康生活助手] 自动清除: 已同步"支出"世界书');
        }
      }
    } catch (e) {
      console.error('[健康生活助手] 自动清除财务世界书失败:', e);
    }
  }
  
  config.lastCleanDate = new Date().toISOString().split('T')[0];
  saveSettings();
}

    
    // 创建 DOM
    if (document.getElementById('health-assistant-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'health-assistant-fab';
    fab.title = '健康生活助手';
    fab.innerText = '🍀';
    document.body.appendChild(fab);

    // 拖动逻辑
    function enableDrag(element) {
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;
      let xOffset = 0;
      let yOffset = 0;

      const savedPosition = localStorage.getItem('health-assistant-fab-position');
      if (savedPosition) {
        const { x, y } = JSON.parse(savedPosition);
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
      }

      function dragStart(e) {
        if (e.type === "touchstart") {
          initialX = e.touches[0].clientX - xOffset;
          initialY = e.touches[0].clientY - yOffset;
        } else {
          initialX = e.clientX - xOffset;
          initialY = e.clientY - yOffset;
        }

        if (e.target === element) {
          isDragging = true;
          element.style.cursor = 'grabbing';
        }
      }

      function dragEnd(e) {
        if (!isDragging) return;
        
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        element.style.cursor = 'grab';

        const rect = element.getBoundingClientRect();
        localStorage.setItem('health-assistant-fab-position', JSON.stringify({
          x: rect.left,
          y: rect.top
        }));
      }

      function drag(e) {
        if (!isDragging) return;

        e.preventDefault();

        if (e.type === "touchmove") {
          currentX = e.touches[0].clientX - initialX;
          currentY = e.touches[0].clientY - initialY;
        } else {
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
        }

        xOffset = currentX;
        yOffset = currentY;

        let newLeft = currentX;
        let newTop = currentY;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const elementWidth = element.offsetWidth;
        const elementHeight = element.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, windowWidth - elementWidth));
        newTop = Math.max(0, Math.min(newTop, windowHeight - elementHeight));

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        element.style.transform = "translate(0, 0)";
      }

      element.addEventListener('mousedown', dragStart);
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', dragEnd);

      element.addEventListener('touchstart', dragStart, { passive: false });
      document.addEventListener('touchmove', drag, { passive: false });
      document.addEventListener('touchend', dragEnd);

      element.addEventListener('click', (e) => {
        if (xOffset !== 0 || yOffset !== 0) {
          e.stopPropagation();
          xOffset = 0;
          yOffset = 0;
        }
      });

      window.addEventListener('resize', () => {
        const rect = element.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let newLeft = rect.left;
        let newTop = rect.top;
        
        newLeft = Math.max(0, Math.min(newLeft, windowWidth - element.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, windowHeight - element.offsetHeight));
        
        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
      });
    }

    enableDrag(fab);

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
        <div class="ha-btn" data-key="reviews">生活测评</div>
        <div class="ha-btn" data-key="bgm">背景音乐</div>
        <div class="ha-btn" data-key="theme">主题背景</div>
        <div class="ha-btn" data-key="apiconf">独立API</div>
        <div class="ha-btn" data-key="clearbook">清除数据</div>
      </div>

      <div id="ha-content-area" class="ha-subpanel" style="display:block;">
        <div class="ha-small">请选择一个功能</div>
      </div>
    `;
    document.body.appendChild(panel);

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
      panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    });

    // 简单的 helper：保存 settings
    function saveSettings() {
      if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
      else console.warn('saveSettingsDebounced not available - changes may not persist until reload');
    }

    // 调试日志
    function debugLog(...args) {
      if (window.DEBUG_HEALTH_ASSISTANT) console.log('[健康生活助手]', ...args);
    }

    // 打开各主面板
    const content = panel.querySelector('#ha-content-area');

    // 应用已保存的主题（背景图和颜色）
    function applyTheme() {
      const theme = ctx.extensionSettings[MODULE_NAME].theme;
      
      // 主面板背景图
      if (theme.mainBackground) {
        panel.style.backgroundImage = `url(${theme.mainBackground})`;
        panel.style.backgroundSize = 'cover';
        panel.style.backgroundPosition = 'center';
        panel.style.backgroundRepeat = 'no-repeat';
      }
      
      // 主面板颜色
      if (theme.mainColor) {
        panel.style.backgroundColor = theme.mainColor;
      }
      
      // 子面板背景图
      if (theme.subpanelBackground) {
        content.style.backgroundImage = `url(${theme.subpanelBackground})`;
        content.style.backgroundSize = 'cover';
        content.style.backgroundPosition = 'center';
        content.style.backgroundRepeat = 'no-repeat';
      }
      
      // 子面板颜色
      if (theme.subpanelColor) {
        content.style.backgroundColor = theme.subpanelColor;
      }
      
      // 按钮颜色
      if (theme.buttonColor) {
        const buttons = document.querySelectorAll('.ha-btn');
        buttons.forEach(btn => {
          btn.style.backgroundColor = theme.buttonColor;
        });
      }
    }
    applyTheme();

    // 主题背景功能
    function showTheme() {
      content.style.display = 'block';
      content.innerHTML = `
        <div style="font-weight:600;margin-bottom:12px;border-bottom:1px solid #eee;padding-bottom:8px;">主题背景</div>
        
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;color:#666;margin-bottom:8px;">整体背景：</div>
          <div style="display:flex;gap:8px;">
            <button id="upload-main-bg" class="ha-btn" style="flex:1;padding:8px;">上传整体背景</button>
            <button id="clear-main-bg" class="ha-btn" style="flex:1;padding:8px;">清除整体背景</button>
          </div>
          <input id="main-bg-file" type="file" accept="image/*" style="display:none;">
        </div>
        
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;color:#666;margin-bottom:8px;">子面板背景：</div>
          <div style="display:flex;gap:8px;">
            <button id="upload-sub-bg" class="ha-btn" style="flex:1;padding:8px;">上传子面板背景</button>
            <button id="clear-sub-bg" class="ha-btn" style="flex:1;padding:8px;">清除子面板背景</button>
          </div>
          <input id="sub-bg-file" type="file" accept="image/*" style="display:none;">
        </div>
        
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;color:#666;margin-bottom:8px;">主面板调色：</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input id="main-color-picker" type="color" style="width:50px;height:35px;border:none;cursor:pointer;">
            <button id="apply-main-color" class="ha-btn" style="flex:1;padding:8px;">主面板调色</button>
            <button id="reset-main-color" class="ha-btn" style="flex:1;padding:8px;">重置</button>
          </div>
        </div>
        
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;color:#666;margin-bottom:8px;">子面板调色：</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input id="sub-color-picker" type="color" style="width:50px;height:35px;border:none;cursor:pointer;">
            <button id="apply-sub-color" class="ha-btn" style="flex:1;padding:8px;">子面板调色</button>
            <button id="reset-sub-color" class="ha-btn" style="flex:1;padding:8px;">重置</button>
          </div>
        </div>
        
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;color:#666;margin-bottom:8px;">主按钮配色：</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input id="button-color-picker" type="color" style="width:50px;height:35px;border:none;cursor:pointer;">
            <button id="apply-button-color" class="ha-btn" style="flex:1;padding:8px;">主按钮配色</button>
            <button id="reset-button-color" class="ha-btn" style="flex:1;padding:8px;">重置</button>
          </div>
        </div>
        
        <div style="margin-top:16px;padding:12px;background:#f9f9f9;border-radius:6px;font-size:12px;color:#666;">
          提示：上传的图片会被转换为base64格式保存，建议使用压缩过的图片以避免占用过多空间
        </div>
      `;

      const theme = ctx.extensionSettings[MODULE_NAME].theme;

      // 整体背景
      const uploadMainBtn = document.getElementById('upload-main-bg');
      const clearMainBtn = document.getElementById('clear-main-bg');
      const mainBgFile = document.getElementById('main-bg-file');
      
      uploadMainBtn.onclick = () => mainBgFile.click();
      mainBgFile.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          toastr.error('请选择图片文件');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          ctx.extensionSettings[MODULE_NAME].theme.mainBackground = event.target.result;
          panel.style.backgroundImage = `url(${event.target.result})`;
          panel.style.backgroundSize = 'cover';
          panel.style.backgroundPosition = 'center';
          panel.style.backgroundRepeat = 'no-repeat';
          saveSettings();
          toastr.success('整体背景已设置');
        };
        reader.readAsDataURL(file);
      };

      clearMainBtn.onclick = () => {
        ctx.extensionSettings[MODULE_NAME].theme.mainBackground = null;
        panel.style.backgroundImage = '';
        saveSettings();
        toastr.success('整体背景已清除');
      };

      // 子面板背景
      const uploadSubBtn = document.getElementById('upload-sub-bg');
      const clearSubBtn = document.getElementById('clear-sub-bg');
      const subBgFile = document.getElementById('sub-bg-file');
      
      uploadSubBtn.onclick = () => subBgFile.click();
      subBgFile.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          toastr.error('请选择图片文件');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          ctx.extensionSettings[MODULE_NAME].theme.subpanelBackground = event.target.result;
          content.style.backgroundImage = `url(${event.target.result})`;
          content.style.backgroundSize = 'cover';
          content.style.backgroundPosition = 'center';
          content.style.backgroundRepeat = 'no-repeat';
          saveSettings();
          toastr.success('子面板背景已设置');
        };
        reader.readAsDataURL(file);
      };

      clearSubBtn.onclick = () => {
        ctx.extensionSettings[MODULE_NAME].theme.subpanelBackground = null;
        content.style.backgroundImage = '';
        saveSettings();
        toastr.success('子面板背景已清除');
      };

      // 主面板调色
      const mainColorPicker = document.getElementById('main-color-picker');
      const applyMainColor = document.getElementById('apply-main-color');
      const resetMainColor = document.getElementById('reset-main-color');
      
      if (theme.mainColor) {
        mainColorPicker.value = theme.mainColor;
      }
      
      applyMainColor.onclick = () => {
        const color = mainColorPicker.value;
        ctx.extensionSettings[MODULE_NAME].theme.mainColor = color;
        panel.style.backgroundColor = color;
        saveSettings();
        toastr.success('主面板颜色已设置');
      };
      
      resetMainColor.onclick = () => {
        ctx.extensionSettings[MODULE_NAME].theme.mainColor = null;
        panel.style.backgroundColor = '';
        saveSettings();
        toastr.success('主面板颜色已重置');
      };

      // 子面板调色
      const subColorPicker = document.getElementById('sub-color-picker');
      const applySubColor = document.getElementById('apply-sub-color');
      const resetSubColor = document.getElementById('reset-sub-color');
      
      if (theme.subpanelColor) {
        subColorPicker.value = theme.subpanelColor;
      }
      
      applySubColor.onclick = () => {
        const color = subColorPicker.value;
        ctx.extensionSettings[MODULE_NAME].theme.subpanelColor = color;
        content.style.backgroundColor = color;
        saveSettings();
        toastr.success('子面板颜色已设置');
      };
      
      resetSubColor.onclick = () => {
        ctx.extensionSettings[MODULE_NAME].theme.subpanelColor = null;
        content.style.backgroundColor = '';
        saveSettings();
        toastr.success('子面板颜色已重置');
      };

      // 主按钮配色
      const buttonColorPicker = document.getElementById('button-color-picker');
      const applyButtonColor = document.getElementById('apply-button-color');
      const resetButtonColor = document.getElementById('reset-button-color');
      
      if (theme.buttonColor) {
        buttonColorPicker.value = theme.buttonColor;
      }
      
      applyButtonColor.onclick = () => {
        const color = buttonColorPicker.value;
        ctx.extensionSettings[MODULE_NAME].theme.buttonColor = color;
        const buttons = document.querySelectorAll('.ha-btn');
        buttons.forEach(btn => {
          btn.style.backgroundColor = color;
        });
        saveSettings();
        toastr.success('按钮颜色已设置');
      };
      
      resetButtonColor.onclick = () => {
        ctx.extensionSettings[MODULE_NAME].theme.buttonColor = null;
        const buttons = document.querySelectorAll('.ha-btn');
        buttons.forEach(btn => {
          btn.style.backgroundColor = '';
        });
        saveSettings();
        toastr.success('按钮颜色已重置');
      };
    }

    panel.querySelectorAll('.ha-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key === 'routine') showRoutine();
        else if (key === 'diet') showDiet();
        else if (key === 'mental') showMental();
        else if (key === 'exercise') showExercise();
        else if (key === 'finance') showFinance();
        else if (key === 'wardrobe') showWardrobe(); 
        else if (key === 'wishes') showWishes();
        else if (key === 'social') showSocial();
        else if (key === 'todo') showTodo();
        else if (key === 'pomodoro') showPomodoro();
        else if (key === 'memo') showMemo();
        else if (key === 'reviews') showReviews();
        else if (key === 'bgm') showBgm();
        else if (key === 'theme') showTheme();
        else if (key === 'clearbook') showClearBook();
        else if (key === 'apiconf') showApiConfig();
      });
    });

      // --------- 各模块内容，showPomodoro,showTodo等 ----------

      // --------- 各模块内容，showPomodoro,showTodo等 ----------


      // --------- 各模块内容（最小实现） ----------
async function showWardrobe() {
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
  const ctx = SillyTavern.getContext();
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













      
async function showPomodoro() {
  try {
    const cs = window.getComputedStyle(content);
    if (cs.position === 'static' || !cs.position) content.style.position = 'relative';
  } catch (e) {}

  content.style.display = 'block';
  content.innerHTML = `
    <style>
      @keyframes gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      /* 番茄钟BGM音量滑条灰色样式 */
      #pom-bgm-volume, #pom-bgm-volume-popup {
        -webkit-appearance: none !important;
        appearance: none !important;
        background: transparent !important;
      }
      
      /* 滑条轨道 - WebKit */
      #pom-bgm-volume::-webkit-slider-runnable-track,
      #pom-bgm-volume-popup::-webkit-slider-runnable-track {
        width: 100% !important;
        height: 6px !important;
        background: #ddd !important;
        border-radius: 3px !important;
        cursor: pointer !important;
      }
      
      /* 滑条轨道 - Firefox */
      #pom-bgm-volume::-moz-range-track,
      #pom-bgm-volume-popup::-moz-range-track {
        width: 100% !important;
        height: 6px !important;
        background: #ddd !important;
        border-radius: 3px !important;
        cursor: pointer !important;
      }
      
      /* 滑块 - WebKit */
      #pom-bgm-volume::-webkit-slider-thumb,
      #pom-bgm-volume-popup::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        appearance: none !important;
        width: 14px !important;
        height: 14px !important;
        background: #888 !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        border: 2px solid #666 !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
        margin-top: -4px !important;
      }
      
      /* 滑块 - Firefox */
      #pom-bgm-volume::-moz-range-thumb,
      #pom-bgm-volume-popup::-moz-range-thumb {
        width: 14px !important;
        height: 14px !important;
        background: #888 !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        border: 2px solid #666 !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
      }
      
      /* 滑块悬停效果 */
      #pom-bgm-volume::-webkit-slider-thumb:hover,
      #pom-bgm-volume-popup::-webkit-slider-thumb:hover {
        background: #666 !important;
        transform: scale(1.1) !important;
      }
      
      #pom-bgm-volume::-moz-range-thumb:hover,
      #pom-bgm-volume-popup::-moz-range-thumb:hover {
        background: #666 !important;
        transform: scale(1.1) !important;
      }
      
      /* 折叠面板样式 */
      .pom-collapse-panel {
        display: none;
        margin-top: 8px;
        padding: 8px;
        background: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 6px;
      }
      .pom-collapse-panel.active {
        display: block;
      }
    </style>
    
    <!-- 标题行 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:8px;">
      <div style="font-weight:600;">专注番茄钟</div>
      <div style="display:flex;gap:8px;">
        <button id="pom-settings-btn" class="ha-btn" style="padding:4px 8px;">⚙️</button>
        <button id="pom-time-panel-btn" class="ha-btn" style="padding:4px 8px;">时间</button>
        <button id="pom-tag-panel-btn" class="ha-btn" style="padding:4px 8px;">标签</button>
      </div>
    </div>
    
    <!-- 标题和待办/习惯 -->
    <div style="display:flex;gap:6px;margin-bottom:8px;align-items:stretch;">
      <input id="pom-title-input" type="text" placeholder="专注标题（可留空）"
             style="flex:1;padding:6px;min-width:0;">
      <button id="pom-todo-btn" class="ha-btn" style="padding:6px 16px;white-space:nowrap;">待办</button>
      <button id="pom-habit-btn" class="ha-btn" style="padding:6px 16px;white-space:nowrap;">习惯</button>
    </div>
    
    <!-- 时间块显示区 -->
    <div style="margin-bottom:8px;display:flex;align-items:flex-start;gap:8px;">
      <div style="font-size:13px;color:#666;white-space:nowrap;padding-top:2px;">时间:</div>
      <div id="pom-time-blocks" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;flex:1;"></div>
    </div>
    
    <!-- 标签块显示区 -->
    <div style="margin-bottom:8px;display:flex;align-items:flex-start;gap:8px;">
      <div style="font-size:13px;color:#666;white-space:nowrap;padding-top:2px;">标签:</div>
      <div id="pom-tag-blocks" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;flex:1;"></div>
    </div>
    
    <!-- 操作按钮 -->
    <div style="display:flex;gap:4px;">
      <button id="pom-stats-btn" class="ha-btn" style="flex:1;padding:10px;">统计</button>
      <button id="pom-start-btn" class="ha-btn" style="flex:2;padding:10px;background:linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7, #DFE6E9);background-size:300% 300%;animation:gradient-shift 3s ease infinite;font-weight:600;">开始</button>
      <button id="pom-delete-btn" class="ha-btn" style="flex:1;padding:10px;">删除</button>
    </div>
  `;

  // ====== 状态管理 ======
  if (!ctx.extensionSettings[MODULE_NAME].pomodoro) {
    ctx.extensionSettings[MODULE_NAME].pomodoro = {
      timeBlocks: [],
      tagBlocks: [],
      records: [],
      selectedTimeBlock: null,
      selectedTag: null,
      session: null,
      tagDeleteMode: false,
      timeDeleteMode: false,
      backgroundImage: null,
      notifyConfig: {
        vibrate: true,
        ring: true,
        ringUrl: ''
      }
    };
    if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
  }

  const pm = ctx.extensionSettings[MODULE_NAME].pomodoro;

  // ====== 世界书操作 ======
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

  async function appendToWorldInfoFocus() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return;
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      
      // 更新专注记录条目
      let focusUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('专注记录') || entry.title === '专注记录')) {
          focusUID = entry.uid;
          break;
        }
      }
      
      if (focusUID) {
        const arr = pm.records.map((r) => {
          const mins = Math.floor(r.duration / 60);
          const tags = r.tags.length ? `[${r.tags.join(',')}]` : '';
          return `• ${r.title || '(无标题)'} ${mins}分钟 ${tags}`;
        });
        const newContent = arr.join('\n');
        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: focusUID, field: 'content' }, newContent);
      }

      // 更新待办条目
      let todoUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('待办') || entry.title === '待办')) {
          todoUID = entry.uid;
          break;
        }
      }

      if (todoUID) {
        const todos = ctx.extensionSettings[MODULE_NAME].todos || [];
        const arr = todos.map((t, i) => {
          const due = t.due ? `截止:${t.due}` : '';
          const status = t.done ? '完成' : (t.due && new Date() > new Date(t.due) ? '过期' : '进行中');
          const focused = t.focused ? `已专注:${Math.floor(t.focused / 60)}分钟` : '';
          
          // 添加循环信息
          let recurrence = '';
          if (t.recurrence) {
            if (t.recurrence.type === 'weekly') {
              const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
              const dayNames = t.recurrence.days.map(d => '周' + weekDays[d]).join(',');
              recurrence = `[🔁每周${dayNames} ${t.recurrence.time}]`;
            } else if (t.recurrence.type === 'monthly') {
              recurrence = `[🔁每月${t.recurrence.date}号 ${t.recurrence.time}]`;
            }
          }
          
          return `${i+1}. [${status}] ${t.name} 优先:${t.priority} 标签:${t.tag} ${due} ${recurrence} ${focused}`;
        });
        const newContent = arr.join('\n');
        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: todoUID, field: 'content' }, newContent);
      }
    } catch (e) {
      toastr.error('同步世界书失败');
    }
  }

  // ====== 音乐播放模块 ======
  let bgmAudio = null;
  let bgmIsPlaying = false;
  let currentBgmIndex = 0;
  let currentPopupDialog = null; // 追踪当前打开的弹窗
  
  const bgmList = [
    { name: '雨声', url: '/scripts/extensions/third-party/healthy-life-helper/BGM/1_雨声.mp3' },
    { name: '森林', url: '/scripts/extensions/third-party/healthy-life-helper/BGM/2_森林.mp3' },
    { name: '咖啡厅', url: '/scripts/extensions/third-party/healthy-life-helper/BGM/3_咖啡厅.mp3' }
  ];

  function updateBgmDisplay() {
    const nameEl = document.getElementById('pom-bgm-name');
    const playBtn = document.getElementById('pom-bgm-play');
    if (nameEl) {
      nameEl.innerText = bgmList[currentBgmIndex].name;
      nameEl.style.color = bgmIsPlaying ? '#4CAF50' : '#666';
    }
    if (playBtn) {
      playBtn.innerText = bgmIsPlaying ? '⏸️' : '🎵';
    }
  }

  function playBgm() {
    if (!bgmAudio) {
      bgmAudio = new Audio(bgmList[currentBgmIndex].url);
      bgmAudio.loop = true;
      const volValue = document.getElementById('pom-bgm-volume')?.value || 30;
      bgmAudio.volume = volValue / 100;
    }

    if (bgmIsPlaying) {
      bgmAudio.pause();
      bgmIsPlaying = false;
    } else {
      bgmAudio.play().catch(e => toastr.error('播放BGM失败'));
      bgmIsPlaying = true;
    }
    updateBgmDisplay();
  }

  function nextBgm() {
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio = null;
    }
    currentBgmIndex = (currentBgmIndex + 1) % bgmList.length;
    bgmIsPlaying = false;
    updateBgmDisplay();
    toastr.info(`已切换到: ${bgmList[currentBgmIndex].name}`);
  }

  // ====== 系统通知模块 ======
  async function triggerSystemNotification() {
    const cfg = pm.notifyConfig;
    
    // 1. 尝试调用系统通知 API（需要HTTPS和用户授权）
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('番茄钟完成', {
          body: '专注时间已到！',
          icon: '🎯',
          tag: 'pomodoro-complete'
        });
        return;
      }
    } catch (e) {}

    // 2. 震动通知
    if (cfg.vibrate && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
      } catch (e) {}
    }

    // 3. 音频通知
    if (cfg.ring) {
      try {
        // 尝试调用系统原生通知音
        if (cfg.ringUrl) {
          const audio = new Audio(cfg.ringUrl);
          audio.volume = 1;
          await audio.play();
        } else {
          // 使用Web Audio API生成铃声（保证可用）
          const ctx_audio = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = ctx_audio.createOscillator();
          const gainNode = ctx_audio.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(ctx_audio.destination);
          
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.3, ctx_audio.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx_audio.currentTime + 0.5);
          
          oscillator.start(ctx_audio.currentTime);
          oscillator.stop(ctx_audio.currentTime + 0.5);
        }
      } catch (e) {}
    }
  }

  // ====== 计时会话面板 ======
  function showSessionPanel() {
    const timeBlockIdx = pm.selectedTimeBlock;
    if (timeBlockIdx === null) {
      toastr.error('请先选择一个时间块');
      return;
    }

    const targetMins = pm.timeBlocks[timeBlockIdx];
    const targetSecs = targetMins === 0 ? null : targetMins * 60;

    let elapsed = 0;
    let isPaused = false;
    let isComplete = false;
    
    // 后台计时变量
    let lastTimestamp = Date.now();
    let backgroundTimer = null;

    const sessionDialog = document.createElement('div');
    
    // 准备背景样式
    const backgroundStyle = pm.backgroundImage 
      ? `background-image:url(${pm.backgroundImage});background-size:cover;background-position:center;background-repeat:no-repeat;` 
      : '';
    
    sessionDialog.innerHTML = `
      <div style="background:#fff;padding:16px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-height:300px;width:320px;margin:auto;${backgroundStyle}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="font-size:14px;color:#666;" id="session-timeinfo">已用时长 / 剩余时长</div>
          <button id="session-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div style="text-align:center;margin-bottom:12px;">
          <div style="font-size:28px;font-weight:600;" id="session-timer">00:00:00</div>
        </div>
        <div style="display:flex;gap:4px;margin-bottom:12px;">
          <textarea id="session-notes" placeholder="输入笔记/想法..."
                    style="flex:1;width:100%;height:120px;padding:6px;border:1px solid #ddd;border-radius:3px;font-size:12px;resize:none;"></textarea>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:12px;">
          <button id="session-pause" class="ha-btn" style="flex:1;">暂停</button>
          <button id="session-end" class="ha-btn" style="flex:1;">结束</button>
        </div>
      </div>`;
    Object.assign(sessionDialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    
    // 关闭之前的弹窗
    if (currentPopupDialog) {
      currentPopupDialog.remove();
    }
    currentPopupDialog = sessionDialog;
    
    content.appendChild(sessionDialog);

    const timerDisplay = sessionDialog.querySelector('#session-timer');
    const timeInfoDisplay = sessionDialog.querySelector('#session-timeinfo');
    const notesArea = sessionDialog.querySelector('#session-notes');
    const pauseBtn = sessionDialog.querySelector('#session-pause');
    const endBtn = sessionDialog.querySelector('#session-end');
    const closeBtn = sessionDialog.querySelector('#session-close');

    function updateDisplay() {
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      timerDisplay.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      
      if (targetSecs === null) {
        timeInfoDisplay.innerText = '已用时长 / --';
      } else {
        const remainSecs = Math.max(0, targetSecs - elapsed);
        const remainH = Math.floor(remainSecs / 3600);
        const remainM = Math.floor((remainSecs % 3600) / 60);
        const remainS = remainSecs % 60;
        timeInfoDisplay.innerText = `已用 ${m}:${String(s).padStart(2, '0')} / 剩余 ${String(remainM).padStart(2, '0')}:${String(remainS).padStart(2, '0')}`;
      }
    }

    async function endSession() {
      isComplete = true;
      if (backgroundTimer) clearInterval(backgroundTimer);

      const title = document.getElementById('pom-title-input').value.trim();
      const tagIdx = pm.selectedTag;
      const tags = tagIdx !== null ? [pm.tagBlocks[tagIdx]] : [];

      let source = 'custom';
      const todos = ctx.extensionSettings[MODULE_NAME].todos || [];
      const social = ctx.extensionSettings[MODULE_NAME].social || {};

      let matchedTodoIdx = -1;
      let matchedHabitId = null;

      if (title) {
        for (let i = 0; i < todos.length; i++) {
          if (todos[i].name === title) {
            source = 'todo';
            matchedTodoIdx = i;
            break;
          }
        }
        if (source === 'custom') {
          for (const habitId in social) {
            if (social[habitId].name === title) {
              source = 'habit';
              matchedHabitId = habitId;
              break;
            }
          }
        }
      }

      const record = {
        title: title || '(无标题)',
        source: source,
        duration: elapsed,
        tags: tags,
        timestamp: new Date().toISOString(),
        notes: notesArea.value
      };
      pm.records.push(record);

      if (source === 'todo' && matchedTodoIdx >= 0) {
        const todo = todos[matchedTodoIdx];
        todo.focused = (todo.focused || 0) + elapsed;
      } else if (source === 'habit' && matchedHabitId) {
        social[matchedHabitId].logs = social[matchedHabitId].logs || [];
        social[matchedHabitId].logs.push({ ts: new Date().toISOString(), duration: elapsed });
      }

      saveSettings();
      await appendToWorldInfoFocus();

      // 触发系统通知
      await triggerSystemNotification();

      sessionDialog.remove();
      currentPopupDialog = null;
      toastr.success('番茄钟已完成！');
    }

   function handleBackgroundTick() {
  if (isComplete) return;  // ✅ 只在完成时才停止
  const now = Date.now();
  const deltaSeconds = Math.floor((now - lastTimestamp) / 1000);
  lastTimestamp = now;
  if (!isPaused && deltaSeconds > 0) {
    elapsed += deltaSeconds;      // ✅ 只有不暂停时才累加时间
    updateDisplay();
  } else if (isPaused) {
    lastTimestamp = now;          // ✅ 暂停时重置时间戳
  }
}

    // 启动后台计时（每100ms检查一次）
    backgroundTimer = setInterval(handleBackgroundTick, 1000);
    lastTimestamp = Date.now();
    updateDisplay();

    pauseBtn.onclick = () => {
      isPaused = !isPaused;
      pauseBtn.innerText = isPaused ? '继续' : '暂停';
      if (!isPaused) {
        lastTimestamp = Date.now();
      }
    };

    endBtn.onclick = async () => {
  await endSession();  // ✅ 正确处理 async
};

    closeBtn.onclick = () => {
      isComplete = true;
      if (backgroundTimer) clearInterval(backgroundTimer);
      sessionDialog.remove();
      currentPopupDialog = null;
      toastr.warning('已取消本次专注');
    };
  }

  // ====== 时间块管理 ======
  function renderTimeBlocks() {
    const container = document.getElementById('pom-time-blocks');
    container.innerHTML = '';
    pm.timeBlocks.forEach((mins, idx) => {
      const div = document.createElement('div');
      const isActive = pm.selectedTimeBlock === idx;
      const label = mins === 0 ? '正计时' : `${mins}分`;
      div.innerText = label;
      div.style.cssText = `
        padding:3px 10px;
        border-radius:14px;
        cursor:pointer;
        background:${isActive ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 255, 255, 0.5)'};
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        color:${isActive ? '#2e7d32' : '#333'};
        font-weight:${isActive ? '600' : '400'};
        user-select:none;
        border:1.5px solid ${isActive ? 'rgba(76, 175, 80, 0.6)' : 'rgba(200, 200, 200, 0.5)'};
        box-shadow:${isActive ? '0 2px 8px rgba(76, 175, 80, 0.3)' : '0 2px 6px rgba(0, 0, 0, 0.1)'};
        font-size:13px;
        transition:all 0.3s ease;
      `;
      
      if (pm.timeDeleteMode) {
        div.onclick = () => {
          pm.timeBlocks.splice(idx, 1);
          saveSettings();
          renderTimeBlocks();
          toastr.success('时间块已删除');
        };
      } else {
        div.onclick = () => {
          pm.selectedTimeBlock = pm.selectedTimeBlock === idx ? null : idx;
          saveSettings();
          renderTimeBlocks();
        };
      }
      container.appendChild(div);
    });
  }

  // ====== 标签块管理 ======
  function renderTagBlocks() {
    const container = document.getElementById('pom-tag-blocks');
    container.innerHTML = '';
    pm.tagBlocks.forEach((tag, idx) => {
      const div = document.createElement('div');
      const isActive = pm.selectedTag === idx;
      div.innerText = tag;
      div.style.cssText = `
        padding:3px 10px;
        border-radius:14px;
        cursor:pointer;
        background:${isActive ? 'rgba(33, 150, 243, 0.5)' : 'rgba(255, 255, 255, 0.5)'};
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        color:${isActive ? '#1565c0' : '#333'};
        font-weight:${isActive ? '600' : '400'};
        user-select:none;
        border:1.5px solid ${isActive ? 'rgba(33, 150, 243, 0.6)' : 'rgba(200, 200, 200, 0.5)'};
        box-shadow:${isActive ? '0 2px 8px rgba(33, 150, 243, 0.3)' : '0 2px 6px rgba(0, 0, 0, 0.1)'};
        font-size:13px;
        transition:all 0.3s ease;
      `;
      
      if (pm.tagDeleteMode) {
        div.onclick = () => {
          pm.tagBlocks.splice(idx, 1);
          if (pm.selectedTag === idx) pm.selectedTag = null;
          saveSettings();
          renderTagBlocks();
          toastr.success('标签已删除');
        };
      } else {
        div.onclick = () => {
          pm.selectedTag = pm.selectedTag === idx ? null : idx;
          saveSettings();
          renderTagBlocks();
        };
      }
      container.appendChild(div);
    });
  }

  // ====== 待办弹窗（已适配循环待办） ======
  function showTodoPopup() {
    const todos = ctx.extensionSettings[MODULE_NAME].todos || [];
    const now = new Date();
    
    // 过滤待办：包括未完成的普通待办 + 所有循环待办（不论是否完成）
    const normalTodos = todos.filter(t => !t.done && !t.recurrence && (!t.due || new Date(t.due) >= now));
    const expiredTodos = todos.filter(t => !t.done && !t.recurrence && t.due && new Date(t.due) < now);
    const recurrentTodos = todos.filter(t => t.recurrence !== null); // 所有循环待办都显示
    
    const allTodos = [...normalTodos, ...expiredTodos, ...recurrentTodos];

    if (allTodos.length === 0) {
      toastr.warning('暂无可用待办');
      return;
    }

    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:300px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>选择待办</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div id="popup-list" style="max-height:300px;overflow-y:auto;font-size:13px;"></div>
      </div>`;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    
    // 关闭之前的弹窗
    if (currentPopupDialog) {
      currentPopupDialog.remove();
    }
    currentPopupDialog = dialog;
    
    content.appendChild(dialog);

    const listEl = dialog.querySelector('#popup-list');
    allTodos.forEach((todo, idx) => {
      const div = document.createElement('div');
      div.style.cssText = `
        padding:6px;
        margin-bottom:4px;
        background:#f5f5f5;
        border-radius:3px;
        cursor:pointer;
        border-left:3px solid ${todo.done ? '#4CAF50' : (todo.recurrence ? '#2196F3' : '#ff9800')};
      `;
      
      // 构建显示文本
      let displayText = todo.name;
      
      if (todo.recurrence) {
        // 循环待办显示循环信息
        if (todo.recurrence.type === 'weekly') {
          const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
          const dayNames = todo.recurrence.days.map(d => '周' + weekDays[d]).join(',');
          displayText += ` 🔁${dayNames} ${todo.recurrence.time}`;
        } else if (todo.recurrence.type === 'monthly') {
          displayText += ` 🔁每月${todo.recurrence.date}号 ${todo.recurrence.time}`;
        }
      } else if (todo.due) {
        // 普通待办显示截止时间
        displayText += ` (${todo.due.split('T')[0]})`;
      }
      
      div.innerText = displayText;
      div.onclick = () => {
        document.getElementById('pom-title-input').value = todo.name;
        dialog.remove();
        currentPopupDialog = null;
        toastr.success(`已注入待办: ${todo.name}`);
      };
      listEl.appendChild(div);
    });

    dialog.querySelector('#popup-close').onclick = () => {
      dialog.remove();
      currentPopupDialog = null;
    };
  }

  // ====== 习惯弹窗 ======
  function showHabitPopup() {
    const social = ctx.extensionSettings[MODULE_NAME].social || {};
    const habits = Object.values(social);

    if (habits.length === 0) {
      toastr.warning('暂无配置习惯');
      return;
    }

    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:300px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>选择习惯</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div id="popup-list" style="max-height:300px;overflow-y:auto;font-size:13px;"></div>
      </div>`;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    
    // 关闭之前的弹窗
    if (currentPopupDialog) {
      currentPopupDialog.remove();
    }
    currentPopupDialog = dialog;
    
    content.appendChild(dialog);

    const listEl = dialog.querySelector('#popup-list');
    habits.forEach((habit, idx) => {
      const div = document.createElement('div');
      div.style.cssText = `
        padding:6px;
        margin-bottom:4px;
        background:#f5f5f5;
        border-radius:3px;
        cursor:pointer;
        border-left:3px solid #2196F3;
      `;
      div.innerText = `${habit.name} [${habit.frequency}]`;
      div.onclick = () => {
        document.getElementById('pom-title-input').value = habit.name;
        dialog.remove();
        currentPopupDialog = null;
        toastr.success(`已注入习惯: ${habit.name}`);
      };
      listEl.appendChild(div);
    });

    dialog.querySelector('#popup-close').onclick = () => {
      dialog.remove();
      currentPopupDialog = null;
    };
  }

  // ====== 通知配置弹窗 ======
  function showNotifyConfig() {
    const dialog = document.createElement('div');
    const cfg = pm.notifyConfig;
    dialog.innerHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:300px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>通知设置</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div style="margin-bottom:8px;">
          <label style="display:flex;align-items:center;margin-bottom:6px;font-size:13px;">
            <input id="vibrate-check" type="checkbox" ${cfg.vibrate ? 'checked' : ''} style="margin-right:6px;">
            震动
          </label>
          <label style="display:flex;align-items:center;font-size:13px;">
            <input id="ring-check" type="checkbox" ${cfg.ring ? 'checked' : ''} style="margin-right:6px;">
            响铃
          </label>
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-size:13px;">铃声URL：</label>
          <input id="ring-url-input" type="text" placeholder="https://..." value="${cfg.ringUrl}"
                 style="width:100%;padding:4px;font-size:12px;">
        </div>
        <div style="text-align:right;">
          <button id="notify-ok" class="ha-btn">确定</button>
        </div>
      </div>`;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    
    // 关闭之前的弹窗
    if (currentPopupDialog) {
      currentPopupDialog.remove();
    }
    currentPopupDialog = dialog;
    
    content.appendChild(dialog);

    dialog.querySelector('#notify-ok').onclick = () => {
      cfg.vibrate = dialog.querySelector('#vibrate-check').checked;
      cfg.ring = dialog.querySelector('#ring-check').checked;
      cfg.ringUrl = dialog.querySelector('#ring-url-input').value;
      saveSettings();
      dialog.remove();
      currentPopupDialog = null;
      toastr.success('通知设置已保存');
    };
    dialog.querySelector('#popup-close').onclick = () => {
      dialog.remove();
      currentPopupDialog = null;
    };
  }

  // ====== 设置弹窗（白噪音 & 背景） ======
  function showSettingsPopup() {
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);width:280px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>白噪音 & 设置</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div style="margin-bottom:8px;">
          <div style="font-size:13px;color:#666;margin-bottom:4px;">白噪音控制：</div>
          <div style="display:flex;gap:4px;margin-bottom:8px;align-items:center;flex-wrap:wrap;">
            <button id="pom-bgm-play-popup" class="ha-btn" style="padding:4px 8px;">🎵</button>
            <button id="pom-bgm-next-popup" class="ha-btn" style="padding:4px 8px;">⏯️</button>
            <input id="pom-bgm-volume-popup" type="range" min="0" max="100" value="30"
                   style="width:100px;cursor:pointer;">
          </div>
        </div>
        <div style="margin-bottom:8px;">
          <div style="font-size:13px;color:#666;margin-bottom:4px;">通知设置：</div>
          <button id="pom-notify-btn-popup" class="ha-btn" style="padding:4px 8px;width:100%;">🔔 通知配置</button>
        </div>
        <div style="margin-bottom:8px;">
          <div style="font-size:13px;color:#666;margin-bottom:4px;">专注背景：</div>
          <div style="display:flex;gap:4px;">
            <button id="pom-bg-btn-popup" class="ha-btn" style="padding:4px 8px;flex:1;">上传专注背景</button>
            <button id="pom-bg-clear-popup" class="ha-btn" style="padding:4px 8px;flex:1;">清除背景</button>
          </div>
          <input id="pom-bg-upload-popup" type="file" accept="image/*" style="display:none;">
        </div>
      </div>`;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    });
    
    // 关闭之前的弹窗
    if (currentPopupDialog) {
      currentPopupDialog.remove();
    }
    currentPopupDialog = dialog;
    
    content.appendChild(dialog);

    // BGM控制
    const bgmPlayBtn = dialog.querySelector('#pom-bgm-play-popup');
    const bgmNextBtn = dialog.querySelector('#pom-bgm-next-popup');
    const bgmVolume = dialog.querySelector('#pom-bgm-volume-popup');
    
    bgmVolume.value = bgmAudio ? bgmAudio.volume * 100 : 30;
    bgmPlayBtn.innerText = bgmIsPlaying ? '⏸️' : '🎵';
    
    bgmPlayBtn.onclick = playBgm;
    bgmNextBtn.onclick = nextBgm;
    bgmVolume.oninput = (e) => {
      if (bgmAudio) bgmAudio.volume = e.target.value / 100;
    };

    // 通知配置
    dialog.querySelector('#pom-notify-btn-popup').onclick = () => {
      dialog.remove();
      currentPopupDialog = null;
      showNotifyConfig();
    };

    // 背景图片
    dialog.querySelector('#pom-bg-btn-popup').onclick = () => {
      dialog.querySelector('#pom-bg-upload-popup').click();
    };

    dialog.querySelector('#pom-bg-upload-popup').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toastr.error('请选择图片文件');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        pm.backgroundImage = event.target.result;
        saveSettings();
        toastr.success('专注背景已设置');
        dialog.remove();
        currentPopupDialog = null;
      };
      reader.readAsDataURL(file);
    };

    dialog.querySelector('#pom-bg-clear-popup').onclick = () => {
      pm.backgroundImage = null;
      saveSettings();
      toastr.success('专注背景已清除');
      dialog.remove();
      currentPopupDialog = null;
    };

    dialog.querySelector('#popup-close').onclick = () => {
      dialog.remove();
      currentPopupDialog = null;
    };
  }

  // ====== 时间管理弹窗 ======
  function showTimeManagePopup() {
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);width:280px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>时间管理</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div style="margin-bottom:8px;">
          <div style="font-size:13px;color:#666;margin-bottom:4px;">添加时间块：</div>
          <div style="display:flex;gap:4px;margin-bottom:4px;align-items:center;">
            <input id="pom-time-input-popup" type="number" placeholder="分钟" min="0" max="120" value=""
                   style="flex:1;padding:6px;font-size:13px;">
            <button id="pom-time-add-popup" class="ha-btn" style="padding:6px 12px;">➕</button>
          </div>
          <div style="font-size:12px;color:#999;">输入0表示正计时，输入1-120表示倒计时</div>
        </div>
        <div>
          <div style="font-size:13px;color:#666;margin-bottom:4px;">删除时间块：</div>
          <button id="pom-time-del-popup" class="ha-btn" style="padding:6px 12px;width:100%;">🗑️ 删除模式</button>
        </div>
      </div>`;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    });
    
    // 关闭之前的弹窗
    if (currentPopupDialog) {
      currentPopupDialog.remove();
    }
    currentPopupDialog = dialog;
    
    content.appendChild(dialog);

    const addBtn = dialog.querySelector('#pom-time-add-popup');
    const delBtn = dialog.querySelector('#pom-time-del-popup');
    const inputEl = dialog.querySelector('#pom-time-input-popup');

    addBtn.onclick = () => {
      const inputVal = inputEl.value.trim();
      const val = inputVal === '' || inputVal === '0' ? 0 : (parseInt(inputVal) || 25);
      if (val !== 0 && (val < 1 || val > 120)) {
        toastr.error('请输入1-120之间的数字或0(正计时)');
        return;
      }
      pm.timeBlocks.push(val);
      saveSettings();
      renderTimeBlocks();
      toastr.success(`添加${val === 0 ? '正计时' : val + '分钟'}时间块`);
      inputEl.value = '';
    };

    delBtn.onclick = () => {
      pm.timeDeleteMode = !pm.timeDeleteMode;
      delBtn.style.background = pm.timeDeleteMode ? '#ff9800' : '';
      renderTimeBlocks();
      if (pm.timeDeleteMode) {
        toastr.info('删除模式已开启，点击时间块即可删除');
      } else {
        toastr.info('删除模式已关闭');
      }
    };

    dialog.querySelector('#popup-close').onclick = () => {
      if (pm.timeDeleteMode) {
        pm.timeDeleteMode = false;
        renderTimeBlocks();
      }
      dialog.remove();
      currentPopupDialog = null;
    };
  }

  // ====== 标签管理弹窗 ======
  function showTagManagePopup() {
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);width:280px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>标签管理</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div style="margin-bottom:8px;">
          <div style="font-size:13px;color:#666;margin-bottom:4px;">添加标签：</div>
          <div style="display:flex;gap:4px;margin-bottom:4px;align-items:center;">
            <input id="pom-tag-input-popup" type="text" placeholder="标签名称"
                   style="flex:1;padding:6px;font-size:13px;">
            <button id="pom-tag-add-popup" class="ha-btn" style="padding:6px 12px;">➕</button>
          </div>
        </div>
        <div>
          <div style="font-size:13px;color:#666;margin-bottom:4px;">删除标签：</div>
          <button id="pom-tag-del-popup" class="ha-btn" style="padding:6px 12px;width:100%;">🗑️ 删除模式</button>
        </div>
      </div>`;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    });
    
    // 关闭之前的弹窗
    if (currentPopupDialog) {
      currentPopupDialog.remove();
    }
    currentPopupDialog = dialog;
    
    content.appendChild(dialog);

    const addBtn = dialog.querySelector('#pom-tag-add-popup');
    const delBtn = dialog.querySelector('#pom-tag-del-popup');
    const inputEl = dialog.querySelector('#pom-tag-input-popup');

    addBtn.onclick = () => {
      const tag = inputEl.value.trim();
      if (!tag) {
        toastr.error('请输入标签名');
        return;
      }
      pm.tagBlocks.push(tag);
      inputEl.value = '';
      saveSettings();
      renderTagBlocks();
      toastr.success(`已添加标签: ${tag}`);
    };

    delBtn.onclick = () => {
      pm.tagDeleteMode = !pm.tagDeleteMode;
      delBtn.style.background = pm.tagDeleteMode ? '#ff9800' : '';
      renderTagBlocks();
      if (pm.tagDeleteMode) {
        toastr.info('删除模式已开启，点击标签即可删除');
      } else {
        toastr.info('删除模式已关闭');
      }
    };

    dialog.querySelector('#popup-close').onclick = () => {
      if (pm.tagDeleteMode) {
        pm.tagDeleteMode = false;
        renderTagBlocks();
      }
      dialog.remove();
      currentPopupDialog = null;
    };
  }

  // ====== 统计面板 ======
  function showStatsPanel() {
    const dialog = document.createElement('div');
    let statsHTML = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-height:300px;width:300px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>专注统计</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div id="stats-content" style="max-height:180px;overflow-y:auto;font-size:13px;margin-bottom:8px;">`;

    const tagStats = {};
    let totalDuration = 0;
    pm.records.forEach(r => {
      totalDuration += r.duration;
      const tag = r.tags.length > 0 ? r.tags[0] : '(无标签)';
      if (!tagStats[tag]) tagStats[tag] = 0;
      tagStats[tag] += r.duration;
    });

    statsHTML += `<div style="font-weight:600;margin-bottom:6px;">总计：${Math.floor(totalDuration / 60)}分钟</div>`;
    for (const tag in tagStats) {
      const mins = Math.floor(tagStats[tag] / 60);
      statsHTML += `<div style="margin-bottom:4px;">📍 ${tag}: ${mins}分钟</div>`;
    }

    statsHTML += `</div>
      <div style="display:flex;gap:6px;">
        <button id="stats-sync" class="ha-btn" style="flex:1;">同步世界书</button>
        <button id="stats-close" class="ha-btn" style="flex:1;">关闭</button>
      </div>
    </div>`;

    dialog.innerHTML = statsHTML;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    });
    
    // 关闭之前的弹窗
    if (currentPopupDialog) {
      currentPopupDialog.remove();
    }
    currentPopupDialog = dialog;
    
    content.appendChild(dialog);

    dialog.querySelector('#stats-sync').onclick = async () => {
      try {
        const fileId = await findHealthWorldFile();
        if (!fileId) {
          toastr.error('未找到健康生活助手世界书');
          return;
        }
        const moduleWI = await import('/scripts/world-info.js');
        const worldInfo = await moduleWI.loadWorldInfo(fileId);
        const entries = worldInfo.entries || {};
        let targetUID = null;
        for (const id in entries) {
          const entry = entries[id];
          const comment = entry.comment || '';
          if (!entry.disable && (comment.includes('专注统计') || entry.title === '专注统计')) {
            targetUID = entry.uid;
            break;
          }
        }
        if (!targetUID) {
          toastr.error('未找到专注统计条目');
          return;
        }

        let statsContent = `总计：${Math.floor(totalDuration / 60)}分钟\n\n`;
        for (const tag in tagStats) {
          const mins = Math.floor(tagStats[tag] / 60);
          statsContent += `📍 ${tag}: ${mins}分钟\n`;
        }

        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: targetUID, field: 'content' }, statsContent);

        toastr.success('已同步到世界书');
        dialog.remove();
        currentPopupDialog = null;
      } catch (e) {
        toastr.error('同步失败: ' + e.message);
      }
    };

    dialog.querySelector('#stats-close').onclick = () => {
      dialog.remove();
      currentPopupDialog = null;
    };
    dialog.querySelector('#popup-close').onclick = () => {
      dialog.remove();
      currentPopupDialog = null;
    };
  }

  // ====== 删除记录面板 ======
  let deleteDialogInstance = null;

  function showDeletePanel() {
    // 关闭之前的弹窗
    if (currentPopupDialog) {
      currentPopupDialog.remove();
    }
    
    if (deleteDialogInstance) {
      deleteDialogInstance.remove();
      deleteDialogInstance = null;
    }

    const dialog = document.createElement('div');
    let html = `
      <div style="background:#fff;padding:12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-height:300px;width:320px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600;">
          <span>删除专注记录</span>
          <button id="popup-close" class="ha-btn" style="padding:2px 6px;font-size:12px;">×</button>
        </div>
        <div id="delete-list" style="max-height:200px;overflow-y:auto;font-size:13px;"></div>
      </div>`;

    dialog.innerHTML = html;
    Object.assign(dialog.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    content.appendChild(dialog);
    deleteDialogInstance = dialog;
    currentPopupDialog = dialog;

    const listEl = dialog.querySelector('#delete-list');

    function renderDeleteList() {
      listEl.innerHTML = '';
      pm.records.forEach((record, idx) => {
        const div = document.createElement('div');
        const mins = Math.floor(record.duration / 60);
        const tags = record.tags.length ? `[${record.tags.join(',')}]` : '';
        div.style.cssText = `
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:6px;
          margin-bottom:4px;
          background:#f5f5f5;
          border-radius:3px;
        `;
        div.innerHTML = `
          <span>${record.title} ${mins}分 ${tags}</span>
          <button class="ha-btn" style="padding:2px 6px;font-size:12px;">删除</button>
        `;
        div.querySelector('button').onclick = () => {
          pm.records.splice(idx, 1);
          saveSettings();
          appendToWorldInfoFocus();
          renderDeleteList();
          toastr.success('记录已删除');
        };
        listEl.appendChild(div);
      });
    }

    renderDeleteList();

    dialog.querySelector('#popup-close').onclick = () => {
      dialog.remove();
      deleteDialogInstance = null;
      currentPopupDialog = null;
    };
  }

  // ====== 事件监听 ======
  
  // 弹窗按钮
  document.getElementById('pom-settings-btn').onclick = showSettingsPopup;
  document.getElementById('pom-time-panel-btn').onclick = showTimeManagePopup;
  document.getElementById('pom-tag-panel-btn').onclick = showTagManagePopup;

  document.getElementById('pom-todo-btn').onclick = showTodoPopup;
  document.getElementById('pom-habit-btn').onclick = showHabitPopup;
  document.getElementById('pom-start-btn').onclick = showSessionPanel;
  document.getElementById('pom-stats-btn').onclick = showStatsPanel;
  document.getElementById('pom-delete-btn').onclick = showDeletePanel;

  // ====== 初始化渲染 ======
  renderTimeBlocks();
  renderTagBlocks();
  updateBgmDisplay();
}


  
      
      
      
      
      
      
      
      
      
      
      
      
      
async function showRoutine(){  
  const container = content;  
  container.style.display = 'block';  
  
 
    
  
  container.innerHTML = `  
    <div style="font-weight:600;margin-bottom:6px">规律作息</div>  
    <div style="display:flex;gap:8px;margin-bottom:6px">  
      <button id="ha-wake" class="ha-btn" style="flex:1">起床打卡</button>  
      <button id="ha-sleep" class="ha-btn" style="flex:1">入睡打卡</button>  
    </div>  
    <div style="display:flex;gap:8px;margin-bottom:6px">  
      <button id="ha-wake-manual" class="ha-btn" style="flex:1">手动起床</button>  
      <button id="ha-sleep-manual" class="ha-btn" style="flex:1">手动入睡</button>  
    </div>  
    <div style="display:flex;gap:8px;margin-bottom:6px">  
      <button id="ha-sleep-help" class="ha-btn" style="flex:1">助眠</button>  
      <button id="ha-sleep-analysis" class="ha-btn" style="flex:1">睡眠质量分析</button>  
    </div>
    <div style="display:flex;gap:8px;margin-bottom:6px">  
      <button id="ha-sleep-records" class="ha-btn" style="flex:1">睡眠记录管理</button>  
    </div>
    <div style="display:flex;gap:8px;margin-bottom:6px">  
      <button id="ha-sleep-auto-clean" class="ha-btn" style="flex:1">定期清除</button>  
    </div>  
    <div id="ha-subpanel" class="ha-routine-subpanel"></div>
    <div id="ha-routine-log" class="ha-small"></div>  
  `;  
  const wakeBtn = document.getElementById('ha-wake');  
  const sleepBtn = document.getElementById('ha-sleep');  
  const wakeManualBtn = document.getElementById('ha-wake-manual');  
  const sleepManualBtn = document.getElementById('ha-sleep-manual');  
  const logEl = document.getElementById('ha-routine-log');  
  const subPanel = document.getElementById('ha-subpanel');
  
  // 生成带时区偏移的ISO格式时间字符串
  function toLocalISOString(date) {
    const tzOffset = -date.getTimezoneOffset();
    const diff = tzOffset >= 0 ? '+' : '-';
    const pad = (num) => String(Math.floor(Math.abs(num))).padStart(2, '0');
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    
    const tzHour = pad(tzOffset / 60);
    const tzMin = pad(tzOffset % 60);
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}${diff}${tzHour}:${tzMin}`;
  }
  
  async function findHealthWorldFile() {  
    try {  
      const moduleWI = await import('/scripts/world-info.js');  
      const selected = moduleWI.selected_world_info || [];  
      console.log('[健康生活助手] selected_world_info:', selected);
      for (const WI of selected) {  
        if (WI.includes('健康生活助手')) {  
          toastr.info('匹配到世界书文件: ' + WI, '世界书');
          return WI;  
        }  
      }  
      toastr.warning('未找到名为 "健康生活助手" 的世界书文件', '世界书');
      return null;  
    } catch (e) {  
      toastr.error('查找世界书文件异常: ' + (e.message || e), '错误');
      return null;  
    }  
  }  
  async function appendToWorldInfoSleepLog(type, localIsoTime){  
    try {  
      const fileId = await findHealthWorldFile();  
      if (!fileId) { 
        toastr.warning('未找到世界书文件，跳过写入', '写入世界书'); 
        return; 
      }  
      const moduleWI = await import('/scripts/world-info.js');  
      const worldInfo = await moduleWI.loadWorldInfo(fileId);  
      const entries = worldInfo.entries || {};  
      let targetUID = null;  
      for (const id in entries) {  
        const entry = entries[id];  
        const comment = entry.comment || '';  
        if (!entry.disable && (comment.includes('睡眠') || comment.includes('健康生活助手/睡眠') || entry.title === '睡眠' )) {  
          targetUID = entry.uid;  
          break;  
        }  
      }  
      if (!targetUID) {  
        toastr.warning('未找到睡眠 entry（未创建），写入被跳过', '世界书');
        return;  
      }  
      // 直接使用带时区的ISO时间
      const recLine = `${type === 'wake' ? '起床' : '入睡'} 打卡 @ ${localIsoTime}`;  
      const existing = entries[targetUID].content || '';  
      const newContent = existing + (existing ? '\n' : '') + recLine;  
      await globalThis.SillyTavern.getContext()  
        .SlashCommandParser.commands['setentryfield']  
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);  
      toastr.success('已写入世界书: ' + recLine, '写入成功');
    } catch (e) {  
      toastr.error('写入世界书失败: ' + (e.message || e), '错误');
    }  
  }  
  function appendSleepRecord(type, customTime = null){  
    const now = customTime || new Date();  
    const localIsoTime = toLocalISOString(now);  // 带时区的ISO格式
    const rec = { 
      type, 
      ts: localIsoTime,  // 本地时区ISO格式存储
      label: localIsoTime,  // 本地时区ISO格式
      enabled: true
    };  
    ctx.extensionSettings[MODULE_NAME].sleep.push(rec);  
    saveSettings();  
    const text = `${type === 'wake' ? '起床' : '入睡'} 打卡：\n${localIsoTime}`;  
    toastr.success(text, '打卡成功');
    renderLog();  
    appendToWorldInfoSleepLog(type, localIsoTime);  // 传入本地ISO格式时间
  }  
  // 手动选择时间的函数
  function openManualTimeDialog(type) {
    const typeText = type === 'wake' ? '起床' : '入睡';
    const dialog = document.createElement('div');
    dialog.className = 'ha-manual-time-overlay';
    
    dialog.innerHTML = `
      <div class="ha-manual-time-panel">
        <div class="ha-manual-time-title">手动${typeText}打卡</div>
        <label class="ha-manual-time-label">日期:</label><br>
        <input id="manual-sleep-date" type="date" class="ha-manual-time-input"><br>
        <label class="ha-manual-time-label">时间:</label><br>
        <input id="manual-sleep-time" type="time" class="ha-manual-time-input"><br>
        <div class="ha-manual-time-footer">
          <button id="manual-sleep-ok" class="ha-btn">确定</button>
          <button id="manual-sleep-cancel" class="ha-btn" style="margin-left:6px;">取消</button>
        </div>
      </div>
    `;
    
    container.appendChild(dialog);
    
    // 设置默认值为当前时间
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    dialog.querySelector('#manual-sleep-date').value = dateStr;
    dialog.querySelector('#manual-sleep-time').value = timeStr;
    
    dialog.querySelector('#manual-sleep-cancel').onclick = () => dialog.remove();
    dialog.querySelector('#manual-sleep-ok').onclick = () => {
      const date = dialog.querySelector('#manual-sleep-date').value;
      const time = dialog.querySelector('#manual-sleep-time').value;
      
      if (!date || !time) {
        toastr.warning('请选择完整的日期和时间', '输入不完整');
        return;
      }
      
      const selectedDateTime = new Date(`${date}T${time}`);
      
      if (isNaN(selectedDateTime.getTime())) {
        toastr.error('无效的日期时间', '错误');
        return;
      }
      
      appendSleepRecord(type, selectedDateTime);
      dialog.remove();
    };
  }
  wakeBtn.addEventListener('click', () => appendSleepRecord('wake'));  
  sleepBtn.addEventListener('click', () => appendSleepRecord('sleep'));  
  wakeManualBtn.addEventListener('click', () => openManualTimeDialog('wake'));
  sleepManualBtn.addEventListener('click', () => openManualTimeDialog('sleep'));
  // 助眠按钮
  document.getElementById('ha-sleep-help').addEventListener('click', async () => {  
    const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};  
    subPanel.innerText = '正在获取助眠建议...';  
    subPanel.scrollTop = subPanel.scrollHeight;
    if (!api.url) {  
      subPanel.innerText = '未配置独立 API，默认提示：保持卧室安静、黑暗，避免咖啡因，睡前放松。';  
      subPanel.scrollTop = subPanel.scrollHeight;  
      toastr.info('未配置 API，显示默认提示', '助眠');
      return;  
    }  
    try {  
      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';  
      toastr.info('正在请求助眠建议...', 'API 调用');
      
      const res = await fetch(endpoint, {  
        method: 'POST',  
        headers: {  
          'Content-Type': 'application/json',  
          ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})  
        },  
        body: JSON.stringify({  
          model: api.model,  
          messages: [{ role: 'system', content: '提供一些哄睡助眠措施帮user放下手机入眠。' }],  
          max_tokens: 5000  
        })  
      });  
      
      if (!res.ok) throw new Error('HTTP ' + res.status);  
      const data = await res.json();  
      const text = data.choices?.[0]?.message?.content || (data.result || JSON.stringify(data));  
      subPanel.innerText = text;  
      subPanel.scrollTop = subPanel.scrollHeight;  
      toastr.success('助眠建议已生成', 'API 调用成功');
    } catch (e) {  
      subPanel.innerText = 'API 请求失败：' + (e.message || e);  
      subPanel.scrollTop = subPanel.scrollHeight;  
      toastr.error('助眠调用失败: ' + (e.message || e), 'API 错误');
    }  
  });  
  // 睡眠质量分析按钮
  document.getElementById('ha-sleep-analysis').addEventListener('click', async () => {  
    subPanel.innerText = '正在分析睡眠质量...';  
    subPanel.scrollTop = subPanel.scrollHeight;  
    try {  
      const fileId = await findHealthWorldFile();  
      if (!fileId) { 
        subPanel.innerText = '未找到世界书（健康生活助手.json）'; 
        subPanel.scrollTop = subPanel.scrollHeight;  
        return; 
      }  
      const moduleWI = await import('/scripts/world-info.js');  
      const worldInfo = await moduleWI.loadWorldInfo(fileId);  
      const entries = worldInfo.entries || {};  
      let targetContent = '';  
      for (const id in entries) {  
        const entry = entries[id];  
        const comment = entry.comment || '';  
        if (!entry.disable && (comment.includes('睡眠') || comment.includes('健康生活助手/睡眠') || entry.title === '睡眠')) {  
          targetContent = entry.content || '';  
          break;  
        }  
      }  
      if (!targetContent) { 
        subPanel.innerText = '世界书中未找到睡眠条目或内容为空'; 
        subPanel.scrollTop = subPanel.scrollHeight;  
        toastr.warning('睡眠条目为空', '分析');
        return; 
      }  
      const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};  
      if (!api.url) {  
        subPanel.innerText = '未配置独立 API，无法进行分析。';  
        subPanel.scrollTop = subPanel.scrollHeight;  
        toastr.warning('未配置 API', '分析');
        return;  
      }  
      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';  
      toastr.info('正在分析睡眠质量...', 'API 调用');
      
      const res = await fetch(endpoint, {  
        method: 'POST',  
        headers: {  
          'Content-Type': 'application/json',  
          ...(api.key ? { 'Authorization': `Bearer ${api.key}` } : {})  
        },  
        body: JSON.stringify({  
          model: api.model,  
          messages: [  
            { role: 'system', content: '你是健康顾问，请分析用户的睡眠记录并给出改善建议。' },  
            { role: 'user', content: targetContent }  
          ],  
          max_tokens: 5000 
        })  
      });  
      
      if (!res.ok) throw new Error('HTTP ' + res.status);  
      const data = await res.json();  
      const text = data.choices?.[0]?.message?.content || JSON.stringify(data);  
      subPanel.innerText = text;  
      subPanel.scrollTop = subPanel.scrollHeight;  
      toastr.success('睡眠质量分析完成', 'API 调用成功');
    } catch (e) {  
      subPanel.innerText = '分析失败：' + (e.message || e);  
      subPanel.scrollTop = subPanel.scrollHeight;  
      toastr.error('分析异常: ' + (e.message || e), '错误');
    }  
  });
  
  // 睡眠记录管理按钮
  document.getElementById('ha-sleep-records').addEventListener('click', () => {
    openSleepRecordsManager();
  });
  
  // 定期清除按钮
  document.getElementById('ha-sleep-auto-clean').addEventListener('click', () => {
    openAutoCleanPanel();
  });
  
  // 睡眠记录管理面板
  function openSleepRecordsManager() {
    const panel = document.createElement('div');
    panel.className = 'ha-sleep-records-overlay';
    
    panel.innerHTML = `
      <div class="ha-sleep-records-panel">
        <div class="ha-sleep-records-title">睡眠记录管理</div>
        <div id="sleep-records-list" class="ha-sleep-records-list"></div>
        <div class="ha-sleep-records-footer">
          <button id="sleep-records-close" class="ha-btn">关闭</button>
        </div>
      </div>
    `;
    
    container.appendChild(panel);
    
    // 渲染记录列表
    renderRecordsList();
    
    function renderRecordsList() {
      const listEl = panel.querySelector('#sleep-records-list');
      const records = ctx.extensionSettings[MODULE_NAME].sleep || [];
      
      if (records.length === 0) {
        listEl.innerHTML = '<div class="ha-sleep-records-empty">暂无睡眠记录</div>';
        return;
      }
      
      listEl.innerHTML = records.map((rec, index) => {
        const typeText = rec.type === 'wake' ? '起床' : '入睡';
        const enabledStatus = rec.enabled !== false; // 兼容旧数据，默认为启用
        const statusText = enabledStatus ? '已启用' : '未启用';
        const statusClass = enabledStatus ? 'enabled' : 'disabled';
        
        return `
          <div class="ha-sleep-record-item">
            <div class="ha-sleep-record-content">
              <div class="ha-sleep-record-info">
                <div class="ha-sleep-record-main">${typeText}</div>
                <div class="ha-sleep-record-time">${rec.ts}</div>
                <div class="ha-sleep-record-status ${statusClass}">${statusText}</div>
              </div>
              <div class="ha-sleep-record-actions">
                <button class="ha-btn ha-sleep-record-btn toggle-record" data-index="${index}">
                  ${enabledStatus ? '禁用' : '启用'}
                </button>
                <button class="ha-btn ha-sleep-record-btn delete" data-index="${index}">
                  删除
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      // 绑定删除按钮事件
      listEl.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const index = parseInt(btn.getAttribute('data-index'));
          await deleteRecord(index);
          renderRecordsList();
        });
      });
      
      // 绑定启用/禁用按钮事件
      listEl.querySelectorAll('.toggle-record').forEach(btn => {
        btn.addEventListener('click', async () => {
          const index = parseInt(btn.getAttribute('data-index'));
          await toggleRecord(index);
          renderRecordsList();
        });
      });
    }
    
    // 删除记录（同时从localStorage和世界书删除）
    async function deleteRecord(index) {
      const records = ctx.extensionSettings[MODULE_NAME].sleep || [];
      const record = records[index];
      
      if (!record) {
        toastr.warning('记录不存在', '删除失败');
        return;
      }
      
      // 从localStorage删除
      records.splice(index, 1);
      saveSettings();
      
      // 从世界书删除
      await removeFromWorldInfo(record);
      
      toastr.success('记录已删除', '删除成功');
      renderLog();
    }
    
    // 切换启用状态
    async function toggleRecord(index) {
      const records = ctx.extensionSettings[MODULE_NAME].sleep || [];
      const record = records[index];
      
      if (!record) {
        toastr.warning('记录不存在', '操作失败');
        return;
      }
      
      // 切换启用状态
      record.enabled = !(record.enabled !== false); // 兼容旧数据
      saveSettings();
      
      // 同步到世界书
      await syncToWorldInfo();
      
      const statusText = record.enabled ? '已启用' : '已禁用';
      toastr.success(`记录${statusText}`, '操作成功');
      renderLog();
    }
    
    // 从世界书删除特定记录
    async function removeFromWorldInfo(record) {
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
          if (!entry.disable && (comment.includes('睡眠') || comment.includes('健康生活助手/睡眠') || entry.title === '睡眠')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (!targetUID) return;
        
        // 重新生成世界书内容（排除被删除的记录）
        await syncToWorldInfo();
        
      } catch (e) {
        console.error('从世界书删除失败:', e);
      }
    }
    
    // 同步所有启用的记录到世界书
    async function syncToWorldInfo() {
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
          if (!entry.disable && (comment.includes('睡眠') || comment.includes('健康生活助手/睡眠') || entry.title === '睡眠')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (!targetUID) {
          toastr.warning('未找到睡眠条目', '同步失败');
          return;
        }
        
        // 只包含启用的记录
        const records = ctx.extensionSettings[MODULE_NAME].sleep || [];
        const enabledRecords = records.filter(rec => rec.enabled !== false);
        
        const newContent = enabledRecords.map(rec => {
          const typeText = rec.type === 'wake' ? '起床' : '入睡';
          // 直接使用存储的带时区的ISO时间
          return `${typeText} 打卡 @ ${rec.ts}`;
        }).join('\n');
        
        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
        
      } catch (e) {
        console.error('同步到世界书失败:', e);
      }
    }
    
    panel.querySelector('#sleep-records-close').onclick = () => panel.remove();
  }
  
  // 定期清除面板
  function openAutoCleanPanel() {
    const panel = document.createElement('div');
    panel.className = 'ha-sleep-records-overlay';
    
    // 读取当前配置
    const config = ctx.extensionSettings[MODULE_NAME].sleepAutoClean || {
      days: 30,
      cleanLocalStorage: false,
      cleanWorldBook: false
    };
    
    panel.innerHTML = `
      <div class="ha-sleep-records-panel" style="max-width: 400px;">
        <div class="ha-sleep-records-title">定期清除设置</div>
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-size: 13px;">清除天数（保留最近N天）:</label>
          <input type="number" id="auto-clean-days" value="${config.days}" min="1" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
          <div style="font-size: 11px; color: #666; margin-top: 2px;">例如: 输入30表示保留最近30天的记录</div>
        </div>
        <div style="margin-bottom: 12px;">
          <button id="auto-clean-localstorage" class="ha-btn" style="width: 100%; margin-bottom: 6px; ${config.cleanLocalStorage ? 'background: #f44336; color: #fff;' : ''}">
            ${config.cleanLocalStorage ? '✓ ' : ''}清除 localStorage
          </button>
          <button id="auto-clean-worldbook" class="ha-btn" style="width: 100%; ${config.cleanWorldBook ? 'background: #f44336; color: #fff;' : ''}">
            ${config.cleanWorldBook ? '✓ ' : ''}清除世界书
          </button>
        </div>
        <div style="font-size: 12px; color: #666; padding: 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 12px;">
          <strong>说明:</strong> 每天04:00自动清除过期记录。如果04:00时浏览器未打开，则在扩展下次启动时执行清除。
        </div>
        <div class="ha-sleep-records-footer">
          <button id="auto-clean-save" class="ha-btn" style="background: #4CAF50; color: #fff;">保存设置</button>
          <button id="auto-clean-close" class="ha-btn" style="margin-left: 6px;">关闭</button>
        </div>
      </div>
    `;
    
    container.appendChild(panel);
    
    let cleanLocalStorage = config.cleanLocalStorage;
    let cleanWorldBook = config.cleanWorldBook;
    
    // 切换 localStorage 清除
    panel.querySelector('#auto-clean-localstorage').addEventListener('click', (e) => {
      cleanLocalStorage = !cleanLocalStorage;
      const btn = e.target;
      if (cleanLocalStorage) {
        btn.style.background = '#f44336';
        btn.style.color = '#fff';
        btn.textContent = '✓ 清除 localStorage';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '清除 localStorage';
      }
    });
    
    // 切换世界书清除
    panel.querySelector('#auto-clean-worldbook').addEventListener('click', (e) => {
      cleanWorldBook = !cleanWorldBook;
      const btn = e.target;
      if (cleanWorldBook) {
        btn.style.background = '#f44336';
        btn.style.color = '#fff';
        btn.textContent = '✓ 清除世界书';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '清除世界书';
      }
    });
    
    // 保存设置
    panel.querySelector('#auto-clean-save').addEventListener('click', () => {
      const days = parseInt(panel.querySelector('#auto-clean-days').value);
      if (isNaN(days) || days < 1) {
        toastr.warning('请输入有效的天数（至少为1）', '输入错误');
        return;
      }
      
      ctx.extensionSettings[MODULE_NAME].sleepAutoClean = {
        days,
        cleanLocalStorage,
        cleanWorldBook,
        lastCleanDate: ctx.extensionSettings[MODULE_NAME].sleepAutoClean?.lastCleanDate || null
      };
      saveSettings();
      toastr.success('定期清除设置已保存', '保存成功');
      panel.remove();
    });
    
    panel.querySelector('#auto-clean-close').onclick = () => panel.remove();
  }
  
  // 执行定期清除（从指定日期之前的记录）
  async function performAutoClean(daysToKeep) {
    const config = ctx.extensionSettings[MODULE_NAME].sleepAutoClean;
    if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
      return; // 未配置或都未启用
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // 解析ISO日期字符串获取日期部分
    function parseISODate(isoString) {
      const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return null;
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    
    const records = ctx.extensionSettings[MODULE_NAME].sleep || [];
    
    // 清除 localStorage
    if (config.cleanLocalStorage) {
      const filteredRecords = records.filter(rec => {
        const recDate = parseISODate(rec.ts);
        return recDate && recDate >= cutoffDate;
      });
      
      const removedCount = records.length - filteredRecords.length;
      if (removedCount > 0) {
        ctx.extensionSettings[MODULE_NAME].sleep = filteredRecords;
        saveSettings();
        console.log(`[健康生活助手] 自动清除: 从 localStorage 删除了 ${removedCount} 条记录`);
      }
    }
    
    // 清除世界书
    if (config.cleanWorldBook) {
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
          if (!entry.disable && (comment.includes('睡眠') || comment.includes('健康生活助手/睡眠') || entry.title === '睡眠')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (!targetUID) return;
        
        // 获取当前启用的记录（已经是过滤后的）
        const currentRecords = ctx.extensionSettings[MODULE_NAME].sleep || [];
        const enabledRecords = currentRecords.filter(rec => rec.enabled !== false);
        
        const newContent = enabledRecords.map(rec => {
          const typeText = rec.type === 'wake' ? '起床' : '入睡';
          return `${typeText} 打卡 @ ${rec.ts}`;
        }).join('\n');
        
        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
        
        console.log('[健康生活助手] 自动清除: 已同步世界书');
      } catch (e) {
        console.error('[健康生活助手] 自动清除世界书失败:', e);
      }
    }
    
    // 更新最后清除日期
    config.lastCleanDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    saveSettings();
  }
  
  function renderLog(){  
    const arr = ctx.extensionSettings[MODULE_NAME].sleep || [];  
    logEl.innerText = `已记录 ${arr.length} 条（存储在扩展设置与世界书中）`;  
  }  
  renderLog();
  
 
}














  
async function showDiet() {
  content.style.display = 'block';
  
  
    
  
  content.innerHTML = `
    <div class="ha-diet-title">健康饮食</div>
    <div class="ha-diet-btn-row">
      <button id="ha-breakfast" class="ha-btn ha-diet-btn-flex">早餐</button>
      <button id="ha-lunch" class="ha-btn ha-diet-btn-flex">午餐</button>
    </div>
    <div class="ha-diet-btn-row">
      <button id="ha-dinner" class="ha-btn ha-diet-btn-flex">晚餐</button>
      <button id="ha-other" class="ha-btn ha-diet-btn-flex">其他记录</button>
    </div>
    <div class="ha-diet-btn-row">
      <button id="ha-diet-advice" class="ha-btn ha-diet-btn-flex">饮食建议（API）</button>
      <button id="ha-diet-stats" class="ha-btn ha-diet-btn-flex">饮食记录管理</button>
    </div>
    <div class="ha-diet-btn-row">
      <button id="ha-diet-auto-clean" class="ha-btn ha-diet-btn-flex">定期清除</button>
    </div>
    <div id="ha-diet-subpanel" class="ha-diet-subpanel"></div>
    <div id="ha-diet-log" class="ha-small"></div>
  `;

  const logEl = document.getElementById('ha-diet-log');
  const subPanel = document.getElementById('ha-diet-subpanel');
  
  // ========== 带时区偏移的 ISO 格式时间函数 ==========
  function getISOTimestampWithTimezone() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const offset = -now.getTimezoneOffset();
    const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
    const offsetSign = offset >= 0 ? '+' : '-';
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }
  
  // 格式化显示时间（显示为当地时间）
  function formatLocalTime(isoString) {
    if (!isoString) return '未知时间';
    try {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return isoString;
    }
  }

  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          return WI;
        }
      }
      toastr.warning('未找到名为 "健康生活助手" 的世界书文件');
      return null;
    } catch (e) {
      toastr.error('查找世界书文件失败: ' + e.message);
      return null;
    }
  }

  // ========== 写入世界书：使用 ISO 时间戳 ==========
  async function appendToWorldInfoDietLog(meal, contentText, isoTimestamp) {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) { 
        toastr.warning('写入世界书: 未找到世界书文件，跳过写入'); 
        return; 
      }

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};

      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('饮食') || entry.title === '饮食')) {
          targetUID = entry.uid;
          break;
        }
      }

      if (!targetUID) {
        toastr.warning('未找到饮食 entry（未创建），写入被跳过。');
        return;
      }

      const recLine = `${isoTimestamp}:${meal}:${contentText}`;
      const existing = entries[targetUID].content || '';
      const newContent = existing + (existing ? '\n' : '') + recLine;

      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);

      toastr.success('写入世界书成功');
    } catch (e) {
      toastr.error('写入世界书失败: ' + e.message);
    }
  }

  function recordDiet(meal) {
    const text = prompt(`记录 ${meal} 内容：`, '');
    if (!text) return;
    
    const isoTimestamp = getISOTimestampWithTimezone();
    
    if (!ctx.extensionSettings[MODULE_NAME].diet) {
      ctx.extensionSettings[MODULE_NAME].diet = [];
    }
    
    ctx.extensionSettings[MODULE_NAME].diet.push({ 
      meal, 
      text, 
      ts: isoTimestamp,
      enabled: true 
    });
    saveSettings();
    toastr.success(`${meal} 已记录：${text}`);
    renderLog();
    
    appendToWorldInfoDietLog(meal, text, isoTimestamp);
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
        toastr.warning('饮食建议: 未配置 API');
        return;
      }

      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
      toastr.info('正在调用饮食建议 API...');

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
      
      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
      subPanel.innerText = text;
      subPanel.scrollTop = subPanel.scrollHeight;
      toastr.success('饮食建议获取成功');
    } catch (e) {
      subPanel.innerText = 'API 请求失败：' + (e.message || e);
      subPanel.scrollTop = subPanel.scrollHeight;
      toastr.error('饮食建议调用失败: ' + e.message);
    }
  });

  // === 饮食记录管理功能 ===
  
  function getLocalStorageEntries(mealType) {
    const allDiet = ctx.extensionSettings[MODULE_NAME].diet || [];
    const filtered = allDiet.map((entry, index) => ({
      text: entry.text || entry,
      ts: entry.ts || '',
      meal: entry.meal || '',
      index: index,
      enabled: entry.enabled !== false
    })).filter(e => !mealType || e.meal === mealType);
    return filtered;
  }
  
  function deleteLocalStorageEntry(index) {
    if (!ctx.extensionSettings[MODULE_NAME].diet) return;
    ctx.extensionSettings[MODULE_NAME].diet.splice(index, 1);
    saveSettings();
  }
  
  function updateLocalStorageEntryEnabled(index, enabled) {
    if (!ctx.extensionSettings[MODULE_NAME].diet) return;
    const entry = ctx.extensionSettings[MODULE_NAME].diet[index];
    if (typeof entry === 'object') {
      entry.enabled = enabled;
    } else {
      ctx.extensionSettings[MODULE_NAME].diet[index] = {
        text: entry,
        meal: 'other',
        ts: getISOTimestampWithTimezone(),
        enabled: enabled
      };
    }
    saveSettings();
  }
  
  async function deleteLineFromWorldInfo(meal, isoTimestamp, text) {
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
        if (!entry.disable && (comment.includes('饮食') || entry.title === '饮食')) {
          targetUID = entry.uid;
          targetContent = entry.content || '';
          break;
        }
      }
      
      if (!targetUID) return false;
      
      const lineToDelete = `${isoTimestamp}:${meal}:${text}`;
      
      const lines = targetContent.split('\n');
      const newLines = lines.filter(line => line.trim() !== lineToDelete.trim());
      const newContent = newLines.join('\n');
      
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
      
      return true;
    } catch (e) {
      toastr.error('从世界书删除失败: ' + e.message);
      return false;
    }
  }
  
  async function appendToWorldInfoEntry(meal, isoTimestamp, text) {
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
        if (!entry.disable && (comment.includes('饮食') || entry.title === '饮食')) {
          targetUID = entry.uid;
          break;
        }
      }
      
      if (!targetUID) {
        toastr.warning('未找到"饮食"条目');
        return;
      }
      
      const recLine = `${isoTimestamp}:${meal}:${text}`;
      const existing = entries[targetUID].content || '';
      const newContent = existing + (existing ? '\n' : '') + recLine;
      
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
      
      toastr.success('已同步到世界书"饮食"条目');
    } catch (e) {
      toastr.error('写入世界书失败: ' + e.message);
    }
  }
  
  // 饮食记录管理按钮
  document.getElementById('ha-diet-stats').addEventListener('click', () => {
    let statsModal = document.getElementById('ha-diet-stats-modal');
    if (!statsModal) {
      statsModal = document.createElement('div');
      statsModal.id = 'ha-diet-stats-modal';
      statsModal.className = 'ha-diet-stats-modal';
      
      statsModal.innerHTML = `
        <div class="ha-diet-stats-header">
          <span class="ha-diet-stats-title">饮食记录管理</span>
          <button id="close-diet-stats" class="ha-diet-stats-close">&times;</button>
        </div>
        <div class="ha-diet-stats-buttons">
          <button id="stats-breakfast" class="ha-btn ha-diet-stats-btn">早餐统计</button>
          <button id="stats-lunch" class="ha-btn ha-diet-stats-btn">午餐统计</button>
          <button id="stats-dinner" class="ha-btn ha-diet-stats-btn">晚餐统计</button>
          <button id="stats-other" class="ha-btn">其他统计</button>
        </div>
        <div id="diet-stats-content" class="ha-diet-stats-content">
          <p class="ha-diet-stats-empty">请选择一个统计类型</p>
        </div>
      `;
      
      document.body.appendChild(statsModal);
      
      statsModal.querySelector('#close-diet-stats').addEventListener('click', () => {
        statsModal.style.display = 'none';
      });
      
      function showStatsList(mealType, mealName) {
        const entries = getLocalStorageEntries(mealType);
        const contentDiv = statsModal.querySelector('#diet-stats-content');
        
        if (entries.length === 0) {
          contentDiv.innerHTML = `<p class="ha-diet-stats-empty">暂无${mealName}记录</p>`;
          return;
        }
        
        let html = `<div class="ha-diet-stats-list-title">${mealName}记录 (共${entries.length}条)</div>`;
        
        entries.forEach(entry => {
          const tsDisplay = formatLocalTime(entry.ts);
          const enabledClass = entry.enabled ? 'enabled' : 'disabled';
          const badgeClass = entry.enabled ? 'ha-diet-record-badge-enabled' : 'ha-diet-record-badge-disabled';
          const statusText = entry.enabled ? '[已启用]' : '[未启用]';
          
          html += `
            <div class="ha-diet-record-item ${enabledClass}">
              <div class="ha-diet-record-time">
                ${tsDisplay} <span class="${badgeClass}">${statusText}</span>
              </div>
              <div class="ha-diet-record-text">${entry.text}</div>
              <div class="ha-diet-record-actions">
                <button class="edit-entry ha-btn ha-diet-record-btn" data-index="${entry.index}">编辑</button>
                ${entry.enabled 
                  ? `<button class="disable-entry ha-btn ha-diet-record-btn" data-index="${entry.index}">取消启用</button>`
                  : `<button class="enable-entry ha-btn ha-diet-record-btn" data-index="${entry.index}">启用</button>`
                }
                <button class="delete-entry ha-btn ha-diet-record-btn ha-diet-record-btn-delete" data-index="${entry.index}">删除</button>
              </div>
            </div>
          `;
        });
        
        contentDiv.innerHTML = html;
        
        // 编辑按钮
        contentDiv.querySelectorAll('.edit-entry').forEach(btn => {
          btn.addEventListener('click', async () => {
            const index = parseInt(btn.dataset.index);
            const entry = entries.find(e => e.index === index);
            
            const newText = prompt('编辑记录内容:', entry.text);
            if (!newText) return;
            
            let defaultTime;
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            
            switch(entry.meal) {
              case 'breakfast':
                defaultTime = `${year}-${month}-${day}T07:00`;
                break;
              case 'lunch':
                defaultTime = `${year}-${month}-${day}T12:00`;
                break;
              case 'dinner':
                defaultTime = `${year}-${month}-${day}T17:00`;
                break;
              default:
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                defaultTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
            
            const timeInput = prompt('编辑时间 (格式: YYYY-MM-DDTHH:MM, 例如 2025-11-16T07:00):', defaultTime);
            if (!timeInput) return;
            
            let newISOTimestamp;
            try {
              const parsedDate = new Date(timeInput);
              if (isNaN(parsedDate.getTime())) {
                toastr.error('时间格式错误,请使用格式: YYYY-MM-DDTHH:MM');
                return;
              }
              
              const year = parsedDate.getFullYear();
              const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
              const day = String(parsedDate.getDate()).padStart(2, '0');
              const hours = String(parsedDate.getHours()).padStart(2, '0');
              const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
              const seconds = String(parsedDate.getSeconds()).padStart(2, '0');
              
              const offset = -parsedDate.getTimezoneOffset();
              const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
              const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
              const offsetSign = offset >= 0 ? '+' : '-';
              
              newISOTimestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
            } catch (e) {
              toastr.error('时间格式错误: ' + e.message);
              return;
            }
            
            if (entry.enabled) {
              await deleteLineFromWorldInfo(entry.meal, entry.ts, entry.text);
            }
            
            const dietEntry = ctx.extensionSettings[MODULE_NAME].diet[index];
            if (typeof dietEntry === 'object') {
              dietEntry.text = newText;
              dietEntry.ts = newISOTimestamp;
            } else {
              ctx.extensionSettings[MODULE_NAME].diet[index] = {
                text: newText,
                meal: entry.meal,
                ts: newISOTimestamp,
                enabled: entry.enabled
              };
            }
            saveSettings();
            
            if (entry.enabled) {
              await appendToWorldInfoEntry(entry.meal, newISOTimestamp, newText);
            }
            
            toastr.success('编辑成功');
            showStatsList(mealType, mealName);
          });
        });
        
        // 删除按钮
        contentDiv.querySelectorAll('.delete-entry').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!confirm('确定要删除此条记录吗?')) return;
            
            const index = parseInt(btn.dataset.index);
            const entry = entries.find(e => e.index === index);
            
            if (entry.enabled) {
              const success = await deleteLineFromWorldInfo(entry.meal, entry.ts, entry.text);
              if (success) {
                toastr.success('已从世界书删除');
              }
            }
            
            deleteLocalStorageEntry(index);
            
            toastr.success('删除成功');
            showStatsList(mealType, mealName);
            renderLog();
          });
        });
        
        // 取消启用按钮
        contentDiv.querySelectorAll('.disable-entry').forEach(btn => {
          btn.addEventListener('click', async () => {
            const index = parseInt(btn.dataset.index);
            const entry = entries.find(e => e.index === index);
            
            const success = await deleteLineFromWorldInfo(entry.meal, entry.ts, entry.text);
            
            if (success) {
              updateLocalStorageEntryEnabled(index, false);
              toastr.success('已取消启用');
              showStatsList(mealType, mealName);
            } else {
              toastr.error('取消启用失败');
            }
          });
        });
        
        // 启用按钮
        contentDiv.querySelectorAll('.enable-entry').forEach(btn => {
          btn.addEventListener('click', async () => {
            const index = parseInt(btn.dataset.index);
            const entry = entries.find(e => e.index === index);
            
            await appendToWorldInfoEntry(entry.meal, entry.ts, entry.text);
            
            updateLocalStorageEntryEnabled(index, true);
            
            toastr.success('已启用并同步到世界书');
            showStatsList(mealType, mealName);
          });
        });
      }
      
      statsModal.querySelector('#stats-breakfast').addEventListener('click', () => {
        showStatsList('breakfast', '早餐');
      });
      
      statsModal.querySelector('#stats-lunch').addEventListener('click', () => {
        showStatsList('lunch', '午餐');
      });
      
      statsModal.querySelector('#stats-dinner').addEventListener('click', () => {
        showStatsList('dinner', '晚餐');
      });
      
      statsModal.querySelector('#stats-other').addEventListener('click', () => {
        showStatsList('other', '其他');
      });
    }
    
    statsModal.style.display = 'flex';
  });

  // ========== 定期清除功能 ==========
  
  // 定期清除按钮
  document.getElementById('ha-diet-auto-clean').addEventListener('click', () => {
    openAutoCleanPanel();
  });
  
  // 定期清除面板
  function openAutoCleanPanel() {
    const panel = document.createElement('div');
    panel.className = 'ha-sleep-records-overlay';
    
    // 读取当前配置
    const config = ctx.extensionSettings[MODULE_NAME].dietAutoClean || {
      days: 30,
      cleanLocalStorage: false,
      cleanWorldBook: false
    };
    
    panel.innerHTML = `
      <div class="ha-sleep-records-panel" style="max-width: 400px;">
        <div class="ha-sleep-records-title">定期清除设置</div>
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-size: 13px;">清除天数（保留最近N天）:</label>
          <input type="number" id="auto-clean-days" value="${config.days}" min="1" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
          <div style="font-size: 11px; color: #666; margin-top: 2px;">例如: 输入30表示保留最近30天的记录</div>
        </div>
        <div style="margin-bottom: 12px;">
          <button id="auto-clean-localstorage" class="ha-btn" style="width: 100%; margin-bottom: 6px; ${config.cleanLocalStorage ? 'background: #f44336; color: #fff;' : ''}">
            ${config.cleanLocalStorage ? '✓ ' : ''}清除 localStorage
          </button>
          <button id="auto-clean-worldbook" class="ha-btn" style="width: 100%; ${config.cleanWorldBook ? 'background: #f44336; color: #fff;' : ''}">
            ${config.cleanWorldBook ? '✓ ' : ''}清除世界书
          </button>
        </div>
        <div style="font-size: 12px; color: #666; padding: 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 12px;">
          <strong>说明:</strong> 每天04:00自动清除过期记录。如果04:00时浏览器未打开，则在扩展下次启动时执行清除。
        </div>
        <div class="ha-sleep-records-footer">
          <button id="auto-clean-save" class="ha-btn" style="background: #4CAF50; color: #fff;">保存设置</button>
          <button id="auto-clean-close" class="ha-btn" style="margin-left: 6px;">关闭</button>
        </div>
      </div>
    `;
    
    content.appendChild(panel);
    
    let cleanLocalStorage = config.cleanLocalStorage;
    let cleanWorldBook = config.cleanWorldBook;
    
    // 切换 localStorage 清除
    panel.querySelector('#auto-clean-localstorage').addEventListener('click', (e) => {
      cleanLocalStorage = !cleanLocalStorage;
      const btn = e.target;
      if (cleanLocalStorage) {
        btn.style.background = '#f44336';
        btn.style.color = '#fff';
        btn.textContent = '✓ 清除 localStorage';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '清除 localStorage';
      }
    });
    
    // 切换世界书清除
    panel.querySelector('#auto-clean-worldbook').addEventListener('click', (e) => {
      cleanWorldBook = !cleanWorldBook;
      const btn = e.target;
      if (cleanWorldBook) {
        btn.style.background = '#f44336';
        btn.style.color = '#fff';
        btn.textContent = '✓ 清除世界书';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '清除世界书';
      }
    });
    
    // 保存设置
    panel.querySelector('#auto-clean-save').addEventListener('click', () => {
      const days = parseInt(panel.querySelector('#auto-clean-days').value);
      if (isNaN(days) || days < 1) {
        toastr.warning('请输入有效的天数（至少为1）', '输入错误');
        return;
      }
      
      ctx.extensionSettings[MODULE_NAME].dietAutoClean = {
        days,
        cleanLocalStorage,
        cleanWorldBook,
        lastCleanDate: ctx.extensionSettings[MODULE_NAME].dietAutoClean?.lastCleanDate || null
      };
      saveSettings();
      toastr.success('定期清除设置已保存', '保存成功');
      panel.remove();
    });
    
    panel.querySelector('#auto-clean-close').onclick = () => panel.remove();
  }
  
  // 执行定期清除
  async function performAutoClean(daysToKeep) {
    const config = ctx.extensionSettings[MODULE_NAME].dietAutoClean;
    if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // 解析ISO日期字符串获取日期部分
    function parseISODate(isoString) {
      const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return null;
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    
    const records = ctx.extensionSettings[MODULE_NAME].diet || [];
    
    // 清除 localStorage
    if (config.cleanLocalStorage) {
      const filteredRecords = records.filter(rec => {
        const recDate = parseISODate(rec.ts);
        return recDate && recDate >= cutoffDate;
      });
      
      const removedCount = records.length - filteredRecords.length;
      if (removedCount > 0) {
        ctx.extensionSettings[MODULE_NAME].diet = filteredRecords;
        saveSettings();
        console.log(`[健康生活助手] 自动清除: 从 localStorage 删除了 ${removedCount} 条饮食记录`);
      }
    }
    
    // 清除世界书
    if (config.cleanWorldBook) {
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
          if (!entry.disable && (comment.includes('饮食') || entry.title === '饮食')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (!targetUID) return;
        
        // 获取当前启用的记录（已经是过滤后的）
        const currentRecords = ctx.extensionSettings[MODULE_NAME].diet || [];
        const enabledRecords = currentRecords.filter(rec => rec.enabled !== false);
        
        const newContent = enabledRecords.map(rec => {
          return `${rec.ts}:${rec.meal}:${rec.text}`;
        }).join('\n');
        
        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
        
        console.log('[健康生活助手] 自动清除: 已同步世界书');
      } catch (e) {
        console.error('[健康生活助手] 自动清除世界书失败:', e);
      }
    }
    
    // 更新最后清除日期
    config.lastCleanDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    saveSettings();
  }

  function renderLog() {
    const arr = ctx.extensionSettings[MODULE_NAME].diet || [];
    logEl.innerText = `已记录 ${arr.length} 条饮食记录（存储在扩展设置与世界书中）`;
  }

  renderLog();
  
 
}
















async function showMental() {
    // 生成带时区偏移的ISO格式时间戳
    function getISOWithTimezone(date = new Date()) {
        const offset = -date.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const absOffset = Math.abs(offset);
        const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
        const minutes = String(absOffset % 60).padStart(2, '0');
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const second = String(date.getSeconds()).padStart(2, '0');
        const ms = String(date.getMilliseconds()).padStart(3, '0');
        
        return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}${sign}${hours}:${minutes}`;
    }
    
   
        
    
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
            <button id="ha-mental-auto-clean" class="ha-btn" style="margin-bottom:6px">定期清除</button>
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
            
            const recLine = `${getISOWithTimezone()}:${contentText}`;
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
            enabled: entry.enabled !== false
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
            ctx.extensionSettings[MODULE_NAME][storageKey][index] = {
                text: entry,
                ts: getISOWithTimezone(),
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
                ts: getISOWithTimezone(),
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
            ts: getISOWithTimezone(),
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
            ts: getISOWithTimezone(),
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
            ts: getISOWithTimezone(),
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
                        const fullOldLine = `${entry.ts}:${entry.text}`;
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
                        const fullLine = `${entry.ts}:${entry.text}`;
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
                    const fullLine = `${entry.ts}:${entry.text}`;
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
    
    // === 定期清除按钮 ===
    document.getElementById('ha-mental-auto-clean').addEventListener('click', () => {
        openMentalAutoCleanPanel();
    });
    
    // 定期清除面板
    function openMentalAutoCleanPanel() {
        const panel = document.createElement('div');
        panel.className = 'ha-sleep-records-overlay';
        
        const config = ctx.extensionSettings[MODULE_NAME].mentalAutoClean || {
            days: 30,
            cleanLocalStorage: false,
            cleanWorldBook: false
        };
        
        panel.innerHTML = `
            <div class="ha-sleep-records-panel" style="max-width: 400px;">
                <div class="ha-sleep-records-title">定期清除设置</div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-size: 13px;">清除天数（保留最近N天）:</label>
                    <input type="number" id="mental-auto-clean-days" value="${config.days}" min="1" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
                    <div style="font-size: 11px; color: #666; margin-top: 2px;">例如: 输入30表示保留最近30天的记录</div>
                </div>
                <div style="margin-bottom: 12px;">
                    <button id="mental-auto-clean-localstorage" class="ha-btn" style="width: 100%; margin-bottom: 6px; ${config.cleanLocalStorage ? 'background: #f44336; color: #fff;' : ''}">
                        ${config.cleanLocalStorage ? '✓ ' : ''}清除 localStorage
                    </button>
                    <button id="mental-auto-clean-worldbook" class="ha-btn" style="width: 100%; ${config.cleanWorldBook ? 'background: #f44336; color: #fff;' : ''}">
                        ${config.cleanWorldBook ? '✓ ' : ''}清除世界书
                    </button>
                </div>
                <div style="font-size: 12px; color: #666; padding: 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 12px;">
                    <strong>说明:</strong> 每天04:00自动清除过期记录。如果04:00时浏览器未打开，则在扩展下次启动时执行清除。
                </div>
                <div class="ha-sleep-records-footer">
                    <button id="mental-auto-clean-save" class="ha-btn" style="background: #4CAF50; color: #fff;">保存设置</button>
                    <button id="mental-auto-clean-close" class="ha-btn" style="margin-left: 6px;">关闭</button>
                </div>
            </div>
        `;
        
        content.appendChild(panel);
        
        let cleanLocalStorage = config.cleanLocalStorage;
        let cleanWorldBook = config.cleanWorldBook;
        
        panel.querySelector('#mental-auto-clean-localstorage').addEventListener('click', (e) => {
            cleanLocalStorage = !cleanLocalStorage;
            const btn = e.target;
            if (cleanLocalStorage) {
                btn.style.background = '#f44336';
                btn.style.color = '#fff';
                btn.textContent = '✓ 清除 localStorage';
            } else {
                btn.style.background = '';
                btn.style.color = '';
                btn.textContent = '清除 localStorage';
            }
        });
        
        panel.querySelector('#mental-auto-clean-worldbook').addEventListener('click', (e) => {
            cleanWorldBook = !cleanWorldBook;
            const btn = e.target;
            if (cleanWorldBook) {
                btn.style.background = '#f44336';
                btn.style.color = '#fff';
                btn.textContent = '✓ 清除世界书';
            } else {
                btn.style.background = '';
                btn.style.color = '';
                btn.textContent = '清除世界书';
            }
        });
        
        panel.querySelector('#mental-auto-clean-save').addEventListener('click', () => {
            const days = parseInt(panel.querySelector('#mental-auto-clean-days').value);
            if (isNaN(days) || days < 1) {
                toastr.warning('请输入有效的天数（至少为1）', '输入错误');
                return;
            }
            
            ctx.extensionSettings[MODULE_NAME].mentalAutoClean = {
                days,
                cleanLocalStorage,
                cleanWorldBook,
                lastCleanDate: ctx.extensionSettings[MODULE_NAME].mentalAutoClean?.lastCleanDate || null
            };
            saveSettings();
            toastr.success('定期清除设置已保存', '保存成功');
            panel.remove();
        });
        
        panel.querySelector('#mental-auto-clean-close').onclick = () => panel.remove();
    }
    
    // 执行定期清除
    async function performMentalAutoClean(daysToKeep) {
        const config = ctx.extensionSettings[MODULE_NAME].mentalAutoClean;
        if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
            return;
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        function parseISODate(isoString) {
            const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (!match) return null;
            return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        }
        
        const storageKeys = ['mental', 'meditation', 'thoughtChains', 'confessions'];
        const keywords = ['心理', '冥想', '思维链', '忏悔'];
        
        for (let i = 0; i < storageKeys.length; i++) {
            const storageKey = storageKeys[i];
            const keyword = keywords[i];
            const records = ctx.extensionSettings[MODULE_NAME][storageKey] || [];
            
            if (config.cleanLocalStorage) {
                const filteredRecords = records.filter(rec => {
                    const recDate = parseISODate(rec.ts);
                    return recDate && recDate >= cutoffDate;
                });
                
                const removedCount = records.length - filteredRecords.length;
                if (removedCount > 0) {
                    ctx.extensionSettings[MODULE_NAME][storageKey] = filteredRecords;
                    console.log(`[健康生活助手] 自动清除: 从 localStorage/${storageKey} 删除了 ${removedCount} 条记录`);
                }
            }
            
            if (config.cleanWorldBook) {
                try {
                    const fileId = await findHealthWorldFile();
                    if (!fileId) continue;
                    
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
                    
                    if (!targetUID) continue;
                    
                    const currentRecords = ctx.extensionSettings[MODULE_NAME][storageKey] || [];
                    const enabledRecords = currentRecords.filter(rec => rec.enabled !== false);
                    
                    const newContent = enabledRecords.map(rec => {
                        return `${rec.ts}:${rec.text}`;
                    }).join('\n');
                    
                    await globalThis.SillyTavern.getContext()
                        .SlashCommandParser.commands['setentryfield']
                        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
                    
                    console.log(`[健康生活助手] 自动清除: 已同步世界书/${keyword}`);
                } catch (e) {
                    console.error(`[健康生活助手] 自动清除世界书/${keyword}失败:`, e);
                }
            }
        }
        
        config.lastCleanDate = new Date().toISOString().split('T')[0];
        saveSettings();
    }
    
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
        
        if (!ctx.extensionSettings[MODULE_NAME].meditation) {
            ctx.extensionSettings[MODULE_NAME].meditation = [];
        }
        
        const record = {
            text: `本次冥想 ${duration} 分钟`,
            ts: getISOWithTimezone(),
            enabled: true
        };
        ctx.extensionSettings[MODULE_NAME].meditation.push(record);
        saveSettings();
        
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
















    async function showExercise() {
  const container = content;
  container.style.display = 'block';
  
 
    
  
  container.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">适度运动</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-exercise-log" class="ha-btn" style="flex:1">运动打卡</button>
      <button id="ha-exercise-analysis" class="ha-btn" style="flex:1">运动分析(API)</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-exercise-records" class="ha-btn" style="flex:1">运动记录管理</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-exercise-auto-clean" class="ha-btn" style="flex:1">定期清除</button>
    </div>
    <div id="ha-exercise-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
    </div>
    <div id="ha-exercise-list" class="ha-small"></div>
  `;

  const listEl = document.getElementById('ha-exercise-list');
  const subPanel = document.getElementById('ha-exercise-subpanel');

  // 时区转换辅助函数：将ISO时间转换为本地时区的ISO格式显示
  function toLocalISOString(isoString) {
    try {
      const date = new Date(isoString);
      // 获取本地时区偏移量（分钟）
      const offset = date.getTimezoneOffset();
      // 创建本地时间的Date对象
      const localDate = new Date(date.getTime() - offset * 60000);
      // 转换为ISO格式，但保留本地时间值
      return localDate.toISOString().slice(0, -1) + getTimezoneString();
    } catch (e) {
      return isoString; // 如果转换失败，返回原始值
    }
  }

  // 获取时区字符串，如 +08:00 或 -07:00
  function getTimezoneString() {
    const offset = -new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      console.log('[健康生活助手] selected_world_info:', selected);
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          toastr.info('匹配到世界书文件: ' + WI, '世界书');
          return WI;
        }
      }
      toastr.warning('未找到名为 "健康生活助手" 的世界书文件', '世界书');
      return null;
    } catch (e) {
      toastr.error('查找世界书文件异常: ' + (e.message || e), '错误');
      return null;
    }
  }

  async function appendToWorldInfoExerciseLog(contentText, isoTime) {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) { 
        toastr.warning('未找到世界书文件，跳过写入', '写入世界书'); 
        return; 
      }

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};

      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('运动') || entry.title === '运动')) {
          targetUID = entry.uid;
          break;
        }
      }

      if (!targetUID) {
        toastr.warning('未找到运动 entry（未创建），写入被跳过', '世界书');
        return;
      }

      const recLine = `运动记录 @ ${isoTime}：${contentText}`;
      const existing = entries[targetUID].content || '';
      const newContent = existing + (existing ? '\n' : '') + recLine;

      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);

      toastr.success('已写入世界书: ' + recLine, '写入成功');
    } catch (e) {
      toastr.error('写入世界书失败: ' + (e.message || e), '错误');
    }
  }

  function recordExercise() {
    const txt = prompt('记录运动（例如：跑步 30 分钟 / 徒步 5km）：','');
    if (!txt) return;
    const now = new Date();
    const isoTime = now.toISOString();
    const localISOTime = toLocalISOString(isoTime);
    const rec = {
      text: txt,
      ts: isoTime,
      enabled: true
    };
    ctx.extensionSettings[MODULE_NAME].exercise.push(rec);
    saveSettings();
    toastr.success(`运动已记录：\n${txt}\n本地时间：${localISOTime}`, '打卡成功');
    renderList();
    appendToWorldInfoExerciseLog(txt, localISOTime);
  }

  document.getElementById('ha-exercise-log').addEventListener('click', recordExercise);

  document.getElementById('ha-exercise-analysis').addEventListener('click', async () => {
    subPanel.innerText = '正在分析运动数据...';
    subPanel.scrollTop = subPanel.scrollHeight;

    try {
      const api = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
      if (!api.url) {
        subPanel.innerText = '未配置独立 API，示例提示：保持每周适度运动，注意热身与拉伸。';
        subPanel.scrollTop = subPanel.scrollHeight;
        toastr.info('未配置 API，显示默认提示', '运动分析');
        return;
      }

      const endpoint = api.url.replace(/\/$/, '') + '/v1/chat/completions';
      toastr.info('正在请求运动分析...', 'API 调用');

      const enabledExercises = (ctx.extensionSettings[MODULE_NAME].exercise || [])
        .filter(e => e.enabled !== false);
      const history = enabledExercises.map(e => `${e.ts}：${e.text}`).join('\n');
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

      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
      subPanel.innerText = text;
      subPanel.scrollTop = subPanel.scrollHeight;
      toastr.success('运动分析已生成', 'API 调用成功');
    } catch (e) {
      subPanel.innerText = 'API 请求失败：' + (e.message || e);
      subPanel.scrollTop = subPanel.scrollHeight;
      toastr.error('运动分析调用失败: ' + (e.message || e), 'API 错误');
    }
  });

  // 运动记录管理按钮
  document.getElementById('ha-exercise-records').addEventListener('click', () => {
    openExerciseRecordsManager();
  });

  // 定期清除按钮
  document.getElementById('ha-exercise-auto-clean').addEventListener('click', () => {
    openAutoCleanPanel();
  });

  // 运动记录管理面板
  function openExerciseRecordsManager() {
    const panel = document.createElement('div');
    panel.className = 'ha-sleep-records-overlay';
    
    panel.innerHTML = `
      <div class="ha-sleep-records-panel">
        <div class="ha-sleep-records-title">运动记录管理</div>
        <div id="exercise-records-list" class="ha-sleep-records-list"></div>
        <div class="ha-sleep-records-footer">
          <button id="exercise-records-close" class="ha-btn">关闭</button>
        </div>
      </div>
    `;
    
    container.appendChild(panel);
    
    // 渲染记录列表
    renderRecordsList();
    
    function renderRecordsList() {
      const listEl = panel.querySelector('#exercise-records-list');
      const records = ctx.extensionSettings[MODULE_NAME].exercise || [];
      
      if (records.length === 0) {
        listEl.innerHTML = '<div class="ha-sleep-records-empty">暂无运动记录</div>';
        return;
      }
      
      listEl.innerHTML = records.map((rec, index) => {
        const enabledStatus = rec.enabled !== false;
        const statusText = enabledStatus ? '已启用' : '未启用';
        const statusClass = enabledStatus ? 'enabled' : 'disabled';
        
        // 将UTC的ISO时间转换为本地时区的ISO格式显示
        const localISOTime = toLocalISOString(rec.ts);
        
        return `
          <div class="ha-sleep-record-item">
            <div class="ha-sleep-record-content">
              <div class="ha-sleep-record-info">
                <div class="ha-sleep-record-main">${rec.text}</div>
                <div class="ha-sleep-record-time">本地时间: ${localISOTime}</div>
                <div class="ha-sleep-record-status ${statusClass}">${statusText}</div>
              </div>
              <div class="ha-sleep-record-actions">
                <button class="ha-btn ha-sleep-record-btn edit-record" data-index="${index}">
                  编辑
                </button>
                <button class="ha-btn ha-sleep-record-btn toggle-record" data-index="${index}">
                  ${enabledStatus ? '禁用' : '启用'}
                </button>
                <button class="ha-btn ha-sleep-record-btn delete" data-index="${index}">
                  删除
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      // 绑定编辑按钮事件
      listEl.querySelectorAll('.edit-record').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.getAttribute('data-index'));
          editRecord(index);
        });
      });
      
      // 绑定删除按钮事件
      listEl.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const index = parseInt(btn.getAttribute('data-index'));
          await deleteRecord(index);
          renderRecordsList();
        });
      });
      
      // 绑定启用/禁用按钮事件
      listEl.querySelectorAll('.toggle-record').forEach(btn => {
        btn.addEventListener('click', async () => {
          const index = parseInt(btn.getAttribute('data-index'));
          await toggleRecord(index);
          renderRecordsList();
        });
      });
    }

    // 编辑记录
    function editRecord(index) {
      const records = ctx.extensionSettings[MODULE_NAME].exercise || [];
      const record = records[index];
      
      if (!record) {
        toastr.warning('记录不存在', '编辑失败');
        return;
      }

      const editDialog = document.createElement('div');
      editDialog.className = 'ha-manual-time-overlay';
      
      // 将UTC时间转换为本地时间用于编辑
      const existingDate = new Date(record.ts);
      // 使用本地时间的年月日和时分
      const year = existingDate.getFullYear();
      const month = String(existingDate.getMonth() + 1).padStart(2, '0');
      const day = String(existingDate.getDate()).padStart(2, '0');
      const hours = String(existingDate.getHours()).padStart(2, '0');
      const minutes = String(existingDate.getMinutes()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const timeStr = `${hours}:${minutes}`;
      
      editDialog.innerHTML = `
        <div class="ha-manual-time-panel">
          <div class="ha-manual-time-title">编辑运动记录</div>
          <label class="ha-manual-time-label">运动内容:</label><br>
          <input id="edit-exercise-text" type="text" class="ha-manual-time-input" value="${record.text}" style="width:100%;margin-bottom:10px;"><br>
          <label class="ha-manual-time-label">日期 (本地时区):</label><br>
          <input id="edit-exercise-date" type="date" class="ha-manual-time-input" value="${dateStr}"><br>
          <label class="ha-manual-time-label">时间 (本地时区):</label><br>
          <input id="edit-exercise-time" type="time" class="ha-manual-time-input" value="${timeStr}"><br>
          <div class="ha-manual-time-footer">
            <button id="edit-exercise-ok" class="ha-btn">保存</button>
            <button id="edit-exercise-cancel" class="ha-btn" style="margin-left:6px;">取消</button>
          </div>
        </div>
      `;
      
      container.appendChild(editDialog);
      
      editDialog.querySelector('#edit-exercise-cancel').onclick = () => editDialog.remove();
      editDialog.querySelector('#edit-exercise-ok').onclick = async () => {
        const newText = editDialog.querySelector('#edit-exercise-text').value.trim();
        const date = editDialog.querySelector('#edit-exercise-date').value;
        const time = editDialog.querySelector('#edit-exercise-time').value;
        
        if (!newText) {
          toastr.warning('请输入运动内容', '输入不完整');
          return;
        }
        
        if (!date || !time) {
          toastr.warning('请选择完整的日期和时间', '输入不完整');
          return;
        }
        
        // 创建本地时间的Date对象，然后转换为UTC的ISO格式
        const selectedDateTime = new Date(`${date}T${time}`);
        
        if (isNaN(selectedDateTime.getTime())) {
          toastr.error('无效的日期时间', '错误');
          return;
        }
        
        // 更新记录 - 存储UTC时间
        record.text = newText;
        record.ts = selectedDateTime.toISOString();
        saveSettings();
        
        // 同步到世界书
        await syncToWorldInfo();
        
        const localISOTime = toLocalISOString(record.ts);
        toastr.success(`运动记录已更新\n本地时间：${localISOTime}`, '编辑成功');
        renderRecordsList();
        renderList();
        editDialog.remove();
      };
    }
    
    // 删除记录（同时从localStorage和世界书删除）
    async function deleteRecord(index) {
      const records = ctx.extensionSettings[MODULE_NAME].exercise || [];
      const record = records[index];
      
      if (!record) {
        toastr.warning('记录不存在', '删除失败');
        return;
      }
      
      // 从localStorage删除
      records.splice(index, 1);
      saveSettings();
      
      // 从世界书删除
      await syncToWorldInfo();
      
      toastr.success('记录已删除', '删除成功');
      renderList();
    }
    
    // 切换启用状态
    async function toggleRecord(index) {
      const records = ctx.extensionSettings[MODULE_NAME].exercise || [];
      const record = records[index];
      
      if (!record) {
        toastr.warning('记录不存在', '操作失败');
        return;
      }
      
      // 切换启用状态
      record.enabled = !(record.enabled !== false);
      saveSettings();
      
      // 同步到世界书
      await syncToWorldInfo();
      
      const statusText = record.enabled ? '已启用' : '已禁用';
      toastr.success(`记录${statusText}`, '操作成功');
      renderList();
    }
    
    // 同步所有启用的记录到世界书
    async function syncToWorldInfo() {
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
          if (!entry.disable && (comment.includes('运动') || entry.title === '运动')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (!targetUID) {
          toastr.warning('未找到运动条目', '同步失败');
          return;
        }
        
        // 只包含启用的记录
        const records = ctx.extensionSettings[MODULE_NAME].exercise || [];
        const enabledRecords = records.filter(rec => rec.enabled !== false);
        
        const newContent = enabledRecords.map(rec => {
          // 将UTC时间转换为本地时区ISO格式
          const localISOTime = toLocalISOString(rec.ts);
          return `运动记录 @ ${localISOTime}：${rec.text}`;
        }).join('\n');
        
        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
        
      } catch (e) {
        console.error('同步到世界书失败:', e);
      }
    }
    
    panel.querySelector('#exercise-records-close').onclick = () => panel.remove();
  }

  // 定期清除面板
  function openAutoCleanPanel() {
    const panel = document.createElement('div');
    panel.className = 'ha-sleep-records-overlay';
    
    // 读取当前配置
    const config = ctx.extensionSettings[MODULE_NAME].exerciseAutoClean || {
      days: 30,
      cleanLocalStorage: false,
      cleanWorldBook: false
    };
    
    panel.innerHTML = `
      <div class="ha-sleep-records-panel" style="max-width: 400px;">
        <div class="ha-sleep-records-title">定期清除设置</div>
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-size: 13px;">清除天数（保留最近N天）:</label>
          <input type="number" id="auto-clean-days" value="${config.days}" min="1" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
          <div style="font-size: 11px; color: #666; margin-top: 2px;">例如: 输入30表示保留最近30天的记录</div>
        </div>
        <div style="margin-bottom: 12px;">
          <button id="auto-clean-localstorage" class="ha-btn" style="width: 100%; margin-bottom: 6px; ${config.cleanLocalStorage ? 'background: #f44336; color: #fff;' : ''}">
            ${config.cleanLocalStorage ? '✓ ' : ''}清除 localStorage
          </button>
          <button id="auto-clean-worldbook" class="ha-btn" style="width: 100%; ${config.cleanWorldBook ? 'background: #f44336; color: #fff;' : ''}">
            ${config.cleanWorldBook ? '✓ ' : ''}清除世界书
          </button>
        </div>
        <div style="font-size: 12px; color: #666; padding: 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 12px;">
          <strong>说明:</strong> 每天04:00自动清除过期记录。如果04:00时浏览器未打开，则在扩展下次启动时执行清除。
        </div>
        <div class="ha-sleep-records-footer">
          <button id="auto-clean-save" class="ha-btn" style="background: #4CAF50; color: #fff;">保存设置</button>
          <button id="auto-clean-close" class="ha-btn" style="margin-left: 6px;">关闭</button>
        </div>
      </div>
    `;
    
    container.appendChild(panel);
    
    let cleanLocalStorage = config.cleanLocalStorage;
    let cleanWorldBook = config.cleanWorldBook;
    
    // 切换 localStorage 清除
    panel.querySelector('#auto-clean-localstorage').addEventListener('click', (e) => {
      cleanLocalStorage = !cleanLocalStorage;
      const btn = e.target;
      if (cleanLocalStorage) {
        btn.style.background = '#f44336';
        btn.style.color = '#fff';
        btn.textContent = '✓ 清除 localStorage';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '清除 localStorage';
      }
    });
    
    // 切换世界书清除
    panel.querySelector('#auto-clean-worldbook').addEventListener('click', (e) => {
      cleanWorldBook = !cleanWorldBook;
      const btn = e.target;
      if (cleanWorldBook) {
        btn.style.background = '#f44336';
        btn.style.color = '#fff';
        btn.textContent = '✓ 清除世界书';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '清除世界书';
      }
    });
    
    // 保存设置
    panel.querySelector('#auto-clean-save').addEventListener('click', () => {
      const days = parseInt(panel.querySelector('#auto-clean-days').value);
      if (isNaN(days) || days < 1) {
        toastr.warning('请输入有效的天数（至少为1）', '输入错误');
        return;
      }
      
      ctx.extensionSettings[MODULE_NAME].exerciseAutoClean = {
        days,
        cleanLocalStorage,
        cleanWorldBook,
        lastCleanDate: ctx.extensionSettings[MODULE_NAME].exerciseAutoClean?.lastCleanDate || null
      };
      saveSettings();
      toastr.success('定期清除设置已保存', '保存成功');
      panel.remove();
    });
    
    panel.querySelector('#auto-clean-close').onclick = () => panel.remove();
  }

  // 执行定期清除（从指定日期之前的记录）
  async function performAutoClean(daysToKeep) {
    const config = ctx.extensionSettings[MODULE_NAME].exerciseAutoClean;
    if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
      return; // 未配置或都未启用
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // 解析ISO日期字符串获取日期部分
    function parseISODate(isoString) {
      const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return null;
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    
    const records = ctx.extensionSettings[MODULE_NAME].exercise || [];
    
    // 清除 localStorage
    if (config.cleanLocalStorage) {
      const filteredRecords = records.filter(rec => {
        const recDate = parseISODate(rec.ts);
        return recDate && recDate >= cutoffDate;
      });
      
      const removedCount = records.length - filteredRecords.length;
      if (removedCount > 0) {
        ctx.extensionSettings[MODULE_NAME].exercise = filteredRecords;
        saveSettings();
        console.log(`[健康生活助手] 自动清除: 从 localStorage 删除了 ${removedCount} 条运动记录`);
      }
    }
    
    // 清除世界书
    if (config.cleanWorldBook) {
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
          if (!entry.disable && (comment.includes('运动') || entry.title === '运动')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (!targetUID) return;
        
        // 获取当前启用的记录（已经是过滤后的）
        const currentRecords = ctx.extensionSettings[MODULE_NAME].exercise || [];
        const enabledRecords = currentRecords.filter(rec => rec.enabled !== false);
        
        const newContent = enabledRecords.map(rec => {
          const localISOTime = toLocalISOString(rec.ts);
          return `运动记录 @ ${localISOTime}：${rec.text}`;
        }).join('\n');
        
        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
        
        console.log('[健康生活助手] 自动清除: 已同步世界书');
      } catch (e) {
        console.error('[健康生活助手] 自动清除世界书失败:', e);
      }
    }
    
    // 更新最后清除日期
    config.lastCleanDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    saveSettings();
  }

  function renderList() {
    const arr = ctx.extensionSettings[MODULE_NAME].exercise || [];
    listEl.innerText = `已记录 ${arr.length} 条运动日志（存储在扩展设置与世界书中）`;
  }

  renderList();
  
  
}













async function showFinance() {
  // 辅助函数：生成带时区偏移的 ISO 格式时间
  function getISOWithOffset() {
    const now = new Date();
    const offset = -now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
    const offsetMinutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
    const offsetSign = offset >= 0 ? '+' : '-';
    return now.getFullYear() + '-' +
      (now.getMonth() + 1).toString().padStart(2, '0') + '-' +
      now.getDate().toString().padStart(2, '0') + 'T' +
      now.getHours().toString().padStart(2, '0') + ':' +
      now.getMinutes().toString().padStart(2, '0') + ':' +
      now.getSeconds().toString().padStart(2, '0') + '.' +
      now.getMilliseconds().toString().padStart(3, '0') +
      offsetSign + offsetHours + ':' + offsetMinutes;
  }

  const container = content;
  container.style.display = 'block';
  container.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">收支平衡</div>

    <!-- 收入标签 -->
    <div style="margin-bottom:12px;">
      <div style="font-weight:600;margin-bottom:6px;">收入标签</div>
      <div style="display:flex;gap:6px;margin-bottom:4px;">
        <input id="ha-income-input" placeholder="输入新收入标签" style="width:120px;margin-right:4px;padding:2px;font-size:12px;">
        <button id="ha-income-add" class="ha-btn" style="width:50px;padding:6px;border-radius:4px;">➕</button>
        <button id="ha-income-edit" class="ha-btn" style="width:50px;padding:6px;border-radius:4px;">✏️</button>
        <button id="ha-income-del" class="ha-btn" style="width:50px;padding:6px;border-radius:4px;">🗑️</button>
      </div>
      <div id="ha-income-tags" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
    </div>

    <!-- 支出标签 -->
    <div style="margin-bottom:12px;">
      <div style="font-weight:600;margin-bottom:6px;">支出标签</div>
      <div style="display:flex;gap:6px;margin-bottom:4px;">
        <input id="ha-expense-input" placeholder="输入新支出标签" style="width:120px;margin-right:4px;padding:2px;font-size:12px;">
        <button id="ha-expense-add" class="ha-btn" style="flex:1;padding:6px;border-radius:4px;">➕</button>
        <button id="ha-expense-edit" class="ha-btn" style="flex:1;padding:6px;border-radius:4px;">✏️</button>
        <button id="ha-expense-del" class="ha-btn" style="flex:1;padding:6px;border-radius:4px;">🗑️</button>
        <button id="ha-budget-btn" class="ha-btn" style="flex:1;padding:6px;border-radius:4px;">预算</button>
      </div>
      <div id="ha-expense-tags" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
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

    <!-- 定期清除按钮 -->
    <div style="display:flex;gap:8px;margin-bottom:6px;">
      <button id="ha-finance-auto-clean" class="ha-btn" style="flex:1;">定期清除</button>
    </div>

    <!-- 输出区 -->
    <div id="ha-finance-result" style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#fafafa;white-space:pre-wrap;min-height:60px;max-height:300px;overflow:auto;"></div>
  `;

  const state = ctx.extensionSettings[MODULE_NAME];
  if (!state.finance) {
    state.finance = { incomeTags: [], expenseTags: [], records: [], budgets: {} };
    saveSettings();
  }
  
  // 确保budgets对象存在
  if (!state.finance.budgets) {
    state.finance.budgets = {};
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
  let editMode = { income: false, expense: false };
  let budgetMode = false;

  // 🔍 查找世界书文件
  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) return WI;
      }
      toastr.warning('未找到 "健康生活助手" 世界书');
      return null;
    } catch (e) {
      toastr.error('查找世界书异常: ' + e.message);
      return null;
    }
  }

  // 🧾 写入世界书 - 收入/支出明细
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
        if (!entry.disable) {
          if (entry.comment === '收入') incomeUID = entry.uid;
          if (entry.comment === '支出') expenseUID = entry.uid;
        }
      }

      if (!incomeUID && !expenseUID) {
        toastr.info('未找到 "收入/支出" 条目，请在世界书中创建。');
        return;
      }

      const all = ctx.extensionSettings[MODULE_NAME].finance.records || [];
      const incomeList = all.filter(r => r.type === 'income').map((r,i)=>
        `${i+1}. ${r.date} ${r.tag}${r.name?`(${r.name})`:''}：${r.value}元`
      );
      const expenseList = all.filter(r => r.type === 'expense').map((r,i)=>
        `${i+1}. ${r.date} ${r.tag}${r.name?`(${r.name})`:''}：${r.value}元`
      );

      const ctxObj = globalThis.SillyTavern.getContext();
      const setField = ctxObj.SlashCommandParser.commands['setentryfield'].callback;

      if (incomeUID)
        await setField({file:fileId, uid:incomeUID, field:'content'}, incomeList.join('\n'));
      if (expenseUID)
        await setField({file:fileId, uid:expenseUID, field:'content'}, expenseList.join('\n'));

      toastr.success('世界书明细已同步 ✅');
    } catch (e) {
      toastr.error('写入世界书失败：' + e.message);
    }
  }

  // 📊 同步收入分析到世界书
  async function syncIncomeAnalysis() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return;

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};

      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        if (!entry.disable && entry.comment === '收入分析') {
          targetUID = entry.uid;
          break;
        }
      }

      if (!targetUID) {
        toastr.error('[收支平衡] 未找到"收入分析"条目，跳过同步');
        return;
      }

      const monthRecords = finance.records.filter(r => r.type === 'income' && r.date.substring(0, 7) === ym);
      const byTag = {};
      monthRecords.forEach(r => (byTag[r.tag] = (byTag[r.tag] || 0) + r.value));
      const sorted = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
      
      // 计算总收入
      const totalIncome = sorted.reduce((sum, [, v]) => sum + v, 0);
      
      // 计算所有配置的预算总和
      const totalBudget = Object.values(finance.budgets).reduce((sum, budget) => sum + budget, 0);
      
      // 计算剩余可支配预算
      const remainingBudget = totalIncome - totalBudget;
      
      let analysisText = '当月收入分析：\n' + sorted.map(([t, v]) => `${t}: ${v.toFixed(2)}元`).join('\n');
      analysisText += `\n\n总收入: ${totalIncome.toFixed(2)}元`;
      analysisText += `\n已配置预算: ${totalBudget.toFixed(2)}元`;
      analysisText += `\n剩余可支配预算: ${remainingBudget.toFixed(2)}元`;

      const ctxObj = globalThis.SillyTavern.getContext();
      const setField = ctxObj.SlashCommandParser.commands['setentryfield'].callback;
      await setField({file:fileId, uid:targetUID, field:'content'},analysisText);

      console.log('[收支平衡] 收入分析已同步');
    } catch (e) {
      toastr.error('[收支平衡] 同步收入分析失败:', e);
    }
  }

  // 📊 同步支出分析到世界书（包含预算信息）
  async function syncExpenseAnalysis() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return;

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};

      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        if (!entry.disable && entry.comment === '支出分析') {
          targetUID = entry.uid;
          break;
        }
      }

      if (!targetUID) {
        toastr.error('[收支平衡] 未找到"支出分析"条目，跳过同步');
        return;
      }

      const monthRecords = finance.records.filter(r => r.type === 'expense' && r.date.substring(0, 7) === ym);
      const byTag = {};
      monthRecords.forEach(r => (byTag[r.tag] = (byTag[r.tag] || 0) + r.value));
      const sorted = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
      
      // 添加预算信息
      let analysisText = '当月支出分析：\n';
      sorted.forEach(([tag, value]) => {
        const budget = finance.budgets[tag] || 0;
        if (budget > 0) {
          const percentage = (value / budget * 100).toFixed(1);
          const remaining = budget - value;
          analysisText += `${tag}: ${value.toFixed(2)}元 (预算: ${budget}元, 已用: ${percentage}%, 剩余: ${remaining.toFixed(2)}元)\n`;
        } else {
          analysisText += `${tag}: ${value.toFixed(2)}元 (未设置预算)\n`;
        }
      });

      const ctxObj = globalThis.SillyTavern.getContext();
      const setField = ctxObj.SlashCommandParser.commands['setentryfield'].callback;
      await setField({file:fileId, uid:targetUID, field:'content'}, analysisText);

      console.log('[收支平衡] 支出分析已同步');
    } catch (e) {
      toastr.error('[收支平衡] 同步支出分析失败:', e);
    }
  }

  // 同步所有财务数据到世界书
  async function syncAllFinanceData() {
    await appendToWorldInfoFinance();
    await syncIncomeAnalysis();
    await syncExpenseAnalysis();
  }

  // 计算标签颜色（基于预算使用情况）
  function getTagColor(tag, type) {
    if (type !== 'expense') return '#e0e0e0';
    
    const budget = finance.budgets[tag] || 0;
    if (budget === 0) return '#e0e0e0'; // 未设置预算
    
    const monthRecords = finance.records.filter(r => 
      r.type === 'expense' && 
      r.tag === tag && 
      r.date.substring(0, 7) === ym
    );
    const used = monthRecords.reduce((sum, r) => sum + r.value, 0);
    const percentage = (used / budget) * 100;
    
    if (percentage > 100) return '#e0e0e0'; // 超出预算 - 浅灰色
    if (percentage > 80) return '#ffcdd2'; // 80-100% - 浅红色
    if (percentage > 60) return '#fff9c4'; // 40-60% - 浅黄色
    if (percentage > 20) return '#b3e5fc'; // 60-80% - 浅蓝色
    return '#c8e6c9'; // 80-100% - 浅绿色
  }

  // 渲染标签
  function renderTags() {
    incomeEl.innerHTML = '';
    expenseEl.innerHTML = '';
    
    finance.incomeTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'ha-btn';
      btn.textContent = tag;
      btn.style.background = getTagColor(tag, 'income');
      btn.style.padding = '4px 8px';
      btn.style.fontSize = '12px';
      
      btn.addEventListener('click', () => {
        if (editMode.income) {
          editTag('income', tag);
        } else if (delMode.income) {
          if (confirm(`确认删除收入标签 "${tag}"？`)) {
            finance.incomeTags = finance.incomeTags.filter(t => t !== tag);
            saveSettings();
            renderTags();
            toastr.success('已删除收入标签');
          }
        } else {
          openRecordDialog('income', tag);
        }
      });
      incomeEl.appendChild(btn);
    });
    
    finance.expenseTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'ha-btn';
      btn.textContent = tag;
      btn.style.background = getTagColor(tag, 'expense');
      btn.style.padding = '4px 8px';
      btn.style.fontSize = '12px';
      
      btn.addEventListener('click', () => {
        if (editMode.expense) {
          editTag('expense', tag);
        } else if (delMode.expense) {
          if (confirm(`确认删除支出标签 "${tag}"？`)) {
            finance.expenseTags = finance.expenseTags.filter(t => t !== tag);
            // 同时删除该标签的预算
            delete finance.budgets[tag];
            saveSettings();
            renderTags();
            toastr.success('已删除支出标签及其预算');
          }
        } else if (budgetMode) {
          openBudgetDialog(tag);
        } else {
          openRecordDialog('expense', tag);
        }
      });
      expenseEl.appendChild(btn);
    });
  }

  // 编辑标签函数
  async function editTag(type, oldTag) {
    const newTag = prompt(`修改标签名称：`, oldTag);
    if (!newTag || newTag === oldTag) return;
    
    if (type === 'income') {
      // 检查是否重名
      if (finance.incomeTags.includes(newTag)) {
        return toastr.warning('标签名称已存在');
      }
      
      // 更新localStorage中的标签
      const idx = finance.incomeTags.indexOf(oldTag);
      if (idx !== -1) {
        finance.incomeTags[idx] = newTag;
      }
      
      // 更新所有记录中的标签
      finance.records.forEach(r => {
        if (r.type === 'income' && r.tag === oldTag) {
          r.tag = newTag;
        }
      });
    } else {
      // 检查是否重名
      if (finance.expenseTags.includes(newTag)) {
        return toastr.warning('标签名称已存在');
      }
      
      // 更新localStorage中的标签
      const idx = finance.expenseTags.indexOf(oldTag);
      if (idx !== -1) {
        finance.expenseTags[idx] = newTag;
      }
      
      // 更新预算
      if (finance.budgets[oldTag]) {
        finance.budgets[newTag] = finance.budgets[oldTag];
        delete finance.budgets[oldTag];
      }
      
      // 更新所有记录中的标签
      finance.records.forEach(r => {
        if (r.type === 'expense' && r.tag === oldTag) {
          r.tag = newTag;
        }
      });
    }
    
    saveSettings();
    
    // 同步到世界书
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) {
        renderTags();
        toastr.success('标签已更新（未找到世界书）');
        return;
      }

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};

      // 找到对应的条目
      let targetUID = null;
      const targetComment = type === 'income' ? '收入' : '支出';
      
      for (const id in entries) {
        const entry = entries[id];
        if (!entry.disable && entry.comment === targetComment) {
          targetUID = entry.uid;
          break;
        }
      }

      if (targetUID) {
        // 更新世界书内容
        const typeRecords = finance.records.filter(r => r.type === type);
        const updatedContent = typeRecords.map((r,i)=>
          `${i+1}. ${r.date} ${r.tag}${r.name?`(${r.name})`:''}：${r.value}元`
        ).join('\n');
        
        const ctxObj = globalThis.SillyTavern.getContext();
        const setField = ctxObj.SlashCommandParser.commands['setentryfield'].callback;
        await setField({file:fileId, uid:targetUID, field:'content'}, updatedContent);
      }
      
      // 同步分析
      await syncAllFinanceData();
      
      renderTags();
      toastr.success(`标签已更新：${oldTag} → ${newTag}`);
    } catch (e) {
      renderTags();
      toastr.error('更新世界书失败：' + e.message);
    }
  }

  // 打开预算设置对话框
  function openBudgetDialog(tag) {
    const currentBudget = finance.budgets[tag] || 0;
    const monthRecords = finance.records.filter(r => 
      r.type === 'expense' && 
      r.tag === tag && 
      r.date.substring(0, 7) === ym
    );
    const used = monthRecords.reduce((sum, r) => sum + r.value, 0);
    
    const overlay = document.createElement('div');
    overlay.className = 'ha-sleep-records-overlay';
    overlay.innerHTML = `
      <div class="ha-sleep-records-panel" style="max-width: 400px;">
        <div class="ha-sleep-records-title">预算设置 - ${tag}</div>
        <div style="margin-bottom: 12px;">
          <div style="margin-bottom: 8px;">
            <strong>当前预算：</strong>${currentBudget}元
          </div>
          <div style="margin-bottom: 8px;">
            <strong>已使用：</strong>${used.toFixed(2)}元 (${currentBudget > 0 ? (used/currentBudget*100).toFixed(1) : 0}%)
          </div>
          <div style="margin-bottom: 8px;">
            <strong>剩余预算：</strong>${(currentBudget - used).toFixed(2)}元
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-size: 13px;">设置月度预算（元）:</label>
          <input type="number" id="budget-input" value="${currentBudget}" min="0" step="0.01" 
                 style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div class="ha-sleep-records-footer">
          <button id="budget-save" class="ha-btn" style="background: #4CAF50; color: #fff;">保存</button>
          <button id="budget-cancel" class="ha-btn" style="margin-left: 6px;">取消</button>
        </div>
      </div>
    `;
    
    container.appendChild(overlay);
    
    overlay.querySelector('#budget-save').addEventListener('click', async () => {
      const value = parseFloat(overlay.querySelector('#budget-input').value);
      if (isNaN(value) || value < 0) {
        toastr.warning('请输入有效的预算金额');
        return;
      }
      finance.budgets[tag] = value;
      saveSettings();
      renderTags();
      updateSummary();
      // 同步到世界书，包括收入分析和支出分析
      await syncIncomeAnalysis();
      await syncExpenseAnalysis();
      toastr.success(`已设置${tag}的预算为${value}元`);
      overlay.remove();
    });
    
    overlay.querySelector('#budget-cancel').addEventListener('click', () => {
      overlay.remove();
    });
  }

  // 打开记录对话框
  function openRecordDialog(type, tag) {
    const overlay = document.createElement('div');
    overlay.className = 'ha-sleep-records-overlay';
    
    // 如果是支出，显示预算信息
    let budgetInfo = '';
    if (type === 'expense') {
      const budget = finance.budgets[tag] || 0;
      const monthRecords = finance.records.filter(r => 
        r.type === 'expense' && 
        r.tag === tag && 
        r.date.substring(0, 7) === ym
      );
      const used = monthRecords.reduce((sum, r) => sum + r.value, 0);
      if (budget > 0) {
        const remaining = budget - used;
        budgetInfo = `
          <div style="margin-bottom: 12px; padding: 8px; background: #f0f8ff; border-radius: 4px; font-size: 12px;">
            <div><strong>预算信息：</strong></div>
            <div>总预算: ${budget}元</div>
            <div>已使用: ${used.toFixed(2)}元 (${(used/budget*100).toFixed(1)}%)</div>
            <div>剩余: ${remaining.toFixed(2)}元</div>
          </div>
        `;
      }
    }
    
    overlay.innerHTML = `
      <div class="ha-sleep-records-panel" style="max-width: 400px;">
        <div class="ha-sleep-records-title">记录${type === 'income' ? '收入' : '支出'} - ${tag}</div>
        ${budgetInfo}
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-size: 13px;">金额（元）:</label>
          <input type="number" id="record-value" placeholder="请输入金额" min="0" step="0.01" 
                 style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-size: 13px;">名称（可选）:</label>
          <input type="text" id="record-name" placeholder="请输入名称" 
                 style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div class="ha-sleep-records-footer">
          <button id="record-save" class="ha-btn" style="background: #4CAF50; color: #fff;">确认</button>
          <button id="record-cancel" class="ha-btn" style="margin-left: 6px;">取消</button>
        </div>
      </div>
    `;
    
    container.appendChild(overlay);
    
    const valueInput = overlay.querySelector('#record-value');
    const nameInput = overlay.querySelector('#record-name');
    
    overlay.querySelector('#record-save').addEventListener('click', async () => {
      const value = parseFloat(valueInput.value);
      const name = nameInput.value.trim();
      
      if (isNaN(value) || value <= 0) {
        toastr.warning('请输入有效的金额');
        return;
      }
      
      const record = {
        type,
        tag,
        value,
        name,
        date: getISOWithOffset().substring(0, 10)
      };
      
      finance.records.push(record);
      saveSettings();
      await syncAllFinanceData();
      renderTags();
      updateSummary();
      toastr.success(`已记录${type === 'income' ? '收入' : '支出'}: ${value}元`);
      overlay.remove();
    });
    
    // 修复：正确处理取消操作
    overlay.querySelector('#record-cancel').addEventListener('click', () => {
      overlay.remove();
    });
    
    // 点击遮罩层也关闭对话框
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  // 更新汇总
  function updateSummary() {
    const monthRecords = finance.records.filter(r => r.date.substring(0, 7) === ym);
    const totalIncome = monthRecords.filter(r => r.type === 'income').reduce((a, b) => a + b.value, 0);
    const totalExpense = monthRecords.filter(r => r.type === 'expense').reduce((a, b) => a + b.value, 0);
    totalIncomeEl.textContent = totalIncome.toFixed(2);
    totalExpenseEl.textContent = totalExpense.toFixed(2);
    balanceEl.textContent = (totalIncome - totalExpense).toFixed(2);
  }

  // 标签添加
  document.getElementById('ha-income-add').addEventListener('click', () => {
    const v = document.getElementById('ha-income-input').value.trim();
    if (v && !finance.incomeTags.includes(v)) {
      finance.incomeTags.push(v);
      saveSettings();
      renderTags();
      toastr.success('已添加收入标签');
      document.getElementById('ha-income-input').value = '';
    }
  });
  
  document.getElementById('ha-expense-add').addEventListener('click', () => {
    const v = document.getElementById('ha-expense-input').value.trim();
    if (v && !finance.expenseTags.includes(v)) {
      finance.expenseTags.push(v);
      saveSettings();
      renderTags();
      toastr.success('已添加支出标签');
      document.getElementById('ha-expense-input').value = '';
    }
  });
  
  // 编辑模式切换
  document.getElementById('ha-income-edit').addEventListener('click', e => {
    editMode.income = !editMode.income;
    e.target.style.background = editMode.income ? '#ffe082' : '';
    toastr.info(editMode.income ? '收入编辑模式开启 - 点击标签修改名称' : '收入编辑模式关闭');
  });
  
  document.getElementById('ha-expense-edit').addEventListener('click', e => {
    editMode.expense = !editMode.expense;
    e.target.style.background = editMode.expense ? '#ffe082' : '';
    toastr.info(editMode.expense ? '支出编辑模式开启 - 点击标签修改名称' : '支出编辑模式关闭');
  });
  
  // 删除模式切换
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

  // 预算模式切换
  document.getElementById('ha-budget-btn').addEventListener('click', e => {
    budgetMode = !budgetMode;
    if (budgetMode) {
      e.target.style.background = '#4CAF50';
      e.target.style.color = 'white';
    } else {
      e.target.style.background = '';
      e.target.style.color = '';
    }
    toastr.info(budgetMode ? '预算设置模式开启 - 点击标签设置预算' : '预算设置模式关闭');
  });

  // 分析
  document.getElementById('ha-income-analysis').addEventListener('click', () => {
    const monthRecords = finance.records.filter(r => r.type === 'income' && r.date.substring(0, 7) === ym);
    const byTag = {};
    monthRecords.forEach(r => (byTag[r.tag] = (byTag[r.tag] || 0) + r.value));
    const sorted = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
    
    // 计算总收入
    const totalIncome = sorted.reduce((sum, [, v]) => sum + v, 0);
    
    // 计算所有配置的预算总和
    const totalBudget = Object.values(finance.budgets).reduce((sum, budget) => sum + budget, 0);
    
    // 计算剩余可支配预算
    const remainingBudget = totalIncome - totalBudget;
    
    let analysisText = '当月收入分析：\n' + sorted.map(([t, v]) => `${t}: ${v.toFixed(2)}元`).join('\n');
    analysisText += `\n\n总收入: ${totalIncome.toFixed(2)}元`;
    analysisText += `\n已配置预算: ${totalBudget.toFixed(2)}元`;
    analysisText += `\n剩余可支配预算: ${remainingBudget.toFixed(2)}元`;
    
    resultEl.innerText = analysisText;
  });
  
  document.getElementById('ha-expense-analysis').addEventListener('click', () => {
    const monthRecords = finance.records.filter(r => r.type === 'expense' && r.date.substring(0, 7) === ym);
    const byTag = {};
    monthRecords.forEach(r => (byTag[r.tag] = (byTag[r.tag] || 0) + r.value));
    const sorted = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
    
    // 包含预算信息的支出分析
    let analysisText = '当月支出分析：\n';
    sorted.forEach(([tag, value]) => {
      const budget = finance.budgets[tag] || 0;
      if (budget > 0) {
        const percentage = (value / budget * 100).toFixed(1);
        const remaining = budget - value;
        analysisText += `${tag}: ${value.toFixed(2)}元 (预算: ${budget}元, 已用: ${percentage}%, 剩余: ${remaining.toFixed(2)}元)\n`;
      } else {
        analysisText += `${tag}: ${value.toFixed(2)}元 (未设置预算)\n`;
      }
    });
    
    resultEl.innerText = analysisText;
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
      text.textContent = `${r.date} [${r.type === 'income' ? '收入' : '支出'}] ${r.tag}${r.name ? `(${r.name})` : ''}：${r.value}元`;
      const tools = document.createElement('div');
      const edit = document.createElement('button');
      edit.textContent = '✏️';
      edit.style.cssText = 'margin-right:6px;cursor:pointer;';
      const del = document.createElement('button');
      del.textContent = '🗑️';
      del.style.cssText = 'cursor:pointer;';
      edit.addEventListener('click', async () => {
        const newVal = prompt('修改金额（元）', r.value);
        if (!newVal || isNaN(parseFloat(newVal))) return toastr.warning('金额无效');
        const newName = prompt('修改名称（可留空）', r.name);
        r.name = newName || '';
        r.value = parseFloat(newVal);
        saveSettings();
        await syncAllFinanceData();
        renderTags();
        updateSummary();
        toastr.success('记录已更新');
        document.getElementById('ha-detail').click();
      });
      del.addEventListener('click', async () => {
        if (!confirm('确认删除该记录？')) return;
        finance.records.splice(finance.records.indexOf(r), 1);
        saveSettings();
        await syncAllFinanceData();
        renderTags();
        updateSummary();
        toastr.info('记录已删除');
        document.getElementById('ha-detail').click();
      });
      tools.append(edit, del);
      div.append(text, tools);
      resultEl.appendChild(div);
    });
  });

  // 定期清除按钮
  document.getElementById('ha-finance-auto-clean').addEventListener('click', () => {
    openAutoCleanPanel();
  });

  // 定期清除面板
  function openAutoCleanPanel() {
    const panel = document.createElement('div');
    panel.className = 'ha-sleep-records-overlay';
    
    const config = ctx.extensionSettings[MODULE_NAME].financeAutoClean || {
      days: 30,
      cleanLocalStorage: false,
      cleanWorldBook: false
    };
    
    panel.innerHTML = `
      <div class="ha-sleep-records-panel" style="max-width: 400px;">
        <div class="ha-sleep-records-title">定期清除设置</div>
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-size: 13px;">清除天数（保留最近N天）:</label>
          <input type="number" id="auto-clean-days" value="${config.days}" min="1" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
          <div style="font-size: 11px; color: #666; margin-top: 2px;">例如: 输入30表示保留最近30天的记录</div>
        </div>
        <div style="margin-bottom: 12px;">
          <button id="auto-clean-localstorage" class="ha-btn" style="width: 100%; margin-bottom: 6px; ${config.cleanLocalStorage ? 'background: #f44336; color: #fff;' : ''}">
            ${config.cleanLocalStorage ? '✓ ' : ''}清除 localStorage
          </button>
          <button id="auto-clean-worldbook" class="ha-btn" style="width: 100%; ${config.cleanWorldBook ? 'background: #f44336; color: #fff;' : ''}">
            ${config.cleanWorldBook ? '✓ ' : ''}清除世界书
          </button>
        </div>
        <div style="font-size: 12px; color: #666; padding: 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 12px;">
          <strong>说明:</strong> 每天04:00自动清除过期记录（仅清除"收入"和"支出"条目）。如果04:00时浏览器未打开，则在扩展下次启动时执行清除。
        </div>
        <div class="ha-sleep-records-footer">
          <button id="auto-clean-save" class="ha-btn" style="background: #4CAF50; color: #fff;">保存设置</button>
          <button id="auto-clean-close" class="ha-btn" style="margin-left: 6px;">关闭</button>
        </div>
      </div>
    `;
    
    container.appendChild(panel);
    
    let cleanLocalStorage = config.cleanLocalStorage;
    let cleanWorldBook = config.cleanWorldBook;
    
    panel.querySelector('#auto-clean-localstorage').addEventListener('click', (e) => {
      cleanLocalStorage = !cleanLocalStorage;
      const btn = e.target;
      if (cleanLocalStorage) {
        btn.style.background = '#f44336';
        btn.style.color = '#fff';
        btn.textContent = '✓ 清除 localStorage';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '清除 localStorage';
      }
    });
    
    panel.querySelector('#auto-clean-worldbook').addEventListener('click', (e) => {
      cleanWorldBook = !cleanWorldBook;
      const btn = e.target;
      if (cleanWorldBook) {
        btn.style.background = '#f44336';
        btn.style.color = '#fff';
        btn.textContent = '✓ 清除世界书';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '清除世界书';
      }
    });
    
    panel.querySelector('#auto-clean-save').addEventListener('click', () => {
      const days = parseInt(panel.querySelector('#auto-clean-days').value);
      if (isNaN(days) || days < 1) {
        toastr.warning('请输入有效的天数（至少为1）', '输入错误');
        return;
      }
      
      ctx.extensionSettings[MODULE_NAME].financeAutoClean = {
        days,
        cleanLocalStorage,
        cleanWorldBook,
        lastCleanDate: ctx.extensionSettings[MODULE_NAME].financeAutoClean?.lastCleanDate || null
      };
      saveSettings();
      toastr.success('定期清除设置已保存', '保存成功');
      panel.remove();
    });
    
    panel.querySelector('#auto-clean-close').onclick = () => panel.remove();
  }

  renderTags();
  updateSummary();
}


















     async function showWishes() {
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">心愿清单</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-wish-add" class="ha-btn" style="flex:1">记录心愿</button>
    </div>
    <div id="ha-wish-list" class="ha-small" style="margin-bottom:6px"></div>
    <div id="ha-wish-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
    </div>
  `;
  const listEl = document.getElementById('ha-wish-list');
  const subPanel = document.getElementById('ha-wish-subpanel');
  function debugLog(...args) {
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    toastr.info(msg, '健康生活助手');
    console.log('[健康生活助手]', ...args);
  }
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
      debugLog('findHealthWorldFile 异常:', e.message || e);
      return null;
    }
  }
  async function appendToWorldInfoWishLog() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) { debugLog('写入世界书: 未找到世界书文件，跳过写入'); return; }
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('心愿') || entry.title === '心愿')) {
          targetUID = entry.uid;
          break;
        }
      }
      if (!targetUID) {
        debugLog('未找到心愿 entry（未创建），写入被跳过。');
        return;
      }
      // 格式化心愿内容
      const arr = ctx.extensionSettings[MODULE_NAME].wishes.map((w,i)=>{
        return `${i+1}. [${w.done?'完成':'未完成'}] ${w.text}`;
      });
      const newContent = arr.join('\n');
      debugLog('写入世界书:', { file: fileId, uid: targetUID, 行数: arr.length });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
    } catch (e) {
      debugLog('写入世界书失败:', e.message || e);
    }
  }
  function render() {
    const arr = ctx.extensionSettings[MODULE_NAME].wishes || [];
    listEl.innerHTML = '';
    if (!arr.length) {
      listEl.innerText = '暂无心愿';
      return;
    }
    arr.forEach((w,i)=>{
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.marginBottom = '4px';
      const textSpan = document.createElement('span');
      textSpan.innerText = `${i+1}. [${w.done?'完成':'未完成'}] ${w.text}`;
      textSpan.style.flex = '1';
      div.appendChild(textSpan);
      const btnDone = document.createElement('button');
      btnDone.innerText = '完成';
      btnDone.className = 'ha-btn';
      btnDone.style.marginLeft = '4px';
      btnDone.addEventListener('click', ()=>{
        arr[i].done = true;
        saveSettings();
        render();
        appendToWorldInfoWishLog();
      });
      div.appendChild(btnDone);
      const btnEdit = document.createElement('button');
      btnEdit.innerText = '编辑';
      btnEdit.className = 'ha-btn';
      btnEdit.style.marginLeft = '4px';
      btnEdit.addEventListener('click', ()=>{
        const newText = prompt('编辑心愿内容', arr[i].text);
        if (newText===null) return;
        if (newText==='') arr.splice(i,1);
        else arr[i].text = newText;
        saveSettings();
        render();
        appendToWorldInfoWishLog();
      });
      div.appendChild(btnEdit);
      const btnDel = document.createElement('button');
      btnDel.innerText = '删除';
      btnDel.className = 'ha-btn';
      btnDel.style.marginLeft = '4px';
      btnDel.addEventListener('click', ()=>{
        if (!confirm('确认删除该心愿？')) return;
        arr.splice(i,1);
        saveSettings();
        render();
        appendToWorldInfoWishLog();
      });
      div.appendChild(btnDel);
      listEl.appendChild(div);
    });
  }
  document.getElementById('ha-wish-add').addEventListener('click', ()=>{
    const txt = prompt('输入心愿：','');
    if (!txt) return;
    if (!ctx.extensionSettings[MODULE_NAME].wishes) ctx.extensionSettings[MODULE_NAME].wishes=[];
    ctx.extensionSettings[MODULE_NAME].wishes.push({text: txt, done:false});
    saveSettings();
    render();
    appendToWorldInfoWishLog();
  });
  render();
}

     async function showSocial() {
  content.style.display = 'block';
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">习惯</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button id="ha-social-config" class="ha-btn" style="flex:1">配置新习惯</button>
    </div>
    <div id="ha-social-list" class="ha-small" style="margin-bottom:6px"></div>
    <div id="ha-social-subpanel" 
         style="margin-top:6px;padding:6px;border:1px solid #ddd;background:#f9f9f9;white-space:pre-wrap;min-height:60px;max-height:200px;overflow:auto;display:block;">
    </div>
  `;
  const listEl = document.getElementById('ha-social-list');
  const subPanel = document.getElementById('ha-social-subpanel');
  function debugLog(...args) {
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    toastr.info(msg, '健康生活助手');
    console.log('[健康生活助手]', ...args);
  }
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
      debugLog('findHealthWorldFile 异常:', e.message || e);
      return null;
    }
  }
  async function appendToWorldInfoHabitLog() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) { debugLog('写入世界书: 未找到世界书文件，跳过写入'); return; }
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('习惯') || entry.title === '习惯')) {
          targetUID = entry.uid;
          break;
        }
      }
      if (!targetUID) {
        debugLog('未找到习惯 entry（未创建），写入被跳过。');
        return;
      }
      const arr = Object.values(ctx.extensionSettings[MODULE_NAME].social || {}).map((h, idx) => {
        return `${idx+1}. ${h.name} [${h.frequency}] 标签:${h.tag} 已打卡:${(h.logs||[]).length}次`;
      });
      const newContent = arr.join('\n');
      debugLog('写入世界书:', { file: fileId, uid: targetUID, 行数: arr.length });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
    } catch (e) {
      debugLog('写入世界书失败:', e.message || e);
    }
  }
  function render() {
    const s = ctx.extensionSettings[MODULE_NAME].social || {};
    listEl.innerHTML = '';
    const keys = Object.keys(s);
    if (!keys.length) {
      listEl.innerText = '无已配置习惯';
      return;
    }
    keys.forEach((k, idx)=>{
      const habit = s[k];
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.marginBottom = '4px';
      const textSpan = document.createElement('span');
      textSpan.innerText = `${idx+1}. ${habit.name} [${habit.frequency}] 标签:${habit.tag} 已打卡:${(habit.logs||[]).length}次`;
      textSpan.style.flex = '1';
      div.appendChild(textSpan);
      const btnCheckin = document.createElement('button');
      btnCheckin.innerText = '打卡';
      btnCheckin.className = 'ha-btn';
      btnCheckin.style.marginLeft = '4px';
      btnCheckin.addEventListener('click', ()=>{
        habit.logs = habit.logs || [];
        habit.logs.push({ ts: new Date().toISOString() });
        saveSettings();
        render();
        appendToWorldInfoHabitLog();
      });
      div.appendChild(btnCheckin);
      const btnEdit = document.createElement('button');
      btnEdit.innerText = '编辑';
      btnEdit.className = 'ha-btn';
      btnEdit.style.marginLeft = '4px';
      btnEdit.addEventListener('click', ()=>{
        const name = prompt('编辑习惯名称', habit.name);
        if (name===null) return;
        const freq = prompt('编辑习惯频率（如每天1次）', habit.frequency);
        if (freq===null) return;
        const tag = prompt('编辑标签', habit.tag);
        if (tag===null) return;
        habit.name = name; habit.frequency=freq; habit.tag=tag;
        saveSettings();
        render();
        appendToWorldInfoHabitLog();
      });
      div.appendChild(btnEdit);
      const btnDel = document.createElement('button');
      btnDel.innerText = '删除';
      btnDel.className = 'ha-btn';
      btnDel.style.marginLeft = '4px';
      btnDel.addEventListener('click', ()=>{
        if (!confirm('确认删除该习惯？')) return;
        delete s[k];
        saveSettings();
        render();
        appendToWorldInfoHabitLog();
      });
      div.appendChild(btnDel);
      listEl.appendChild(div);
    });
  }
  document.getElementById('ha-social-config').addEventListener('click', ()=>{
    const name = prompt('输入习惯名称','');
    if (!name) return;
    const freq = prompt('输入频率（如每天1次，每周2次）','每天1次');
    const tag = prompt('输入标签','');
    if (!ctx.extensionSettings[MODULE_NAME].social) ctx.extensionSettings[MODULE_NAME].social={};
    const id = 'habit_' + Date.now();
    ctx.extensionSettings[MODULE_NAME].social[id] = { name, frequency: freq, tag, logs: [] };
    saveSettings();
    render();
    appendToWorldInfoHabitLog();
  });
  render();
}






async function showTodo() {
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
          
        case 'TODO_RECURRENT_FIRED':
          debugLog('循环待办通知已触发:', data.todoName);
          // 循环待办不需要禁用 notifyScheduled，它会继续触发
          if (typeof toastr !== 'undefined') {
            let recurrenceText = '';
            if (data.recurrence) {
              if (data.recurrence.type === 'weekly') {
                const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
                const dayNames = data.recurrence.days.map(d => '周' + weekDays[d]).join(',');
                recurrenceText = `每周${dayNames} ${data.recurrence.time}`;
              } else if (data.recurrence.type === 'monthly') {
                recurrenceText = `每月${data.recurrence.date}号 ${data.recurrence.time}`;
              }
            }
            toastr.warning(`循环任务: ${data.todoName}\n${recurrenceText}`, '🔁 循环提醒', { timeOut: 10000 });
          }
          render();
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
  
  if (!ctx.extensionSettings[MODULE_NAME].todos) ctx.extensionSettings[MODULE_NAME].todos = [];
  let todos = ctx.extensionSettings[MODULE_NAME].todos;
  
  todos.forEach(t => {
    // 确保有 id
    if (!t.id) t.id = 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // 基础字段（与后端 idle-backend.cjs 保持一致）
    if (t.name === undefined) t.name = '';
    if (t.due === undefined) t.due = '';
    if (t.priority === undefined) t.priority = 3;
    if (t.tag === undefined) t.tag = '';
    if (t.done === undefined) t.done = false;
    if (t.notifyScheduled === undefined) t.notifyScheduled = false;
    if (t.focused === undefined) t.focused = 0;
    
    // 循环设置
    if (t.recurrence === undefined) t.recurrence = null;
  });
  
  async function scheduleNotification(todo) {
    if (!backendReady) {
      if (typeof toastr !== 'undefined') toastr.error('后端未连接');
      return false;
    }
    
    // 🔥 循环任务和普通任务分开处理
    if (todo.recurrence) {
      // 循环任务：直接设置 notifyScheduled，后端会计算下次触发时间
      todo.notifyScheduled = true;
      
      const success = await backendClient.syncTodos(todos);
      if (success) {
        let recurrenceText = '';
        if (todo.recurrence.type === 'weekly') {
          const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
          const dayNames = todo.recurrence.days.map(d => '周' + weekDays[d]).join(',');
          recurrenceText = `每周${dayNames} ${todo.recurrence.time}`;
        } else if (todo.recurrence.type === 'monthly') {
          recurrenceText = `每月${todo.recurrence.date}号 ${todo.recurrence.time}`;
        }
        
        if (typeof toastr !== 'undefined') {
          toastr.success(`已预约循环通知: ${recurrenceText}`, '🎯 通知已设置');
        }
        debugLog('循环通知已调度:', todo.name, recurrenceText);
        return true;
      } else {
        todo.notifyScheduled = false;
        if (typeof toastr !== 'undefined') toastr.error('通知预约失败');
        return false;
      }
    }
    
    // 普通任务：需要 due 时间
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
        const focused = t.focused ? `已专注:${Math.floor(t.focused / 60)}分钟` : '';
        let recurrence = '';
        if (t.recurrence) {
          if (t.recurrence.type === 'weekly') {
            const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
            const dayNames = t.recurrence.days.map(d => '周' + weekDays[d]).join(',');
            recurrence = `[🔁每周${dayNames} ${t.recurrence.time}]`;
          } else if (t.recurrence.type === 'monthly') {
            recurrence = `[🔁每月${t.recurrence.date}号 ${t.recurrence.time}]`;
          }
        }
        return `${i+1}. [${status}] ${t.name} 优先:${t.priority} 标签:${t.tag} ${due} ${recurrence} ${focused} ${notify}`;
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
      
      // 循环信息显示
      let recurrenceText = '';
      if (t.recurrence) {
        if (t.recurrence.type === 'weekly') {
          const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
          const dayNames = t.recurrence.days.map(d => '周' + weekDays[d]).join(',');
          recurrenceText = `🔁每周${dayNames} ${t.recurrence.time}`;
        } else if (t.recurrence.type === 'monthly') {
          recurrenceText = `🔁每月${t.recurrence.date}号 ${t.recurrence.time}`;
        }
      }
      
      const textSpan = document.createElement('span');
      textSpan.style.flex = '1';
      textSpan.style.wordBreak = 'break-word';
      textSpan.innerText = `${i+1}. [${status}] ${t.name} 优先:${t.priority} 标签:${t.tag} ${dueText} ${focusedTime} ${recurrenceText}`;
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
    const todo = t || {name:'',due:'',priority:3,tag:'',recurrence:null};
    const dueDate = todo.due ? (todo.due.split('T')[0]||'') : '';
    const dueTime = todo.due ? (todo.due.split('T')[1]||'') : '';
    
    // 循环设置初始值
    const hasRecurrence = todo.recurrence !== null;
    const recurrenceType = todo.recurrence ? todo.recurrence.type : 'weekly';
    const recurrenceWeekDays = todo.recurrence && todo.recurrence.type === 'weekly' ? todo.recurrence.days : [];
    const recurrenceMonthDate = todo.recurrence && todo.recurrence.type === 'monthly' ? todo.recurrence.date : 1;
    const recurrenceTime = todo.recurrence ? todo.recurrence.time : '09:00';
    
    dialog.innerHTML = `
      <div style="background:#fff;padding:8px;border-radius:6px;box-shadow:0 1px 6px rgba(0,0,0,0.12);max-width:400px;margin:auto;">
        <div style="font-weight:600;margin-bottom:0px;">${isNew?'添加':'编辑'}待办</div>
        <label style="font-size:13px">名称:</label><br>
        <input id="todo-name" type="text" style="width:100%;margin-bottom:0px;padding:0px;" value="${escapeHtml(todo.name)}"><br>
        
        <div style="margin:8px 0;padding:8px;background:#f5f5f5;border-radius:4px;">
          <label style="font-size:13px;font-weight:600;">
            <input id="todo-recurrence-enable" type="checkbox" ${hasRecurrence?'checked':''}>
            启用循环任务
          </label>
          <div id="recurrence-settings" style="margin-top:6px;display:${hasRecurrence?'block':'none'};">
            <label style="font-size:12px">循环类型:</label>
            <select id="recurrence-type" style="width:100%;margin-bottom:4px;padding:2px;">
              <option value="weekly" ${recurrenceType==='weekly'?'selected':''}>按周循环</option>
              <option value="monthly" ${recurrenceType==='monthly'?'selected':''}>按月循环</option>
            </select>
            
            <div id="weekly-settings" style="display:${recurrenceType==='weekly'?'block':'none'};">
              <label style="font-size:12px">选择星期 (可多选):</label><br>
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;">
                <label style="font-size:11px;"><input type="checkbox" class="week-day" value="0" ${recurrenceWeekDays.includes(0)?'checked':''}>周日</label>
                <label style="font-size:11px;"><input type="checkbox" class="week-day" value="1" ${recurrenceWeekDays.includes(1)?'checked':''}>周一</label>
                <label style="font-size:11px;"><input type="checkbox" class="week-day" value="2" ${recurrenceWeekDays.includes(2)?'checked':''}>周二</label>
                <label style="font-size:11px;"><input type="checkbox" class="week-day" value="3" ${recurrenceWeekDays.includes(3)?'checked':''}>周三</label>
                <label style="font-size:11px;"><input type="checkbox" class="week-day" value="4" ${recurrenceWeekDays.includes(4)?'checked':''}>周四</label>
                <label style="font-size:11px;"><input type="checkbox" class="week-day" value="5" ${recurrenceWeekDays.includes(5)?'checked':''}>周五</label>
                <label style="font-size:11px;"><input type="checkbox" class="week-day" value="6" ${recurrenceWeekDays.includes(6)?'checked':''}>周六</label>
              </div>
            </div>
            
            <div id="monthly-settings" style="display:${recurrenceType==='monthly'?'block':'none'};">
              <label style="font-size:12px">每月日期:</label>
              <input id="month-date" type="number" min="1" max="31" value="${recurrenceMonthDate}" style="width:100%;margin-bottom:4px;padding:2px;">
            </div>
            
            <label style="font-size:12px">时间:</label>
            <input id="recurrence-time" type="time" value="${recurrenceTime}" style="width:100%;margin-bottom:4px;padding:2px;">
          </div>
        </div>
        
        <label style="font-size:13px">截止日期 (非循环任务):</label><br>
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
    
    // 循环设置交互
    const recurrenceEnableCheckbox = dialog.querySelector('#todo-recurrence-enable');
    const recurrenceSettingsDiv = dialog.querySelector('#recurrence-settings');
    const recurrenceTypeSelect = dialog.querySelector('#recurrence-type');
    const weeklySettingsDiv = dialog.querySelector('#weekly-settings');
    const monthlySettingsDiv = dialog.querySelector('#monthly-settings');
    
    recurrenceEnableCheckbox.onchange = () => {
      recurrenceSettingsDiv.style.display = recurrenceEnableCheckbox.checked ? 'block' : 'none';
    };
    
    recurrenceTypeSelect.onchange = () => {
      const type = recurrenceTypeSelect.value;
      weeklySettingsDiv.style.display = type === 'weekly' ? 'block' : 'none';
      monthlySettingsDiv.style.display = type === 'monthly' ? 'block' : 'none';
    };
    
    dialog.querySelector('#todo-cancel').onclick=()=>dialog.remove();
    dialog.querySelector('#todo-ok').onclick= async ()=>{
      const name=dialog.querySelector('#todo-name').value.trim();
      if(!name)return alert('名称不能为空');
      
      const date=dialog.querySelector('#todo-date').value;
      const time=dialog.querySelector('#todo-time').value;
      const due=date?(time?`${date}T${time}`:date):'';
      const priority=parseInt(dialog.querySelector('#todo-priority').value)||3;
      const tag=dialog.querySelector('#todo-tag').value.trim();
      
      // 处理循环设置
      let recurrence = null;
      if (recurrenceEnableCheckbox.checked) {
        const type = recurrenceTypeSelect.value;
        const recTime = dialog.querySelector('#recurrence-time').value;
        
        if (type === 'weekly') {
          const selectedDays = Array.from(dialog.querySelectorAll('.week-day:checked'))
            .map(cb => parseInt(cb.value));
          if (selectedDays.length === 0) {
            return alert('请至少选择一个星期');
          }
          recurrence = { type: 'weekly', days: selectedDays, time: recTime };
        } else if (type === 'monthly') {
          const monthDate = parseInt(dialog.querySelector('#month-date').value);
          if (monthDate < 1 || monthDate > 31) {
            return alert('日期必须在1-31之间');
          }
          recurrence = { type: 'monthly', date: monthDate, time: recTime };
        }
      }
      
      if(isNew){
        const id='todo_'+Date.now()+'_'+Math.random().toString(36).substr(2,9);
        todos.push({id,name,due,priority,tag,done:false,notifyScheduled:false,recurrence});
      }else{
        const oldDue = t.due;
        const oldRecurrence = t.recurrence;
        t.name=name;
        t.due=due;
        t.priority=priority;
        t.tag=tag;
        t.recurrence=recurrence;
        
        // 如果循环设置改变，需要重新调度通知
        const recurrenceChanged = JSON.stringify(oldRecurrence) !== JSON.stringify(recurrence);
        if (t.notifyScheduled && (oldDue !== due || recurrenceChanged)) {
          await cancelNotification(t);
          if (due || recurrence) {
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












async function showMemo() {
  if (!ctx.extensionSettings[MODULE_NAME].memo) ctx.extensionSettings[MODULE_NAME].memo = [];
  const memos = ctx.extensionSettings[MODULE_NAME].memo;

 
    

  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">备忘录</div>
    <div style="margin-bottom:6px;">
      <textarea id="ha-memo-input" placeholder="输入备忘录..." 
        style="width:100%; min-height:60px; padding:4px; resize:vertical"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button id="ha-memo-add" class="ha-btn" style="flex:1;">添加 Memo</button>
        <button id="ha-memo-auto-clean" class="ha-btn">定期清除</button>
      </div>
    </div>
    <ul id="ha-memo-list" style="padding-left:18px; margin-top:6px;"></ul>
  `;

  const listEl = document.getElementById('ha-memo-list');

  // 获取带时区偏移的ISO格式时间字符串
  function getISOWithOffset() {
    const now = new Date();
    const offset = -now.getTimezoneOffset();
    const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
    const offsetSign = offset >= 0 ? '+' : '-';
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }

  function showToast(message, type = 'info') {
    if (window.toastr) {
      toastr[type](message, '备忘录', { timeOut: 3000 });
    }
    console.log('[健康生活助手][Memo]', message);
  }

  async function findHealthWorldFile() {
    try {
      const moduleWI = await import('/scripts/world-info.js');
      const selected = moduleWI.selected_world_info || [];
      console.log('[健康生活助手][Memo] selected_world_info:', selected);
      for (const WI of selected) {
        if (WI.includes('健康生活助手')) {
          console.log('[健康生活助手][Memo] 匹配到世界书文件:', WI);
          return WI;
        }
      }
      showToast('未找到名为 "健康生活助手" 的世界书文件', 'warning');
      return null;
    } catch (e) {
      showToast('查找世界书文件失败: ' + (e.message || e), 'error');
      return null;
    }
  }

  async function appendToWorldInfoMemo(silent = false) {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) { 
        console.log('[健康生活助手][Memo] 写入世界书: 未找到世界书文件，跳过写入');
        return;
      }

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      console.log('[健康生活助手][Memo] loadWorldInfo entries count:', Object.keys(entries).length);

      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes('memo') || entry.title === 'memo')) {
          targetUID = entry.uid;
          console.log('[健康生活助手][Memo] 找到 memo entry: uid=', targetUID, 'comment=', comment);
          break;
        }
      }

      if (!targetUID) { 
        if (!silent) showToast('未找到 memo entry（未创建），写入被跳过', 'warning');
        return;
      }

      // 仅同步共享的 memo
      const shared = memos.filter(m => m.shared);
      const arr = shared.map((m, i) => `${i+1}. ${m.date} ${m.text}`);
      const newContent = arr.join('\n');

      console.log('[健康生活助手][Memo] 准备写入 world entry:', { file: fileId, uid: targetUID });
      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);

      if (!silent) showToast(`写入世界书成功，共享条目数: ${arr.length}`, 'success');
    } catch (e) {
      if (!silent) showToast('写入世界书失败: ' + (e.message || e), 'error');
    }
  }

  function render(userAction = false) {
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
        appendToWorldInfoMemo(false); // 用户操作，显示通知
      });
      li.appendChild(chkShare);

      const span = document.createElement('span');
      span.style.flex = '1';
      span.innerText = `${i+1}. ${m.date} ${m.text}`;
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
        m.date = getISOWithOffset(); // 更新编辑时间为带时区偏移的ISO格式
        saveSettings();
        render(true);
        appendToWorldInfoMemo(false); // 用户操作，显示通知
        showToast('备忘录已更新', 'success');
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
        render(true);
        appendToWorldInfoMemo(false); // 用户操作，显示通知
        showToast('备忘录已删除', 'info');
      });
      li.appendChild(btnDel);

      listEl.appendChild(li);
    });

    // 初始渲染时静默同步，用户操作时不重复调用（已在各操作中调用）
    if (!userAction) {
      appendToWorldInfoMemo(true);
    }
  }

  // 添加 Memo
  content.querySelector('#ha-memo-add').addEventListener('click', () => {
    const input = content.querySelector('#ha-memo-input');
    const val = input.value.trim();
    if (!val) return;
    const dateStr = getISOWithOffset();
    memos.push({ text: val, date: dateStr, shared: false });
    input.value = '';
    saveSettings();
    render(true);
    showToast('备忘录已添加', 'success');
  });

  // 定期清除按钮
  document.getElementById('ha-memo-auto-clean').addEventListener('click', () => {
    openAutoCleanPanel();
  });

  // 定期清除面板
  function openAutoCleanPanel() {
    const panel = document.createElement('div');
    panel.style.position = 'absolute';
    panel.style.top = '0';
    panel.style.left = '0';
    panel.style.width = '100%';
    panel.style.height = '100%';
    panel.style.background = 'rgba(0,0,0,0.5)';
    panel.style.display = 'flex';
    panel.style.alignItems = 'center';
    panel.style.justifyContent = 'center';
    panel.style.zIndex = '10000';
    
    // 读取当前配置
    const config = ctx.extensionSettings[MODULE_NAME].memoAutoClean || {
      days: 30,
      cleanLocalStorage: false,
      cleanWorldBook: false
    };
    
    const innerPanel = document.createElement('div');
    innerPanel.style.background = '#fff';
    innerPanel.style.padding = '20px';
    innerPanel.style.borderRadius = '8px';
    innerPanel.style.maxWidth = '400px';
    innerPanel.style.width = '90%';
    innerPanel.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    
    innerPanel.innerHTML = `
      <div style="font-weight: 600; font-size: 16px; margin-bottom: 16px;">定期清除设置</div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-size: 13px;">清除天数（保留最近N天）:</label>
        <input type="number" id="memo-auto-clean-days" value="${config.days}" min="1" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; margin-top: 2px;">例如: 输入30表示保留最近30天的记录</div>
      </div>
      <div style="margin-bottom: 12px;">
        <button id="memo-auto-clean-localstorage" class="ha-btn" style="width: 100%; margin-bottom: 6px; ${config.cleanLocalStorage ? 'background: #f44336; color: #fff;' : ''}">
          ${config.cleanLocalStorage ? '✓ ' : ''}清除 localStorage
        </button>
        <button id="memo-auto-clean-worldbook" class="ha-btn" style="width: 100%; ${config.cleanWorldBook ? 'background: #f44336; color: #fff;' : ''}">
          ${config.cleanWorldBook ? '✓ ' : ''}清除世界书
        </button>
      </div>
      <div style="font-size: 12px; color: #666; padding: 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 12px;">
        <strong>说明:</strong> 每天04:00自动清除过期记录。如果04:00时浏览器未打开，则在扩展下次启动时执行清除。
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="memo-auto-clean-save" class="ha-btn" style="flex: 1; background: #4CAF50; color: #fff;">保存设置</button>
        <button id="memo-auto-clean-close" class="ha-btn" style="flex: 1;">关闭</button>
      </div>
    `;
    
    panel.appendChild(innerPanel);
    content.appendChild(panel);
    
    let cleanLocalStorage = config.cleanLocalStorage;
    let cleanWorldBook = config.cleanWorldBook;
    
    // 切换 localStorage 清除
    innerPanel.querySelector('#memo-auto-clean-localstorage').addEventListener('click', (e) => {
      cleanLocalStorage = !cleanLocalStorage;
      const btn = e.target;
      if (cleanLocalStorage) {
        btn.style.background = '#f44336';
        btn.style.color = '#fff';
        btn.textContent = '✓ 清除 localStorage';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '清除 localStorage';
      }
    });
    
    // 切换世界书清除
    innerPanel.querySelector('#memo-auto-clean-worldbook').addEventListener('click', (e) => {
      cleanWorldBook = !cleanWorldBook;
      const btn = e.target;
      if (cleanWorldBook) {
        btn.style.background = '#f44336';
        btn.style.color = '#fff';
        btn.textContent = '✓ 清除世界书';
      } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = '清除世界书';
      }
    });
    
    // 保存设置
    innerPanel.querySelector('#memo-auto-clean-save').addEventListener('click', () => {
      const days = parseInt(innerPanel.querySelector('#memo-auto-clean-days').value);
      if (isNaN(days) || days < 1) {
        showToast('请输入有效的天数（至少为1）', 'warning');
        return;
      }
      
      ctx.extensionSettings[MODULE_NAME].memoAutoClean = {
        days,
        cleanLocalStorage,
        cleanWorldBook,
        lastCleanDate: ctx.extensionSettings[MODULE_NAME].memoAutoClean?.lastCleanDate || null
      };
      saveSettings();
      showToast('定期清除设置已保存', 'success');
      panel.remove();
    });
    
    innerPanel.querySelector('#memo-auto-clean-close').onclick = () => panel.remove();
  }

  // 执行定期清除（从指定日期之前的记录）
  async function performAutoClean(daysToKeep) {
    const config = ctx.extensionSettings[MODULE_NAME].memoAutoClean;
    if (!config || (!config.cleanLocalStorage && !config.cleanWorldBook)) {
      return; // 未配置或都未启用
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // 解析ISO日期字符串获取日期部分
    function parseISODate(isoString) {
      const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return null;
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    
    // 清除 localStorage
    if (config.cleanLocalStorage) {
      const filteredMemos = memos.filter(m => {
        const memoDate = parseISODate(m.date);
        return memoDate && memoDate >= cutoffDate;
      });
      
      const removedCount = memos.length - filteredMemos.length;
      if (removedCount > 0) {
        ctx.extensionSettings[MODULE_NAME].memo = filteredMemos;
        saveSettings();
        console.log(`[健康生活助手][Memo] 自动清除: 从 localStorage 删除了 ${removedCount} 条备忘录`);
      }
    }
    
    // 清除世界书
    if (config.cleanWorldBook) {
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
          if (!entry.disable && (comment.includes('memo') || entry.title === 'memo')) {
            targetUID = entry.uid;
            break;
          }
        }
        
        if (!targetUID) return;
        
        // 获取当前的备忘录（已经是过滤后的）
        const currentMemos = ctx.extensionSettings[MODULE_NAME].memo || [];
        const shared = currentMemos.filter(m => m.shared);
        const arr = shared.map((m, i) => `${i+1}. ${m.date} ${m.text}`);
        const newContent = arr.join('\n');
        
        await globalThis.SillyTavern.getContext()
          .SlashCommandParser.commands['setentryfield']
          .callback({ file: fileId, uid: targetUID, field: 'content' }, newContent);
        
        console.log('[健康生活助手][Memo] 自动清除: 已同步世界书');
      } catch (e) {
        console.error('[健康生活助手][Memo] 自动清除世界书失败:', e);
      }
    }
    
    // 更新最后清除日期
    config.lastCleanDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    saveSettings();
  }

  render(false); // 初始渲染，不显示通知
  
  
}




/**
 * 使用 TavernHelper 接口的 showReviews 函数
 * 
 * TavernHelper 接口访问方式：
 * - 通过 window.TavernHelper 访问
 * - 或者在插件中直接使用全局的 TavernHelper 对象
 */

async function showReviews() {
  if (!ctx.extensionSettings[MODULE_NAME].reviews) ctx.extensionSettings[MODULE_NAME].reviews = [];
  const reviews = ctx.extensionSettings[MODULE_NAME].reviews;

  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">生活测评</div>
    <div style="margin-bottom:6px;">
      <button id="ha-review-add" class="ha-btn" style="width:100%;margin-bottom:6px;">添加测评</button>
      <button id="ha-review-manage" class="ha-btn" style="width:100%;">管理测评</button>
    </div>
    <div id="ha-review-list" style="margin-top:6px;"></div>
  `;

  const listEl = document.getElementById('ha-review-list');

  function showToast(message, type = 'info') {
    if (window.toastr) {
      toastr[type](message, '生活测评', { timeOut: 3000 });
    }
    console.log('[健康生活助手][Reviews]', message);
  }

  function findReviewWorldFile() {
    try {
      const worldbookNames = TavernHelper.getWorldbookNames();
      const reviewWorldbook = worldbookNames.find(name => name.includes('生活测评'));
      
      if (!reviewWorldbook) {
        showToast('未找到名为 "生活测评" 的世界书文件', 'warning');
        return null;
      }
      
      return reviewWorldbook;
    } catch (e) {
      showToast('查找世界书文件失败: ' + (e.message || e), 'error');
      return null;
    }
  }

  async function updateWorldBookEntry(storeName, priceRange, rating) {
    try {
      const worldbookName = findReviewWorldFile();
      if (!worldbookName) return;

      const contentText = `店家名称: ${storeName}\n价格区间: ${priceRange}\n整体评价: ${rating}`;

      // 使用 TavernHelper 获取并更新世界书
      await TavernHelper.updateWorldbookWith(worldbookName, (worldbook) => {
        // 查找是否已存在该店家的条目
        const existingEntry = worldbook.find(entry => entry.name === storeName);
        
        if (existingEntry) {
          // 更新现有条目
          existingEntry.content = contentText;
          console.log('[健康生活助手][Reviews] 更新已存在的条目, name=', storeName);
          showToast('世界书条目已更新', 'success');
        } else {
          // 创建新条目
          worldbook.push({
            name: storeName,
            content: contentText,
            enabled: true,
            strategy: {
              type: 'selective',
              keys: [storeName],
              keys_secondary: { logic: 'and_any', keys: [] },
              scan_depth: 'same_as_global'
            },
            position: {
              type: 'after_character_definition',
              role: 'system',
              depth: 4,
              order: 105
            },
            probability: 100,
            recursion: {
              prevent_incoming: false,
              prevent_outgoing: false,
              delay_until: null
            },
            effect: {
              sticky: null,
              cooldown: null,
              delay: null
            }
          });
          console.log('[健康生活助手][Reviews] 创建新条目, storeName=', storeName);
          showToast('世界书条目已创建', 'success');
        }
        
        return worldbook;
      });
    } catch (e) {
      showToast('写入世界书失败: ' + (e.message || e), 'error');
      console.error('[健康生活助手][Reviews] 错误详情:', e);
    }
  }

  async function deleteWorldBookEntry(storeName) {
    try {
      const worldbookName = findReviewWorldFile();
      if (!worldbookName) return;

      // 使用 TavernHelper 删除世界书条目
      const { deleted_entries } = await TavernHelper.deleteWorldbookEntries(
        worldbookName,
        entry => entry.name === storeName
      );

      if (deleted_entries.length > 0) {
        console.log('[健康生活助手][Reviews] 删除条目成功, storeName=', storeName);
        showToast('世界书条目已删除', 'success');
      } else {
        console.log('[健康生活助手][Reviews] 未找到要删除的条目, storeName=', storeName);
      }
    } catch (e) {
      showToast('删除世界书条目失败: ' + (e.message || e), 'error');
      console.error('[健康生活助手][Reviews] 删除错误详情:', e);
    }
  }

  function openAddDialog() {
    const dialog = document.createElement('div');
    dialog.style.position = 'absolute';
    dialog.style.top = '0';
    dialog.style.left = '0';
    dialog.style.width = '100%';
    dialog.style.height = '100%';
    dialog.style.background = 'rgba(0,0,0,0.5)';
    dialog.style.display = 'flex';
    dialog.style.alignItems = 'center';
    dialog.style.justifyContent = 'center';
    dialog.style.zIndex = '10000';

    const innerPanel = document.createElement('div');
    innerPanel.style.background = '#fff';
    innerPanel.style.padding = '20px';
    innerPanel.style.borderRadius = '8px';
    innerPanel.style.maxWidth = '400px';
    innerPanel.style.width = '90%';
    innerPanel.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

    innerPanel.innerHTML = `
      <div style="font-weight:600;margin-bottom:16px;">添加测评</div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;">店家名称 <span style="color:red;">*</span>:</label>
        <input type="text" id="review-store-name" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;">价格区间:</label>
        <input type="text" id="review-price-range" placeholder="例如: 50-100元" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;">整体评价:</label>
        <textarea id="review-rating" placeholder="填写您的评价..." style="width:100%;min-height:80px;padding:6px;border:1px solid #ccc;border-radius:4px;resize:vertical;"></textarea>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="review-save" class="ha-btn" style="flex:1;background:#4CAF50;color:#fff;">保存</button>
        <button id="review-cancel" class="ha-btn" style="flex:1;">取消</button>
      </div>
    `;

    dialog.appendChild(innerPanel);
    content.appendChild(dialog);

    innerPanel.querySelector('#review-save').addEventListener('click', async () => {
      const storeName = innerPanel.querySelector('#review-store-name').value.trim();
      const priceRange = innerPanel.querySelector('#review-price-range').value.trim();
      const rating = innerPanel.querySelector('#review-rating').value.trim();

      if (!storeName) {
        showToast('请填写店家名称', 'warning');
        return;
      }

      const existingIndex = reviews.findIndex(r => r.storeName === storeName);
      if (existingIndex >= 0) {
        reviews[existingIndex].priceRange = priceRange;
        reviews[existingIndex].rating = rating;
      } else {
        reviews.push({ storeName, priceRange, rating });
      }

      saveSettings();
      await updateWorldBookEntry(storeName, priceRange, rating);
      showToast('测评已保存', 'success');
      dialog.remove();
      renderList();
    });

    innerPanel.querySelector('#review-cancel').onclick = () => dialog.remove();
  }

  function openManageDialog() {
    const dialog = document.createElement('div');
    dialog.style.position = 'absolute';
    dialog.style.top = '0';
    dialog.style.left = '0';
    dialog.style.width = '100%';
    dialog.style.height = '100%';
    dialog.style.background = 'rgba(0,0,0,0.5)';
    dialog.style.display = 'flex';
    dialog.style.alignItems = 'center';
    dialog.style.justifyContent = 'center';
    dialog.style.zIndex = '10000';

    const innerPanel = document.createElement('div');
    innerPanel.style.background = '#fff';
    innerPanel.style.padding = '20px';
    innerPanel.style.borderRadius = '8px';
    innerPanel.style.maxWidth = '500px';
    innerPanel.style.width = '90%';
    innerPanel.style.maxHeight = '80vh';
    innerPanel.style.overflow = 'auto';
    innerPanel.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

    innerPanel.innerHTML = `
      <div style="font-weight:600;margin-bottom:16px;">管理测评</div>
      <div id="review-manage-list"></div>
      <div style="margin-top:16px;">
        <button id="review-manage-close" class="ha-btn" style="width:100%;">关闭</button>
      </div>
    `;

    const manageListEl = innerPanel.querySelector('#review-manage-list');
    
    function renderManageList() {
      manageListEl.innerHTML = '';
      if (reviews.length === 0) {
        manageListEl.innerHTML = '<div style="color:#999;text-align:center;padding:20px;">暂无测评记录</div>';
        return;
      }

      reviews.forEach((review, index) => {
        const div = document.createElement('div');
        div.style.marginBottom = '12px';
        div.style.padding = '12px';
        div.style.border = '1px solid #e0e0e0';
        div.style.borderRadius = '6px';
        div.style.background = '#f9f9f9';

        div.innerHTML = `
          <div style="font-weight:600;margin-bottom:6px;">${review.storeName}</div>
          <div style="font-size:12px;color:#666;margin-bottom:4px;">价格: ${review.priceRange || '未填写'}</div>
          <div style="font-size:12px;color:#666;margin-bottom:8px;">评价: ${review.rating || '未填写'}</div>
          <div style="display:flex;gap:6px;">
            <button class="review-edit ha-btn" data-index="${index}" style="flex:1;">编辑</button>
            <button class="review-delete ha-btn" data-index="${index}" style="flex:1;background:#f44336;color:#fff;">删除</button>
          </div>
        `;

        manageListEl.appendChild(div);
      });

      manageListEl.querySelectorAll('.review-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          const review = reviews[index];
          dialog.remove();
          openEditDialog(review, index);
        });
      });

      manageListEl.querySelectorAll('.review-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('确认删除该测评?')) return;
          const index = parseInt(btn.dataset.index);
          const review = reviews[index];
          await deleteWorldBookEntry(review.storeName);
          reviews.splice(index, 1);
          saveSettings();
          showToast('测评已删除', 'info');
          renderManageList();
          renderList();
        });
      });
    }

    dialog.appendChild(innerPanel);
    content.appendChild(dialog);

    renderManageList();
    innerPanel.querySelector('#review-manage-close').onclick = () => dialog.remove();
  }

  function openEditDialog(review, index) {
    const dialog = document.createElement('div');
    dialog.style.position = 'absolute';
    dialog.style.top = '0';
    dialog.style.left = '0';
    dialog.style.width = '100%';
    dialog.style.height = '100%';
    dialog.style.background = 'rgba(0,0,0,0.5)';
    dialog.style.display = 'flex';
    dialog.style.alignItems = 'center';
    dialog.style.justifyContent = 'center';
    dialog.style.zIndex = '10000';

    const innerPanel = document.createElement('div');
    innerPanel.style.background = '#fff';
    innerPanel.style.padding = '20px';
    innerPanel.style.borderRadius = '8px';
    innerPanel.style.maxWidth = '400px';
    innerPanel.style.width = '90%';
    innerPanel.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

    innerPanel.innerHTML = `
      <div style="font-weight:600;margin-bottom:16px;">编辑测评</div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;">店家名称 <span style="color:red;">*</span>:</label>
        <input type="text" id="review-edit-store-name" value="${review.storeName}" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;">价格区间:</label>
        <input type="text" id="review-edit-price-range" value="${review.priceRange || ''}" placeholder="例如: 50-100元" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;">
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;">整体评价:</label>
        <textarea id="review-edit-rating" placeholder="填写您的评价..." style="width:100%;min-height:80px;padding:6px;border:1px solid #ccc;border-radius:4px;resize:vertical;">${review.rating || ''}</textarea>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="review-edit-save" class="ha-btn" style="flex:1;background:#4CAF50;color:#fff;">保存</button>
        <button id="review-edit-cancel" class="ha-btn" style="flex:1;">取消</button>
      </div>
    `;

    dialog.appendChild(innerPanel);
    content.appendChild(dialog);

    innerPanel.querySelector('#review-edit-save').addEventListener('click', async () => {
      const oldStoreName = review.storeName;
      const newStoreName = innerPanel.querySelector('#review-edit-store-name').value.trim();
      const priceRange = innerPanel.querySelector('#review-edit-price-range').value.trim();
      const rating = innerPanel.querySelector('#review-edit-rating').value.trim();

      if (!newStoreName) {
        showToast('请填写店家名称', 'warning');
        return;
      }

      if (oldStoreName !== newStoreName) {
        await deleteWorldBookEntry(oldStoreName);
      }

      reviews[index] = { storeName: newStoreName, priceRange, rating };
      saveSettings();
      await updateWorldBookEntry(newStoreName, priceRange, rating);
      showToast('测评已更新', 'success');
      dialog.remove();
      renderList();
      openManageDialog();
    });

    innerPanel.querySelector('#review-edit-cancel').onclick = () => {
      dialog.remove();
      openManageDialog();
    };
  }

  function renderList() {
    listEl.innerHTML = '';
    if (reviews.length === 0) {
      listEl.innerHTML = '<div style="color:#999;text-align:center;padding:20px;">暂无测评记录,点击"添加测评"开始</div>';
      return;
    }

    reviews.forEach((review, index) => {
      const div = document.createElement('div');
      div.style.marginBottom = '8px';
      div.style.padding = '8px';
      div.style.border = '1px solid #e0e0e0';
      div.style.borderRadius = '4px';
      div.style.background = '#fafafa';

      div.innerHTML = `
        <div style="font-weight:600;">${index + 1}. ${review.storeName}</div>
        <div style="font-size:12px;color:#666;margin-top:2px;">价格: ${review.priceRange || '未填写'}</div>
        <div style="font-size:12px;color:#666;">评价: ${review.rating || '未填写'}</div>
      `;

      listEl.appendChild(div);
    });
  }

  document.getElementById('ha-review-add').addEventListener('click', openAddDialog);
  document.getElementById('ha-review-manage').addEventListener('click', openManageDialog);

  renderList();
}















async function showBgm() {
  const container = content;
  container.style.display = 'block';
  container.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">🎵 背景音乐</div>

    <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;width:100%;">
      <input id="ha-bgm-tag-input" type="text" placeholder="标签名" style="flex:1;min-width:0;padding:4px;border:1px solid #ccc;border-radius:4px;">
      <button id="ha-bgm-add" class="ha-btn" style="flex-shrink:0;">➕</button>
      <button id="ha-bgm-del" class="ha-btn" style="flex-shrink:0;">🗑️</button>
      <button id="ha-bgm-star" class="ha-btn" style="flex-shrink:0;">⭐</button>
      <button id="ha-bgm-together" class="ha-btn" style="flex-shrink:0;">🎧</button>
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
  const togetherBtn = document.getElementById('ha-bgm-together');
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
        prompt = `请推荐${limit}首与"${kw}"相关的歌曲，"${kw}"中可能是歌名或歌手，格式为"歌名 - 歌手"。不要输出歌手和歌名以外的内容例如推荐语。`;
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
  let Current_Playing_Song = null;
  let Is_Currently_Playing = false;
  
  // 🎧 一起听歌状态
  let Listen_Together_Mode = false;

  // ==================== 一起听歌功能 ====================
  
  // 更新"一起听歌"按钮状态
  function updateTogetherBtnState() {
    if (togetherBtn) {
      togetherBtn.style.background = Listen_Together_Mode ? '#4CAF50' : '';
      togetherBtn.style.color = Listen_Together_Mode ? '#fff' : '';
      togetherBtn.title = Listen_Together_Mode ? '一起听歌模式已开启' : '点击开启一起听歌';
    }
  }
  
  // 同步当前播放歌曲到世界书
  async function syncListenTogetherEntry(name, artist) {
    if (!Listen_Together_Mode) return;
    
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) {
        debug('[一起听歌] 未找到健康生活助手世界书');
        return;
      }
      
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      
      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        if (!entry.disable && (entry.title === '一起听歌' || (entry.comment || '').includes('一起听歌'))) {
          targetUID = entry.uid;
          break;
        }
      }
      
      if (!targetUID) {
        debug('[一起听歌] 未找到"一起听歌"条目');
        toaster('未找到"一起听歌"世界书条目', 'warning');
        return;
      }
      
      const songLine = `正在与{{user}}一起听:${name} - ${artist}`;
      await ctx.SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, songLine);
      
      debug(`[一起听歌] 已同步: ${name} - ${artist}`);
    } catch (e) {
      debug('[一起听歌] 同步失败', e);
    }
  }
  
  // 清除世界书中的一起听歌条目
  async function clearListenTogetherEntry() {
    try {
      const fileId = await findHealthWorldFile();
      if (!fileId) return;
      
      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      
      let targetUID = null;
      for (const id in entries) {
        const entry = entries[id];
        if (!entry.disable && (entry.title === '一起听歌' || (entry.comment || '').includes('一起听歌'))) {
          targetUID = entry.uid;
          break;
        }
      }
      
      if (!targetUID) return;
      
      await ctx.SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, '');
      
      debug('[一起听歌] 已清除条目');
    } catch (e) {
      debug('[一起听歌] 清除失败', e);
    }
  }
  
  // 一起听歌按钮点击事件
  togetherBtn.onclick = async () => {
    Listen_Together_Mode = !Listen_Together_Mode;
    updateTogetherBtnState();
    
    if (Listen_Together_Mode) {
      toaster('🎧 一起听歌模式已开启', 'success');
      // 如果当前有播放歌曲，立即同步
      if (Current_Playing_Song && !Music_Audio.paused) {
        await syncListenTogetherEntry(Current_Playing_Song.name, Current_Playing_Song.artist);
      }
    } else {
      toaster('一起听歌模式已关闭', 'info');
      // 关闭时清除条目
      await clearListenTogetherEntry();
    }
  };

  // ==================== 悬浮栏功能 ====================

  function loadFloatBarPosition() {
    try {
      const saved = localStorage.getItem('ha-float-bar-position');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      debug('读取悬浮栏位置失败', e);
    }
    return { top: '50%', right: '10px', transform: 'translateY(-50%)' };
  }

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
      <div id="ha-float-lyric" style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#000;">等待播放...</div>
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
      width: 280px;
      z-index: 99998;
      cursor: move;
      user-select: none;
      transition: opacity 0.3s ease;
    `;

    const savedPos = loadFloatBarPosition();
    if (savedPos.top) floatBar.style.top = savedPos.top;
    if (savedPos.right) floatBar.style.right = savedPos.right;
    if (savedPos.left) floatBar.style.left = savedPos.left;
    if (savedPos.transform) floatBar.style.transform = savedPos.transform;

    if (window.innerWidth <= 768) {
      floatBar.style.fontSize = '12px';
      floatBar.style.padding = '6px 10px';
    }

    document.body.appendChild(floatBar);

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
      
      // 延迟检测宽度，确保文本已渲染
      setTimeout(() => {
        if (floatLyric.scrollWidth > floatLyric.clientWidth) {
          // 如果文本超出容器，添加重复文本用于无缝滚动
          floatLyric.innerHTML = `<span style="display:inline-block;">${text}&nbsp;&nbsp;&nbsp;${text}</span>`;
          const span = floatLyric.querySelector('span');
          if (span) {
            const scrollDistance = span.offsetWidth / 2;
            span.style.animation = `scroll-lyric-seamless ${Math.max(8, scrollDistance / 30)}s linear infinite`;
          }
        } else {
          floatLyric.style.animation = 'none';
        }
      }, 50);
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

  function showMusicPlayerWithoutReplay() {
    removeFloatBar();
    
    if (Current_Playing_Song) {
      openMusicPlayerUI(Current_Playing_Song.name, Current_Playing_Song.artist, true);
    }
  }

  if (!document.getElementById('ha-float-animations')) {
    const style = document.createElement('style');
    style.id = 'ha-float-animations';
    style.textContent = `
      @keyframes scroll-lyric-seamless {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
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

  // ==================== 播放器 UI ====================
  
  async function openMusicPlayer(name, artist) {
    await openMusicPlayerUI(name, artist, false);
  }

  async function openMusicPlayerUI(name, artist, skipPlay = false) {
    let existing = document.getElementById('ha-music-popup');
    
    // 🔧 核心修复1: 如果播放器已存在,只更新内容不重新创建
    if (existing && !skipPlay) {
      debug('[播放器] 已存在,只更新内容');
      
      // 更新标题
      const titleSpan = existing.querySelector('.ha-music-title');
      if (titleSpan) {
        titleSpan.textContent = `🎵 ${name} - ${artist}`;
      }
      
      // 播放新歌曲
      await playSong(name, artist);
      return;
    }
    
    // 播放器不存在,创建新的
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'ha-music-popup';
    popup.innerHTML = `
      <div style="
        background:#F8F8FF;color:#fff;border-radius:12px;
        width:90%;max-width:420px;max-height:80vh;
        position:fixed;
        left:50%;
        top:50px;
        transform:translate(-50%, 0%);
        box-shadow:0 4px 20px rgba(0,0,0,0.4);
        display:flex;flex-direction:column;
        overflow:hidden;z-index:99999;">
        
        <div style="padding:10px 16px;font-weight:600;color:#778899;display:flex;justify-content:space-between;align-items:center;">
          <span class="ha-music-title">🎵 ${name} - ${artist}</span>
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

    document.getElementById('ha-music-close').onclick = async () => {
      popup.remove();
      removeFloatBar();
      // 🎧 关闭播放器时清除一起听歌条目
      if (Listen_Together_Mode) {
        await clearListenTogetherEntry();
      }
    };

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

    if (skipPlay) {
      if (Lyrics_Data.length > 0) {
        renderLyrics();
      } else {
        const lyricBox = document.getElementById('ha-music-lyrics');
        if (lyricBox) {
          lyricBox.innerHTML = '<div style="padding:20px;color:#666;">暂无歌词</div>';
        }
      }
      
      const playBtn = document.getElementById('ha-play');
      if (playBtn) {
        playBtn.textContent = Music_Audio.paused ? '▶️' : '⏸️';
      }
      
      const progress = document.getElementById('ha-progress');
      if (progress && Music_Audio.duration) {
        progress.value = (Music_Audio.currentTime / Music_Audio.duration) * 100;
      }
      
      if (progress) {
        progress.oninput = e => {
          if (!Music_Audio.duration) return;
          const pct = e.target.value / 100;
          Music_Audio.currentTime = pct * Music_Audio.duration;
        };
      }
    } else {
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

  async function togglePlay() {
    const playBtn = document.getElementById('ha-play');
    if (Music_Audio.paused) {
      Music_Audio.play();
      if (playBtn) playBtn.textContent = '⏸️';
      Is_Currently_Playing = true;
      // 🎧 恢复播放时同步一起听歌
      if (Listen_Together_Mode && Current_Playing_Song) {
        await syncListenTogetherEntry(Current_Playing_Song.name, Current_Playing_Song.artist);
      }
    } else {
      Music_Audio.pause();
      if (playBtn) playBtn.textContent = '▶️';
      Is_Currently_Playing = false;
      // 🎧 暂停时清除一起听歌条目
      if (Listen_Together_Mode) {
        await clearListenTogetherEntry();
      }
    }
  }

  // 🔧 核心修复2: 切换歌曲时检查播放器是否存在
  function playPrev() {
    if (Music_List.length === 0) return;
    Music_Index = (Music_Index - 1 + Music_List.length) % Music_List.length;
    
    const popup = document.getElementById('ha-music-popup');
    if (popup) {
      // 播放器已打开,只更新内容
      openMusicPlayer(Music_List[Music_Index].name, Music_List[Music_Index].artist);
    } else if (Float_Bar_Active) {
      // 悬浮栏模式,直接播放不打开播放器
      playSongInBackground(Music_List[Music_Index].name, Music_List[Music_Index].artist);
    } else {
      // 都没打开,正常打开播放器
      openMusicPlayer(Music_List[Music_Index].name, Music_List[Music_Index].artist);
    }
  }

  function playNext() {
    if (Music_List.length === 0) return;
    if (Music_Mode === 'random')
      Music_Index = Math.floor(Math.random() * Music_List.length);
    else
      Music_Index = (Music_Index + 1) % Music_List.length;
    
    const popup = document.getElementById('ha-music-popup');
    if (popup) {
      // 播放器已打开,只更新内容
      openMusicPlayer(Music_List[Music_Index].name, Music_List[Music_Index].artist);
    } else if (Float_Bar_Active) {
      // 悬浮栏模式,直接播放不打开播放器
      playSongInBackground(Music_List[Music_Index].name, Music_List[Music_Index].artist);
    } else {
      // 都没打开,正常打开播放器
      openMusicPlayer(Music_List[Music_Index].name, Music_List[Music_Index].artist);
    }
  }

  // 🔧 新增: 后台播放(不显示UI)
  async function playSongInBackground(name, artist) {
    debug(`[后台播放] ${name} - ${artist}`);
    
    Current_Playing_Song = { name, artist };
    Is_Currently_Playing = true;
    
    Lyrics_Data = [];
    Current_Lyric_Index = -1;
    
    try {
      // 获取歌词
      const lyricData = await getLyricsData(name, artist);
      Lyrics_Data = parseLRC(lyricData.lrc);
      
      // 获取音源
      const url = await getMusicUrl(name, artist);
      
      if (!url) {
        toaster(`找不到音源: ${name} - ${artist}`, 'error');
        return;
      }
      
      // 播放
      Music_Audio.src = url;
      await Music_Audio.play();
      Music_Audio.ontimeupdate = updateLyrics;
      
      toaster(`🎵 ${name} - ${artist}`, 'success');
      
      // 🎧 同步一起听歌
      if (Listen_Together_Mode) {
        await syncListenTogetherEntry(name, artist);
      }
      
    } catch (error) {
      debug('[后台播放] 异常:', error);
      toaster('播放失败', 'error');
    }
  }

  // ==================== 播放歌曲 ====================
  
  async function playSong(name, artist) {
    const lyricBox = document.getElementById('ha-music-lyrics');
    if (!lyricBox) {
      debug('找不到歌词容器');
      return;
    }
    
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
      
      // 🎧 同步一起听歌
      if (Listen_Together_Mode) {
        await syncListenTogetherEntry(name, artist);
      }
      
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














async function showClearBook() {
  content.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;">
      <button id="ha-clear-sleep" class="ha-clear-btn">清除睡眠数据</button>
      <button id="ha-clear-diet" class="ha-clear-btn">清除饮食数据</button>
      <button id="ha-clear-mental" class="ha-clear-btn">清除心理数据</button>
      <button id="ha-clear-exercise" class="ha-clear-btn">清除运动数据</button>
      <button id="ha-clear-wishes" class="ha-clear-btn">清除心愿数据</button>
      <button id="ha-clear-social" class="ha-clear-btn">清除习惯数据</button>
      <button id="ha-clear-todo" class="ha-clear-btn">清除待办数据</button>
      <button id="ha-clear-memo" class="ha-clear-btn">清除Memo数据</button>
      <button id="ha-clear-wardrobe" class="ha-clear-btn">清除衣柜数据</button>
      <button id="ha-clear-finance" class="ha-clear-btn">清除收支数据</button>
      <button id="ha-clear-pomodoro" class="ha-clear-btn">清除番茄数据</button>
      <button id="ha-clear-music" class="ha-clear-btn">清除音乐数据</button>
      <button id="ha-clear-all" class="ha-clear-btn" style="grid-column: span 4;">全部清除</button>
    </div>
    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin-top:12px;">
      <button id="ha-auto-clear" class="ha-period-btn">自动清除</button>
      <button id="ha-clear-1day" class="ha-period-btn">1天</button>
      <button id="ha-clear-7day" class="ha-period-btn">7天</button>
      <button id="ha-clear-1month" class="ha-period-btn">1月</button>
    </div>
    <div id="ha-clear-debug" style="margin-top:8px;padding:6px;border:1px solid #ddd;font-size:12px;max-height:160px;overflow:auto;background:#fafafa;white-space:pre-wrap"></div>
  `;

  const debugEl = document.getElementById('ha-clear-debug');

  function debugLog(...args){
    const ts = new Date().toLocaleTimeString();
    const msg = `[${ts}] ` + args.map(a => typeof a==='string'?a:JSON.stringify(a)).join(' ');
    debugEl.innerText += msg + "\n";
    debugEl.scrollTop = debugEl.scrollHeight;
    console.log('[健康生活助手]', ...args);
  }

  // 加载清除模式设置
  function loadClearMode() {
    const settings = ctx.extensionSettings[MODULE_NAME] || {};
    const mode = settings.autoClearMode || null;
    if (mode) {
      document.querySelectorAll('.ha-period-btn').forEach(btn => {
        btn.style.backgroundColor = '';
        btn.style.color = '';
      });
      const btnId = mode === 1 ? 'ha-clear-1day' : mode === 7 ? 'ha-clear-7day' : 'ha-clear-1month';
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.style.backgroundColor = '#dc3545';
        btn.style.color = '#fff';
      }
    }
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

  async function clearWorldEntry(entryName){
    try{
      const fileId = await findHealthWorldFile();
      if(!fileId){ debugLog(`未找到世界书文件，跳过清空: ${entryName}`); return; }

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      let targetUID = null;

      for(const id in entries){
        const entry = entries[id];
        const comment = entry.comment || '';
        if(!entry.disable && (comment.toLowerCase().includes(entryName.toLowerCase()) || entry.title === entryName)){
          targetUID = entry.uid;
          debugLog('找到条目: uid=', targetUID, 'entryName=', entryName);
          break;
        }
      }

      if(!targetUID){ debugLog(`未找到条目 ${entryName}，跳过`); return; }

      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, '');

      debugLog(`世界书条目已清空: ${entryName}`);
    }catch(e){
      debugLog(`清空世界书 ${entryName} 异常:`, e.message || e);
    }
  }

  async function updateWorldEntry(entryName, content){
    try{
      const fileId = await findHealthWorldFile();
      if(!fileId){ debugLog(`未找到世界书文件，跳过更新: ${entryName}`); return; }

      const moduleWI = await import('/scripts/world-info.js');
      const worldInfo = await moduleWI.loadWorldInfo(fileId);
      const entries = worldInfo.entries || {};
      let targetUID = null;

      for(const id in entries){
        const entry = entries[id];
        const comment = entry.comment || '';
        if(!entry.disable && (comment.toLowerCase().includes(entryName.toLowerCase()) || entry.title === entryName)){
          targetUID = entry.uid;
          debugLog('找到条目: uid=', targetUID, 'entryName=', entryName);
          break;
        }
      }

      if(!targetUID){ debugLog(`未找到条目 ${entryName}，跳过`); return; }

      await globalThis.SillyTavern.getContext()
        .SlashCommandParser.commands['setentryfield']
        .callback({ file: fileId, uid: targetUID, field: 'content' }, content);

      debugLog(`世界书条目已更新: ${entryName}`);
    }catch(e){
      debugLog(`更新世界书 ${entryName} 异常:`, e.message || e);
    }
  }

  function clearLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      debugLog(`localStorage已清空: ${key}`);
    } catch (e) {
      debugLog(`清空localStorage ${key} 异常:`, e.message || e);
    }
  }

  async function clearSleep(){
    ctx.extensionSettings[MODULE_NAME].sleep = [];
    saveSettings();
    await clearWorldEntry('睡眠');
    alert('睡眠已清空');
  }

  async function clearDiet(){
    ctx.extensionSettings[MODULE_NAME].diet = [];
    saveSettings();
    await clearWorldEntry('饮食');
    alert('饮食已清空');
  }

  async function clearMental(){
    // 清除所有心理健康相关数据
    ctx.extensionSettings[MODULE_NAME].mental = [];
    ctx.extensionSettings[MODULE_NAME].meditation = [];
    ctx.extensionSettings[MODULE_NAME].thoughtChains = [];
    ctx.extensionSettings[MODULE_NAME].confessions = [];
    saveSettings();
    
    // 清除所有相关世界书条目
    await clearWorldEntry('心理');
    await clearWorldEntry('冥想');
    await clearWorldEntry('思维链');
    await clearWorldEntry('忏悔');
    await clearWorldEntry('注意力转移');
    
    debugLog('心理健康数据已全部清空: mental, meditation, thoughtChains, confessions');
    alert('心理数据已清空(包括情绪、冥想、思维链、忏悔、注意力转移)');
  }

  async function clearExercise(){
    ctx.extensionSettings[MODULE_NAME].exercise = [];
    saveSettings();
    await clearWorldEntry('运动');
    alert('运动已清空');
  }

  async function clearWishes(){
    ctx.extensionSettings[MODULE_NAME].wishes = [];
    saveSettings();
    await clearWorldEntry('心愿');
    alert('心愿已清空');
  }

  async function clearSocial(){
    ctx.extensionSettings[MODULE_NAME].social = {};
    saveSettings();
    await clearWorldEntry('习惯');
    alert('习惯已清空');
  }

  async function clearTodo(){
    ctx.extensionSettings[MODULE_NAME].todo = [];
    saveSettings();
    await clearWorldEntry('待办');
    alert('待办已清空');
  }

  async function clearMemo(){
    ctx.extensionSettings[MODULE_NAME].memo = [];
    saveSettings();
    await clearWorldEntry('memo');
    alert('Memo已清空');
  }

  async function clearWardrobe(){
    ctx.extensionSettings[MODULE_NAME].wardrobe = {
      items: [],
      tags: {
        top: [],
        bottom: [],
        shoes: [],
        accessory: [],
        outfit: []
      }
    };
    saveSettings();
    clearLocalStorage('wardrobe');
    await clearWorldEntry('衣柜');
    alert('衣柜已清空');
  }

  async function clearFinance() {
    ctx.extensionSettings[MODULE_NAME].finance = {
      incomeTags: [],
      expenseTags: [],
      records: []
    };
    saveSettings();
    clearLocalStorage('ha-finance');
    await clearWorldEntry('收入');
    await clearWorldEntry('支出');
    alert('财务数据已清除');
  }

  async function clearPomodoro(){
    ctx.extensionSettings[MODULE_NAME].pomodoro = {
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
    };
    saveSettings();
    clearLocalStorage('pomodoro');
    await clearWorldEntry('专注记录');
    await clearWorldEntry('专注统计');
    alert('番茄已清空');
  }

  async function clearMusic(){
    ctx.extensionSettings[MODULE_NAME].music = [];
    saveSettings();
    clearLocalStorage('music');
    await clearWorldEntry('❤️音乐');
    await clearWorldEntry('🖤音乐');
    alert('音乐已清空');
  }

  async function clearAll(){
    // 清除各模块数据，但保留正确的数据结构
    ctx.extensionSettings[MODULE_NAME].sleep = [];
    ctx.extensionSettings[MODULE_NAME].diet = [];
    ctx.extensionSettings[MODULE_NAME].mental = [];
    ctx.extensionSettings[MODULE_NAME].meditation = [];
    ctx.extensionSettings[MODULE_NAME].thoughtChains = [];
    ctx.extensionSettings[MODULE_NAME].confessions = [];
    ctx.extensionSettings[MODULE_NAME].exercise = [];
    ctx.extensionSettings[MODULE_NAME].wishes = [];
    ctx.extensionSettings[MODULE_NAME].social = {};
    ctx.extensionSettings[MODULE_NAME].todo = [];
    ctx.extensionSettings[MODULE_NAME].memo = [];

    ctx.extensionSettings[MODULE_NAME].wardrobe = {
      items: [],
      tags: {
        top: [],
        bottom: [],
        shoes: [],
        accessory: [],
        outfit: []
      }
    };

    ctx.extensionSettings[MODULE_NAME].finance = {
      incomeTags: [],
      expenseTags: [],
      records: []
    };

    ctx.extensionSettings[MODULE_NAME].pomodoro = {
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
    };
    
    ctx.extensionSettings[MODULE_NAME].music = [];

    saveSettings();

    // 清除 localStorage
    clearLocalStorage('wardrobe');
    clearLocalStorage('finance');
    clearLocalStorage('pomodoro');
    clearLocalStorage('music');

    // 清除世界书条目
    await clearWorldEntry('睡眠');
    await clearWorldEntry('饮食');
    await clearWorldEntry('心理');
    await clearWorldEntry('冥想');
    await clearWorldEntry('思维链');
    await clearWorldEntry('忏悔');
    await clearWorldEntry('注意力转移');
    await clearWorldEntry('运动');
    await clearWorldEntry('心愿');
    await clearWorldEntry('习惯');
    await clearWorldEntry('待办');
    await clearWorldEntry('memo');
    await clearWorldEntry('衣柜');
    await clearWorldEntry('收入');
    await clearWorldEntry('支出');
    await clearWorldEntry('专注记录');
    await clearWorldEntry('专注统计');
    await clearWorldEntry('❤️音乐');
    await clearWorldEntry('🖤音乐');

    alert('全部数据已清空（保留API配置）');
  }

  // 解析文本日期时间格式 "2025/10/12 15:05:36"
  function parseTextDate(line) {
    const match = line.match(/^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/);
    if (match) {
      return new Date(match[1].replace(/\//g, '-'));
    }
    return null;
  }

  // 解析待办截止日期 "截止:2025-10-17T00:00"
  function parseTodoDate(line) {
    const match = line.match(/截止:(\d{4}-\d{2}-\d{2}T?\d{0,2}:?\d{0,2})/);
    if (match) {
      return new Date(match[1]);
    }
    return null;
  }

  // 检查待办是否已完成
  function isTodoCompleted(line) {
    return line.includes('[完成]') || line.includes('[过期]');
  }

  // 清除过期数据
  async function clearExpiredData(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTime = cutoffDate.getTime();

    debugLog(`开始清除 ${days} 天前的数据，截止时间: ${cutoffDate.toLocaleString()}`);

    const settings = ctx.extensionSettings[MODULE_NAME] || {};
    
    // 从世界书读取数据并清除
    const fileId = await findHealthWorldFile();
    if (!fileId) {
      debugLog('未找到世界书文件，无法清除');
      alert('未找到世界书文件');
      return;
    }

    const moduleWI = await import('/scripts/world-info.js');
    const worldInfo = await moduleWI.loadWorldInfo(fileId);
    const entries = worldInfo.entries || {};

    // 时间相关模块 - 按照时间删除localStorage和世界书
    const timeBasedModules = {
      '睡眠': 'sleep',
      '饮食': 'diet',
      '心理': 'mental',
      '冥想': 'meditation',
      '思维链': 'thoughtChains',
      '忏悔': 'confessions',
      '运动': 'exercise',
      'memo': 'memo'
    };
    
    for (const [entryName, storageKey] of Object.entries(timeBasedModules)) {
      // 查找对应的世界书条目
      let targetUID = null;
      let targetEntry = null;
      
      for (const id in entries) {
        const entry = entries[id];
        const comment = entry.comment || '';
        if (!entry.disable && (comment.includes(entryName) || entry.title === entryName)) {
          targetUID = entry.uid;
          targetEntry = entry;
          debugLog(`找到条目: ${entryName}, uid=${targetUID}`);
          break;
        }
      }

      if (!targetEntry || !targetEntry.content) {
        debugLog(`条目 ${entryName} 无内容，跳过`);
        continue;
      }

      // 按行分割内容
      const lines = targetEntry.content.split('\n');
      const filteredLines = [];
      let removed = 0;

      for (const line of lines) {
        if (!line.trim()) {
          filteredLines.push(line);
          continue;
        }

        const lineDate = parseTextDate(line);
        if (lineDate && lineDate.getTime() < cutoffTime) {
          removed++;
          debugLog(`删除过期行: ${line.substring(0, 50)}...`);
        } else {
          filteredLines.push(line);
        }
      }

      if (removed > 0) {
        debugLog(`${entryName}: 删除 ${removed} 条过期数据，剩余 ${filteredLines.length} 行`);
        const newContent = filteredLines.join('\n');
        await updateWorldEntry(entryName, newContent);
        
        // 同时清除localStorage中的过期数据
        if (settings[storageKey] && Array.isArray(settings[storageKey])) {
          const originalLength = settings[storageKey].length;
          settings[storageKey] = settings[storageKey].filter(item => {
            const itemDate = item.ts ? new Date(item.ts) : null;
            return !itemDate || itemDate.getTime() >= cutoffTime;
          });
          const removedFromStorage = originalLength - settings[storageKey].length;
          if (removedFromStorage > 0) {
            debugLog(`${storageKey}: 从localStorage删除 ${removedFromStorage} 条过期数据`);
          }
        }
      }
    }

    // 待办(todo): 仅清除过期且已完成的
    let todoUID = null;
    let todoEntry = null;
    
    for (const id in entries) {
      const entry = entries[id];
      const comment = entry.comment || '';
      if (!entry.disable && (comment.includes('待办') || entry.title === '待办')) {
        todoUID = entry.uid;
        todoEntry = entry;
        debugLog(`找到待办条目, uid=${todoUID}`);
        break;
      }
    }

    if (todoEntry && todoEntry.content) {
      const lines = todoEntry.content.split('\n');
      const filteredLines = [];
      let removed = 0;

      for (const line of lines) {
        if (!line.trim()) {
          filteredLines.push(line);
          continue;
        }

        const todoDate = parseTodoDate(line);
        const isCompleted = isTodoCompleted(line);
        
        // 只删除过期且已完成的
        if (todoDate && todoDate.getTime() < cutoffTime && isCompleted) {
          removed++;
          debugLog(`删除过期待办: ${line.substring(0, 50)}...`);
        } else {
          filteredLines.push(line);
        }
      }

      if (removed > 0) {
        debugLog(`待办: 删除 ${removed} 条过期且已完成的待办，剩余 ${filteredLines.length} 行`);
        const newContent = filteredLines.join('\n');
        await updateWorldEntry('待办', newContent);
        clearLocalStorage('todo');
      }
    }

    // 用户衣柜(wardrobe): localStorage不删除，清空世界书条目
    let wardrobeUID = null;
    let wardrobeEntry = null;
    
    for (const id in entries) {
      const entry = entries[id];
      const comment = entry.comment || '';
      if (!entry.disable && (comment.includes('衣柜') || entry.title === '衣柜')) {
        wardrobeUID = entry.uid;
        wardrobeEntry = entry;
        debugLog(`找到衣柜条目, uid=${wardrobeUID}`);
        break;
      }
    }

    if (wardrobeEntry && wardrobeEntry.content) {
      await clearWorldEntry('衣柜');
      debugLog('衣柜世界书条目已清空');
    }

    // 注意力转移: 清空世界书条目
    await clearWorldEntry('注意力转移');
    debugLog('注意力转移世界书条目已清空');

    // 收支平衡(finance)、心愿清单(wishes)、音乐(music): 不删除
    debugLog(`finance, wishes, music: 跳过清除（保留所有数据）`);

    // 番茄钟(pomodoro)和习惯(social): 不删除
    debugLog(`pomodoro, social: 跳过清除（保留所有数据）`);

    // 同步更新extensionSettings
    saveSettings();
    debugLog(`清除完成！`);
    alert(`已清除 ${days} 天前的过期数据`);
  }

  // 设置定期清除
  function setupAutoClear() {
    const settings = ctx.extensionSettings[MODULE_NAME] || {};
    const mode = settings.autoClearMode;
    
    if (!mode) {
      debugLog('未设置自动清除模式');
      return;
    }

    const lastClear = settings.lastAutoClear || 0;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    let shouldClear = false;
    
    if (mode === 1) {
      // 每天清除
      shouldClear = (now - lastClear) >= dayMs;
    } else if (mode === 7) {
      // 每7天清除
      shouldClear = (now - lastClear) >= (7 * dayMs);
    } else if (mode === 30) {
      // 每30天清除
      shouldClear = (now - lastClear) >= (30 * dayMs);
    }

    if (shouldClear) {
      debugLog(`自动清除模式: ${mode}天，执行清除`);
      clearExpiredData(mode).then(() => {
        settings.lastAutoClear = now;
        saveSettings();
      });
    }
  }

  // 按钮事件
  document.getElementById('ha-clear-sleep').addEventListener('click', clearSleep);
  document.getElementById('ha-clear-diet').addEventListener('click', clearDiet);
  document.getElementById('ha-clear-mental').addEventListener('click', clearMental);
  document.getElementById('ha-clear-exercise').addEventListener('click', clearExercise);
  document.getElementById('ha-clear-wishes').addEventListener('click', clearWishes);
  document.getElementById('ha-clear-social').addEventListener('click', clearSocial);
  document.getElementById('ha-clear-todo').addEventListener('click', clearTodo);
  document.getElementById('ha-clear-memo').addEventListener('click', clearMemo);
  document.getElementById('ha-clear-wardrobe').addEventListener('click', clearWardrobe);
  document.getElementById('ha-clear-finance').addEventListener('click', clearFinance);
  document.getElementById('ha-clear-pomodoro').addEventListener('click', clearPomodoro);
  document.getElementById('ha-clear-music').addEventListener('click', clearMusic);
  document.getElementById('ha-clear-all').addEventListener('click', clearAll);

  // 周期清除按钮
  document.getElementById('ha-clear-1day').addEventListener('click', async () => {
    await clearExpiredData(1);
    document.querySelectorAll('.ha-period-btn').forEach(btn => {
      btn.style.backgroundColor = '';
      btn.style.color = '';
    });
    document.getElementById('ha-clear-1day').style.backgroundColor = '#dc3545';
    document.getElementById('ha-clear-1day').style.color = '#fff';
    ctx.extensionSettings[MODULE_NAME].autoClearMode = 1;
    saveSettings();
  });

  document.getElementById('ha-clear-7day').addEventListener('click', async () => {
    await clearExpiredData(7);
    document.querySelectorAll('.ha-period-btn').forEach(btn => {
      btn.style.backgroundColor = '';
      btn.style.color = '';
    });
    document.getElementById('ha-clear-7day').style.backgroundColor = '#dc3545';
    document.getElementById('ha-clear-7day').style.color = '#fff';
    ctx.extensionSettings[MODULE_NAME].autoClearMode = 7;
    saveSettings();
  });

  document.getElementById('ha-clear-1month').addEventListener('click', async () => {
    await clearExpiredData(30);
    document.querySelectorAll('.ha-period-btn').forEach(btn => {
      btn.style.backgroundColor = '';
      btn.style.color = '';
    });
    document.getElementById('ha-clear-1month').style.backgroundColor = '#dc3545';
    document.getElementById('ha-clear-1month').style.color = '#fff';
    ctx.extensionSettings[MODULE_NAME].autoClearMode = 30;
    saveSettings();
  });

  document.getElementById('ha-auto-clear').addEventListener('click', () => {
    const settings = ctx.extensionSettings[MODULE_NAME] || {};
    if (!settings.autoClearMode) {
      alert('请先选择清除周期（1天/7天/1月）');
      return;
    }
    debugLog(`启动自动清除模式: ${settings.autoClearMode}天`);
    setupAutoClear();
    alert(`自动清除已启动，将按 ${settings.autoClearMode} 天周期清除过期数据`);
  });

  // 加载设置并初始化
  loadClearMode();
  setupAutoClear();
}



      // ------------- 完整独立 API 配置模块（集成参考代码） -------------
  function showApiConfig(){
        content.style.display = 'block';
        // 使 content 相对定位，便于右上角设置按钮定位
        content.style.position = 'relative';
        const cfg = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
        content.innerHTML = `
          <div style="font-weight:600;margin-bottom:6px">独立 API 配置</div>

          <div style="margin-bottom:10px">
            <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">API 类型</label>
            <select id="ha-api-type" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px">
              <option value="standard">标准 API（自动获取模型列表）</option>
              <option value="custom">自定义 API（手动输入完整信息）</option>
            </select>
          </div>

          <div id="ha-standard-api-section">
            <div style="margin-bottom:6px">
              <label style="font-size:12px;color:#666;display:block">API URL</label>
              <input id="ha-api-url" type="text" style="width:100%;padding:6px" value="${cfg.url || ''}" placeholder="例如: https://api.example.com" />
            </div>

            <div style="margin-bottom:6px">
              <label style="font-size:12px;color:#666;display:block">API Key</label>
              <input id="ha-api-key" type="text" style="width:100%;padding:6px" value="${cfg.key || ''}" placeholder="sk-..." />
            </div>

            <div style="margin-bottom:6px">
              <label style="font-size:12px;color:#666;display:block">模型</label>
              <select id="ha-api-model" style="width:100%;padding:6px"></select>
            </div>

            <div style="display:flex;gap:8px;margin-bottom:6px">
              <button id="ha-api-save" class="ha-btn" style="flex:1">保存配置</button>
              <button id="ha-api-test" class="ha-btn" style="flex:1">测试连接</button>
              <button id="ha-api-refresh" class="ha-btn" style="flex:1">刷新模型</button>
            </div>
          </div>

          <div id="ha-custom-api-section" style="display:none">
            <div style="margin-bottom:6px">
              <label style="font-size:12px;color:#666;display:block">完整 API URL</label>
              <input id="ha-custom-url" type="text" style="width:100%;padding:6px" value="${cfg.customUrl || ''}" placeholder="例如: https://api.example.com/v1/chat/completions" />
              <div style="font-size:11px;color:#999;margin-top:2px">请输入完整的API端点地址</div>
            </div>

            <div style="margin-bottom:6px">
              <label style="font-size:12px;color:#666;display:block">完整 API Key</label>
              <input id="ha-custom-key" type="text" style="width:100%;padding:6px" value="${cfg.customKey || ''}" placeholder="Bearer token 或其他认证信息" />
            </div>

            <div style="margin-bottom:6px">
              <label style="font-size:12px;color:#666;display:block">完整模型名称</label>
              <input id="ha-custom-model" type="text" style="width:100%;padding:6px" value="${cfg.customModel || ''}" placeholder="例如: gpt-4, claude-3-opus-20240229" />
            </div>

            <div style="display:flex;gap:8px;margin-bottom:6px">
              <button id="ha-custom-save" class="ha-btn" style="flex:1">保存自定义配置</button>
              <button id="ha-custom-test" class="ha-btn" style="flex:1">测试连接</button>
            </div>
          </div>

          <div id="ha-api-status" class="ha-small"></div>
        `;

        // 小齿轮按钮（参考）
        const apiBtn = document.createElement('button');
        apiBtn.textContent = '⚙️';
        Object.assign(apiBtn.style, {
          position: 'absolute',
          top: '6px',
          right: '6px',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          fontSize: '16px'
        });
        content.appendChild(apiBtn);

        const apiModule = document.createElement('div');
        apiModule.id = 'api-module';
        Object.assign(apiModule.style, {
          marginTop: '28px',
          display: 'none'
        });
        content.appendChild(apiModule);

        apiBtn.addEventListener('click', async () => {
          apiModule.style.display = apiModule.style.display === 'none' ? 'block' : 'none';
          debugLog('切换API设置面板', apiModule.style.display);
          // 当面板第一次打开时，尝试自动拉取模型（如果未曾拉取过）
          if (apiModule.style.display === 'block') {
            try {
              await fetchAndPopulateModels(false); // 不强制，第一次会拉取一次并记录时间
            } catch (e) {
              // fetch 内部已经有 debugLog，这里仅捕获防止未处理的 promise
            }
          }
        });

        // API模块表单（包含刷新模型按钮）
        // （因已在 content.innerHTML 中提供基础表单，这里只负责将 apiModule 放置用于额外展示）
        apiModule.innerHTML = `
          <div style="font-size:12px;color:#666">（模型列表与额外信息会出现在此区域）</div>
        `;

        // 载入已有配置到 localStorage 兼容（保持向后兼容）
        const modelSelect = document.getElementById('ha-api-model');
        const savedModel = localStorage.getItem('independentApiModel') || cfg.model || '';
        const apiTypeSelect = document.getElementById('ha-api-type');
        const standardSection = document.getElementById('ha-standard-api-section');
        const customSection = document.getElementById('ha-custom-api-section');

        // 恢复API类型选择
        const savedApiType = localStorage.getItem('independentApiType') || cfg.apiType || 'standard';
        apiTypeSelect.value = savedApiType;
        
        // 根据API类型显示对应区域
        function toggleApiSections() {
          if (apiTypeSelect.value === 'custom') {
            standardSection.style.display = 'none';
            customSection.style.display = 'block';
          } else {
            standardSection.style.display = 'block';
            customSection.style.display = 'none';
          }
        }
        
        toggleApiSections();
        
        // 监听API类型变化
        apiTypeSelect.addEventListener('change', () => {
          toggleApiSections();
          localStorage.setItem('independentApiType', apiTypeSelect.value);
          debugLog('切换API类型', apiTypeSelect.value);
        });

        // populateModelSelect 函数
        function populateModelSelect(models) {
          modelSelect.innerHTML = '';
          const uniq = Array.from(new Set(models || []));
          uniq.forEach(m => {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = m;
            modelSelect.appendChild(option);
          });
          if (savedModel) {
            let existing = Array.from(modelSelect.options).find(o => o.value === savedModel);
            if (existing) {
              existing.textContent = savedModel + '（已保存）';
              modelSelect.value = savedModel;
            } else {
              const opt = document.createElement('option');
              opt.value = savedModel;
              opt.textContent = savedModel + '（已保存）';
              modelSelect.insertBefore(opt, modelSelect.firstChild);
              modelSelect.value = savedModel;
            }
          } else if (modelSelect.options.length > 0) {
            modelSelect.selectedIndex = 0;
          }
        }

        const storedModelsRaw = localStorage.getItem('independentApiModels');
        if (storedModelsRaw) {
          try {
            const arr = JSON.parse(storedModelsRaw);
            if (Array.isArray(arr)) populateModelSelect(arr);
          } catch (e) { /* ignore parse errors */ }
        } else if (savedModel) {
          const option = document.createElement('option');
          option.value = savedModel;
          option.textContent = savedModel + '（已保存）';
          modelSelect.appendChild(option);
          modelSelect.value = savedModel;
        }

        // 保存配置
        document.getElementById('ha-api-save').addEventListener('click', () => {
          const url = document.getElementById('ha-api-url').value;
          const key = document.getElementById('ha-api-key').value;
          const model = modelSelect.value;
          if(!url || !model) {
            alert('请完整填写API信息（至少 URL 与 模型）');
            return;
          }
          // 将 Key 视为可选（但通常需要）
          localStorage.setItem('independentApiUrl', url);
          if (key) localStorage.setItem('independentApiKey', key);
          if (model) localStorage.setItem('independentApiModel', model);
          localStorage.setItem('independentApiType', 'standard');
          // 同步到 extensionSettings
          ctx.extensionSettings[MODULE_NAME].apiConfig = { url, key, model, apiType: 'standard' };
          saveSettings();
          // 标记选中 option 为已保存样式
          Array.from(modelSelect.options).forEach(o => {
            if (o.value === model) o.textContent = model + '（已保存）';
            else if (o.textContent.endsWith('（已保存）')) o.textContent = o.value;
          });
          document.getElementById('ha-api-status').textContent = '已保存';
          debugLog('保存API配置', {url, model});
        });

        // 保存自定义API配置
        document.getElementById('ha-custom-save').addEventListener('click', () => {
          const customUrl = document.getElementById('ha-custom-url').value.trim();
          const customKey = document.getElementById('ha-custom-key').value.trim();
          const customModel = document.getElementById('ha-custom-model').value.trim();
          
          if (!customUrl || !customModel) {
            alert('请至少填写完整 API URL 和模型名称');
            return;
          }
          
          // 保存到 localStorage
          localStorage.setItem('independentApiCustomUrl', customUrl);
          localStorage.setItem('independentApiCustomKey', customKey);
          localStorage.setItem('independentApiCustomModel', customModel);
          localStorage.setItem('independentApiType', 'custom');
          
          // 同步到 extensionSettings
          ctx.extensionSettings[MODULE_NAME].apiConfig = {
            customUrl,
            customKey,
            customModel,
            apiType: 'custom'
          };
          saveSettings();
          
          document.getElementById('ha-api-status').textContent = '自定义API配置已保存';
          debugLog('保存自定义API配置', { customUrl, customModel });
        });

        // 测试自定义API连接
        document.getElementById('ha-custom-test').addEventListener('click', async () => {
          const customUrl = document.getElementById('ha-custom-url').value.trim() || localStorage.getItem('independentApiCustomUrl');
          const customKey = document.getElementById('ha-custom-key').value.trim() || localStorage.getItem('independentApiCustomKey');
          const customModel = document.getElementById('ha-custom-model').value.trim() || localStorage.getItem('independentApiCustomModel');
          
          if (!customUrl || !customModel) {
            alert('请至少填写完整 API URL 和模型名称');
            return;
          }
          
          document.getElementById('ha-api-status').textContent = '正在测试自定义API...';
          debugLog('测试自定义API开始', { customUrl, customModel });
          
          try {
            const headers = {
              'Content-Type': 'application/json'
            };
            
            // 如果提供了key，添加到headers
            if (customKey) {
              // 判断是否已经包含Bearer前缀
              if (customKey.toLowerCase().startsWith('bearer ')) {
                headers['Authorization'] = customKey;
              } else {
                headers['Authorization'] = `Bearer ${customKey}`;
              }
            }
            
            const res = await fetch(customUrl, {
              method: 'POST',
              headers: headers,
              body: JSON.stringify({
                model: customModel,
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 1
              })
            });
            
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`HTTP ${res.status}: ${errorText}`);
            }
            
            const data = await res.json();
            document.getElementById('ha-api-status').textContent = `自定义API测试成功！模型 ${customModel} 可用`;
            debugLog('自定义API测试成功', data);
          } catch (e) {
            document.getElementById('ha-api-status').textContent = '自定义API连接失败: ' + (e.message || e);
            debugLog('自定义API测试失败', e.message || e);
          }
        });

        // 测试连接（优先 GET /v1/models/{model}，fallback 到 chat/completions）
        document.getElementById('ha-api-test').addEventListener('click', async () => {
          const urlRaw = document.getElementById('ha-api-url').value || localStorage.getItem('independentApiUrl');
          const key = document.getElementById('ha-api-key').value || localStorage.getItem('independentApiKey');
          const model = modelSelect.value || localStorage.getItem('independentApiModel');

          if (!urlRaw || !model) return alert('请至少填写 API URL 与 模型');

          const baseUrl = urlRaw.replace(/\/$/, '');
          document.getElementById('ha-api-status').textContent = '正在测试模型：' + model + ' ...';
          debugLog('测试连接开始', { baseUrl, model });

          try {
            // 1) 先尝试 GET /v1/models/{model}（许多实现支持）
            let res = await fetch(`${baseUrl}/v1/models/${encodeURIComponent(model)}`, {
              headers: { ...(key ? { 'Authorization': `Bearer ${key}` } : {}) }
            });

            if (res.ok) {
              const info = await res.json();
              document.getElementById('ha-api-status').textContent = `模型 ${model} 可用（metadata 校验通过）`;
              debugLog('GET /v1/models/{model} 成功', info);
              return;
            }

            // 2) 若 1) 不可用，退回到一次极轻量的 chat/completions 验证
            debugLog('GET model 信息失败，尝试用 chat/completions 验证', { status: res.status });
            res = await fetch(`${baseUrl}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                ...(key ? { 'Authorization': `Bearer ${key}` } : {}),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 1
              })
            });

            if (!res.ok) throw new Error(`chat/completions 返回 HTTP ${res.status}`);

            const data = await res.json();
            document.getElementById('ha-api-status').textContent = `模型 ${model} 可用（通过 chat/completions 验证）`;
            debugLog('chat/completions 验证成功', data);
          } catch (e) {
            document.getElementById('ha-api-status').textContent = '连接失败: ' + (e.message || e);
            debugLog('测试连接失败', e.message || e);
          }
        });

        // 刷新模型（手动强制拉取）
        document.getElementById('ha-api-refresh').addEventListener('click', async () => {
          debugLog('手动触发刷新模型');
          await fetchAndPopulateModels(true); // 强制拉取
        });

        // 解析常见的模型列表响应结构，返回字符串数组（模型 id）
        function parseModelIdsFromResponse(data) {
          try {
            if (!data) return [];
            if (Array.isArray(data.data)) return data.data.map(m => m.id || m.model || m.name).filter(Boolean);
            if (Array.isArray(data.models)) return data.models.map(m => m.id || m.model || m.name).filter(Boolean);
            if (Array.isArray(data)) return data.map(m => m.id || m.model || m.name).filter(Boolean);
            // 有些实现直接返回 { model: 'xxx' } 或 { id: 'xxx' }
            if (data.model) return [data.model];
            if (data.id) return [data.id];
          } catch (e) { /* ignore */ }
          return [];
        }

        // 从独立 API 拉取模型并填充下拉框。
        // force=true 表示绕过“记过一次”的检查，强制拉取。
        async function fetchAndPopulateModels(force = false) {
          const url = document.getElementById('ha-api-url').value || localStorage.getItem('independentApiUrl');
          const key = document.getElementById('ha-api-key').value || localStorage.getItem('independentApiKey');
          if (!url || !key) {
            debugLog('拉取模型失败', '未配置 URL 或 Key');
            document.getElementById('ha-api-status').textContent = '请先在上方填写 API URL 和 API Key，然后保存或点击刷新。';
            return;
          }

          const lastFetch = localStorage.getItem('independentApiModelsFetchedAt');
          if (!force && lastFetch) {
            // 已经记录过一次拉取时间，不再自动重复拉取（可以手动刷新）
            const ts = new Date(parseInt(lastFetch, 10));
            document.getElementById('ha-api-status').textContent = `模型已在 ${ts.toLocaleString()} 拉取过一次。若需更新请点击“刷新模型”。`;
            debugLog('跳过自动拉取模型（已记过一次）', { lastFetch: ts.toString() });
            return;
          }

          document.getElementById('ha-api-status').textContent = '正在拉取模型...';
          debugLog('开始拉取模型', { url, force });
          try {
            const res = await fetch(`${url.replace(/\/$/, '')}/v1/models`, {
              headers: { ...(key ? { 'Authorization': `Bearer ${key}` } : {}) }
            });
            if(!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            debugLog('拉取模型返回原始数据', data);

            const ids = parseModelIdsFromResponse(data);
            if (ids.length === 0) {
              document.getElementById('ha-api-status').textContent = '未从 API 返回可用模型。';
              debugLog('未解析到模型ID', data);
              return;
            }

            // 保存模型列表到 localStorage（便于下次加载）
            localStorage.setItem('independentApiModels', JSON.stringify(ids));
            const now = Date.now();
            localStorage.setItem('independentApiModelsFetchedAt', String(now)); // 记过一次（时间戳）
            populateModelSelect(ids);

            document.getElementById('ha-api-status').textContent = `拉取成功，已填充 ${ids.length} 个模型（最后拉取: ${new Date(now).toLocaleString()}）。`;
            debugLog('拉取模型成功', { count: ids.length, first: ids[0] });
          } catch (e) {
            document.getElementById('ha-api-status').textContent = '拉取模型失败: ' + e.message;
            debugLog('拉取模型失败', e.message);
          }
        }

        // 首次打开时尝试拉取（非强制：会遵循已拉取过则不重复）
        fetchAndPopulateModels(false);
      }
// 启动时检查
checkAndPerformSleepAutoClean();
checkAndPerformDietAutoClean();
checkAndPerformExerciseAutoClean();
checkAndPerformMentalAutoClean();
checkAndPerformMemoAutoClean();
checkAndPerformFinanceAutoClean();  // 添加财务定期清除检查
// 延迟执行清除(确保所有模块初始化完成)
setTimeout(() => {
  performAllAutoClean();
}, 2000);
// 每小时检查一次（在04:00-05:00之间会触发）
setInterval(() => {
  checkAndPerformSleepAutoClean();
  checkAndPerformDietAutoClean();
  checkAndPerformExerciseAutoClean();
  checkAndPerformMentalAutoClean();
  checkAndPerformMemoAutoClean();
  checkAndPerformFinanceAutoClean();  // 添加财务定期清除检查
}, 60 * 60 * 1000);


     

    } catch (err) {
      console.error('健康生活助手初始化失败', err);
    }
  });
})();
