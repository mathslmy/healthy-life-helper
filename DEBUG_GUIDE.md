# 健康生活助手 - 调试指南

## 🔍 如何检查扩展是否正常加载

### 1. 打开浏览器开发者工具

**安卓手机（Chrome/Edge）**：
1. 在地址栏输入：`chrome://inspect` 或 `edge://inspect`
2. 点击"inspect"查看控制台
3. 或者在页面上点击右上角菜单 → 更多工具 → 开发者工具

**电脑浏览器**：
- Chrome/Edge: 按 `F12` 或 `Ctrl+Shift+I`（Mac: `Cmd+Option+I`）
- Firefox: 按 `F12` 或 `Ctrl+Shift+K`（Mac: `Cmd+Option+K`）

### 2. 查看控制台日志

如果扩展正常加载，你应该看到以下日志（按顺序）：

```
[健康生活助手] 开始初始化...
[健康生活助手] 获取 context 成功
[健康生活助手] 开始创建 DOM 元素...
[健康生活助手] FAB 按钮已添加到页面
[健康生活助手] 拖动功能已启用
[健康生活助手] 主面板已添加到页面
[健康生活助手] 初始化完成！
```

### 3. 检查是否有错误

在控制台中查找**红色错误信息**，常见错误类型：

#### ❌ 模块导入错误
```
Failed to load module script: Expected a JavaScript module script...
```
**原因**：manifest.json 可能缺少 `"type": "module"` 配置

#### ❌ 模块路径错误
```
Failed to resolve module specifier "./src/xxx.js"
```
**原因**：模块文件路径不正确或文件不存在

#### ❌ SillyTavern 环境未就绪
```
Cannot read properties of undefined (reading 'getContext')
```
**原因**：SillyTavern 环境还未加载完成，扩展会在 5 秒后重试

### 4. 检查 FAB 按钮是否存在

在控制台输入以下命令：

```javascript
document.getElementById('health-assistant-fab')
```

- 如果返回 `null`：FAB 按钮未创建
- 如果返回 DOM 元素：FAB 按钮已创建

检查样式：
```javascript
const fab = document.getElementById('health-assistant-fab');
console.log('FAB 位置:', fab.style.right, fab.style.bottom);
console.log('FAB 可见性:', window.getComputedStyle(fab).display);
console.log('FAB z-index:', window.getComputedStyle(fab).zIndex);
```

### 5. 检查主面板是否存在

```javascript
document.getElementById('health-assistant-panel')
```

检查面板显示状态：
```javascript
const panel = document.getElementById('health-assistant-panel');
console.log('面板显示状态:', panel.style.display);
console.log('面板 z-index:', window.getComputedStyle(panel).zIndex);
```

### 6. 手动显示面板

如果 FAB 按钮不响应点击，可以手动显示面板：

```javascript
document.getElementById('health-assistant-panel').style.display = 'block';
```

### 7. 测试功能模块加载

点击 FAB 按钮后，点击任意功能按钮（如"用户衣柜"），应该看到：

```
[健康生活助手] 点击按钮: wardrobe
```

## 🐛 常见问题排查

### 问题 1：看不到 FAB 按钮

**可能原因**：
1. ✅ FAB 被其他元素遮挡（z-index 问题）
2. ✅ FAB 位置超出屏幕可视区域
3. ✅ CSS 未正确加载
4. ✅ JavaScript 初始化失败

**解决方法**：
1. 检查控制台是否有"初始化完成"日志
2. 使用上面的调试命令检查 FAB 是否存在
3. 检查 style.css 是否正确加载
4. 尝试手动设置 FAB 位置：
   ```javascript
   const fab = document.getElementById('health-assistant-fab');
   fab.style.right = '10px';
   fab.style.bottom = '80px';
   fab.style.zIndex = '999999';
   fab.style.background = 'red'; // 临时改为红色便于查看
   ```

### 问题 2：点击 FAB 按钮没反应

**可能原因**：
1. ✅ 事件监听器未正确绑定
2. ✅ FAB 被其他元素覆盖，点击事件被拦截

**解决方法**：
1. 检查控制台是否有"面板切换为"日志
2. 手动触发点击事件：
   ```javascript
   document.getElementById('health-assistant-fab').click();
   ```
3. 检查是否有其他元素遮挡：
   ```javascript
   const fab = document.getElementById('health-assistant-fab');
   const rect = fab.getBoundingClientRect();
   const element = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
   console.log('点击位置的元素:', element);
   ```

### 问题 3：面板不显示

**可能原因**：
1. ✅ 面板的 display 属性为 none
2. ✅ 面板位置超出屏幕

**解决方法**：
1. 手动显示面板并检查位置：
   ```javascript
   const panel = document.getElementById('health-assistant-panel');
   panel.style.display = 'block';
   console.log('面板位置:', panel.getBoundingClientRect());
   ```

### 问题 4：功能模块无法加载

**可能原因**：
1. ✅ 模块文件不存在
2. ✅ 模块导入路径错误
3. ✅ 模块函数参数错误

**解决方法**：
1. 检查 src/ 目录下是否有所有模块文件
2. 检查控制台是否有模块加载错误
3. 手动测试模块导入：
   ```javascript
   import('./src/showWardrobe.js').then(module => {
     console.log('模块加载成功:', module);
   }).catch(err => {
     console.error('模块加载失败:', err);
   });
   ```

## 📱 移动端特定问题

### 问题：触摸事件不响应

**解决方法**：
1. 确保 CSS 中有 `touch-action: none`
2. 检查是否有页面滚动干扰
3. 尝试增大 FAB 按钮尺寸（已设置为 52px）

### 问题：FAB 按钮拖动后消失

**解决方法**：
检查拖动后的位置是否超出屏幕：
```javascript
const fab = document.getElementById('health-assistant-fab');
console.log('FAB 位置:', fab.getBoundingClientRect());
```

## 📊 检查模块化结构

验证所有模块文件是否存在：

```javascript
const modules = [
  'utils', 'showWardrobe', 'showPomodoro', 'showRoutine', 'showDiet',
  'showMental', 'showExercise', 'showFinance', 'showWishes', 'showSocial',
  'showTodo', 'showMemo', 'showBgm', 'showClearBook', 'showApiConfig'
];

modules.forEach(async (name) => {
  try {
    const module = await import(`./src/${name}.js`);
    console.log(`✅ ${name}.js 加载成功`);
  } catch (err) {
    console.error(`❌ ${name}.js 加载失败:`, err);
  }
});
```

## 🆘 仍然无法解决？

请提供以下信息：

1. 浏览器类型和版本
2. 设备类型（电脑/手机/平板）
3. 控制台完整错误日志
4. 上述调试命令的输出结果

## 🎯 预期效果

正常工作时，你应该看到：

1. **FAB 按钮**：紫色渐变圆形按钮，显示 🍀 图标，位于右下角
2. **点击 FAB**：弹出居中的白色面板，包含 14 个功能按钮
3. **点击功能按钮**：在面板下方显示对应功能的内容
4. **拖动 FAB**：可以拖动到屏幕任意位置
5. **再次点击 FAB**：隐藏面板
