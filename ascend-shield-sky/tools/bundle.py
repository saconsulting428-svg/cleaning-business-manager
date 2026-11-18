#!/usr/bin/env python3
"""Bundle index.html + css/ + js/ into ONE self-contained html file (handy for quick sharing).
usage: python3 tools/bundle.py [out.html] [--fragment]
  --fragment  emit only <title>/<style>/body/<script> (no <html>/<head>/<body>), for hosts that add their own skeleton."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
frag = '--fragment' in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith('--')]
out = pathlib.Path(args[0]) if args else root / 'dist' / 'ascend-single.html'
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: '<style>\n' + (root / m.group(1)).read_text() + '\n</style>', html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', lambda m: '<script>\n' + (root / m.group(1)).read_text() + '\n</script>', html)
if frag:
    head = html[html.index('<head>') + 6: html.index('</head>')]
    head = re.sub(r'<meta (charset|name="viewport"|name="theme-color"|name="mobile-web-app-capable")[^>]*>\s*', '', head)
    body = html[html.index('<body>') + 6: html.index('</body>')]
    html = head + body
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
print('wrote', out, len(html) // 1024, 'KB')
