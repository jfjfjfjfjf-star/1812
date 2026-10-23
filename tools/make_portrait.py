# Портрет для окна диалога из генерации на белом фоне: фон -> прозрачность, уменьшение по площади до ширины 180
# (с сохранением пропорций, не выше 204), прижат к низу и левому краю холста 180×204, общая палитра игры.
# (Пробовали уменьшать до «родной» сетки рисунка и увеличивать ×3 — лицо расплывается; прямое уменьшение читается лучше.)
# Запуск: python tools/make_portrait.py <исходник> <результат.png>
#   мать: python tools/make_portrait.py assets/characters/mother/source/mother_portrait_gpt.webp assets/characters/mother/mother_portrait.png
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette_lib
from make_sprites import figure_mask

W, H = 180, 204

def portrait(src, out):
    rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    m = figure_mask(rgb)
    h0, w0 = m.shape
    k = min(W / w0, H / h0); w, h = round(w0 * k), round(h0 * k)
    mm = np.asarray(Image.fromarray(m.astype(np.float32)).resize((w, h), Image.BOX))
    a = np.zeros((h, w, 4), np.float32)
    for c in range(3):
        a[..., c] = np.asarray(Image.fromarray(rgb[..., c] * m).resize((w, h), Image.BOX)) / np.maximum(mm, 1e-6)
    a[..., 3] = (mm > 0.5) * 255
    img = palette_lib.apply(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA'), palette_lib.load('assets/palette.png'))
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0)); canvas.paste(img, (0, H - h))
    canvas.save(out); print(out, (w, h), '->', canvas.size)

if __name__ == '__main__':
    portrait(sys.argv[1], sys.argv[2])
