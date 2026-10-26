// Проверки фона лавки в высоком разрешении (HD) и ночного фона.
// Запуск из папки проекта: node tests/shop_hd.test.js   (нужен Playwright: npm i playwright && npx playwright install chromium)
// Что проверяется: игра открывается без ошибок; HD-слои дня и ночи загружены и нужного размера; утром и днём рисуется дневной фон,
// вечером — ночной (окно на кадре темнее); свет на персонажах (тон и ближние источники); с ?hd=0 — прежние пиксельные слои и вечерний сумрак darkNoNight; Андрей за прилавком.
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failed = 0;
const check = (ok, what) => { console.log((ok ? 'ок   ' : 'ОШИБКА ') + what); if (!ok) failed++; };

async function open(browser, query, w = 1920, h = 1080) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL + query);
  await page.waitForFunction(() => typeof spr !== 'undefined' && spr.bg && spr.bg.complete && (!spr.bgHd || spr.bgHd.complete) && (!spr.bgHdNight || spr.bgHdNight.complete));
  await page.keyboard.press('e');                      // закрыть заставку главы
  await page.waitForTimeout(300);
  return { page, errors };
}
// средняя яркость стекла окна на холсте (окно лавки: x 57..100, y 50..115 в координатах мира, камера в начале игры у левого края)
const windowLight = page => page.evaluate(() => {
  const d = ctx.getImageData(Math.round((62 - cameraX()) * px), 60 * px, 30 * px, 40 * px).data;
  let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3;
});
const phase = async (page, ph) => { await page.evaluate(ph => { state.phase = ph; }, ph); await page.waitForTimeout(300); };

(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });   // иначе холст с картинками из файлов не читается

  const { page, errors } = await open(browser, '');
  const sizes = await page.evaluate(() => ['bgHd', 'counterHd', 'frontHd', 'bgHdNight', 'counterHdNight', 'frontHdNight']
    .map(k => [k, spr[k] && spr[k].ok, spr[k] && spr[k].width + '×' + spr[k].height]));
  sizes.forEach(([k, ok, size]) => check(ok, `слой ${k} загружен (${size}, нужен ${594 * 3}×${270 * 3})`));
  await phase(page, 'morning'); const morning = await windowLight(page);
  check(!(await page.evaluate(() => nightBg())), 'утром рисуется дневной фон');
  await phase(page, 'day'); const day = await windowLight(page);
  check(!(await page.evaluate(() => nightBg())), 'днём рисуется дневной фон');
  await phase(page, 'evening'); const evening = await windowLight(page);
  check(await page.evaluate(() => nightBg()), 'вечером рисуется ночной фон');
  check(evening < day * 0.6 && evening < morning * 0.6, `вечером окно заметно темнее (утро ${morning | 0}, день ${day | 0}, вечер ${evening | 0})`);
  check(await page.evaluate(() => TIME.light.evening.dark < TIME.light.evening.darkNoNight), 'с ночным фоном вечерний сумрак слабее, чем без него');
  // свет на персонажах: общий тон по времени суток + свет ближних источников с их стороны
  check(await page.evaluate(() => ['morning', 'day', 'evening'].every(ph => TIME.light[ph].ambient)), 'у каждого времени суток есть общий тон для персонажей (ambient)');
  const candle = await page.evaluate(() => { const c = scn().lights.find(l => l.kind === 'flame'); return charLights(c.x - 20, SCENE.lane).find(o => o.color === c.color); });
  check(candle && candle.k > 0.3 && candle.s === 1, 'вечером у свечи на фигуру падает тёплый свет справа' + (candle ? ` (сила ${candle.k.toFixed(2)})` : ''));
  const far = await page.evaluate(() => charLights(SCENE.motherX, SCENE.lane).filter(o => o.color === scn().lights.find(l => l.kind === 'flame').color).length);
  check(far === 0, 'далеко от свечи (у матери) свет свечи на фигуру не падает');
  await phase(page, 'day');
  const win = await page.evaluate(() => charLights(SCENE.motherX, SCENE.lane).find(o => o.color === scn().lights.find(l => l.kind === 'window').color));
  check(win && win.k > 0.2 && win.s === -1, 'днём у окна на фигуру падает свет окна слева' + (win ? ` (сила ${win.k.toFixed(2)})` : ''));
  await phase(page, 'morning');                        // как игрок: утром открыть лавку, днём встать за прилавок (HD-прилавок поверх Андрея)
  await page.evaluate(() => { player.x = SCENE.workX; }); await page.waitForTimeout(100);
  await page.keyboard.press('e');
  for (let i = 0; i < 10 && !(await page.evaluate(() => serving)); i++) { await page.waitForTimeout(300); await page.keyboard.press('e'); }   // после открытия лавки E принимается не сразу
  check(await page.evaluate(() => state.phase === 'day' && serving === true), 'Андрей открывает лавку и встаёт за прилавок');
  check(errors.length === 0, 'ошибок страницы нет (1920×1080)' + (errors.length ? ': ' + errors.join('; ') : ''));
  await page.close();

  const small = await open(browser, '', 1280, 720);
  await phase(small.page, 'evening');
  check(small.errors.length === 0, 'ошибок страницы нет (1280×720, вечер)');
  await small.page.close();

  const old = await open(browser, '?hd=0');
  check(await old.page.evaluate(() => !spr.bgHd && !spr.bgHdNight), 'с ?hd=0 HD-слои не загружаются');
  await phase(old.page, 'evening');
  check(!(await old.page.evaluate(() => nightBg())), 'с ?hd=0 вечером нет ночного фона (сумрак darkNoNight)');
  check(old.errors.length === 0, 'ошибок страницы нет (?hd=0)');
  await old.page.close();

  await browser.close();
  console.log(failed ? `\nНе прошло проверок: ${failed}` : '\nВсе проверки пройдены');
  process.exit(failed ? 1 : 0);
})();
