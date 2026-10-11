"""ChatGPT 產生的角色動畫表（2x2，四格）→ public/art/anim/{角色}/{動作}_{0..3}.webp

用法：python3 -I scripts/anim-frames.py <放 {角色}__{動作}.png 的資料夾>

處理步驟：
1. 依透明度投影找出 2x2 的切割線，切成四格（假透明的棋盤格背景會先去掉）。
2. 同一個角色的所有動作用同一個縮放比例（以待機動作的身高為準），角色大小不會忽大忽小。
3. 每格以「腳底中心」對齊到固定錨點；跳起來的格子保留離地高度。
4. 輸出固定大小的透明畫布（CANVAS_W × CANVAS_H），錨點在 (ANCHOR_X, ANCHOR_Y)。
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'art', 'anim')
CANVAS_W, CANVAS_H = 640, 420
ANCHOR_X, ANCHOR_Y = 320, 404
IDLE_HEIGHT = 270  # 待機動作的角色身高（像素）
ACTS = ['idle', 'atk1', 'atk2', 'atk3', 'skill']
# 個別角色的大小微調（武器高舉過頭、帽子很高的角色，用外框算身高會被縮太小）
SIZE = {}


def dechecker(im: Image.Image) -> Image.Image:
    """把「畫出來的棋盤格」假透明背景變成真透明（從四邊往內，只吃掉低彩度的灰白色塊）"""
    a = np.array(im.convert('RGBA')).astype(np.int32)
    if (a[..., 3] < 20).mean() > 0.2:
        return im.convert('RGBA')
    rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    bgish = (mx - mn < 18) & (mn > 150)
    h, w = bgish.shape
    seen = np.zeros_like(bgish)
    stack = [(y, x) for y in (0, h - 1) for x in range(w)] + [(y, x) for x in (0, w - 1) for y in range(h)]
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x] or not bgish[y, x]:
            continue
        seen[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    a[..., 3][seen] = 0
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def cuts(profile, n):
    L = len(profile)
    out = [0]
    for k in range(1, n):
        c = int(k * L / n)
        r = int(L / n / 3)
        win = profile[c - r:c + r]
        low = win <= max(win.min(), profile.max() * 0.002)
        best, cur, bs, s = 0, 0, 0, 0
        for i, v in enumerate(low):
            if v:
                if cur == 0:
                    s = i
                cur += 1
                if cur > best:
                    best, bs = cur, s
            else:
                cur = 0
        out.append(c - r + bs + best // 2)
    out.append(L)
    return out


def components(m):
    """8 連通的區塊標號（純 numpy＋堆疊，給縮小過的遮罩用）"""
    h, w = m.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]:
            continue
        n += 1
        st = [(y0, x0)]
        lab[y0, x0] = n
        while st:
            y, x = st.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        st.append((yy, xx))
    return lab, n


def clean_cell(cell, r, c):
    """去掉隔壁格溢過來的特效碎片，並讓貼著格線的部分淡出（光束被格線切斷時才不會有一條硬邊）"""
    a = np.array(cell)
    al = a[..., 3].astype(np.float64)
    h, w = al.shape
    K = 4
    sh, sw = h // K, w // K
    small = al[:sh * K, :sw * K].reshape(sh, K, sw, K).max((1, 3)) > 40
    lab, n = components(small)
    if n > 1:
        dark = ((a[..., 3] > 200) & (a[..., :3].max(-1) < 90))[:sh * K, :sw * K].reshape(sh, K, sw, K).any((1, 3))
        sizes = np.bincount(lab.ravel(), weights=dark.ravel().astype(np.float64), minlength=n + 1)
        main = int(sizes[1:].argmax()) + 1
        edges = {'l': lab[:, 0], 'r': lab[:, -1], 't': lab[0, :], 'b': lab[-1, :]}
        inner = ('r' if c == 0 else 'l') + ('b' if r == 0 else 't')
        drop = set()
        for e in inner:
            drop |= set(np.unique(edges[e])) - {0, main}
        if drop:
            kill = np.isin(lab, list(drop)).repeat(K, 0).repeat(K, 1)
            al[:sh * K, :sw * K][kill] = 0
    f = 0.06
    ramp = lambda L: np.clip(np.minimum(np.arange(L), np.arange(L)[::-1]) / (L * f), 0, 1)
    al *= ramp(h)[:, None] * ramp(w)[None, :]
    a[..., 3] = al.astype(np.uint8)
    return Image.fromarray(a, 'RGBA')


def frames_of(path):
    im = dechecker(Image.open(path))
    a = np.array(im)[..., 3].astype(np.float64)
    xs, ys = cuts(a.sum(0), 2), cuts(a.sum(1), 2)
    out = []
    for i in range(4):
        r, c = divmod(i, 2)
        cell = im.crop((xs[c], ys[r], xs[c + 1], ys[r + 1]))
        cell = clean_cell(cell, r, c)
        al = np.array(cell)[..., 3]
        yy, xx = np.where(al > 40)
        if len(xx) == 0:
            out.append(None)
            continue
        top, bot, left, right = yy.min(), yy.max(), xx.min(), xx.max()
        # 腳底：用角色的深色描邊找（招式特效多半是亮色光芒，常畫到腳底下，不能拿來當地面）
        rgb = np.array(cell)[..., :3].astype(np.int32)
        dark = (al > 200) & (rgb.max(-1) < 90)
        rows = np.where(dark.sum(1) >= 3)[0]
        if len(rows) and rows.max() > top + (bot - top) * 0.6:
            bot = int(rows.max())
            mask = dark
        else:
            mask = al > 40
        # 腳底中心：最底下 8% 列的像素平均 x
        band = mask[max(top, bot - int((bot - top) * 0.08)):bot + 1]
        bx = np.where(band)[1]
        foot = float(bx.mean()) if len(bx) else (left + right) / 2
        out.append({'img': cell, 'top': int(top), 'bot': int(bot), 'cellH': cell.height, 'foot': foot})
    return out


def main(src):
    files = sorted(glob.glob(os.path.join(src, '*__*.png')))
    chars = {}
    for f in files:
        ch, act = os.path.basename(f)[:-4].split('__')
        chars.setdefault(ch, {})[act] = f
    manifest = {}
    for ch, acts in sorted(chars.items()):
        sheets = {act: frames_of(p) for act, p in acts.items() if act in ACTS}
        idle = [fr for fr in sheets.get('idle', []) if fr]
        ref = idle or [fr for fs in sheets.values() for fr in fs if fr]
        scale = IDLE_HEIGHT / float(np.median([fr['bot'] - fr['top'] for fr in ref])) * SIZE.get(ch, 1)
        os.makedirs(os.path.join(DST, ch), exist_ok=True)
        manifest[ch] = {}
        for act, frs in sheets.items():
            # 這張表的地面線：四格中腳底最低的位置（跳起來的格子保留離地高度）
            ground = max((fr['bot'] / fr['cellH'] for fr in frs if fr), default=1)
            n = 0
            for i, fr in enumerate(frs):
                if not fr:
                    continue
                lift = (ground - fr['bot'] / fr['cellH']) * fr['cellH'] * scale
                im = fr['img'].resize((max(1, round(fr['img'].width * scale)), max(1, round(fr['img'].height * scale))), Image.LANCZOS)
                canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
                ox = round(ANCHOR_X - fr['foot'] * scale)
                oy = round(ANCHOR_Y - lift - fr['bot'] * scale)
                canvas.alpha_composite(im, (ox, oy)) if ox >= 0 and oy >= 0 else canvas.paste(im, (ox, oy), im)
                canvas.save(os.path.join(DST, ch, f'{act}_{i}.webp'), 'WEBP', quality=86, method=6)
                n += 1
            manifest[ch][act] = n
            print(ch, act, 'frames', n, 'scale %.2f' % scale)
    with open(os.path.join(DST, 'anim.json'), 'w') as f:
        json.dump({'canvas': [CANVAS_W, CANVAS_H], 'anchor': [ANCHOR_X, ANCHOR_Y], 'idleHeight': IDLE_HEIGHT, 'chars': manifest}, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1])
