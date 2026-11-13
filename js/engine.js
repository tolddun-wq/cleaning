/* Расчёт наряда: цена по строкам, время, бригада, чек-лист. Без DOM. */
window.CH = (function (D) {
  const KEY = 'chistovik-naryad-v1';
  const NB = ' ';

  function fmt(n) {
    const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB);
    return s + NB + '₽';
  }
  function iso(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function parseIso(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

  function defaults() {
    return {
      type: 'general', mode: 'rooms', preset: 'k2', area: 56, rooms: 2, baths: 1,
      house: [], chem: 'standard', chemTouched: false,
      extras: {}, freq: 'once',
      date: iso(firstWeekday(addDays(today(), 2))), slot: '11:00',
      client: {}, number: makeNumber()
    };
  }
  function firstWeekday(d) { while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1); return d; }
  function makeNumber() {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(100 + Math.floor(Math.random() * 800));
  }

  function load() {
    const base = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = Object.assign(base, JSON.parse(raw));
        if (parseIso(s.date) < today()) { s.date = base.date; }
        return s;
      }
    } catch (e) { /* хранилище недоступно — работаем без него */ }
    return base;
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ничего страшного */ }
  }

  const type = s => D.TYPES.find(t => t.id === s.type) || D.TYPES[0];
  const extraIncluded = (x, s) => !!(x.includedIn && x.includedIn.includes(s.type));

  function dateInfo(s) {
    const d = parseIso(s.date);
    const wd = d.getDay();
    return { d, weekend: wd === 0 || wd === 6, urgent: +d === +today() };
  }

  /* Сколько человеко-часов: площадь / норма + доп. услуги */
  function workload(s) {
    const t = type(s);
    let ph = s.area / t.speed;
    if (s.chem === 'gentle') ph *= 1.25;
    ph += (s.baths - 1) * 0.75;
    D.EXTRAS.forEach(x => {
      const n = s.extras[x.id];
      if (n && !extraIncluded(x, s)) ph += (x.min * (x.count ? n : 1)) / 60;
    });
    const people = ph <= 4 ? 1 : ph <= 10 ? 2 : 3;
    const hours = Math.max(1.5, Math.ceil((ph / people) * 4) / 4);
    return { ph, people, hours };
  }

  function calc(s) {
    const t = type(s);
    const lines = [];
    const area = Math.round(s.area);
    lines.push({ name: t.name + ' уборка', calc: area + NB + 'м² × ' + t.rate + NB + '₽', sum: area * t.rate });
    if (s.baths > 1) lines.push({ name: 'Ещё санузел', calc: (s.baths - 1) + ' × ' + fmt(D.BATH_EXTRA), sum: (s.baths - 1) * D.BATH_EXTRA });
    D.EXTRAS.forEach(x => {
      const n = s.extras[x.id];
      if (!n || extraIncluded(x, s)) return;
      const q = x.count ? n : 1;
      lines.push({ name: x.name, calc: x.count ? q + ' × ' + fmt(x.price) : '', sum: q * x.price });
    });
    const base = lines.reduce((a, l) => a + l.sum, 0);
    const mods = [];
    const mode = D.CHEM_MODES.find(m => m.id === s.chem);
    if (mode && mode.pct) mods.push({ name: 'Бережный набор средств', calc: '+' + mode.pct + NB + '%', sum: base * mode.pct / 100 });
    if (mode && mode.flat) mods.push({ name: 'Ваши средства', calc: 'наши не везём', sum: mode.flat });
    const di = dateInfo(s);
    if (di.urgent) mods.push({ name: 'Срочно, сегодня', calc: '+' + D.URGENT_PCT + NB + '%', sum: base * D.URGENT_PCT / 100 });
    else if (di.weekend) mods.push({ name: 'Выходной день', calc: '+' + D.WEEKEND_PCT + NB + '%', sum: base * D.WEEKEND_PCT / 100 });
    const f = D.FREQ.find(x => x.id === s.freq);
    if (f && f.pct) mods.push({ name: 'Регулярно, ' + f.name, calc: f.pct + NB + '%', sum: base * f.pct / 100 });
    let total = base + mods.reduce((a, m) => a + m.sum, 0);
    total = Math.round(total / 10) * 10;
    let minApplied = false;
    if (total < D.MIN_ORDER) { total = D.MIN_ORDER; minApplied = true; }
    const w = workload(s);
    const list = checklist(s);
    const count = list.reduce((a, r) => a + r.items.length, 0);
    return { lines, mods, base, total, minApplied, work: w, count, type: t };
  }

  /* Чек-лист наряда по помещениям */
  function checklist(s) {
    const rooms = [];
    const add = (key, label, mult) => {
      const items = [], excluded = [];
      D.TASKS[key].forEach(task => {
        (task.t.includes(s.type) ? items : excluded).push({ x: task.x, chem: task.chem, t: task.t });
      });
      D.EXTRAS.forEach(x => {
        const n = s.extras[x.id];
        if (x.room !== key) return;
        if (extraIncluded(x, s)) return; // уже в списке как обычный пункт
        if (n) items.push({ x: typeof x.task === 'function' ? x.task(n) : x.task, chem: x.chem, extra: true });
      });
      if (items.length || excluded.length) rooms.push({ key, label, mult, items, excluded });
    };
    add('kitchen', D.ROOMS.kitchen);
    add('rooms', s.rooms > 1 ? D.ROOMS.rooms + ' — ' + s.rooms : 'Комната', s.rooms);
    add('bath', s.baths > 1 ? 'Санузлы — ' + s.baths : D.ROOMS.bath, s.baths);
    add('hall', D.ROOMS.hall);
    if (s.extras.balcony) add('balcony', D.ROOMS.balcony);
    return rooms;
  }

  /* Ближайшие дни и занятые окна (детерминированно, чтобы не прыгали) */
  function days(n) {
    const out = [], t0 = today();
    for (let i = 0; i < n; i++) {
      const d = addDays(t0, i);
      out.push({ iso: iso(d), d, i, weekend: d.getDay() === 0 || d.getDay() === 6 });
    }
    return out;
  }
  function hash(str) { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  function slotState(dateIso, slot, hours) {
    const [hh] = slot.split(':').map(Number);
    if (hh + hours > D.DAY_END) return 'late';
    const d = parseIso(dateIso);
    if (+d === +today()) {
      const now = new Date();
      if (hh < now.getHours() + 3) return 'past';
    }
    if (hash(dateIso + slot) % 4 === 0) return 'busy';
    return 'free';
  }
  function firstFree(s) {
    const { hours } = workload(s);
    for (const day of days(14)) for (const sl of D.SLOTS) if (slotState(day.iso, sl, hours) === 'free') return { date: day.iso, slot: sl };
    return null;
  }

  const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function dateLong(isoStr) { const d = parseIso(isoStr); return d.getDate() + NB + MON[d.getMonth()] + ', ' + WD[d.getDay()]; }
  function hoursText(h) {
    const H = Math.floor(h), M = Math.round((h - H) * 60);
    return H + NB + 'ч' + (M ? ' ' + M + NB + 'мин' : '');
  }

  function chemFor(s, role) {
    if (!role) return null;
    if (s.chem === 'own') return { name: 'ваше средство' };
    return D.CHEM[s.chem === 'gentle' ? 'gentle' : 'standard'][role];
  }

  return { load, save, defaults, calc, checklist, workload, fmt, days, slotState, firstFree, dateLong, hoursText, chemFor, dateInfo, parseIso, iso, WD, MON, extraIncluded, type };
})(window.CH_DATA);
