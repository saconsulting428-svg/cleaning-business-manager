#!/usr/bin/env python3
"""Bundle index.html + css/ + js/ into ONE self-contained html file (handy for quick sharing).
usage: python3 tools/bundle.py [out.html] [--fragment] [--standalone]
  --standalone  also embed the Fredoka font + a favicon (the new logo) so the file looks identical offline.
  --fragment  emit only <title>/<style>/body/<script> (no <html>/<head>/<body>), for hosts that add their own skeleton."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
frag = '--fragment' in sys.argv
standalone = '--standalone' in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith('--')]
out = pathlib.Path(args[0]) if args else root / 'dist' / 'ascend-single.html'
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: '<style>\n' + (root / m.group(1)).read_text() + '\n</style>', html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', lambda m: '<script>\n' + (root / m.group(1)).read_text() + '\n</script>', html)
if standalone:
    import base64
    html = re.sub(r'<link rel="preconnect"[^>]*>\s*', '', html)
    html = re.sub(r'<link href="https://fonts\.googleapis\.com[^>]*>\s*', '', html)
    face = ''.join("@font-face{font-family:'Fredoka';font-style:normal;font-weight:%d;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}\n" % (w, base64.b64encode((root / 'fonts' / ('fredoka-latin-%d-normal.woff2' % w)).read_bytes()).decode()) for w in (400, 500, 600, 700))
    html = html.replace('<style>\n', '<style>\n' + face, 1)
    ico = root / 'branding' / 'logo-icon-rounded-1024.png'
    if ico.exists():
        from PIL import Image; import io
        im = Image.open(ico).convert('RGBA').resize((192, 192)); buf = io.BytesIO(); im.save(buf, 'PNG')
        html = html.replace('</title>', '</title>\n<link rel="icon" type="image/png" href="data:image/png;base64,%s">' % base64.b64encode(buf.getvalue()).decode(), 1)
if frag:
    head = html[html.index('<head>') + 6: html.index('</head>')]
    head = re.sub(r'<meta (charset|name="viewport"|name="theme-color"|name="mobile-web-app-capable")[^>]*>\s*', '', head)
    body = html[html.index('<body>') + 6: html.index('</body>')]
    html = head + body
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
print('wrote', out, len(html) // 1024, 'KB')
