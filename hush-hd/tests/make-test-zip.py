#!/usr/bin/env python3
"""Builds a SYNTHETIC Pngs.zip (opaque white backgrounds, different canvas sizes, one oversized frame, a stray panel in Y3) out of the
current atlases, to test tools/build_sprites_from_zip.py without the real artist files. Output: /tmp/synth/Pngs.zip"""
import json, zipfile, os, random
from PIL import Image, ImageDraw
random.seed(3)
meta = json.load(open('assets/atlas.json')); os.makedirs('/tmp/synth', exist_ok=True)
names = {'Survivor_Run': ['Run'] + ['S%d' % i for i in range(1, 9)] + ['S9'], 'Survivor_CrouchWalk': ['C%d' % i for i in range(1, 7)], 'Survivor_Crawl': ['W%d' % i for i in range(1, 7)],
         'Survivor_Use': ['Y%d' % i for i in range(1, 5)], 'Survivor_Caught': ['X%d' % i for i in range(1, 5)], 'Monster_Run': ['U%d' % i for i in range(1, 9)],
         'Monster_Attack': ['A%d' % i for i in range(1, 5)], 'Monster_Roar': ['R%d' % i for i in range(1, 4)]}
with zipfile.ZipFile('/tmp/synth/Pngs.zip', 'w') as z:
    for sheet, ids in names.items():
        m = meta[sheet]; im = Image.open('assets/' + m['src']).convert('RGBA')
        for j, fid in enumerate(ids):
            cell = im.crop(((j % m['cols']) * m['w'], (j // m['cols']) * m['h'], (j % m['cols'] + 1) * m['w'], (j // m['cols'] + 1) * m['h']))
            bb = cell.getbbox(); fr = cell.crop(bb)
            sc = 1.38 if fid == 'W6' else 1.0
            if sc != 1: fr = fr.resize((int(fr.width * sc), int(fr.height * sc)), Image.LANCZOS)
            W, H = fr.width + random.randint(60, 400), fr.height + random.randint(60, 400)
            bg = Image.new('RGBA', (W, H), (255, 255, 255, 255)); bg.alpha_composite(fr, (random.randint(20, W - fr.width - 20), random.randint(20, H - fr.height - 20)))
            if fid == 'Y3': d = ImageDraw.Draw(bg); d.rectangle((W - 30, H // 3, W - 22, H // 3 + 190), fill=(40, 60, 120, 255))     # stray panel
            buf = bg.convert('RGB'); name = ('%s/%s%s.png' % (random.choice(['', 'frames', 'frames/sheet']), fid, random.choice(['', ' (1)', '_final']))).lstrip('/')
            import io; b = io.BytesIO(); buf.save(b, 'PNG'); z.writestr(name, b.getvalue())
print('wrote /tmp/synth/Pngs.zip')
