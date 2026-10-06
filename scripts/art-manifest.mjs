// 掃描 public/art，產生 manifest.json：遊戲只會載入清單裡存在的圖片
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = 'public';
const dir = join(root, 'art');
const files = [];
const walk = d => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(png|webp|jpg|jpeg)$/i.test(f)) files.push(relative(root, p).split('\\').join('/'));
  }
};
walk(dir);
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(files.sort(), null, 0));
console.log(`art manifest: ${files.length} 張圖片`);
