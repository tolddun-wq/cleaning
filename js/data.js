/* «Чистовик» — все цены, пункты наряда и состав средств в одном месте.
   Отсюда берут данные главная (бланк, чек-лист, состав) и страница заказа. */
window.CH_DATA = (function () {
  const ALL = ['support', 'general', 'move', 'repair'];

  const TYPES = [
    { id: 'support', name: 'Поддерживающая', rate: 95, speed: 28,
      note: 'Пыль, полы, кухня и санузел. Чтобы держать порядок раз в неделю-две.' },
    { id: 'general', name: 'Генеральная', rate: 190, speed: 13,
      note: 'Всё из поддерживающей, плюс шкафы внутри, налёт, швы, радиаторы, двери.' },
    { id: 'move', name: 'Перед въездом', rate: 150, speed: 18,
      note: 'Пустая квартира: шкафы изнутри, сантехника, пыль после переезда.' },
    { id: 'repair', name: 'После ремонта', rate: 260, speed: 9,
      note: 'Строительная пыль, затирка, скотч и краска. Два прохода по всем поверхностям.' }
  ];

  /* Типовые квартиры — площадь, по которой считаем «по комнатам» */
  const PRESETS = [
    { id: 'studio', name: 'Студия', area: 28, rooms: 1 },
    { id: 'k1', name: '1-комн.', area: 38, rooms: 1 },
    { id: 'k2', name: '2-комн.', area: 56, rooms: 2 },
    { id: 'k3', name: '3-комн.', area: 78, rooms: 3 },
    { id: 'k4', name: '4-комн.', area: 102, rooms: 4 }
  ];

  const BATH_EXTRA = 1200;     // каждый санузел сверх первого
  const MIN_ORDER = 2900;      // минимальный заказ

  const EXTRAS = [
    { id: 'oven', name: 'Духовка изнутри', price: 900, min: 40, room: 'kitchen',
      task: 'Отмыть духовку изнутри: стенки, стекло дверцы, противни', chem: 'degreaser' },
    { id: 'fridge', name: 'Холодильник изнутри', price: 900, min: 40, room: 'kitchen', hint: 'разморозьте накануне',
      task: 'Вымыть холодильник изнутри: полки, ящики, уплотнитель', chem: 'surfaces' },
    { id: 'micro', name: 'Микроволновка изнутри', price: 400, min: 15, room: 'kitchen',
      task: 'Отмыть микроволновку изнутри и тарелку', chem: 'degreaser' },
    { id: 'hood', name: 'Вытяжка: фильтр и решётка', price: 600, min: 30, room: 'kitchen', includedIn: ['general', 'repair'],
      task: 'Вытяжка: снять и отмыть решётку и жировой фильтр', chem: 'degreaser' },
    { id: 'windows', name: 'Окна с двух сторон', price: 350, unit: 'створка', count: true, max: 20, min: 15, room: 'rooms',
      task: n => `Вымыть окна с двух сторон: ${n} ${plural(n, 'створка', 'створки', 'створок')}, рамы, отливы изнутри`, chem: 'glass' },
    { id: 'balcony', name: 'Балкон или лоджия', price: 1200, min: 45, room: 'balcony',
      task: 'Балкон: пол, подоконник, рамы изнутри, вынести мусор', chem: 'floor' },
    { id: 'cabinets', name: 'Шкафы и комоды в комнатах', hint: 'кухонные входят в генеральную', price: 300, unit: 'шт.', count: true, max: 15, min: 15, room: 'rooms', includedIn: ['move'],
      task: n => `Шкафы и комоды изнутри: ${n} шт., вынуть и вернуть вещи на место`, chem: 'surfaces' },
    { id: 'chandelier', name: 'Люстры и плафоны', price: 450, unit: 'шт.', count: true, max: 10, min: 20, room: 'rooms',
      task: n => `Люстры и плафоны: ${n} шт., снять, вымыть, вернуть`, chem: 'glass' },
    { id: 'ironing', name: 'Глажка белья', price: 700, unit: 'час', count: true, max: 4, min: 60, room: 'rooms',
      task: n => `Погладить бельё: ${n} ч`, chem: null },
    { id: 'pethair', name: 'Шерсть с мягкой мебели', price: 600, min: 30, room: 'rooms',
      task: 'Снять шерсть с дивана и кресел щёткой и пылесосом', chem: null },
    { id: 'litter', name: 'Лоток и место питомца', price: 300, min: 15, room: 'hall',
      task: 'Вымыть лоток и миски, протереть место питомца', chem: 'surfaces' },
    { id: 'dishes', name: 'Посуда сверх одной раковины', price: 500, min: 30, room: 'kitchen',
      task: 'Перемыть посуду сверх одной раковины', chem: 'surfaces' }
  ];

  const HOUSE = [
    { id: 'kids', name: 'Ребёнок до 3 лет' },
    { id: 'pets', name: 'Кошка или собака' },
    { id: 'allergy', name: 'Аллергия' },
    { id: 'asthma', name: 'Астма' },
    { id: 'smell', name: 'Не переношу запахи' }
  ];

  const CHEM_MODES = [
    { id: 'standard', name: 'стандартный', short: 'Стандартный набор' },
    { id: 'gentle', name: 'бережный', short: 'Бережный набор', pct: 10 },
    { id: 'own', name: 'ваши средства', short: 'Ваши средства', flat: -300 }
  ];

  const FREQ = [
    { id: 'once', name: 'разово', pct: 0 },
    { id: 'month', name: 'раз в месяц', pct: -5 },
    { id: 'biweek', name: 'раз в 2 недели', pct: -10 },
    { id: 'week', name: 'каждую неделю', pct: -15 }
  ];

  const SLOTS = ['8:00', '11:00', '14:00', '17:00'];
  const URGENT_PCT = 20;   // сегодня
  const WEEKEND_PCT = 10;  // суббота и воскресенье
  const DAY_END = 21;      // бригада заканчивает до 21:00

  const ROOMS = {
    kitchen: 'Кухня',
    rooms: 'Комнаты',
    bath: 'Санузел',
    hall: 'Прихожая',
    balcony: 'Балкон'
  };

  /* Пункты наряда: t — в каких видах уборки пункт есть, chem — каким средством */
  const TASKS = {
    kitchen: [
      { x: 'Фасады кухни снаружи, ручки', t: ALL, chem: 'surfaces' },
      { x: 'Столешница и фартук', t: ALL, chem: 'surfaces' },
      { x: 'Мойка и смеситель, снять налёт', t: ALL, chem: 'plumbing' },
      { x: 'Плита сверху, решётки, ручки', t: ALL, chem: 'degreaser' },
      { x: 'Техника снаружи: холодильник, духовка, микроволновка', t: ALL, chem: 'surfaces' },
      { x: 'Посуда — одна раковина', t: ['support'], chem: 'surfaces' },
      { x: 'Шкафы изнутри, полки', t: ['general', 'move', 'repair'], chem: 'surfaces' },
      { x: 'Вытяжка: корпус, решётка, фильтр', t: ['general', 'repair'], chem: 'degreaser' },
      { x: 'Швы плитки на фартуке щёткой', t: ['general', 'repair'], chem: 'mould' },
      { x: 'Строительная пыль со всех поверхностей, второй проход', t: ['repair'], chem: 'surfaces' },
      { x: 'Пол, плинтусы', t: ALL, chem: 'floor' },
      { x: 'Вынести мусор — до 3 пакетов', t: ALL, chem: null }
    ],
    rooms: [
      { x: 'Пыль с открытых поверхностей и техники', t: ALL, chem: 'surfaces' },
      { x: 'Зеркала и стёкла в мебели', t: ALL, chem: 'glass' },
      { x: 'Подоконники', t: ALL, chem: 'surfaces' },
      { x: 'Пропылесосить ковры и мягкую мебель', t: ['support', 'general'], chem: null },
      { x: 'Заправить постель, сложить пледы', t: ['support'], chem: null },
      { x: 'Двери, ручки, выключатели, розетки', t: ['general', 'move', 'repair'], chem: 'surfaces' },
      { x: 'Радиаторы и трубы', t: ['general', 'move', 'repair'], chem: 'surfaces' },
      { x: 'Верх шкафов, карнизы', t: ['general', 'repair'], chem: 'surfaces' },
      { x: 'Следы краски, скотча и затирки', t: ['repair'], chem: 'surfaces' },
      { x: 'Пол под кроватью и диваном, где достаём', t: ALL, chem: 'floor' },
      { x: 'Пол и плинтусы', t: ALL, chem: 'floor' }
    ],
    bath: [
      { x: 'Ванна или душ, смеситель, лейка', t: ALL, chem: 'plumbing' },
      { x: 'Унитаз внутри и снаружи', t: ALL, chem: 'plumbing' },
      { x: 'Раковина и зеркало', t: ALL, chem: 'glass' },
      { x: 'Плитка вокруг ванны', t: ['support'], chem: 'surfaces' },
      { x: 'Плитка на стенах до 2 м', t: ['general', 'move', 'repair'], chem: 'surfaces' },
      { x: 'Известковый налёт на стекле и кранах', t: ['general', 'move', 'repair'], chem: 'plumbing' },
      { x: 'Швы плитки щёткой, тёмные пятна', t: ['general', 'repair'], chem: 'mould' },
      { x: 'Полотенцесушитель и трубы', t: ['general', 'move', 'repair'], chem: 'surfaces' },
      { x: 'Пол', t: ALL, chem: 'floor' }
    ],
    hall: [
      { x: 'Зеркало', t: ALL, chem: 'glass' },
      { x: 'Обувная полка снаружи', t: ['support', 'general'], chem: 'surfaces' },
      { x: 'Входная дверь с двух сторон', t: ['general', 'move', 'repair'], chem: 'surfaces' },
      { x: 'Шкаф-купе изнутри', t: ['general', 'move'], chem: 'surfaces' },
      { x: 'Пол, вытряхнуть коврик', t: ALL, chem: 'floor' }
    ],
    balcony: []
  };

  /* Состав средств. Роли совпадают с chem у пунктов наряда. */
  const ROLES = {
    surfaces: 'Поверхности',
    plumbing: 'Сантехника и налёт',
    degreaser: 'Жир на кухне',
    glass: 'Стёкла и зеркала',
    mould: 'Швы и тёмные пятна',
    floor: 'Полы'
  };

  const CHEM = {
    standard: {
      surfaces: { name: 'Универсальный концентрат', active: 'НПАВ <5 %, отдушка, консервант', ph: '8', smell: 'лёгкий', wait: 15, allergy: false },
      plumbing: { name: 'Кислотный гель для сантехники', active: 'сульфаминовая кислота 5–15 %', ph: '1–2', smell: 'есть', wait: 30, allergy: false },
      degreaser: { name: 'Щелочной жироудалитель', active: 'гидроксид натрия <5 %, НПАВ', ph: '13', smell: 'резкий', wait: 30, allergy: false },
      glass: { name: 'Средство для стёкол', active: 'изопропанол 5–15 %', ph: '7', smell: 'лёгкий', wait: 0, allergy: false },
      mould: { name: 'Хлорный гель для швов', active: 'гипохлорит натрия <5 %', ph: '12', smell: 'хлор', wait: 60, allergy: false },
      floor: { name: 'Средство для полов', active: 'НПАВ <5 %, отдушка', ph: '9', smell: 'лёгкий', wait: 15, allergy: false }
    },
    gentle: {
      surfaces: { name: 'Растительный концентрат без отдушки', active: 'алкилполиглюкозиды <5 %', ph: '7', smell: 'нет', wait: 0, allergy: true },
      plumbing: { name: 'Лимонная кислота, раствор 5 %', active: 'лимонная кислота', ph: '2', smell: 'нет', wait: 10, allergy: true },
      degreaser: { name: 'Кальцинированная сода и пар 140 °C', active: 'карбонат натрия', ph: '11', smell: 'нет', wait: 10, allergy: true },
      glass: { name: 'Микрофибра и вода с уксусом 1:10', active: 'уксусная кислота <1 %', ph: '3', smell: 'уходит за 10 мин', wait: 0, allergy: true },
      mould: { name: 'Перекись водорода 3 %', active: 'перекись водорода', ph: '4', smell: 'нет', wait: 10, allergy: true },
      floor: { name: 'Пар и вода без добавок', active: '—', ph: '7', smell: 'нет', wait: 0, allergy: true }
    }
  };

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  return {
    TYPES, PRESETS, BATH_EXTRA, MIN_ORDER, EXTRAS, HOUSE, CHEM_MODES, FREQ, SLOTS,
    URGENT_PCT, WEEKEND_PCT, DAY_END, ROOMS, TASKS, ROLES, CHEM, plural,
    COMPANY: {
      name: 'Чистовик',
      city: 'Нижний Новгород',
      address: 'ул. Белинского, 61, офис 4',
      phone: '+7 831 000-00-00',
      hours: 'ежедневно 8:00–21:00',
      telegram: 'https://t.me/isthisthedaggr',
      telegramUser: '@isthisthedaggr'
    }
  };
})();
