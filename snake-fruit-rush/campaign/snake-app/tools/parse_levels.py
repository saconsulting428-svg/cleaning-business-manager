import re, json, sys
src = open(sys.argv[1], encoding='utf-8').read()
g = src[src.index('## G. Complete level'):src.index('## H. Level-map')]
rows = [l for l in g.split('\n') if re.match(r'^\| \d+ \|', l)]
assert len(rows) == 100, len(rows)
WORLDS = ['garden','desert','ice','volcano','night']
SPECIES = {'A':'apple','O':'orange','C':'cherry','G':'grapes','S':'strawberry'}
DIRN = {'R':'right','L':'left','U':'up','D':'down'}

def rng(a, b=None):
    a = int(a); b = int(b) if b is not None else a
    return list(range(a, b+1))

def parse_cells(spec):
    """x=3,y=0-4 and y=6-7 except y=2 ... -> list of cells"""
    spec = re.sub(r'\(gap[^)]*\)', '', spec)
    exc = None
    m = re.search(r'\bexcept\b(.*)$', spec)
    ex_cells = set(); ex_x = None; ex_y = None
    if m:
        e = m.group(1)
        spec = spec[:m.start()]
        mm = re.findall(r'\((\d),(\d)\)', e)
        for a, b in mm: ex_cells.add((int(a), int(b)))
        my = re.search(r'y=(\d)(?:-(\d))?', e)
        if my and not mm: ex_y = set(rng(my.group(1), my.group(2)))
        mx = re.search(r'x=(\d)(?:-(\d))?', e)
        if mx and not mm: ex_x = set(rng(mx.group(1), mx.group(2)))
    cells = []
    # explicit coordinate lists
    for a, b in re.findall(r'\((\d),(\d)\)', spec): cells.append((int(a), int(b)))
    spec2 = re.sub(r'\(\d,\d\)', '', spec)
    lastx = None
    for part in re.split(r'\band\b', spec2):
        mx = re.search(r'x=(\d)(?:-(\d))?', part)
        my = re.search(r'y=(\d)(?:-(\d))?', part)
        if mx: lastx = rng(mx.group(1), mx.group(2))
        if my:
            xs = lastx
            for x in xs:
                for y in rng(my.group(1), my.group(2)): cells.append((x, y))
    out = []
    for c in cells:
        if c in ex_cells: continue
        if ex_y is not None and c[1] in ex_y: continue
        if ex_x is not None and c[0] in ex_x: continue
        if c not in out: out.append(c)
    return out

def parse_row(line):
    cols = [c.strip() for c in line.strip().strip('|').split(' | ')]
    L = int(cols[0]); grid = cols[2].replace('–','-').replace('×','x'); sfe = cols[3].replace('–','-'); obj = cols[4]; dif = cols[5].replace('–','-')
    lv = {'id': L, 'world': WORLDS[(L-1)//20], 'walls': [], 'ice': [], 'items': [], 'devices': [], 'hint': obj}
    # --- grid column
    segs = [s.strip() for s in grid.split(';')]
    mode = None
    keys = {}; doors = {}; switches = []; portals = {}
    for s in segs:
        if re.match(r'^8x8', s) or s == '': 
            s = re.sub(r'^8x8\s*,?\s*', '', s)
            if not s or s.startswith('no walls'): continue
        if s.startswith('W '):
            mode = 'W'; lv['walls'] += parse_cells(s[2:]); continue
        if re.match(r'^(x|y)=', s) and mode == 'W':
            lv['walls'] += parse_cells(s); continue
        if s.startswith('I '):
            mode = 'I'; lv['ice'] += parse_cells(s[2:]); continue
        mode = None
        # devices / fruit list
        for m in re.finditer(r'SW\((\d),(\d)\) toggles D(\d?)\((\d),(\d)\)', s):
            switches.append({'cell':[int(m.group(1)),int(m.group(2))], 'gate':[int(m.group(4)),int(m.group(5))], 'gid':m.group(3) or '1'})
        s_nosw = re.sub(r'SW\(\d,\d\) toggles D\d?\(\d,\d\)', '', s)
        for m in re.finditer(r'T(\d)\((\d),(\d)\)\s*↔\s*T(\d)\((\d),(\d)\)', s_nosw):
            portals[(m.group(1), m.group(4))] = [[int(m.group(2)),int(m.group(3))],[int(m.group(5)),int(m.group(6))]]
        s_nop = re.sub(r'T\d\(\d,\d\)\s*↔\s*T\d\(\d,\d\)', '', s_nosw)
        for m in re.finditer(r'\b(K|D|H|BF|GF|A|O|C|G|S)(\d?)(\??)\((\d),(\d)\)', s_nop):
            t, n, opt, x, y = m.group(1), m.group(2), m.group(3), int(m.group(4)), int(m.group(5))
            if t == 'K': keys[n or '1'] = [x, y]
            elif t == 'D': doors[n or '1'] = [x, y]
            elif t == 'H': lv['items'].append({'type':'bomb','cell':[x,y]})
            elif t == 'BF': lv['items'].append({'type':'fruit','species':'bigfruit','cell':[x,y],'required':False})
            elif t == 'GF': lv['items'].append({'type':'fruit','species':'golden','cell':[x,y],'required':False})
            else: lv['items'].append({'type':'fruit','species':SPECIES[t],'cell':[x,y],'required':opt != '?'})
    # --- start/fruit/exit column
    hard = None
    for s in [t.strip() for t in sfe.split(';')]:
        m = re.search(r'hard cap (\d+)', s)
        if m: hard = int(m.group(1)); continue
        m = re.match(r'^S\((\d),(\d)\)([RLUD])', s)
        if m:
            lv['snake'] = {'head':[int(m.group(1)),int(m.group(2))], 'direction':DIRN[m.group(3)], 'length':3}
            s = s[m.end():].lstrip(', ')
            if not s: continue
        m = re.match(r'^E\((\d),(\d)\)', s)
        if m: lv['exit'] = {'cell':[int(m.group(1)),int(m.group(2))]}; continue
        for m in re.finditer(r'\b(BF|GF|A|O|C|G|S)(\??)\((\d),(\d)\)', s):
            t, opt, x, y = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
            if t == 'BF': lv['items'].append({'type':'fruit','species':'bigfruit','cell':[x,y],'required':False})
            elif t == 'GF': lv['items'].append({'type':'fruit','species':'golden','cell':[x,y],'required':False})
            else: lv['items'].append({'type':'fruit','species':SPECIES[t],'cell':[x,y],'required':opt != '?'})
    lv['hardMoveLimit'] = hard
    # devices
    for n, c in keys.items(): lv['items'].append({'type':'key','id':'k'+n,'cell':c})
    for n, c in doors.items(): lv['devices'].append({'type':'door','id':'k'+n,'cell':c})
    for i, sw in enumerate(switches):
        gid = 'g%d' % (i+1)
        lv['devices'].append({'type':'gate','id':gid,'cell':sw['gate'],'startOpen':False})
        lv['devices'].append({'type':'switch','id':'s%d'%(i+1),'cell':sw['cell'],'gate':gid})
    for i, (k, cells) in enumerate(portals.items()):
        lv['devices'].append({'type':'portal','id':'p%d'%(i+1),'cells':cells})
    # --- difficulty column
    parts = [p.strip() for p in dif.split(';')]
    lv['difficulty'] = int(parts[0].split('/')[0])
    stars = parts[1]
    sp = [x.strip() for x in stars.split(' / ')]
    par = int(re.search(r'(\d+)', sp[1]).group(1))
    three = sp[2]
    lv['parMoves'] = par
    lv['threeText'] = three
    lv['intro'] = parts[2] if len(parts) > 2 else ''
    return lv

levels = [parse_row(l) for l in rows]
json.dump(levels, open(sys.argv[2], 'w'), indent=1, ensure_ascii=False)
print(len(levels), 'levels parsed')
for L in (5, 6, 8, 21, 22, 29, 35, 54, 75, 100):
    lv = levels[L-1]
    print(L, 'walls', len(lv['walls']), 'ice', len(lv['ice']), 'snake', lv['snake'], 'exit', lv['exit'], 'par', lv['parMoves'], 'three:', lv['threeText'], 'hard', lv['hardMoveLimit'])
    print('   items', [(i['type'], i.get('species','')[:3], tuple(i['cell']), i.get('required')) for i in lv['items']])
    print('   dev', [(d['type'], d['id'], d.get('cell') or d.get('cells')) for d in lv['devices']])
