# Ходьба Андрея, 8 кадров, на основе кадра покоя: голова и корпус в каждом кадре — те же пиксели, что в andrey_idle.png,
# ноги в штанах, сапоги и руки рисуются в каждом кадре заново (по точкам суставов), без поворота и сдвига готовых кусков.
# Опорная стопа в кадрах опоры стоит на полу неподвижно: за кадр она уходит назад ровно на STEP пикселей, поэтому
# ANDREY.cycleDistance = 8 * STEP. Нужен Python 3, numpy, Pillow.
#   python tools/make_walk.py                 -> assets/characters/andrey_walk.png (1152×120)
#   python tools/make_walk.py preview.png     -> ещё и крупный лист для просмотра
import sys, math
import numpy as np
from PIL import Image

IDLE = 'assets/characters/andrey_idle.png'
OUT = 'assets/characters/andrey_walk.png'
CW, CH, SOLE = 144, 120, 113          # ячейка; нижняя строка подошв
HIP = (70.0, 63.0)                    # тазобедренный сустав (одинаковый для обеих ног в профиль)
THIGH, SHIN = 23.2, 23.2
SHOULDER = (69.5, 36.5)
UPPER, FORE = 15.0, 12.0
STEP = 10.0                           # пикселей пути за кадр (шаг ~40 px от пятки до пятки — обычный шаг при росте 104)

# цвета взяты из кадра покоя (общая палитра игры)
OUT_C = (25, 16, 13)
PANTS = [(66, 51, 41), (54, 44, 36), (45, 37, 33)]            # свет, середина, тень
PANTS_FAR = [(45, 37, 33), (38, 30, 26), (38, 27, 21)]
BOOT = [(119, 65, 32), (99, 55, 25), (87, 45, 21)]
BOOT_FAR = [(61, 38, 23), (59, 31, 15), (38, 27, 21)]
SHIRT = [(240, 221, 192), (240, 221, 192), (183, 156, 127)]
SHIRT_FAR = [(183, 156, 127), (183, 156, 127), (118, 90, 63)]
SKIN = [(238, 166, 118), (238, 166, 118), (169, 114, 81)]
SKIN_FAR = [(169, 114, 81), (169, 114, 81), (118, 90, 63)]

def rot(p, a):                        # a > 0 — носок вверх (экранные координаты, y вниз)
    c, s = math.cos(a), math.sin(a)
    return (p[0] * c + p[1] * s, -p[0] * s + p[1] * c)

FOOT = [(-3, -6), (3, -6), (4, 0), (8, 1), (11, 2.5), (11.5, 5), (-4, 5), (-4.5, 1)]   # сапог вокруг щиколотки (0,0)
HEEL, TOE = (-4.0, 5.0), (11.5, 5.0)

def ik(hip, ank, l1, l2, forward=1):
    dx, dy = ank[0] - hip[0], ank[1] - hip[1]; d = math.hypot(dx, dy)
    d = min(d, l1 + l2 - 0.01)
    a = math.atan2(dy, dx); b = math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))
    k = a - b * forward               # колено вперёд (вправо)
    return (hip[0] + l1 * math.cos(k), hip[1] + l1 * math.sin(k))

class Layer:
    def __init__(s): s.m = np.zeros((CH, CW), np.int8); s.c = np.zeros((CH, CW, 3), np.uint8)

def poly_mask(pts):
    xs, ys = np.meshgrid(np.arange(CW) + .5, np.arange(CH) + .5)
    inside = np.zeros((CH, CW), bool); n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
        cond = ((y1 > ys) != (y2 > ys)) & (xs < (x2 - x1) * (ys - y1) / ((y2 - y1) or 1e-9) + x1)
        inside ^= cond
    return inside

def segment(layer, p, q, w1, w2, cols, light=1):
    """Часть конечности p->q (ширины w1, w2) с тенью по поперечной координате: передняя сторона светлее."""
    dx, dy = q[0] - p[0], q[1] - p[1]; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L, dx / L
    if nx * light < 0: nx, ny = -nx, -ny           # нормаль смотрит вперёд (к свету)
    pts = [(p[0] + nx * w1 / 2, p[1] + ny * w1 / 2), (q[0] + nx * w2 / 2, q[1] + ny * w2 / 2),
           (q[0] - nx * w2 / 2, q[1] - ny * w2 / 2), (p[0] - nx * w1 / 2, p[1] - ny * w1 / 2)]
    m = poly_mask(pts)
    xs, ys = np.meshgrid(np.arange(CW) + .5, np.arange(CH) + .5)
    t = ((xs - p[0]) * dx + (ys - p[1]) * dy) / (L * L); w = w1 + (w2 - w1) * np.clip(t, 0, 1)
    s = ((xs - p[0]) * nx + (ys - p[1]) * ny) / (w / 2)
    paint(layer, m, s, cols)

def blob(layer, c, r, cols, light=(1, 0)):
    xs, ys = np.meshgrid(np.arange(CW) + .5, np.arange(CH) + .5)
    m = (xs - c[0]) ** 2 + (ys - c[1]) ** 2 <= r * r
    s = ((xs - c[0]) * light[0] + (ys - c[1]) * light[1]) / max(r, 1)
    paint(layer, m, s, cols)

def shape(layer, pts, cols, s=None):
    m = poly_mask(pts); paint(layer, m, np.zeros((CH, CW)) if s is None else s, cols)

def paint(layer, m, s, cols):
    layer.m[m] = 1
    layer.c[m & (s > .35)] = cols[0]; layer.c[m & (s <= .35) & (s >= -.45)] = cols[1]; layer.c[m & (s < -.45)] = cols[2]

def outline(layer):
    """Контур по краю слоя: пиксели слоя, у которых сосед по стороне — не этот слой."""
    m = layer.m.astype(bool); e = np.zeros_like(m)
    e[1:] |= ~m[:-1]; e[:-1] |= ~m[1:]; e[:, 1:] |= ~m[:, :-1]; e[:, :-1] |= ~m[:, 1:]
    layer.c[m & e] = OUT_C

def stamp(img, layer):
    m = layer.m.astype(bool); img[m, :3] = layer.c[m]; img[m, 3] = 255

# ---------- шаг: положение ноги по фазе 0..7 (0 — пятка этой ноги касается пола впереди) ----------
H0 = 10.3                              # пятка в момент касания, относительно таза по x: нога почти прямая
def leg_pose(f):
    """(щиколотка, угол стопы) для ноги в фазе f. Кадры 0–4 — опора: точка опоры неподвижна относительно пола."""
    f %= 8
    if f <= 2:                         # пятка (0) / вся стопа (1, 2) на полу
        a = math.radians([14, 0, 0][f]); heel = HIP[0] + H0 - STEP * f
        h = rot(HEEL, a); return (heel - h[0], SOLE + .5 - h[1]), a
    if f <= 4:                         # пятка поднимается, опора на носке
        a = math.radians([-18, -38][f - 3]); toe = HIP[0] + H0 + (TOE[0] - HEEL[0]) - STEP * f
        t = rot(TOE, a); return (toe - t[0], SOLE + .5 - t[1]), a
    # перенос ноги: от толчка сзади к касанию впереди, стопа над полом
    sw = {5: ((-15.0, 101.5), -50), 6: ((-1.0, 98.5), -16), 7: ((11.5, 103.0), 6)}[f]
    return (HIP[0] + sw[0][0], sw[0][1]), math.radians(sw[1])

def draw_leg(img, f, far):
    L = Layer(); ank, a = leg_pose(f); knee = ik(HIP, ank, THIGH, SHIN)
    pc, bc = (PANTS_FAR, BOOT_FAR) if far else (PANTS, BOOT)
    # сапог: голенище от щиколотки на 11 px вверх по голени, стопа
    sx, sy = knee[0] - ank[0], knee[1] - ank[1]; sl = math.hypot(sx, sy)
    btop = (ank[0] + sx / sl * 11, ank[1] + sy / sl * 11)
    segment(L, HIP, knee, 10.5, 8, pc); blob(L, knee, 3.9, pc)
    segment(L, knee, btop, 8, 7.5, pc)
    segment(L, btop, ank, 7, 6.5, bc)
    foot = [(ank[0] + q[0], ank[1] + q[1]) for q in (rot(p, a) for p in FOOT)]
    xs, ys = np.meshgrid(np.arange(CW) + .5, np.arange(CH) + .5)
    shape(L, foot, bc, s=-(ys - ank[1] - 1.5) / 3)          # верх стопы светлее, подошва темнее
    # отворот штанины над голенищем — на 1 px шире
    segment(L, (btop[0] + sx / sl * 2.5, btop[1] + sy / sl * 2.5), btop, 8.5, 8.5, pc)
    outline(L)
    # подошва — тёмная полоса снизу
    sole = poly_mask([(ank[0] + q[0], ank[1] + q[1]) for q in (rot(p, a) for p in [(-4.5, 3.6), (11.6, 3.6), (11.6, 5.2), (-4.5, 5.2)])])
    L.c[sole & L.m.astype(bool)] = OUT_C
    stamp(img, L)

def arm_angles(f, far):
    s = -math.cos(2 * math.pi * f / 8)          # ближняя рука: сзади в кадре 0 (ближняя нога впереди), впереди в кадре 4
    if far: s = -s
    up = math.radians(22) * s                    # от вертикали, + вперёд
    bend = math.radians(10 + 22 * max(0, s))     # локоть сгибается сильнее, когда рука впереди
    return up, bend

def draw_arm(img, f, far):
    L = Layer(); up, bend = arm_angles(f, far)
    sh = (SHOULDER[0] - (1.5 if far else 0), SHOULDER[1])
    el = (sh[0] + UPPER * math.sin(up), sh[1] + UPPER * math.cos(up))
    wr = (el[0] + FORE * math.sin(up + bend), el[1] + FORE * math.cos(up + bend))
    hd = (wr[0] + 2.6 * math.sin(up + bend), wr[1] + 2.6 * math.cos(up + bend))
    sc, kc = (SHIRT_FAR, SKIN_FAR) if far else (SHIRT, SKIN)
    segment(L, el, wr, 5, 4.5, kc)
    blob(L, hd, 2.9, kc)
    segment(L, sh, el, 10.5, 8, sc, light=1); blob(L, sh, 5, sc, light=(0.3, -1))
    cuff = (el[0] + 1.6 * math.sin(up + bend), el[1] + 1.6 * math.cos(up + bend))
    segment(L, (el[0] - 1.2 * math.sin(up), el[1] - 1.2 * math.cos(up)), cuff, 8.5, 7, [sc[2]] * 3)   # закатанный рукав
    outline(L); stamp(img, L)

def torso_base():
    """Кадр покоя без ближней руки и без ног: вместо руки — бок жилета, ниже ремня — пусто (там рисуются ноги)."""
    a = np.asarray(Image.open(IDLE).convert('RGBA')).copy()
    r, g, b = [a[..., i].astype(int) for i in range(3)]
    arm = np.zeros(a.shape[:2], bool)
    light = (r > 150) & (g > 100)                                       # рубашка и кожа
    arm[30:72, 61:79] = light[30:72, 61:79]
    # контур руки и тени между рукавом и жилетом
    grow = arm.copy(); grow[1:] |= arm[:-1]; grow[:-1] |= arm[1:]; grow[:, 1:] |= arm[:, :-1]; grow[:, :-1] |= arm[:, 1:]
    arm |= grow & (r < 70) & (np.arange(a.shape[1])[None, :] > 62) & (np.arange(a.shape[1])[None, :] < 77)
    arm[:31] = False
    orig = a[..., 3] > 0
    a[arm] = 0
    a[55:] = 0                                                           # всё ниже ремня — заново
    # бок жилета там, где была рука (строки 31–54): заливка внутри силуэта кадра покоя, край — контур
    for y in range(31, 55):
        for x in range(CW):
            if arm[y, x] and orig[y, x]:
                edge = not (orig[y, x - 1] and orig[y, x + 1] and orig[y - 1, x] and orig[y + 1, x])
                c = OUT_C if edge else (64, 45, 34) if x <= 65 else (78, 63, 40)
                a[y, x] = c + (255,)
    return a

def pelvis(img):
    L = Layer(); shape(L, [(63.5, 55), (80.5, 55), (79.5, 60), (76, 64), (65, 64), (63.5, 60)], PANTS); outline(L); stamp(img, L)
    img[55, 63:81] = OUT_C + (255,)                                      # ремень

def frame(f):
    img = np.zeros((CH, CW, 4), np.uint8)
    base = torso_base()
    draw_arm(img, f, far=True)
    draw_leg(img, (f + 4) % 8, far=True)
    m = base[..., 3] > 0; img[m] = base[m]
    pelvis(img)
    draw_leg(img, f, far=False)
    # у пояса бёдра и таз — одно целое: убираем внутренние линии контура (внешний край остаётся)
    for y in range(56, 68):
        for x in range(1, CW - 1):
            if tuple(img[y, x, :3]) == OUT_C and img[y, x, 3] and all(img[y + dy, x + dx, 3] for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0))):
                img[y, x, :3] = PANTS[1]
    draw_arm(img, f, far=False)
    return img

if __name__ == '__main__':
    sheet = np.concatenate([frame(f) for f in range(8)], axis=1)
    Image.fromarray(sheet, 'RGBA').save(OUT)
    print(OUT, sheet.shape[1], '×', sheet.shape[0], '; cycleDistance =', 8 * STEP)
    if len(sys.argv) > 1:
        bg = Image.new('RGBA', (CW * 8, CH), (222, 214, 196, 255)); bg.alpha_composite(Image.fromarray(sheet, 'RGBA'))
        bg.crop((0, 0, CW * 8, CH)).resize((CW * 8 * 2, CH * 2), Image.NEAREST).save(sys.argv[1])
