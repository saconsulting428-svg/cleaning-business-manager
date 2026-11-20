#!/usr/bin/env python3
"""Builds Android launcher icons + splash screens from ../branding/*.png (run after branding/make-logo.cjs)."""
from PIL import Image, ImageDraw
import glob, os
B = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'branding')
RES = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'android/app/src/main/res')
icon = Image.open(f'{B}/logo-icon-1024.png').convert('RGBA'); bg = Image.open(f'{B}/android-bg.png').convert('RGBA'); fg = Image.open(f'{B}/android-fg.png').convert('RGBA')
sizes = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216), 'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}
def rounded(im, r):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], radius=r, fill=255); o = im.copy(); o.putalpha(m); return o
for d, (leg, ad) in sizes.items():
    p = f'{RES}/mipmap-{d}'
    rounded(icon.resize((leg, leg), Image.LANCZOS), int(leg * .22)).save(f'{p}/ic_launcher.png')
    m = Image.new('L', (leg * 4, leg * 4), 0); ImageDraw.Draw(m).ellipse([0, 0, leg * 4 - 1, leg * 4 - 1], fill=255); m = m.resize((leg, leg), Image.LANCZOS)
    r = icon.resize((leg, leg), Image.LANCZOS); r.putalpha(m); r.save(f'{p}/ic_launcher_round.png')
    fg.resize((ad, ad), Image.LANCZOS).save(f'{p}/ic_launcher_foreground.png')
    bg.resize((ad, ad), Image.LANCZOS).convert('RGB').save(f'{p}/ic_launcher_background.png')
for n in ('ic_launcher', 'ic_launcher_round'):
    open(f'{RES}/mipmap-anydpi-v26/{n}.xml', 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')
master = Image.open(f'{B}/splash-master.png').convert('RGB')
for f in glob.glob(f'{RES}/**/splash.png', recursive=True):
    w, h = Image.open(f).size
    if h >= w:   # portrait: cover-crop the master around its centre
        s = max(w / master.width, h / master.height); im = master.resize((int(master.width * s) + 1, int(master.height * s) + 1), Image.LANCZOS)
        l, t = (im.width - w) // 2, (im.height - h) // 2; im.crop((l, t, l + w, t + h)).save(f)
    else:        # landscape (unused, portrait is locked): fit the master on a matching background
        s = h / master.height; im = master.resize((int(master.width * s), h), Image.LANCZOS); c = Image.new('RGB', (w, h), master.getpixel((5, 5))); c.paste(im, ((w - im.width) // 2, 0)); c.save(f)
print('android icons + splash updated')
