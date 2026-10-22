# Собирает общую палитру игры assets/palette.png (96 цветов) из фона лавки и спрайтов персонажей.
# Палитра нужна, чтобы картинки из разных генераций выглядели одной игрой: все ассеты переводятся на неё
# (tools/make_shop.py для лавки, tools/make_sprites.py с параметром "palette" для персонажей).
# Подбор: k-средние в пространстве Lab (tools/palette_lib.py), повторяемо. Насыщенные пиксели весят больше,
# пиксели персонажей ×60, чтобы их цвета (кожа, одежда) не потерялись среди фона.
# Запуск: python tools/make_palette.py   (нужны numpy, Pillow)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import palette_lib as P
COLORS = 96
bg = Image.open('assets/places/shop/source/shop_v2_original.webp').convert('RGB').resize((594, 270), Image.BOX)
bgp = np.asarray(bg).reshape(-1, 3)
sp = []
for f in ['andrey_idle.png', 'andrey_walk.png', 'mother_idle.png']:
    a = np.asarray(Image.open('assets/characters/' + f.split('_')[0] + '/' + f).convert('RGBA')).reshape(-1, 4)
    sp.append(a[a[:, 3] > 0][:, :3])
sp = np.concatenate(sp)
rgb = np.concatenate([bgp, sp])
lab = P.rgb_to_lab(rgb); chroma = np.hypot(lab[:, 1], lab[:, 2])
# вес: насыщенные пиксели важнее (редкие яркие цвета — пряности, окно, икона — получают свои места в палитре),
# пиксели персонажей ×60 (кожа и одежда не должны сереть)
w = (1 + chroma / 15) * np.concatenate([np.ones(len(bgp)), np.full(len(sp), 60.0)])
pal = P.build(rgb, w, COLORS)
P.swatch(pal, 'assets/palette.png')
with open('assets/palette.txt', 'w') as f:
    f.write('# Общая палитра «Летописей 1812» (' + str(len(pal)) + ' цветов, от тёмных к светлым). Собирает tools/make_palette.py.\n')
    f.write(' '.join('#%02X%02X%02X' % tuple(int(v) for v in c) for c in pal) + '\n')
print('Готово: assets/palette.png и assets/palette.txt,', len(pal), 'цветов')
