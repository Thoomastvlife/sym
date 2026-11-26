// 磁吸按鈕：游標靠近時按鈕被「吸」過去，文字再多移一點；離開後彈簧回位。
// 用獨立的 translate 屬性，不影響 theme.css 的 hover / active（transform）效果。
(function () {
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce) return;

  var CONFIG = [
    { sel: '.btn',       range: 70, pull: 0.35, max: 14 },
    { sel: '.float-btn', range: 50, pull: 0.28, max: 9 }
  ];
  var items = [];
  CONFIG.forEach(function (c) {
    Array.prototype.forEach.call(document.querySelectorAll(c.sel), function (el) {
      // 把按鈕內容包進 span，讓文字能比按鈕本體多移動一點
      var inner = document.createElement('span');
      inner.className = 'mag-in';
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
      el.setAttribute('data-magnetic', '');
      items.push({ el: el, inner: inner, c: c, x: 0, y: 0, tx: 0, ty: 0 });
    });
  });
  if (!items.length) return;

  var mouse = null, running = false;

  function aim() {
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      // 取回位前的原始位置：扣掉目前位移，避免按鈕自己跑掉後又追不上
      var cx = r.left + r.width / 2 - it.x, cy = r.top + r.height / 2 - it.y;
      var near = mouse &&
        mouse.x > r.left - it.x - it.c.range && mouse.x < r.right - it.x + it.c.range &&
        mouse.y > r.top - it.y - it.c.range && mouse.y < r.bottom - it.y + it.c.range;
      if (near) {
        var dx = (mouse.x - cx) * it.c.pull, dy = (mouse.y - cy) * it.c.pull;
        var len = Math.hypot(dx, dy), m = it.c.max;
        if (len > m) { dx *= m / len; dy *= m / len; }
        it.tx = dx; it.ty = dy;
      } else { it.tx = 0; it.ty = 0; }
    });
  }

  function frame() {
    var busy = false;
    items.forEach(function (it) {
      it.x += (it.tx - it.x) * 0.18;
      it.y += (it.ty - it.y) * 0.18;
      if (Math.abs(it.tx - it.x) < 0.05 && Math.abs(it.ty - it.y) < 0.05 && !it.tx && !it.ty) {
        it.x = it.y = 0;
        it.el.style.translate = '';
        it.inner.style.translate = '';
      } else {
        busy = true;
        it.el.style.translate = it.x.toFixed(2) + 'px ' + it.y.toFixed(2) + 'px';
        it.inner.style.translate = (it.x * 0.45).toFixed(2) + 'px ' + (it.y * 0.45).toFixed(2) + 'px';
      }
    });
    if (busy) requestAnimationFrame(frame); else running = false;
  }
  function kick() { aim(); if (!running) { running = true; requestAnimationFrame(frame); } }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mouse = { x: e.clientX, y: e.clientY };
    kick();
  }, { passive: true });
  document.addEventListener('pointerleave', function () { mouse = null; kick(); });
  window.addEventListener('blur', function () { mouse = null; kick(); });
})();
