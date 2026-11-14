/* Заказ: расчёт → время → данные → подтверждение. Всё хранится в браузере, никуда не отправляется. */
(function (D, CH, B) {
  const NB = ' ';
  const esc = B.esc;
  const BRIGADES = [
    { name: 'Иван Иванов', note: 'бригадир, после ремонта и переездов' },
    { name: 'Иванна Иванова', note: 'бригадир, ведёт бережные уборки' }
  ];
  const STEPS = ['Расчёт', 'Время', 'Данные', 'Проверка'];
  let step = 1;

  const $ = s => document.querySelector(s);
  const panes = [...document.querySelectorAll('.pane')];

  /* ---------- шаги ---------- */
  function clientOk(c) {
    c = c || {};
    return !!(c.name && c.name.trim().length > 1 && phoneDigits(c.phone).length === 11 && c.street && c.street.trim().length > 3);
  }
  function maxStep() {
    const s = B.state;
    if (!B.slotOk(s)) return 2;
    if (!clientOk(s.client)) return 3;
    return 4;
  }
  function drawSteps() {
    const max = maxStep();
    $('#steps').innerHTML = STEPS.map((name, i) => {
      const n = i + 1;
      const inner = `<b>${n}</b>${name}`;
      if (n === step) return `<li><span aria-current="step">${inner}</span></li>`;
      if (n <= max) return `<li><a href="#${n}" class="${n < step ? 'done' : ''}">${inner}</a></li>`;
      return `<li><span title="Сначала заполните предыдущие шаги">${inner}</span></li>`;
    }).join('');
  }
  function go(n, focus) {
    n = Math.max(1, Math.min(n, maxStep()));
    step = n;
    panes.forEach(p => { p.hidden = +p.dataset.step !== n; });
    drawSteps();
    if (location.hash !== '#' + n) history.replaceState(null, '', '#' + n);
    if (n === 2) drawTime(B.state);
    if (n === 3) fillClient();
    if (n === 4) drawFinal(B.state);
    if (focus) {
      const h = panes[n - 1].querySelector('.pane__h');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      $('#steps').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }
  window.addEventListener('hashchange', () => { const n = +location.hash.slice(1); if (n && n !== step) go(n, true); });

  /* ---------- шаг 2: время ---------- */
  function hash(str) { let h = 11; for (const c of str) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; }
  function brigade(dateIso, slot) { return BRIGADES[hash(dateIso + slot) % BRIGADES.length]; }

  function drawTime(s) {
    const { hours, people } = CH.workload(s);
    const days = CH.days(14);
    const first = days[0].d;
    const lead = (first.getDay() + 6) % 7; // пустые клетки до понедельника
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    days.forEach(d => cells.push(d));
    while (cells.length % 7) cells.push(null);
    let rows = '';
    for (let r = 0; r < cells.length; r += 7) {
      rows += '<tr>' + cells.slice(r, r + 7).map(d => {
        if (!d) return '<td class="is-out"></td>';
        const free = D.SLOTS.filter(sl => CH.slotState(d.iso, sl, hours) === 'free').length;
        if (!free) return `<td class="is-out"><span class="empty">${d.d.getDate()}</span></td>`;
        return `<td><label class="${d.weekend ? 'we' : ''}"><input type="radio" name="cal" value="${d.iso}"${s.date === d.iso ? ' checked' : ''}><span></span>
          <b>${d.d.getDate()}</b><small>${d.i === 0 ? 'сегодня, ' : ''}${free}${NB}${D.plural(free, 'окно', 'окна', 'окон')}</small></label></td>`;
      }).join('') + '</tr>';
    }
    $('#cal').innerHTML = `<caption class="small" style="caption-side:bottom;text-align:left;padding-top:8px">Заштриховано — прошедшие дни и дни без свободных окон. Выходные +${D.WEEKEND_PCT}${NB}%, сегодня +${D.URGENT_PCT}${NB}%.</caption>
      <thead><tr>${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(w => `<th scope="col">${w}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;

    $('#slotsHead').textContent = CH.dateLong(s.date) + ': во сколько начать';
    $('#slotlist').innerHTML = D.SLOTS.map(sl => {
      const st = CH.slotState(s.date, sl, hours);
      const b = brigade(s.date, sl);
      const end = B.endTime(sl, hours);
      const stText = st === 'busy' ? 'занято другим нарядом' : st === 'late' ? 'до 21:00 не успеем' : st === 'past' ? 'уже не успеем доехать' : 'до ' + end;
      return `<li><label><input type="radio" name="slotPick" value="${sl}"${s.slot === sl && st === 'free' ? ' checked' : ''}${st === 'free' ? '' : ' disabled'}><span class="box">${B.TICK}</span>
        <span class="t">${sl}</span>
        <span class="who">${st === 'free' ? 'Бригада: ' + b.name + `<small>${b.note}, ${people === 1 ? 'приедет одна' : 'с напарником'}</small>` : '—'}</span>
        <span class="st">${stText}</span></label></li>`;
    }).join('');
    $('#timeErr').textContent = '';
  }
  document.addEventListener('change', e => {
    if (e.target.name === 'cal') {
      const s = B.state;
      const { hours } = CH.workload(s);
      const keep = CH.slotState(e.target.value, s.slot, hours) === 'free';
      const free = D.SLOTS.find(sl => CH.slotState(e.target.value, sl, hours) === 'free');
      B.set({ date: e.target.value, slot: keep ? s.slot : (free || s.slot) });
      drawTime(B.state); drawSteps();
    }
    if (e.target.name === 'slotPick') { B.set({ slot: e.target.value }); drawSteps(); }
  });

  /* ---------- шаг 3: данные ---------- */
  function phoneDigits(v) {
    let d = String(v || '').replace(/\D/g, '');
    if (d.length && d[0] === '8') d = '7' + d.slice(1);
    if (d.length && d[0] !== '7') d = '7' + d;
    return d.slice(0, 11);
  }
  function phoneFmt(v) {
    const d = phoneDigits(v);
    if (!d) return '';
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length > 4) out += ') ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }
  const form = $('#client');
  function fillClient() {
    const c = B.state.client || {};
    ['name', 'phone', 'street', 'flat', 'entrance', 'floor', 'intercom', 'comment'].forEach(k => { if (form[k] && c[k] != null) form[k].value = c[k]; });
    lastPhone = phoneDigits(c.phone);
    const city = c.city || 'nn', keys = c.keys || 'home';
    form.querySelector(`input[name=city][value=${city}]`).checked = true;
    form.querySelector(`input[name=keys][value=${keys}]`).checked = true;
  }
  function readClient() {
    const fd = new FormData(form);
    const c = {};
    for (const [k, v] of fd.entries()) c[k] = String(v);
    return c;
  }
  let lastPhone = '';
  form.addEventListener('input', e => {
    const t = e.target;
    if (t.name === 'phone') {
      let d = phoneDigits(t.value);
      // стёрли скобку или дефис — стираем и цифру перед ним
      if (e.inputType && e.inputType.startsWith('delete') && d === lastPhone && d.length) d = d.slice(0, -1);
      if (d === '7' && e.inputType && e.inputType.startsWith('delete')) d = '';
      lastPhone = d;
      t.value = phoneFmt(d);
      t.setSelectionRange(t.value.length, t.value.length);
    }
    if (t.name === 'entrance' || t.name === 'floor') t.value = t.value.replace(/\D/g, '').slice(0, 3);
    if (t.name === 'flat') t.value = t.value.replace(/[^\dа-яёa-z/]/gi, '').slice(0, 6);
    if (t.name === 'intercom') t.value = t.value.replace(/[^\d#*кКвВbB ]/g, '').slice(0, 12);
    if (e.target.getAttribute('aria-invalid') === 'true') validate(e.target.name);
    B.set({ client: readClient() });
    drawSteps();
  });
  form.addEventListener('change', () => { B.set({ client: readClient() }); });
  const MSG = {
    name: 'Напишите, как к вам обращаться — бригадир позвонит накануне.',
    phone: 'Нужен номер из 11 цифр: по нему бригадир сверит наряд накануне.',
    street: 'Укажите улицу и дом — иначе бригада не найдёт, куда ехать.'
  };
  function validate(only) {
    const c = readClient();
    const bad = {
      name: !(c.name && c.name.trim().length > 1),
      phone: phoneDigits(c.phone).length !== 11,
      street: !(c.street && c.street.trim().length > 3)
    };
    let firstBad = null;
    Object.keys(bad).forEach(k => {
      if (only && only !== k) return;
      const inp = form[k];
      const err = document.getElementById('err-' + k);
      inp.setAttribute('aria-invalid', String(bad[k]));
      err.textContent = bad[k] ? MSG[k] : '';
      if (bad[k] && !firstBad) firstBad = inp;
    });
    return firstBad;
  }
  form.addEventListener('submit', e => e.preventDefault());
  // Enter — к следующему полю; в последнем поле — дальше по шагам
  form.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.isComposing) return;
    e.preventDefault();
    const list = [...form.querySelectorAll('input:not([type=radio]), textarea')];
    const next = list[list.indexOf(e.target) + 1];
    if (next) next.focus();
    else panes[2].querySelector('[data-next]').click();
  });

  /* ---------- шаг 4: подтверждение ---------- */
  function drawFinal(s) {
    const r = CH.calc(s);
    const c = s.client || {};
    const { hours, people } = r.work;
    const b = brigade(s.date, s.slot);
    const addr = [(c.city === 'kstovo' ? 'Кстово' : 'Нижний Новгород') + ', ' + (c.street || ''), c.flat && 'кв.' + NB + c.flat, c.entrance && 'подъезд ' + c.entrance, c.floor && 'этаж ' + c.floor, c.intercom && 'домофон ' + c.intercom].filter(Boolean).join(', ');
    const keys = { home: 'встретят дома', office: 'ключи оставят в офисе на Белинского, 61', concierge: 'ключи у консьержа' }[c.keys || 'home'];
    const house = s.house.map(id => D.HOUSE.find(h => h.id === id).name.toLowerCase()).join(', ');
    const extras = D.EXTRAS.filter(x => s.extras[x.id] && !CH.extraIncluded(x, s)).map(x => x.name.toLowerCase() + (x.count ? ' ×' + s.extras[x.id] : '')).join(', ');
    const f = D.FREQ.find(x => x.id === s.freq);
    const fields = [
      ['Вид уборки', r.type.name + ', ' + Math.round(s.area) + NB + 'м²' + (s.baths > 1 ? ', санузлов: ' + s.baths : '')],
      ['Когда', CH.dateLong(s.date) + ', ' + s.slot + '–' + B.endTime(s.slot, hours)],
      ['Адрес', esc(addr)],
      ['Как попадём', keys],
      ['Бригада', esc(b.name) + (people > 1 ? ' и ещё ' + (people - 1) + NB + (people === 2 ? 'человек' : 'человека') : '') + ', ≈' + NB + CH.hoursText(hours)],
      ['Средства', D.CHEM_MODES.find(m => m.id === s.chem).short + (house ? ' (дома: ' + house + ')' : '')],
      ['Дополнительно', extras || 'нет'],
      ['Как часто', f.name],
      ['Заказчик', esc(c.name || '') + ', ' + esc(c.phone || '')],
      ['Комментарий', c.comment ? esc(c.comment) : 'нет']
    ];
    $('#final').innerHTML = `
      <dl class="final__grid">${fields.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <details><summary>Пункты наряда — ${r.count}${NB}${D.plural(r.count, 'пункт', 'пункта', 'пунктов')} <span>развернуть</span></summary>
        <div class="rooms">${B.checklistHTML(s, false)}</div></details>
      <div class="sign">
        <div class="sign__c"><div class="sign__l"><span>${esc((c.name || '').split(' ')[0])}</span></div><p>Подпись заказчика при заказе</p></div>
        <div class="sign__c"><div class="sign__l"></div><p>Подпись бригадира при приёмке</p></div>
      </div>
      <p class="pay">Оплата <b>после приёмки</b>: картой, переводом или наличными бригадиру. Предоплаты нет. Отменить или перенести можно бесплатно за${NB}12${NB}часов до${NB}приезда.</p>`;
    $('#finalNum').textContent = s.number;
  }

  /* ---------- шаг 1: сводка ---------- */
  function drawSummary(s) {
    const el = $('#sum1'); if (!el) return;
    const r = CH.calc(s);
    const house = s.house.map(id => D.HOUSE.find(h => h.id === id).name.toLowerCase()).join(', ');
    const extras = D.EXTRAS.filter(x => s.extras[x.id] && !CH.extraIncluded(x, s)).map(x => x.name.toLowerCase() + (x.count ? ' ×' + s.extras[x.id] : '')).join(', ');
    const preset = s.mode === 'rooms' ? (D.PRESETS.find(p => p.id === s.preset) || {}).name + ', ' : '';
    const rows = [
      ['Вид уборки', r.type.name],
      ['Помещение', preset + Math.round(s.area) + NB + 'м²' + (s.baths > 1 ? ', санузлов: ' + s.baths : '')],
      ['Кто дома', house || 'не указано'],
      ['Средства', D.CHEM_MODES.find(m => m.id === s.chem).short],
      ['Дополнительно', extras || 'нет'],
      ['Как часто', D.FREQ.find(x => x.id === s.freq).name]
    ];
    el.innerHTML = `<dl class="final__grid">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  }
  B.on(drawSummary);
  const editBtn = $('#editBlank');
  if (editBtn) editBtn.addEventListener('click', () => {
    const f = $('#blank'); const open = f.hidden;
    f.hidden = !open; editBtn.setAttribute('aria-expanded', String(open));
    editBtn.textContent = open ? 'Свернуть бланк' : 'Изменить в бланке';
    if (open) f.querySelector('input').focus({ preventScroll: true });
  });

  /* ---------- после подтверждения: наряд принят ---------- */
  /* Подтверждение: корешок отрывается по перфорации, потом экран «Наряд принят» со штампом */
  function confirmOrder() {
    const btn = document.querySelector('[data-confirm]'); if (btn) btn.disabled = true;
    const stub = document.querySelector('aside.stub');
    if (!stub || getComputedStyle(stub).display === 'none') { if (stub) stub.hidden = true; buildDone(); return; }
    const pts = ['100% 0', '100% 100%'];
    for (let y = 100; y > 0; y -= 1.2 + Math.random() * 2.2) pts.push((Math.random() * 6).toFixed(1) + 'px ' + y.toFixed(1) + '%');
    pts.push('3px 0');
    stub.style.clipPath = 'polygon(' + pts.join(',') + ')';
    stub.classList.add('is-tearing');
    setTimeout(() => { stub.hidden = true; buildDone(); }, 820);
  }

  function buildDone() {
    const s = B.state, c = s.client || {};
    const { hours } = CH.workload(s);
    const b = brigade(s.date, s.slot);
    const prev = new Date(CH.parseIso(s.date)); prev.setDate(prev.getDate() - 1);
    $('#done').innerHTML = `
      <span class="stamp stamp--big" aria-hidden="true">принят</span>
      <h2 class="pane__h">Наряд принят${c.name ? ', ' + esc(c.name.split(' ')[0]) : ''}</h2>
      <p class="pane__lead">Бригада записана на ${CH.dateLong(s.date)}, ${s.slot}–${B.endTime(s.slot, hours)}. Вот что будет дальше.</p>
      <ol class="done__steps">
        <li><time>сейчас</time><b>SMS с номером наряда</b><p>Придёт на ${esc(c.phone || 'ваш телефон')}. В нём ссылка на этот наряд.</p></li>
        <li><time>${CH.dateLong(CH.iso(prev))}, 19:00</time><b>Звонит бригадир</b><p>${esc(b.name)} сверит наряд, спросит про домофон и парковку.</p></li>
        <li><time>${CH.dateLong(s.date)}, ${s.slot}</time><b>Приезжает бригада</b><p>С пылесосом, парогенератором и коробкой средств.</p></li>
        <li><time>после уборки</time><b>Приёмка и оплата</b><p>Проходите по пунктам, подписываете и платите. Замечание — переделаем за 24 часа.</p></li>
      </ol>
      <p class="pane__nav"><a class="btn btn--line" href="index.html">На главную</a><a class="btn btn--pen" href="usloviya.html">Условия и договор</a></p>`;
    panes.forEach(p => { p.hidden = true; });
    $('#done').hidden = false;
    $('#done').classList.add('is-hit');
    $('#steps').innerHTML = STEPS.map((name, i) => `<li><span class="done" aria-disabled="true"><b>${i + 1}</b>${name}</span></li>`).join('');
    $('#steps').scrollIntoView({ block: 'start' });
    window.showDemo('Это наряд из пробного сайта: SMS не придёт, бригада не приедет. «Чистовик» придуман для портфолио.');
  }

  /* ---------- кнопки ---------- */
  document.addEventListener('click', e => {
    const n = e.target.closest('[data-next]');
    if (n) {
      if (step === 2 && !B.slotOk(B.state)) { $('#timeErr').textContent = 'Выберите день и свободное время — без этого бригаду не поставить.'; return; }
      if (step === 3) { const bad = validate(); if (bad) { bad.focus(); return; } B.set({ client: readClient() }); }
      go(step + 1, true);
    }
    const p = e.target.closest('[data-prev]');
    if (p) go(step - 1, true);
    if (e.target.closest('[data-print]')) window.print();
    if (e.target.closest('[data-confirm]')) confirmOrder();
  });

  B.mountStub($('#stub'), { actions: false });
  B.mountForm($('#blank'));
  B.on(() => { if (step === 1) drawSteps(); });
  $('#finalNum').textContent = B.state.number;
  const want = +location.hash.slice(1) || 1;
  go(want, false);
})(window.CH_DATA, window.CH, window.Blank);
