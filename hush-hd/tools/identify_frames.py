#!/usr/bin/env python3
"""Names unnamed frame PNGs by matching their silhouettes against the frames already in assets/atlas.json (optimal 1-1 assignment).
usage: identify_frames.py <out_dir> img1.png img2.png ...   -> out_dir/<ID>.png  (ID = Run,S1..S9,C1..,W..,Y..,X..,U..,A..,R..)"""
import sys, os, json, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.optimize import linear_sum_assignment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_sprites_from_zip as bz
S = 96
def norm_mask(m):
    ys, xs = np.where(m); m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape; s = max(h, w); pad = np.zeros((s, s), bool); pad[:h, :w] = m
    return np.array(Image.fromarray((pad * 255).astype(np.uint8)).resize((S, S), Image.BILINEAR)) > 127, w / h
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
meta = json.load(open(os.path.join(root, 'assets/atlas.json')))
refs = []
for sheet, (ids, cols, *_r) in bz.SHEETS.items():
    m = meta[sheet]; im = np.array(Image.open(os.path.join(root, 'assets', m['src'])).convert('RGBA'))
    for j, fid in enumerate(ids):
        c = im[(j // m['cols']) * m['h']:(j // m['cols'] + 1) * m['h'], (j % m['cols']) * m['w']:(j % m['cols'] + 1) * m['w'], 3] > 16
        refs.append((fid, *norm_mask(c)))
files = sys.argv[2:]; masks = []
for f in files:
    a = bz.key_out_white(Image.open(f)); masks.append(norm_mask(a[..., 3] > 60))
C = np.zeros((len(files), len(refs)))
for i, (m, ar) in enumerate(masks):
    for j, (fid, rm, rar) in enumerate(refs):
        iou = (m & rm).sum() / max(1, (m | rm).sum()); C[i, j] = -(iou - 0.15 * abs(np.log(ar / rar)))
r, c = linear_sum_assignment(C)
os.makedirs(sys.argv[1], exist_ok=True); bad = 0
for i, j in zip(r, c):
    srt = np.sort(-C[i])[::-1]; print('%-28s -> %-4s score %.3f (2nd best %.3f)' % (os.path.basename(files[i]), refs[j][0], -C[i, j], srt[1])); bad += (-C[i, j] < 0.6)
    shutil.copy(files[i], os.path.join(sys.argv[1], refs[j][0] + '.png'))
print('low-confidence matches:', bad)
