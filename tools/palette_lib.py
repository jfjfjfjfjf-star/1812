# Общая палитра игры: подбор цветов (k-средние в пространстве Lab) и перевод картинок на палитру.
# Нужны Python 3, numpy, Pillow. Используется tools/make_palette.py и tools/make_sprites.py.
import numpy as np
from PIL import Image

def rgb_to_lab(rgb):
    """rgb: массив (N, 3) 0..255 -> Lab (N, 3). sRGB, D65."""
    c = np.asarray(rgb, np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[:, 1] - 16, 500 * (f[:, 0] - f[:, 1]), 200 * (f[:, 1] - f[:, 2])], axis=1)

def nearest(lab, pal_lab, chunk=20000):
    out = np.empty(len(lab), np.int32)
    for i in range(0, len(lab), chunk):
        d = ((lab[i:i + chunk, None, :] - pal_lab[None, :, :]) ** 2).sum(axis=2)
        out[i:i + chunk] = d.argmin(axis=1)
    return out

def build(rgb, weights, k, seed=1812, iters=25, sample=60000):
    """Подбор k цветов. rgb (N, 3), weights (N,) — вес пикселя. Повторяемо (постоянное зерно)."""
    rng = np.random.default_rng(seed)
    p = weights / weights.sum()
    idx = rng.choice(len(rgb), size=min(sample, len(rgb)), replace=True, p=p)
    pts = rgb_to_lab(rgb[idx]); prgb = rgb[idx].astype(np.float64)
    # k-means++: следующий центр выбирается тем вероятнее, чем дальше точка от уже выбранных — редкие яркие цвета не теряются
    centers = [pts[rng.integers(len(pts))]]
    d2 = ((pts - centers[0]) ** 2).sum(axis=1)
    for _ in range(1, k):
        centers.append(pts[rng.choice(len(pts), p=d2 / d2.sum())])
        d2 = np.minimum(d2, ((pts - centers[-1]) ** 2).sum(axis=1))
    C = np.array(centers)
    for _ in range(iters):
        lab_idx = nearest(pts, C)
        for j in range(k):
            sel = lab_idx == j
            if sel.any(): C[j] = pts[sel].mean(axis=0)
    # цвет палитры — настоящий средний RGB своей группы (без обратного перевода из Lab)
    lab_idx = nearest(pts, C)
    pal = np.array([prgb[lab_idx == j].mean(axis=0) if (lab_idx == j).any() else [0, 0, 0] for j in range(k)])
    pal = np.clip(np.round(pal), 0, 255).astype(np.uint8)
    pal = np.unique(pal, axis=0)
    order = np.argsort(rgb_to_lab(pal)[:, 0])           # по светлоте — удобнее смотреть образец
    return pal[order]

def load(path):
    a = np.asarray(Image.open(path).convert('RGB')).reshape(-1, 3)
    return np.unique(a, axis=0)

def apply(img, pal):
    """Переводит RGBA/RGB-картинку на палитру (ближайший цвет в Lab, без дизеринга). Прозрачность сохраняется."""
    im = img.convert('RGBA'); a = np.asarray(im).copy()
    flat = a.reshape(-1, 4); vis = flat[:, 3] > 0
    if vis.any():
        flat[vis, :3] = pal[nearest(rgb_to_lab(flat[vis, :3]), rgb_to_lab(pal))]
    return Image.fromarray(a, 'RGBA')

def swatch(pal, path, cols=16, cell=12):
    rows = (len(pal) + cols - 1) // cols
    im = Image.new('RGB', (cols * cell, rows * cell), (0, 0, 0))
    for i, c in enumerate(pal):
        im.paste(tuple(int(v) for v in c), ((i % cols) * cell, (i // cols) * cell, (i % cols + 1) * cell, (i // cols + 1) * cell))
    im.save(path)
