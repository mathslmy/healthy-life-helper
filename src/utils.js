// 拖动功能 - 适配手机端
export function enableDrag(element) {
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  // 恢复保存的位置
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

    // 保存位置
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

    // 计算新位置
    let newLeft = currentX;
    let newTop = currentY;

    // 获取窗口尺寸和元素尺寸
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;

    // 限制在窗口内
    newLeft = Math.max(0, Math.min(newLeft, windowWidth - elementWidth));
    newTop = Math.max(0, Math.min(newTop, windowHeight - elementHeight));

    // 设置位置
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

  // 防止点击时触发拖动
  element.addEventListener('click', (e) => {
    if (xOffset !== 0 || yOffset !== 0) {
      e.stopPropagation();
      xOffset = 0;
      yOffset = 0;
    }
  });

  // 窗口大小改变时，确保按钮在可视区域内
  window.addEventListener('resize', () => {
    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newLeft = rect.left;
    let newTop = rect.top;

    // 调整位置确保在窗口内
    newLeft = Math.max(0, Math.min(newLeft, windowWidth - element.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, windowHeight - element.offsetHeight));

    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
  });
}
