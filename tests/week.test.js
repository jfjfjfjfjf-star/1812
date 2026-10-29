// Прохождение первой недели (1–7 июня) тремя стилями игры — как игрок: клавиши и кнопки на экране.
// Запуск из папки проекта: node tests/week.test.js   (нужен Playwright, как для shop_hd.test.js)
//   --full      честный стиль после недели доигрывает до финала (2 сентября, сцена пожара; ещё минуты 3–4)
//   --out ПАПКА куда сложить скриншоты (по умолчанию tests/out/week, папка не попадает в git)
// Стили: честный — уступает, принимает встречную цену, держит обещание, проверяет слух у Сорокина и заказывает крупу;
// жадный — просит дороже и встречную цену не принимает, сбавляет по одному; небрежный — отходит от прилавка посреди торга,
// открывает заметки и карту, перезагружает страницу посреди сделки, одному покупателю отказывает.
// В конце — таблица денег по дням для каждого стиля (её же читает агент-плейтестер).
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const FULL = process.argv.includes('--full');
const OUT = path.resolve(arg('--out') || path.join(__dirname, 'out', 'week'));
const WEEK = 7;                                          // дней с покупателями
let failed = 0;
const check = (ok, what) => { console.log((ok ? 'ок   ' : 'ОШИБКА ') + what); if (!ok) failed++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// ----- что сейчас на экране -----
const screen = page => page.evaluate(() => {
  const vis = el => el && el.offsetParent !== null;
  const btns = [...document.querySelectorAll('#choices button, #pact button')].filter(b => vis(b) && !b.disabled).map(b => b.textContent);
  return { dlg: dlg ? (dlg.idle ? 'idle' : dlg.summary ? 'summary' : dlg.order ? 'order' : dlg.trade ? 'trade' : 'node') : null,
    who: $('who').textContent, text: $('text').textContent, btns, serving, sleeping, cine: !!cine,
    night: $('night').classList.contains('on'), nightText: $('night').textContent,
    day: state.day, phase: state.phase, scene: state.scene, money: state.money, x: player.x };
});
const click = async (page, text) => {                   // кнопка диалога по началу надписи
  const ok = await page.evaluate(t => { const b = [...document.querySelectorAll('#choices button, #pact button')]
    .find(b => b.offsetParent !== null && !b.disabled && b.textContent.startsWith(t)); if (b) b.click(); return !!b; }, text);
  await wait(120); return ok;
};
const press = async (page, key) => { await page.keyboard.press(key); await wait(150); };
async function walkTo(page, x) {                          // держит стрелку, пока Андрей не дойдёт
  for (let i = 0; i < 3; i++) {
    const px = await page.evaluate(() => player.x);
    if (Math.abs(px - x) < 6) return true;
    const key = px < x ? 'ArrowRight' : 'ArrowLeft';
    await page.keyboard.down(key);
    await page.waitForFunction(([x, r]) => r ? player.x >= x - 3 : player.x <= x + 3, [x, px < x], { timeout: 10000 }).catch(() => {});
    await page.keyboard.up(key); await wait(80);
  }
  return Math.abs(await page.evaluate(() => player.x) - x) < 12;
}
async function waitAwake(page) {                          // ночь, утро, заставка главы: ждать, на заставке нажать E
  for (let i = 0; i < 80; i++) {
    const s = await screen(page);
    if (s.cine) { await press(page, 'e'); await wait(400); continue; }
    if (!s.sleeping && !s.night) return true;
    if (s.night && s.nightText.includes('E — продолжить')) await press(page, 'e');
    await wait(300);
  }
  return false;
}
async function shot(page, style, name) {
  fs.mkdirSync(path.join(OUT, style), { recursive: true });
  const file = path.join(OUT, style, name + '.png');
  await page.screenshot({ path: file }); return file;
}

// ----- выбор в разговоре по стилю -----
const POLICY = {
  honest: ['Я спросил у Сорокина', 'Гости надолго?', 'Ты сам у Сорокина спрашивал?', 'Понятно. Вернёмся к покупке.', 'Узнаю — скажу.', 'Перейти к цене', 'До свидания.'],
  greedy: ['Обещать не стану.', 'Перейти к цене', 'До свидания.'],
  careless: ['Обещать не стану.', 'Перейти к цене', 'До свидания.']
};
async function trade(page, style, s, ctx) {               // панель цены
  const accept = s.btns.find(b => b.startsWith('Принять'));
  if (style === 'greedy') {
    if (!ctx.raised) { ctx.raised = true; for (let i = 0; i < 3; i++) await page.click('#pp'); }   // сразу дороже обычного на 3
    else if (accept) await page.click('#pm');                                                   // после встречной сбавить на 1
    return click(page, 'Предложить цену');
  }
  if (accept) return click(page, accept);
  return click(page, 'Предложить цену');
}

// ----- один день в лавке: открыть, обслужить всех, закрыть, итоги -----
async function serveDay(page, style, log, dayLog) {
  const ctx = {}; let steps = 0, reloaded = false;
  await walkTo(page, await page.evaluate(() => SCENE.workX));
  await press(page, 'e');                                  // открыть лавку
  if (style === 'careless') {                             // посреди дня: карта при открытой лавке не пускает уйти
    await press(page, 'm'); const mapOk = await page.evaluate(() => mapOpen);
    await page.evaluate(() => { document.querySelector('#mapmarks .loc[data-id="labaz"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await wait(150);
    const blocked = await page.evaluate(() => !document.getElementById('mapgo') && document.getElementById('mapcard').textContent.includes('Лавка открыта'));
    if (dayLog.day === 0) check(mapOk && blocked, 'небрежный: пока лавка открыта, карта не даёт уйти в лабаз');
    await press(page, 'Escape');
  }
  for (let i = 0; i < 15 && !(await page.evaluate(() => serving)); i++) { await press(page, 'e'); await wait(200); }
  while (steps++ < 150) {
    const s = await screen(page);
    if (s.dlg === 'summary') break;
    if (s.dlg === 'idle') {
      if (s.btns.includes('Обслужить следующего')) { await click(page, 'Обслужить следующего'); continue; }
      if (s.text.includes('больше нет')) { await click(page, 'Закрыть лавку'); continue; }
      await wait(300); continue;                           // покупатель ещё идёт к прилавку
    }
    if (!s.dlg) {                                          // отошёл от прилавка — вернуться
      await walkTo(page, await page.evaluate(() => SCENE.workX)); await press(page, 'e'); continue;
    }
    if (s.dlg === 'trade') {
      if (s.text.includes('не хватает товара')) {        // товара меньше, чем просят: игроку остаётся только отказать
        log.push(`${style}, день ${dayLog.day + 1}: ${s.who} — ${s.text} Отказал.`);
        await click(page, 'Отказаться'); continue;
      }
      if (style === 'careless' && !ctx.away) {             // отойти посреди торга, заглянуть в заметки, вернуться
        ctx.away = true; const before = await page.evaluate(() => JSON.stringify(deal()));
        await press(page, 'Escape'); await press(page, 'n'); await press(page, 'n'); await press(page, 'e');
        const after = await page.evaluate(() => serving && dlg && dlg.trade ? JSON.stringify(deal()) : null);
        if (dayLog.day === 0) check(before === after, 'небрежный: после «отойти» и возврата торг продолжается с теми же условиями');
        continue;
      }
      if (style === 'careless' && dayLog.day === 2 && !reloaded) {   // перезагрузка (F5) посреди сделки
        reloaded = true;
        const before = await page.evaluate(() => JSON.stringify({ m: state.money, st: state.stock, d: deal(), v: state.visit }));
        await shot(page, style, 'd3_before_reload');
        await page.reload(); await page.waitForFunction(() => typeof state !== 'undefined' && typeof spr !== 'undefined');
        await wait(500); await waitAwake(page);
        const after = await page.evaluate(() => JSON.stringify({ m: state.money, st: state.stock, d: deal(), v: state.visit }));
        check(before === after, 'небрежный: после перезагрузки посреди сделки деньги, товар и условия сделки те же');
        continue;
      }
      if (await trade(page, style, s, ctx)) continue;
    }
    if (s.dlg === 'node') {
      if (style === 'careless' && dayLog.day === 3 && s.btns.includes('Пока не могу продать')) { await click(page, 'Пока не могу продать'); continue; }
      const pick = POLICY[style].find(p => s.btns.some(b => b.startsWith(p)));
      if (pick) { if (pick === 'Узнаю — скажу.') dayLog.promised = true; await click(page, pick); ctx.raised = false; continue; }
    }
    log.push(`${style}, день ${dayLog.day + 1}: не знаю, что нажать — «${s.who}: ${s.text}» [${s.btns.join(' | ')}]`);
    if (s.btns.length) { await click(page, s.btns[s.btns.length - 1]); continue; }
    await wait(300);
  }
  const s = await screen(page);
  check(s.dlg === 'summary', `${style}, день ${dayLog.day + 1}: день доходит до итогов` + (s.dlg === 'summary' ? '' : ` (застрял: ${s.dlg}, «${s.text}»)`));
  dayLog.summaryShot = await shot(page, style, `d${dayLog.day + 1}_summary`);
  await click(page, 'Хорошо');
}

// ----- лабаз: проверить слух у Сорокина и заказать крупу -----
async function goTo(page, placeId) {
  await press(page, 'm');
  await page.evaluate(id => { document.querySelector(`#mapmarks .loc[data-id="${id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })); }, placeId);
  await wait(150);
  const went = await page.evaluate(() => { const b = document.getElementById('mapgo'); if (b) b.click(); return !!b; });
  await wait(300); return went;
}
async function labaz(page, style, grain) {
  const went = await goTo(page, 'labaz');
  check(went && await page.evaluate(() => state.scene === 'labaz'), `${style}: по карте вечером можно дойти до лабаза`);
  const sx = await page.evaluate(() => SCENES.labaz.npcs[0].x);
  await walkTo(page, sx - 30); await press(page, 'e'); await wait(500);
  if (await click(page, 'Говорят, крупа у тебя подорожает?')) await click(page, 'Ещё вопрос');
  await click(page, 'Хочу заказать товар');
  for (let i = 0; i < grain; i++) await page.evaluate(() => document.querySelector('#panel button[data-k="grain"][data-n="1"]').click());
  await shot(page, style, 'labaz_order');
  const before = await page.evaluate(() => state.money);
  await click(page, 'Заказать за');
  const after = await page.evaluate(() => state.money);
  check(after === before - grain * 6, `${style}: заказ ${grain} мешочков крупы у Сорокина оплачен (${before} → ${after})`);
  await click(page, 'Спасибо.');
  await goTo(page, 'lavka');
}

async function endDay(page) {                              // у рабочего места: E — Закончить день (если были закупки, сначала итоги)
  await walkTo(page, await page.evaluate(() => SCENE.workX));
  await press(page, 'e'); await wait(200);
  await click(page, 'Закончить день');
  await wait(500); return waitAwake(page);
}

async function play(browser, style) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FILE_NOT_FOUND/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof spr !== 'undefined');
  await wait(500); await waitAwake(page);
  const log = [], money = [], days = [];
  for (let d = 0; d < WEEK; d++) {
    const dayLog = { day: d };
    check(await page.evaluate(d => state.day === d && state.phase === 'morning', d), `${style}: утро дня ${d + 1}`);
    if (d === 0) await shot(page, style, 'd1_morning');
    if (style === 'honest' && d === 0) {                     // поговорить с матерью
      await walkTo(page, await page.evaluate(() => motherPos().x + 60)); await press(page, 'e'); await wait(300);
      await click(page, 'Как сегодня дела?'); await click(page, 'Хорошо.');
    }
    await serveDay(page, style, log, dayLog);
    if (style === 'honest' && (d === 0 || d === 4)) await labaz(page, style, d === 0 ? 6 : 4);   // крупы на складе 10, а спрос за неделю 12
    const st = await page.evaluate(() => ({ money: state.money, stock: state.stock, today: state.today }));
    money.push(st.money); days.push(st);
    check(st.money >= 0 && Object.values(st.stock).every(n => n >= 0), `${style}, день ${d + 1}: деньги и товар не уходят в минус (монет ${st.money})`);
    check(await endDay(page), `${style}, день ${d + 1}: ночь проходит, наступает утро`);
  }
  check(await page.evaluate(() => state.day === 7 && state.phase === 'morning'), `${style}: после недели — утро 24 июня (глава 2)`);
  await shot(page, style, 'd8_chapter2');
  if (style === 'honest') {
    const p = await page.evaluate(() => state.promises.tell_pavel_price);
    check(p && p.done, 'честный: обещание Павлу дано и выполнено (сказал, что Сорокин цену не поднимает)');
  }
  if (style === 'honest' && FULL) {                        // пустые дни до финала: открыть, закрыть, закончить день
    for (let d = 7; await page.evaluate(() => state.day + 1 < DAYS.length); d++) {
      await serveDay(page, style, log, { day: d });
      check(await endDay(page), `честный, день ${d + 1}: ночь проходит`);
    }
    await serveDay(page, style, log, { day: 'последний' });
    await walkTo(page, await page.evaluate(() => SCENE.workX)); await press(page, 'e'); await wait(300);
    const saw = await page.evaluate(() => !!cine); if (saw) await shot(page, style, 'final_fire');
    check(saw, 'честный: в последний день по «Закончить день» играет сцена пожара Москвы');
    await waitAwake(page);
    check(await page.evaluate(() => $('toast').textContent.includes('последний день')), 'честный: после сцены — сообщение о конце версии');
  }
  check(errors.length === 0, `${style}: ошибок страницы нет` + (errors.length ? ': ' + [...new Set(errors)].join('; ') : ''));
  log.forEach(l => console.log('  заметка: ' + l));
  await page.close();
  return { money, days };
}

(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const res = {};
  for (const style of ['honest', 'greedy', 'careless']) res[style] = await play(browser, style);
  await browser.close();
  const name = { honest: 'честный', greedy: 'жадный', careless: 'небрежный' };
  console.log('\nДеньги на конец дня (после закупок), монет:');
  console.log('стиль       | ' + [...Array(WEEK)].map((_, i) => `${i + 1} июня`.padEnd(7)).join('| '));
  for (const s in res) console.log(name[s].padEnd(11) + ' | ' + res[s].money.map(m => String(m).padEnd(7)).join('| '));
  console.log('\nСкриншоты: ' + OUT);
  console.log(failed ? `\nНе прошло проверок: ${failed}` : '\nВсе проверки пройдены');
  process.exit(failed ? 1 : 0);
})();
