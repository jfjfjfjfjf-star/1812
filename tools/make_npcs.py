# Типовые NPC (26.10.2026): нарезка листа PixelLab и варианты цвета одежды, волос и кожи.
# Исходник: assets/characters/npc/source/pixellab/npc_sheet_01.png (256×256, 10 фигур в два ряда, create_image_pro_flash
# с образцом стиля andrey_idle.png, 9 генераций). Каждая фигура ставится в ячейку 144×120 с опорой стоп (72, 114),
# как у Андрея, лицом вправо.
# Варианты: области (одежда, платок, волосы, кожа) находятся «заливкой» от точек-зёрен по похожему цвету
# (оттенок в Lab близок к зерну, светлота в пределах), затем перекрашиваются: у области меняется оттенок и насыщенность,
# светлота (тени и блики) сохраняется. Кожа и волосы ищутся по цвету во всей фигуре (лицо и кисти — отдельные пятна).
# Результат переводится на общую палитру игры.
# Запуск: python tools/make_npcs.py -> assets/characters/npc/<тип>_<n>.png (144×120); --debug — листы-образцы в tools/out/
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette_lib

SHEET = 'assets/characters/npc/source/pixellab/npc_sheet_01.png'
OUT = 'assets/characters/npc'
SNAP = '--palette' in sys.argv   # общая палитра лавки (96 цветов) глушит красный и зелёный NPC, поэтому по умолчанию выключено
CELL_W, CELL_H, ANCHOR_X, FLOOR_Y = 144, 120, 72, 114

def lab_to_rgb(lab):
    L, a, b = lab[:, 0], lab[:, 1], lab[:, 2]
    fy = (L + 16) / 116; fx = fy + a / 500; fz = fy - b / 200
    f = np.stack([fx, fy, fz], 1)
    xyz = np.where(f > 0.2069, f ** 3, (f - 16 / 116) / 7.787) * np.array([0.95047, 1.0, 1.08883])
    m = np.linalg.inv(np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]))
    c = np.clip(xyz @ m.T, 0, 1)
    c = np.where(c > 0.0031308, 1.055 * c ** (1 / 2.4) - 0.055, 12.92 * c)
    return np.clip(np.round(c * 255), 0, 255).astype(np.uint8)

# Цвета-цели: (оттенок в градусах Lab, насыщенность-хрома). Светлота берётся от исходного пикселя (со сдвигом dl).
C = {
    'red': (35, 38), 'brick': (45, 30), 'blue': (275, 26), 'navy': (280, 18), 'green': (150, 22), 'olive': (100, 20),
    'ochre': (75, 32), 'brown': (60, 22), 'plum': (340, 20), 'grey': (80, 4), 'lin': (85, 8), 'sky': (250, 14),
}
# Волосы: (оттенок, хрома, сдвиг светлоты)
HAIR = {'brown': (60, 20, 0), 'dark': (55, 10, -14), 'blond': (80, 26, 14), 'red': (50, 36, 2), 'black': (60, 4, -22), 'grey': (80, 3, 18)}
# Кожа: (сдвиг светлоты, множитель хромы)
SKIN = {'base': (0, 1.0), 'pale': (5, 0.8), 'ruddy': (-2, 1.2), 'tan': (-7, 1.1)}

# Фигуры листа: id, ряд, столбцы x0..x1, области {имя: [зёрна (x, y) на листе]}, допуски, варианты.
# Вариант: {область: цвет из C | волосы из HAIR | кожа из SKIN}. Вариант 0 — как нарисовано.
FIG = [
    dict(id='girl_young', name='девушка', row=0, x=(10, 36),
         parts={'dress': dict(seeds=[(22, 100), (20, 80)], y=(68, 120)), 'hair': dict(seeds=[(14, 60), (16, 45)], y=(30, 82), ab=9, l=14)},
         vars=[{}, {'dress': 'blue', 'hair': 'blond', 'skin': 'pale'}, {'dress': 'green', 'hair': 'dark'},
               {'dress': 'ochre', 'hair': 'red', 'skin': 'ruddy'}, {'dress': 'plum', 'hair': 'brown', 'skin': 'tan'}]),
    dict(id='woman', name='женщина', row=0, x=(54, 82),
         parts={'dress': dict(seeds=[(67, 100)], y=(72, 120)), 'shawl': dict(seeds=[(62, 62)], y=(46, 86)), 'scarf': dict(seeds=[(68, 36)], y=(28, 50), ab=14)},
         vars=[{}, {'dress': 'red', 'shawl': 'grey', 'scarf': 'green'}, {'dress': 'brown', 'shawl': 'olive', 'scarf': 'red', 'skin': 'ruddy'},
               {'dress': 'green', 'shawl': 'brown', 'scarf': 'ochre', 'skin': 'pale'}, {'dress': 'plum', 'shawl': 'navy', 'scarf': 'sky', 'skin': 'tan'}]),
    dict(id='boy', name='мальчик', row=0, x=(112, 130),
         parts={'shirt': dict(seeds=[(120, 75)], y=(58, 96), l=16), 'pants': dict(seeds=[(117, 100)], y=(92, 108), l=14), 'hair': dict(seeds=[(119, 51)], y=(46, 62), l=16)},
         vars=[{}, {'shirt': 'sky', 'hair': 'blond'}, {'shirt': 'red', 'pants': 'navy', 'hair': 'dark', 'skin': 'tan'},
               {'shirt': 'ochre', 'hair': 'red', 'skin': 'ruddy'}]),
    dict(id='girl_child', name='девочка', row=0, x=(155, 174),
         parts={'dress': dict(seeds=[(162, 105)], y=(78, 118)), 'scarf': dict(seeds=[(160, 68)], y=(60, 80), ab=14)},
         vars=[{}, {'dress': 'sky', 'scarf': 'blue'}, {'dress': 'brick', 'scarf': 'ochre', 'skin': 'tan'}, {'dress': 'green', 'scarf': 'lin', 'skin': 'pale'}]),
    dict(id='old_woman', name='старуха', row=0, x=(196, 236),
         parts={'jacket': dict(seeds=[(212, 65)], y=(52, 92)), 'skirt': dict(seeds=[(210, 105)], y=(88, 120), l=14), 'scarf': dict(seeds=[(225, 50)], y=(44, 72), l=12)},
         vars=[{}, {'jacket': 'navy', 'skirt': 'brown', 'scarf': 'grey'}, {'jacket': 'olive', 'skirt': 'navy', 'scarf': 'brick'},
               {'jacket': 'plum', 'skirt': 'grey', 'scarf': 'brown', 'skin': 'tan'}]),
    dict(id='old_man', name='старик', row=1, x=(7, 40),
         parts={'coat': dict(seeds=[(20, 200)], y=(158, 228)), 'hat': dict(seeds=[(25, 146)], y=(140, 156))},
         vars=[{}, {'coat': 'brown', 'hat': 'brown'}, {'coat': 'navy', 'hat': 'grey', 'skin': 'ruddy'}, {'coat': 'olive', 'hat': 'olive', 'skin': 'tan'}]),
    dict(id='soldier', name='солдат', row=1, x=(59, 82),
         parts={},   # мундир по форме, волосы под кивером: меняется только кожа
         vars=[{}, {'skin': 'tan'}, {'skin': 'ruddy'}, {'skin': 'pale'}]),
    dict(id='merchant', name='купец', row=1, x=(108, 133),
         parts={'coat': dict(seeds=[(120, 200)], y=(158, 228)), 'hat': dict(seeds=[(122, 146)], y=(140, 154)), 'hair': dict(seeds=[(127, 163)], y=(150, 180), l=14)},
         vars=[{}, {'coat': 'navy', 'hat': 'navy', 'hair': 'dark'}, {'coat': 'green', 'hat': 'brown', 'hair': 'red', 'skin': 'ruddy'},
               {'coat': 'grey', 'hat': 'grey', 'hair': 'grey', 'skin': 'pale'}, {'coat': 'plum', 'hat': 'brown', 'hair': 'black', 'skin': 'tan'}]),
    dict(id='peasant', name='мужик', row=1, x=(162, 180),
         parts={'shirt': dict(seeds=[(170, 175)], y=(158, 200), l=16), 'pants': dict(seeds=[(170, 207)], y=(196, 216), l=14), 'hair': dict(seeds=[(171, 150), (178, 162)], y=(140, 172), l=14)},
         vars=[{}, {'shirt': 'red', 'hair': 'blond'}, {'shirt': 'sky', 'pants': 'navy', 'hair': 'dark', 'skin': 'tan'},
               {'shirt': 'ochre', 'pants': 'olive', 'hair': 'red', 'skin': 'ruddy'}, {'shirt': 'lin', 'hair': 'black', 'skin': 'pale'}]),
    dict(id='priest', name='священник', row=1, x=(204, 233),
         parts={},   # борода того же чёрного, что ряса: волосы не перекрашиваются
         vars=[{}, {'skin': 'pale'}, {'skin': 'ruddy'}]),
]

def grow(lab, mask, seeds, tol_ab=11, tol_l=26, ylim=None):
    """Заливка от зёрен: эталон — медиана цвета в квадрате 5×5 вокруг зёрен; соседний пиксель (8 соседей) берётся,
    если его оттенок (a, b) близок к эталону и светлота в пределах. ylim — допустимые строки (в координатах фигуры)."""
    h, w = mask.shape
    box = np.array([lab[yy, xx] for x, y in seeds for yy in range(max(0, y - 2), min(h, y + 3))
                    for xx in range(max(0, x - 2), min(w, x + 3)) if mask[yy, xx]])
    ref = np.median(box, 0)
    ok = mask & (np.hypot(lab[..., 1] - ref[1], lab[..., 2] - ref[2]) < tol_ab) & (np.abs(lab[..., 0] - ref[0]) < tol_l)
    if ylim: ok[:ylim[0]] = False; ok[ylim[1]:] = False
    out = np.zeros_like(mask)
    stack = [(yy, xx) for x, y in seeds for yy in range(max(0, y - 2), min(h, y + 3)) for xx in range(max(0, x - 2), min(w, x + 3)) if ok[yy, xx]]
    for y, x in stack: out[y, x] = True
    while stack:
        y, x = stack.pop()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and ok[yy, xx] and not out[yy, xx]:
                    out[yy, xx] = True; stack.append((yy, xx))
    return out

def similar(lab, mask, seed, tol_ab=7, tol_l=14, ylim=None):
    """Все пиксели фигуры, похожие на эталон (медиана 3×3 вокруг зерна), без требования связности: лицо и кисти."""
    x, y = seed; h, w = mask.shape
    s = np.median([lab[yy, xx] for yy in range(max(0, y - 1), min(h, y + 2)) for xx in range(max(0, x - 1), min(w, x + 2)) if mask[yy, xx]], 0)
    r = mask & (np.hypot(lab[..., 1] - s[1], lab[..., 2] - s[2]) < tol_ab) & (np.abs(lab[..., 0] - s[0]) < tol_l)
    if ylim: r[:ylim[0]] = False; r[ylim[1]:] = False
    return r

def skin_mask(lab, mask):
    """Кожа: эталон — медиана тёплых светлых пикселей в верхней четверти фигуры (лицо); дальше — все похожие пиксели (лицо, кисти)."""
    ys = np.where(mask.any(1))[0]; top = ys[0] + (ys[-1] - ys[0]) // 4
    L = lab[..., 0]; c = np.hypot(lab[..., 1], lab[..., 2]); hue = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    cand = mask & (L > 52) & (L < 88) & (c > 14) & (c < 42) & (hue > 40) & (hue < 80)
    cand[top:] = False
    if cand.sum() < 4: return np.zeros_like(mask)
    ref = np.median(lab[cand], 0)
    return mask & (c > 10) & (np.hypot(lab[..., 1] - ref[1], lab[..., 2] - ref[2]) < 10) & (np.abs(L - ref[0]) < 16)

def recolor(lab, sel, hue, chroma, dl=0.0):
    out = lab.copy(); L = lab[sel, 0]
    t = np.radians(hue); c = np.hypot(lab[sel, 1], lab[sel, 2])
    # хрома цели с небольшим разбросом от исходной (тени темнее и глуше)
    k = chroma * np.clip(0.55 + L / 120, 0.4, 1.2) * np.clip((100 - L) / 30, 0.3, 1)   # светлое (белёное полотно) — глуше
    out[sel, 0] = np.clip(L + dl, 2, 98); out[sel, 1] = k * np.cos(t); out[sel, 2] = k * np.sin(t)
    return out

# Разный рост: у каждого варианта своя прибавка (пиксели, + выше, − ниже). Строки добавляются (повтором) или убираются
# равномерно в полосе ног и подола (BAND — доля роста сверху), лицо, руки и подол с узором не трогаются — пиксели остаются чёткими.
HEIGHT = {'adult': [0, 5, -5, 9, -8], 'child': [0, 4, -5, 7], 'old': [0, -4, 4, -7]}
KIND = {'boy': 'child', 'girl_child': 'child', 'old_woman': 'old', 'old_man': 'old'}
BAND = (0.6, 0.86)

def stretch(fig, d):
    """fig — фигура (строки сверху вниз, обрезана по росту); d — на сколько строк выше (<0 — ниже)."""
    if not d: return fig
    h = fig.shape[0]; a, b = int(h * BAND[0]), int(h * BAND[1])
    rows = np.round(np.linspace(a, b, abs(d) + 2)[1:-1]).astype(int)
    if d > 0: return np.insert(fig, rows, fig[rows], axis=0)
    return np.delete(fig, rows, axis=0)

# Кадры покоя (дыхание и разговор) правкой пикселей, без генераций. Лист 4 кадра в ряд (576×120):
#   0 — как есть; 1 — вдох: всё выше пояса (BREATH доли роста) на 1 пиксель выше; 2 — рот приоткрыт; 3 — вдох и рот.
# Рот: строка на MOUTH доли роста ниже кончика носа (самая правая точка кожи в верхней пятой части фигуры), два пикселя у переднего края
# лица темнеют до цвета контура. У бородатых рот приходится на бороду — так и задумано (движется борода).
BREATH, MOUTH = 0.42, 3

def idle_frames(cell):
    a = cell[..., 3] > 0; ys = np.where(a.any(1))[0]; top, bot = ys[0], ys[-1]; H = bot - top + 1
    lab = palette_lib.rgb_to_lab(cell[..., :3].reshape(-1, 3)).reshape(cell.shape[0], cell.shape[1], 3)
    skin = skin_mask(lab, a); skin[top + H // 5:] = False; skin[:top] = False
    breath = cell.copy(); waist = top + int(H * BREATH)
    breath[top - 1: waist] = cell[top: waist + 1]
    def mouth(c, dy):                                   # dy — на сколько поднята голова в этом кадре
        c = c.copy()
        if not skin.any(): return c
        yy, xx = np.where(skin); i = xx.argmax(); row = yy[i] + MOUTH - dy
        xs = np.where(c[row, :, 3] > 0)[0]
        if not len(xs): return c
        dark = cell[a][lab[a][:, 0].argmin(), :3]
        for x in (xs[-1] - 1, xs[-1] - 2): c[row, x, :3] = dark
        return c
    return np.concatenate([cell, breath, mouth(cell, 0), mouth(breath, 1)], axis=1)

def figure_cells(sheet):
    for f in FIG:
        y0 = f['row'] * 128; x0, x1 = f['x']
        crop = sheet[y0:y0 + 128, x0:x1 + 1].copy()
        yield f, crop, x0, y0

def build(debug=False):
    sheet = np.asarray(Image.open(SHEET).convert('RGBA'))
    pal = palette_lib.load('assets/palette.png')
    os.makedirs(OUT, exist_ok=True)
    made, dbg = [], []
    for f, crop, x0, y0 in figure_cells(sheet):
        m = crop[..., 3] > 0; h, w = m.shape
        lab = palette_lib.rgb_to_lab(crop[..., :3].reshape(-1, 3)).reshape(h, w, 3)
        loc = lambda pts: [(x - x0, y - y0) for x, y in pts]
        part = lambda s: s if isinstance(s, dict) else {'seeds': s}
        masks = {}
        for p, s in f['parts'].items():
            s = part(s); yl = s.get('y'); yl = (yl[0] - y0, yl[1] - y0) if yl else None
            masks[p] = grow(lab, m, loc(s['seeds']), s.get('ab', 11), s.get('l', 26), yl)
        masks['skin'] = skin_mask(lab, m)
        for p in masks:
            if p != 'skin': masks['skin'] &= ~masks[p]
        ys = np.where(m.any(1))[0]; xs = np.where(m.any(0))[0]
        feet = ys[-1]
        for vi, var in enumerate(f['vars']):
            v = lab.copy()
            for part, col in var.items():
                sel = masks[part]
                if part == 'skin':
                    dl, kc = SKIN[col]; v[sel, 0] += dl; v[sel, 1:] *= kc
                elif part == 'hair':
                    hh, cc, dl = HAIR[col]; v = recolor(v, sel, hh, cc, dl)
                else:
                    hh, cc = C[col]; v = recolor(v, sel, hh, cc)
            rgb = crop[..., :3].copy()
            if var: rgb[m] = lab_to_rgb(v[m])
            img = np.zeros((CELL_H, CELL_W, 4), np.uint8)
            fig = np.dstack([rgb, crop[..., 3]])[ys[0]: feet + 1]
            hs = HEIGHT[KIND.get(f['id'], 'adult')]
            fig = stretch(fig, hs[vi % len(hs)])
            fh = fig.shape[0]
            cx = (xs[0] + xs[-1]) // 2                        # середина фигуры — на опору, стопы — на FLOOR_Y
            dx, top = ANCHOR_X - cx, FLOOR_Y + 1 - fh
            img[max(0, top): FLOOR_Y + 1, dx: dx + w] = fig[max(0, -top):]
            im = Image.fromarray(idle_frames(img), 'RGBA')
            if SNAP: im = palette_lib.apply(im, pal)
            path = '%s/%s_%d.png' % (OUT, f['id'], vi + 1)
            im.save(path); made.append(path); dbg.append(im)
        if debug:
            vis = np.full((h, w * (len(masks) + 1), 3), 190, np.uint8)
            vis[:, :w][m] = crop[..., :3][m]
            for i, (p, mk) in enumerate(masks.items()):
                t = np.full((h, w, 3), 190, np.uint8); t[m] = crop[..., :3][m] // 3; t[mk] = (255, 40, 200)
                vis[:, w * (i + 1): w * (i + 2)] = t
            os.makedirs('tools/out', exist_ok=True)
            Image.fromarray(vis).resize((vis.shape[1] * 3, h * 3), Image.NEAREST).save('tools/out/npc_mask_%s.png' % f['id'])
    if debug:
        cols = 10; rows = (len(dbg) + cols - 1) // cols
        sh = Image.new('RGBA', (cols * 72, rows * 112), (200, 200, 200, 255))
        for i, im in enumerate(dbg): sh.alpha_composite(im.crop((36, 0, 108, 112)), ((i % cols) * 72, (i // cols) * 112))
        sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST).save('tools/out/npc_variants.png')
    return made

if __name__ == '__main__':
    print('\n'.join(build('--debug' in sys.argv)))
