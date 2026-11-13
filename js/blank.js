/* Бланк наряда: форма, корешок, оборот (чек-лист) и состав. Общий для главной и заказа. */
window.Blank = (function (D, CH) {
  const NB = ' ';
  const TICK = '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 9.5 18 21 3.5"/></svg>';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DEF_COUNT = { windows: 4, cabinets: 2, chandelier: 1, ironing: 1 };
  const PER = { windows: 'за створку', cabinets: 'за штуку', chandelier: 'за штуку', ironing: 'за час' };
  const CNT = { windows: 'Сколько створок', cabinets: 'Сколько шкафов', chandelier: 'Сколько люстр', ironing: 'Сколько часов' };

  let S = CH.load();
  const subs = [];
  function set(patch) { Object.assign(S, patch); CH.save(S); subs.forEach(f => f(S)); }
  function on(f) { subs.push(f); f(S); }

  /* ---------- форма ---------- */
  function circ(name, value, label, checked) {
    return `<label class="circ"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span>${label}</span></label>`;
  }
  function stepper(key, val, min, max, label) {
    return `<span class="step" data-key="${key}" data-min="${min}" data-max="${max}">
      <button type="button" data-d="-1" aria-label="${label}: меньше">−</button>
      <output aria-live="polite">${val}</output>
      <button type="button" data-d="1" aria-label="${label}: больше">+</button></span>`;
  }

  function formHTML() {
    const types = D.TYPES.map(t => `
      <label class="tcard">
        <input type="radio" name="type" value="${t.id}"${S.type === t.id ? ' checked' : ''}>
        <span class="box">${TICK}</span>
        <span class="tcard__name">${t.name}</span>
        <span class="tcard__rate pen"><span class="num">${t.rate}</span>${NB}₽/м²</span>
        <span class="tcard__note">${t.note}</span>
      </label>`).join('');

    const presets = D.PRESETS.map(p => `
      <label class="chip"><input type="radio" name="preset" value="${p.id}"${S.preset === p.id ? ' checked' : ''}><span>${p.name}<small>≈${NB}${p.area}${NB}м²</small></span></label>`).join('');

    const house = D.HOUSE.map(h => `
      <label class="cbx"><input type="checkbox" name="house" value="${h.id}"${S.house.includes(h.id) ? ' checked' : ''}><span class="box">${TICK}</span><span>${h.name}</span></label>`).join('');

    const extras = D.EXTRAS.map(x => {
      const n = S.extras[x.id] || 0;
      return `<li class="xrow" data-x="${x.id}">
        <label class="cbx"><input type="checkbox" name="extra" value="${x.id}"${n ? ' checked' : ''}><span class="box">${TICK}</span>
          <span class="xrow__name">${x.name}${x.hint ? `<small>${x.hint}</small>` : ''}</span></label>
        <span class="xrow__price"><span class="num">${CH.fmt(x.price).slice(0, -2)}</span>${NB}₽${x.count ? `<small>${PER[x.id]}</small>` : ''}</span>
        <span class="xrow__inc">входит</span>
        <span class="xrow__cnt">${x.count ? `<span class="unit">${CNT[x.id]}</span>` + stepper('x:' + x.id, n || DEF_COUNT[x.id] || 1, 1, x.max, x.name) : ''}</span>
      </li>`;
    }).join('');

    const days = CH.days(10).map(d => `
      <label class="day${d.weekend ? ' day--we' : ''}"><input type="radio" name="date" value="${d.iso}"${S.date === d.iso ? ' checked' : ''}>
        <span><small>${d.i === 0 ? 'сегодня' : d.i === 1 ? 'завтра' : CH.WD[d.d.getDay()]}</small><b>${d.d.getDate()}</b><small>${CH.MON[d.d.getMonth()].slice(0, 3)}</small></span></label>`).join('');
    const slots = D.SLOTS.map(sl => `
      <label class="slot"><input type="radio" name="slot" value="${sl}"${S.slot === sl ? ' checked' : ''}><span><b>${sl}</b><small data-slot-note></small></span></label>`).join('');

    return `
    <div class="blank__head">
      <div>
        <p class="blank__form">Форма Ч-1, заполняется заказчиком</p>
        <h2 class="blank__title">Наряд-заказ<br>на уборку</h2>
      </div>
      <dl class="blank__meta">
        <div><dt>№</dt><dd class="pen num" data-num>${S.number}</dd></div>
        <div><dt>от</dt><dd class="pen">${CH.dateLong(CH.iso(new Date()))}</dd></div>
      </dl>
    </div>

    <fieldset class="f f--type">
      <legend><span class="f__n">1</span>Вид уборки <em>отметьте один</em></legend>
      <div class="tcards">${types}</div>
    </fieldset>

    <fieldset class="f">
      <legend><span class="f__n">2</span>Помещение <em>нужное обвести</em></legend>
      <p class="f__line">Считать по: ${circ('mode', 'rooms', 'комнатам', S.mode === 'rooms')} ${circ('mode', 'area', 'площади', S.mode === 'area')}</p>
      <div class="f__pane" data-pane="rooms"${S.mode === 'rooms' ? '' : ' hidden'}>
        <div class="chips">${presets}</div>
        <p class="small">Считаем по${NB}типовой площади. Если на месте окажется больше на${NB}10${NB}% — бригадир скажет новую цену до${NB}начала, не${NB}после.</p>
      </div>
      <div class="f__pane" data-pane="area"${S.mode === 'area' ? '' : ' hidden'}>
        <div class="ruler">
          <label class="ruler__val"><input type="number" name="areaNum" min="15" max="300" value="${S.area}" inputmode="numeric" aria-label="Площадь в квадратных метрах"><span>м²</span></label>
          <input class="ruler__range" type="range" name="area" min="15" max="250" step="1" value="${S.area}" aria-label="Площадь, ползунок">
        </div>
        <p class="f__line">Комнат: ${stepper('rooms', S.rooms, 1, 6, 'Комнат')}</p>
      </div>
      <p class="f__line">Санузлов: ${stepper('baths', S.baths, 1, 4, 'Санузлов')} <span class="small">первый входит в${NB}цену, каждый следующий +${CH.fmt(D.BATH_EXTRA)}</span></p>
    </fieldset>

    <fieldset class="f">
      <legend><span class="f__n">3</span>Кто живёт дома <em>влияет на химию</em></legend>
      <div class="cbxs">${house}</div>
      <p class="note" data-house-note hidden></p>
    </fieldset>

    <fieldset class="f">
      <legend><span class="f__n">4</span>Чем убираем <em>нужное обвести</em></legend>
      <p class="f__line">${D.CHEM_MODES.map(m => circ('chem', m.id, m.name, S.chem === m.id)).join(' ')}</p>
      <p class="small" data-chem-note></p>
    </fieldset>

    <fieldset class="f">
      <legend><span class="f__n">5</span>Дополнительно <em>сколько угодно</em></legend>
      <ul class="xrows">${extras}</ul>
    </fieldset>

    <fieldset class="f">
      <legend><span class="f__n">6</span>Как часто <em>нужное обвести</em></legend>
      <p class="f__line">${D.FREQ.map(f => circ('freq', f.id, f.name + (f.pct ? ` <sup>${f.pct}${NB}%</sup>` : ''), S.freq === f.id)).join(' ')}</p>
      <p class="small">Регулярная скидка действует, пока не${NB}пропускаете больше одного раза подряд. Приезжает та${NB}же бригада.</p>
    </fieldset>

    <fieldset class="f f--when">
      <legend><span class="f__n">7</span>Когда <em>выходные +${D.WEEKEND_PCT}${NB}%, сегодня +${D.URGENT_PCT}${NB}%</em></legend>
      <div class="days" role="radiogroup" aria-label="День">${days}</div>
      <div class="slots" role="radiogroup" aria-label="Время начала">${slots}</div>
      <p class="small" data-when-note></p>
    </fieldset>`;
  }

  function readForm(form) {
    const fd = new FormData(form);
    const patch = {
      type: fd.get('type') || S.type,
      mode: fd.get('mode') || S.mode,
      house: fd.getAll('house'),
      chem: fd.get('chem') || S.chem,
      freq: fd.get('freq') || S.freq,
      date: fd.get('date') || S.date,
      slot: fd.get('slot') || S.slot
    };
    if (patch.mode === 'rooms') {
      const p = D.PRESETS.find(x => x.id === fd.get('preset')) || D.PRESETS[2];
      patch.preset = p.id; patch.area = p.area; patch.rooms = p.rooms;
    } else {
      patch.area = clamp(+fd.get('area') || S.area, 15, 300);
    }
    const ex = {};
    fd.getAll('extra').forEach(id => {
      const x = D.EXTRAS.find(e => e.id === id);
      const st = form.querySelector(`.step[data-key="x:${id}"] output`);
      ex[id] = x.count ? +(st ? st.textContent : 1) : 1;
    });
    patch.extras = ex;
    return patch;
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function mountForm(form) {
    form.innerHTML = formHTML();

    form.addEventListener('change', e => {
      const t = e.target;
      const patch = readForm(form);
      if (t.name === 'chem') patch.chemTouched = true;
      if (t.name === 'house' && !S.chemTouched) {
        patch.chem = patch.house.length ? 'gentle' : 'standard';
        const r = form.querySelector(`input[name=chem][value=${patch.chem}]`); if (r) r.checked = true;
      }
      if (t.name === 'mode') form.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== patch.mode; });
      if (t.name === 'areaNum') { patch.area = clamp(+t.value || 15, 15, 300); form.area.value = patch.area; t.value = patch.area; }
      set(patch);
    });
    form.addEventListener('input', e => {
      if (e.target.name === 'area') { form.areaNum.value = e.target.value; set({ area: +e.target.value }); }
    });
    form.addEventListener('click', e => {
      const b = e.target.closest('.step button'); if (!b) return;
      const st = b.closest('.step'), out = st.querySelector('output');
      const v = clamp(+out.textContent + +b.dataset.d, +st.dataset.min, +st.dataset.max);
      out.textContent = v;
      const key = st.dataset.key;
      if (key.startsWith('x:')) {
        const cb = form.querySelector(`input[name=extra][value=${key.slice(2)}]`);
        cb.checked = true;
        set(readForm(form));
      } else set({ [key]: v });
    });
    form.addEventListener('submit', e => e.preventDefault());

    on(s => syncForm(form, s));
  }

  function syncForm(form, s) {
    const r = CH.calc(s);
    // доп. услуги, которые уже входят в выбранный вид
    D.EXTRAS.forEach(x => {
      const row = form.querySelector(`.xrow[data-x="${x.id}"]`);
      const inc = CH.extraIncluded(x, s);
      row.classList.toggle('is-inc', inc);
      row.querySelector('input').disabled = inc;
      row.classList.toggle('is-on', !!s.extras[x.id] && !inc);
    });
    // кто дома → химия
    const hn = form.querySelector('[data-house-note]');
    if (s.house.length && s.chem === 'gentle') { hn.hidden = false; hn.textContent = 'Поставили бережный набор: без хлора, без отдушек, кислоты — только пищевые. Можно вернуть стандартный в пункте 4.'; }
    else if (s.house.length && s.chem === 'standard') { hn.hidden = false; hn.textContent = 'Вы выбрали стандартный набор. Хлорный гель при детях и аллергиках всё равно заменим на перекись — это правило бригады.'; }
    else hn.hidden = true;
    const cn = form.querySelector('[data-chem-note]');
    cn.innerHTML = s.chem === 'gentle'
      ? `Без отдушек и хлора: лимонная кислота, сода, пар, перекись. Медленнее на${NB}четверть, поэтому +10${NB}%. <a href="index.html#sostav">Весь состав</a>`
      : s.chem === 'own'
        ? `Возьмём ваши средства, покажите их бригадиру. Наши не везём — минус 300${NB}₽. Пароочиститель и тряпки всё равно наши.`
        : `Обычная бытовая химия с отдушкой. Быстро и привычно. <a href="index.html#sostav">Весь состав с pH и временем проветривания</a>`;
    // время
    const w = r.work;
    form.querySelectorAll('.slot').forEach(l => {
      const inp = l.querySelector('input');
      const st = CH.slotState(s.date, inp.value, w.hours);
      inp.disabled = st !== 'free';
      l.dataset.state = st;
      l.querySelector('[data-slot-note]').textContent = st === 'busy' ? 'занято' : st === 'late' ? 'не успеем' : st === 'past' ? 'уже поздно' : 'до ' + endTime(inp.value, w.hours);
    });
    const cur = form.querySelector(`input[name=slot][value="${s.slot}"]`);
    if (cur && cur.disabled) {
      const free = [...form.querySelectorAll('input[name=slot]')].find(i => !i.disabled);
      if (free) { free.checked = true; S.slot = free.value; CH.save(S); queueMicrotask(() => subs.forEach(f => f(S))); }
      else { cur.checked = false; }
    }
    const anyFree = [...form.querySelectorAll('input[name=slot]')].some(i => !i.disabled);
    form.querySelector('[data-when-note]').textContent = anyFree
      ? `Работа займёт ≈${NB}${CH.hoursText(w.hours)}, приедет ${w.people === 1 ? 'один человек' : w.people + NB + (w.people < 5 ? 'человека' : 'человек')}. Бригада заканчивает до${NB}21:00.`
      : 'На этот день свободных окон нет — выберите другой.';
  }

  function endTime(start, hours) {
    const [h, m] = start.split(':').map(Number);
    const t = h * 60 + m + Math.round(hours * 60);
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }

  function slotOk(s) {
    const { hours } = CH.workload(s);
    return CH.slotState(s.date, s.slot, hours) === 'free';
  }

  /* ---------- корешок ---------- */
  function stubHTML(s, opts) {
    const r = CH.calc(s);
    const row = l => `<li><span class="n">${l.name}${l.calc ? `<small>${l.calc}</small>` : ''}</span><span class="s pen num">${l.sum < 0 ? '−' + CH.fmt(-l.sum) : CH.fmt(l.sum)}</span></li>`;
    const mode = D.CHEM_MODES.find(m => m.id === s.chem);
    const ok = slotOk(s);
    return `
      <p class="stub__k">Корешок наряда № <span class="pen num">${s.number}</span></p>
      <ol class="stub__lines">${r.lines.map(row).join('')}</ol>
      ${r.mods.length ? `<ol class="stub__lines stub__mods">${r.mods.map(m => `<li><span class="n">${m.name}<small>${m.calc}</small></span><span class="s pen num">${m.sum < 0 ? '−' + CH.fmt(-m.sum) : '+' + CH.fmt(m.sum)}</span></li>`).join('')}</ol>` : ''}
      <div class="stub__total"><span>Итого</span><strong class="pen num" data-total>${CH.fmt(r.total)}</strong></div>
      ${r.minApplied ? `<p class="small">Минимальный заказ — ${CH.fmt(D.MIN_ORDER)}: дорога и сборы занимают столько же, сколько маленькая уборка.</p>` : ''}
      <dl class="stub__facts">
        <div><dt>Бригада</dt><dd>${r.work.people === 1 ? '1 человек' : r.work.people + NB + 'человека'}, ≈${NB}${CH.hoursText(r.work.hours)}</dd></div>
        <div><dt>Когда</dt><dd>${ok ? CH.dateLong(s.date) + ', ' + s.slot : '<span class="warn">выберите время</span>'}</dd></div>
        <div><dt>Средства</dt><dd>${mode.short}</dd></div>
        <div><dt>В наряде</dt><dd>${r.count} ${D.plural(r.count, 'пункт', 'пункта', 'пунктов')}</dd></div>
      </dl>
      ${opts && opts.actions === false ? '' : `
      <a class="btn btn--pen" href="order.html" data-go-order>Оформить наряд</a>
      <a class="stub__link" href="#oborot">Что именно сделаем — ${r.count}${NB}${D.plural(r.count, 'пункт', 'пункта', 'пунктов')} ↓</a>`}
      <p class="stub__fine">Цену не меняем на месте, если площадь совпала с${NB}нарядом ±10${NB}%. Оплата после приёмки.</p>`;
  }
  function mountStub(el, opts) {
    on(s => { el.innerHTML = stubHTML(s, opts); });
  }
  function mountBar(el) {
    on(s => {
      const r = CH.calc(s);
      el.innerHTML = `<div><span class="small">Итого · ${r.count}${NB}${D.plural(r.count, 'пункт', 'пункта', 'пунктов')}</span><strong class="pen num">${CH.fmt(r.total)}</strong></div><a class="btn btn--pen" href="order.html">Оформить</a>`;
    });
  }

  /* ---------- оборот: чек-лист ---------- */
  function typeNames(ids) {
    return D.TYPES.filter(t => ids.includes(t.id)).map(t => t.name.toLowerCase()).join(', ');
  }
  function checklistHTML(s, showOff) {
    const rooms = CH.checklist(s);
    let n = 0;
    return rooms.map(room => {
      const items = room.items.map(it => {
        n++;
        const c = CH.chemFor(s, it.chem);
        return `<li class="it${it.extra ? ' it--extra' : ''}"><span class="it__n">${String(n).padStart(2, '0')}</span><span class="it__box" aria-hidden="true"></span><span class="it__x">${esc(it.x)}${c ? `<small>${esc(c.name)}</small>` : ''}</span><span class="it__sign" aria-hidden="true">подпись</span></li>`;
      }).join('');
      const off = showOff ? room.excluded.map(it => `<li class="it it--off"><span class="it__n">—</span><span class="it__box" aria-hidden="true"></span><span class="it__x"><s>${esc(it.x)}</s><small>только: ${typeNames(it.t)}</small></span><span class="it__sign"></span></li>`).join('') : '';
      return `<section class="room">
        <h3 class="room__h">${room.label}<span class="pen num">${room.items.length}</span></h3>
        <ol class="room__list">${items}${off}</ol></section>`;
    }).join('');
  }
  function mountChecklist(el, toggle) {
    const draw = s => { el.innerHTML = checklistHTML(s, toggle && toggle.checked); };
    if (toggle) toggle.addEventListener('change', () => draw(S));
    on(draw);
  }

  /* ---------- состав ---------- */
  function chemHTML(s) {
    if (s.chem === 'own') {
      return `<p class="label__own">Работаем вашими средствами. Перед началом бригадир читает этикетки и${NB}говорит, чем что не${NB}стоит мыть — например, кислотой мрамор. Наши пароочиститель, щётки и${NB}микрофибра — с${NB}собой.</p>`;
    }
    const set = D.CHEM[s.chem === 'gentle' ? 'gentle' : 'standard'];
    return `<table class="label__t">
      <thead><tr><th>Для чего</th><th>Средство</th><th>Действующее вещество</th><th>pH</th><th>Запах</th><th>Проветрить</th><th>Аллергикам</th></tr></thead>
      <tbody>${Object.keys(D.ROLES).map(k => {
        const c = set[k];
        return `<tr><th scope="row">${D.ROLES[k]}</th><td>${c.name}</td><td>${c.active}</td><td class="num">${c.ph}</td><td>${c.smell}</td><td class="num">${c.wait ? c.wait + NB + 'мин' : 'сразу'}</td><td>${c.allergy ? 'да' : 'нет'}</td></tr>`;
      }).join('')}</tbody></table>`;
  }
  function mountChem(el, tabs) {
    if (tabs) tabs.addEventListener('change', e => {
      if (e.target.name !== 'chemTab') return;
      set({ chem: e.target.value, chemTouched: true });
      const r = document.querySelector(`#blank input[name=chem][value=${e.target.value}]`); if (r) r.checked = true;
    });
    on(s => {
      el.innerHTML = chemHTML(s);
      if (tabs) { const r = tabs.querySelector(`input[value=${s.chem}]`); if (r) r.checked = true; }
    });
  }

  return { get state() { return S; }, set, on, mountForm, mountStub, mountBar, mountChecklist, mountChem, stubHTML, checklistHTML, slotOk, TICK, esc, endTime };
})(window.CH_DATA, window.CH);
