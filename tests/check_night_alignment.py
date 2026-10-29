# Проверяет, что ночной исходник лавки совпадает с дневным: предметы на тех же местах (иначе при смене дня и ночи они «прыгают»).
# Сравнивает контуры двух картинок, сдвигая ночную на ±4 пикселя; лучшее совпадение должно быть при сдвиге не больше 1 пикселя исходника
# (в игре исходник уменьшается в 3,13 раза, так что это треть игрового пикселя) — по всему кадру и по полосам.
# Запуск из папки проекта (нужны numpy и Pillow): python tests/check_night_alignment.py
import sys
import numpy as np
from PIL import Image
DAY, NIGHT = 'assets/places/shop/source/shop_v2_original.webp', 'assets/places/shop/source/shop_night_original.png'
day, night = Image.open(DAY).convert('L'), Image.open(NIGHT).convert('L')
if day.size != night.size:
    sys.exit('ОШИБКА: размеры разные: день %s, ночь %s' % (day.size, night.size))
def edges(im):
    a = np.asarray(im, dtype=float)
    a = (a - a.mean()) / (a.std() + 1e-6)                # ночь темнее: сравниваем форму, а не яркость
    e = np.abs(np.diff(a, axis=1))[:-1] + np.abs(np.diff(a, axis=0))[:, :-1]
    return e > np.percentile(e, 85)
ed, en = edges(day), edges(night)
failed = 0
W = ed.shape[1]
for name, x0, x1 in [('весь кадр', 0, W), ('левая треть', 0, W // 3), ('середина', W // 3, 2 * W // 3), ('правая треть', 2 * W // 3, W)]:
    best = max(((np.logical_and(ed[8:-8, x0 + 8:x1 - 8], np.roll(np.roll(en, dx, 1), dy, 0)[8:-8, x0 + 8:x1 - 8]).mean(), dx, dy)
                for dx in range(-4, 5) for dy in range(-4, 5)))
    ok = abs(best[1]) <= 1 and abs(best[2]) <= 1
    print(('ок   ' if ok else 'ОШИБКА ') + '%s: лучшее совпадение при сдвиге (%d, %d)' % (name, best[1], best[2]))
    failed += not ok
print('\nНе прошло проверок: %d' % failed if failed else '\nВсе проверки пройдены')
sys.exit(1 if failed else 0)
