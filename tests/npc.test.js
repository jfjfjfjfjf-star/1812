// Проверки типовых NPC (tools/make_npcs.py): файлы загружены и нужного размера, покупатели лавки нарисованы типовыми фигурами,
// в лавке днём стоят extras, в лабазе — свои extras, за окном проходят уменьшенные NPC. Снимки — в tools/out/npc_*.png (для глаз).
// Запуск из папки проекта: node tests/npc.test.js   (нужен Playwright)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'tools', 'out'); fs.mkdirSync(OUT, { recursive: true });
let failed = 0;
const check = (ok, what) => { console.log((ok ? 'ок   ' : 'ОШИБКА ') + what); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof spr !== 'undefined' && Object.keys(spr).filter(k => k.startsWith('npc_')).every(k => spr[k].complete));
  await page.waitForTimeout(800); await page.keyboard.press('e'); await page.waitForTimeout(600);
  const files = await page.evaluate(() => Object.keys(NPC_TYPES).flatMap(t => Array.from({ length: NPC_TYPES[t].variants }, (_, i) => npcKey(t, i + 1))));
  const loaded = await page.evaluate(keys => keys.filter(k => spr[k] && spr[k].ok).length, files);
  const needed = await page.evaluate(() => Object.keys(spr).filter(k => k.startsWith('npc_')).length);
  check(needed > 0 && loaded === needed, `файлы NPC загружены (${loaded} из ${needed} нужных сцене)`);
  check(await page.evaluate(() => CUSTOMERS.every(c => spr['s_' + c.id] && spr['s_' + c.id].ok)), 'у Павла, Дарьи и Фёдора есть фигуры (типовые NPC), не заглушки');
  // лавка днём: очередь у прилавка, покупатель
  await page.evaluate(() => { state.phase = 'day'; player.x = 420; }); await page.waitForTimeout(3500);
  const [shopExtras, shopAll] = await page.evaluate(() => [SCENE.extras.filter(e => e.phases.includes('day') && spr[npcKey(e.type, e.v)].ok).length, SCENE.extras.length]);
  check(shopExtras === shopAll, `в лавке днём видны extras (${shopExtras} из ${shopAll})`);
  await page.screenshot({ path: path.join(OUT, 'npc_shop_day.png') });
  // за окном: прохожие из типовых NPC
  await page.evaluate(() => { player.x = 140; walkers.list = []; walkers.next = 0; });
  await page.waitForTimeout(4000);
  const pass = await page.evaluate(() => walkers.list.filter(w => w.npc && spr[w.npc].ok).length);
  check(pass > 0, `за окном проходит типовой NPC (${pass})`);
  await page.screenshot({ path: path.join(OUT, 'npc_shop_window.png') });
  // лабаз
  await page.evaluate(() => { state.phase = 'morning'; state.scene = 'labaz'; resetPlayer(); player.x = 250; }); await page.waitForTimeout(3500);
  const [lab, labAll] = await page.evaluate(() => [SCENES.labaz.extras.filter(e => spr[npcKey(e.type, e.v)].ok).length, SCENES.labaz.extras.length]);
  check(lab === labAll, `в лабазе стоят extras (${lab} из ${labAll})`);
  await page.screenshot({ path: path.join(OUT, 'npc_labaz.png') });
  await page.evaluate(() => { player.x = 470; }); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'npc_labaz_right.png') });
  // покой: дыхание и разговор — кадры листа меняются со временем, у участника беседы бывает открыт рот
  const frames = await page.evaluate(async () => { const seen = new Set(), talk = new Set();
    for (let i = 0; i < 80; i++) { const [f0] = npcIdle(1.3); const [f1] = npcIdle(2.1, 0); seen.add(f0); talk.add(f1); await new Promise(r => setTimeout(r, 100)); }
    return [[...seen].sort(), [...talk].sort()]; });
  check(frames[0].includes(0) && frames[0].includes(1) && !frames[0].some(f => f > 1), `молчащий дышит, рот закрыт (кадры ${frames[0]})`);
  check(frames[1].some(f => f >= 2), `участник беседы шевелит губами (кадры ${frames[1]})`);
  check(errors.length === 0, 'ошибок страницы нет' + (errors.length ? ': ' + errors.join('; ') : ''));
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
