// data.js — данные игры и настройки графики. Логику (index.html) править не нужно.
// ВСЁ содержимое, кроме размеров спрайта Андрея, ТЕСТОВОЕ: цены, единицы, персонажи, слухи.
// Игра начинается 1 июня 1812 года по старому стилю (подтверждено Кириллом). Валюту, меры и исторические обстоятельства проверяем отдельно.

// Версия формата данных. index.html работает только с data.js той же версии (иначе покажет понятное сообщение).
const DATA_VERSION = 24;

// Графика. ВСЕ файлы необязательны: пока файла нет (или у него не тот размер), рисуется временная заглушка.
// background — цельный фон лавки в координатах мира, ровно SCENE.worldW × 270 (594×270), без прозрачности.
//   Когда фон подключён, старые окна, полки, прилавок и ковёр из прямоугольников не рисуются.
// counterFront — передняя часть прилавка отдельным слоем: рисуется ПОВЕРХ Андрея, когда он стоит за прилавком, и ПОД покупателем.
//   Файл 594×270 с прозрачностью (непрозрачна только область прилавка, пиксели те же, что в фоне, поэтому дыр и двойных контуров нет).
//   Если файла нет, а фон есть, слой вырезается из фона по прямоугольнику rect (координаты мира).
// foreground — передний план: ящики справа перед дверью, 594×270 с прозрачностью; рисуется поверх всех персонажей, поэтому
//   Андрей и покупатели проходят позади ящиков. Это точная копия пикселей фона внутри силуэта ящиков (собирается tools/make_shop.py).
// portrait — размер крупного портрета в режиме обслуживания (пути портретов лежат у персонажей); goodsIcon — размер значка товара в панели.
// stockMarks — временные квадратики остатка товара: show 'auto' = рисовать только пока фон ещё заглушка; true/false — принудительно.
//   Нарисованные на фоне мешки и корзины ОСТАТОК НЕ ПОКАЗЫВАЮТ: точный остаток — только в торговой панели.
// hd — те же слои в высоком разрешении (в hdScale раз крупнее, без палитры; собирает tools/make_shop_hd.py). Если файл есть,
//   игра рисует его вместо обычного слоя, плавно уменьшая под окно: фон чёткий, а персонажи остаются пиксельными на сетке 480×270.
//   hdNight — ночная версия тех же слоёв (рисуется в части дня с night: true, см. TIME.light). ?hd=0 в адресе — обычные пиксельные слои.
const ART = {
  hdScale: 3,
  background:   { src: 'assets/places/shop/shop.png', hd: 'assets/places/shop/shop_hd.png', hdNight: 'assets/places/shop/shop_night_hd.png' },
  counterFront: { src: 'assets/places/shop/shop_counter.png', hd: 'assets/places/shop/shop_counter_hd.png', hdNight: 'assets/places/shop/shop_counter_night_hd.png',
                  rect: { x: 202, y: 142, w: 328, h: 62 } },
  foreground:   { src: 'assets/places/shop/shop_front.png', hd: 'assets/places/shop/shop_front_hd.png', hdNight: 'assets/places/shop/shop_front_night_hd.png' },
  glass:        { src: 'assets/places/shop/shop_glass.png' },   // стёкла окна (по ним проходят прохожие), собирает tools/make_shop.py
  portrait:  { w: 180, h: 204 },
  goodsIcon: { w: 36, h: 36 },
  stockMarks: { show: 'auto', x: 240, y: 147, groupStep: 90, perRow: 5, gap: 6, size: 4 }
};

const ANDREY = {                      // утверждённые параметры первого теста
  cellW: 144, cellH: 120, anchorX: 72, floorY: 114,  // сетка 480×270: Андрей 104 пикселя, подошвы в строке 113 ячейки
  // ходьба: 8 кадров (лист 1152×120) из рисунков ChatGPT, утверждена Кириллом (tools/fix_walk.py, одна голова на все кадры).
  // weights — сколько пикселей пути держится каждый кадр: столько опорная стопа уходит назад до следующего кадра.
  // Пока нет файла: статичный кадр покоя (НЕ анимация)
  walk: { src: 'assets/characters/andrey/andrey_walk.png', frames: 8, weights: [19, 15, 5, 11, 18, 14, 4, 10] },
  idle: { src: 'assets/characters/andrey/andrey_idle.png' },
  // за прилавком (необязательные файлы; пока их нет — кадр покоя): ждёт покупателя (2 кадра, второй — короткое постукивание
  // пальцами) и передаёт товар при продаже (3 кадра, проигрываются один раз). Ячейки 144×120, опора и подошвы как у покоя.
  counter: { src: 'assets/characters/andrey/andrey_counter.png', frames: 2, times: [3, 0.35] },   // секунд на кадр
  give: { src: 'assets/characters/andrey/andrey_give.png', frames: 3, time: 0.3 },
  cycleDistance: 96                   // пикселей пути на цикл (два шага) = сумма walk.weights
};

// Товары: unit — единица, stock — остаток на старте, cost — закупка за единицу, price — начальная цена продажи
const GOODS = {
  grain:  { name: 'Крупа',          unit: 'мешочек', stock: 10, cost: 6, price: 10, color: '#c9893a', icon: 'assets/goods/grain.png' },
  bread:  { name: 'Хлеб',           unit: 'буханку', stock: 8,  cost: 3, price: 5,  color: '#a8672a', icon: 'assets/goods/bread.png' },
  apples: { name: 'Сушёные яблоки', unit: 'свёрток', stock: 6,  cost: 4, price: 7,  color: '#d8d0a0', icon: 'assets/goods/apples.png' },
  // Товары лабаза Сорокина (21.10.2026): в лавке на старте их нет, появляются только после заказа. Покупателей на них пока нет.
  flour:  { name: 'Мука',           unit: 'мешочек', stock: 0,  cost: 5, price: 8,  color: '#e6dcc4', icon: 'assets/goods/flour.png' },
  millet: { name: 'Пшено',          unit: 'мешочек', stock: 0,  cost: 5, price: 8,  color: '#e0b84a', icon: 'assets/goods/millet.png' },
  peas:   { name: 'Горох',          unit: 'мешочек', stock: 0,  cost: 4, price: 7,  color: '#9aa84e', icon: 'assets/goods/peas.png' }
};
const START = { money: 30 };

// Время. Дни идут по старому стилю (юлианский календарь, как считали в России в 1812 году). Время меняется от действий, а не по часам:
// утро (лавка закрыта) → «E — Открыть лавку» у рабочего места → день (приходят покупатели дня) → «Закрыть лавку» за прилавком
// → вечер (итоги дня) → «E — Закончить день» у рабочего места → ночь → следующий день из списка DAYS.
// year — год; phases — названия частей дня (в углу экрана); travelWhenOpen — можно ли уходить через карту, пока лавка открыта;
// light — свет и цветокоррекция в каждую часть дня (см. ниже).
const TIME = {
  year: 1812,
  phases: { morning: 'утро', day: 'день', evening: 'вечер' },
  travelWhenOpen: false,
  lightFade: 2.5,
  // Свет и цвет в разное время суток (как свет рисуется — см. lights у сцены):
  //   dark — насколько темнеет сцена (0 — нисколько, 1 — полностью), darkColor — цвет сумрака;
  //   window — сила света из окна, warm — сила свечей и лампад (1 — полная);
  //   grade — цветокоррекция всей сцены (CSS-фильтр: saturate — насыщенность, contrast — контраст, brightness — яркость);
  //   vignette — затемнение краёв кадра (0 — нет, 1 — края чёрные), vignetteColor — его цвет;
  //   night: true — рисовать ночную версию фона лавки (ART …hdNight). Она уже тёмная, поэтому сумрак dark слабее;
  //   darkNoNight — сумрак, когда ночного фона нет (другие места, ?hd=0);
  //   ambient — общий тон персонажей (умножение цвета: белый — без изменений; вечером темнее, чтобы фигуры не «светились»).
  //   lightFade — за сколько секунд свет, фон и тон персонажей плавно переходят при смене части дня.
  //   Насыщенность снижена 26.10.2026: фон лавки в высоком разрешении (shop_hd.png) ярче пиксельного.
  light: {
    morning: { ambient: '#c8cde0', dark: 0.16, darkColor: '#1a2444', window: 1.0, warm: 0.45, vignette: 0.35, vignetteColor: '#0b1022', grade: 'saturate(1.05) contrast(1.06) brightness(1.02)' },
    day:     { ambient: '#e8e0d2', dark: 0,    darkColor: '#000000', window: 0.8, warm: 0.4,  vignette: 0.28, vignetteColor: '#140c08', grade: 'saturate(1.1) contrast(1.08) brightness(1.03)' },
    evening: { ambient: '#8c8299', dark: 0, darkNoNight: 0.55, night: true, darkColor: '#160c12', window: 0.1, warm: 1.0,  vignette: 0.4,  vignetteColor: '#080406', grade: 'saturate(1.08) contrast(1.1) brightness(1.0)' }
  }
};
// Играбельные дни по порядку. date — [число, месяц] по старому стилю. Дни можно пропускать: между главами время перематывается.
// chapter — название главы (показывается перед первым днём главы); skip — текст перемотки (что случилось за пропущенное время);
// visits — какие приходы покупателей (id из VISITS) будут в этот день, по порядку. Один человек может прийти в разные дни.
// cutscene — сцена-ролик (id из CUTSCENES), которая играет, когда игрок заканчивает этот день («E — Закончить день»).
// morning — строка на утренней заставке дня (ждёт E), например «Мать с утра сидит над тетрадью».
// После последнего дня игра сообщает, что это конец текущей версии.
// ЧЕРНОВИК: главы, даты и тексты перемоток предложены для обсуждения, исторические подробности проверяем отдельно.
// Покупатели пока есть только в первую неделю (1–7 июня).
const DAYS = [
  { date: [1, 6], chapter: 'Глава 1. Окна на Ильинку', visits: ['pavel_1', 'darya_1', 'tatiana_1'] },
  { date: [2, 6], visits: ['fedor_1'] },
  { date: [3, 6], visits: ['darya_2'] },
  { date: [4, 6], visits: ['fedor_2'] },
  { date: [5, 6], visits: ['pavel_2'] },
  { date: [6, 6], visits: ['fedor_3'], morning: 'Мать с утра сидит над какой-то тетрадью.' },
  { date: [7, 6], visits: ['darya_3', 'pavel_3'] },
  { date: [24, 6], chapter: 'Глава 2. Первые вести', visits: [],
    skip: 'Прошло больше двух недель. По городу ползут слухи: французы перешли Неман, началась война.' },
  { date: [25, 6], visits: [] },
  { date: [26, 6], visits: [] },
  { date: [27, 6], visits: [] },
  { date: [28, 6], visits: [] },
  { date: [29, 6], visits: [] },
  { date: [30, 6], visits: [] },
  { date: [11, 7], chapter: 'Глава 3. Государь в Москве', visits: [],
    skip: 'Прошло две недели. Армия отступает. Говорят, в Москву едет сам государь.' },
  { date: [12, 7], visits: [] },
  { date: [13, 7], visits: [] },
  { date: [14, 7], visits: [] },
  { date: [15, 7], visits: [] },
  { date: [16, 7], visits: [] },
  { date: [17, 7], visits: [] },
  { date: [8, 8], chapter: 'Глава 4. Тревога', visits: [],
    skip: 'Прошло три недели. Вести с запада всё тревожнее: говорят, оставлен Смоленск.' },
  { date: [9, 8], visits: [] },
  { date: [10, 8], visits: [] },
  { date: [11, 8], visits: [] },
  { date: [12, 8], visits: [] },
  { date: [13, 8], visits: [] },
  { date: [14, 8], visits: [] },
  { date: [19, 8], chapter: 'Глава 5. Ожидание', visits: [],
    skip: 'Прошло несколько дней. Армией теперь командует Кутузов, все ждут большого сражения.' },
  { date: [20, 8], visits: [] },
  { date: [21, 8], visits: [] },
  { date: [22, 8], visits: [] },
  { date: [23, 8], visits: [] },
  { date: [24, 8], visits: [] },
  { date: [25, 8], visits: [] },
  { date: [26, 8], chapter: 'Глава 6. Последняя неделя', visits: [],
    skip: 'Где-то под Можайском идёт большое сражение.' },
  { date: [27, 8], visits: [] },
  { date: [28, 8], visits: [] },
  { date: [29, 8], visits: [] },
  { date: [30, 8], visits: [] },
  { date: [31, 8], visits: [] },
  { date: [1, 9], visits: [] },
  { date: [2, 9], chapter: 'Финал', visits: [], cutscene: 'fire' }
];

// Сцены-ролики (синематики) в духе Valiant Hearts: плоские рисованные слои с параллаксом, силуэты, короткие подписи, в конце историческая справка.
// Играют поверх игры на сетке 480×270; управление у игрока отбирается. E, пробел, Enter или щелчок — следующий кадр, Esc — пропустить сцену.
// Посмотреть сцену без прохождения: index.html?scene=fire (сохранение не меняется).
// worldW — ширина мира сцены (камера ездит по нему); layers — слои от дальних к ближним:
//   par — параллакс (0 — неподвижен, 1 — движется вместе с камерой), src — картинка worldW×270 с прозрачностью (необязательна:
//   пока файла нет, слой рисуется временной графикой кодом, в палитре игры).
// shots — кадры по порядку: time — секунд (потом сам переходит дальше), cam — [откуда, куда] камера по x,
//   heat — [в начале, в конце] сила пожара 0…1 (небо, огонь, дым, искры), figures — показывать Андрея и мать спиной к зрителю,
//   text — подпись внизу, fact — историческая справка карточкой (вместо подписи), fade — затемнение в начале и в конце кадра, секунд.
// ЧЕРНОВИК: тексты и цифры справки проверить с Кириллом по источникам.
const CUTSCENES = {
  fire: {
    title: 'Пожар Москвы',
    sound: 'fire',
    worldW: 760,
    layers: {
      sky:     { par: 0 },
      far:     { par: 0.25, src: 'assets/cutscenes/fire/fire_far.png' },    // дальний город: Кремль, колокольня Ивана Великого, купола
      mid:     { par: 0.6,  src: 'assets/cutscenes/fire/fire_mid.png' },    // крыши Китай-города, Гостиный двор
      near:    { par: 1,    src: 'assets/cutscenes/fire/fire_near.png' }    // улица у лавки: забор, ворота, телега
    },
    figures: { x: 330, y: 262 },       // где стоят Андрей и мать (координаты мира ближнего слоя), рисуются силуэтами из их спрайтов
    shots: [
      { time: 7,  cam: [0, 60],   heat: [0, 0.05],  fade: 1.2,
        text: '2 сентября 1812 года. Русская армия прошла через Москву и ушла по Рязанской дороге. Город опустел.' },
      { time: 7,  cam: [60, 130], heat: [0.05, 0.3], fade: 0.6,
        text: 'Днём в город вошли французы. А ночью над Китай-городом поднялось зарево.' },
      { time: 8,  cam: [150, 170], heat: [0.35, 0.6], fade: 0.6, figures: true,
        text: 'Горели Гостиный двор и торговые ряды. Огонь шёл по крышам, от лавки к лавке.' },
      { time: 8,  cam: [170, 280], heat: [0.6, 0.9],  fade: 0.6,
        text: 'Ветер раздувал пламя. Тушить было нечем: пожарные трубы увезли из города.' },
      { time: 9,  cam: [280, 150], heat: [0.95, 1],   fade: 0.6, figures: true,
        text: 'Над Кремлём стояло красное небо. Москва горела.' },
      { time: 12, cam: [150, 150], heat: [0.7, 0.7],  fade: 1.2,
        fact: { title: 'Как это было', text: 'Первые пожары вспыхнули в ночь со 2 на 3 сентября, а пожар бушевал до 6 сентября (по новому стилю 14–18 сентября). Из 9 тысяч домов сгорело около 6,5 тысячи, вместе с ними тысячи лавок, церкви, усадьбы, университет. Кто поджигал город, спорят до сих пор: сами москвичи по приказу Ростопчина, французские мародёры или случайный огонь в брошенных домах.' } }
    ]
  }
};

// Сцена: координаты МИРА в пикселях (экран 480×270 показывает часть лавки, камера следует за Андреем).
// worldW — ширина лавки (= ширина фона), lane — линия пола перед прилавком (по ней Андрей ходит свободно),
// walkMin / walkMax — границы ходьбы по x: слева мешки и мать (за табуретом идём по floorPath вглубь); справа дверь (за 558 — стена). У двери Андрей проходит ПОЗАДИ ящиков (слой foreground),
// workX — рабочее место: здесь подсказка «E — Встать за прилавок» и здесь Андрей стоит за прилавком (ноги на линии serviceY):
//   x = 448 — голова и торс на гладкой стенной панели (x ≈ 395–468), у правого края книги; фигура целиком левее панели цены; лицом влево, к покупателю;
// customerX — где стоит покупатель (перед прилавком), motherX — мать (у мешков с крупой слева, motherY — глубже линии ходьбы, на одной
// линии пола с мешками, чтобы табурет на переднем плане был перед ней; motherDir -1 — лицом к мешкам;
// Андрей ближе 162 не подходит, поэтому с матерью можно заговорить с motherTalk пикселей), talkRange — на каком расстоянии можно заговорить,
// talkGap — на каком расстоянии от собеседника Андрей встаёт в разговоре (если подошёл ближе, сам отходит шагами),
// counter — границы прилавка (нужны только для заглушки).
// doorX — дверь (справа на фоне): отсюда покупатели входят и сюда уходят; customerSpeed — их скорость (пикселей в секунду);
// arrivalDelay — через сколько секунд после ухода одного покупателя в двери появляется следующий.
// charScale — во сколько раз игра увеличивает всех персонажей при рисовании. 1 = как нарисовано (Андрей 104 пикселя в ячейке 144×120).
// placeholderScale — во сколько раз крупнее рисуются человечки-заглушки (они задуманы ростом 66 для старой сетки 320×180).
// Сетка 480×270 с 21.10.2026 (раньше 320×180, все координаты умножены на 1,5).
const SCENE = { charScale: 1, placeholderScale: 1.5, worldW: 594, lane: 225, startX: 225, walkMin: 140, walkMax: 558, talkRange: 35, talkGap: 40,
                // floorPath — линия пола, если она не прямая: точки [x, y]; между ними плавно, за крайними — как у крайней точки.
                // Слева за табуретом переднего плана линия уходит вглубь (на линию мешков и матери), чтобы табурет был перед
                // персонажем, а не под его ногами. По ней ходят Андрей и будущие персонажи.
                floorPath: [[146, 212], [172, 225]],
                workX: 448, serviceY: 200, customerX: 387, motherX: 112, motherY: 212, motherDir: -1, motherTalk: 55, counter: { l: 202, r: 530 },
                doorX: 558, customerSpeed: 60, arrivalDelay: 1.5,
                // Свет лавки (координаты мира, по фону): window — окно (стекло x0..x1, y0..y1) и косой луч beam на пол с пылинками;
                // flame — пламя (мерцает, flicker — насколько); glow — ровное тёплое свечение. r — радиус света, color — цвет.
                lights: [
                  { kind: 'window', x0: 57, y0: 50, x1: 100, y1: 115, beam: [[57, 52], [100, 52], [178, 228], [96, 228]], color: '#8fb8ff' },
                  { kind: 'flame', x: 503, y: 119, r: 85, color: '#ffb35a', flicker: 0.12 },
                  { kind: 'flame', x: 531, y: 52, r: 55, color: '#ffc46e', flicker: 0.16 },
                  { kind: 'glow', x: 357, y: 122, r: 90, color: '#ff9c44', flicker: 0.03 }
                ],
                shadow: { w: 30, h: 7, alpha: 0.32, core: 0.55 },   // тень под ногами персонажей (ширина, высота, плотность; core — доля второго, плотного пятна под ступнями)
                // Свет на персонажах: side — сила мягкой заливки со стороны источника, rim — сила блика по краю силуэта,
                // rimWidth — толщина блика (пиксели), rimFade — на какой доле роста (сверху) блик гаснет, reach — во сколько раз дальше радиуса r источник ещё светит на фигуру,
                // windowR — радиус света окна для фигур (окно светит от пятна луча на полу).
                charLight: { side: 0.55, rim: 0.9, rimWidth: 1, rimFade: 0.75, reach: 1.6, windowR: 110 },
                // Прохожие за окном: тёмные силуэты в длинной одежде видны только на стекле (позади рамы и кувшинов).
                // x0..x1 — где идут (за окном), feetY — линия ног (ниже подоконника), height — рост, speed — скорость,
                // every — через сколько секунд появляется следующий, phases — в какие части дня ходят.
                passersby: { x0: 40, x1: 118, feetY: 122, height: [30, 36], speed: [7, 12], every: [5, 13], color: '#2a3a66', phases: ['morning', 'day'],
                             // типовые NPC за стеклом (уменьшены до height взрослого, дети ниже), тонированы color на долю tint; без файлов — прежние силуэты
                             types: ['woman', 'girl_young', 'old_man', 'old_woman', 'merchant', 'peasant', 'soldier', 'boy', 'girl_child', 'priest'], tint: 0.55 },
                // Типовые NPC в лавке (стоят, не разговаривают с Андреем): места spots, кто где стоит — случайно, свой набор на каждый день
                // (тот же день — те же люди, в том числе после загрузки). Место: x, y — где ноги (y меньше линии пола — дальше), dir — 1 лицом
                // вправо, -1 влево; who — кто может тут стоять (типы NPC_TYPES, вариант цвета случайный); pair — беседа двоих: вторая точка
                // (x2, y2, dir2) и пары [говорит, слушает]; look — раз в столько секунд оборачивается; behind — за ящиками переднего плана;
                // phases — в какие части дня место бывает занято (без phases — только днём). crowd — сколько мест занято: [от, до] на часть дня (нет — никого).
                // Левее 207 — место матери (сортирует, метёт, протирает бочонки: x 112–182), туда никого не ставим. Ребёнок своего места не имеет (см. rules.kids).
                // Перед прилавком (x 202–530) ноги не дальше y 206: там основание прилавка и сундуки, дальше человек «стоит в прилавке».
                // Утром лавка ещё закрыта (кто-то может ждать у двери), вечером закрыта — никого. Свободная полоса у прилавка
                // (x 360–470, там покупатель и Андрей) не занята.
                spots: [
                  { id: 'shelf',  x: 218, y: 207, dir: -1, look: 10, who: ['s_look', 'old_man', 'old_woman', 'peasant'] },          // дальний ряд у края прилавка, смотрит на левые полки
                  { id: 'talk',   x: 256, y: 216, dir: 1, pair: [['s_talk', 's_listen'], ['m_talk', 'm_listen'], ['s_talk', 'woman'], ['m_talk', 'peasant']],
                    x2: 300, y2: 220, dir2: -1 },                                                                                  // беседа двоих чуть ближе дальнего ряда, лицом друг к другу
                  { id: 'grain',  x: 332, y: 207, dir: 1, look: 13, who: ['s_point', 'woman', 'girl_young', 'old_woman'], child: [16, 8] },  // дальний ряд у ящиков с крупой
                  { id: 'grain2', x: 494, y: 208, dir: -1, look: 9, who: ['girl_young', 'woman', 'old_woman'], child: [16, 8] },  // правая часть прилавка, у весов (проход 360–470 свободен)
                  { id: 'door',   x: 538, y: 216, dir: -1, leave: 0.5, look: 8, phases: ['morning', 'day'],
                    who: ['woman', 'old_woman', 'merchant', 'soldier', 'priest', 'girl_young'], child: [-18, 8] },            // у двери: ждёт (лицом в лавку) или уходит (лицом к двери)
                  { id: 'corner', x: 580, y: 250, dir: -1, behind: true, chance: 0.2, chapters: 3, minCrowd: 4,
                    who: ['m_listen', 'peasant', 'soldier', 'merchant'] }                                                           // передний план за ящиками: редко
                ],
                // Правила расстановки (shopExtras в index.html): left — у левой части прилавка (x от..до) не больше max человек;
                // gap — фигуры почти на одной глубине (разница y меньше dy) не заходят друг на друга (ширина по полу — NPC_TYPES[..].foot),
                // на разной глубине перекрываться можно; keepOut — куда не заходит ни одна фигура (проход для торговли); mother — полуширина матери:
                // её места за день (MOTHER.activities) — тоже препятствия, как фигуры;
                // kids — ребёнок только рядом со взрослой этих типов, на её месте (child: [dx, dy] у места), с вероятностью chance[глава].
                // Место: chance — в какой доле дней бывает, chapters — только в первых N главах, minCrowd — только если занято не меньше мест.
                rules: { left: { x: [207, 360], max: 3 }, gap: { dy: 8, px: 2 }, keepOut: [[360, 470]], mother: 16,
                         kids: { types: ['boy', 'girl_child'], with: ['woman', 's_point', 'old_woman'], chance: [0.5, 0.5, 0.5, 0.25, 0.25, 0, 0] } },
                // crowd по сюжету: day — [от, до] на каждую главу по порядку DAYS (1 Мирная Москва … 6 Последняя неделя, 7 Финал): в мирном июне
                // людно, к войне всё меньше. draft — ополчение: мужики (types) остаются в городе с вероятностью stay[глава], иначе место берёт
                // другой из who (женщина, старик, ребёнок) или оно пустует. fame — молва о лавке (state.fame, пока её нет — 0): каждые step
                // очков добавляют одного человека (минус — убирают), не больше max в любую сторону.
                crowd: { morning: [0, 1], day: [[4, 6], [3, 5], [3, 5], [2, 4], [2, 3], [1, 2], [0, 1]],
                         draft: { types: ['peasant'], stay: [1, 1, 0.7, 0.5, 0.3, 0.15, 0] }, fame: { step: 25, max: 2 } },
                // Глубина для extras: far — самый дальний ряд (y, масштаб, сила дымки, её цвет), near — самый ближний (y, масштаб,
                // сила затемнения почти до силуэта, цвет, fadeR — ближе этого к Андрею по x фигура полупрозрачна).
                depth: { far: { y: 194, scale: 0.84, haze: 0.32, color: '#22160e' }, near: { y: 264, scale: 1.16, dark: 0.72, color: '#0d0806', fadeR: 34 } } };

// Типовые NPC (26.10.2026): горожане Москвы 1812 из одного листа PixelLab в стиле Андрея (tools/make_npcs.py).
// Фигура — один кадр покоя 144×120, опора (72, 114), лицом вправо; у каждого типа несколько вариантов цвета одежды, волос и кожи:
// файл assets/characters/npc/<тип>_<вариант>.png, вариант 1 — как нарисовано. Рост взрослых ≈ 90 (Андрей 104), детей 59–73.
// Ходьбы у них нет (дышат и в беседе шевелят губами): стоят на месте (extras у сцен) или проходят за окном лавки (passersby, ног не видно).
// foot — ширина фигуры по полу в пикселях от точки опоры [влево, вправо] (по файлу, вариант 1): по ней проверяется, не заходят ли люди друг на друга.
const NPC_TYPES = {
  girl_young: { name: 'девушка', variants: 5, foot: [-13, 14] }, woman: { name: 'женщина', variants: 5, foot: [-14, 15] }, boy: { name: 'мальчик', variants: 4, foot: [-9, 10] },
  girl_child: { name: 'девочка', variants: 4, foot: [-9, 11] }, old_woman: { name: 'старуха', variants: 4, foot: [-20, 21] }, old_man: { name: 'старик', variants: 4, foot: [-16, 18] },
  soldier: { name: 'солдат', variants: 4, foot: [-11, 13] }, merchant: { name: 'купец', variants: 5, foot: [-12, 14] }, peasant: { name: 'мужик', variants: 5, foot: [-9, 10] },
  priest: { name: 'священник', variants: 3, foot: [-14, 16] },
  // позы из листов ChatGPT (tools/make_npc_poses.py); gesture — у позы два жеста рукой (лист 8 кадров: покой и тот же покой со вторым жестом)
  w_sit_talk: { name: 'работник сидит на мешке, рассказывает', variants: 3, foot: [-29, 31], gesture: true }, w_sit_mug: { name: 'работник сидит на ящике с кружкой', variants: 3, foot: [-27, 29] },
  w_shovel: { name: 'работник опирается на лопату', variants: 3, foot: [-23, 24] }, w_sack: { name: 'работник несёт мешок', variants: 3, foot: [-22, 24] },
  w_hips: { name: 'работник руки в боки', variants: 3, foot: [-20, 22] }, m_talk: { name: 'купец говорит', variants: 3, foot: [-23, 25], gesture: true },
  m_listen: { name: 'купец слушает', variants: 3, foot: [-16, 17] }, m_coins: { name: 'купец на бочке считает монеты', variants: 3, foot: [-26, 27] },
  s_point: { name: 'женщина показывает на полку', variants: 3, foot: [-26, 27] }, s_talk: { name: 'девушка с корзиной разговаривает', variants: 3, foot: [-23, 24], gesture: true },
  s_listen: { name: 'пожилая женщина слушает', variants: 3, foot: [-17, 19] }, s_look: { name: 'старик разглядывает товар', variants: 3, foot: [-21, 23] }
};
// Файл — 4 кадра покоя в ряд (576×120): 0 как есть, 1 вдох, 2 рот приоткрыт, 3 вдох и рот (idle: кадр выбирает игра, см. NPC_IDLE);
// у поз с жестом ещё 4 таких же со вторым жестом (1152×120).
const npcSprite = (type, v) => ({ src: 'assets/characters/npc/' + type + '_' + v + '.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right',
                                   frames: NPC_TYPES[type].gesture ? 8 : 4, idle: true });
// Покой NPC: breath — длина цикла дыхания (с), inhale — доля цикла на вдохе; разговор: turn — сколько секунд говорит один, потом другой
// (у extras talk: 0 или 1 — чья очередь), mouth — как часто шевелятся губы (с), open — доля времени, когда рот приоткрыт;
const NPC_IDLE = { breath: 3.6, inhale: 0.4, turn: 3.5, mouth: 0.14, open: 0.45, gesture: 1.1 };   // gesture — сколько секунд держится жест, пока говорит

// Покупатели — люди: кто они (имя, портрет, цвет заглушки, kind). Что им нужно в конкретный день — в VISITS.
// portrait — крупный портрет для диалога (180×204); sprite — фигура в сцене (отдельный файл, один кадр покоя):
//   src — путь; cellW×cellH — размер ячейки (как у Андрея, 144×120); anchorX, floorY — точка опоры стоп в ячейке;
//   facing — куда смотрит фигура в файле ('right' или 'left'), в другую сторону игра её отражает.
//   Пока файла нет (или размер не тот) — человечек-заглушка. Кадров ходьбы нет: идущий показан тем же кадром (не анимация).
// kind: story — торговля и личные темы (tradeTalk); regular — общий торговый сценарий без личного разговора; мать — только разговоры, без торговли.
const CUSTOMERS = [
  { id: 'pavel', name: 'Павел', kind: 'story',   portrait: 'assets/characters/pavel/pavel_portrait.png', color: '#4a5a3a',
    sprite: npcSprite('merchant', 2) },   // пока свой спрайт не нарисован — типовой NPC (свой: assets/characters/pavel/pavel_idle.png)
  { id: 'darya', name: 'Дарья', kind: 'regular', portrait: 'assets/characters/darya/darya_portrait.png', color: '#7a4a6b',
    sprite: npcSprite('woman', 3) },
  { id: 'fedor', name: 'Фёдор', kind: 'regular', portrait: 'assets/characters/fedor/fedor_portrait.png', color: '#5a4a3a',
    sprite: npcSprite('peasant', 4) },
  // Татьяна (20): служит в доме неподалёку, по вечерам шьёт на заказ. 1 июня приходит по поручению хозяйки, потом — гость по вечерам
  // (CALLERS). Портрет и фигура — из генераций GPT (tools/make_tatiana.py, исходники в assets/characters/tatiana/source/); фигура — лист из
  // 4 кадров покоя, как у типовых NPC.
  { id: 'tatiana', name: 'Татьяна', kind: 'story', portrait: 'assets/characters/tatiana/tatiana_portrait.png', color: '#6b4a7a',
    sprite: { src: 'assets/characters/tatiana/tatiana_idle.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right', frames: 4, idle: true } }
];
// Приходы покупателей. Один человек может прийти много раз (в разные дни); у каждого прихода свой товар, условия торга и реплики.
// Ключ — id прихода (его ставят в DAYS, visits); who — кто приходит (id из CUSTOMERS). Каждый приход бывает один раз за игру.
// Правило торга одно для всех, без случайности: согласен, если цена за единицу <= maxUnit И сумма <= budget;
// иначе предлагает wantUnit за единицу. После трёх неудачных предложений уходит (leaveNode).
// openNode — первая реплика; может быть списком вариантов [{ need, node }, …, { node }]: берётся первый, чьё условие need выполнено
// (так человек «помнит» прошлый приход). Условия need: heard — слух известен; sold — в этом приходе была продажа; notSold — не было.
const VISITS = {
  pavel_1: { who: 'pavel', want: 'grain', qty: 2, budget: 18, wantUnit: 8, maxUnit: 9,
    openNode: 'pavel_open', soldNode: 'pavel_sold', refusedNode: 'pavel_refused', leaveNode: 'pavel_leave',
    priceMsg: 'Два мешочка крупы. Почём?', counterMsg: 'За {counter} отдашь? Тёща у нас за двоих ест.',
    tradeTalk: [{ text: 'Гости надолго?', goto: 'pavel_why', id: 'c_why', once: true }] },
  darya_1: { who: 'darya', want: 'bread', qty: 2, budget: 10, wantUnit: 4, maxUnit: 5,
    openNode: 'darya_open', soldNode: 'darya_sold', refusedNode: 'darya_refused', leaveNode: 'darya_leave',
    priceMsg: 'Сколько с меня?', counterMsg: 'Дороговато. Давайте {counter}.', tradeTalk: [] },
  fedor_1: { who: 'fedor', want: 'apples', qty: 2, budget: 13, wantUnit: 6, maxUnit: 6,
    openNode: 'fedor_open', soldNode: 'fedor_sold', refusedNode: 'fedor_refused', leaveNode: 'fedor_leave',
    priceMsg: 'Почём свёрток?', counterMsg: 'Дам {counter} за оба, больше не могу.', tradeTalk: [] },
  darya_2: { who: 'darya', want: 'bread', qty: 3, budget: 15, wantUnit: 4, maxUnit: 5,
    openNode: [{ need: { sold: 'darya_1' }, node: 'darya2_glad' }, { node: 'darya2_open' }],
    soldNode: 'darya2_sold', refusedNode: 'darya2_refused', leaveNode: 'darya2_leave',
    priceMsg: 'Почём сегодня?', counterMsg: 'Давайте {counter} за все три.', tradeTalk: [] },
  pavel_2: { who: 'pavel', want: 'grain', qty: 3, budget: 27, wantUnit: 8, maxUnit: 9,
    openNode: [{ need: { sold: 'pavel_1' }, node: 'pavel2_glad' }, { node: 'pavel2_open' }],
    soldNode: 'pavel2_sold', refusedNode: 'pavel2_refused', leaveNode: 'pavel2_leave',
    priceMsg: 'Три мешочка. Почём отдашь?', counterMsg: 'По старой памяти — {counter} за все?',
    tradeTalk: [{ text: 'Я спросил у Сорокина: цена пока прежняя.', need: { ctx: 'sorokin_says_price' }, id: 'c_p2_told', once: true,
                  goto: 'pavel2_told', keep: 'tell_pavel_price' }] },
  fedor_2: { who: 'fedor', want: 'apples', qty: 1, budget: 7, wantUnit: 6, maxUnit: 7,
    openNode: 'fedor2_open', soldNode: 'fedor2_sold', refusedNode: 'fedor2_refused', leaveNode: 'fedor2_leave',
    priceMsg: 'Почём нынче свёрток?', counterMsg: 'Шесть дам, не больше.', tradeTalk: [] },
  fedor_3: { who: 'fedor', want: 'grain', qty: 3, budget: 26, wantUnit: 8, maxUnit: 8,
    openNode: [{ need: { sold: 'fedor_2' }, node: 'fedor3_glad' }, { node: 'fedor3_open' }],
    soldNode: 'fedor3_sold', refusedNode: 'fedor3_refused', leaveNode: 'fedor3_leave',
    priceMsg: 'Почём мешочек?', counterMsg: 'Дам {counter} за все, больше артель не даст.', tradeTalk: [] },
  darya_3: { who: 'darya', want: 'bread', qty: 2, budget: 10, wantUnit: 4, maxUnit: 5,
    openNode: [{ need: { sold: 'darya_2' }, node: 'darya3_glad' }, { node: 'darya3_open' }],
    soldNode: 'darya3_sold', refusedNode: 'darya3_refused', leaveNode: 'darya3_leave',
    priceMsg: 'Сколько?', counterMsg: 'Давайте {counter}, и я побежала.', tradeTalk: [] },
  pavel_3: { who: 'pavel', want: 'grain', qty: 4, budget: 34, wantUnit: 8, maxUnit: 9,
    openNode: [{ need: { sold: 'pavel_2' }, node: 'pavel3_glad' }, { node: 'pavel3_open' }],
    soldNode: 'pavel3_sold', refusedNode: 'pavel3_refused', leaveNode: 'pavel3_leave',
    priceMsg: 'Четыре мешочка. Почём?', counterMsg: 'По-соседски — {counter} за все?',
    tradeTalk: [{ text: 'Я спросил у Сорокина: цена пока прежняя.', need: { ctx: 'sorokin_says_price' }, id: 'c_p2_told', once: true,
                  goto: 'pavel3_told', keep: 'tell_pavel_price' }] },
  // 1 июня: Татьяна по поручению хозяйки (сушёные яблоки к пирогу). ЧЕРНОВИК реплик — утверждает Кирилл.
  tatiana_1: { who: 'tatiana', want: 'apples', qty: 1, budget: 7, wantUnit: 6, maxUnit: 7,
    openNode: 'tat1_open', soldNode: 'tat1_sold', refusedNode: 'tat1_refused', leaveNode: 'tat1_leave',
    priceMsg: 'Почём свёрток?', counterMsg: 'Шесть. Хозяйка больше не дала.', tradeTalk: [] }
};
// kind: story — торговля и личные темы (tradeTalk); regular — общий торговый сценарий без личного разговора; мать — только разговоры, без торговли.
// Другие места (сцены), куда Андрей приходит через карту. Лавка описана выше (SCENE, ART), здесь — остальные.
// name — название (показывается при переходе); worldW, lane, startX, walkMin, walkMax, talkRange — как у лавки (координаты мира);
// background — фон ровно worldW×270 без прозрачности (пока файла нет — заглушка цветами wall и floor);
// npcs — персонажи сцены: x — где стоит, color — цвет заглушки, portrait — портрет 180×204, sprite — фигура (как у покупателей), node — первая реплика (NODES).
// open — в какие части дня туда можно прийти (нет — всегда, когда лавка закрыта), closedMsg — что сказано на карте в другое время;
// endsEvening — место занимает весь вечер: уйти оттуда можно только домой спать (выбор с do: 'home' или кнопка на карте).
// exits — проходы в соседнее место без карты (x — где проход, to — id сцены, label — подсказка «E — …»); Андрей появляется у обратного прохода.
//   Так переход не тратит вечер: из трактира в переулок и обратно.
// Чтобы сцена была доступна, у места на карте (MAP) указывается scene с её id.
const SCENES = {
  // лабаз: фон 594×270 с прокруткой (tools/make_labaz.py); вход от ворот слева; front — передние бочки, ящики и мешки,
  // персонажи проходят за ними; Сорокин у своей конторки справа
  labaz: { name: 'Лабаз Сорокина', worldW: 594, lane: 225, startX: 75, walkMin: 40, walkMax: 520, talkRange: 35, talkGap: 44,
    background: 'assets/places/labaz/labaz.png', front: 'assets/places/labaz/labaz_front.png', wall: '#3a2c1e', floor: '#6b5236',
    // NPC лабаза: только люди Сорокина (работники) и купцы, как Андрей, — группками, отдыхают, работают, беседуют
    // три группы: А — работа у ларей, Б — торг у конторки, В — отдых у ворот и грузчик; свободны проходы к ларям (x 290–330) и к Сорокину (404–474)
    extras: [
      { type: 'w_hips', v: 1, x: 214, y: 176, dir: 1, talk: 0 }, { type: 'w_shovel', v: 2, x: 262, y: 188, dir: -1, talk: 1 },             // А: у ларей, лесенкой по глубине, лицом друг к другу
      { type: 'm_talk', v: 1, x: 353, y: 200, dir: 1, talk: 0 }, { type: 'm_listen', v: 2, x: 386, y: 210, dir: -1, talk: 1 },             // Б: купцы торгуются, лицом друг к другу
      { type: 'm_coins', v: 2, x: 486, y: 182, dir: -1 },                                                                                    // Б: купец на бочке у конторки
      { type: 'w_sit_talk', v: 1, x: 96, y: 222, dir: 1, talk: 0 }, { type: 'w_sit_mug', v: 2, x: 150, y: 208, dir: -1, talk: 1 },          // В: отдыхают у ворот
      { type: 'w_sack', v: 1, x: 198, y: 196, dir: 1, route: [[198, 196], [300, 190]] },   // В: несёт мешок от ворот к ларям; route — маршрут на будущее (пока стоит, движения нет)
      { type: 'w_hips', v: 3, x: 34, y: 248, dir: 1, behind: true }, { type: 'm_listen', v: 1, x: 566, y: 250, dir: -1, behind: true }     // передний план: за бочками и мешками по краям
    ],
    depth: { far: { y: 170, scale: 0.7, haze: 0.34, color: '#1e150d' }, near: { y: 266, scale: 1.16, dark: 0.72, color: '#0d0806', fadeR: 34 } },
    // прохожие на пристани за воротами (как SCENE.passersby, но вместо стекла — проём ворот clip [x0, y0, x1, y1])
    passersby: { x0: 20, x1: 112, feetY: 152, height: [44, 52], speed: [9, 15], every: [4, 10], color: '#8fa6c8', tint: 0.22, phases: ['morning', 'day'],
                 clip: [32, 20, 104, 164], types: ['peasant', 'merchant', 'woman', 'girl_young', 'old_man', 'boy', 'soldier', 'old_woman'] },
    darkK: 0.7,   // вечерний сумрак в лабазе на 30% слабее, чем в лавке (своих свечей нет — иначе слишком темно)
    // свет лабаза (как SCENE.lights): ворота слева — дневной свет с лучом на пол, окошко над мешками, тёплое свечение в глубине и у конторки
    lights: [
      { kind: 'window', x0: 30, y0: 20, x1: 105, y1: 160, beam: [[40, 150], [105, 150], [260, 228], [70, 228]], color: '#a9c8ff' },
      { kind: 'window', x0: 190, y0: 50, x1: 230, y1: 72, beam: [[195, 72], [228, 72], [262, 190], [222, 190]], color: '#8fb8ff' },
      { kind: 'glow', x: 372, y: 160, r: 110, color: '#ff9c44', flicker: 0.03 },
      { kind: 'glow', x: 510, y: 135, r: 80, color: '#ffb35a', flicker: 0.05 }
    ],
    npcs: [{ id: 'sorokin', name: 'Сорокин', x: 440, color: '#3b4a6b', portrait: 'assets/characters/sorokin/sorokin_portrait.png', node: 'sorokin_hub',
             sprite: { src: 'assets/characters/sorokin/sorokin_idle.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right' } }] },
  // ТЕСТОВОЕ: название, реплики, цены. Фона и фигуры трактирщика пока нет — заглушки.
  traktir: { name: 'Трактир Сысалина', worldW: 480, lane: 225, startX: 60, walkMin: 36, walkMax: 444, talkRange: 35, talkGap: 44,
    background: 'assets/places/traktir/traktir.png', wall: '#3a2a1c', floor: '#5a4128',
    open: ['evening'], closedMsg: 'Трактир полон по вечерам, а сейчас там только половые моют полы. Приходите, когда закроете лавку.', endsEvening: true,
    npcs: [{ id: 'traktirshchik', name: 'Трактирщик', x: 330, color: '#6b4a2e', portrait: 'assets/characters/traktirshchik/traktirshchik_portrait.png', node: 'traktir_hub',
             sprite: { src: 'assets/characters/traktirshchik/traktirshchik_idle.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right' } }],
    exits: [{ x: 440, to: 'pereulok', label: 'Выйти чёрным ходом в переулок' }] },
  // ТЕСТОВОЕ: тёмный переулок за трактиром — место для сомнительных сделок и встреч. На карте его нет: попасть можно только из трактира.
  pereulok: { name: 'Переулок за трактиром', worldW: 480, lane: 225, startX: 40, walkMin: 36, walkMax: 444, talkRange: 35, talkGap: 44,
    background: 'assets/places/pereulok/pereulok.png', wall: '#1c1814', floor: '#2e2620',
    open: ['evening'], endsEvening: true,
    npcs: [{ id: 'neznakomets', name: 'Незнакомец', x: 320, color: '#2b2b33', portrait: 'assets/characters/neznakomets/neznakomets_portrait.png', node: 'pereulok_hub',
             sprite: { src: 'assets/characters/neznakomets/neznakomets_idle.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right' } }],
    exits: [{ x: 40, to: 'traktir', label: 'Вернуться в трактир' }] }
};
// Закупка у оптовика. В разговоре выбор с do: 'order' и seller (id персонажа) открывает заказ: Андрей выбирает количество
// и платит сразу; товар привозят в лавку на следующее утро (ночью, до открытия), где бы Андрей ни был.
// goods — что можно заказать: cost — цена за единицу (сейчас равна закупке в GOODS, по ней считается прибыль в лавке),
//   max — сколько всего можно заказать на одну доставку (заказ можно дополнить в тот же день).
// title — строка в заметках, пока заказ не привезли; askMsg — реплика при открытии заказа; noMoneyMsg — когда монет не хватает; lastDayMsg — в последний день текущей версии
//   (заказывать нельзя: привезти будет некуда); doneNode — реплика после заказа; backNode — куда ведёт «Назад».
// ТЕСТОВОЕ: цены, количества, реплики.
const SUPPLY = {
  // Сорокин — хлебный лабаз: крупа, мука, пшено, горох и сушёные яблоки (сушка — тоже лабазный товар).
  sorokin: { title: 'Заказ у Сорокина',
    goods: { grain: { cost: 6, max: 20 }, flour: { cost: 5, max: 20 }, millet: { cost: 5, max: 20 }, peas: { cost: 4, max: 20 }, apples: { cost: 4, max: 10 } },
    askMsg: 'Что возьмёшь и сколько? Деньги вперёд, а завтра поутру работник привезёт к лавке.',
    noMoneyMsg: 'На столько у тебя денег не хватит, Андрей.',
    lastDayMsg: 'Не сегодня, Андрей. (Это последний день в текущей версии игры: привезти заказ будет некуда.)',
    doneNode: 'sorokin_ordered', backNode: 'sorokin_hub' }
};
const MOTHER = { id: 'mother', name: 'Мать', kind: 'family', portrait: 'assets/characters/mother/mother_portrait.png', color: '#8a5a5a',
  // node — строка или список вариантов [{ need, node }, …, { node }]: берётся первый, чьё условие выполнено (STORY_NEEDS)
  node: [{ need: { story: 'mom_jun6_topic' }, node: 'mom6_hub' }, { need: { story: 'mom_cool' }, node: 'mom7_cool' }, { node: 'mother_hub' }],
  // мать за делом: перебирает крупу в миске, 8 кадров PixelLab со стабилизацией (tools/make_mother_work.py), цикл без пауз;
  // прежняя фигура без миски — mother_idle.png
  sprite: { src: 'assets/characters/mother/mother_work.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right', frames: 8, frameTime: 0.18 },
  // дела матери: каждый день она случайно выбирает одно (не то же, что вчера; выбор дня не меняется после перезагрузки).
  // Лист кадров в ряд (ячейка 144×120, опора 72/114, нарисована лицом вправо), x/y — где стоит, dir -1 — лицом влево.
  // Дело без файла пропускается; если нет ни одного — мать стоит в SCENE.motherX/motherY со sprite выше.
  activities: [
    { id: 'sort', name: 'перебирает крупу', src: 'assets/characters/mother/mother_work.png', frames: 8, frameTime: 0.18, x: 112, y: 212, dir: -1 },
    { id: 'broom', name: 'метёт пол', src: 'assets/characters/mother/mother_broom.png', frames: 8, frameTime: 0.16, x: 182, y: 225, dir: -1 },
    { id: 'wipe', name: 'протирает бочонки', src: 'assets/characters/mother/mother_wipe.png', frames: 8, frameTime: 0.18, x: 172, y: 212, dir: -1 },
    { id: 'bags', name: 'насыпает крупу в мешочки', src: 'assets/characters/mother/mother_bags.png', frames: 8, frameTime: 0.18, x: 112, y: 212, dir: -1 },
  ] };

// Сведения: topic — тема, source — исходный источник, kind — тип (пересказ или личное свидетельство)
const RUMORS = {
  pavel_neighbor_price: { topic: 'grain_price', title: 'Крупа подорожает?', who: 'Павел', source: 'его сосед', kind: 'пересказ',
    note: 'Павел передал слова соседа: Сорокин будто бы собирается поднять цену на крупу. Сам Павел у Сорокина не спрашивал.',
    toast: 'Новый слух: «Крупа подорожает?»' },
  sorokin_shirts: { topic: 'shirts', title: 'Рубахи для людей Сорокина', who: 'Сорокин', source: 'сам Сорокин', kind: 'личное свидетельство',
    note: 'Работникам рубахи не нужны, но двум приказчикам он, может быть, возьмёт: пусть швея принесёт образец. Десяток разом не закажет.',
    toast: 'Узнал у Сорокина про рубахи' }
};
// Дополнение к уже известной записи (новой записи не создаёт)
const CONTEXT = {
  mother_same_source: { to: 'pavel_neighbor_price',
    text: 'Мать: тот же сосед говорил и ей. Источник тот же — это не второе подтверждение.' },
  sorokin_says_price: { to: 'pavel_neighbor_price',
    text: 'Сорокин сам: цена пока прежняя, по шести за мешочек; что будет к осени, не обещает. Прямой источник, независимый от соседа.' } };
// Обещания. В реплике promise — дать обещание; keep — выполнить (в заметках «выполнено»).
// bond — обещание связано с человеком и показывается в заметках «Люди»; due — [число, месяц]: ночью после этого дня оно помечается late
// (срок прошёл). Новые поля обещания в сохранении: day (когда дано), broken (нарушено — человек знает), late (просрочено, выполнено позже).
const PROMISES = {
  tell_pavel_price: { title: 'Сказать Павлу, правда ли Сорокин поднимет цену на крупу' },
  ask_sorokin_shirts: { bond: 'andrey_tatiana', due: [7, 6], title: 'спросить у Сорокина, не нужны ли рубахи его людям (до пятницы)' },
  get_sorokin_order: { bond: 'andrey_tatiana', due: [7, 6], title: 'выхлопотать Татьяне у Сорокина заказ на десять рубах (до пятницы)' },
  bring_sample: { bond: 'andrey_tatiana', title: 'показать Сорокину образец её работы, когда она его сошьёт' }
};

// Реплики. choices: goto — другая реплика; do — действие (trade, refuse, back, finish, end; order + seller — заказ у оптовика, см. SUPPLY);
// need — условие {heard, ctx, sold, notSold}; once+id — вопрос задаётся один раз; learn — запись; context — дополнение к записи;
// promise — дать обещание; keep — выполнить обещание.
// Реплики не проводят оплату: деньги и товар меняются только в торговле.
const NODES = {
  pavel_open: { who: 'Павел', text: 'Два мешочка крупы. Тёща из Коломны на лето приехала — едоков прибавилось.', choices: [
    { text: 'Гости надолго?', goto: 'pavel_why', id: 'c_why', once: true },
    { text: 'Перейти к цене', do: 'trade' },
    { text: 'Пока не могу продать', do: 'refuse' }] },
  pavel_why: { who: 'Павел', learn: 'pavel_neighbor_price',
    text: 'До осени, не меньше. Да ещё сосед говорит, Сорокин крупу скоро дороже отдавать будет. Вот и беру впрок.', choices: [
    { text: 'Ты сам у Сорокина спрашивал?', goto: 'pavel_src', id: 'c_src', once: true },
    { text: 'Понятно. Вернёмся к покупке.', do: 'back' }] },
  pavel_src: { who: 'Павел', text: 'Нет, сам не спрашивал. Всё от соседа.', choices: [
    { text: 'Понятно. Вернёмся к покупке.', do: 'back' }] },
  pavel_sold: { who: 'Павел', text: 'Спасибо. Будешь у Сорокина — узнай, правда ли подорожает. Скажешь?', choices: [
    { text: 'Гости надолго?', goto: 'pavel_why', id: 'c_why', once: true },
    { text: 'Узнаю — скажу.', do: 'finish', promise: 'tell_pavel_price' },
    { text: 'Обещать не стану.', do: 'finish' }] },
  pavel_refused: { who: 'Павел', text: 'Понятно. Пойду искать в другом месте.', choices: [
    { text: 'Гости надолго?', goto: 'pavel_why', id: 'c_why', once: true },
    { text: 'До свидания.', do: 'finish' }] },
  pavel_leave: { who: 'Павел', text: 'Так не пойдёт. Я заканчиваю разговор, пойду.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya_open: { who: 'Дарья', text: 'Две буханки, пожалуйста. Барыня гостей ждёт, а я с утра не успела испечь.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  darya_sold: { who: 'Дарья', text: 'Спасибо.',
    choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya_refused: { who: 'Дарья', text: 'Жаль. Зайду позже.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya_leave: { who: 'Дарья', text: 'Нет, так не пойдёт. Я заканчиваю разговор.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  fedor_open: { who: 'Фёдор', text: 'Сушёных яблок бы, два свёртка. Ребятишкам на взвар.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  fedor_sold: { who: 'Фёдор', text: 'Благодарствую.',
    choices: [{ text: 'До свидания.', do: 'finish' }] },
  fedor_refused: { who: 'Фёдор', text: 'Ну, в другой лавке спрошу.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  fedor_leave: { who: 'Фёдор', text: 'Дорого. Пойду в ряды, там сговорчивее.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  // Повторные приходы (тестовые реплики). Вариант первой реплики зависит от того, купил ли человек в прошлый раз.
  darya2_glad: { who: 'Дарья', text: 'Опять к вам. В прошлый раз хлеб был хороший. Три буханки, пожалуйста.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  darya2_open: { who: 'Дарья', text: 'В тот раз не сговорились. Может, сегодня выйдет? Три буханки.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  darya2_sold: { who: 'Дарья', text: 'Спасибо. Ещё зайду.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya2_refused: { who: 'Дарья', text: 'Что ж, в другой раз.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya2_leave: { who: 'Дарья', text: 'Нет, так не пойдёт. Пойду в ряды.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  pavel2_glad: { who: 'Павел', text: 'Снова к тебе, Андрей. Крупа твоя хороша, возьму ещё три мешочка.', choices: [
    { text: 'Я спросил у Сорокина: цена пока прежняя.', need: { ctx: 'sorokin_says_price' }, id: 'c_p2_told', once: true, goto: 'pavel2_told', keep: 'tell_pavel_price' },
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  pavel2_open: { who: 'Павел', text: 'Здравствуй. Попробую ещё раз у тебя: три мешочка крупы.', choices: [
    { text: 'Я спросил у Сорокина: цена пока прежняя.', need: { ctx: 'sorokin_says_price' }, id: 'c_p2_told', once: true, goto: 'pavel2_told', keep: 'tell_pavel_price' },
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  pavel2_sold: { who: 'Павел', text: 'Спасибо. Хорошо, что лавка рядом.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  pavel2_refused: { who: 'Павел', text: 'Жаль. Поищу в другом месте.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  pavel2_leave: { who: 'Павел', text: 'Нет, Андрей, это слишком. Пойду.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  fedor2_open: { who: 'Фёдор', text: 'Опять я. Ещё свёрток яблок.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  fedor2_sold: { who: 'Фёдор', text: 'Благодарствую.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  fedor2_refused: { who: 'Фёдор', text: 'Ну, нет так нет.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  fedor2_leave: { who: 'Фёдор', text: 'Дорого. Пойду.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  pavel2_told: { who: 'Павел', text: 'Вот как. Значит, сосед зря пугал. Спасибо, что узнал.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  // 6 июня: Фёдор за крупой
  fedor3_glad: { who: 'Фёдор', text: 'Опять к тебе. Теперь крупы, три мешочка: артель кашу варит.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  fedor3_open: { who: 'Фёдор', text: 'Крупы три мешочка. С яблоками в тот раз не вышло — может, с крупой сговоримся.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  fedor3_sold: { who: 'Фёдор', text: 'Ладно. Артель сыта будет.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  fedor3_refused: { who: 'Фёдор', text: 'Нет так нет.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  fedor3_leave: { who: 'Фёдор', text: 'Дорого. Артель не даст.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  // 7 июня: Дарья и Павел в третий раз
  darya3_glad: { who: 'Дарья', text: 'Хозяйка велела хлеб только у вас брать. Две буханки, я тороплюсь!', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  darya3_open: { who: 'Дарья', text: 'Опять я. Хозяйка ворчит, а хлеб нужен. Две буханки.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  darya3_sold: { who: 'Дарья', text: 'Вот и славно. Побежала!', choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya3_refused: { who: 'Дарья', text: 'Ну что ж. Хозяйка расстроится.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya3_leave: { who: 'Дарья', text: 'Нет, пойду в ряды.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  pavel3_glad: { who: 'Павел', text: 'Андрей, выручай: к нам ещё родня из деревни нагрянула. Четыре мешочка крупы.', choices: [
    { text: 'Я спросил у Сорокина: цена пока прежняя.', need: { ctx: 'sorokin_says_price' }, id: 'c_p2_told', once: true, goto: 'pavel3_told', keep: 'tell_pavel_price' },
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  pavel3_open: { who: 'Павел', text: 'Здравствуй. В прошлый раз не сговорились, а крупа нужна. Четыре мешочка.', choices: [
    { text: 'Я спросил у Сорокина: цена пока прежняя.', need: { ctx: 'sorokin_says_price' }, id: 'c_p2_told', once: true, goto: 'pavel3_told', keep: 'tell_pavel_price' },
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  pavel3_told: { who: 'Павел', text: 'Вот и хорошо. А я уж хотел впрок мешок взять. Спасибо, сосед.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  pavel3_sold: { who: 'Павел', text: 'Спасибо, сосед. Выручил.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  pavel3_refused: { who: 'Павел', text: 'Жаль. Пойду в ряды.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  pavel3_leave: { who: 'Павел', text: 'Нет, это дорого даже для родни.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  mother_hub: { who: 'Мать', text: 'Что-то хотел, Андрей?', choices: [
    { text: 'Как сегодня дела?', goto: 'mother_shop' },
    { text: 'Павел говорит, крупа подорожает. Ты слышала?', need: { heard: 'pavel_neighbor_price' }, id: 'c_m_price', once: true, goto: 'mother_price' },
    { text: 'Ничего, потом.', do: 'end' }] },
  mother_shop: { who: 'Мать', text: 'Торговля идёт. Крупу проверь: кончится — сходи утром к Сорокину, к следующему утру привезут. И мешки из прохода убери.', choices: [
    { text: 'Ещё вопрос', goto: 'mother_hub' }, { text: 'Хорошо.', do: 'end' }] },
  mother_price: { who: 'Мать', context: 'mother_same_source', text: 'Сосед и мне то же говорил. Это всё один рассказ. У Сорокина сам спроси.', choices: [
    { text: 'Ещё вопрос', goto: 'mother_hub' }, { text: 'Понятно.', do: 'end' }] },
  // Купец Сорокин (лабаз в Зарядье). Тестовые реплики; заказ товара — SUPPLY.sorokin.
  sorokin_hub: { who: 'Сорокин', text: 'А, Андрей! Чем могу служить? Крупа есть, мука, пшено, горох. Сушёные яблоки тоже имеются.', choices: [
    { text: 'Хочу заказать товар', do: 'order', seller: 'sorokin' },
    { text: 'Почём нынче крупа?', goto: 'sorokin_price' },
    { text: 'Говорят, крупа у тебя подорожает?', need: { heard: 'pavel_neighbor_price' }, id: 'c_s_price', once: true, goto: 'sorokin_rumor' },
    { text: 'Что слышно на реке?', goto: 'sorokin_news', id: 'c_sorokin_news', once: true },
    { text: 'Не нужны ли твоим людям рубахи? Есть хорошая швея.', need: { all: [{ promiseOpen: 'ask_sorokin_shirts' }, { noPromise: 'get_sorokin_order' }] },
      id: 'c_s_shirts_a', once: true, goto: 'sorokin_shirts', keep: 'ask_sorokin_shirts' },
    { text: 'Мне нужен заказ для швеи: десять рубах.', need: { promiseOpen: 'get_sorokin_order' }, id: 'c_s_shirts_b', once: true, goto: 'sorokin_shirts_big' },
    { text: 'Пока ничего, зайду позже.', do: 'end' }] },
  sorokin_shirts: { who: 'Сорокин', learn: 'sorokin_shirts', text: 'Рубахи? Работникам их жёны шьют. А вот двум приказчикам, пожалуй, взял бы, если шов крепкий. Пусть принесёт образец — гляну.', choices: [
    { text: 'Ещё вопрос', goto: 'sorokin_hub' }, { text: 'Передам.', do: 'end' }] },
  sorokin_shirts_big: { who: 'Сорокин', learn: 'sorokin_shirts', text: 'Десять рубах? Да что ты, Андрей! Работникам жёны шьют. Приказчикам две, может, и возьму, если шов хорош. Образец пусть несёт — гляну, а десятка не жди.', choices: [
    { text: 'Ещё вопрос', goto: 'sorokin_hub' }, { text: 'Понял.', do: 'end' }] },
  sorokin_price: { who: 'Сорокин', text: 'Пока по-старому: крупа по шесть, мука и пшено по пять, горох и яблоки по четыре. Закажешь — к утру привезу в лавку. А дальше кто знает.', choices: [
    { text: 'Ещё вопрос', goto: 'sorokin_hub' }, { text: 'Понятно.', do: 'end' }] },
  sorokin_ordered: { who: 'Сорокин', text: 'Сговорились. Завтра поутру будет у тебя в лавке.', choices: [
    { text: 'Ещё вопрос', goto: 'sorokin_hub' }, { text: 'Спасибо.', do: 'end' }] },
  sorokin_rumor: { who: 'Сорокин', context: 'sorokin_says_price', text: 'Кто говорит? Сосед Павлов? Пока отдаю по шести, как весной. Что к осени будет — не загадываю.', choices: [
    { text: 'Ещё вопрос', goto: 'sorokin_hub' }, { text: 'Понятно.', do: 'end' }] },
  sorokin_news: { who: 'Сорокин', text: 'На реке как обычно: барки разгружают, грузчики ругаются. Скучно, Андрей.', choices: [
    { text: 'Ещё вопрос', goto: 'sorokin_hub' }, { text: 'Понятно.', do: 'end' }] },
  // Трактир. pay — сколько монет стоит выбор (не хватает — выбор не срабатывает); do: 'home' — домой спать (конец дня).
  traktir_hub: { who: 'Трактирщик', text: 'Милости просим, Андрей! Садись, где свободно. Чаю подать или чего покрепче?', choices: [
    { text: 'Подай чаю (1 монета)', pay: 1, goto: 'traktir_tea' },
    { text: 'Налей рюмку (1 монета)', pay: 1, goto: 'traktir_vodka' },
    { text: 'Что нынче говорят?', goto: 'traktir_talk' },
    { text: 'Пойду домой.', do: 'home' },
    { text: 'Пока посижу.', do: 'end' }] },
  traktir_tea: { who: 'Трактирщик', text: 'Вот, с баранками. Посиди, отдохни: за тем столом приказчики газету читают, а в углу подводчики спорят.', choices: [
    { text: 'Ещё вопрос', goto: 'traktir_hub' }, { text: 'Посижу.', do: 'end' }] },
  traktir_vodka: { who: 'Трактирщик', text: 'Пей на здоровье. Только меру знай: завтра тебе за прилавок.', choices: [
    { text: 'Ещё вопрос', goto: 'traktir_hub' }, { text: 'Посижу.', do: 'end' }] },
  traktir_talk: { who: 'Трактирщик', text: 'Да всякое. Подводчики жалуются, что извоз дорожает. А верить ли — сам решай: я пересказываю, что слышал.', choices: [
    { text: 'Ещё вопрос', goto: 'traktir_hub' }, { text: 'Понятно.', do: 'end' }] },
  // Переулок за трактиром. ТЕСТОВОЕ: предложения пока без последствий (позже — слава лавки и деньги).
  pereulok_hub: { who: 'Незнакомец', text: 'Тише, лавочник, не шуми. Ты ведь крупой торгуешь? Дело есть, выгодное.', choices: [
    { text: 'Какое дело?', goto: 'pereulok_offer' },
    { text: 'Ты кто такой?', goto: 'pereulok_who' },
    { text: 'Некогда мне.', do: 'end' }] },
  pereulok_who: { who: 'Незнакомец', text: 'Кто надо. Спроси у полового, он скажет: человек тихий, платит сразу.', choices: [
    { text: 'Так какое дело?', goto: 'pereulok_offer' }, { text: 'Некогда мне.', do: 'end' }] },
  pereulok_offer: { who: 'Незнакомец', text: 'Есть мешки муки, задёшево. Откуда — не спрашивай. А к осени, помяни моё слово, хлеб подорожает: извоз дорожает, а с ним и всё прочее. Кто придержит, тот и при деньгах.', choices: [
    { text: 'Подумаю.', do: 'end' },
    { text: 'Нет. Я честно торгую.', goto: 'pereulok_refused' }] },
  pereulok_refused: { who: 'Незнакомец', text: 'Честно... Ну-ну. Передумаешь — я тут по вечерам.', choices: [
    { text: 'Уйти', do: 'end' }] }
};

// ================= ОТНОШЕНИЯ (DATA_VERSION 24) =================
// Устройство и правила — docs/RELATIONSHIPS.md. ВСЕ числа здесь — рабочие настройки, не утверждённый баланс; ВСЕ реплики — ЧЕРНОВИК
// для Кирилла. Игроку числа не показываются: он видит реакции в сценах и заметки «Люди».
// RELATIONS — связи. Запись bonds.<id> хранит отношение ВТОРОГО человека к Андрею (andrey_tatiana — отношение Татьяны к Андрею).
//   who — имя в заметках; status — стартовый статус (REL_STATUS); start — стартовые trust / closeness / tension (0–100);
//   about — строка для заметок «Люди» или { статус: строка, default };
//   calm — { below, step }: мелкое напряжение (не выше below) каждую ночь падает на step, если по этой связи нет открытого конфликта.
// Статус меняет только сюжетное событие (REL_EVENTS.status), а не порог чисел: роман и ссора сами из чисел не начинаются.
const REL_STATUS = { acquaintance: 'знакомые', interest: 'взаимный интерес', closer: 'сближение', together: 'вместе', distance: 'дистанция', parted: 'расстались', family: 'семья' };
const RELATIONS = {
  andrey_tatiana: { who: 'Татьяна', status: 'acquaintance', start: { trust: 40, closeness: 25, tension: 0 }, calm: { below: 15, step: 1 },
    about: { default: 'Служит в доме неподалёку, по ночам шьёт на заказ. Мы пока знакомые.' } },
  andrey_mother: { who: 'Мать', status: 'family', start: { trust: 60, closeness: 70, tension: 10 }, calm: { below: 20, step: 2 },
    about: 'Строга, потому что тревожится. К торговой славе лавки это не относится.' }
};
// MEMORIES — что запомнил человек (только то, что он действительно видел и слышал). note — строка для заметок Андрея (то, что знает он сам).
const MEMORIES = {
  tat_met: { note: 'Пришла за яблоками по поручению хозяйки.' },
  tat_banter: { note: 'Перекинулись шутками про хозяйкиного кота.' },
  tat_dream: { note: 'Рассказала, что хочет жить шитьём: днём служит, по ночам шьёт. Взяла у соседки-купчихи две рубахи и передник.' },
  tat_support: { note: 'Я сказал ей: если что понадобится, пусть говорит.' },
  tat_worry: { note: 'Спросил, не надорвётся ли она. Отмахнулась: справится.' },
  promised_ask: { note: 'Предложил только спросить у Сорокина про рубахи. Решать ей самой.' },
  promised_order: { note: 'Обещал выхлопотать ей у Сорокина заказ на десять рубах.' },
  declined_promise: { note: 'Сказал честно, что не знаю, нужны ли Сорокину рубахи, и обещать не стал.' },
  kept_ask: { note: 'Спросил Сорокина и рассказал ей: образец принести можно.' },
  admitted_overpromise: { note: 'Признался ей, что обещал лишнее: десять рубах Сорокин не закажет.' },
  promised_sample: { note: 'Предложил сам показать Сорокину её образец.' },
  bluffed: { note: 'Ответил ей уклончиво, хотя знал, что десять рубах не будет.' },
  promise_late: { note: 'Не успел спросить у Сорокина до пятницы, как обещал.' },
  closing_talk: { note: 'Поговорили после закрытия лавки.' },
  mom_checked: { note: 'Объяснил матери, что сам спрашивал у Сорокина: цена прежняя.' },
  mom_wait: { note: 'Попросил мать подождать, пока сам спрошу у Сорокина.' },
  snapped: { note: 'Резко ответил матери, что в лавке решаю я.' },
  yielded: { note: 'Согласился с матерью без спора.' },
  mom_apologized: { note: 'Извинился перед матерью за резкость.' },
  mom_explained: { note: 'Мать рассказала, чего боится, и мы решили, как быть дальше.' }
};
// CONFLICTS — важные ссоры. Стадии: open, acknowledged, repairing, resolved, unresolved. title — строка для заметок «Люди».
const CONFLICTS = {
  decided_for_her: { title: 'пообещал Татьяне больше, чем мог, и решил за неё' },
  unkept_promise: { title: 'не сдержал слово Татьяне в срок' },
  mother_say: { title: 'поссорился с матерью из-за закупки' }
};
// REL_EVENTS — эффекты выбора. Применяются ровно один раз за сохранение (id входит в appliedEvents) и только при нажатии выбора (rel: id).
// bond — связь; trust / closeness / tension — изменение; memory — id воспоминания (или список); conflict — { id, stage }; status — новый статус.
// Ориентиры: небольшой поступок 2–4, выполненное обещание 5–8, нарушение доверия 10–15, приветствие 0.
const REL_EVENTS = {
  ch1_jun01_tatiana_met: { bond: 'andrey_tatiana', memory: 'tat_met' },
  ch1_jun01_tatiana_joke: { bond: 'andrey_tatiana', closeness: 2, memory: 'tat_met' },
  ch1_jun03_tatiana_banter: { bond: 'andrey_tatiana', closeness: 2, memory: 'tat_banter' },
  ch1_jun03_tatiana_listened: { bond: 'andrey_tatiana', closeness: 4, memory: 'tat_dream' },
  ch1_jun03_tatiana_support: { bond: 'andrey_tatiana', memory: 'tat_support' },
  ch1_jun03_tatiana_worry: { bond: 'andrey_tatiana', tension: 2, memory: 'tat_worry' },
  ch1_jun05_tatiana_small_promise: { bond: 'andrey_tatiana', memory: 'promised_ask' },
  ch1_jun05_tatiana_big_promise: { bond: 'andrey_tatiana', closeness: 2, tension: 4, memory: 'promised_order', conflict: { id: 'decided_for_her', stage: 'open' } },
  ch1_jun05_tatiana_declined: { bond: 'andrey_tatiana', trust: 2, memory: 'declined_promise' },
  ch1_jun07_tatiana_kept: { bond: 'andrey_tatiana', trust: 6, closeness: 3, tension: -2, memory: 'kept_ask' },
  ch1_jun07_tatiana_admitted: { bond: 'andrey_tatiana', trust: -3, tension: -3, memory: 'admitted_overpromise', conflict: { id: 'decided_for_her', stage: 'acknowledged' } },
  ch1_jun07_tatiana_repair: { bond: 'andrey_tatiana', trust: 2, memory: 'promised_sample', conflict: { id: 'decided_for_her', stage: 'repairing' } },
  ch1_jun07_tatiana_bluff: { bond: 'andrey_tatiana', trust: -6, tension: 6, memory: 'bluffed' },
  ch1_jun07_tatiana_excuse: { bond: 'andrey_tatiana', trust: -4, tension: 3, memory: 'promise_late', conflict: { id: 'unkept_promise', stage: 'open' } },
  ch1_jun07_tatiana_apology: { bond: 'andrey_tatiana', trust: -4, tension: 1, memory: 'promise_late', conflict: { id: 'unkept_promise', stage: 'acknowledged' } },
  ch1_jun07_tatiana_warm: { bond: 'andrey_tatiana', closeness: 3, memory: 'closing_talk' },
  ch1_jun06_mother_grounded: { bond: 'andrey_mother', trust: 4, tension: -2, memory: 'mom_checked' },
  ch1_jun06_mother_wait: { bond: 'andrey_mother', memory: 'mom_wait' },
  ch1_jun06_mother_snapped: { bond: 'andrey_mother', trust: -3, tension: 8, memory: 'snapped', conflict: { id: 'mother_say', stage: 'open' } },
  ch1_jun06_mother_yielded: { bond: 'andrey_mother', closeness: 2, memory: 'yielded' },
  ch1_jun07_mother_apology: { bond: 'andrey_mother', tension: -4, memory: 'mom_apologized', conflict: { id: 'mother_say', stage: 'acknowledged' } },
  ch1_jun07_mother_resolved: { bond: 'andrey_mother', trust: 3, tension: -4, memory: 'mom_explained', conflict: { id: 'mother_say', stage: 'resolved' } }
};
// STORY_NEEDS — именованные сюжетные условия (need: { story: 'имя' }), чтобы не писать длинную формулу в каждой реплике.
const STORY_NEEDS = {
  mom_jun6_topic: { on: [6, 6], notSeen: 'mom_jun6' },
  mom_cool: { from: [7, 6], notSeen: 'mom_jun7', relationship: { id: 'andrey_mother', conflict: { id: 'mother_say', stage: ['open', 'acknowledged'] } } }
};
// CALLERS — гости: человек стоит в месте scene (по умолчанию в лавке, x — где) и ждёт разговора, пока выполнен хотя бы один слот at.
// Слот: on — день, phase — часть дня, scene — id сцены: после её завершения гость уходит (seenScenes), need — условие, node — реплика (строка или список).
// Если Андрей не пришёл (был в лабазе, трактире), сцена не проходится и пропущенная встреча не считается пренебрежением.
const CALLERS = [
  { who: 'tatiana', scene: 'shop', x: 300, at: [
    { on: [3, 6], phase: 'evening', scene: 'tat_jun3', node: 'tat3_hub' },
    { on: [5, 6], phase: 'evening', scene: 'tat_jun5', node: [{ need: { relationship: { id: 'andrey_tatiana', memory: 'tat_dream' } }, node: 'tat5_warm' }, { node: 'tat5_cool' }] },
    { on: [7, 6], phase: 'evening', scene: 'tat_jun7', node: [
      { need: { all: [{ promiseDone: 'ask_sorokin_shirts' }, { noPromise: 'get_sorokin_order' }] }, node: 'tat7_kept' },
      { need: { all: [{ promiseOpen: 'get_sorokin_order' }, { heard: 'sorokin_shirts' }] }, node: 'tat7_big' },
      { need: { any: [{ promiseOpen: 'ask_sorokin_shirts' }, { promiseOpen: 'get_sorokin_order' }] }, node: 'tat7_unkept' },
      { need: { relationship: { id: 'andrey_tatiana', memory: 'tat_dream' } }, node: 'tat7_none_warm' },
      { node: 'tat7_none_cool' }] }
  ] }
];
// DEBUG_STATES — воспроизводимые состояния для отладочной панели (?debug=1): день, часть дня, события, обещания, пройденные сцены.
const DEBUG_STATES = {
  closer: { title: 'Сближение', on: [5, 6], events: ['ch1_jun01_tatiana_joke', 'ch1_jun03_tatiana_banter', 'ch1_jun03_tatiana_listened'], scenes: ['tat_jun3'] },
  grudge: { title: 'Обида', on: [7, 6], events: ['ch1_jun03_tatiana_listened', 'ch1_jun05_tatiana_big_promise'], scenes: ['tat_jun3', 'tat_jun5'],
    promises: { get_sorokin_order: {} }, heard: ['sorokin_shirts'] },
  acknowledged: { title: 'Признанная ошибка', on: [7, 6], phase: 'evening', events: ['ch1_jun03_tatiana_listened', 'ch1_jun05_tatiana_big_promise', 'ch1_jun07_tatiana_admitted'],
    scenes: ['tat_jun3', 'tat_jun5', 'tat_jun7'], promises: { get_sorokin_order: { broken: true } } },
  repairing: { title: 'Исправление', on: [7, 6], phase: 'evening', events: ['ch1_jun03_tatiana_listened', 'ch1_jun05_tatiana_big_promise', 'ch1_jun07_tatiana_admitted', 'ch1_jun07_tatiana_repair'],
    scenes: ['tat_jun3', 'tat_jun5', 'tat_jun7'], promises: { get_sorokin_order: { broken: true }, bring_sample: {} } },
  tension_high_closeness: { title: 'Близость при ссоре', on: [7, 6], phase: 'evening', events: ['ch1_jun01_tatiana_joke', 'ch1_jun03_tatiana_banter', 'ch1_jun03_tatiana_listened', 'ch1_jun05_tatiana_big_promise', 'ch1_jun07_tatiana_bluff'],
    scenes: ['tat_jun3', 'tat_jun5', 'tat_jun7'], promises: { get_sorokin_order: {} } }
};

Object.assign(NODES, {
  // ---- Татьяна, 1 июня (приход, торговля) ----
  tat1_open: { who: 'Татьяна', text: 'Добрый день. Хозяйка пирог затеяла, велела свёрток сушёных яблок. Только не дороже семи, а то она спросит с меня.', choices: [
    { text: 'Пирог? А кому достанется — тебе или хозяйкиному коту?', goto: 'tat1_joke', id: 'c_t1_joke', once: true, rel: 'ch1_jun01_tatiana_joke' },
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  tat1_joke: { who: 'Татьяна', text: 'Коту, конечно. Он у неё в чинах: ему и сметана, и рыбка. А мне яблочная шкурка, если повезёт.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  tat1_sold: { who: 'Татьяна', text: 'Спасибо. Хозяйка будет довольна, а мне меньше ворчанья.', choices: [{ text: 'До свидания.', do: 'finish', rel: 'ch1_jun01_tatiana_met' }] },
  tat1_refused: { who: 'Татьяна', text: 'Жаль. Попрошу у соседа напротив.', choices: [{ text: 'До свидания.', do: 'finish', rel: 'ch1_jun01_tatiana_met' }] },
  tat1_leave: { who: 'Татьяна', text: 'Так не пойдёт. Хозяйка каждую монетку считает.', choices: [{ text: 'До свидания.', do: 'finish', rel: 'ch1_jun01_tatiana_met' }] },
  // ---- Татьяна, 3 июня, вечер: разговор о шитье ----
  tat3_hub: { who: 'Татьяна', text: 'Добрый вечер, лавочник. Хозяйка послала за нитками в ряды, а я крюк дала: у вас окна светятся. Не гоните?', choices: [
    { text: 'Заходи. Яблоки у хозяйкиного кота не отбирала?', goto: 'tat3_banter', id: 'c_t3_banter', once: true, rel: 'ch1_jun03_tatiana_banter' },
    { text: 'Что ты делаешь вечерами, когда хозяйка спит?', goto: 'tat3_sewing', id: 'c_t3_sew', once: true, rel: 'ch1_jun03_tatiana_listened' },
    { text: 'Рад бы, да надо считать выручку. Заходи завтра.', goto: 'tat3_bye' }] },
  tat3_banter: { who: 'Татьяна', text: 'Не отбирала, но подумывала. Он на меня косо смотрит: чует, что я его сметану видела. А вы что, вечерами одни со счётами?', choices: [
    { text: 'Что ты делаешь вечерами, когда хозяйка спит?', goto: 'tat3_sewing', id: 'c_t3_sew', once: true, rel: 'ch1_jun03_tatiana_listened' },
    { text: 'Беги за нитками, а то ряды закроют.', goto: 'tat3_bye' }] },
  tat3_sewing: { who: 'Татьяна', text: 'Шью. Днём я хозяйкина, а ночью своя. Взяла у соседки-купчихи две рубахи и передник к воскресенью. Хочу, чтобы шитьё меня кормило, а не я его. Справляюсь.', choices: [
    { text: 'Хорошо придумала. Если что понадобится, говори.', goto: 'tat3_bye', rel: 'ch1_jun03_tatiana_support' },
    { text: 'Смотри, не надорвись: и день у хозяйки, и ночь.', goto: 'tat3_worry', rel: 'ch1_jun03_tatiana_worry' }] },
  tat3_worry: { who: 'Татьяна', text: 'Не надорвусь, я привычная. Вы лучше свою крупу считайте, лавочник.', choices: [{ text: 'Ладно, ладно.', goto: 'tat3_bye' }] },
  tat3_bye: { who: 'Татьяна', text: 'Побегу, а то ряды закроют. Спокойной ночи.', choices: [{ text: 'Спокойной ночи.', do: 'end', scene: 'tat_jun3' }] },
  // ---- Татьяна, 5 июня, вечер: просьба и обещание ----
  tat5_warm: { who: 'Татьяна', text: 'Лавочник! Заказ сдала, купчиха осталась довольна. Только мне нужна ещё работа, а где её взять, я не знаю. Ты же в округе всех знаешь.', choices: 'TAT5' },
  tat5_cool: { who: 'Татьяна', text: 'Добрый вечер. Дело есть, только неловко. Я иногда шью на заказ и хочу найти ещё заказчиков, а знакомых у меня здесь мало. Ты же в округе всех знаешь.', choices: 'TAT5' },
  tat5_small: { who: 'Татьяна', text: 'Договорились. Спроси, а я пока образец сошью. До пятницы.', choices: [{ text: 'До пятницы.', do: 'end', scene: 'tat_jun5' }] },
  tat5_big: { who: 'Татьяна', text: 'Десять?! Погоди, я же не просила... Ну, спасибо. Только смотри, не говори потом, что я тебя заставила. Я и сама могу.', choices: [{ text: 'Устрою, не бойся.', do: 'end', scene: 'tat_jun5' }] },
  tat5_decline: { who: 'Татьяна', text: 'Честно. На том и спасибо. Сама поищу.', choices: [{ text: 'Если услышу про заказ, скажу.', do: 'end', scene: 'tat_jun5' }] },
  // ---- Татьяна, 7 июня, вечер, после закрытия: разное по тому, что было сделано ----
  tat7_kept: { who: 'Татьяна', text: 'Ну что, лавочник? Ходил к Сорокину? Пятница сегодня.', choices: [
    { text: 'Ходил. Работникам рубахи не нужны, а двум приказчикам, может, и возьмёт. Просил принести образец.', goto: 'tat7_kept_ok', rel: 'ch1_jun07_tatiana_kept' },
    { text: 'Потом расскажу, я устал.', goto: 'tat7_later' }] },
  tat7_kept_ok: { who: 'Татьяна', text: 'Спросил и сказал как есть, без сказок. Образец у меня готов. Спасибо, Андрей. Правда.', choices: [{ text: 'Спокойной ночи, Татьяна.', do: 'end', scene: 'tat_jun7' }] },
  tat7_later: { who: 'Татьяна', text: 'Ладно. Только не тяни. Мне же надо знать, шить на приказчиков или нет.', choices: [{ text: 'Не буду.', do: 'end', scene: 'tat_jun7' }] },
  tat7_big: { who: 'Татьяна', text: 'Ну что, лавочник? Десять рубах, ты сказал. Я без сна сижу, считаю нитки. Что Сорокин?', choices: [
    { text: 'Десять он не закажет. Двум приказчикам, может, возьмёт, образец просил. Я обещал лишнее. Прости.', goto: 'tat7_big_honest', rel: 'ch1_jun07_tatiana_admitted', breakPromise: 'get_sorokin_order' },
    { text: 'Дело движется, не торопи.', goto: 'tat7_big_bluff', rel: 'ch1_jun07_tatiana_bluff' }] },
  tat7_big_honest: { who: 'Татьяна', text: 'Хоть не соврал. Я так и думала, что много. Только не решай за меня, ладно? Образец сама отнесу.', choices: [
    { text: 'Давай я сам покажу образец Сорокину. Если захочешь.', goto: 'tat7_repair', rel: 'ch1_jun07_tatiana_repair', promise: 'bring_sample' },
    { text: 'Как знаешь.', do: 'end', scene: 'tat_jun7' }] },
  tat7_repair: { who: 'Татьяна', text: 'Посмотрим. Принесу, когда сошью. Но слово ты мне теперь дай крепкое.', choices: [{ text: 'Дам.', do: 'end', scene: 'tat_jun7' }] },
  tat7_big_bluff: { who: 'Татьяна', text: 'Движется. Не нравится мне, как ты это сказал. Ладно, подожду. Но не затягивай.', choices: [{ text: 'Не затяну.', do: 'end', scene: 'tat_jun7' }] },
  tat7_unkept: { who: 'Татьяна', text: 'Лавочник, пятница. Ты обещал спросить у Сорокина. Спросил?', choices: [
    { text: 'Не успел. Завтра схожу.', goto: 'tat7_excuse', rel: 'ch1_jun07_tatiana_excuse' },
    { text: 'Забыл. Прости, схожу завтра же.', goto: 'tat7_apology', rel: 'ch1_jun07_tatiana_apology' }] },
  tat7_excuse: { who: 'Татьяна', text: 'Завтра. Я ждала сегодня. Ладно, иди. Только слово у тебя, Андрей, должно быть дороже мешка крупы.', choices: [{ text: 'Хорошо.', do: 'end', scene: 'tat_jun7' }] },
  tat7_apology: { who: 'Татьяна', text: 'Забыл... Бывает. Прощаю, но пока не сходишь, я не забуду. Иди.', choices: [{ text: 'Схожу.', do: 'end', scene: 'tat_jun7' }] },
  tat7_none_warm: { who: 'Татьяна', text: 'Шью допоздна, но мне приятно, что ты тогда выслушал. Ты не спешишь с советами, лавочник.', choices: [
    { text: 'Заходи ещё, если захочешь.', do: 'end', scene: 'tat_jun7', rel: 'ch1_jun07_tatiana_warm' },
    { text: 'Спокойной ночи.', do: 'end', scene: 'tat_jun7' }] },
  tat7_none_cool: { who: 'Татьяна', text: 'Добрый вечер. Я мимо, хозяйка послала. Не задерживаю.', choices: [{ text: 'Доброй ночи.', do: 'end', scene: 'tat_jun7' }] },
  // ---- Мать, 6 июня (утро): закупка впрок ----
  mom6_hub: { who: 'Мать', text: 'Андрей, сядь. Я всю ночь считала. Если Сорокин вправду поднимет цену, к осени мы без крупы. Давай возьмём у него сразу побольше, пока по шести, на все деньги.', choices: [
    { text: 'Я сам спрашивал Сорокина: пока по шести. На все деньги не станем, докупать буду по мере продаж.', need: { ctx: 'sorokin_says_price' }, goto: 'mom6_grounded', rel: 'ch1_jun06_mother_grounded' },
    { text: 'Давай сначала спрошу у самого Сорокина, потом решим.', need: { not: { ctx: 'sorokin_says_price' } }, goto: 'mom6_wait', rel: 'ch1_jun06_mother_wait' },
    { text: 'Я хозяин в лавке, мама. Решаю я.', goto: 'mom6_snap', rel: 'ch1_jun06_mother_snapped' },
    { text: 'Хорошо, как скажешь.', goto: 'mom6_yield', rel: 'ch1_jun06_mother_yielded' }] },
  mom6_grounded: { who: 'Мать', text: 'Сам ходил... Ну, значит, так. Но смотри, чтобы мешки не кончились раньше, чем привезут.', choices: [{ text: 'Пригляжу.', do: 'end', scene: 'mom_jun6' }] },
  mom6_wait: { who: 'Мать', text: 'Спроси. Только не тяни: тревожно мне.', choices: [{ text: 'Сегодня же схожу.', do: 'end', scene: 'mom_jun6' }] },
  mom6_snap: { who: 'Мать', text: 'Хозяин, значит. Ну-ну. Чай на столе.', choices: [{ text: 'Уйти.', do: 'end', scene: 'mom_jun6' }] },
  mom6_yield: { who: 'Мать', text: 'Вот и ладно. Я ведь не со зла, Андрей, а от опыта. Сам увидишь, как дело пойдёт.', choices: [{ text: 'Посмотрим.', do: 'end', scene: 'mom_jun6' }] },
  // ---- Мать, 7 июня: после резкого ответа ----
  mom7_cool: { who: 'Мать', text: 'Хозяин пришёл. Чай на столе.', choices: [
    { text: 'Я вчера погорячился. Расскажи, чего ты боишься.', goto: 'mom7_why', rel: 'ch1_jun07_mother_apology' },
    { text: 'Мне пора.', do: 'end', scene: 'mom_jun7' }] },
  mom7_why: { who: 'Мать', text: 'В голодный год ещё при твоём отце мы продали всё, что могли, чтобы закупить крупу, и едва не остались без лавки. С тех пор у меня всё внутри сжимается, когда слышу про подорожание.', choices: [
    { text: 'Давай решать вместе: ты считаешь, я проверяю у Сорокина.', do: 'end', scene: 'mom_jun7', rel: 'ch1_jun07_mother_resolved' },
    { text: 'Понятно.', do: 'end', scene: 'mom_jun7' }] }
});
// общие выборы Татьяны 5 июня (одни для обоих вариантов реплики)
const TAT5_CHOICES = [
  { text: 'Могу спросить у Сорокина, не нужны ли рубахи его людям. Только спрошу, остальное решишь сама. До пятницы.', goto: 'tat5_small', promise: 'ask_sorokin_shirts', rel: 'ch1_jun05_tatiana_small_promise' },
  { text: 'Это я устрою: выхлопочу у Сорокина заказ на десять рубах. Ты шей.', goto: 'tat5_big', promise: 'get_sorokin_order', rel: 'ch1_jun05_tatiana_big_promise' },
  { text: 'Не знаю, нужны ли ему рубахи, и обещать не стану. Если услышу про заказ, скажу.', goto: 'tat5_decline', rel: 'ch1_jun05_tatiana_declined' }];
NODES.tat5_warm.choices = NODES.tat5_cool.choices = TAT5_CHOICES;

// ================= КАРТЫ (экран «Карта», клавиша M) =================
// Несколько карт одного города в разном масштабе: start — какая открывается первой, кнопка вверху переключает на следующую.
// Схемы, а не точные планы: расстояния приблизительные. Координаты — в километрах от Кремля: x — на восток, y — на север.
// Где сейчас Андрей, игра определяет сама: это место, у которого scene совпадает с текущей сценой.
// У каждой карты: name — название на кнопке, title/subtitle — заголовок, view — как километры переводятся в точки
// (рамка w×h, точка карты cx, cy соответствует 0,0 км, kmPx точек на километр), k — во сколько раз крупнее рисуются
// вода, стены, домики (1 — карта всей Москвы), streets — дополнительные улицы, places — места.
// art — необязательная нарисованная карта (2000×1120, без подписей и точек); если файл есть, заменяет схему.
// У места: at — с какой стороны подпись (r, l, t, b); scene — какая сцена игры здесь есть ('shop' — лавка, иначе id из SCENES):
// туда можно отправиться кнопкой в карточке места. Без scene место только описано.
// Описания тестовые, о лете 1812 года (до вступления французов); исторические подробности проверяем отдельно.
const MAP = {
  start: 'local',
  kinds: {
    home:   { name: 'Лавка Андрея',      color: '#ffd34d' },
    trade:  { name: 'Торговля',          color: '#f08a3c' },
    power:  { name: 'Власть',            color: '#d9483b' },
    church: { name: 'Монастыри',         color: '#f4f1e6' },
    gate:   { name: 'Заставы и дороги',  color: '#b98a5a' },
    place:  { name: 'Примечательные места', color: '#5fa8d3' }
  },
  maps: {
    local: {
      name: 'Китай-город', title: 'Китай-город', subtitle: 'и окрестности · лето 1812',
      view: { w: 1000, h: 560, cx: 370, cy: 300, kmPx: 330 }, k: 3.5,
      art: { src: 'assets/map/kitay_gorod.png', w: 2000, h: 1120 },
      streets: [
        [[0.35,0.33],[0.6,0.52],[0.9,0.62],[1.3,0.68]],
        [[0.42,0.1],[0.7,0.18],[0.98,0.26]],
        [[0.42,-0.15],[0.7,-0.08],[1.0,-0.01],[1.25,-0.14],[1.5,-0.32]],
        [[0.33,-0.22],[0.36,-0.36],[0.4,-0.62],[0.45,-0.9]],
        [[0.95,0.5],[1.3,0.6],[1.9,0.85]],
        [[0.6,0.52],[0.62,0.8],[0.66,1.0]],
        [[0.55,-0.12],[0.6,-0.3],[0.9,-0.33]],
        [[-0.25,0.47],[-0.45,0.75],[-0.6,1.0]]
      ],
      places: [
        { id: 'lavka', name: 'Лавка Андрея', kind: 'home', x: 0.8, y: 0.32, at: 'b', scene: 'shop',
          desc: 'Семейная лавка в нижнем этаже дома в Китай-городе: крупа, хлеб, яблоки. Внизу торгуют, наверху живут.' },
        { id: 'ryady', name: 'Торговые ряды', kind: 'trade', x: 0.5, y: 0.04, at: 'b',
          desc: 'Сотни тесных лавок у Красной площади, каждый ряд — свой товар. Здесь узнают цены и новости.' },
        { id: 'gostiny', name: 'Гостиный двор', kind: 'trade', x: 0.72, y: 0.2, at: 'r',
          desc: 'Большой двор оптовой торговли между Ильинкой и Варваркой.' },
        { id: 'traktir', name: 'Трактир Сысалина', kind: 'place', x: 0.62, y: 0.155, at: 'b', scene: 'traktir',
          desc: 'Трактир на Ильинке, между рядами и Гостиным двором. По вечерам за столами купцы, приказчики, извозчики; пьют чай и водку, читают вслух газету, на крыльце нищие. Здесь узнают все новости и слухи.' },
        { id: 'krasnaya', name: 'Красная площадь', kind: 'place', x: 0.32, y: 0.12, at: 'l',
          desc: 'Главная площадь у Кремля: торг, толпа, глашатаи.' },
        { id: 'kremlin', name: 'Кремль', kind: 'power', x: -0.1, y: 0.05, at: 'l',
          desc: 'Соборы, дворцы, колокольня Ивана Великого. Сердце старой столицы.' },
        { id: 'okhotny', name: 'Охотный ряд', kind: 'trade', x: -0.15, y: 0.62, at: 'r',
          desc: 'Шумный съестной рынок у Кремля: дичь, мясо, рыба, овощи.' },
        { id: 'bogoyavlensky', name: 'Богоявленский монастырь', kind: 'church', x: 0.52, y: 0.38, at: 't',
          desc: 'Старый монастырь за торговыми рядами, у Никольской улицы.' },
        { id: 'ilyinskie', name: 'Ильинские ворота', kind: 'gate', x: 0.98, y: 0.27, at: 'r',
          desc: 'Ворота в стене Китай-города, выход с Ильинки на Маросейку и Покровку.' },
        { id: 'zaryadye', name: 'Зарядье', kind: 'place', x: 0.62, y: -0.24, at: 'b',
          desc: 'Тесные переулки между Варваркой и рекой: мастерские, постоялые дворы, склады.' },
        { id: 'labaz', name: 'Лабаз Сорокина', kind: 'trade', x: 0.86, y: -0.3, at: 'b', scene: 'labaz',
          desc: 'Хлебный лабаз купца Сорокина у реки: крупа и мука мешками, оптом. Здесь Андрей берёт товар для лавки.' },
        { id: 'most', name: 'Москворецкий мост', kind: 'place', x: 0.37, y: -0.4, at: 'l',
          desc: 'Мост через Москву-реку из Китай-города в Замоскворечье.' },
        { id: 'vospit', name: 'Воспитательный дом', kind: 'place', x: 1.2, y: -0.28, at: 'r',
          desc: 'Огромное здание на набережной у устья Яузы: приют для подкидышей.' },
        { id: 'zamosk', name: 'Замоскворечье', kind: 'place', x: 0.55, y: -0.68, at: 'r',
          desc: 'Купеческая сторона за рекой: дома, сады, церкви.' }
      ]
    },
    city: {
      name: 'Вся Москва', title: 'Москва', subtitle: 'лето 1812 года',
      view: { w: 1000, h: 560, cx: 560, cy: 290, kmPx: 42 }, k: 1,
      art: { src: 'assets/map/moscow_1812.png', w: 2000, h: 1120 },
      places: [
        { id: 'lavka', name: 'Лавка Андрея', kind: 'home', x: 0.8, y: 0.32, at: 'r', scene: 'shop',
          desc: 'Семейная лавка в нижнем этаже дома в Китай-городе, в двух шагах от Красной площади и торговых рядов: крупа, хлеб, яблоки. Внизу торгуют, наверху живут.' },
        { id: 'kremlin', name: 'Кремль', kind: 'power', x: -0.1, y: 0.05, at: 'b',
          desc: 'Соборы, дворцы, колокольня Ивана Великого. Сердце старой столицы.' },
        { id: 'okhotny', name: 'Охотный ряд', kind: 'trade', x: -0.2, y: 0.65, at: 'l',
          desc: 'Шумный съестной рынок у Кремля: дичь, мясо, рыба, овощи.' },
        { id: 'kuznetsky', name: 'Кузнецкий мост', kind: 'trade', x: 0.45, y: 1.25, at: 'r',
          desc: 'Улица модных лавок, многие держат французы: ткани, книги, украшения.' },
        { id: 'governor', name: 'Дом генерал-губернатора', kind: 'power', x: -0.55, y: 1.15, at: 'l',
          desc: 'Дом на Тверской. Отсюда расходятся по городу губернаторские афиши.' },
        { id: 'arbat', name: 'Арбат', kind: 'place', x: -1.35, y: 0.35, at: 'l',
          desc: 'Тихие переулки дворянских усадеб между Кремлём и Смоленской дорогой.' },
        { id: 'sukhareva', name: 'Сухарева башня', kind: 'place', x: 0.5, y: 2.55, at: 'r',
          desc: 'Высокая башня на Сретенке, видна из любой части города.' },
        { id: 'vospit', name: 'Воспитательный дом', kind: 'place', x: 1.15, y: -0.1, at: 'r',
          desc: 'Огромное здание на набережной у устья Яузы: приют для подкидышей.' },
        { id: 'lefortovo', name: 'Лефортово', kind: 'place', x: 3.85, y: 1.15, at: 'r',
          desc: 'Бывшая Немецкая слобода за Яузой: дворцы, сады, госпиталь.' },
        { id: 'khamovniki', name: 'Хамовнические казармы', kind: 'place', x: -2.55, y: -1.55, at: 'r',
          desc: 'Новые казармы в Хамовниках, достроены несколько лет назад.' },
        { id: 'novodevichy', name: 'Новодевичий монастырь', kind: 'church', x: -3.9, y: -2.65, at: 't',
          desc: 'Монастырь в излучине Москвы-реки, у Девичьего поля.' },
        { id: 'donskoy', name: 'Донской монастырь', kind: 'church', x: -0.6, y: -3.35, at: 'r',
          desc: 'Монастырь у Калужской дороги, на южной окраине.' },
        { id: 'simonov', name: 'Симонов монастырь', kind: 'church', x: 3.0, y: -2.8, at: 'r',
          desc: 'Монастырь-крепость на высоком берегу Москвы-реки, ниже города.' },
        { id: 'vorobyovy', name: 'Воробьёвы горы', kind: 'place', x: -3.75, y: -4.75, at: 'r',
          desc: 'Высокий берег за рекой. Отсюда вся Москва как на ладони.' },
        { id: 'dorogomilovo', name: 'Дорогомиловская застава', kind: 'gate', x: -4.95, y: 0.4, at: 't',
          desc: 'Въезд со Смоленской дороги. Через неё идут обозы с запада.' },
        { id: 'poklonnaya', name: 'Поклонная гора', kind: 'place', x: -7.2, y: 0.2, at: 'b',
          desc: 'Холм на Смоленской дороге: отсюда путники впервые видят Москву.' },
        { id: 'kaluga', name: 'Калужская застава', kind: 'gate', x: -1.4, y: -3.45, at: 'l',
          desc: 'Выезд на Калужскую дорогу, на юг.' },
        { id: 'rogozh', name: 'Рогожская застава', kind: 'gate', x: 3.9, y: -0.7, at: 'r',
          desc: 'Выезд на Владимирскую и Рязанскую дороги. Рядом Рогожская слобода ямщиков и старообрядцев.' },
        { id: 'tver', name: 'Тверская застава', kind: 'gate', x: -1.6, y: 3.6, at: 'l',
          desc: 'Выезд на Петербургскую дорогу.' },
        { id: 'petrovsky', name: 'Петровский дворец', kind: 'power', x: -3.25, y: 5.6, at: 'r',
          desc: 'Путевой дворец за городом на Петербургской дороге: здесь государи останавливаются перед въездом в Москву.' }
      ]
    }
  },
  // Общая география всех карт (км). river, yauza, canal — вода; kremlin, kitayWall, boulevards, earthWall, cityLine — стены и валы;
  // squares — площади (там нет домов); roads — дороги; woods — рощи и сады [x, y, радиус, деревьев].
  geo: {
    river: [[-9.5,2.9],[-7.2,2.0],[-5.6,1.2],[-4.4,0.5],[-3.9,-0.4],[-4.3,-1.5],[-5.0,-2.4],[-5.0,-3.6],[-4.2,-4.2],[-3.0,-4.2],
            [-2.3,-3.4],[-2.0,-2.2],[-1.5,-1.2],[-0.8,-0.5],[0.0,-0.35],[0.8,-0.35],[1.4,-0.4],[2.0,-1.1],[2.2,-2.2],[2.5,-3.3],
            [3.4,-4.3],[4.6,-5.0],[7.0,-6.0]],
    yauza: [[5.0,7.0],[4.3,4.0],[3.6,2.6],[3.3,1.4],[2.6,0.6],[1.9,0.1],[1.4,-0.4]],
    canal: [[-1.1,-0.8],[-0.4,-0.85],[0.5,-0.8],[1.2,-0.62],[1.6,-0.63]],
    ponds: [[1.1,1.05,0.12,0.05],[-0.95,1.3,0.07,0.07]],
    kremlin: [[-0.45,-0.25],[0.2,-0.3],[0.25,0.15],[-0.25,0.45]],
    kitayWall: [[-0.2,0.43],[0.1,0.75],[0.55,0.8],[0.95,0.5],[1.0,0.05],[0.85,-0.33]],
    boulevards: [[-0.9,-0.55],[-1.0,0.2],[-0.6,0.9],[0.1,1.3],[0.9,1.2],[1.4,0.7],[1.5,0.1],[1.35,-0.38]],
    earthWall: [[-2.0,-0.3],[-1.9,0.8],[-1.2,1.8],[0.2,2.3],[1.5,2.0],[2.3,1.2],[2.5,0.0],[2.1,-1.0],[1.4,-1.9],[0.2,-2.3],[-0.9,-2.0],[-1.6,-1.2]],
    cityLine: [[-4.95,0.4],[-4.3,2.2],[-2.8,3.4],[-1.6,3.6],[0.4,4.1],[2.4,3.8],[4.3,3.0],[5.0,1.2],[4.5,-0.3],[3.9,-0.7],[3.6,-2.2],
               [3.3,-3.4],[1.6,-3.9],[-0.2,-3.8],[-1.4,-3.45],[-2.6,-3.1],[-3.6,-3.1],[-4.6,-2.5],[-5.1,-1.2]],
    roads: [
      [[-0.2,0.5],[-0.6,1.4],[-1.1,2.5],[-1.6,3.6],[-2.4,4.6],[-3.25,5.6],[-4.2,7.2]],
      [[-0.4,0.2],[-1.35,0.35],[-2.4,0.3],[-3.4,0.2],[-4.4,0.4],[-4.95,0.4],[-6.0,0.3],[-7.2,0.2],[-10,0.0]],
      [[0.1,-0.35],[0.0,-1.4],[-0.6,-2.4],[-1.4,-3.45],[-2.2,-4.8],[-3.0,-7.0]],
      [[0.9,-0.35],[1.8,-0.6],[2.8,-0.6],[3.9,-0.7],[5.4,-0.9],[10,-1.6]],
      [[0.9,0.6],[1.8,1.0],[2.7,1.3],[3.85,1.15],[5.0,1.8],[10,2.8]],
      [[0.4,0.8],[0.5,2.55],[0.6,4.0],[0.9,5.5],[1.4,7.2]],
      [[-0.5,-0.1],[-1.5,-0.6],[-2.55,-1.55],[-3.9,-2.65]],
      [[0.45,-0.35],[0.5,-1.5],[0.6,-3.0],[0.7,-3.9],[1.0,-7.0]]
    ],
    woods: [[-3.8,-5.0,0.9,60],[-1.6,-2.6,0.45,22],[4.4,1.9,0.55,22],[-3.7,6.0,0.8,30],[-8.5,-3.0,2.2,110],[8.0,4.6,2.2,100],
            [-8.0,4.6,2.0,90],[7.2,-4.6,1.8,80],[3.8,6.3,1.6,60],[-11.5,1.8,1.6,60],[10.5,0.6,1.5,50]],
    squares: [[[0.22,-0.3],[0.42,-0.28],[0.44,0.32],[0.27,0.32],[0.25,0.15]]]
  }
};
