"""In-between frame synthesis for walk cycles (optical-flow morph).
mid(A, B): estimate dense flow A->B and B->A on the alpha-weighted colour image, warp both halfway, blend (premultiplied alpha).
Used by build_sprites_from_zip.py to double the frame rate of the run / crouch-walk / monster-run loops (9 -> 18 poses per cycle ...)."""
import numpy as np, cv2

def _prep(rgba):
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    pm = rgba[..., :3].astype(np.float32) * a                      # premultiplied colour
    grey = cv2.cvtColor(np.clip(pm + 40 * (1 - a), 0, 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)   # silhouette shows up against a mid-grey ground
    return pm, a[..., 0], grey

def _flow(g1, g2, scale=0.5):
    h, w = g1.shape; s1 = cv2.resize(g1, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA); s2 = cv2.resize(g2, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); dis.setUseSpatialPropagation(True)
    f = dis.calc(s1, s2, None) / scale
    return cv2.resize(f, (w, h), interpolation=cv2.INTER_LINEAR)

def _warp(img, flow, t):
    h, w = flow.shape[:2]; gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(img, gx - flow[..., 0] * t, gy - flow[..., 1] * t, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)

def mid(A, B, t=0.5):
    pa, aa, ga = _prep(A); pb, ab, gb = _prep(B)
    fab = _flow(ga, gb); fba = _flow(gb, ga)
    wa = _warp(np.dstack([pa, aa]), fab, t)                        # A moved toward B
    wb = _warp(np.dstack([pb, ab]), fba, 1 - t)                    # B moved back toward A
    m = wa * (1 - t) + wb * t
    alpha = np.clip(m[..., 3], 0, 1)
    rgb = np.where(alpha[..., None] > 1e-3, m[..., :3] / np.maximum(alpha[..., None], 1e-3), 0)
    # sharpen the matte a little: blending two half-transparent silhouettes otherwise leaves a soft ghost
    alpha = np.clip((alpha - 0.5) * 1.6 + 0.5, 0, 1)
    return np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
