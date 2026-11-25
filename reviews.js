// 顧客評價頁：數字滾動 + 串接 Google 評價（失敗時沿用頁面上的預設數字）
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function format(el, v) {
    var d = parseInt(el.dataset.decimals || '0', 10);
    var n = d ? v.toFixed(d) : Math.round(v).toLocaleString('en-US');
    return n + (el.dataset.suffix || '');
  }

  function run(el, from) {
    var to = parseFloat(el.dataset.count);
    from = from || 0;
    if (reduce || isNaN(to)) { el.textContent = format(el, to); return; }
    var dur = 1800, t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = format(el, from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = Array.prototype.slice.call(document.querySelectorAll('.count'));
  var started = false;

  function startAll() {
    started = true;
    counters.forEach(function (el) { run(el); });
  }

  // 捲到統計區才開始滾動
  var box = document.getElementById('google-stats');
  if ('IntersectionObserver' in window && box) {
    new IntersectionObserver(function (es, ob) {
      if (es[0].isIntersecting) { ob.disconnect(); startAll(); }
    }, { threshold: 0.4 }).observe(box);
  } else { startAll(); }

  // ---- Google 評價 ----
  function stars(n) { return '★★★★★☆☆☆☆☆'.slice(5 - Math.round(n), 10 - Math.round(n)); }

  function makeCard(r) {
    var card = document.createElement('div'); card.className = 'review-card';
    var head = document.createElement('div'); head.className = 'review-header';
    var name = document.createElement('span'); name.className = 'reviewer-name'; name.textContent = r.author || 'Google 使用者';
    var rate = document.createElement('span'); rate.className = 'rating'; rate.textContent = stars(r.rating || 5);
    head.appendChild(name); head.appendChild(rate);
    var text = document.createElement('p'); text.className = 'review-text'; text.textContent = r.text || '';
    card.appendChild(head); card.appendChild(text);
    return card;
  }

  // 跑馬燈：同一組卡片複製一份，捲動 -50% 即可無縫循環
  function buildMarquee(list) {
    var track = document.getElementById('marquee-track');
    if (!track || !list || !list.length) return;
    track.textContent = '';
    var base = list.slice();
    while (base.length < 6) base = base.concat(list); // 確保一組寬度超過畫面
    [false, true].forEach(function (dup) {
      base.forEach(function (r) {
        var c = makeCard(r);
        if (dup) c.setAttribute('aria-hidden', 'true');
        track.appendChild(c);
      });
    });
    track.style.setProperty('--dur', (base.length * 7) + 's');
  }

  // 預設內容：取自頁面上原本的三張評論卡
  function readStatic() {
    return Array.prototype.map.call(document.querySelectorAll('#reviews-grid .review-card'), function (c) {
      return {
        author: c.querySelector('.reviewer-name').textContent,
        rating: 5,
        text: c.querySelector('.review-text').textContent
      };
    });
  }
  buildMarquee(readStatic());

  function renderReviews(list) {
    var grid = document.getElementById('reviews-grid');
    if (!grid || !list || !list.length) return;
    grid.textContent = '';
    list.forEach(function (r) { grid.appendChild(makeCard(r)); });
    buildMarquee(list);
  }

  fetch('/api/google-reviews', { headers: { Accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      var rt = document.getElementById('stat-rating'), tt = document.getElementById('stat-total');
      if (d.rating && rt) rt.dataset.count = d.rating;
      if (d.total && tt) { tt.dataset.count = d.total; tt.dataset.suffix = ''; }
      // 若動畫已經跑完，從目前數字滾到最新數字
      if (started) { [rt, tt].forEach(function (el) { if (el) run(el, parseFloat(el.textContent.replace(/,/g, '')) || 0); }); }
      renderReviews(d.reviews);
    })
    .catch(function () { /* 靜態頁面或 API 未設定：維持預設內容 */ });
})();
