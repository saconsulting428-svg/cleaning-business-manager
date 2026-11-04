"""Procedural surface textures (numpy + PIL): painted metal, rust, wood, concrete, dark steel, rubber, glass-dirt. Tileable, 512px. Run by build.py before modelling."""
import numpy as np
from PIL import Image
N = 256
rs = np.random.RandomState(7)

def fbm(oct=5, base=4, seed=0):
    r = np.random.RandomState(seed); out = np.zeros((N, N)); amp = 1.0; tot = 0
    for o in range(oct):
        g = r.rand(base * 2 ** o, base * 2 ** o).astype(np.float32)
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC)
        out += np.asarray(im, np.float32) / 255 * amp; tot += amp; amp *= 0.5
    out /= tot; return (out - out.min()) / (out.max() - out.min() + 1e-6)

def tile(a):  # make seamless by cross-fading with a half-rolled copy
    x = np.abs(np.linspace(-1, 1, N)); w1 = np.sin(np.clip(1 - x, 0, 1) * np.pi / 2) ** 2; w = (w1[:, None] * w1[None, :])
    if a.ndim == 3: w = w[..., None]
    b = np.roll(np.roll(a, N // 2, 0), N // 2, 1); return a * w + b * (1 - w)

def scratches(n=70, seed=1, length=(30, 160)):
    r = np.random.RandomState(seed); im = Image.new('L', (N, N), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    for _ in range(n):
        x, y = r.randint(0, N), r.randint(0, N); L = r.randint(*length); a = r.rand() * 6.28
        d.line([(x, y), (x + np.cos(a) * L, y + np.sin(a) * L)], fill=int(60 + r.rand() * 150), width=1)
    return np.asarray(im, np.float32) / 255

def save(name, rgb):
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save('/tmp/hushtex/%s.png' % name)

def paint(name, col, wear=0.5, seed=0, rust=(120, 62, 30)):
    c = np.array(col, np.float32); f = fbm(5, 3, seed); g = fbm(6, 8, seed + 1); s = scratches(90, seed)
    img = c * (0.82 + 0.28 * f[..., None]) * (0.94 + 0.12 * g[..., None])
    chips = (g > 1 - 0.07 * wear) & (f > 0.5); r = np.array(rust, np.float32)
    img = np.where(chips[..., None], r * (0.45 + 0.35 * g[..., None]), img)
    dirt = fbm(4, 2, seed + 9); img *= (0.72 + 0.2 * dirt[..., None]) * (0.8 + 0.2 * np.linspace(0, 1, N)[:, None, None])
    drip = fbm(3, 2, seed + 3); stripe = np.abs(np.sin(np.linspace(0, 60, N))[None, :] * 0.5 + 0.5) * (drip > 0.55)[...] 
    img *= (1 - 0.18 * wear * (drip[..., None] > 0.62))
    img += s[..., None] * 38 * wear
    save(name, tile(img))

def rustmetal(name, seed=0):
    f = fbm(6, 3, seed); g = fbm(5, 7, seed + 2); base = np.array([92, 52, 30], np.float32); dark = np.array([40, 24, 16], np.float32); lite = np.array([150, 90, 48], np.float32)
    img = dark + (base - dark) * f[..., None]; img = np.where((g > 0.6)[..., None], lite * (0.7 + 0.5 * g[..., None]), img); img *= 0.85 + 0.3 * fbm(7, 12, seed + 4)[..., None]
    pits = fbm(5, 20, seed + 5) > 0.78; img[pits] *= 0.4; save(name, tile(img))

def wood(name, col=(112, 78, 46), seed=0):
    f = fbm(4, 2, seed); y = np.linspace(0, 1, N)[:, None]; x = np.linspace(0, 1, N)[None, :]
    grain = 0.5 + 0.5 * np.sin(x * 2 * np.pi * 18 + f * 5 + fbm(5, 10, seed + 1) * 3); fine = fbm(3, 40, seed + 4)
    plank = np.floor(x * 5) % 2 * 0.08 + np.floor(x * 5) * 0.03 % 0.1
    img = np.array(col, np.float32) * (0.55 + 0.3 * grain[..., None] + 0.2 * fine[..., None] + plank[..., None]) * (0.8 + 0.3 * fbm(5, 6, seed + 2)[..., None]) * 0.75
    seam = (np.abs((x * 5) % 1) < 0.015); img[np.broadcast_to(seam, (N, N))] *= 0.3; img += scratches(40, seed)[..., None] * 18; save(name, tile(img))

def concrete(name, col=(120, 118, 112), seed=0):
    f = fbm(6, 3, seed); p = fbm(6, 24, seed + 1); img = np.array(col, np.float32) * (0.7 + 0.5 * f[..., None]); img[p > 0.8] *= 0.55; img += (fbm(2, 30, seed + 3) - 0.5)[..., None] * 18; save(name, tile(img))

def rubber(name, col=(30, 30, 32), seed=0):
    f = fbm(5, 10, seed); img = np.array(col, np.float32) * (0.8 + 0.5 * f[..., None]) + scratches(40, seed)[..., None] * 12; save(name, tile(img))

def build():
    import os; os.makedirs('/tmp/hushtex', exist_ok=True)
    paint('paint_green', (82, 98, 88), 0.7, 1); paint('paint_grey', (110, 116, 120), 0.6, 2); paint('paint_blue', (66, 84, 106), 0.6, 3); paint('paint_red', (120, 44, 38), 0.8, 4)
    paint('paint_yellow', (170, 140, 40), 0.9, 5, rust=(100, 70, 30)); paint('paint_cream', (170, 164, 140), 0.7, 6); paint('paint_white', (196, 198, 194), 0.5, 7)
    paint('steel', (96, 100, 106), 0.35, 8, rust=(110, 70, 44)); paint('darksteel', (44, 47, 52), 0.35, 9)
    rustmetal('rust', 11); wood('wood', (112, 78, 46), 12); wood('wood_dark', (70, 48, 30), 13); concrete('concrete', (120, 118, 112), 14); rubber('rubber', (30, 30, 32), 15)
    rubber('bone', (176, 168, 148), 16); paint('screen', (30, 70, 56), 0.1, 17)
if __name__ == '__main__': build()
