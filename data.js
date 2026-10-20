// data.js — данные игры и настройки графики. Логику (index.html) править не нужно.
// ВСЁ содержимое, кроме размеров спрайта Андрея, ТЕСТОВОЕ: цены, единицы, персонажи, слухи.
// Историческую дату, валюту, меры и обстоятельства проверяем отдельно.

const ANDREY = {                      // утверждённые параметры первого теста
  cellW: 96, cellH: 80, anchorX: 48, floorY: 76,
  walk: { src: 'assets/characters/andrey_walk.png', frames: 8 },
  idle: { src: 'assets/characters/andrey_idle.png' },
  cycleDistance: 40                   // ПРОВИЗОРНО: подобрать по готовой анимации
};

// Товары: unit — единица, stock — остаток на старте, cost — закупка за единицу, price — начальная цена продажи
const GOODS = {
  grain:  { name: 'Крупа',          unit: 'мешочек', stock: 10, cost: 6, price: 10, color: '#c9893a' },
  bread:  { name: 'Хлеб',           unit: 'буханку', stock: 8,  cost: 3, price: 5,  color: '#a8672a' },
  apples: { name: 'Сушёные яблоки', unit: 'свёрток', stock: 6,  cost: 4, price: 7,  color: '#d8d0a0' }
};
const START = { money: 30 };

// Сцена: координаты МИРА в пикселях (экран 320x180 показывает часть лавки, камера следует за Андреем).
// worldW — ширина лавки, lane — линия пола, counter — зона у прилавка (осмотр товаров),
// customerX и motherX — где стоят покупатель и мать, talkRange — на каком расстоянии можно заговорить.
const SCENE = { worldW: 640, lane: 151, startX: 60, walkMin: 16, talkRange: 23,
                customerX: 430, motherX: 120, counter: { l: 300, r: 630 } };

// Покупатели (приходят по очереди). Правило торга одно для всех, без случайности:
// согласен, если цена за единицу <= maxUnit И сумма <= budget; иначе предлагает wantUnit за единицу.
// После трёх неудачных предложений уходит (leaveNode).
const CUSTOMERS = [
  { id: 'pavel', name: 'Павел', color: '#4a5a3a', want: 'grain', qty: 2, budget: 18, wantUnit: 8, maxUnit: 9,
    openNode: 'pavel_open', soldNode: 'pavel_sold', refusedNode: 'pavel_refused', leaveNode: 'pavel_leave',
    priceMsg: 'Два мешочка крупы. Почём?', counterMsg: 'За {counter} отдашь? Ещё дорогу оплачивать.',
    tradeTalk: [{ text: 'Почему решил отправить семью?', goto: 'pavel_why', id: 'c_why', once: true }] },
  { id: 'darya', name: 'Дарья', color: '#7a4a6b', want: 'bread', qty: 2, budget: 10, wantUnit: 4, maxUnit: 5,
    openNode: 'darya_open', soldNode: 'darya_sold', refusedNode: 'darya_refused', leaveNode: 'darya_leave',
    priceMsg: 'Сколько с меня?', counterMsg: 'Дороговато. Давайте {counter}.', tradeTalk: [] }
];
const MOTHER = { name: 'Мать', color: '#8a5a5a', node: 'mother_hub' };

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
  pavel_sold: { who: 'Павел', text: 'Спасибо. Если узнаешь, кто за перевозку берётся, скажи.\nВыручка {rev} — получили от покупателя. Прибыль {profit} — выручка минус закупочная стоимость проданного. Остаток: {left}.', choices: [
    { text: 'Почему решил отправить семью?', goto: 'pavel_why', id: 'c_why', once: true },
    { text: 'Если узнаю — передам.', do: 'finish', promise: 'tell_pavel_carrier' },
    { text: 'Обещать не стану.', do: 'finish' }] },
  pavel_refused: { who: 'Павел', text: 'Понятно. Пойду искать в другом месте.', choices: [
    { text: 'Почему решил отправить семью?', goto: 'pavel_why', id: 'c_why', once: true },
    { text: 'До свидания.', do: 'finish' }] },
  pavel_leave: { who: 'Павел', text: 'Так не пойдёт. Я заканчиваю разговор, пойду.', choices: [{ text: 'До свидания.', do: 'finish' }] },
  darya_open: { who: 'Дарья', text: 'Две буханки, пожалуйста.', choices: [
    { text: 'Перейти к цене', do: 'trade' }, { text: 'Пока не могу продать', do: 'refuse' }] },
  darya_sold: { who: 'Дарья', text: 'Спасибо.\nВыручка {rev} — получили от покупателя. Прибыль {profit} — выручка минус закупочная стоимость проданного. Остаток: {left}.',
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
