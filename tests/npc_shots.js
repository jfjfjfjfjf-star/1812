// Снимки NPC на всех местах: лавка и лабаз, утро / день / вечер, камера слева, по центру и справа (камера идёт за Андреем). Пишет tools/out/npc_shots/<место>_<часть дня>_<камера>.png и общий лист npc_shots.png.
// Запуск из папки проекта: node tests/npc_shots.js   (нужен Playwright). Проверяет и ошибки страницы.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'tools', 'out', 'npc_shots'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof spr !== 'undefined' && Object.keys(spr).filter(k => k.startsWith('npc_')).every(k => spr[k].complete));
  await page.waitForTimeout(800); await page.keyboard.press('e'); await page.waitForTimeout(600);
  const shots = [];
  for (const scene of ['shop', 'labaz'])
    for (const phase of ['morning', 'day', 'evening'])
      for (const cam of ['left', 'center', 'right']) {
        await page.evaluate(([scene, phase, cam]) => {          // камера идёт за Андреем: ставим его к нужному краю или в середину
          state.scene = scene; state.phase = phase; resetPlayer();
          const c = scene === 'shop' ? SCENE : SCENES[scene];
          player.x = cam === 'left' ? c.walkMin : cam === 'right' ? c.walkMax : c.worldW / 2; player.y = laneAt(player.x);
        }, [scene, phase, cam]);
        await page.waitForTimeout(3200);                      // переход части дня и появление прохожих
        const f = path.join(OUT, `${scene}_${phase}_${cam}.png`); await page.screenshot({ path: f }); shots.push(f);
        console.log('снимок', path.basename(f));
      }
  // общий лист: 6 строк (место × часть дня) по 3 снимка
  const html = '<body style="margin:0;background:#111">' + shots.map((f, i) => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:640px;height:360px;display:inline-block">` + ((i + 1) % 3 ? '' : '<br>')).join('') + '</body>';
  const sheet = await browser.newPage({ viewport: { width: 1920, height: 2160 } });
  await sheet.setContent(html); await sheet.waitForTimeout(800);
  await sheet.screenshot({ path: path.join(OUT, 'npc_shots.png') });
  console.log(errors.length ? 'ОШИБКА страницы: ' + errors.join('; ') : 'ок   ошибок страницы нет');
  await browser.close(); process.exit(errors.length ? 1 : 0);
})();
