# Собирает слои лавки из исходника фона assets/source/shop_v2_original.webp (1860×845) в общей палитре игры:
#   assets/backgrounds/shop.png         — фон 594×270 (уменьшение целиком, по площади), переведён на assets/palette.png;
#   assets/backgrounds/shop_counter.png — передняя часть прилавка (прямоугольник COUNTER), точная копия пикселей фона;
#   assets/backgrounds/shop_front.png   — передние ящики справа по силуэту SILHOUETTE, точная копия пикселей фона.
# Силуэт ящиков обведён вручную по контурам ящиков и мешков (пол и дверь не входят). Если фон поменяется, обвести заново.
# Запуск (нужны numpy и Pillow): python tools/make_shop.py   (сначала палитра: python tools/make_palette.py)
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette_lib
from PIL import Image, ImageDraw
SRC, PALETTE = 'assets/source/shop_v2_original.webp', 'assets/palette.png'
COUNTER = (202, 142, 202 + 328, 142 + 62)          # x0, y0, x1, y1 — как ART.counterFront.rect в data.js
SILHOUETTE = [(470, 270), (470, 244), (482, 244), (482, 228), (500, 228), (500, 213), (522, 213), (522, 189), (531, 189), (532, 186), (534, 183), (537, 180), (542, 178), (552, 177), (554, 174), (556, 171), (570, 170), (578, 168), (579, 164), (594, 162), (594, 270)]
bg = Image.open(SRC).convert('RGB').resize((594, 270), Image.BOX)
bg = palette_lib.apply(bg, palette_lib.load(PALETTE)).convert('RGBA')
bg.convert('RGB').save('assets/backgrounds/shop.png')
counter = Image.new('RGBA', bg.size, (0, 0, 0, 0)); counter.paste(bg.crop(COUNTER), COUNTER[:2])
counter.save('assets/backgrounds/shop_counter.png')
mask = Image.new('L', bg.size, 0)
ImageDraw.Draw(mask).polygon(SILHOUETTE, fill=255)
front = Image.new('RGBA', bg.size, (0, 0, 0, 0))
front.paste(bg, (0, 0), mask)
front.save('assets/backgrounds/shop_front.png')
print('Готово: shop.png, shop_counter.png, shop_front.png')
