// data.js — данные игры и настройки графики. Логику (index.html) править не нужно.
// ВСЁ содержимое, кроме размеров спрайта Андрея, ТЕСТОВОЕ: цены, единицы, персонажи, слухи.
// Историческую дату, валюту, меры и обстоятельства проверяем отдельно.

// Версия формата данных. index.html работает только с data.js той же версии (иначе покажет понятное сообщение).
const DATA_VERSION = 8;

// Графика. ВСЕ файлы необязательны: пока файла нет (или у него не тот размер), рисуется временная заглушка.
// background — цельный фон лавки в координатах мира, ровно SCENE.worldW × 180 (396×180), без прозрачности.
//   Когда фон подключён, старые окна, полки, прилавок и ковёр из прямоугольников не рисуются.
// counterFront — передняя часть прилавка отдельным слоем: рисуется ПОВЕРХ Андрея, когда он стоит за прилавком, и ПОД покупателем.
//   Файл 396×180 с прозрачностью (непрозрачна только область прилавка, пиксели те же, что в фоне, поэтому дыр и двойных контуров нет).
//   Если файла нет, а фон есть, слой вырезается из фона по прямоугольнику rect (координаты мира).
// foreground — необязательный передний план (бочки, ящики), 396×180 с прозрачностью; рисуется поверх всех персонажей.
// portrait — размер крупного портрета в режиме обслуживания (пути портретов лежат у персонажей); goodsIcon — размер значка товара в панели.
// stockMarks — временные квадратики остатка товара: show 'auto' = рисовать только пока фон ещё заглушка; true/false — принудительно.
//   Нарисованные на фоне мешки и корзины ОСТАТОК НЕ ПОКАЗЫВАЮТ: точный остаток — только в торговой панели.
const ART = {
  background:   { src: 'assets/backgrounds/shop.png' },
  counterFront: { src: 'assets/backgrounds/shop_counter.png', rect: { x: 135, y: 95, w: 219, h: 41 } },
  foreground:   { src: 'assets/backgrounds/shop_front.png' },
  portrait:  { w: 120, h: 136 },
  goodsIcon: { w: 24, h: 24 },
  stockMarks: { show: 'auto', x: 160, y: 98, groupStep: 60, perRow: 5, gap: 4, size: 3 }
};

const ANDREY = {                      // утверждённые параметры первого теста
  cellW: 96, cellH: 80, anchorX: 48, floorY: 76,
  walk: { src: 'assets/characters/andrey_walk.png', frames: 8 },   // пока нет файла: при ходьбе показывается статичный кадр покоя (НЕ готовая анимация)
  idle: { src: 'assets/characters/andrey_idle.png' },
  cycleDistance: 40                   // ПРОВИЗОРНО: подобрать по готовой анимации
};

// Товары: unit — единица, stock — остаток на старте, cost — закупка за единицу, price — начальная цена продажи
const GOODS = {
  grain:  { name: 'Крупа',          unit: 'мешочек', stock: 10, cost: 6, price: 10, color: '#c9893a', icon: 'assets/goods/grain.png' },
  bread:  { name: 'Хлеб',           unit: 'буханку', stock: 8,  cost: 3, price: 5,  color: '#a8672a', icon: 'assets/goods/bread.png' },
  apples: { name: 'Сушёные яблоки', unit: 'свёрток', stock: 6,  cost: 4, price: 7,  color: '#d8d0a0', icon: 'assets/goods/apples.png' }
};
const START = { money: 30 };

// Сцена: координаты МИРА в пикселях (экран 320x180 показывает часть лавки, камера следует за Андреем).
// worldW — ширина лавки (= ширина фона), lane — линия пола перед прилавком (по ней Андрей ходит свободно),
// walkMin / walkMax — границы ходьбы по x (слева табурет и мешки, справа ящики: Андрей их не проходит),
// workX — рабочее место: здесь подсказка «E — Встать за прилавок» и здесь Андрей стоит за прилавком (ноги на линии serviceY);
// customerX — где стоит покупатель (перед прилавком), motherX — мать, talkRange — на каком расстоянии можно заговорить,
// counter — границы прилавка (нужны только для заглушки).
// charScale — во сколько раз игра увеличивает всех персонажей при рисовании (1.2 = на 20% больше; 1 = как нарисовано).
// Размер самих файлов (ячейка 96×80) не меняется: увеличение делает игра. Из-за дробного множителя пиксели могут быть неровными.
const SCENE = { charScale: 1.2, worldW: 396, lane: 150, startX: 150, walkMin: 108, walkMax: 308, talkRange: 23,
                workX: 285, serviceY: 133, customerX: 235, motherX: 118, counter: { l: 135, r: 353 } };

// Покупатели (приходят по очереди). Правило торга одно для всех, без случайности:
// согласен, если цена за единицу <= maxUnit И сумма <= budget; иначе предлагает wantUnit за единицу.
// После трёх неудачных предложений уходит (leaveNode).
const CUSTOMERS = [
  { id: 'pavel', name: 'Павел', kind: 'story', portrait: 'assets/portraits/pavel.png', color: '#4a5a3a', want: 'grain', qty: 2, budget: 18, wantUnit: 8, maxUnit: 9,
    openNode: 'pavel_open', soldNode: 'pavel_sold', refusedNode: 'pavel_refused', leaveNode: 'pavel_leave',
    priceMsg: 'Два мешочка крупы. Почём?', counterMsg: 'За {counter} отдашь? Ещё дорогу оплачивать.',
    tradeTalk: [{ text: 'Почему решил отправить семью?', goto: 'pavel_why', id: 'c_why', once: true }] },
  { id: 'darya', name: 'Дарья', kind: 'regular', portrait: 'assets/portraits/darya.png', color: '#7a4a6b', want: 'bread', qty: 2, budget: 10, wantUnit: 4, maxUnit: 5,
    openNode: 'darya_open', soldNode: 'darya_sold', refusedNode: 'darya_refused', leaveNode: 'darya_leave',
    priceMsg: 'Сколько с меня?', counterMsg: 'Дороговато. Давайте {counter}.', tradeTalk: [] }
];
// kind: story — торговля и личные темы (tradeTalk); regular — общий торговый сценарий без личного разговора; мать — только разговоры, без торговли.
const MOTHER = { id: 'mother', name: 'Мать', kind: 'family', portrait: 'assets/portraits/mother.png', color: '#8a5a5a', node: 'mother_hub' };

// Сведения: topic — тема, source — исходный источник, kind — тип (пересказ или личное свидетельство)
const RUMORS = {
  pavel_neighbor_cart: { topic: 'cart_shortage', title: 'Трудно найти подводу', who: 'Павел', source: 'его сосед', kind: 'пересказ',
    note: 'Павел передал рассказ соседа, которому было трудно найти подводу. Причина неизвестна.',
    toast: 'Новый слух: «Трудно найти подводу»' }
};
// Дополнение к уже известной записи (новой записи не создаёт)
const CONTEXT = { mother_same_source: { to: 'pavel_neighbor_cart',
  text: 'Мать: сосед жаловался и ей утром. Источник тот же, это не второе подтверждение.' } };
const PROMISES = { tell_pavel_carrier: { title: 'Сообщить Павлу, если найдём перевозчика' } };

// Реплики. choices: goto — другая реплика; do — действие (trade, refuse, back, finish, end);
// need — условие {heard}; once+id — вопрос задаётся один раз; learn — запись; context — дополнение к записи.
// Реплики не проводят оплату: деньги и товар меняются только в торговле.
const NODES = {
  pavel_open: { who: 'Павел', text: 'Два мешочка крупы. Семью, может, отправлю за город — надо припасы собрать.', choices: [
    { text: 'Почему решил отправить семью?', goto: 'pavel_why', id: 'c_why', once: true },
    { text: 'Перейти к цене', do: 'trade' },
    { text: 'Пока не могу продать', do: 'refuse' }] },
  pavel_why: { who: 'Павел', learn: 'pavel_neighbor_cart',
    text: 'Сосед говорит, подводу едва нашёл. Вот и думаю, не пора ли заранее договориться.', choices: [
    { text: 'Ты сам с перевозчиками говорил?', goto: 'pavel_src', id: 'c_src', once: true },
    { text: 'Понятно. Вернёмся к покупке.', do: 'back' }] },
  pavel_src: { who: 'Павел', text: 'Нет, сам не говорил. Всё от соседа.', choices: [
    { text: 'Понятно. Вернёмся к покупке.', do: 'back' }] },
  pavel_sold: { who: 'Павел', text: 'Спасибо. Если узнаешь, кто за перевозку берётся, скажи.', choices: [
    { text: 'Почему решил отправить семью?', goto: 'pavel_why', id: 'c_why', once: true },
    { text: 'Если узнаю — передам.', do: 'finish', promise: 'tell_pavel_carrier' },
    { text: 'Обещать не стану.', do: 'finish' }] },
  pavel_refused: { who: 'Павел', text: 'Понятно. Пойду искать в другом месте.', choices: [
    { text: 'Почему решил отправить семью?', goto: 'pavel_why', id: 'c_why', once: true },
    { text: 'До свидания.', do: 'finish' }] },
  pavel_leave: { who: 'Павел', text: 'Так не пойдёт. Я заканчиваю разговор, пойду.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya_open: { who: 'Дарья', text: 'Две буханки, пожалуйста.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  darya_sold: { who: 'Дарья', text: 'Спасибо.',
    choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya_refused: { who: 'Дарья', text: 'Жаль. Зайду позже.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya_leave: { who: 'Дарья', text: 'Нет, так не пойдёт. Я заканчиваю разговор.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  mother_hub: { who: 'Мать', text: 'Что-то хотел, Андрей?', choices: [
    { text: 'Как сегодня дела?', goto: 'mother_shop' },
    { text: 'Павел говорит, трудно найти подводу. Ты слышала?', need: { heard: 'pavel_neighbor_cart' }, id: 'c_m_cart', once: true, goto: 'mother_cart' },
    { text: 'Ничего, потом.', do: 'end' }] },
  mother_shop: { who: 'Мать', text: 'Припасы проверь. И мешки из прохода убери — покупатели задевают.', choices: [
    { text: 'Ещё вопрос', goto: 'mother_hub' }, { text: 'Хорошо.', do: 'end' }] },
  mother_cart: { who: 'Мать', context: 'mother_same_source', text: 'Его сосед и здесь утром жаловался. Это всё один рассказ.', choices: [
    { text: 'Ещё вопрос', goto: 'mother_hub' }, { text: 'Понятно.', do: 'end' }] }
};
