// 全站共用：頂部公告欄（📢 大喇叭）— 顯示邏輯
// 公告「內容」請到 announcement-data.js 修改；這個檔案不需要動。
(function () {
  var ANNOUNCEMENTS = Array.isArray(window.SYM_ANNOUNCEMENTS) ? window.SYM_ANNOUNCEMENTS.filter(function (a) { return a && a.text; }) : [];
  var INTERVAL = 4500;                 // 自動切換間隔（毫秒）
  var STORE_KEY = 'sym-announce-closed';

  if (!ANNOUNCEMENTS.length) return;
  var header = document.querySelector('header');
  if (!header) return;

  // 公告內容有變動時，簽章不同 → 已關閉過的訪客也會再看到新公告
  var sig = ANNOUNCEMENTS.map(function (a) { return a.text + '|' + (a.href || ''); }).join('¦');
  function wasClosed() { try { return sessionStorage.getItem(STORE_KEY) === sig; } catch (e) { return false; } }
  function rememberClosed() { try { sessionStorage.setItem(STORE_KEY, sig); } catch (e) {} }
  if (wasClosed()) return;

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  var svgAttr = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var ICONS = {
    horn: '<svg width="20" height="20" ' + svgAttr + '><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    up: '<svg width="16" height="16" ' + svgAttr + '><path d="m18 15-6-6-6 6"/></svg>',
    down: '<svg width="16" height="16" ' + svgAttr + '><path d="m6 9 6 6 6-6"/></svg>',
    close: '<svg width="16" height="16" ' + svgAttr + '><path d="M18 6 6 18M6 6l12 12"/></svg>'
  };
  function button(cls, label, icon) {
    var b = el('button', 'announce-btn ' + cls, { type: 'button', 'aria-label': label, title: label });
    b.innerHTML = icon;
    return b;
  }

  // ---------- 組出公告欄 ----------
  var bar = el('div', 'announce', { role: 'region', 'aria-label': '最新公告' });
  var inner = el('div', 'announce-inner');
  var icon = el('span', 'announce-icon');
  icon.innerHTML = ICONS.horn;
  var viewport = el('div', 'announce-viewport');
  var list = el('ul', 'announce-list');

  var items = ANNOUNCEMENTS.map(function (a, i) {
    var li = el('li', 'announce-item' + (i === 0 ? ' is-active' : ''));
    var node;
    if (a.href) { node = el('a'); node.href = a.href; } else { node = el('span'); }
    node.textContent = a.text;
    if (i !== 0) { if (node.tagName === 'A') node.tabIndex = -1; li.setAttribute('aria-hidden', 'true'); }
    li.appendChild(node);
    list.appendChild(li);
    return li;
  });
  viewport.appendChild(list);
  inner.appendChild(icon);
  inner.appendChild(viewport);

  var multiple = items.length > 1;
  var count, prevBtn, nextBtn;
  if (multiple) {
    var ctrl = el('div', 'announce-ctrl');
    prevBtn = button('announce-step', '上一則公告', ICONS.up);
    nextBtn = button('announce-step', '下一則公告', ICONS.down);
    count = el('span', 'announce-count announce-step', { 'aria-hidden': 'true' });
    ctrl.appendChild(prevBtn);
    ctrl.appendChild(count);
    ctrl.appendChild(nextBtn);
    inner.appendChild(ctrl);
  }
  var closeBtn = button('announce-close', '關閉公告', ICONS.close);
  inner.appendChild(closeBtn);
  bar.appendChild(inner);

  header.insertBefore(bar, header.firstChild);
  document.documentElement.classList.add('has-bar');   // 讓內頁橫幅／黏性標題避開公告欄

  // ---------- 切換 ----------
  var cur = 0, timer = null, paused = false, busyUntil = 0;
  function renderCount() { if (count) count.textContent = (cur + 1) + ' / ' + items.length; }
  function setFocusable(li, on) {
    var a = li.querySelector('a');
    if (a) a.tabIndex = on ? 0 : -1;
    if (on) li.removeAttribute('aria-hidden'); else li.setAttribute('aria-hidden', 'true');
  }
  function go(n, dir) {
    n = (n + items.length) % items.length;
    if (n === cur) return;
    var old = items[cur], nw = items[n];
    // 新公告先放到進場起點（不播動畫），再滑入；舊公告往反方向滑出
    nw.classList.add('no-anim');
    nw.classList.remove('is-up', 'is-down', 'is-active');
    nw.classList.add(dir > 0 ? 'is-down' : 'is-up');
    void nw.offsetWidth;
    nw.classList.remove('no-anim', 'is-up', 'is-down');
    nw.classList.add('is-active');
    old.classList.remove('is-active');
    old.classList.add(dir > 0 ? 'is-up' : 'is-down');
    setFocusable(old, false);
    setFocusable(nw, true);
    cur = n;
    renderCount();
  }
  function step(dir) {
    var now = Date.now();
    if (now < busyUntil) return;          // 避免連續快速切換時動畫打架
    busyUntil = now + 350;
    go(cur + dir, dir);
  }
  function start() {
    stop();
    if (!multiple || paused || document.hidden) return;
    timer = setInterval(function () { step(1); }, INTERVAL);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  if (multiple) {
    renderCount();
    prevBtn.addEventListener('click', function () { step(-1); start(); });
    nextBtn.addEventListener('click', function () { step(1); start(); });

    // 滑鼠移入／鍵盤聚焦時暫停輪播，方便閱讀與點擊
    bar.addEventListener('mouseenter', function () { paused = true; stop(); });
    bar.addEventListener('mouseleave', function () { paused = false; start(); });
    bar.addEventListener('focusin', function () { paused = true; stop(); });
    bar.addEventListener('focusout', function () { paused = false; start(); });
    document.addEventListener('visibilitychange', start);

    // 滑鼠滾輪（在公告欄上滾動）切換
    bar.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      step(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    // 手機：在公告欄上上下滑動切換
    var y0 = null;
    bar.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    bar.addEventListener('touchend', function (e) {
      if (y0 === null) return;
      var dy = e.changedTouches[0].clientY - y0;
      y0 = null;
      if (Math.abs(dy) > 24) { step(dy < 0 ? 1 : -1); start(); }
    }, { passive: true });

    start();
  }

  // ---------- 關閉 ----------
  closeBtn.addEventListener('click', function () {
    stop();
    paused = true;
    rememberClosed();                                   // 本次瀏覽期間，其他頁面也不再顯示
    document.documentElement.classList.remove('has-bar');
    bar.classList.add('is-closing');
    var done = false;
    function remove() { if (done) return; done = true; if (bar.parentNode) bar.parentNode.removeChild(bar); }
    bar.addEventListener('transitionend', remove);
    setTimeout(remove, 450);
  });
})();
