# 模块提取完成报告

## 概述

成功从 `/home/user/healthy-life-helper/index.js` 中提取了 15 个模块文件到 `/home/user/healthy-life-helper/src/` 目录。

## 创建的文件清单

### 工具函数模块

**1. src/utils.js** (3.4K)
- 导出函数: `enableDrag(element)`
- 功能: 拖拽功能，适配手机端和桌面端
- 原始位置: index.js line 257-380

### 功能模块

**2. src/showWardrobe.js** (29K)
- 导出函数: `showWardrobe(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 用户衣柜管理
- 原始位置: index.js line 468-1212
- 内部辅助函数: updateWardrobeWorldInfo, renderItems, renderTags 等

**3. src/showPomodoro.js** (32K)
- 导出函数: `showPomodoro(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 专注番茄钟（后台计时 + 系统通知）
- 原始位置: index.js line 1215-2116

**4. src/showRoutine.js** (12K)
- 导出函数: `showRoutine(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 规律作息管理
- 原始位置: index.js line 2117-2395

**5. src/showDiet.js** (6.6K)
- 导出函数: `showDiet(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 健康饮食记录
- 原始位置: index.js line 2396-2559

**6. src/showMental.js** (32K)
- 导出函数: `showMental(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 心理健康管理
- 原始位置: index.js line 2560-3280

**7. src/showExercise.js** (6.2K)
- 导出函数: `showExercise(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 适度运动记录
- 原始位置: index.js line 3281-3436

**8. src/showFinance.js** (12K)
- 导出函数: `showFinance(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 收支平衡管理
- 原始位置: index.js line 3437-3703

**9. src/showWishes.js** (5.1K)
- 导出函数: `showWishes(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 心愿清单
- 原始位置: index.js line 3704-3838

**10. src/showSocial.js** (5.7K)
- 导出函数: `showSocial(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 习惯养成（社交相关）
- 原始位置: index.js line 3839-3981

**11. src/showTodo.js** (22K)
- 导出函数: `showTodo(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 待办事项管理
- 原始位置: index.js line 3982-4499
- 内部辅助函数: scheduleNotification 等

**12. src/showMemo.js** (7.2K)
- 导出函数: `showMemo(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 随笔备忘录
- 原始位置: index.js line 4500-4725

**13. src/showBgm.js** (35K)
- 导出函数: `showBgm(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 背景音乐管理
- 原始位置: index.js line 4726-5769

**14. src/showClearBook.js** (23K)
- 导出函数: `showClearBook(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 清除数据
- 原始位置: index.js line 5770-6433

**15. src/showApiConfig.js** (13K)
- 导出函数: `showApiConfig(MODULE_NAME, ctx, saveSettings, debugLog, content)`
- 功能: 独立API配置
- 原始位置: index.js line 6434-6708

## 转换处理

每个模块文件都经过以下标准化处理：

1. **函数签名统一化**
   - 原格式: `async function showXxx() {`
   - 新格式: `export async function showXxx(MODULE_NAME, ctx, saveSettings, debugLog, content) {`

2. **移除重复声明**
   - 删除了函数内部的 `const ctx = SillyTavern.getContext();` 语句
   - ctx 现在通过参数传入

3. **保留内部函数**
   - 所有模块特定的辅助函数都完整保留
   - 例如: showWardrobe 中的 updateWardrobeWorldInfo, renderItems 等
   - 例如: showTodo 中的 scheduleNotification 等

4. **ES6 模块化**
   - 使用 export 导出主函数
   - 支持在 index.js 中使用 import 语句导入

## 使用示例

在 index.js 中使用这些模块：

```javascript
// 导入模块
import { enableDrag } from './src/utils.js';
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

// 准备参数
const MODULE_NAME = 'healthy-life-helper';
const ctx = SillyTavern.getContext();
const content = document.getElementById('health-assistant-content');

function saveSettings() {
  if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
}

function debugLog(...args) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] [健康助手]`, ...args);
}

// 调用模块
await showWardrobe(MODULE_NAME, ctx, saveSettings, debugLog, content);
```

## 注意事项

### 内部函数覆盖

某些模块内部重新定义了 `debugLog` 和 `saveSettings` 函数：

- **showWardrobe**: 定义了自己的 `saveSettings`，它会调用 `updateWardrobeWorldInfo()`
- **showTodo**: 定义了自己的 `debugLog`，有模块特定的日志格式

这些内部定义会覆盖参数传入的版本。如果需要完全统一这些函数，需要进一步重构。

### 模块依赖

所有模块都依赖以下全局对象：

- `SillyTavern`: 主应用对象
- `toastr`: 消息提示库
- `window`, `document`: 浏览器对象

确保这些依赖在模块加载前已准备好。

### 文件编码

所有文件使用 UTF-8 编码，保留了原有的中文注释和字符串。

## 验证

所有文件已验证：

- ✅ 函数签名正确
- ✅ export 语句正确
- ✅ 内部辅助函数完整保留
- ✅ 移除了重复的 ctx 声明
- ✅ 代码格式保持一致

## 文件统计

- 总文件数: 15
- 总大小: 244K
- 最大文件: showBgm.js (35K)
- 最小文件: utils.js (3.4K)

提取完成时间: 2025-11-16
