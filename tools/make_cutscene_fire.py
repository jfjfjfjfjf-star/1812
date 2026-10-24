# Картинки сцены «Пожар Москвы» из исходников PixelLab (assets/cutscenes/fire/source):
# слои города — чёрный силуэт на светлом фоне → маска 760×270 (альфа 0/255); огонь и фигуры — в палитру игры.
# Запуск из корня репозитория: python3 tools/make_cutscene_fire.py
import sys; from PIL import Image; import numpy as np; from scipy import ndimage
src, out = (sys.argv[1:3] if len(sys.argv) > 2 else ('assets/cutscenes/fire/source', 'assets/cutscenes/fire'))
def mask(path): return np.array(Image.open(path).convert('L')) < 128
def save(m, name):
    a = np.zeros((270, 760, 4), np.uint8); a[m, 3] = 255; Image.fromarray(a).save(f'{out}/{name}')
    ys = np.where(m.any(1))[0]; print(name, 'top', ys.min(), 'px', m.sum())
# дальний город: 140 строк, низ на y = 220 (ниже всё равно закрыт средним планом)
f = mask(f'{src}/far.png'); m = np.zeros((270, 760), bool); m[80:220] = f; m[220:] = True; save(m, 'fire_far.png')
# Китай-город: 100 строк, низ на y = 248, под ним сплошная земля
f = mask(f'{src}/mid.png'); m = np.zeros((270, 760), bool); m[148:248] = f; m[248:] = True; save(m, 'fire_mid.png')
# улица: 100 строк, низ кадра; в заборе широкий проход для Андрея и матери (x ≈ 290–395), по краям столбики ворот
f = mask(f'{src}/near.png'); f[:95, 290:395] = False
for x in (286, 395): f[52:95, x:x + 4] = True
m = np.zeros((270, 760), bool); m[170:270] = f; save(m, 'fire_near.png')
# Спасская башня: PixelLab нарисовал звезду (её поставили в 1935 году) — вместо неё двуглавый орёл, как в 1812-м
im = Image.open(f'{out}/fire_far.png'); a = np.array(im); a[80:89, 150:175, 3] = 0
for y, x0, x1 in ((81, 160, 162), (81, 164, 166), (82, 159, 167), (83, 160, 166), (84, 161, 165)): a[y, x0:x1, 3] = 255
a[85:89, 162:164, 3] = 255; Image.fromarray(a).save(f'{out}/fire_far.png')
# Огонь: 8 кадров анимации PixelLab (32×48) в один лист 256×48, цвета приведены к палитре игры
sys.path.insert(0, 'tools'); import palette_lib as P
pal = P.load('assets/palette.png')
sheet = Image.new('RGBA', (256, 48))
for i in range(8): sheet.alpha_composite(Image.open(f'{src}/fl_{i + 1}.png').convert('RGBA'), (i * 32, 0))
a = np.array(sheet); a[..., 3] = np.where(a[..., 3] > 110, 255, 0)
q = np.array(P.apply(Image.fromarray(a), pal).convert('RGBA')); q[..., 3] = a[..., 3]
Image.fromarray(q).save(f'{out}/flame.png'); print('flame.png', len(np.unique(q[q[..., 3] > 0][:, :3], axis=0)), 'цветов')
# Андрей и мать со спины (PixelLab): в ячейку 144×120 как их спрайты, подошвы в строке 113, рост как в игре (104 и 96)
for name, h in (('andrey_back', 104), ('mother_back', 96)):
    im = Image.open(f'{src}/{name}.png').convert('RGBA'); im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 110 else 0).getbbox())
    w = round(im.width * h / im.height); im = im.resize((w, h), Image.NEAREST)
    a = np.array(im); a[..., 3] = np.where(a[..., 3] > 110, 255, 0); im = P.apply(Image.fromarray(a), pal)
    cell = Image.new('RGBA', (144, 120)); cell.alpha_composite(im, (72 - w // 2, 114 - h)); cell.save(f'{out}/{name}.png'); print(name, w, 'x', h)
# Китай-город: окна и арки (дыры внутри домов, не связанные с небом) — отдельный слой окон, сам силуэт без дыр.
# Тогда сквозь окна не просвечивает дальний план, а в пожаре они загораются отсветом.
m = np.array(Image.open(f'{out}/fire_mid.png'))[..., 3] > 0
lab, _ = ndimage.label(~m); sky = set(np.unique(lab[0])) - {0}
holes = (~m) & ~np.isin(lab, list(sky))
for arr, name in ((m | holes, 'fire_mid.png'), (holes, 'fire_mid_win.png')):
    a = np.zeros((270, 760, 4), np.uint8); a[arr, 3] = 255; Image.fromarray(a).save(f'{out}/{name}')
print('окна', holes.sum())
