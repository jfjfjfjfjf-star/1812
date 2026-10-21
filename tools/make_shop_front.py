# Собирает слой переднего плана лавки assets/backgrounds/shop_front.png из фона shop.png.
# Слой — точная копия пикселей фона внутри силуэта передних ящиков справа (лесенка ящиков и мешки перед дверью),
# всё остальное прозрачно. Поэтому Андрей и покупатели проходят ПОЗАДИ ящиков, а пол и дверь не перекрываются.
# Силуэт обведён вручную по контурам ящиков (координаты фона 396×180). Если фон поменяется, силуэт надо обвести заново.
# Запуск (нужен Python 3 и Pillow): python tools/make_shop_front.py
from PIL import Image, ImageDraw
SRC, OUT = 'assets/backgrounds/shop.png', 'assets/backgrounds/shop_front.png'
SILHOUETTE = [(313, 180), (313, 163), (321, 163), (321, 152), (333, 152), (333, 142), (348, 142), (348, 126), (354, 126),
              (355, 124), (356, 122), (358, 120), (361, 119), (368, 118), (369, 116), (371, 114), (380, 113), (385, 112),
              (386, 109), (396, 108), (396, 180)]
bg = Image.open(SRC).convert('RGBA')
assert bg.size == (396, 180), 'фон должен быть 396×180'
mask = Image.new('L', bg.size, 0)
ImageDraw.Draw(mask).polygon(SILHOUETTE, fill=255)
front = Image.new('RGBA', bg.size, (0, 0, 0, 0))
front.paste(bg, (0, 0), mask)
front.save(OUT)
print('Готово:', OUT)
