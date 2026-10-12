#!/usr/bin/env python3
"""Builds the single-file game: HUSH-HD.html = ui.css + ui.html + embedded sprite atlases/fonts + all scripts.
usage: build.py [out.html]   (run tools/clean_sprites.py first; it writes assets/clean/)"""
import base64, json, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p, mode='r': open(os.path.join(root, p), mode, **({'encoding': 'utf8'} if mode == 'r' else {})).read()
b64 = lambda p: base64.b64encode(rd(p, 'rb')).decode()

atlas = json.loads(rd('assets/clean/atlas.json'))
for k, v in atlas.items():
    v['src'] = 'data:image/webp;base64,' + b64('assets/clean/' + v['src'])
fonts = ''
for fam, w, fn in [('Barlow Condensed', 500, 'BarlowCondensed-500'), ('Barlow Condensed', 600, 'BarlowCondensed-600'), ('Barlow Condensed', 700, 'BarlowCondensed-700'), ('Barlow', 400, 'Barlow-400'), ('Barlow', 500, 'Barlow-500')]:
    fonts += '@font-face { font-family: "%s"; font-weight: %d; font-display: swap; src: url(data:font/woff2;base64,%s) format("woff2"); }\n' % (fam, w, b64('assets/%s.woff2' % fn))
scripts = '\n'.join(rd('src/' + f) for f in ['levels.js', 'sim.js', 'gfx.js', 'render.js', 'audio.js', 'game.js'])
html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#04070f">
<meta name="mobile-web-app-capable" content="yes">
<title>HUSH HD</title>
<style>{fonts}{rd('src/ui.css')}</style>
</head>
<body>
{rd('src/ui.html')}
<script>window.HUSH_ATLAS = {json.dumps(atlas)};</script>
<script>
{scripts}
</script>
</body>
</html>
'''
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'HUSH-HD.html')
open(out, 'w', encoding='utf8').write(html)
print('wrote', out, round(os.path.getsize(out) / 1048576, 2), 'MB')
