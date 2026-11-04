"""Every prop of the 50 levels, modelled to scale (metres). Each builder returns an Asset; build.py exports GLB + preview.
Group names that are animated by the game: 'door' (hinge pivot), 'wheel', 'lever', 'grille', 'fan', 'screen'."""
import math
from lib import Asset, mat

PI = math.pi
def M():
    g = lambda *a, **k: mat(*a, **k)
    return dict(
        pg=g('paint_green', 'paint_green', .55, .3), pgr=g('paint_grey', 'paint_grey', .55, .3), pb=g('paint_blue', 'paint_blue', .55, .3), pr=g('paint_red', 'paint_red', .5, .25),
        py=g('paint_yellow', 'paint_yellow', .5, .2), pc=g('paint_cream', 'paint_cream', .7, .05), pw=g('paint_white', 'paint_white', .6, .05),
        st=g('steel', 'steel', .42, .75), ds=g('darksteel', 'darksteel', .5, .6), ru=g('rust', 'rust', .85, .3), wd=g('wood', 'wood', .8), wdd=g('wood_dark', 'wood_dark', .8),
        co=g('concrete', 'concrete', .95), rb=g('rubber', 'rubber', .9), bone=g('bone', 'bone', .8),
        dark=g('dark', None, .9, 0, color=(.015, .016, .018)), glass=g('glass', None, .05, 0, alpha=.22, color=(.55, .85, .8)), brass=g('brass', None, .35, .9, color=(.72, .55, .2)),
        led_g=g('led_g', None, .3, 0, emit=(.1, 1, .35), emit_k=6, color=(.1, .6, .2)), led_r=g('led_r', None, .3, 0, emit=(1, .1, .05), emit_k=6, color=(.7, .05, .03)),
        led_a=g('led_a', None, .3, 0, emit=(1, .65, .1), emit_k=5, color=(.8, .4, .05)), scr=g('screen', 'screen', .2, 0, emit=(.2, .9, .6), emit_k=2.2),
        tube=g('tube', None, .3, 0, emit=(1, .95, .8), emit_k=9, color=(1, .95, .85)), liq=g('liq', None, .1, 0, emit=(.2, .9, .6), emit_k=1.6, alpha=.55, color=(.2, .8, .55)),
        paper=g('paper', 'paint_cream', .95), red_flesh=g('flesh', None, .25, 0, emit=(.5, .03, .04), emit_k=.35, color=(.16, .02, .025)))

def locker():
    m = M(); a = Asset('locker'); w, d, h = .5, .5, 1.85; t = .018; col = m['pg']
    a.box('body', col, (w, t, h), (0, d / 2 - t / 2, 0.08)); a.box('body', col, (t, d, h), (-w / 2 + t / 2, 0, .08)); a.box('body', col, (t, d, h), (w / 2 - t / 2, 0, .08)); a.box('body', col, (w, d, t), (0, 0, h + .08 - t)); a.box('body', col, (w, d, t), (0, 0, .08))
    a.box('body', m['dark'], (w - .06, .01, h - .06), (0, d / 2 - .03, .1)); a.box('body', m['ds'], (w, d - .04, .06), (0, 0, .02)); 
    for x in (-.2, .2):
        for y in (-.2, .2): a.cyl('body', m['ds'], .025, .08, (x, y, 0), seg=8)
    a.box('body', m['st'], (.04, .03, h), (-w / 2 + .02, -d / 2 + .01, .08)); a.box('body', m['st'], (.04, .03, h), (w / 2 - .02, -d / 2 + .01, .08)); a.box('body', m['st'], (w, .03, .04), (0, -d / 2 + .01, h + .04)); a.box('body', m['dark'], (w - .1, .012, .24), (0, d / 2 - .035, .9), bevel=0.003)
    dw = w - .045; fy = -d / 2 + .014; a.box('door', col, (dw, .028, h - .06), (dw / 2, fy, 0), bevel=.005)
    for i in range(7): a.box('door', m['dark'], (dw * .6, .035, .014), (dw / 2, fy - .002, h - .34 - i * .042), bevel=.002)
    for i in range(5): a.box('door', m['dark'], (dw * .6, .035, .014), (dw / 2, fy - .002, .3 + i * .042), bevel=.002)
    a.box('door', m['pw'], (.1, .006, .05), (dw / 2, fy - .017, h - .18), bevel=.001); a.box('door', m['st'], (.03, .03, .1), (dw - .06, fy - .03, h * .52), bevel=.004); a.box('door', m['ds'], (.012, .03, .04), (dw - .06, fy - .04, h * .52 + .05), bevel=.003)
    for z in (.3, h * .5, h - .2): a.cyl('door', m['ds'], .012, .08, (-.005, fy - .005, z), seg=8)
    a.set_pivot('door', (-w / 2 + .022, fy, .08 + .03), pose=(0, 0, math.radians(38)))
    return a

def cabinet_wood():
    m = M(); a = Asset('cabinet_wood'); w, d, h = .95, .48, 1.55
    a.box('body', m['wd'], (w, d, .04), (0, 0, h - .04)); a.box('body', m['wd'], (w, d, .04), (0, 0, .1)); a.box('body', m['wdd'], (w, d - .04, .1), (0, .01, 0))
    a.box('body', m['wd'], (.035, d, h - .1), (-w / 2 + .0175, 0, .1)); a.box('body', m['wd'], (.035, d, h - .1), (w / 2 - .0175, 0, .1)); a.box('body', m['wdd'], (w, .02, h - .1), (0, d / 2 - .01, .1)); a.box('body', m['wd'], (.035, .04, h - .12), (0, -d / 2 + .02, .1))
    for z in (.5, .9, 1.25): a.box('body', m['wd'], (w - .07, d - .05, .025), (0, .01, z))
    for i in range(3): a.box('body', m['pc'], (.22, .2, .14), (-.28 + i * .28, .02, .5 + .025 + 0 if i != 1 else .53), bevel=.004)
    dw = w / 2 - .02; a.box('door', m['wd'], (dw, .03, h - .12), (dw / 2, 0, 0), bevel=.006); a.box('door', m['wdd'], (dw - .14, .012, h - .26), (dw / 2, -.01, .0 + .07 - .0), bevel=.004); a.cyl('door', m['brass'], .02, .03, (dw - .06, -.03, h * .5), axis='y', seg=10)
    a.set_pivot('door', (-w / 2 + .02, -d / 2 + .01, .11), pose=(0, 0, math.radians(-28))); 
    # second door fixed, closed
    a.box('body', m['wd'], (dw, .03, h - .12), (w / 2 - dw / 2 - .0, -d / 2 + .0, .11), bevel=.006); a.cyl('body', m['brass'], .02, .03, (.06, -d / 2 - .01, h * .5), axis='y', seg=10)
    return a

def alcove_shelf():
    m = M(); a = Asset('alcove_shelf'); w, d, h = .95, .5, 2.05
    for x in (-.47, .47):
        for y in (-.22, .22): a.box('body', m['ds'], (.05, .05, h), (x, y, 0), bevel=.004)
    for z in (.12, .7, 1.3, 1.95): a.box('body', m['st'], (w + .04, d, .03), (0, 0, z), bevel=.004)
    a.box('body', m['dark'], (w - .02, .02, h - .1), (0, d / 2 - .02, .05))
    a.box('body', m['wd'], (.34, .26, .3), (-.28, 0, .15), bevel=.006); a.box('body', m['wdd'], (.3, .24, .22), (.25, 0, .15), bevel=.006); a.box('body', m['pc'], (.4, .3, .04), (.2, 0, .73), rot=(0, 0, .3)); a.cyl('body', m['rb'], .09, .26, (-.22, 0, .73), seg=10)
    a.box('body', m['pb'], (.22, .16, .18), (.28, .04, 1.33), bevel=.006)
    return a

def door_frame(a, m, w=1.05, h=2.2, mat_='ds'):
    for x in (-w / 2, w / 2): a.box('frame', m[mat_], (.07, .2, h), (x, 0, 0), bevel=.006)
    a.box('frame', m[mat_], (w + .07, .2, .08), (0, 0, h), bevel=.006);

def door_leaf(a, m, col, w=.98, h=2.14, thick=.05, lever=True, window=False, kick=True, hinge=-1):
    x0 = -w / 2 if hinge < 0 else w / 2; sgn = 1 if hinge < 0 else -1
    a.box('door', m[col], (w, thick, h), (x0 + sgn * w / 2, 0, 0), bevel=.007)
    a.box('door', m[col], (w - .2, .008, h - .4), (x0 + sgn * w / 2, -thick / 2 - .002, .2), bevel=.004)
    if kick: a.box('door', m['st'], (w - .06, .01, .22), (x0 + sgn * w / 2, -thick / 2 - .004, .05), bevel=.003)
    if window: a.box('door', m['glass'], (.3, .02, .46), (x0 + sgn * w / 2, 0, 1.3), bevel=.004); a.box('door', m['ds'], (.34, .04, .5), (x0 + sgn * w / 2, 0, 1.28), bevel=.005)
    for z in (.3, 1.05, 1.8): a.cyl('door', m['ds'], .02, .1, (x0 + sgn * .01, 0, z), seg=8)
    if lever:
        a.box('door', m['st'], (.06, .02, .12), (x0 + sgn * (w - .09), -thick / 2 - .012, 1.0), bevel=.004); a.box('door', m['st'], (.14, .025, .028), (x0 + sgn * (w - .13), -thick / 2 - .03, 1.04), bevel=.005)
    a.set_pivot('door', (x0, 0, 0), pose=(0, 0, math.radians(-30 * (1 if hinge < 0 else -1))))

def door_plain():
    m = M(); a = Asset('door_plain'); door_frame(a, m); door_leaf(a, m, 'pc'); a.box('door', m['pw'], (.12, .006, .05), (0.0 + .49 - .0, -.03, 1.9), bevel=.001); return a
def door_keycard():
    m = M(); a = Asset('door_keycard'); door_frame(a, m); door_leaf(a, m, 'pgr')
    a.box('frame', m['ds'], (.1, .05, .2), (.64, -.08, 1.05), bevel=.006); a.box('frame', m['led_r'], (.03, .01, .03), (.64, -.112, 1.2)); a.box('frame', m['dark'], (.06, .01, .02), (.64, -.113, 1.1)); a.box('frame', m['scr'], (.05, .01, .035), (.64, -.113, 1.04)); return a
def door_steel():
    m = M(); a = Asset('door_steel'); door_frame(a, m, 1.2, 2.3, 'st'); door_leaf(a, m, 'ds', 1.1, 2.24, .12, lever=False, kick=False)
    for i in range(10):
        for j in range(2): a.cyl('door', m['st'], .018, .02, (-.0 + .05 + i * .106 if False else .06 + i * .104, -.07, .08 + j * 2.06), axis='y', seg=8)
    a.box('door', m['py'], (1.0, .01, .16), (.55, -.066, 1.55), rot=(0, 0, 0), bevel=.002); a.ring('door', m['st'], .17, .045, (.55, -.12, 1.05), axis='y', n=12, depth=.05)
    for i in range(4): a.box('door', m['st'], (.026, .05, .34), (.55 + math.cos(i * PI / 2) * .0, -.12, 1.05), rot=(0, i * PI / 2 * 0 + (0 if i % 2 == 0 else PI / 2), 0), center=True, bevel=.003) if False else None
    a.box('door', m['st'], (.36, .04, .03), (.55, -.12, 1.05 + .0), center=True, bevel=.003); a.box('door', m['st'], (.03, .04, .36), (.55, -.12, 1.05), center=True, bevel=.003); a.cyl('door', m['ds'], .05, .08, (.55, -.07, 1.05), axis='y', seg=10); return a
def door_exit():
    m = M(); a = Asset('door_exit'); door_frame(a, m, 1.1, 2.2, 'pg'); door_leaf(a, m, 'pg', 1.0, 2.14, .05, lever=False); a.box('door', m['st'], (.8, .04, .04), (.5, -.045, 1.0), bevel=.006)
    a.box('frame', m['pg'], (.7, .08, .24), (0, -.12, 2.3), bevel=.008); a.box('frame', m['scr'], (.62, .01, .17), (0, -.165, 2.335), bevel=.002); a.box('frame', m['led_g'], (.5, .006, .02), (0, -.17, 2.31)); return a
def door_lab():
    m = M(); a = Asset('door_lab'); door_frame(a, m, 1.4, 2.2, 'pw'); door_leaf(a, m, 'pw', .68, 2.14, .045, lever=True, window=True, hinge=-1); a.box('frame', m['pw'], (.04, .05, 2.14), (.0, 0, 0), bevel=.004)
    a.box('frame', m['pw'], (.68, .045, 2.14), (.34, 0, 0), bevel=.007); a.box('frame', m['glass'], (.3, .02, .46), (.34, 0, 1.3)); a.box('frame', m['ds'], (.34, .04, .5), (.34, 0, 1.28), bevel=.005); a.box('frame', m['py'], (.3, .008, .3), (.34, -.03, 1.9), bevel=.001); return a

def vent_wall():
    m = M(); a = Asset('vent_wall'); w, h = .8, .6
    a.box('body', m['dark'], (w, .3, h), (0, .1, 0)); a.box('body', m['ds'], (w + .1, .05, .06), (0, -.02, h), bevel=.004); a.box('body', m['ds'], (w + .1, .05, .06), (0, -.02, -.06), bevel=.004)
    for x in (-w / 2 - .03, w / 2 + .03): a.box('body', m['ds'], (.06, .05, h + .12), (x, -.02, -.06), bevel=.004)
    a.box('grille', m['st'], (w, .02, h), (0, -.03, 0), bevel=.003)
    for i in range(9): a.box('grille', m['ds'], (w - .06, .035, .03), (0, -.045, .05 + i * .06), rot=(.5, 0, 0), bevel=.002)
    for x in (-w / 2 + .04, w / 2 - .04):
        for z in (.04, h - .08): a.cyl('grille', m['brass'], .014, .02, (x, -.05, z), axis='y', seg=8)
    a.set_pivot('grille', (-w / 2, -.03, 0), pose=(0, 0, math.radians(-18))); return a

def generator():
    m = M(); a = Asset('generator')
    a.box('body', m['ds'], (1.3, .8, .08), (0, 0, .1), bevel=.01); 
    for x in (-.55, .55): a.box('body', m['ds'], (.08, .8, .1), (x, 0, 0), bevel=.008)
    a.box('body', m['py'], (1.15, .68, .62), (0, 0, .18), bevel=.02); a.box('body', m['ds'], (1.18, .7, .06), (0, 0, .8), bevel=.01); a.box('body', m['st'], (.5, .3, .22), (-.3, .1, .86), bevel=.02)
    a.cyl('body', m['st'], .12, .34, (.35, .15, .86), seg=14); a.cyl('body', m['ds'], .05, .5, (.35, .15, 1.2), seg=10); a.cyl('body', m['ds'], .1, .02, (.35, .15, 1.68), seg=12)
    a.box('body', m['pr'], (.4, .3, .3), (.35, -.2, .86), bevel=.02); a.cyl('body', m['ds'], .02, .1, (.35, -.2, 1.16), seg=8)
    a.box('body', m['ds'], (.7, .06, .4), (-.15, -.37, .42), bevel=.008); a.box('body', m['scr'], (.16, .01, .12), (-.3, -.408, .62)); a.box('body', m['led_g'], (.04, .01, .04), (-.05, -.408, .66)); a.box('body', m['led_r'], (.04, .01, .04), (.05, -.408, .66))
    for i in range(3): a.cyl('body', m['dark'], .035, .02, (-.3 + i * .15, -.41, .46), axis='y', seg=10); a.cyl('body', m['pw'], .012, .015, (-.3 + i * .15, -.425, .46), axis='y', seg=6)
    for x in (.32, .62): a.cyl('body', m['dark'], .025, .5, (x, -.15, .1), axis='x', seg=8, rot=(0, 0, 0)) if False else None
    a.box('body', m['ds'], (.06, .04, .3), (.5, -.37, .3)); a.cyl('body', m['rb'], .02, 1.0, (.58, -.42, .1), axis='x', seg=8)
    a.box('lever', m['pr'], (.04, .04, .2), (0, 0, 0), bevel=.006); a.box('lever', m['ds'], (.06, .05, .05), (0, 0, .2), bevel=.006); a.set_pivot('lever', (.58, -.4, .72), pose=(math.radians(30), 0, 0)); return a

def breaker_panel():
    m = M(); a = Asset('breaker_panel'); w, h = .62, .86
    a.box('body', m['pgr'], (w, .02, h), (0, .09, 0)); a.box('body', m['pgr'], (.02, .1, h), (-w / 2 + .01, .04, 0)); a.box('body', m['pgr'], (.02, .1, h), (w / 2 - .01, .04, 0)); a.box('body', m['pgr'], (w, .1, .02), (0, .04, h - .02)); a.box('body', m['pgr'], (w, .1, .02), (0, .04, 0)); a.box('body', m['dark'], (w - .06, .01, h - .06), (0, .075, .03))
    for r in range(3):
        for c in range(5): a.box('body', m['ds'], (.07, .05, .1), (-.2 + c * .1, .04, .12 + r * .17), bevel=.004); a.box('body', m['pw'], (.025, .02, .04), (-.2 + c * .1, .02, .15 + r * .17), bevel=.002); a.box('body', m['led_r' if (r + c) % 4 == 0 else 'led_g'], (.02, .012, .014), (-.2 + c * .1, .02, .24 + r * .17 - .02))
    a.box('lever', m['ds'], (.1, .05, .06), (0, 0, 0), bevel=.005); a.box('lever', m['pr'], (.04, .04, .22), (0, 0, 0), bevel=.006); a.box('lever', m['pr'], (.07, .05, .06), (0, 0, .2), bevel=.006); a.set_pivot('lever', (0, -.015, .78 - .0), pose=(math.radians(-35), 0, 0)) if False else a.set_pivot('lever', (0, -.01, .08), pose=(math.radians(-35), 0, 0))
    dw = w - .02; a.box('door', m['pgr'], (dw, .02, h - .02), (dw / 2, 0, 0), bevel=.005); a.box('door', m['py'], (.14, .006, .14), (dw / 2, -.012, h - .2), bevel=.001); a.box('door', m['ds'], (.03, .03, .1), (dw - .06, -.02, h * .5), bevel=.004)
    a.set_pivot('door', (-w / 2, -.04, .01), pose=(0, 0, math.radians(-70))); return a

def valve_wheel():
    m = M(); a = Asset('valve_wheel')
    a.cyl('body', m['st'], .09, 1.3, (-.65, 0, .6), axis='x', seg=16)
    for x in (-.45, .45): a.cyl('body', m['ds'], .14, .05, (x, 0, .6), axis='x', seg=16)
    a.box('body', m['pr'], (.26, .2, .22), (0, 0, .5), bevel=.02); a.cyl('body', m['st'], .035, .3, (0, 0, .72), seg=10); a.cyl('body', m['ds'], .06, .05, (0, 0, .7), seg=10)
    for x in (-.5, .5): a.box('body', m['ds'], (.18, .22, .1), (x, 0, 0), bevel=.01); a.box('body', m['st'], (.06, .06, .5), (x, 0, .08), bevel=.004)
    a.ring('wheel', m['pr'], .2, .03, (0, 0, .98), axis='z', n=14, depth=.04)
    for k in range(3): a.box('wheel', m['pr'], (.4, .03, .035), (0, 0, .98), rot=(0, 0, k * PI / 3), center=True, bevel=.004)
    a.cyl('wheel', m['ds'], .045, .07, (0, 0, .945), seg=10)
    a.set_pivot('wheel', (0, 0, .98)); return a

def keypad_panel():
    m = M(); a = Asset('keypad_panel'); w, h = .24, .34
    a.box('body', m['ds'], (w, .05, h), (0, 0, 0), bevel=.01); a.box('body', m['dark'], (w - .04, .01, h - .04), (0, -.026, .02), bevel=.004); a.box('body', m['scr'], (.18, .008, .06), (0, -.03, h - .12), bevel=.002)
    for r in range(4):
        for c in range(3): a.box('body', m['pgr'], (.045, .012, .036), (-.058 + c * .058, -.034, .045 + (3 - r) * .045), bevel=.004)
    a.box('body', m['led_r'], (.02, .01, .02), (-.07, -.034, h - .035)); a.box('body', m['led_g'], (.02, .01, .02), (.07, -.034, h - .035)); return a

def shelf_metal():
    m = M(); a = Asset('shelf_metal'); w, d, h = 1.2, .45, 1.9
    for x in (-w / 2, w / 2):
        for y in (-d / 2, d / 2): a.box('body', m['pb'], (.04, .04, h), (x, y, 0), bevel=.004)
    for z in (.15, .62, 1.1, 1.58): a.box('body', m['st'], (w, d, .025), (0, 0, z), bevel=.004)
    for i, (x, z, c) in enumerate([(-.4, .175, 'pc'), (.0, .175, 'wd'), (.35, .175, 'pc'), (-.3, .645, 'pw'), (.2, .645, 'wd'), (-.1, 1.125, 'pc'), (.38, 1.125, 'pr'), (-.38, 1.605, 'pc')]):
        a.box('body', m[c], (.28 + (i % 3) * .04, .3, .22 + (i % 2) * .08), (x, 0, z), rot=(0, 0, (i % 3 - 1) * .08), bevel=.006)
    a.cyl('body', m['rb'], .07, .24, (.45, .05, 1.625), seg=10); return a

def crate_wood():
    m = M(); a = Asset('crate_wood'); s = .8
    for x in (-s / 2 + .04, s / 2 - .04):
        for y in (-s / 2 + .04, s / 2 - .04): a.box('body', m['wdd'], (.08, .08, s), (x, y, 0), bevel=.006)
    for i in range(4):
        z = .06 + i * .19
        for f in range(2): a.box('body', m['wd'], (s, .025, .17), (0, (-1 if f else 1) * (s / 2 - .012), z), bevel=.004); a.box('body', m['wd'], (.025, s - .02, .17), ((-1 if f else 1) * (s / 2 - .012), 0, z), bevel=.004)
    a.box('body', m['wdd'], (s - .02, s - .02, .04), (0, 0, s), bevel=.006); a.box('body', m['pc'], (.22, .005, .14), (.1, -s / 2 - .004, .45), bevel=.001); return a

def barrel():
    m = M(); a = Asset('barrel'); a.cyl('body', m['pb'], .29, .88, (0, 0, 0), seg=20, scale=.6)
    for z in (.1, .44, .76): a.cyl('body', m['ds'], .305, .035, (0, 0, z), seg=20)
    a.cyl('body', m['ds'], .27, .02, (0, 0, .88), seg=20); a.cyl('body', m['st'], .045, .03, (.1, .08, .9), seg=10); a.cyl('body', m['st'], .03, .03, (-.12, -.06, .9), seg=8); a.box('body', m['py'], (.2, .005, .2), (0, -.29, .5), rot=(0, 0, 0), bevel=.001); return a

def desk_office():
    m = M(); a = Asset('desk_office'); w, d, h = 1.5, .75, .76
    a.box('body', m['wd'], (w, d, .04), (0, 0, h - .04), bevel=.006); a.box('body', m['wdd'], (.5, d - .08, h - .08), (-w / 2 + .3, 0, 0), bevel=.006); a.box('body', m['wdd'], (.04, d - .08, h - .08), (w / 2 - .06, 0, 0), bevel=.006); a.box('body', m['wdd'], (w - .1, .02, .5), (0, d / 2 - .06, .22))
    for i in range(3): a.box('body', m['pgr'], (.44, .015, .18), (-w / 2 + .3, -d / 2 + .035, .08 + i * .22), bevel=.004); a.box('body', m['st'], (.1, .02, .02), (-w / 2 + .3, -d / 2 + .02, .15 + i * .22))
    a.box('body', m['pgr'], (.38, .22, .34), (.12, .0, h), bevel=.01); a.box('body', m['pgr'], (.3, .24, .3), (.12, .08, h + .0)) if False else None; a.box('body', m['scr'], (.3, .01, .24), (.12, -.115, h + .06), bevel=.002); a.box('body', m['pgr'], (.1, .1, .06), (.12, .0, h - .0 - .0), bevel=.004) if False else None
    a.box('body', m['pgr'], (.4, .14, .02), (.12, -.2, h), bevel=.004); a.box('body', m['paper'], (.3, .22, .01), (-.2, -.1, h), rot=(0, 0, .4)); a.cyl('body', m['ds'], .06, .02, (-.5, .15, h), seg=10); a.cyl('body', m['st'], .01, .3, (-.5, .15, h), seg=6); a.box('body', m['tube'], (.1, .06, .04), (-.5, .08, h + .3), bevel=.008); return a

def chair_office():
    m = M(); a = Asset('chair_office')
    for i in range(5):
        ang = i * 2 * PI / 5; a.box('body', m['ds'], (.3, .045, .03), (math.cos(ang) * .15, math.sin(ang) * .15, .06), rot=(0, 0, ang), center=False, bevel=.004); a.cyl('body', m['rb'], .03, .04, (math.cos(ang) * .3, math.sin(ang) * .3, .0), seg=8)
    a.cyl('body', m['st'], .03, .35, (0, 0, .08), seg=8); a.box('body', m['pb'], (.46, .44, .08), (0, 0, .42), bevel=.02); a.box('body', m['pb'], (.44, .07, .5), (0, .21, .5), rot=(-.1, 0, 0), bevel=.02)
    for s in (-1, 1): a.box('body', m['ds'], (.04, .3, .03), (s * .25, -.02, .6), bevel=.005); a.box('body', m['ds'], (.03, .03, .2), (s * .25, -.02, .43))
    return a

def filing_cabinet():
    m = M(); a = Asset('filing_cabinet'); w, d, h = .46, .62, 1.32; a.box('body', m['pgr'], (w, d, h), (0, 0, 0), bevel=.01)
    for i in range(4): a.box('body', m['pgr'], (w - .03, .02, .3), (0, -d / 2 - .005, .02 + i * .325), bevel=.005); a.box('body', m['dark'], (.16, .02, .028), (0, -d / 2 - .02, .24 + i * .325), bevel=.003); a.box('body', m['pw'], (.1, .006, .04), (0, -d / 2 - .016, .3 + i * .325 - .0))
    return a

def server_rack():
    m = M(); a = Asset('server_rack'); w, d, h = .62, .9, 2.0; a.box('body', m['ds'], (w, d, h), (0, 0, 0), bevel=.01); a.box('body', m['dark'], (w - .08, .02, h - .1), (0, -d / 2 - .005, .05))
    for i in range(10):
        z = .1 + i * .185; a.box('body', m['pgr'], (w - .1, .06, .15), (0, -d / 2 - .035, z), bevel=.004); 
        for j in range(5): a.box('body', m['led_g' if (i + j) % 3 else 'led_a'], (.014, .01, .014), (-.2 + j * .03, -d / 2 - .067, z + .12))
        a.box('body', m['dark'], (.3, .01, .06), (.07, -d / 2 - .067, z + .05))
    return a

def hospital_bed():
    m = M(); a = Asset('hospital_bed'); w, l = .9, 2.0
    for x in (-w / 2 + .05, w / 2 - .05):
        for y in (-l / 2 + .1, l / 2 - .1): a.cyl('body', m['ds'], .04, .12, (x, y, 0), seg=8); a.cyl('body', m['st'], .02, .45, (x, y, .12), seg=8)
    a.box('body', m['st'], (w, l, .05), (0, 0, .5), bevel=.006); a.box('body', m['pw'], (w - .06, l - .06, .14), (0, 0, .55), bevel=.03); a.box('body', m['pb'], (w - .08, .65, .03), (0, .1, .69), rot=(0, 0, 0))
    for s in (-1, 1): a.box('body', m['st'], (.025, l * .6, .05), (s * (w / 2), -.15, .72)); a.box('body', m['st'], (.025, l * .6, .05), (s * (w / 2), -.15, .86))
    a.box('body', m['st'], (w, .04, .3), (0, -l / 2, .6), bevel=.006); a.box('body', m['st'], (w, .04, .4), (0, l / 2, .6), bevel=.006); a.box('body', m['pw'], (.5, .35, .1), (0, .72, .69), bevel=.03); a.cyl('body', m['st'], .015, 1.6, (w / 2 + .1, -l / 2 + .15, 0), seg=6) ; a.box('body', m['pw'], (.12, .02, .2), (w / 2 + .1, -l / 2 + .15, 1.4)) ; return a

def specimen_tank():
    m = M(); a = Asset('specimen_tank'); a.cyl('body', m['ds'], .55, .25, (0, 0, 0), seg=20); a.box('body', m['dark'], (.5, .02, .12), (0, -.55, .06)); a.cyl('body', m['liq'], .5, 1.6, (0, 0, .25), seg=20); a.cyl('body', m['glass'], .52, 1.62, (0, 0, .24), seg=20); a.cyl('body', m['ds'], .56, .12, (0, 0, 1.86), seg=20); a.cyl('body', m['st'], .15, .25, (0, 0, 1.98), seg=12)
    for k in range(3): a.cyl('body', m['ds'], .03, .5, (math.cos(k * 2.1) * .45, math.sin(k * 2.1) * .45, 1.98), seg=6)
    a.sphere('body', m['dark'], .28, (0, .0, 1.0), seg=12, sx=.8, sz=1.5); a.sphere('body', m['dark'], .16, (.1, .0, 1.62), seg=10); a.box('body', m['py'], (.3, .01, .1), (0, -.559, .14), bevel=.001); return a

def console_terminal():
    m = M(); a = Asset('console_terminal'); w = 1.4; a.box('body', m['pgr'], (w, .7, .7), (0, 0, 0), bevel=.012); a.box('body', m['ds'], (w - .1, .5, .05), (0, -.05, .72), rot=(.35, 0, 0), bevel=.006)
    for i in range(3): a.box('body', m['pgr'], (.38, .06, .32), (-.48 + i * .48, .22, .95), rot=(.0, 0, 0), bevel=.01); a.box('body', m['scr'], (.32, .01, .26), (-.48 + i * .48, .185, .98)) if False else a.box('body', m['scr'], (.32, .01, .26), (-.48 + i * .48, .19, .98), bevel=.002)
    for r in range(3):
        for c in range(14): a.box('body', m['led_g' if (r * 3 + c) % 5 else 'led_a'], (.03, .02, .02), (-.6 + c * .092, -.2 + r * .09, .74 + r * .03), rot=(.35, 0, 0), center=False)
    a.box('body', m['dark'], (w - .2, .01, .5), (0, -.355, .08)); return a

def pipe_cluster():
    m = M(); a = Asset('pipe_cluster'); 
    for i, (x, z, r, c) in enumerate([(-.2, .0, .11, 'st'), (.05, .0, .08, 'ru'), (.28, .0, .06, 'pr')]):
        a.cyl('body', m[c], r, 2.4, (x, 0, 0), seg=14, scale=.6)
    for z in (.3, 1.2, 2.1): a.box('body', m['ds'], (.7, .09, .06), (.03, .0, z), bevel=.006)
    for z in (.7, 1.7): a.cyl('body', m['ds'], .13, .06, (-.2, 0, z), seg=14); a.cyl('body', m['ds'], .1, .06, (.05, 0, z + .1), seg=14)
    a.cyl('body', m['pr'], .02, .3, (-.2, -.12, 1.0), axis='y', seg=6); a.cyl('body', m['pr'], .06, .03, (-.2, -.28, 1.0), axis='y', seg=12); return a

def lamp_fluorescent():
    m = M(); a = Asset('lamp_fluorescent'); a.box('body', m['pgr'], (1.25, .18, .06), (0, 0, .0), bevel=.008); a.box('body', m['tube'], (1.15, .05, .04), (0, 0, -.03), bevel=.01); a.box('body', m['tube'], (1.15, .05, .04), (0, .0, -.03)) if False else None
    for x in (-.5, .5): a.box('body', m['ds'], (.02, .02, .35), (x, 0, .06)); return a
def lamp_caged():
    m = M(); a = Asset('lamp_caged'); a.box('body', m['ds'], (.2, .05, .2), (0, 0, 0), bevel=.01); a.cyl('body', m['ds'], .06, .05, (0, -.05, .1), axis='y', seg=12); a.sphere('body', m['tube'], .06, (0, -.11, .1), seg=10)
    for k in range(6): ang = k * PI / 3; a.box('body', m['ds'], (.01, .01, .14), (math.cos(ang) * .075, -.12, .1 + math.sin(ang) * .075), rot=(0, 0, 0), center=True, bevel=.002)
    a.cyl('body', m['ds'], .085, .015, (0, -.17, .1), axis='y', seg=12); return a

def egg_pod():
    m = M(); a = Asset('egg_pod'); a.sphere('body', m['red_flesh'], .4, (0, 0, .5), seg=14, sz=1.3, sx=.9, sy=.9)
    for i in range(6): ang = i * PI / 3; a.cyl('body', m['ru'], .05, .6, (math.cos(ang) * .3, math.sin(ang) * .3, 0), seg=6, r2=.015, rot=(math.cos(ang) * .5, math.sin(ang) * .5, 0))
    a.cyl('body', m['dark'], .5, .06, (0, 0, 0), seg=14); a.sphere('body', m['dark'], .12, (0, -.0, .6), seg=8); return a
def bone_pile():
    m = M(); a = Asset('bone_pile')
    for i in range(7):
        x, y = math.cos(i * 1.1) * .22, math.sin(i * 1.9) * .18; L = .45 + (i % 3) * .1; rz = i * .8
        a.cyl('body', m['bone'], .018, L, (x, y, .03), axis='x', seg=6, rot=(0, 0, rz)); 
        for s in (-1, 1): a.sphere('body', m['bone'], .03, (x + math.cos(rz) * s * L / 2, y + math.sin(rz) * s * L / 2, .03), seg=6)
    a.sphere('body', m['bone'], .12, (.05, -.05, .13), seg=10, sz=1.05); a.box('body', m['bone'], (.1, .08, .05), (.05, -.12, .06), bevel=.01); a.sphere('body', m['dark'], .035, (.0, -.15, .15), seg=6); a.sphere('body', m['dark'], .035, (.1, -.15, .15), seg=6)
    for k in range(5): a.box('body', m['bone'], (.2, .018, .018), (-.18 + k * .035, .12 + k * .01, .06 + k * .015), rot=(0, .2 * k, .5), center=True, bevel=.004)
    return a

def rubble():
    m = M(); a = Asset('rubble')
    for i in range(10): a.box('body', m['co'], (.25 + (i % 3) * .12, .2 + (i % 4) * .07, .15 + (i % 2) * .12), (math.cos(i * 1.3) * .35, math.sin(i * 2.1) * .3, (i % 3) * .06), rot=(i * .3, i * .5, i * .8), bevel=.012)
    a.box('body', m['st'], (.04, .04, .9), (.1, .1, .2), rot=(.9, .3, .2)); return a
def fallen_shelf():
    a = shelf_metal(); a.name = 'fallen_shelf'; return a
def cctv_camera():
    m = M(); a = Asset('cctv_camera'); a.box('body', m['ds'], (.1, .03, .14), (0, 0, 0), bevel=.006); a.cyl('body', m['st'], .02, .18, (0, -.01, .07), axis='y', seg=8)
    a.box('body', m['pgr'], (.11, .3, .1), (0, -.3, .02), rot=(.1, 0, 0), bevel=.012); a.cyl('body', m['dark'], .045, .03, (0, -.46, .07), axis='y', seg=12); a.box('body', m['dark'], (.12, .12, .01), (0, -.34, .125), bevel=.002); a.box('body', m['led_r'], (.012, .012, .012), (.045, -.43, .1)); return a

def pump_unit():
    m = M(); a = Asset('pump_unit'); a.box('body', m['ds'], (1.0, .6, .1), (0, 0, 0), bevel=.01); a.cyl('body', m['pb'], .22, .5, (.2, 0, .1), axis='x', seg=16); a.cyl('body', m['st'], .3, .35, (-.2, 0, .1), seg=16); a.cyl('body', m['pb'], .25, .1, (-.2, 0, .45), seg=16); a.cyl('body', m['ds'], .08, .4, (-.2, 0, .55), seg=10); a.cyl('body', m['st'], .1, .5, (-.5, 0, .2), axis='y', seg=10) ; a.box('body', m['pr'], (.1, .1, .08), (.2, 0, .46)); return a

def item_key():
    m = M(); a = Asset('item_key'); a.ring('body', m['brass'], .035, .013, (0, 0, .03), axis='y', n=12, depth=.012); a.box('body', m['brass'], (.013, .012, .13), (0, 0, .03 - .035 - .13), bevel=.002, center=False) if False else a.box('body', m['brass'], (.013, .012, .13), (0, 0, -.13 + .03 - .0), bevel=.002, center=False) if False else a.box('body', m['brass'], (.013, .012, .12), (0, 0, .0), bevel=.002); a.box('body', m['brass'], (.032, .012, .02), (.02, 0, .01)); a.box('body', m['brass'], (.025, .012, .02), (.016, 0, .04)); a.box('body', m['brass'], (.025, .012, .02), (.016, 0, .07)); return a

def item_keycard():
    m = M(); a = Asset('item_keycard'); a.box('body', m['pb'], (.085, .002, .054), (0, 0, 0), bevel=.001); a.box('body', m['dark'], (.085, .0025, .012), (0, 0, .01)); a.box('body', m['brass'], (.016, .003, .012), (-.024, 0, -.014)); return a
def item_fuse():
    m = M(); a = Asset('item_fuse'); a.cyl('body', m['glass'], .01, .06, (0, 0, 0), axis='y' if False else 'x', seg=10); a.cyl('body', m['brass'], .011, .015, (-.04, 0, 0), axis='x', seg=10); a.cyl('body', m['brass'], .011, .015, (.04, 0, 0), axis='x', seg=10); return a
def item_radio():
    m = M(); a = Asset('item_radio'); a.box('body', m['pgr'], (.07, .035, .13), (0, 0, 0), bevel=.008); a.cyl('body', m['ds'], .004, .12, (.025, 0, .13), seg=5); a.box('body', m['scr'], (.04, .004, .025), (0, -.018, .09)); a.cyl('body', m['dark'], .014, .006, (0, -.018, .045), axis='y', seg=8); a.cyl('body', m['led_r'], .005, .005, (-.02, -.018, .11), axis='y', seg=6); return a
def item_bandage():
    m = M(); a = Asset('item_bandage'); a.cyl('body', m['pw'], .03, .04, (0, 0, 0), seg=14); a.cyl('body', m['pc'], .018, .042, (0, 0, -.001), seg=10); a.box('body', m['pr'], (.03, .042, .01), (0, 0, .02), center=True, bevel=.001); return a
def item_medkit():
    m = M(); a = Asset('item_medkit'); a.box('body', m['pw'], (.26, .1, .18), (0, 0, 0), bevel=.012); a.box('body', m['pr'], (.1, .006, .03), (0, -.052, .09), center=True); a.box('body', m['pr'], (.03, .006, .1), (0, -.052, .09), center=True); a.box('body', m['ds'], (.1, .02, .02), (0, 0, .18)); return a
def item_note():
    m = M(); a = Asset('item_note'); a.box('body', m['paper'], (.2, .28, .004), (0, 0, 0), rot=(0, 0, .2), bevel=.001)
    for i in range(7): a.box('body', m['dark'], (.14, .004, .001), (0, .0, .004), center=False) if False else a.box('body', m['dark'], (.14 - (i % 3) * .02, .006, .0015), (-.0, -.1 + i * .028, .0042), rot=(0, 0, .2), center=True)
    return a

ALL = [locker, cabinet_wood, alcove_shelf, door_plain, door_keycard, door_steel, door_exit, door_lab, vent_wall, generator, breaker_panel, valve_wheel, keypad_panel, shelf_metal, crate_wood, barrel, desk_office, chair_office, filing_cabinet, server_rack, hospital_bed, specimen_tank, console_terminal, pipe_cluster, lamp_fluorescent, lamp_caged, egg_pod, bone_pile, rubble, fallen_shelf, cctv_camera, pump_unit, item_key, item_keycard, item_fuse, item_radio, item_bandage, item_medkit, item_note]
