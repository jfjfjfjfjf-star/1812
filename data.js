// data.js — данные игры и настройки графики. Логику (index.html) править не нужно.
// ВСЁ содержимое, кроме размеров спрайта Андрея, ТЕСТОВОЕ: цены, единицы, персонажи, слухи.
// Игра начинается 1 июня 1812 года по старому стилю (подтверждено Кириллом). Валюту, меры и исторические обстоятельства проверяем отдельно.

// Версия формата данных. index.html работает только с data.js той же версии (иначе покажет понятное сообщение).
const DATA_VERSION = 20;

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
const ART = {
  background:   { src: 'assets/backgrounds/shop.png' },
  counterFront: { src: 'assets/backgrounds/shop_counter.png', rect: { x: 202, y: 142, w: 328, h: 62 } },
  foreground:   { src: 'assets/backgrounds/shop_front.png' },
  glass:        { src: 'assets/backgrounds/shop_glass.png' },   // стёкла окна (по ним проходят прохожие), собирает tools/make_shop.py
  portrait:  { w: 180, h: 204 },
  goodsIcon: { w: 36, h: 36 },
  stockMarks: { show: 'auto', x: 240, y: 147, groupStep: 90, perRow: 5, gap: 6, size: 4 }
};

const ANDREY = {                      // утверждённые параметры первого теста
  cellW: 144, cellH: 120, anchorX: 72, floorY: 114,  // сетка 480×270: Андрей 104 пикселя, подошвы в строке 113 ячейки
  walk: { src: 'assets/characters/andrey_walk.png', frames: 8 },   // 8 кадров (лист 1152×120): шаг, проход, проход, подъём — и то же с другой ноги; пока нет файла: статичный кадр покоя (НЕ анимация)
  idle: { src: 'assets/characters/andrey_idle.png' },
  // за прилавком (необязательные файлы; пока их нет — кадр покоя): ждёт покупателя (2 кадра, второй — короткое постукивание
  // пальцами) и передаёт товар при продаже (3 кадра, проигрываются один раз). Ячейки 144×120, опора и подошвы как у покоя.
  counter: { src: 'assets/characters/andrey_counter.png', frames: 2, times: [3, 0.35] },   // секунд на кадр
  give: { src: 'assets/characters/andrey_give.png', frames: 3, time: 0.3 },
  cycleDistance: 73                   // пикселей пути на цикл из 8 кадров (два шага): опорная стопа за шаг смещается на 36–37 px, но неравномерно (6, −1, 36, −4 по кадрам)
};

// Товары: unit — единица, stock — остаток на старте, cost — закупка за единицу, price — начальная цена продажи
const GOODS = {
  grain:  { name: 'Крупа',          unit: 'мешочек', stock: 10, cost: 6, price: 10, color: '#c9893a', icon: 'assets/goods/grain.png' },
  bread:  { name: 'Хлеб',           unit: 'буханку', stock: 8,  cost: 3, price: 5,  color: '#a8672a', icon: 'assets/goods/bread.png' },
  apples: { name: 'Сушёные яблоки', unit: 'свёрток', stock: 6,  cost: 4, price: 7,  color: '#d8d0a0', icon: 'assets/goods/apples.png' }
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
  // Свет и цвет в разное время суток (как свет рисуется — см. lights у сцены):
  //   dark — насколько темнеет сцена (0 — нисколько, 1 — полностью), darkColor — цвет сумрака;
  //   window — сила света из окна, warm — сила свечей и лампад (1 — полная);
  //   grade — цветокоррекция всей сцены (CSS-фильтр: saturate — насыщенность, contrast — контраст, brightness — яркость).
  light: {
    morning: { dark: 0.16, darkColor: '#1a2444', window: 1.0, warm: 0.45, grade: 'saturate(1.25) contrast(1.08) brightness(1.03)' },
    day:     { dark: 0,    darkColor: '#000000', window: 0.8, warm: 0.4,  grade: 'saturate(1.3) contrast(1.1) brightness(1.03)' },
    evening: { dark: 0.55, darkColor: '#160c12', window: 0.1, warm: 1.0,  grade: 'saturate(1.22) contrast(1.12) brightness(1.0)' }
  }
};
// Играбельные дни по порядку. date — [число, месяц] по старому стилю. Дни можно пропускать: между главами время перематывается.
// chapter — название главы (показывается перед первым днём главы); skip — текст перемотки (что случилось за пропущенное время);
// visits — какие приходы покупателей (id из VISITS) будут в этот день, по порядку. Один человек может прийти в разные дни.
// После последнего дня игра сообщает, что это конец текущей версии.
// ЧЕРНОВИК: главы, даты и тексты перемоток предложены для обсуждения, исторические подробности проверяем отдельно.
// Покупатели пока есть только в первую неделю (1–7 июня).
const DAYS = [
  { date: [1, 6], chapter: 'Глава 1. Мирная Москва', visits: ['pavel_1', 'darya_1'] },
  { date: [2, 6], visits: ['fedor_1'] },
  { date: [3, 6], visits: ['darya_2'] },
  { date: [4, 6], visits: ['fedor_2'] },
  { date: [5, 6], visits: ['pavel_2'] },
  { date: [6, 6], visits: ['fedor_3'] },
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
  { date: [2, 9], chapter: 'Финал', visits: [] }
];

// Сцена: координаты МИРА в пикселях (экран 480×270 показывает часть лавки, камера следует за Андреем).
// worldW — ширина лавки (= ширина фона), lane — линия пола перед прилавком (по ней Андрей ходит свободно),
// walkMin / walkMax — границы ходьбы по x: слева табурет и мешки; справа дверь (за 558 — стена). У двери Андрей проходит ПОЗАДИ ящиков (слой foreground),
// workX — рабочее место: здесь подсказка «E — Встать за прилавок» и здесь Андрей стоит за прилавком (ноги на линии serviceY):
//   x = 448 — голова и торс на гладкой стенной панели (x ≈ 395–468), у правого края книги; фигура целиком левее панели цены; лицом влево, к покупателю;
// customerX — где стоит покупатель (перед прилавком), motherX — мать, talkRange — на каком расстоянии можно заговорить,
// counter — границы прилавка (нужны только для заглушки).
// doorX — дверь (справа на фоне): отсюда покупатели входят и сюда уходят; customerSpeed — их скорость (пикселей в секунду);
// arrivalDelay — через сколько секунд после ухода одного покупателя в двери появляется следующий.
// charScale — во сколько раз игра увеличивает всех персонажей при рисовании. 1 = как нарисовано (Андрей 104 пикселя в ячейке 144×120).
// placeholderScale — во сколько раз крупнее рисуются человечки-заглушки (они задуманы ростом 66 для старой сетки 320×180).
// Сетка 480×270 с 21.10.2026 (раньше 320×180, все координаты умножены на 1,5).
const SCENE = { charScale: 1, placeholderScale: 1.5, worldW: 594, lane: 225, startX: 225, walkMin: 162, walkMax: 558, talkRange: 35,
                workX: 448, serviceY: 200, customerX: 387, motherX: 177, counter: { l: 202, r: 530 },
                doorX: 558, customerSpeed: 60, arrivalDelay: 1.5,
                // Свет лавки (координаты мира, по фону): window — окно (стекло x0..x1, y0..y1) и косой луч beam на пол с пылинками;
                // flame — пламя (мерцает, flicker — насколько); glow — ровное тёплое свечение. r — радиус света, color — цвет.
                lights: [
                  { kind: 'window', x0: 57, y0: 50, x1: 100, y1: 115, beam: [[57, 52], [100, 52], [178, 228], [96, 228]], color: '#8fb8ff' },
                  { kind: 'flame', x: 503, y: 119, r: 85, color: '#ffb35a', flicker: 0.12 },
                  { kind: 'flame', x: 531, y: 52, r: 55, color: '#ffc46e', flicker: 0.16 },
                  { kind: 'glow', x: 357, y: 122, r: 90, color: '#ff9c44', flicker: 0.03 }
                ],
                shadow: { w: 26, h: 6, alpha: 0.35 },   // тень под ногами персонажей (ширина, высота, плотность)
                // Прохожие за окном: тёмные силуэты в длинной одежде видны только на стекле (позади рамы и кувшинов).
                // x0..x1 — где идут (за окном), feetY — линия ног (ниже подоконника), height — рост, speed — скорость,
                // every — через сколько секунд появляется следующий, phases — в какие части дня ходят.
                passersby: { x0: 40, x1: 118, feetY: 122, height: [30, 36], speed: [7, 12], every: [5, 13], color: '#2a3a66', phases: ['morning', 'day'] } };

// Покупатели — люди: кто они (имя, портрет, цвет заглушки, kind). Что им нужно в конкретный день — в VISITS.
// portrait — крупный портрет для диалога (180×204); sprite — фигура в сцене (отдельный файл, один кадр покоя):
//   src — путь; cellW×cellH — размер ячейки (как у Андрея, 144×120); anchorX, floorY — точка опоры стоп в ячейке;
//   facing — куда смотрит фигура в файле ('right' или 'left'), в другую сторону игра её отражает.
//   Пока файла нет (или размер не тот) — человечек-заглушка. Кадров ходьбы нет: идущий показан тем же кадром (не анимация).
// kind: story — торговля и личные темы (tradeTalk); regular — общий торговый сценарий без личного разговора; мать — только разговоры, без торговли.
const CUSTOMERS = [
  { id: 'pavel', name: 'Павел', kind: 'story',   portrait: 'assets/portraits/pavel.png', color: '#4a5a3a',
    sprite: { src: 'assets/characters/pavel_idle.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right' } },
  { id: 'darya', name: 'Дарья', kind: 'regular', portrait: 'assets/portraits/darya.png', color: '#7a4a6b',
    sprite: { src: 'assets/characters/darya_idle.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right' } },
  { id: 'fedor', name: 'Фёдор', kind: 'regular', portrait: 'assets/portraits/fedor.png', color: '#5a4a3a',
    sprite: { src: 'assets/characters/fedor_idle.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right' } }
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
                  goto: 'pavel3_told', keep: 'tell_pavel_price' }] }
};
// kind: story — торговля и личные темы (tradeTalk); regular — общий торговый сценарий без личного разговора; мать — только разговоры, без торговли.
// Другие места (сцены), куда Андрей приходит через карту. Лавка описана выше (SCENE, ART), здесь — остальные.
// name — название (показывается при переходе); worldW, lane, startX, walkMin, walkMax, talkRange — как у лавки (координаты мира);
// background — фон ровно worldW×270 без прозрачности (пока файла нет — заглушка цветами wall и floor);
// npcs — персонажи сцены: x — где стоит, color — цвет заглушки, portrait — портрет 180×204, sprite — фигура (как у покупателей), node — первая реплика (NODES).
// Чтобы сцена была доступна, у места на карте (MAP) указывается scene с её id.
const SCENES = {
  labaz: { name: 'Лабаз Сорокина', worldW: 480, lane: 225, startX: 75, walkMin: 36, walkMax: 444, talkRange: 35,
    background: 'assets/backgrounds/labaz.png', wall: '#3a2c1e', floor: '#6b5236',
    npcs: [{ id: 'sorokin', name: 'Сорокин', x: 345, color: '#3b4a6b', portrait: 'assets/portraits/sorokin.png', node: 'sorokin_hub',
             sprite: { src: 'assets/characters/sorokin_idle.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right' } }] }
};
// Закупка у оптовика. В разговоре выбор с do: 'order' и seller (id персонажа) открывает заказ: Андрей выбирает количество
// и платит сразу; товар привозят в лавку на следующее утро (ночью, до открытия), где бы Андрей ни был.
// goods — что можно заказать: cost — цена за единицу (сейчас равна закупке в GOODS, по ней считается прибыль в лавке),
//   max — сколько всего можно заказать на одну доставку (заказ можно дополнить в тот же день).
// title — строка в заметках, пока заказ не привезли; askMsg — реплика при открытии заказа; noMoneyMsg — когда монет не хватает; lastDayMsg — в последний день текущей версии
//   (заказывать нельзя: привезти будет некуда); doneNode — реплика после заказа; backNode — куда ведёт «Назад».
// ТЕСТОВОЕ: цены, количества, реплики.
const SUPPLY = {
  sorokin: { title: 'Заказ у Сорокина', goods: { grain: { cost: 6, max: 20 } },
    askMsg: 'Сколько мешочков возьмёшь? Деньги вперёд, а завтра поутру работник привезёт к лавке.',
    noMoneyMsg: 'На столько у тебя денег не хватит, Андрей.',
    lastDayMsg: 'Не сегодня, Андрей. (Это последний день в текущей версии игры: привезти заказ будет некуда.)',
    doneNode: 'sorokin_ordered', backNode: 'sorokin_hub' }
};
const MOTHER = { id: 'mother', name: 'Мать', kind: 'family', portrait: 'assets/portraits/mother.png', color: '#8a5a5a', node: 'mother_hub',
  sprite: { src: 'assets/characters/mother_idle.png', cellW: 144, cellH: 120, anchorX: 72, floorY: 114, facing: 'right' } };

// Сведения: topic — тема, source — исходный источник, kind — тип (пересказ или личное свидетельство)
const RUMORS = {
  pavel_neighbor_price: { topic: 'grain_price', title: 'Крупа подорожает?', who: 'Павел', source: 'его сосед', kind: 'пересказ',
    note: 'Павел передал слова соседа: Сорокин будто бы собирается поднять цену на крупу. Сам Павел у Сорокина не спрашивал.',
    toast: 'Новый слух: «Крупа подорожает?»' }
};
// Дополнение к уже известной записи (новой записи не создаёт)
const CONTEXT = {
  mother_same_source: { to: 'pavel_neighbor_price',
    text: 'Мать: тот же сосед говорил и ей. Источник тот же — это не второе подтверждение.' },
  sorokin_says_price: { to: 'pavel_neighbor_price',
    text: 'Сорокин сам: цена пока прежняя, по шести за мешочек; что будет к осени, не обещает. Прямой источник, независимый от соседа.' } };
// Обещания. В реплике promise — дать обещание; keep — выполнить (в заметках «выполнено»).
const PROMISES = { tell_pavel_price: { title: 'Сказать Павлу, правда ли Сорокин поднимет цену на крупу' } };

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
  sorokin_hub: { who: 'Сорокин', text: 'А, Андрей! Чем могу служить? Крупа есть, гречневая и овсяная, мешками.', choices: [
    { text: 'Хочу заказать крупы', do: 'order', seller: 'sorokin' },
    { text: 'Почём нынче крупа?', goto: 'sorokin_price' },
    { text: 'Говорят, крупа у тебя подорожает?', need: { heard: 'pavel_neighbor_price' }, id: 'c_s_price', once: true, goto: 'sorokin_rumor' },
    { text: 'Что слышно на реке?', goto: 'sorokin_news', id: 'c_sorokin_news', once: true },
    { text: 'Пока ничего, зайду позже.', do: 'end' }] },
  sorokin_price: { who: 'Сорокин', text: 'Пока по-старому: шесть за мешочек. Закажешь — к утру привезу в лавку. А дальше кто знает.', choices: [
    { text: 'Ещё вопрос', goto: 'sorokin_hub' }, { text: 'Понятно.', do: 'end' }] },
  sorokin_ordered: { who: 'Сорокин', text: 'Сговорились. Завтра поутру будет у тебя в лавке.', choices: [
    { text: 'Ещё вопрос', goto: 'sorokin_hub' }, { text: 'Спасибо.', do: 'end' }] },
  sorokin_rumor: { who: 'Сорокин', context: 'sorokin_says_price', text: 'Кто говорит? Сосед Павлов? Пока отдаю по шести, как весной. Что к осени будет — не загадываю.', choices: [
    { text: 'Ещё вопрос', goto: 'sorokin_hub' }, { text: 'Понятно.', do: 'end' }] },
  sorokin_news: { who: 'Сорокин', text: 'На реке как обычно: барки разгружают, грузчики ругаются. Скучно, Андрей.', choices: [
    { text: 'Ещё вопрос', goto: 'sorokin_hub' }, { text: 'Понятно.', do: 'end' }] }
};

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
