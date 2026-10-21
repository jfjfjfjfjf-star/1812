# Подготовка спрайтов из крупных генераций на белом фоне: фон -> прозрачность, уменьшение по площади, общая палитра, ячейка 96×80.
# Нужен Python 3, numpy, Pillow. Примеры (так собраны файлы 21.10.2026, исходники в assets/source/):
#   ходьба Андрея (4 кадра, рост 69, кадры выровнены по голове как у кадра покоя):
#   python tools/make_sprites.py '{"src":["assets/source/andrey_walk_gpt_1.webp","assets/source/andrey_walk_gpt_2.webp","assets/source/andrey_walk_gpt_3.webp","assets/source/andrey_walk_gpt_4.webp"],"height":69,"scaleRef":0,"align":"head","headOffset":0.8,"colors":24,"out":"assets/characters/andrey_walk.png"}'
#   мать (рост 64):
#   python tools/make_sprites.py '{"src":["assets/source/mother_gpt.webp"],"height":64,"colors":20,"out":"assets/characters/mother_idle.png"}'
import sys, json
from collections import deque
import numpy as np
from PIL import Image

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
    smalls = [shrink(s, m, scale)[0] for s, m in zip(srcs, masks)]
    if cfg.get('align') == 'head':
        cells = [to_cell(sm, head_center_x(sm) - cfg.get('headOffset', 0)) for sm in smalls]
    else:
        cells = [to_cell(sm, sm.shape[1] / 2) for sm in smalls]
    sheet = quantize(cells, cfg.get('colors', 24))
    Image.fromarray(sheet, 'RGBA').save(cfg['out'])
    for i, sm in enumerate(smalls):
        a = sm[..., 3] > 0; print('кадр', i + 1, 'размер фигуры', a.any(axis=0).sum(), '×', a.any(axis=1).sum())
    print('масштаб', round(scale, 4), '->', cfg['out'], sheet.shape[1], '×', sheet.shape[0])
