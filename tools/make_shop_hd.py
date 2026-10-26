# Собирает слои лавки в высоком разрешении (HD) из того же исходника, что и tools/make_shop.py:
#   assets/places/shop/shop_hd.png         — фон 1782×810 (в 3 раза крупнее сетки, 594×270), без перевода на палитру;
#   assets/places/shop/shop_counter_hd.png — передняя часть прилавка, тот же прямоугольник COUNTER × 3;
#   assets/places/shop/shop_front_hd.png   — передние ящики по тому же силуэту SILHOUETTE × 3.
# Игра рисует их вместо обычных слоёв, сглаживая под размер окна; персонажи остаются пиксельными на сетке 480×270.
# Запуск (нужен Pillow): python tools/make_shop_hd.py
from PIL import Image, ImageDraw
COUNTER = (202, 142, 202 + 328, 142 + 62)          # как в tools/make_shop.py
SILHOUETTE = [(470, 270), (470, 244), (482, 244), (482, 228), (500, 228), (500, 213), (522, 213), (522, 189), (531, 189), (532, 186), (534, 183), (537, 180), (542, 178), (552, 177), (554, 174), (556, 171), (570, 170), (578, 168), (579, 164), (594, 162), (594, 270)]   # как в tools/make_shop.py
SRC, K = 'assets/places/shop/source/shop_v2_original.webp', 3
bg = Image.open(SRC).convert('RGB').resize((594 * K, 270 * K), Image.LANCZOS).convert('RGBA')
bg.convert('RGB').save('assets/places/shop/shop_hd.png')
box = tuple(v * K for v in COUNTER)
counter = Image.new('RGBA', bg.size, (0, 0, 0, 0)); counter.paste(bg.crop(box), box[:2])
counter.save('assets/places/shop/shop_counter_hd.png')
mask = Image.new('L', bg.size, 0)
ImageDraw.Draw(mask).polygon([(x * K, y * K) for x, y in SILHOUETTE], fill=255)
front = Image.new('RGBA', bg.size, (0, 0, 0, 0)); front.paste(bg, (0, 0), mask)
front.save('assets/places/shop/shop_front_hd.png')
print('Готово: shop_hd.png, shop_counter_hd.png, shop_front_hd.png')
