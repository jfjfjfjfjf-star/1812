# Персонажи: портрет для диалога (180×204) и фигура в сцене (лист 4 кадра покоя 576×120) из генераций GPT на прозрачном фоне.
# Портрет: обрезка по контуру, уменьшение по площади до 180×204 (пропорции сохранены), прижат к низу и левому краю, общая палитра игры
#   (как tools/make_portrait.py). Фигура: обрезка по контуру, уменьшение по площади до роста FIG_H, опора стоп — (72, 114) в ячейке 144×120,
#   кадры покоя как у типовых NPC (tools/make_npcs.idle_frames: дыхание и рот). Палитра к фигуре не применяется, как у типовых NPC
#   (общая палитра глушит цвета). Запуск из корня проекта: python tools/make_character.py [id …]  (без аргументов — все из CHARS).
#   Исходники: assets/characters/<id>/source/<id>_figure_gpt.png и <id>_portrait_gpt.png на прозрачном фоне.
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette_lib, make_npcs

# рост фигуры в пикселях игры (Андрей 104; типовые взрослые около 90–100)
CHARS = {'tatiana': 92, 'pavel': 98, 'darya': 90, 'fedor': 96, 'traktirshchik': 100, 'neznakomets': 98, 'alexander': 104, 'liza': 94, 'liza_father': 98}
W, H = 180, 204
CELL_W, CELL_H, ANCHOR_X, FLOOR_Y = 144, 120, 72, 114

def crop_alpha(im):
    box = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(box)

def shrink(im, w, h):                      # уменьшение по площади с учётом прозрачности (без тёмной каймы)
    a = np.asarray(im).astype(np.float32); al = a[..., 3:] / 255
    pm = Image.fromarray((a[..., :3] * al).astype(np.float32).astype('float32')[..., 0]) if False else None
    chans = [np.asarray(Image.fromarray((a[..., c] * al[..., 0]).astype(np.float32)).resize((w, h), Image.BOX)) for c in range(3)]
    A = np.asarray(Image.fromarray(al[..., 0].astype(np.float32)).resize((w, h), Image.BOX))
    out = np.zeros((h, w, 4), np.float32)
    for c in range(3): out[..., c] = chans[c] / np.maximum(A, 1e-6)
    out[..., 3] = (A > 0.5) * 255
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')

def portrait(c):
    SRC, OUT = f'assets/characters/{c}/source/', f'assets/characters/{c}/'
    im = crop_alpha(Image.open(SRC + c + '_portrait_gpt.png').convert('RGBA'))
    k = min(W / im.width, H / im.height); w, h = round(im.width * k), round(im.height * k)
    img = palette_lib.apply(shrink(im, w, h), palette_lib.load('assets/palette.png'))
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0)); canvas.paste(img, (0, H - h))
    canvas.save(OUT + c + '_portrait.png'); print(c, 'портрет', (w, h), '->', canvas.size)

def figure(c):
    SRC, OUT = f'assets/characters/{c}/source/', f'assets/characters/{c}/'
    im = crop_alpha(Image.open(SRC + c + '_figure_gpt.png').convert('RGBA'))
    h = CHARS[c]; w = round(im.width * h / im.height)
    fig = shrink(im, w, h)
    # опора стоп — середина подола по ширине фигуры
    cell = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
    cell.paste(fig, (ANCHOR_X - w // 2, FLOOR_Y + 1 - h))
    sheet = make_npcs.idle_frames(np.asarray(cell))
    Image.fromarray(sheet).save(OUT + c + '_idle.png'); print(c, 'фигура', (w, h), '->', sheet.shape[1], 'x', sheet.shape[0])

if __name__ == '__main__':
    for c in sys.argv[1:] or CHARS:
        portrait(c); figure(c)
