# Лист ходьбы NPC из сетки 4x2 (8 кадров, порядок слева направо, сверху вниз) от генератора картинок.
# Кадры режутся по сетке, масштаб — по кадру 2 (ноги вместе), голова во всех кадрах на одной высоте и по одной вертикали
# (по середине головы, не по ступням: ступни при шаге уходят), линия пола общая. Палитра игры не накладывается.
# Запуск: python tools/make_walk_sheet.py stepan 108   (id, высота голова-пол в пикселях сетки 144x120)
import sys, numpy as np
from PIL import Image
sys.path.insert(0, 'tools'); import make_npcs
cid = sys.argv[1]; H_T = int(sys.argv[2]) if len(sys.argv) > 2 else 108
D = f'assets/characters/{cid}/'
im = Image.open(D + f'source/{cid}_walk_gpt.png').convert('RGBA'); W, H = im.size; cw, ch = W // 4, H // 2
raw = []
for r in range(2):
    for c in range(4):
        sub = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)); al = np.array(sub)[:, :, 3] > 40
        ys, xs = np.nonzero(al); raw.append((sub, al, ys.min(), ys.max()))
s = H_T / (raw[1][3] - raw[1][2]); cells = []
for sub, al, y0, y1 in raw:
    hx = np.nonzero(al[y0:y0 + 60])[1].mean()
    sm = sub.resize((round(sub.width * s), round(sub.height * s)), Image.LANCZOS)
    cell = Image.new('RGBA', (144, 120), (0, 0, 0, 0)); cell.paste(sm, (round(72 - hx * s), 115 - H_T - round(y0 * s)), sm); cells.append(cell)
sheet = Image.new('RGBA', (144 * 8, 120))
for i, c in enumerate(cells): sheet.paste(c, (i * 144, 0))
sheet.save(D + f'{cid}_walk.png')
Image.fromarray(make_npcs.idle_frames(np.asarray(cells[1]))).save(D + f'{cid}_idle.png'); print(cid, sheet.size, round(s, 3))
