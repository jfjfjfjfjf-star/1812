# Позы NPC из листов ChatGPT (26.10.2026, промты docs/NPC_POSES_PROMPTS.md): работники лабаза, купцы, покупатели лавки.
# Исходники: assets/characters/npc/source/gpt/poses_<лист>.png (белый фон, фигуры в ряд).
# Шаги: белый фон -> прозрачность (только светлые серые пиксели, связанные с краем); фигуры по промежуткам между столбцами;
# уменьшение одним масштабом на лист (по росту стоящего взрослого, SCALE_TO) с учётом прозрачности — без белой каймы;
# ячейка 144×120, опора (72, 114), лицом вправо. Пары кадров жеста (B — второй кадр той же позы) совмещаются с кадром A
# по нижней части фигуры, голова и низ берутся из A — меняется только рука.
# Варианты цвета, дыхание и рот — как у типовых NPC (make_npcs.py). Лист: 4 кадра покоя (как есть, вдох, рот, вдох и рот),
# у поз с жестом ещё 4 — те же со вторым жестом (576 или 1152 × 120).
# Запуск: python tools/make_npc_poses.py [--debug] -> assets/characters/npc/<поза>_<n>.png
import os, sys
from collections import deque
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette_lib
from make_npcs import grow, recolor, skin_mask, idle_frames, lab_to_rgb, C, HAIR, SKIN, CELL_W, CELL_H, ANCHOR_X, FLOOR_Y

SRC = 'assets/characters/npc/source/gpt/poses_%s.png'
OUT = 'assets/characters/npc'
# лист: (номер стоящего взрослого, его рост в игре)
SCALE_TO = {'workers': (5, 92), 'merchants': (0, 96), 'shop': (0, 90)}
# Позы: id, лист, номер фигуры, номер второго кадра жеста (или None), полоса руки (доли роста сверху) для жеста,
# области для перекраски (зёрна в долях ячейки фигуры: x, y от верха до низа фигуры; ylim — полоса строк, за которую область не заходит) и варианты.
POSES = [
    dict(id='w_sit_talk', name='работник сидит на мешке, рассказывает', sheet='workers', fig=0, alt=1, band=(0.22, 0.62),
         parts={'shirt': (0.45, 0.32), 'hair': (0.55, 0.05)}, vars=[{}, {'shirt': 'sky', 'hair': 'blond'}, {'shirt': 'ochre', 'hair': 'dark', 'skin': 'tan'}]),
    dict(id='w_sit_mug', name='работник сидит на ящике с кружкой', sheet='workers', fig=2,
         parts={'shirt': (0.3, 0.35)}, vars=[{}, {'shirt': 'red'}, {'shirt': 'lin', 'skin': 'ruddy'}]),
    dict(id='w_shovel', name='работник опирается на лопату', sheet='workers', fig=3,
         parts={'shirt': (0.25, 0.3), 'hair': (0.45, 0.04)}, vars=[{}, {'shirt': 'sky', 'hair': 'red'}, {'shirt': 'ochre', 'hair': 'black', 'skin': 'tan'}]),
    dict(id='w_sack', name='работник несёт мешок на плече', sheet='workers', fig=4,
         parts={'shirt': [(0.45, 0.45), (0.5, 0.33)]}, vars=[{}, {'shirt': 'red', 'skin': 'ruddy'}, {'shirt': 'lin', 'skin': 'tan'}]),
    dict(id='w_hips', name='работник руки в боки', sheet='workers', fig=5,
         parts={'shirt': (0.45, 0.33), 'hair': (0.45, 0.04)}, vars=[{}, {'shirt': 'sky', 'hair': 'blond'}, {'shirt': 'red', 'hair': 'dark', 'skin': 'tan'}]),
    dict(id='m_talk', name='купец говорит, жестикулирует', sheet='merchants', fig=0, alt=1, band=(0.22, 0.6),
         parts={'coat': (0.3, 0.75)}, vars=[{}, {'coat': 'brown'}, {'coat': 'green', 'skin': 'ruddy'}]),
    dict(id='m_listen', name='купец слушает, руки за спиной', sheet='merchants', fig=2,
         parts={'coat': [(0.35, 0.75), (0.4, 0.35)]}, ylim={'coat': (0.3, 1.0)}, vars=[{}, {'coat': 'navy'}, {'coat': 'grey', 'skin': 'pale'}]),
    dict(id='m_coins', name='купец на бочке считает монеты', sheet='merchants', fig=3,
         parts={'coat': (0.5, 0.45)}, ylim={'coat': (0.2, 0.92)}, vars=[{}, {'coat': 'navy'}, {'coat': 'plum', 'skin': 'tan'}]),
    dict(id='s_point', name='женщина с корзиной показывает на полку', sheet='shop', fig=0,
         parts={'dress': (0.45, 0.85), 'scarf': (0.45, 0.06)}, vars=[{}, {'dress': 'blue', 'scarf': 'red'}, {'dress': 'green', 'scarf': 'ochre', 'skin': 'pale'}]),
    dict(id='s_talk', name='девушка с корзиной разговаривает', sheet='shop', fig=1, alt=2, band=(0.25, 0.55),
         parts={'dress': (0.5, 0.88), 'scarf': (0.5, 0.05)}, vars=[{}, {'dress': 'blue', 'scarf': 'brick'}, {'dress': 'green', 'scarf': 'brick', 'skin': 'tan'}]),
    dict(id='s_listen', name='пожилая женщина слушает', sheet='shop', fig=3,
         parts={'skirt': (0.5, 0.85)}, vars=[{}, {'skirt': 'brown'}, {'skirt': 'navy', 'skin': 'pale'}]),
    dict(id='s_look', name='старик разглядывает товар', sheet='shop', fig=4,
         parts={'coat': (0.3, 0.7)}, vars=[{}, {'coat': 'brown'}, {'coat': 'olive', 'skin': 'ruddy'}]),
]

def cut(sheet):
    a = np.asarray(Image.open(SRC % sheet).convert('RGB')).astype(np.int16)
    light = (a.min(2) > 222) & ((a.max(2) - a.min(2)) < 22)
    h, w = light.shape; bg = np.zeros_like(light); q = deque()
    for x in range(w):
        for y in (0, h - 1): q.append((y, x))
    for y in range(h):
        for x in (0, w - 1): q.append((y, x))
    while q:                                          # фон — светлое, связанное с краем (белая рубаха внутри контура не пропадает)
        y, x = q.popleft()
        if 0 <= y < h and 0 <= x < w and light[y, x] and not bg[y, x]:
            bg[y, x] = True; q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    fg = ~bg; cols = np.where(fg.sum(0) > 2)[0]; segs = []; s = p = cols[0]
    for x in cols[1:]:
        if x > p + 6: segs.append((s, p)); s = x
        p = x
    segs.append((s, p)); segs = [g for g in segs if g[1] - g[0] > 15]
    figs = []
    for s, e in segs:
        sub = fg[:, s:e + 1]; ys = np.where(sub.sum(1) > 1)[0]
        figs.append((a[ys[0]:ys[-1] + 1, s:e + 1].astype(np.uint8), sub[ys[0]:ys[-1] + 1]))
    return figs

def shrink(rgb, mask, k):
    """Уменьшение с учётом прозрачности: цвет — среднее только по пикселям фигуры, видим, если фигура занимает больше половины."""
    h, w = mask.shape; nh, nw = max(1, round(h * k)), max(1, round(w * k))
    m = mask.astype(np.float32)
    rs = lambda ch: np.asarray(Image.fromarray(ch.astype(np.float32), 'F').resize((nw, nh), Image.BOX))
    am = rs(m); out = np.zeros((nh, nw, 4), np.uint8)
    for c in range(3): out[..., c] = np.clip(rs(rgb[..., c] * m) / np.maximum(am, 1e-6), 0, 255)
    out[..., 3] = np.where(am > 0.5, 255, 0)
    return out

def place(fig):
    cell = np.zeros((CELL_H, CELL_W, 4), np.uint8); h, w = fig.shape[:2]
    ys = np.where((fig[..., 3] > 0).any(1))[0]; fig = fig[:ys[-1] + 1]; h = fig.shape[0]
    xs = np.where((fig[..., 3] > 0).any(0))[0]; dx = ANCHOR_X - (xs[0] + xs[-1]) // 2
    top = FLOOR_Y + 1 - h
    x0, x1 = max(0, dx), min(CELL_W, dx + w)
    cell[max(0, top): FLOOR_Y + 1, x0:x1] = fig[max(0, -top):, x0 - dx: x1 - dx]
    return cell

def align(a, b):
    """Сдвиг b по x, при котором нижняя половина силуэтов совпадает лучше всего (b нарисован отдельной фигурой листа)."""
    ys = np.where((a[..., 3] > 0).any(1))[0]; lo = ys[0] + (ys[-1] - ys[0]) // 2
    ma, best = a[lo:, :, 3] > 0, (1e9, 0)
    for d in range(-30, 31):
        mb = np.roll(b[lo:, :, 3] > 0, d, axis=1); best = min(best, ((ma ^ mb).sum(), d))
    return np.roll(b, best[1], axis=1)

def variant(cell, parts, var, ylim=None):
    m = cell[..., 3] > 0; h, w = m.shape
    lab = palette_lib.rgb_to_lab(cell[..., :3].reshape(-1, 3)).reshape(h, w, 3)
    ys = np.where(m.any(1))[0]; xs = np.where(m.any(0))[0]; top, H = ys[0], ys[-1] - ys[0] + 1
    masks = {}
    for p, pts in parts.items():                       # одно зерно (x, y) или список зёрен
        pts = [pts] if isinstance(pts[0], float) else pts
        seeds = [(xs[0] + int((xs[-1] - xs[0]) * fx), top + int(H * fy)) for fx, fy in pts]
        yl = (ylim or {}).get(p); yl = (top + int(H * yl[0]), top + int(H * yl[1])) if yl else None   # строки, дальше которых область не идёт
        masks[p] = grow(lab, m, seeds, 11, 26 if p != 'hair' else 14, yl)
    masks['skin'] = skin_mask(lab, m)
    for p in parts: masks['skin'] &= ~masks[p]
    v = lab.copy()
    for part, col in var.items():
        sel = masks[part]
        if part == 'skin': dl, kc = SKIN[col]; v[sel, 0] += dl; v[sel, 1:] *= kc
        elif part == 'hair': hh, cc, dl = HAIR[col]; v = recolor(v, sel, hh, cc, dl)
        else: hh, cc = C[col]; v = recolor(v, sel, hh, cc)
    out = cell.copy()
    if var: out[m, :3] = lab_to_rgb(v[m])
    return out, masks

def build(debug=False):
    sheets = {s: cut(s) for s in SCALE_TO}
    made, dbg = [], []
    for P in POSES:
        figs = sheets[P['sheet']]; ref, target = SCALE_TO[P['sheet']]
        k = target / figs[ref][0].shape[0]
        A = place(shrink(*figs[P['fig']], k))
        B = None
        if P.get('alt') is not None:
            B = align(A, place(shrink(*figs[P['alt']], k)))
            ys = np.where((A[..., 3] > 0).any(1))[0]; top, H = ys[0], ys[-1] - ys[0] + 1
            r0, r1 = top + int(H * P['band'][0]), top + int(H * P['band'][1])
            B[:r0] = A[:r0]; B[r1:] = A[r1:]                # голова и низ — из A, меняется только рука
        for vi, var in enumerate(P['vars']):
            a, masks = variant(A, P['parts'], var, P.get('ylim'))
            strip = [idle_frames(a)]
            if B is not None:
                b, _ = variant(B, P['parts'], var, P.get('ylim')); strip.append(idle_frames(b))
            img = Image.fromarray(np.concatenate(strip, axis=1), 'RGBA')
            path = '%s/%s_%d.png' % (OUT, P['id'], vi + 1); img.save(path); made.append(path)
            dbg.append(img)
            if debug and vi == 0:
                vis = np.full((CELL_H, CELL_W * (len(masks) + 1), 3), 190, np.uint8); mm = A[..., 3] > 0
                vis[:, :CELL_W][mm] = A[..., :3][mm]
                for i, mk in enumerate(masks.values()):
                    t = np.full((CELL_H, CELL_W, 3), 190, np.uint8); t[mm] = A[..., :3][mm] // 3; t[mk] = (255, 40, 200)
                    vis[:, CELL_W * (i + 1): CELL_W * (i + 2)] = t
                os.makedirs('tools/out', exist_ok=True)
                Image.fromarray(vis).resize((vis.shape[1] * 2, CELL_H * 2), Image.NEAREST).save('tools/out/pose_mask_%s.png' % P['id'])
    if debug:
        cols = 9; rows = (len(dbg) + cols - 1) // cols
        sh = Image.new('RGBA', (cols * 100, rows * 120), (200, 200, 200, 255))
        for i, im in enumerate(dbg): sh.alpha_composite(im.crop((22, 0, 122, 120)), ((i % cols) * 100, (i // cols) * 120))
        sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST).save('tools/out/pose_variants.png')
        g = [Image.open('%s/%s_1.png' % (OUT, P['id'])) for P in POSES if P.get('alt') is not None]
        gs = Image.new('RGBA', (2 * 144, 120 * len(g)), (200, 200, 200, 255))
        for i, im in enumerate(g): gs.alpha_composite(im.crop((0, 0, 144, 120)), (0, i * 120)); gs.alpha_composite(im.crop((576, 0, 720, 120)), (144, i * 120))
        gs.resize((gs.width * 2, gs.height * 2), Image.NEAREST).save('tools/out/pose_gestures.png')
    return made

if __name__ == '__main__':
    print('\n'.join(build('--debug' in sys.argv)))
