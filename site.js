// 全站共用：捲動後 Header 加上半透明底色
(function () {
  var header = document.querySelector('header');
  if (!header) return;
  function update() { header.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();
