// 移除所有页面的 Google Fonts 外链，改用系统字体
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

let total = 0, removed = 0;
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

for (const f of files) {
  const fp = path.join(ROOT, f);
  let html = fs.readFileSync(fp, 'utf8');
  if (!html.includes('fonts.googleapis.com')) continue;
  total++;

  // 删除 Google Fonts 相关的 <link> 标签
  html = html.replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*\n?/g, '');
  html = html.replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*\n?/g, '');
  html = html.replace(/[ \t]*<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">\s*\n?/g, '');

  fs.writeFileSync(fp, html);
  removed++;
}

// 修改 common.css: 系统字体优先
let css = fs.readFileSync(path.join(ROOT, 'common.css'), 'utf8');
css = css.replace(
  "font-family: 'Fredoka', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;",
  "font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', -apple-system, sans-serif;"
);
fs.writeFileSync(path.join(ROOT, 'common.css'), css);

console.log(`${removed}/${total} pages cleaned of Google Fonts`);
console.log('common.css font-family updated to system fonts');
