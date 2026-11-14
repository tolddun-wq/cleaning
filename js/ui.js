/* Общее для всех страниц: плашка пробного сайта и меню на телефоне. */
(function () {
  const D = window.CH_DATA;
  const NB = ' ';

  /* ---------- плашка «Это пробный сайт» ---------- */
  const dlg = document.createElement('dialog');
  dlg.className = 'demo';
  dlg.setAttribute('aria-labelledby', 'demo-h');
  dlg.innerHTML = `
    <div class="demo__stamp" aria-hidden="true">пробный<br>сайт</div>
    <h2 id="demo-h" tabindex="-1" autofocus>Это пробный сайт</h2>
    <p data-demo-text></p>
    <p>Хотите такой же дизайн — напишите в${NB}Telegram: <a href="${D.COMPANY.telegram}" target="_blank" rel="noopener">${D.COMPANY.telegramUser}</a></p>
    <div class="demo__btns">
      <a class="btn btn--pen" href="${D.COMPANY.telegram}" target="_blank" rel="noopener">Написать в Telegram</a>
      <button class="btn btn--line" type="button" data-close>Вернуться на сайт</button>
    </div>`;
  document.body.appendChild(dlg);
  const DEF = `«Чистовик» придуман для портфолио: звонок не${NB}пройдёт, заказ никуда не${NB}уйдёт.`;
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  window.showDemo = function (text) {
    dlg.querySelector('[data-demo-text]').textContent = text || DEF;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else alert('Это пробный сайт. Хотите такой же дизайн — напишите в Telegram.');
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-demo]');
    if (!a) return;
    e.preventDefault();
    window.showDemo(a.dataset.demo || null);
  });

  /* ---------- меню на телефоне ---------- */
  const burger = document.querySelector('[data-burger]');
  const setNav = open => {
    document.body.classList.toggle('nav-open', open);
    if (burger) { burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Меню'); }
  };
  if (burger) burger.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
  document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => setNav(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { setNav(false); burger.focus(); } });
  /* при печати раскрываем все свёрнутые группы */
  window.addEventListener('beforeprint', () => document.querySelectorAll('details').forEach(d => { d.open = true; }));
})();
