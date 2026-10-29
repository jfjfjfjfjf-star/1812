# Мать за делом: 8 кадров PixelLab (animate_image_pixminimax по mother_idle.png, 22.10.2026) — перебирает крупу в миске.
# Исходники как есть: assets/characters/mother/source/pixellab/mother_work_pixellab_raw_01…08.png.
# Стабилизация (выбор Кирилла): голова (строки 0–37) и юбка с фартуком (строки 74 и ниже) во всех кадрах — из кадра 1,
# иначе в кадрах 4–6 нейросеть меняла всю фигуру и она «дышала». Двигаются только руки, миска и плечи.
# Запуск: python tools/make_mother_work.py -> assets/characters/mother/mother_work.png (1152×120, 8 кадров)
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette_lib

SRC = 'assets/characters/mother/source/pixellab/mother_work_pixellab_raw_%02d.png'
OUT = 'assets/characters/mother/mother_work.png'
HEAD, SKIRT = 38, 74

if __name__ == '__main__':
    fr = [np.asarray(Image.open(SRC % i).convert('RGBA')).copy() for i in range(1, 9)]
    for f in fr[1:]:
        f[:HEAD] = fr[0][:HEAD]; f[SKIRT:] = fr[0][SKIRT:]
    img = Image.fromarray(np.concatenate(fr, axis=1), 'RGBA')
    img = palette_lib.apply(img, palette_lib.load('assets/palette.png'))
    img.save(OUT); print(OUT, img.size)
