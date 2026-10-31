// Проверка системы отношений (docs/RELATIONSHIPS.md): состояние, миграция, эффекты и условия, цикл Андрей — Татьяна, мать, заметки «Люди», отладочная панель.
// Запуск из папки проекта: node tests/relationships.test.js   (нужен Playwright, как для shop_hd.test.js)
// Снимки — в tests/out/relationships (папка не попадает в git); доказательства — в production/qa/evidence/relationships.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, 'out', 'relationships');
fs.mkdirSync(OUT, { recursive: true });
let failed = 0;
const check = (ok, what) => { console.log((ok ? 'ок   ' : 'ОШИБКА ') + what); if (!ok) failed++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

async function fresh(browser, query = '') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FILE_NOT_FOUND/.test(m.text())) page.errors.push(m.text()); });
  await page.goto(URL + query);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof spr !== 'undefined');
  await wait(300);
  await page.evaluate(() => { $('night').classList.remove('on'); sleeping = false; });   // заставка первой главы не нужна
  return page;
}
// поставить игру на вечер нужного дня июня в лавке
const gotoEvening = (page, d) => page.evaluate(d => {
  state.day = DAYS.findIndex(x => x.date[0] === d && x.date[1] === 6); state.phase = 'evening'; state.scene = 'shop'; state.visit = 0;
  dlg = null; serving = false; resetPlayer(); placeVisitor(); save(); renderDlg();
}, d);
const click = async (page, text) => {
  const ok = await page.evaluate(t => { const b = [...document.querySelectorAll('#choices button, #pact button')].find(b => b.offsetParent !== null && !b.disabled && b.textContent.startsWith(t)); if (b) b.click(); return !!b; }, text);
  await wait(80); return ok;
};
const say = page => page.evaluate(() => ({ who: $('who').textContent, text: $('text').textContent, btns: [...document.querySelectorAll('#choices button')].map(b => b.textContent), open: $('dlg').style.display === 'block' }));
const snap = page => page.evaluate(() => JSON.stringify(state.relationships));
const bondOf = page => page.evaluate(() => JSON.parse(JSON.stringify(bond('andrey_tatiana'))));
// подойти к Татьяне и начать разговор клавишей E (как игрок)
async function talkTo(page) {
  await page.evaluate(() => { player.x = 300 - 30; player.y = laneAt(player.x); player.dir = 1; });
  await page.keyboard.press('e'); await wait(150);
}

(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  let page;

  // ---- 1. Начальное состояние и один выбор — одно изменение ----
  page = await fresh(browser);
  let R = await page.evaluate(() => state.relationships);
  check(R.schemaVersion === 1 && R.bonds.andrey_tatiana && R.bonds.andrey_mother && !Object.keys(R.appliedEvents).length, 'новая игра: отношения созданы, событий нет');
  check(R.bonds.andrey_tatiana.trust === 40 && R.bonds.andrey_tatiana.closeness === 25 && R.bonds.andrey_tatiana.status === 'acquaintance', 'Татьяна: стартовые доверие 40, близость 25, статус «знакомые»');
  await gotoEvening(page, 3);
  await talkTo(page);
  let s = await say(page);
  check(s.open && s.who === 'Татьяна' && s.text.includes('нитками'), '3 июня вечером: E рядом с Татьяной открывает её реплику');
  const before = await snap(page);
  await page.evaluate(() => { renderDlg(); renderDlg(); renderNotes(); });    // повторный показ ничего не начисляет
  check(before === await snap(page), 'повторная отрисовка реплики не меняет отношения');
  await click(page, 'Что ты делаешь вечерами');
  let b = await bondOf(page);
  check(b.closeness === 29 && b.memories.tat_dream, 'выбор «слушать»: близость 25 → 29 и воспоминание о шитье');
  await page.evaluate(() => { applyRel('ch1_jun03_tatiana_listened'); applyRel('ch1_jun03_tatiana_listened'); });
  b = await bondOf(page);
  check(b.closeness === 29, 'то же событие второй раз ничего не начисляет (ровно один раз)');
  await click(page, 'Хорошо придумала');
  await click(page, 'Спокойной ночи');
  check(await page.evaluate(() => !!state.relationships.seenScenes.tat_jun3), 'сцена 3 июня пройдена, Татьяна уходит');
  check(await page.evaluate(() => callersHere().length === 0), 'после сцены гостя в лавке нет');
  await page.screenshot({ path: path.join(OUT, 'after_jun3.png') });

  // ---- 2. Сохранение и загрузка ----
  const saved = await snap(page);
  await page.reload(); await page.waitForFunction(() => typeof state !== 'undefined'); await wait(300);
  check(saved === await snap(page), 'после перезагрузки отношения те же');
  check(await page.evaluate(() => state.phase === 'evening' && DAYS[state.day].date[0] === 3), 'после перезагрузки день и часть дня те же');

  // ---- 3. Цикл Андрей — Татьяна: слушал → маленькое обещание → Сорокин → 7 июня ----
  await gotoEvening(page, 5);
  await talkTo(page);
  s = await say(page);
  check(s.text.includes('Заказ сдала'), '5 июня: Татьяна помнит прежний разговор (вариант «тёплый»)');
  await click(page, 'Могу спросить у Сорокина');
  check(await page.evaluate(() => state.promises.ask_sorokin_shirts && !state.promises.ask_sorokin_shirts.done && !state.promises.get_sorokin_order), 'обещание «спросить у Сорокина» записано в state.promises');
  await click(page, 'До пятницы');
  // Сорокин: вопрос про рубахи, обещание выполнено
  await page.evaluate(() => { state.scene = 'labaz'; resetPlayer(); showNode('sorokin_hub'); });
  check(await click(page, 'Не нужны ли твоим людям рубахи'), 'у Сорокина появился вопрос про рубахи (условие promiseOpen)');
  check(await page.evaluate(() => state.promises.ask_sorokin_shirts.done && heard('sorokin_shirts')), 'Сорокин ответил: обещание выполнено, сведение записано');
  check(!(await bondOf(page)).memories.kept_ask, 'Татьяна пока не знает ответа Сорокина (воспоминания нет): NPC не реагирует на неизвестное');
  await page.evaluate(() => { state.scene = 'shop'; resetPlayer(); dlg = null; renderDlg(); });
  await gotoEvening(page, 7);
  await talkTo(page);
  s = await say(page);
  check(s.text.includes('Ходил к Сорокину'), '7 июня: после выполненного обещания Татьяна спрашивает про Сорокина');
  await page.screenshot({ path: path.join(OUT, 'jun7_kept.png') });
  await click(page, 'Ходил.');
  b = await bondOf(page);
  check(b.trust === 46 && b.closeness === 32 && b.memories.kept_ask, 'рассказал ей: доверие 40 → 46, близость 29 → 32 (+3), воспоминание');
  await click(page, 'Спокойной ночи, Татьяна');
  check(b.status === 'acquaintance', 'статус остаётся «знакомые»: романа нет');

  // ---- 4. Нарушенное обещание, извинение не стирает факт ----
  page.close(); page = await fresh(browser);
  await gotoEvening(page, 5); await talkTo(page);
  await click(page, 'Не знаю, нужны ли ему'); // «холодный» вариант тоже работает
  await click(page, 'Если услышу'); await page.close();
  page = await fresh(browser);
  await page.evaluate(() => { applyRel('ch1_jun03_tatiana_listened'); state.promises.ask_sorokin_shirts = { done: false, day: 4 }; });
  await gotoEvening(page, 7); await talkTo(page);
  s = await say(page);
  check(s.text.includes('Ты обещал спросить'), 'обещание не выполнено: на следующей встрече Татьяна его упоминает');
  await click(page, 'Забыл. Прости');
  b = await bondOf(page);
  const afterApology = b.trust;
  check(b.memories.promise_late && b.conflicts.unkept_promise.stage === 'acknowledged', 'извинение: конфликт «признан», но не закрыт, факт нарушения помнится');
  await click(page, 'Схожу.');
  await page.evaluate(() => { dlg = null; });
  await page.evaluate(() => { state.phase = 'evening'; });
  await page.evaluate(() => { for (let i = 0; i < 3; i++) relNight(); });
  b = await bondOf(page);
  check(b.memories.promise_late && b.conflicts.unkept_promise.stage === 'acknowledged' && b.trust === afterApology, 'ночь и время не стирают память и не закрывают значимый конфликт');
  check(await page.evaluate(() => state.promises.ask_sorokin_shirts.late === true), 'просроченное обещание помечено late');
  // напряжение при открытом конфликте не гасится само
  const t0 = b.tension;
  await page.evaluate(() => { relNight(); relNight(); });
  check((await bondOf(page)).tension === t0, 'при открытом конфликте мелкое напряжение само не утихает');
  // заметки «Люди»
  await page.keyboard.press('n'); await wait(100);
  let notes = await page.evaluate(() => $('notes').innerText);
  check(notes.includes('Люди') && notes.includes('Татьяна') && notes.includes('Не успел спросить') && notes.includes('не выполнено'), 'заметки «Люди»: Татьяна, обещание и нерешённое');
  check(!/trust|closeness|tension|[+−-]\d+ доверия|правильн/.test(notes) && !/\b(доверие|близость) \d/.test(notes), 'в заметках нет чисел, «правильных ответов» и скрытых чувств');
  await page.screenshot({ path: path.join(OUT, 'notes_people.png') });
  await page.keyboard.press('n');
  // поздняя помощь: спросить Сорокина после срока — обещание выполнено с опозданием, память о просрочке остаётся
  await page.evaluate(() => { state.scene = 'labaz'; resetPlayer(); showNode('sorokin_hub'); });
  await click(page, 'Не нужны ли твоим людям рубахи');
  check(await page.evaluate(() => state.promises.ask_sorokin_shirts.done && state.promises.ask_sorokin_shirts.late && bond('andrey_tatiana').memories.promise_late), 'выполнил поздно: обещание «выполнено, но с опозданием», память о просрочке не стёрта');
  await page.close();

  // ---- 5. Лишнее обещание, признание и исправление; блеф ----
  page = await fresh(browser);
  await page.evaluate(() => applyRel('ch1_jun03_tatiana_listened'));
  await gotoEvening(page, 5); await talkTo(page);
  await click(page, 'Это я устрою');
  b = await bondOf(page);
  check(b.conflicts.decided_for_her.stage === 'open' && b.tension === 4 && b.closeness === 31, 'лишнее обещание: близость 29 → 31 (рада), напряжение 0 → 4 (решил за неё), конфликт открыт');
  await click(page, 'Устрою');
  await page.evaluate(() => { state.scene = 'labaz'; resetPlayer(); showNode('sorokin_hub'); });
  check(await click(page, 'Мне нужен заказ для швеи'), 'у Сорокина вопрос про десять рубах');
  check(await page.evaluate(() => !state.promises.get_sorokin_order.done), 'ответ Сорокина «десять не закажет» не делает обещание выполненным');
  await page.evaluate(() => { state.scene = 'shop'; dlg = null; resetPlayer(); renderDlg(); });
  await gotoEvening(page, 7); await talkTo(page);
  s = await say(page);
  check(s.text.includes('Десять рубах, ты сказал'), '7 июня: Татьяна напоминает про десять рубах');
  await click(page, 'Десять он не закажет');
  b = await bondOf(page);
  check(b.conflicts.decided_for_her.stage === 'acknowledged' && b.trust === 37, 'признание: конфликт «признан», доверие 40 → 37');
  await click(page, 'Давай я сам покажу образец');
  b = await bondOf(page);
  check(b.conflicts.decided_for_her.stage === 'repairing' && await page.evaluate(() => !!state.promises.bring_sample), 'исправление: конфликт «исправляется», новое обещание про образец');
  await page.keyboard.press('n'); await wait(100);
  notes = await page.evaluate(() => $('notes').innerText);
  check(notes.includes('Обещал выхлопотать') && notes.includes('пытаюсь исправить') && notes.includes('образец'), 'заметки: что обещал, что признал, что исправляю');
  await page.screenshot({ path: path.join(OUT, 'notes_repairing.png') });
  await page.keyboard.press('n');
  await page.close();

  page = await fresh(browser);
  await page.evaluate(() => { applyRel(['ch1_jun03_tatiana_listened', 'ch1_jun05_tatiana_big_promise']); state.promises.get_sorokin_order = { done: false, day: 4 }; heard_(); function heard_() { learn('sorokin_shirts'); } });
  await gotoEvening(page, 7); await talkTo(page);
  await click(page, 'Дело движется');
  b = await bondOf(page);
  check(b.trust === 34 && b.tension === 10 && b.closeness === 31 && b.conflicts.decided_for_her.stage === 'open', 'блеф: доверие 34, напряжение 10, близость остаётся 31, конфликт открыт («близость при нерешённом конфликте»)');
  await page.close();

  // ---- 6. Повторный разговор не даёт набирать близость; пропущенная встреча — не пренебрежение ----
  page = await fresh(browser);
  await gotoEvening(page, 3);
  const c0 = (await bondOf(page)).closeness;
  for (let i = 0; i < 4; i++) { await talkTo(page); await click(page, 'Заходи. Яблоки'); await click(page, 'Что ты делаешь'); await click(page, 'Хорошо придумала'); await click(page, 'Спокойной ночи'); await page.evaluate(() => { delete state.relationships.seenScenes.tat_jun3; dlg = null; renderDlg(); }); }
  check((await bondOf(page)).closeness === c0 + 6, 'четыре одинаковых разговора подряд: близость выросла только на 2 + 4 (один раз)');
  await page.close();
  page = await fresh(browser);
  const sn = JSON.stringify(await bondOf(page));
  await page.evaluate(() => { state.phase = 'evening'; for (let i = 0; i < 6; i++) relNight(); });
  check(sn === JSON.stringify(await bondOf(page)) && await page.evaluate(() => !Object.keys(state.relationships.appliedEvents).length), 'встреча пропущена (Андрей не пришёл): у Татьяны числа, память и конфликты не меняются');
  await page.close();

  // ---- 7. Мать: не трогает торговлю; конфликт и примирение ----
  page = await fresh(browser);
  await page.evaluate(() => { state.day = DAYS.findIndex(x => x.date[0] === 6 && x.date[1] === 6); state.phase = 'morning'; dlg = null; resetPlayer(); save(); });
  const shopBefore = await page.evaluate(() => JSON.stringify({ m: state.money, st: state.stock, d: state.deals, h: state.heard, o: state.orders }));
  await page.evaluate(() => { player.x = Math.max(motherPos().x + 45, 145); player.y = laneAt(player.x); });
  await page.keyboard.press('e'); await wait(150);
  s = await say(page);
  check(s.who === 'Мать' && s.text.includes('Я всю ночь считала'), '6 июня: мать сама начинает разговор о закупке впрок');
  check(!s.btns.some(t => t.startsWith('Я сам спрашивал')), 'без проверки у Сорокина вариант «я сам спрашивал» недоступен (условие ctx)');
  await page.screenshot({ path: path.join(OUT, 'mother_jun6.png') });
  await click(page, 'Я хозяин в лавке');
  await click(page, 'Уйти.');
  b = await page.evaluate(() => JSON.parse(JSON.stringify(bond('andrey_mother'))));
  check(b.tension === 18 && b.trust === 57 && b.conflicts.mother_say.stage === 'open', 'резкий ответ матери: напряжение 10 → 18, конфликт открыт');
  check(shopBefore === await page.evaluate(() => JSON.stringify({ m: state.money, st: state.stock, d: state.deals, h: state.heard, o: state.orders })), 'разговор с матерью не меняет деньги, товар, сделки и слухи (торговая сторона отдельно)');
  check(await page.evaluate(() => !Object.keys(state).some(k => /rep|honor|fame/i.test(k))), 'в state нет полей торговой репутации/молвы: мать с ней не связана');
  await page.evaluate(() => { state.day = DAYS.findIndex(x => x.date[0] === 7 && x.date[1] === 6); state.phase = 'morning'; dlg = null; renderDlg(); player.x = Math.max(motherPos().x + 45, 145); });
  await page.keyboard.press('e'); await wait(150);
  s = await say(page);
  check(s.text.includes('Хозяин пришёл'), '7 июня: мать помнит резкость, разговор холоднее');
  await click(page, 'Я вчера погорячился');
  b = await page.evaluate(() => JSON.parse(JSON.stringify(bond('andrey_mother'))));
  check(b.conflicts.mother_say.stage === 'acknowledged', 'извинение: конфликт «признан»');
  await click(page, 'Давай решать вместе');
  b = await page.evaluate(() => JSON.parse(JSON.stringify(bond('andrey_mother'))));
  check(b.conflicts.mother_say.stage === 'resolved' && b.memories.snapped && b.memories.mom_explained, 'после объяснения матери конфликт решён, но память о резкости остаётся');
  await page.screenshot({ path: path.join(OUT, 'mother_jun7.png') });
  await page.close();

  // ---- 8. Порог чисел не запускает роман; пожар не зависит от отношений ----
  page = await fresh(browser);
  await page.evaluate(() => { const b = bond('andrey_tatiana'); b.trust = 100; b.closeness = 100; b.tension = 0; for (let i = 0; i < 3; i++) relNight(); });
  check(await page.evaluate(() => bond('andrey_tatiana').status === 'acquaintance' && !Object.keys(state.relationships.appliedEvents).length), 'доверие и близость 100 без сюжетной сцены: статус не меняется, событий нет');
  for (const [t, c, k] of [[0, 0, 100], [100, 100, 0], [0, 100, 100]]) {
    await page.evaluate(([t, c, k]) => { const b = bond('andrey_tatiana'), m = bond('andrey_mother'); [b, m].forEach(x => { x.trust = t; x.closeness = c; x.tension = k; });
      state.day = DAYS.length - 1; state.phase = 'evening'; state.scene = 'shop'; sleeping = false; dlg = null; cine = null; endDay(); }, [t, c, k]);
    await wait(500);
    check(await page.evaluate(() => !!cine), `финал: сцена пожара играет при доверии ${t}, близости ${c}, напряжении ${k} (выход из пожара от отношений не зависит)`);
    await page.evaluate(() => { if (cine) endCine(); sleeping = false; });
    await wait(200);
  }
  check(await page.evaluate(() => !JSON.stringify(CUTSCENES).includes('relationship')), 'в данных сцены пожара нет условий по отношениям');
  await page.close();

  // ---- 9. Старое сохранение ----
  page = await fresh(browser);
  await page.evaluate(() => { state.money = 77; state.day = 2; state.promises.tell_pavel_price = { done: true }; save(); });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); delete s.relationships; s.promises.tell_pavel_price = { done: true }; localStorage.setItem(SAVE_KEY, JSON.stringify(s)); });
  await page.reload(); await page.waitForFunction(() => typeof state !== 'undefined'); await wait(300);
  check(await page.evaluate(() => state.money === 77 && state.day === 2 && state.promises.tell_pavel_price.done === true), 'сохранение без отношений: деньги, день и обещание на месте');
  check(await page.evaluate(() => state.relationships.schemaVersion === 1 && Object.keys(state.relationships.appliedEvents).length === 0 && bond('andrey_tatiana').trust === 40 && !Object.keys(bond('andrey_tatiana').memories).length), 'старому сохранению добавлены стартовые связи без событий и воспоминаний (поступки не приписаны)');
  await page.evaluate(() => { save(); const s = JSON.parse(localStorage.getItem(SAVE_KEY)); s.relationships.bonds.andrey_tatiana.trust = 500; s.relationships.bonds.andrey_tatiana.memories.nonsense = {}; s.relationships.appliedEvents.nonsense = {}; localStorage.setItem(SAVE_KEY, JSON.stringify(s)); });
  await page.reload(); await page.waitForFunction(() => typeof state !== 'undefined'); await wait(300);
  check(await page.evaluate(() => bond('andrey_tatiana').trust === 100 && !bond('andrey_tatiana').memories.nonsense && !state.relationships.appliedEvents.nonsense), 'нелепые значения в сохранении приводятся к 0–100, неизвестные записи отбрасываются');
  await page.close();

  // ---- 10. Отладочная панель ----
  page = await fresh(browser, '?debug=1');
  check(await page.evaluate(() => $('reldbg').style.display !== 'block'), 'отладочная панель по умолчанию скрыта');
  await page.keyboard.press('Backquote'); await wait(100);
  check(await page.evaluate(() => $('reldbg').style.display === 'block' && $('reldbg').innerText.includes('andrey_tatiana')), 'с ?debug=1 клавиша ` открывает панель с параметрами связей');
  await page.evaluate(() => loadDebugState('tension_high_closeness')); await wait(150);
  const dbg = await page.evaluate(() => $('reldbg').innerText);
  check(dbg.includes('decided_for_her') && dbg.includes('bluffed') && /близость \d{2}/.test(dbg), 'состояние «близость при ссоре» загружается: видны конфликт, воспоминания, числа');
  await page.evaluate(() => { resetPlayer(); player.x = 270; }); await page.keyboard.press('e'); await wait(200);
  const dbg2 = await page.evaluate(() => $('reldbg').innerText);
  await page.screenshot({ path: path.join(OUT, 'debug_panel.png') });
  await page.close();
  page = await fresh(browser);
  await page.keyboard.press('Backquote'); await wait(100);
  check(await page.evaluate(() => $('reldbg').style.display !== 'block'), 'без ?debug=1 панель не открывается');
  check(page.errors.length === 0, 'ошибок страницы нет' + (page.errors.length ? ': ' + page.errors.join('; ') : ''));
  await page.close();

  // ---- 11. Все ссылки в данных существуют ----
  page = await fresh(browser);
  const bad = await page.evaluate(() => {
    const out = [], nodeIds = new Set(Object.keys(NODES));
    Object.keys(NODES).forEach(id => (NODES[id].choices || []).forEach(c => {
      if (c.goto && !NODES[c.goto]) out.push(id + ' → goto ' + c.goto);
      [].concat(c.rel || []).forEach(e => { if (!REL_EVENTS[e]) out.push(id + ' → событие ' + e); });
      if (c.promise && !PROMISES[c.promise]) out.push(id + ' → обещание ' + c.promise);
      if (c.keep && !PROMISES[c.keep]) out.push(id + ' → keep ' + c.keep);
    }));
    Object.keys(REL_EVENTS).forEach(e => { const x = REL_EVENTS[e]; if (!RELATIONS[x.bond]) out.push(e + ' связь'); [].concat(x.memory || []).forEach(m => { if (!MEMORIES[m]) out.push(e + ' память ' + m); }); if (x.conflict && !CONFLICTS[x.conflict.id]) out.push(e + ' конфликт'); });
    CALLERS.forEach(c => c.at.forEach(a => [].concat(a.node).forEach(n => { const id = typeof n === 'string' ? n : n.node; if (!NODES[id]) out.push('CALLERS → ' + id); })));
    Object.keys(DEBUG_STATES).forEach(k => (DEBUG_STATES[k].events || []).forEach(e => { if (!REL_EVENTS[e]) out.push('DEBUG ' + k + ' ' + e); }));
    Object.keys(PROMISES).forEach(k => { if (PROMISES[k].bond && !RELATIONS[PROMISES[k].bond]) out.push('обещание ' + k); });
    return out;
  });
  check(!bad.length, 'ссылки в данных (реплики, события, воспоминания, обещания, гости, отладка) существуют' + (bad.length ? ': ' + bad.join('; ') : ''));
  await page.close();

  await browser.close();
  console.log('\nСнимки: ' + OUT);
  console.log(failed ? `\nНе прошло проверок: ${failed}` : '\nВсе проверки пройдены');
  process.exit(failed ? 1 : 0);
})();
