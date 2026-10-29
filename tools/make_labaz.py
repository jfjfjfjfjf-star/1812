# Собирает слои лабаза Сорокина из исходника фона assets/places/labaz/source/labaz_original.webp (1860×845, ChatGPT,
# 22.10.2026, по промту «Л» из docs/GPT_PROMPTS.md) в общей палитре игры — так же, как tools/make_shop.py для лавки:
#   assets/places/labaz/labaz.png       — фон 594×270 (уменьшение целиком, по площади), в палитре assets/palette.png;
#   assets/places/labaz/labaz_front.png — передний план по силуэтам LEFT (бочки и ящики у ворот) и RIGHT (мешки и ящик
#                                         справа), точная копия пикселей фона: персонажи проходят ЗА ними.
# Силуэты обведены вручную по контурам предметов (пол не входит). Если фон поменяется, обвести заново.
# Запуск: python tools/make_labaz.py
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette_lib
from PIL import Image, ImageDraw
SRC, PALETTE = 'assets/places/labaz/source/labaz_original.webp', 'assets/palette.png'
LEFT = [(0, 147), (40, 147), (40, 198), (70, 198), (70, 206), (84, 206), (84, 224), (114, 224), (115, 270), (0, 270)]
RIGHT = [(496, 270), (498, 245), (501, 228), (506, 212), (513, 204), (525, 201), (538, 203), (541, 196), (546, 183),
         (552, 174), (565, 169), (580, 167), (594, 163), (594, 270)]
bg = Image.open(SRC).convert('RGB').resize((594, 270), Image.BOX)
bg = palette_lib.apply(bg, palette_lib.load(PALETTE)).convert('RGBA')
bg.convert('RGB').save('assets/places/labaz/labaz.png')
mask = Image.new('L', bg.size, 0); d = ImageDraw.Draw(mask)
d.polygon(LEFT, fill=255); d.polygon(RIGHT, fill=255)
front = Image.new('RGBA', bg.size, (0, 0, 0, 0)); front.paste(bg, (0, 0), mask)
front.save('assets/places/labaz/labaz_front.png')
print('Готово: labaz.png, labaz_front.png')
