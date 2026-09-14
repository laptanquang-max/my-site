    // 浅色粒子与深色萤火虫。
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const N = 60;
    let particles = [];
    const pointer = { x: 0, y: 0, active: false };
    const scatterRadius = 320;   // 点击散开：只影响鼠标周围这个圈内的粒子
    const attractRadius = 200;   // 只有鼠标周围这个圈内的粒子才聚拢
    let lastTouchTime = 0;
    let scatterUntil = 0;
    let touchStartX = 0, touchStartY = 0, touchStartT = 0, touchMoved = false;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.6,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        a: Math.random() * 0.35 + 0.45,
        ix: 0,
        iy: 0,
      });
    }

    function setPointer(x, y) {
      if (reducedMotion.matches) return;
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
    }

    function scatter(x, y) {
      if (reducedMotion.matches) return;
      scatterUntil = performance.now() + 500;  // 散开后 0.5 秒暂停吸引，随后尽快回流
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - x;
        const dy = p.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > scatterRadius) continue;
        const safeDistance = distance || 1;
        const strength = (1 - distance / scatterRadius) * 9;
        p.ix += (dx / safeDistance) * strength;
        p.iy += (dy / safeDistance) * strength;
      }
    }

    window.addEventListener('mousemove', (event) => {
      if (lastTouchTime && performance.now() - lastTouchTime < 800) return;  // 忽略触摸后浏览器模拟的鼠标事件
      setPointer(event.clientX, event.clientY);
    });
    window.addEventListener('mouseleave', () => { pointer.active = false; });
    window.addEventListener('click', (event) => {
      if (performance.now() - lastTouchTime < 500) return;
      scatter(event.clientX, event.clientY);
    });
    window.addEventListener('touchstart', (event) => {
      if (!event.touches.length) return;
      lastTouchTime = performance.now();
      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartT = performance.now();
      touchMoved = false;
      pointer.active = false;   // 手机端不聚集：关闭吸引
    }, { passive: true });
    window.addEventListener('touchmove', (event) => {
      if (!event.touches.length) return;
      const touch = event.touches[0];
      if (Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY) > 12) touchMoved = true;
    }, { passive: true });
    window.addEventListener('touchend', () => {
      // 手机端只保留"轻点散开"（拖动不散开，避免翻页时乱动）
      if (!touchMoved && performance.now() - touchStartT < 300) {
        scatter(touchStartX, touchStartY);
      }
    }, { passive: true });

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dark = document.body.classList.contains('dark');
      const t = performance.now() / 1000;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reducedMotion.matches) {
          if (pointer.active && performance.now() > scatterUntil) {
            const dx = pointer.x - p.x;
            const dy = pointer.y - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0 && distance < attractRadius) {
              const strength = Math.min(distance * 0.0008, 0.16);
              p.ix += (dx / distance) * strength;
              p.iy += (dy / distance) * strength;
            }
          }
          p.ix *= 0.955;
          p.iy *= 0.955;
          p.x += p.vx + p.ix;
          p.y += p.vy + p.iy;
        }
        // 边界反弹：把位置夹在画布内，并把速度与冲量一起反弹，
        // 这样粒子被弹飞后会撞回来，不会飞出画面"消失"。
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); p.ix = Math.abs(p.ix); }
        else if (p.x > canvas.width) { p.x = canvas.width; p.vx = -Math.abs(p.vx); p.ix = -Math.abs(p.ix); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); p.iy = Math.abs(p.iy); }
        else if (p.y > canvas.height) { p.y = canvas.height; p.vy = -Math.abs(p.vy); p.iy = -Math.abs(p.iy); }

        if (dark) {
          // 夜晚：萤火虫——暖黄绿 + 呼吸式明灭 + 光晕
          const blink = reducedMotion.matches ? 0.3 : 0.5 + 0.5 * Math.sin(t * 1.6 + i);
          const alpha = Math.min(0.2 + 0.6 * blink, 0.9);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(205, 235, 120, ' + alpha + ')';
          ctx.shadowBlur = 14;
          ctx.shadowColor = 'rgba(205, 235, 120, 0.85)';
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // 白天：浅蓝小点
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(74, 134, 198, ' + p.a + ')';
          ctx.fill();
        }
      }
      requestAnimationFrame(draw);
    }
    draw();

