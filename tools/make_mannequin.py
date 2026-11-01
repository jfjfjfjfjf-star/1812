# Кукла-манекен по ходьбе Андрея: серый человек без лица и одежды в тех же 8 позах, что утверждённая ходьба
# (assets/characters/andrey/andrey_walk.png). Нужна как шаблон поз для генератора картинок: к запросу на каждого
# персонажа прикладывается сетка кукол, и персонаж рисуется в тех же позах.
# Как строится: голова и плечи — там же, где у Андрея; углы бёдер, коленей, рук и локтей подбираются так, чтобы
# силуэт куклы совпал с силуэтом Андрея в каждом кадре (перебор по одному углу, старт — обычный цикл шага).
# Ближние рука и нога светлые, дальние тёмные; у каждой детали свой тёмный контур, поэтому руки видны и на фоне тела.
# Запуск: python tools/make_mannequin.py [папка_вывода]   (нужны Python 3, numpy, Pillow)
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw
OUT = sys.argv[1] if len(sys.argv) > 1 else 'assets/mannequin'
SRC = 'assets/characters/andrey/andrey_walk.png'
CW, CH, N = 144, 120, 8
THIGH, SHIN, FOOT, UARM, FARM, TORSO = 22, 19, 10, 15, 14, 35
W = dict(torso=16, thigh=11, shin=9, foot=7, uarm=7, farm=6, hand=6)
NEAR, FAR, BODY, LINE = (190, 190, 190), (118, 118, 118), (170, 170, 170), (30, 26, 24)
KEYS = ['lean', 'tn', 'kn', 'tf', 'kf', 'an', 'en', 'af', 'ef']
LIM = {'lean': (0, 8), 'kn': (0, 50), 'kf': (0, 50), 'en': (5, 70), 'ef': (5, 70), 'tn': (-35, 45), 'tf': (-35, 45), 'an': (-40, 40), 'af': (-40, 40)}   # без вывернутых суставов
r = math.radians

def joints(p, head):
    hx, hy, hr = head
    sho = (hx - 2, hy + hr + 6)
    hip = (sho[0] + TORSO * math.sin(r(p['lean'])), sho[1] + TORSO * math.cos(r(p['lean'])))
    J = {'sho': sho, 'hip': hip}
    for s in 'nf':
        t, k = p['t' + s], p['k' + s]
        kn = (hip[0] + THIGH * math.sin(r(t)), hip[1] + THIGH * math.cos(r(t)))
        a = t - k; an = (kn[0] + SHIN * math.sin(r(a)), kn[1] + SHIN * math.cos(r(a)))
        toe = (an[0] + FOOT * math.cos(r(a * 0.5)), an[1] + FOOT * math.sin(r(a * 0.5)) * 0.4)
        J['knee' + s], J['ank' + s], J['toe' + s] = kn, an, toe
        u, e = p['a' + s], p['e' + s]
        el = (sho[0] + UARM * math.sin(r(u)), sho[1] + UARM * math.cos(r(u)))
        f = u + e; wr = (el[0] + FARM * math.sin(r(f)), el[1] + FARM * math.cos(r(f)))
        J['elb' + s], J['wri' + s] = el, wr
    return J

def cap(d, p, q, w, col):
    d.line([p, q], fill=col, width=int(round(w)))
    for c in (p, q): d.ellipse([c[0] - w / 2, c[1] - w / 2, c[0] + w / 2, c[1] + w / 2], fill=col)

def render(p, head, flat=False):
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); d = ImageDraw.Draw(im); J = joints(p, head)
    def part(a, b, w, col):
        if flat: cap(d, J[a] if isinstance(a, str) else a, J[b] if isinstance(b, str) else b, w, (255, 255, 255))
        else: cap(d, J[a] if isinstance(a, str) else a, J[b] if isinstance(b, str) else b, w + 2, LINE); cap(d, J[a] if isinstance(a, str) else a, J[b] if isinstance(b, str) else b, w, col)
    for s, col in (('f', FAR),):                                           # дальние рука и нога — позади тела
        part('sho', 'elb' + s, W['uarm'], col); part('elb' + s, 'wri' + s, W['farm'], col)
        part('hip', 'knee' + s, W['thigh'], col); part('knee' + s, 'ank' + s, W['shin'], col); part('ank' + s, 'toe' + s, W['foot'], col)
    part('sho', 'hip', W['torso'], BODY)
    hx, hy, hr = head
    if flat: d.ellipse([hx - hr + 1, hy - hr - 1, hx + hr - 1, hy + hr + 1], fill=(255, 255, 255))
    else:
        d.ellipse([hx - hr, hy - hr - 2, hx + hr, hy + hr + 2], fill=LINE); d.ellipse([hx - hr + 1, hy - hr - 1, hx + hr - 1, hy + hr + 1], fill=BODY)
        d.polygon([(hx + hr - 2, hy - 1), (hx + hr + 3, hy + 2), (hx + hr - 2, hy + 4)], fill=LINE)    # нос — куда смотрит
    s, col = 'n', NEAR
    part('hip', 'knee' + s, W['thigh'], col); part('knee' + s, 'ank' + s, W['shin'], col); part('ank' + s, 'toe' + s, W['foot'], col)
    part('sho', 'elb' + s, W['uarm'], col); part('elb' + s, 'wri' + s, W['farm'], col)
    return im

def prior(i):
    ph = i * math.pi / 4                                       # кадр 0 у Андрея — проход: ближняя нога переносится
    p = {'lean': 3}
    for s, q in (('n', ph), ('f', ph + math.pi)):
        p['t' + s] = 7 + 24 * math.sin(q); p['k' + s] = 6 + 45 * max(0, math.cos(q)) ** 1.5
        p['a' + s] = -22 * math.sin(q); p['e' + s] = 25
    return p

def fit(mask, head, p0):
    m = mask.copy(); m[:head[1] + head[2]] = False             # голову не сравниваем — она поставлена по Андрею
    def loss(p):
        a = np.asarray(render(p, head, flat=True))[..., 3] > 0; a[:head[1] + head[2]] = False
        iou = (a & m).sum() / max(1, (a | m).sum())
        J = joints(p, head); floor = max(J['ankn'][1], J['ankf'][1]) + W['shin'] / 2
        reg = sum((p[k] - p0[k]) ** 2 for k in KEYS) * 4e-5
        return 1 - iou + reg + 0.01 * abs(floor - 113)
    p = dict(p0); best = loss(p)
    for step in (12, 6, 3, 1.5, 0.75):
        improved = True
        while improved:
            improved = False
            for k in KEYS:
                for dv in (step, -step):
                    q = dict(p); q[k] = min(max(q[k] + dv, LIM[k][0]), LIM[k][1]); l = loss(q)
                    if l < best - 1e-6: p, best, improved = q, l, True
    return p, 1 - best

if __name__ == '__main__':
    src = np.asarray(Image.open(SRC).convert('RGBA'))[..., 3] > 0
    os.makedirs(OUT, exist_ok=True); P, H = [], []
    for i in range(N):
        mk = src[:, i * CW:(i + 1) * CW]; ys = np.nonzero(mk)[0]; t = ys.min()
        hx = np.nonzero(mk[t:t + 16])[1].mean(); head = (hx, t + 9, 7)
        p, score = fit(mk, head, prior(i)); P.append(p); H.append(head)
        print('кадр', i + 1, 'совпадение силуэта', round(score, 2))
    # вторая половина цикла — те же позы с другой ноги: ближние углы кадра i усредняются с дальними кадра i+4 и наоборот
    sw = lambda k: k[0] + {'n': 'f', 'f': 'n'}[k[1]] if len(k) == 2 else k
    Q = [dict() for _ in range(N)]
    for i in range(N):
        j = (i + N // 2) % N
        for k in KEYS: Q[i][k] = (P[i][k] + P[j][sw(k)]) / 2
    cells = [render(Q[i], H[i]) for i in range(N)]
    row = Image.new('RGBA', (CW * N, CH))
    for i, c in enumerate(cells): row.paste(c, (i * CW, 0))
    row.save(os.path.join(OUT, 'mannequin_walk_row.png'))
    S = 4
    for name, bg in (('mannequin_walk_grid.png', (0, 0, 0, 0)), ('mannequin_walk_grid_white.png', (255, 255, 255, 255))):
        big = Image.new('RGBA', (CW * 4 * S, CH * 2 * S), bg)
        for i, c in enumerate(cells): big.alpha_composite(c.resize((CW * S, CH * S), Image.NEAREST), ((i % 4) * CW * S, (i // 4) * CH * S))
        (big.convert('RGB') if bg[3] else big).save(os.path.join(OUT, name))
    print(OUT)
