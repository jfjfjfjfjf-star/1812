# Собирает слой переднего плана лавки assets/backgrounds/shop_front.png из фона shop.png.
# Слой — точная копия пикселей фона внутри силуэта передних ящиков справа (лесенка ящиков и мешки перед дверью),
# всё остальное прозрачно. Поэтому Андрей и покупатели проходят ПОЗАДИ ящиков, а пол и дверь не перекрываются.
# Силуэт обведён вручную по контурам ящиков (координаты фона 594×270; для сетки 480×270 пересчитан из обводки 396×180 и проверен). Если фон поменяется, силуэт надо обвести заново.
# Запуск (нужен Python 3 и Pillow): python tools/make_shop_front.py
from PIL import Image, ImageDraw
SRC, OUT = 'assets/backgrounds/shop.png', 'assets/backgrounds/shop_front.png'
SILHOUETTE = [(470, 270), (470, 244), (482, 244), (482, 228), (500, 228), (500, 213), (522, 213), (522, 189), (531, 189), (532, 186), (534, 183), (537, 180), (542, 178), (552, 177), (554, 174), (556, 171), (570, 170), (578, 168), (579, 164), (594, 162), (594, 270)]
bg = Image.open(SRC).convert('RGBA')
assert bg.size == (594, 270), 'фон должен быть 594×270'
mask = Image.new('L', bg.size, 0)
ImageDraw.Draw(mask).polygon(SILHOUETTE, fill=255)
front = Image.new('RGBA', bg.size, (0, 0, 0, 0))
front.paste(bg, (0, 0), mask)
front.save(OUT)
print('Готово:', OUT)
