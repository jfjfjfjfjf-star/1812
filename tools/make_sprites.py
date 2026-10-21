# Подготовка спрайтов из крупных генераций на белом фоне: фон -> прозрачность, уменьшение по площади, ячейка 144×120
# (сетка 480×270), при необходимости перекрашивание части фигуры и перевод на общую палитру игры (assets/palette.png).
# Нужен Python 3, numpy, Pillow. Так собраны файлы 21.10.2026 (исходники в assets/source/), порядок важен:
#   1) спрайты без палитры (из них строится палитра), 2) python tools/make_palette.py, 3) python tools/make_shop.py,
#   4) те же команды спрайтов с "palette":"assets/palette.png".
#   кадр покоя Андрея (рост 104):
#   python tools/make_sprites.py '{"src":["assets/source/andrey_idle_original.png"],"height":104,"colors":24,"palette":"assets/palette.png","out":"assets/characters/andrey_idle.png"}'
#   ходьба Андрея (4 кадра, выровнены по голове кадра покоя; жилет перекрашен под цвет кадра покоя):
#   python tools/make_sprites.py '{"src":["assets/source/andrey_walk_gpt_1.webp","assets/source/andrey_walk_gpt_2.webp","assets/source/andrey_walk_gpt_3.webp","assets/source/andrey_walk_gpt_4.webp"],"height":104,"scaleRef":0,"align":"head","headOffset":1.37,"colors":24,"recolor":[{"rows":[0.2,0.52],"hue":[16,32],"sat":[0.38,0.8],"val":[0.15,0.5],"shift":10,"satMul":0.85}],"palette":"assets/palette.png","out":"assets/characters/andrey_walk.png"}'
#   ходьба Андрея, 8 кадров (шаг, проход, проход, подъём — и то же с другой ноги); рост по кадрам: шаг 103, остальные 104:
#   python tools/make_sprites.py '{"src":["assets/source/andrey_walk8_1.webp","assets/source/andrey_walk8_2.webp","assets/source/andrey_walk8_3.webp","assets/source/andrey_walk8_4.webp","assets/source/andrey_walk8_5.webp","assets/source/andrey_walk8_6.webp","assets/source/andrey_walk8_7.webp","assets/source/andrey_walk8_8.webp"],"height":104,"heights":[103,104,104,104,103,104,104,104],"align":"head","headOffset":1.37,"colors":24,"palette":"assets/palette.png","out":"assets/characters/andrey_walk.png"}'
#   мать (рост 96):
#   python tools/make_sprites.py '{"src":["assets/source/mother_gpt.webp"],"height":96,"colors":20,"palette":"assets/palette.png","out":"assets/characters/mother_idle.png"}'
import sys, os, json, colorsys
from collections import deque
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette_lib

CELL_W, CELL_H, FLOOR, ANCHOR = 144, 120, 114, 72   # сетка 480×270: ячейка 144×120, подошвы в строке 113, опора x = 72 (можно задать в cfg)

def figure_mask(rgb):
    """Фон = почти белые пиксели, связанные с краем картинки (заливка от краёв)."""
    h, w, _ = rgb.shape
    whiteish = (rgb.min(axis=2) > 228) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 22)
    bg = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if whiteish[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if whiteish[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and whiteish[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    return ~bg

def shrink(rgb, mask, scale):
    """Уменьшение по площади: цвет — среднее только по пикселям фигуры, прозрачность — доля фигуры в клетке > 0.5."""
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    tw, th = max(1, round((x1 - x0) * scale)), max(1, round((y1 - y0) * scale))
    m = Image.fromarray(mask[y0:y1, x0:x1].astype(np.float32)).resize((tw, th), Image.BOX)
    mm = np.asarray(m)
    out = np.zeros((th, tw, 4), np.float32)
    for c in range(3):
        ch = Image.fromarray((rgb[y0:y1, x0:x1, c] * mask[y0:y1, x0:x1]).astype(np.float32)).resize((tw, th), Image.BOX)
        out[..., c] = np.asarray(ch) / np.maximum(mm, 1e-6)
    out[..., 3] = (mm > 0.5) * 255
    return out, (x0, y0, x1, y1)

def head_center_x(small):
    """Центр головы по горизонтали (верхние 12% фигуры) — опора для выравнивания кадров ходьбы."""
    a = small[..., 3] > 0; rows = np.where(a.any(axis=1))[0]; top = rows[0]; n = max(3, int(len(rows) * .12))
    xs = np.where(a[top:top + n])[1]; return xs.mean()

def to_cell(small, cx):
    """Ставит фигуру в ячейку: нижняя строка подошв -> FLOOR-1, точка cx -> ANCHOR."""
    a = small[..., 3] > 0; rows = np.where(a.any(axis=1))[0]; bottom = rows[-1]
    cell = np.zeros((CELL_H, CELL_W, 4), np.float32)
    oy, ox = (FLOOR - 1) - bottom, int(round(ANCHOR - cx))
    h, w = small.shape[:2]
    for y in range(h):
        for x in range(w):
            if small[y, x, 3] and 0 <= y + oy < CELL_H and 0 <= x + ox < CELL_W: cell[y + oy, x + ox] = small[y, x]
    return cell

def recolor(cell, rules):
    """Перекрашивание части фигуры (например, жилета под цвет кадра покоя). Правило: rows — полоса по высоте фигуры (доли),
    hue/sat/val — диапазоны тона (градусы), насыщенности и яркости; shift — сдвиг тона, satMul — множитель насыщенности."""
    a = cell[..., 3] > 0; rows = np.where(a.any(axis=1))[0]
    if not len(rows): return cell
    t, b = rows[0], rows[-1]; h = b - t
    for r in rules:
        for y in range(t + int(h * r['rows'][0]), t + int(h * r['rows'][1])):
            for x in range(cell.shape[1]):
                if not cell[y, x, 3]: continue
                hh, ss, vv = colorsys.rgb_to_hsv(*(np.clip(cell[y, x, :3], 0, 255) / 255))
                if r['hue'][0] <= hh * 360 <= r['hue'][1] and r['sat'][0] <= ss <= r['sat'][1] and r['val'][0] <= vv <= r['val'][1]:
                    cell[y, x, :3] = np.array(colorsys.hsv_to_rgb(((hh * 360 + r['shift']) % 360) / 360, min(1, ss * r.get('satMul', 1)), vv)) * 255
    return cell

def quantize(cells, colors):
    """Общая палитра для всех ячеек (чтобы кадры не отличались оттенками)."""
    strip = np.concatenate(cells, axis=1)
    rgb = Image.fromarray(np.clip(strip[..., :3], 0, 255).astype(np.uint8))
    opaque = strip[..., 3] > 0
    sample = Image.fromarray(np.clip(strip[..., :3], 0, 255).astype(np.uint8)[opaque][None, :, :])
    pal = sample.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    q = np.asarray(rgb.quantize(palette=pal, dither=Image.Dither.NONE).convert('RGB'))
    out = np.dstack([q, (opaque * 255).astype(np.uint8)])
    out[~opaque] = 0
    return out

if __name__ == '__main__':
    cfg = json.loads(sys.argv[1])
    CELL_W, CELL_H = cfg.get('cell', [CELL_W, CELL_H]); FLOOR = cfg.get('floor', FLOOR); ANCHOR = cfg.get('anchor', ANCHOR)
    srcs = [np.asarray(Image.open(p).convert('RGB')).astype(np.float32) for p in cfg['src']]
    masks = [figure_mask(s) for s in srcs]
    hs = [np.where(m.any(axis=1))[0] for m in masks]
    ref = hs[cfg.get('scaleRef', 0)]; scale = cfg['height'] / (ref[-1] - ref[0] + 1)
    if cfg.get('heights'):   # свой рост для каждого кадра (масштаб всего кадра целиком): ровняет кадры разных генераций и задаёт подъём тела
        scales = [hh / (h[-1] - h[0] + 1) for hh, h in zip(cfg['heights'], hs)]
    else: scales = [scale] * len(srcs)
    smalls = [shrink(s, m, sc)[0] for s, m, sc in zip(srcs, masks, scales)]
    if cfg.get('align') == 'head':
        cells = [to_cell(sm, head_center_x(sm) - cfg.get('headOffset', 0)) for sm in smalls]
    else:
        cells = [to_cell(sm, sm.shape[1] / 2) for sm in smalls]
    if cfg.get('recolor'): cells = [recolor(c, cfg['recolor']) for c in cells]
    sheet = quantize(cells, cfg.get('colors', 24))
    img = Image.fromarray(sheet, 'RGBA')
    if cfg.get('palette'): img = palette_lib.apply(img, palette_lib.load(cfg['palette']))   # общая палитра игры
    img.save(cfg['out'])
    for i, sm in enumerate(smalls):
        a = sm[..., 3] > 0; print('кадр', i + 1, 'размер фигуры', a.any(axis=0).sum(), '×', a.any(axis=1).sum())
    print('масштаб', [round(float(x), 4) for x in scales], '->', cfg['out'], sheet.shape[1], '×', sheet.shape[0])
