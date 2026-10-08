"""App 圖示、標題背景與徽章"""
import os
from PIL import Image
SP = os.path.dirname(os.path.abspath(__file__)); R = f'{SP}/raw9'
PUB = '/Users/brooklin/Projects/idle-dawnland/public'
os.makedirs(f'{PUB}/art/title', exist_ok=True)
icon = Image.open(f'{R}/appicon__a.png').convert('RGB')
w, h = icon.size; s = min(w, h); icon = icon.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
for n in (32, 180, 192, 512):
    icon.resize((n, n), Image.LANCZOS).save(f'{PUB}/icon-{n}.png', optimize=True)
bg = Image.open(f'{R}/title__a.png').convert('RGB'); bg.thumbnail((1600, 1600)); bg.save(f'{PUB}/art/title/bg.webp', 'WEBP', quality=82, method=6)
em = Image.open(f'{R}/emblem__a.png').convert('RGBA')
bbox = em.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
if bbox: em = em.crop(bbox)
em.thumbnail((320, 320), Image.LANCZOS); em.save(f'{PUB}/art/title/emblem.webp', 'WEBP', quality=90, method=6)
print('ok', icon.size, bg.size, em.size)
