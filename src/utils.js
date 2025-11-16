// 拖动功能 - 适配手机端
export function enableDrag(element) {
  let isDragging = false;
  let initialX;
  let initialY;

  // 恢复保存的位置，或使用屏幕中央作为初始位置
  const savedPosition = localStorage.getItem('health-assistant-fab-position');
  if (savedPosition) {
    const { x, y } = JSON.parse(savedPosition);
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.transform = 'translate(0, 0)';
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  } else {
    // 首次加载，保持 CSS 中的居中位置
    // CSS 已设置 left: 50%, top: 50%, transform: translate(-50%, -50%)
  }

  function dragStart(e) {
    if (e.target === element) {
      isDragging = true;
      element.style.cursor = 'grabbing';

      // 获取当前元素的实际位置
      const rect = element.getBoundingClientRect();

      if (e.type === "touchstart") {
        initialX = e.touches[0].clientX - rect.left;
        initialY = e.touches[0].clientY - rect.top;
      } else {
        initialX = e.clientX - rect.left;
        initialY = e.clientY - rect.top;
      }
    }
  }

  function dragEnd(e) {
    if (!isDragging) return;

    isDragging = false;
    element.style.cursor = 'grab';

    // 保存位置（使用 style 中的实际值）
    localStorage.setItem('health-assistant-fab-position', JSON.stringify({
      x: parseFloat(element.style.left) || 0,
      y: parseFloat(element.style.top) || 0
    }));
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();

    // 计算鼠标/触摸点的位置
    let clientX, clientY;
    if (e.type === "touchmove") {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // 计算新位置（鼠标位置 - 初始偏移）
    let newLeft = clientX - initialX;
    let newTop = clientY - initialY;

    // 获取窗口尺寸和元素尺寸
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;

    // 限制在窗口内
    newLeft = Math.max(0, Math.min(newLeft, windowWidth - elementWidth));
    newTop = Math.max(0, Math.min(newTop, windowHeight - elementHeight));

    // 设置位置（一旦开始拖动，就使用绝对像素定位）
    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transform = "translate(0, 0)";
  }

  // 鼠标事件
  element.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  // 触摸事件
  element.addEventListener('touchstart', dragStart, { passive: false });
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('touchend', dragEnd);

  // 区分点击和拖动
  let clickStartTime = 0;
  let clickStartX = 0;
  let clickStartY = 0;

  element.addEventListener('mousedown', (e) => {
    clickStartTime = Date.now();
    clickStartX = e.clientX;
    clickStartY = e.clientY;
  });

  element.addEventListener('touchstart', (e) => {
    clickStartTime = Date.now();
    clickStartX = e.touches[0].clientX;
    clickStartY = e.touches[0].clientY;
  });

  element.addEventListener('click', (e) => {
    const timeDiff = Date.now() - clickStartTime;
    const distance = Math.sqrt(
      Math.pow(e.clientX - clickStartX, 2) +
      Math.pow(e.clientY - clickStartY, 2)
    );

    // 如果移动距离超过 5px，认为是拖动而不是点击
    if (distance > 5) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  // 窗口大小改变时，确保按钮在可视区域内（仅当已有保存位置时）
  window.addEventListener('resize', () => {
    // 只有当元素已经被拖动过（使用了像素定位）时才调整位置
    if (element.style.left && element.style.left !== '50%') {
      const rect = element.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let newLeft = parseFloat(element.style.left) || 0;
      let newTop = parseFloat(element.style.top) || 0;

      // 调整位置确保在窗口内
      newLeft = Math.max(0, Math.min(newLeft, windowWidth - element.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, windowHeight - element.offsetHeight));

      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    }
  });
}
