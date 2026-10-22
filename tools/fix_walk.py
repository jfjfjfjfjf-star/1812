# Ходьба Андрея из рисунков ChatGPT, 8 кадров, утверждена Кириллом 21.10.2026. Порядок (номера генераций):
#   10 проход → 25 промежуточный → 18 шаг → 13 нога встала → 15 проход → 27 промежуточный → 19 шаг → 17 нога встала.
#   25 и 27 ChatGPT нарисовал по двум соседним кадрам (промт A2 в docs/GPT_PROMPTS.md). Ноги не правились.
#   Голова во всех кадрах — рисунок ChatGPT из кадра 17 (в генерациях лицо и волосы немного разные, отсюда мерцание).
# Время показа кадров — ANDREY.walk.weights в data.js: сколько пикселей опорная стопа уходит назад за кадр, поэтому
# стопа стоит на полу. Нужны Python 3, numpy, Pillow. Запуск: python tools/fix_walk.py
import os, sys, json, subprocess
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette_lib

ORDER = [10, 25, 18, 13, 15, 27, 19, 17]
SRC = 'assets/source/andrey_walk_gen_%02d.webp'
FIX = {}   # номер кадра -> (файл правки, с какой строки и левее какого x стирать); сейчас правок нет
HEAD_FROM, HEAD_ROWS = 17, 16
OUT, TMP = 'assets/characters/andrey_walk.png', 'assets/characters/_walk_tmp.png'
COL = {'D': (38, 27, 21), 'E': (51, 37, 29), 'F': (54, 44, 36), 'G': (66, 51, 41), 'H': (70, 55, 43), 'A': (87, 45, 21),
       'P': (111, 56, 23), 'N': (107, 54, 23), 'I': (61, 38, 23), 'O': (119, 65, 32)}

def redraw(cell, path, y0, xcut):
    cell = cell.copy(); cell[y0:114, :xcut] = 0
    for line in open(path, encoding='utf-8'):
        if not line.strip() or line.startswith('#'): continue
        y, x0, px = line.split(); y, x0 = int(y), int(x0)
        for i, ch in enumerate(px):
            if ch != '.': cell[y, x0 + i, :3] = COL[ch]; cell[y, x0 + i, 3] = 255
    return cell

top = lambda c: np.where((c[..., 3] > 0).any(1))[0][0]

if __name__ == '__main__':
    cfg = {"src": [SRC % n for n in ORDER], "height": 104, "scaleRef": 1, "align": "head", "headOffset": 1.37,
           "colors": 24, "palette": "assets/palette.png", "out": TMP}
    subprocess.run([sys.executable, 'tools/make_sprites.py', json.dumps(cfg)], check=True, stdout=subprocess.DEVNULL)
    a = np.asarray(Image.open(TMP).convert('RGBA')); os.remove(TMP)
    cells = [a[:, i * 144:(i + 1) * 144].copy() for i in range(len(ORDER))]
    for i, n in enumerate(ORDER):
        if n in FIX: cells[i] = redraw(cells[i], *FIX[n])
    h = cells[ORDER.index(HEAD_FROM)]; ht = top(h)
    for c in cells:                                   # одна и та же голова, на высоте головы этого кадра
        t = top(c)
        for y in range(HEAD_ROWS):
            for x in range(56, 92):
                if h[ht + y, x, 3]: c[t + y, x] = h[ht + y, x]
                elif y < 12: c[t + y, x] = 0
    img = Image.fromarray(np.concatenate(cells, axis=1), 'RGBA')
    img = palette_lib.apply(img, palette_lib.load('assets/palette.png'))
    img.save(OUT); print(OUT, img.size)
