# Дела матери из кадров PixelLab (22.10.2026; исходники как есть — assets/characters/mother/source/pixellab/mother_<дело>_raw_01…08.png).
# Для каждого дела: какие кадры и в каком порядке, сдвиг всех кадров по x (если нейросеть сместила фигуру),
# стабилизация — строки головы и низа юбки во всех кадрах берутся из первого взятого кадра (мелкое мерцание генерации).
#   wipe — протирает: все 8 кадров, сдвиг +8 px (ступни на x 66–83, как у остальных), голова 0–37 и юбка от 78 из кадра 1.
#   bags — насыпает в мешочки: кадры 1–5 туда-обратно (1 2 3 4 5 4 3 2): в 6–8 нейросеть разворачивала её плечами
#          к зрителю и цикл не замыкался; голова 0–35 и юбка от 90 из кадра 1 (мешочек висит до ~85).
#   broom — метёт: не используется (веник неправильной формы, тело разворачивается, прутья ниже пола).
# Запуск: python tools/make_mother_acts.py -> assets/characters/mother/mother_wipe.png, mother_bags.png (1152×120)
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette_lib

SRC = 'assets/characters/mother/source/pixellab/mother_%s_raw_%02d.png'
ACTS = {
    'wipe': dict(order=[1, 2, 3, 4, 5, 6, 7, 8], shift=8, head=38, skirt=78),
    'bags': dict(order=[1, 2, 3, 4, 5, 4, 3, 2], shift=0, head=36, skirt=90),
}

def build(name, order, shift, head, skirt):
    raw = {i: np.asarray(Image.open(SRC % (name, i)).convert('RGBA')) for i in set(order)}
    base = raw[order[0]]
    cells = []
    for i in order:
        c = raw[i].copy(); c[:head] = base[:head]; c[skirt:] = base[skirt:]
        if shift: c = np.roll(c, shift, axis=1); c[:, :shift] = 0
        cells.append(c)
    img = Image.fromarray(np.concatenate(cells, axis=1), 'RGBA')
    img = palette_lib.apply(img, palette_lib.load('assets/palette.png'))
    out = 'assets/characters/mother/mother_%s.png' % name
    img.save(out); return out, img.size

if __name__ == '__main__':
    for name, cfg in ACTS.items(): print(*build(name, **cfg))
