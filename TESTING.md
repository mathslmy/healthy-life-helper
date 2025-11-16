# 测试指南 - 验证屏幕居中效果

## 🎯 测试目标
验证 FAB 按钮首次加载时是否显示在屏幕正中央

## 📱 测试步骤

### 方法 1：清除保存的位置（推荐）

**在浏览器控制台执行以下命令**：

```javascript
// 清除保存的 FAB 按钮位置
localStorage.removeItem('health-assistant-fab-position');

// 刷新页面
location.reload();
```

刷新后，你应该看到紫色的 🍀 按钮出现在**屏幕正中央**。

### 方法 2：使用隐私模式/无痕模式

1. 打开浏览器的隐私/无痕模式
2. 访问你的 SillyTavern 页面
3. 应该看到 FAB 按钮在屏幕正中央

### 方法 3：清除浏览器数据

**注意**：这会清除所有本地存储数据，请谨慎使用

1. 打开浏览器设置
2. 清除浏览数据 > 选择"Cookie 和其他网站数据"
3. 刷新页面

## ✅ 预期效果

### 首次加载（无保存位置）
- ✨ FAB 按钮显示在**屏幕正中央**
- 📐 按钮尺寸：56x56px
- 🎨 紫色渐变背景
- 🍀 28px 的四叶草图标
- 💫 明显的阴影效果

### 视觉示意
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│                                 │
│              🍀                 │  ← FAB 按钮在这里
│           (紫色圆形)              │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

### 拖动后
- 按钮可以拖动到任意位置
- 位置保存到 localStorage
- 下次加载时恢复到拖动后的位置

## 🧪 功能测试

### 测试 1：点击打开面板
1. 点击 FAB 按钮
2. 应该看到面板在屏幕中央弹出
3. 面板包含 14 个功能按钮

### 测试 2：拖动功能
1. 长按 FAB 按钮
2. 拖动到屏幕任意位置
3. 松开后按钮停留在新位置
4. 刷新页面，按钮应该恢复到拖动后的位置

### 测试 3：点击和拖动区分
1. 快速点击（不移动）→ 应该打开/关闭面板
2. 按住并拖动（移动超过 5px）→ 应该移动按钮，不打开面板

### 测试 4：移动端触摸
（在手机上测试）
1. 触摸 FAB 按钮 → 打开面板
2. 长按并拖动 → 移动按钮
3. 快速点击 → 关闭面板

### 测试 5：响应式设计
1. 调整浏览器窗口大小
2. FAB 按钮应该：
   - 首次加载时始终居中
   - 拖动后的按钮始终保持在可视区域内

## 🐛 调试

### 检查当前位置
在控制台执行：
```javascript
const fab = document.getElementById('health-assistant-fab');
console.log('位置:', {
  left: fab.style.left,
  top: fab.style.top,
  transform: fab.style.transform
});
console.log('实际位置:', fab.getBoundingClientRect());
console.log('保存位置:', localStorage.getItem('health-assistant-fab-position'));
```

### 预期输出（首次加载）
```javascript
位置: {
  left: "",      // 空字符串，使用 CSS 的 50%
  top: "",       // 空字符串，使用 CSS 的 50%
  transform: ""  // 空字符串，使用 CSS 的 translate(-50%, -50%)
}
实际位置: DOMRect {
  x: (屏幕宽度/2 - 28),
  y: (屏幕高度/2 - 28),
  width: 56,
  height: 56
}
保存位置: null
```

### 预期输出（拖动后）
```javascript
位置: {
  left: "123px",           // 具体像素值
  top: "456px",            // 具体像素值
  transform: "translate(0, 0)"  // 取消居中
}
实际位置: DOMRect {
  x: 123,
  y: 456,
  width: 56,
  height: 56
}
保存位置: '{"x":123,"y":456}'
```

## 📊 浏览器兼容性测试

测试以下浏览器：
- [ ] Chrome/Edge (桌面)
- [ ] Firefox (桌面)
- [ ] Safari (桌面)
- [ ] Chrome (Android)
- [ ] Safari (iOS)
- [ ] 微信内置浏览器
- [ ] QQ 浏览器

## 🎨 视觉检查清单

确认以下视觉效果：
- [ ] 按钮在屏幕正中央（首次）
- [ ] 紫色渐变背景清晰可见
- [ ] 🍀 图标大小合适（28px）
- [ ] 阴影效果明显
- [ ] hover 时有放大效果
- [ ] active 时有缩小效果
- [ ] 拖动时光标变为 grabbing
- [ ] 在深色/浅色背景下都清晰可见

## 🔄 重置测试环境

如果需要重新测试首次加载效果：

```javascript
// 1. 清除 FAB 位置
localStorage.removeItem('health-assistant-fab-position');

// 2. 重置 FAB 样式
const fab = document.getElementById('health-assistant-fab');
fab.style.left = '';
fab.style.top = '';
fab.style.transform = '';
fab.style.right = '';
fab.style.bottom = '';

// 3. 刷新页面
location.reload();
```

## 📝 报告问题

如果发现问题，请记录：
1. 浏览器类型和版本
2. 设备类型（电脑/手机/平板）
3. 屏幕分辨率
4. 控制台日志（包括错误信息）
5. 截图或录屏

---

**提示**：所有测试通过后，你可以安全地使用该扩展，FAB 按钮会在首次加载时显示在最显眼的位置！
