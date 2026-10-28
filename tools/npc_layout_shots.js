// Снимки расстановки NPC для объяснения (ChatGPT, художнику): панорамы лавки и лабаза во всю ширину мира (две камеры, склейка),
// разные главы и части дня, а также meta.json с местами, линией пола, глубиной. Разметку поверх рисует tools/npc_layout_annotate.py.
// Запуск из папки проекта: node tools/npc_layout_shots.js <папка>   (нужен Playwright)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'out', 'layout')); fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof spr !== 'undefined' && Object.keys(spr).filter(k => k.startsWith('npc_')).every(k => spr[k].complete));
  await page.waitForTimeout(800); await page.keyboard.press('e'); await page.waitForTimeout(600);
  await page.addStyleTag({ content: '#stage > *:not(canvas) { visibility: hidden !important; }' });   // только картинка игры, без кнопок и подписей
  const meta = {};
  // одна панорама: Андрей в x = 240 (камера 0) и 354 (камера у правого края), куски склеивает annotate
  // в лавке Андрей стоит за прилавком (serving), в лабазе — на линии ходьбы перед работниками у ларей (они дальше, видны над ним)
  async function pano(name, setup) {
    const parts = [], lab = setup.includes('labaz');
    for (const ax of [240, 354]) {
      await page.evaluate(([setup, ax, lab]) => { eval(setup); serving = !lab; player.x = ax; player.y = laneAt(ax); player.dir = lab ? 1 : -1; shopCrowd.key = ''; }, [setup, ax, lab]);
      await page.waitForTimeout(1700);
      const f = path.join(OUT, 'raw', `${name}_${ax}.png`); await page.screenshot({ path: f });
      parts.push({ file: path.basename(f), cam: await page.evaluate(() => cameraX()) });
    }
    meta[name] = Object.assign({ parts }, await page.evaluate(() => {
      const c = state.scene === 'shop' ? SCENE : SCENES[state.scene], list = state.scene === 'shop' ? shopExtras() : c.extras;
      const lane = []; for (let x = 0; x <= c.worldW; x += 6) lane.push([x, laneAt(x)]);
      return { scene: state.scene, day: state.day, date: dateOf(state.day), phase: state.phase, chapter: chapterOf(state.day), worldW: c.worldW, lane, walk: [c.walkMin, c.walkMax],
        depth: c.depth, laneY: c.lane, people: list.filter(e => !e.phases || e.phases.includes(state.phase)).map(e => ({ type: e.type, name: NPC_TYPES[e.type].name, x: e.x, y: e.y || c.lane, behind: !!e.behind })),
        spots: state.scene === 'shop' ? SCENE.spots : null, counter: state.scene === 'shop' ? SCENE.counter : null,
        mother: state.scene === 'shop' ? MOTHER.activities.map(a => ({ x: a.x, y: a.y, name: a.name })) : null, customerX: c.customerX, andrey: serving ? [SCENE.workX, SCENE.serviceY] : [player.x, player.y] };
    }));
    console.log('панорама', name);
  }
  const shop = "state.scene = 'shop'; resetPlayer();", lab = "state.scene = 'labaz'; resetPlayer();";
  const keep = await page.evaluate(() => JSON.stringify(SCENE.crowd.day));
  await pano('shop_empty', shop + "state.day = 1; state.phase = 'day'; SCENE.crowd.day = [[0, 0]];");
  await pano('shop_all_spots', shop + "state.day = 1; state.phase = 'day'; SCENE.crowd.day = [[7, 7]];");
  await page.evaluate(k => { SCENE.crowd.day = JSON.parse(k); }, keep);
  const chapters = await page.evaluate(() => DAYS.map((d, i) => d.chapter ? i : -1).filter(i => i >= 0));
  for (const d of [0, 1, 2, ...chapters.slice(1)]) await pano(`shop_day${String(d + 1).padStart(2, '0')}`, shop + `state.day = ${d}; state.phase = 'day';`);
  await pano('shop_morning', shop + "state.day = 3; state.phase = 'morning'; SCENE.crowd.morning = [1, 1];");
  await pano('shop_evening', shop + "state.day = 3; state.phase = 'evening';");
  for (const ph of ['morning', 'day', 'evening']) await pano('labaz_' + ph, lab + `state.day = 1; state.phase = '${ph}';`);
  await page.evaluate(() => { serving = false; });
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
  console.log(errors.length ? 'ОШИБКА страницы: ' + errors.join('; ') : 'ок   ошибок страницы нет');
  await browser.close(); process.exit(errors.length ? 1 : 0);
})();
