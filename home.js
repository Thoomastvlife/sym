// 首頁視差：只更新 CSS 變數 --p，位移量由 home.css 決定
(function () {
  var track = document.querySelector('.hero-track');
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-px]'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var queued = false;
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function update() {
    queued = false;
    var vh = window.innerHeight;
    if (reduce) return;
    // 首頁主視覺：以捲動距離換算 0 → 1
    var range = track.offsetHeight - vh;
    track.style.setProperty('--p', clamp(window.scrollY / range, 0, 1).toFixed(4));
    // 其餘區塊：以區塊中心相對視窗中心換算 -1 → 1
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -150 || r.top > vh + 150) return;
      var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      el.style.setProperty('--p', clamp(p, -1, 1).toFixed(4));
    });
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
