"""Склейка панорам из tools/npc_layout_shots.js и разметка поверх: линия ходьбы Андрея, ряды глубины, места NPC с номерами,
что закрывает фигуры (передний слой, прилавок), запретные зоны лавки. Запуск: python3 tools/npc_layout_annotate.py <папка снимков>"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

D = sys.argv[1]; ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = 1280 / 480
meta = json.load(open(os.path.join(D, 'meta.json')))
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font, small, big = ImageFont.truetype(F, 18), ImageFont.truetype(F, 15), ImageFont.truetype(F, 24)
PHASE = {'morning': 'утро', 'day': 'день', 'evening': 'вечер'}
os.makedirs(os.path.join(D, 'pano'), exist_ok=True); os.makedirs(os.path.join(D, 'marked'), exist_ok=True)
FRONT = {'shop': [('assets/places/shop/shop_front.png', (255, 60, 200))],
         'labaz': [('assets/places/labaz/labaz_front.png', (255, 60, 200))]}

def S(v): return round(v * K)

def stitch(m):
    (a, b) = m['parts']; A = Image.open(os.path.join(D, 'raw', a['file'])).convert('RGB'); B = Image.open(os.path.join(D, 'raw', b['file'])).convert('RGB')
    P = Image.new('RGB', (S(m['worldW']), 720)); P.paste(A, (S(a['cam']), 0))
    x0 = a['cam'] + 480; P.paste(B.crop((S(x0 - b['cam']), 0, 1280, 720)), (S(x0), 0)); return P

def label(d, xy, text, fill, f=font, bg=(0, 0, 0)):
    x, y = xy; w = d.textlength(text, font=f); d.rectangle((x - 3, y - 2, x + w + 3, y + f.size + 3), fill=bg); d.text((x, y), text, font=f, fill=fill)

def mark(name, m, P):
    O = P.convert('RGBA'); ov = Image.new('RGBA', O.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for src, col in FRONT[m['scene']]:                                  # что закрывает фигуры: тонировка по альфе слоя
        L = Image.open(os.path.join(ROOT, src)).convert('RGBA').resize(O.size, Image.NEAREST).split()[3].point(lambda v: 90 if v > 128 else 0)
        T = Image.new('RGBA', O.size, col + (0,)); T.putalpha(L); ov = Image.alpha_composite(ov, T); d = ImageDraw.Draw(ov)
    if m['scene'] == 'shop':                                            # запретные зоны лавки
        for x0, x1, t, col in [(112 - 25, 182 + 25, 'место матери', (255, 170, 60)), (360, 470, 'проход: покупатель и Андрей', (120, 255, 120))]:
            d.rectangle((S(x0), S(196), S(x1), S(236)), outline=col + (255,), width=3, fill=col + (40,)); label(d, (S(x0) + 4, S(237)), t, col + (255,), small)
        c = m['counter']; d.line((S(c['l']), S(206), S(c['r']), S(206)), fill=(60, 220, 255, 255), width=3)
        label(d, (S(c['l']) + 4, S(206) - 22), 'основание прилавка: ноги людей только ниже этой линии', (60, 220, 255), small)
    lane = [(S(x), S(y)) for x, y in m['lane']]; d.line(lane, fill=(255, 235, 60, 255), width=3)
    for wx in m['walk']: d.line((S(wx), S(m['laneY']) - 14, S(wx), S(m['laneY']) + 14), fill=(255, 235, 60, 255), width=4)
    label(d, (S(m['walk'][0]) + 6, S(m['laneY']) + 6), 'линия ходьбы Андрея (масштаб 1)', (255, 235, 60), small)
    dp = m['depth']
    for y, t, col in [(dp['far']['y'], f"дальний ряд: мельче ×{dp['far']['scale']}, в дымке", (120, 170, 255)), (dp['near']['y'], f"передний план: крупнее ×{dp['near']['scale']}, почти силуэт", (255, 90, 90))]:
        for x in range(0, O.size[0], 24): d.line((x, S(y), x + 12, S(y)), fill=col + (255,), width=2)
        label(d, (O.size[0] - 520, S(y) - 22), t, col, small)
    for i, p in enumerate(m['people'], 1):                              # люди: точка у ступней и номер
        x, y = S(p['x']), S(p['y']); col = (255, 90, 90) if p['behind'] or p['y'] > m['laneY'] else (120, 170, 255) if p['y'] < m['laneY'] - 3 else (255, 235, 60)
        d.ellipse((x - 7, y - 7, x + 7, y + 7), outline=col + (255,), width=3); label(d, (x - 8, y + 9), str(i), col, font)
    if m['scene'] == 'shop' and not m['people']:                        # пустая лавка: показать все места
        for s in m['spots']:
            for (x, y) in [(s['x'], s['y'])] + ([(s['x2'], s['y2'])] if s.get('pair') else []):
                d.ellipse((S(x) - 9, S(y) - 9, S(x) + 9, S(y) + 9), outline=(255, 255, 255, 255), width=3)
            label(d, (S(s['x']) - 10, S(s['y']) + 12), s['id'], (255, 255, 255), small)
    O = Image.alpha_composite(O, ov).convert('RGB')
    # подпись снизу: что за снимок и список людей
    rows = [f"{m['date']} — {PHASE[m['phase']]}, глава {m['chapter'] + 1}. {'Лавка' if m['scene'] == 'shop' else 'Лабаз'}. Мир {m['worldW']}×270 пикс. игры, снимок ×{K:.2f}."]
    rows += [f"{i}. {p['name']} ({p['type']}), ноги x={p['x']}, y={p['y']}" + (' — за передним слоем (ящики закрывают ноги)' if p['behind'] else '') for i, p in enumerate(m['people'], 1)]
    if m['scene'] == 'shop' and not m['people']:
        rows += ['Места (белые кружки): ' + '; '.join(f"{s['id']} — " + (' + '.join('/'.join(p) for p in s['pair']) if s.get('pair') else ', '.join(s['who'])) for s in m['spots'])]
    rows += ['Розовое — передний слой (ящики, бочки, мешки: рисуются ПОВЕРХ людей).' + (' Голубая линия — основание прилавка и сундуков перед ним.' if m['scene'] == 'shop' else '')]
    wrap = []
    for r in rows:
        while d.textlength(r, font=small) > O.size[0] - 30:
            cut = r.rfind(' ', 0, int(len(r) * (O.size[0] - 30) / d.textlength(r, font=small))); wrap.append(r[:cut]); r = '   ' + r[cut + 1:]
        wrap.append(r)
    H = 20 + 22 * len(wrap); C = Image.new('RGB', (O.size[0], 720 + H), (18, 18, 18)); C.paste(O, (0, 0)); dc = ImageDraw.Draw(C)
    for j, r in enumerate(wrap): dc.text((14, 730 + 22 * j), r, font=small if j else font, fill=(235, 235, 235))
    C.save(os.path.join(D, 'marked', name + '.png'))

for name, m in meta.items():
    P = stitch(m); P.save(os.path.join(D, 'pano', name + '.png')); mark(name, m, P); print(name)
