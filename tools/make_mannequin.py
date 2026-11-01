# Кукла-манекен для ходьбы: серый силуэт без лица и одежды, 8 поз цикла из двух шагов, вид сбоку, смотрит вправо.
# Нужна как шаблон поз для генератора картинок: к запросу на каждого персонажа прикладывается лист кукол, и персонаж
# рисуется в тех же позах. Пропорции в пикселях игры (клетка 144x120, рост «голова-пол» 104 = Андрей): голова ~1/7,
# ноги ~половина роста. Порядок кадров (как у Андрея): нога встала, опора, проход, подъём — потом то же другой ногой.
# Запуск: python tools/make_mannequin.py [папка_вывода]   (нужны Python 3, Pillow; numpy не нужен)
import math, sys
from PIL import Image, ImageDraw
OUT = sys.argv[1] if len(sys.argv) > 1 else 'assets/mannequin'
CW, CH, FLOOR = 144, 120, 114
HEAD, NECK, TORSO, THIGH, SHIN, FOOT = 15, 3, 32, 27, 24, 11     # сумма голова+шея+торс+бедро+голень+высота стопы ≈ 104
UARM, FARM, HAND = 19, 18, 5
NEAR, FAR, LINE = (176, 176, 176), (112, 112, 112), (28, 24, 22)
def rad(d): return math.radians(d)
def cap(draw, p, q, w, col):
    draw.line([p, q], fill=col, width=int(w))
    for c in (p, q): draw.ellipse([c[0] - w / 2, c[1] - w / 2, c[0] + w / 2, c[1] + w / 2], fill=col)
def limb(draw, p, q, w, col):                               # «капсула» с тёмным контуром у каждой детали (руки видны на торсе)
    cap(draw, p, q, w + 2, LINE); cap(draw, p, q, w, col)
def leg(hip, ph):                                            # бедро и голень по фазе шага ph (рад.)
    t = 7 + 26 * math.sin(ph)                                  # угол бедра: + вперёд
    flex = 6 + 42 * max(0, math.cos(ph)) ** 1.5              # колено сгибается, когда нога идёт вперёд
    knee = (hip[0] + THIGH * math.sin(rad(t)), hip[1] + THIGH * math.cos(rad(t)))
    sh = t - flex
    ank = (knee[0] + SHIN * math.sin(rad(sh)), knee[1] + SHIN * math.cos(rad(sh)))
    toe = (ank[0] + FOOT * math.cos(rad(sh * 0.3)), ank[1] + 3)
    return knee, ank, toe
def arm(sh, ph):
    t = -26 * math.sin(ph); el = (sh[0] + UARM * math.sin(rad(t)), sh[1] + UARM * math.cos(rad(t)))
    f = t + 12 + 18 * max(0, -math.sin(ph) * 0 + math.cos(ph + 0.4)) ** 0
    wr = (el[0] + FARM * math.sin(rad(f)), el[1] + FARM * math.cos(rad(f)))
    return el, wr
def pose(i):
    ph = math.pi / 2 + i * math.pi / 4                       # кадр 0: ближняя нога вынесена вперёд и встаёт
    pn, pf = ph, ph + math.pi
    hip0 = (CW / 2 - 4, 0)
    ys = []
    for p in (pn, pf):
        k, a, t = leg(hip0, p); ys.append(max(a[1], t[1]))
    hip = (hip0[0], FLOOR - max(ys) - 0)                     # тело на высоте, при которой нижняя стопа на полу
    sho = (hip[0] + 4 * math.sin(rad(4)), hip[1] - TORSO)
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    def draw_all(col_n, col_f, w_extra):
        kf, af, tf = leg(hip, pf); kn, an, tn = leg(hip, pn)
        ef, wf = arm(sho, pf); en, wn = arm(sho, pn)
        W = 7 + w_extra; WT = 9 + w_extra
        limb(d, sho, ef, W - 1, col_f); limb(d, ef, wf, W - 2, col_f); limb(d, wf, (wf[0] + 2, wf[1] + HAND), W - 1, col_f)
        limb(d, hip, kf, WT - 1, col_f); limb(d, kf, af, W, col_f); limb(d, af, tf, W - 1, col_f)
        limb(d, hip, sho, 15 + w_extra, col_n)                                                   # торс
        hc = (sho[0] + 3, sho[1] - NECK - HEAD / 2); d.ellipse([hc[0] - 7, hc[1] - HEAD / 2 - 1, hc[0] + 7, hc[1] + HEAD / 2 + 1], fill=LINE)
        d.ellipse([hc[0] - 6, hc[1] - HEAD / 2, hc[0] + 6, hc[1] + HEAD / 2], fill=col_n)
        d.polygon([(hc[0] + 5, hc[1] - 1), (hc[0] + 10, hc[1] + 2), (hc[0] + 5, hc[1] + 4)], fill=LINE)
        d.polygon([(hc[0] + 5, hc[1]), (hc[0] + 9, hc[1] + 2), (hc[0] + 5, hc[1] + 3)], fill=col_n)   # нос — куда смотрит
        limb(d, hip, kn, WT, col_n); limb(d, kn, an, W + 1, col_n); limb(d, an, tn, W, col_n)
        limb(d, sho, en, W, col_n); limb(d, en, wn, W - 1, col_n); limb(d, wn, (wn[0] + 2, wn[1] + HAND), W, col_n)
    draw_all(NEAR, FAR, 0)
    return im
import os
os.makedirs(OUT, exist_ok=True)
cells = [pose(i) for i in range(8)]
row = Image.new('RGBA', (CW * 8, CH))
for i, c in enumerate(cells): row.paste(c, (i * CW, 0))
row.save(os.path.join(OUT, 'mannequin_walk_row.png'))          # 1152x120, как лист ходьбы Андрея (для движка и сверки)
S = 4; big = Image.new('RGBA', (CW * 4 * S, CH * 2 * S), (0, 0, 0, 0))   # 4x2, крупно — прикладывать к запросам
for i, c in enumerate(cells): big.paste(c.resize((CW * S, CH * S), Image.NEAREST), ((i % 4) * CW * S, (i // 4) * CH * S))
big.save(os.path.join(OUT, 'mannequin_walk_grid.png'))
print(OUT, big.size)
