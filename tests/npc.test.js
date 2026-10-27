// Проверки типовых NPC (tools/make_npcs.py): файлы загружены и нужного размера, покупатели лавки нарисованы типовыми фигурами,
// в лавке днём стоят люди на случайных местах (свои на каждый день), в лабазе — свои extras, за окном проходят уменьшенные NPC. Снимки — в tools/out/npc_*.png (для глаз).
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
  const [shopExtras, shopAll] = await page.evaluate(() => [shopExtras().filter(e => spr[npcKey(e.type, e.v)].ok).length, shopExtras().length]);
  check(shopExtras === shopAll && shopAll >= 3, `в лавке днём видны люди на местах (${shopExtras} из ${shopAll})`);
  // случайная расстановка по дням: в один день одна и та же, по дням разная, без повторов, полоса у прилавка свободна, утром не больше crowd.morning, вечером пусто
  const crowd = await page.evaluate(() => {
    const saved = [state.day, state.phase], sig = () => shopExtras().map(e => e.type + e.v + '@' + e.x).join(' '), out = { days: new Set(), bad: [] };
    for (let d = 0; d < DAYS.length; d++) for (const ph of ['morning', 'day', 'evening']) {
      state.day = d; state.phase = ph; const l = shopExtras(), s1 = sig(); shopCrowd.key = ''; const s2 = sig();
      const cr = SCENE.crowd[ph] || [0, 0], [lo, hi] = Array.isArray(cr[0]) ? cr[Math.min(chapterOf(d), cr.length - 1)] : cr, spots = new Set(l.map(e => e.x)).size - l.filter(e => e.talk === 1).length;
      if (s1 !== s2) out.bad.push(d + ph + ': не повторяется');
      if (spots < lo || spots > hi) out.bad.push(d + ph + ': мест ' + spots);
      if (new Set(l.map(e => e.type + e.v)).size !== l.length) out.bad.push(d + ph + ': повтор');
      if (l.some(e => e.x > 360 && e.x < 470)) out.bad.push(d + ph + ': у прилавка');
      if (ph === 'day') out.days.add(s1);
    }
    [state.day, state.phase] = saved; shopCrowd.key = '';
    return { days: out.days.size, bad: out.bad.slice(0, 5) };
  });
  check(crowd.bad.length === 0, 'расстановка в лавке: ' + (crowd.bad.join('; ') || 'в день одна, утром ≤ 1, вечером никого, без повторов, у прилавка свободно'));
  // по сюжету: в главах дальше людей меньше, мужиков (ополчение) к концу нет; молва о лавке добавляет или убирает людей
  const story = await page.evaluate(() => {
    const saved = [state.day, state.phase, state.fame], ch = [], at = (d, fame) => { state.day = d; state.phase = 'day'; state.fame = fame; shopCrowd.key = ''; return shopExtras(); };
    for (let d = 0; d < DAYS.length; d++) { const c = chapterOf(d), l = at(d, 0); ch[c] = ch[c] || { n: 0, men: 0, days: 0 }; ch[c].days++; ch[c].n += l.length; ch[c].men += l.filter(e => SCENE.crowd.draft.types.includes(e.type)).length; }
    let up = 0, down = 0; for (let d = 0; d < 7; d++) { up += at(d, 50).length - at(d, 0).length; down += at(d, 0).length - at(d, -50).length; }
    [state.day, state.phase, state.fame] = saved; shopCrowd.key = '';
    return { avg: ch.map(c => +(c.n / c.days).toFixed(1)), men: ch.map(c => c.men), up, down };
  });
  check(story.avg[0] > story.avg[3] && story.avg[3] > story.avg[5] && story.avg[6] <= 1, `к войне в лавке людей меньше (в среднем по главам: ${story.avg.join(', ')})`);
  check(story.men[5] === 0 && story.men[6] === 0 && story.men[0] > 0, `мужики уходят в ополчение (мужиков по главам: ${story.men.join(', ')})`);
  check(story.up > 0 && story.down > 0, `молва о лавке: +50 — больше людей (+${story.up} за неделю), −50 — меньше (−${story.down})`);
  check(crowd.days > 30, `по дням люди в лавке разные (${crowd.days} разных расстановок из ${await page.evaluate(() => DAYS.length)} дней)`);
  await page.screenshot({ path: path.join(OUT, 'npc_shop_day.png') });
  // за окном: прохожие из типовых NPC
  await page.evaluate(() => { player.x = 140; walkersBy.shop = { list: [], next: 0, last: 0 }; });
  await page.waitForTimeout(4000);
  const pass = await page.evaluate(() => walkersBy.shop.list.filter(w => w.npc && spr[w.npc].ok).length);
  check(pass > 0, `за окном проходит типовой NPC (${pass})`);
  await page.screenshot({ path: path.join(OUT, 'npc_shop_window.png') });
  // лабаз
  await page.evaluate(() => { state.phase = 'morning'; state.scene = 'labaz'; resetPlayer(); player.x = 250; }); await page.waitForTimeout(3500);
  const [lab, labAll] = await page.evaluate(() => [SCENES.labaz.extras.filter(e => spr[npcKey(e.type, e.v)].ok).length, SCENES.labaz.extras.length]);
  check(lab === labAll, `в лабазе стоят extras (${lab} из ${labAll})`);
  await page.screenshot({ path: path.join(OUT, 'npc_labaz.png') });
  await page.evaluate(() => { player.x = 60; walkersBy.labaz = { list: [], next: 0, last: 0 }; }); await page.waitForTimeout(3000);
  const gate = await page.evaluate(() => walkersBy.labaz.list.filter(w => w.npc && spr[w.npc].ok).length);
  check(gate > 0, `в воротах лабаза проходят люди (${gate})`);
  await page.screenshot({ path: path.join(OUT, 'npc_labaz_gate.png') });
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
