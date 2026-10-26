# Собирает слои лавки в высоком разрешении (HD) из того же исходника, что и tools/make_shop.py:
#   assets/places/shop/shop_hd.png         — фон 1782×810 (в 3 раза крупнее сетки, 594×270), без перевода на палитру;
#   assets/places/shop/shop_counter_hd.png — передняя часть прилавка, тот же прямоугольник COUNTER × 3;
#   assets/places/shop/shop_front_hd.png   — передние ящики по тому же силуэту SILHOUETTE × 3;
#   то же с суффиксом _night — из ночного исходника shop_night_original.png (вечером игра рисует ночные слои).
# Игра рисует их вместо обычных слоёв, сглаживая под размер окна; персонажи остаются пиксельными на сетке 480×270.
# Запуск (нужен Pillow): python tools/make_shop_hd.py
from PIL import Image, ImageDraw
COUNTER = (202, 142, 202 + 328, 142 + 62)          # как в tools/make_shop.py
SILHOUETTE = [(470, 270), (470, 244), (482, 244), (482, 228), (500, 228), (500, 213), (522, 213), (522, 189), (531, 189), (532, 186), (534, 183), (537, 180), (542, 178), (552, 177), (554, 174), (556, 171), (570, 170), (578, 168), (579, 164), (594, 162), (594, 270)]   # как в tools/make_shop.py
K = 3
SOURCES = {'': 'assets/places/shop/source/shop_v2_original.webp',          # день (тот же исходник, что у shop.png)
           '_night': 'assets/places/shop/source/shop_night_original.png'}    # ночь: та же лавка от ChatGPT, совпадает с днём
for suffix, src in SOURCES.items():
    bg = Image.open(src).convert('RGB').resize((594 * K, 270 * K), Image.LANCZOS).convert('RGBA')
    bg.convert('RGB').save('assets/places/shop/shop%s_hd.png' % suffix)
    box = tuple(v * K for v in COUNTER)
    counter = Image.new('RGBA', bg.size, (0, 0, 0, 0)); counter.paste(bg.crop(box), box[:2])
    counter.save('assets/places/shop/shop_counter%s_hd.png' % suffix)
    mask = Image.new('L', bg.size, 0)
    ImageDraw.Draw(mask).polygon([(x * K, y * K) for x, y in SILHOUETTE], fill=255)
    front = Image.new('RGBA', bg.size, (0, 0, 0, 0)); front.paste(bg, (0, 0), mask)
    front.save('assets/places/shop/shop_front%s_hd.png' % suffix)
    print('Готово: shop%s_hd.png, shop_counter%s_hd.png, shop_front%s_hd.png' % (suffix, suffix, suffix))
