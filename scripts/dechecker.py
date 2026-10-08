"""去除 ChatGPT 畫上去的灰白棋盤格「假透明」背景：從邊緣往內 flood fill 低彩度亮色像素"""
import sys
from collections import deque
import numpy as np
from PIL import Image
for path in sys.argv[1:]:
    a = np.array(Image.open(path).convert('RGBA')).astype(np.int32)
    h, w = a.shape[:2]
    rgb = a[..., :3]
    sat = rgb.max(2) - rgb.min(2)
    cand = (sat < 22) & (rgb.min(2) > 196)
    seen = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    a[seen, 3] = 0
    # 邊緣：緊貼背景、偏亮的像素半透明，減少白邊
    edge = np.zeros_like(seen)
    edge[1:, :] |= seen[:-1, :]; edge[:-1, :] |= seen[1:, :]; edge[:, 1:] |= seen[:, :-1]; edge[:, :-1] |= seen[:, 1:]
    edge &= ~seen
    light = edge & (rgb.min(2) > 150) & (sat < 40)
    a[light, 3] = 90
    Image.fromarray(a.astype(np.uint8), 'RGBA').save(path)
    print(path, 'transparent', round(seen.mean(), 3))
