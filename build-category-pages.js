/**
 * 内容构建脚本：simulations.json 是分类页、首页计数与项目总数的唯一来源。
 * 运行：node build-category-pages.js
 */
const fs = require('fs');

const ROOT = __dirname;
const dataPath = `${ROOT}/simulations.json`;
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const categoryFiles = {
  mechanics: 'mechanics.html',
  thermal: 'thermal.html',
  electricity: 'electricity.html',
  waves: 'waves.html',
  modern: 'modern-physics.html',
  astronomy: 'astronomy.html'
};

const total = data.categories.reduce((sum, category) => sum + category.simulations.length, 0);
data.totalSimulations = total;
data.categories.forEach(category => { category.count = category.simulations.length; });
fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function makeCard(sim, category, index) {
  return `        <!-- ${index}. ${sim.name} / ${sim.nameEn} -->
        <a href="${escapeHtml(sim.file)}" class="sim-card" aria-label="访问${escapeHtml(sim.name)}">
            <div class="sim-card-header">
                <span class="sim-card-icon" aria-hidden="true">${sim.icon || '🔬'}</span>
                <div>
                    <div class="sim-card-title">${escapeHtml(sim.name)}</div>
                    <div class="sim-card-subtitle">${escapeHtml(sim.nameEn)}</div>
                </div>
            </div>
            <div class="sim-card-desc">${escapeHtml(sim.desc || sim.formula)}</div>
            <span class="tag">${escapeHtml(category.name)} / ${escapeHtml(category.nameEn)}</span>
        </a>`;
}

function replaceOnce(html, pattern, replacement, filename) {
  if (!pattern.test(html)) throw new Error(`无法在 ${filename} 找到需要更新的区域`);
  return html.replace(pattern, replacement);
}

function upsertMeta(html, attribute, key, content) {
  const pattern = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*\\/>`, 'i');
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}">`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<meta charset="UTF-8">/, `$&\n    ${tag}`);
}

for (const category of data.categories) {
  const filename = categoryFiles[category.id];
  if (!filename) continue;
  const path = `${ROOT}/${filename}`;
  let html = fs.readFileSync(path, 'utf8');
  const cards = category.simulations.map((sim, index) => makeCard(sim, category, index + 1)).join('\n\n');

  html = replaceOnce(
    html,
    /(<main\s+class="grid-container"[^>]*>)[\s\S]*?(<\/main>)/,
    `$1\n\n${cards}\n\n$2`,
    filename
  );
  html = replaceOnce(html, /<div class="page-subtitle">\s*\d+\s*个模拟\s*<\/div>/, `<div class="page-subtitle">${category.count} 个模拟</div>`, filename);
  html = html.replace(/(content="[^"]*?)[0-9]+个免费交互式物理模拟/g, `$1${total}个免费交互式物理模拟`);
  fs.writeFileSync(path, html, 'utf8');
}

const indexPath = `${ROOT}/index.html`;
let indexHtml = fs.readFileSync(indexPath, 'utf8');
for (const category of data.categories) {
  const filename = categoryFiles[category.id];
  const cardPattern = new RegExp(`(<a href="${filename}"[\\s\\S]*?<div class="cat-count">)\\s*\\d+\\s*个模拟(</div>)`);
  indexHtml = replaceOnce(indexHtml, cardPattern, `$1${category.count} 个模拟$2`, 'index.html');
}
indexHtml = indexHtml.replace(/(content="[^"]*?)[0-9]+个免费交互式物理模拟/g, `$1${total}个免费交互式物理模拟`);
fs.writeFileSync(indexPath, indexHtml, 'utf8');

for (const category of data.categories) {
  for (const sim of category.simulations) {
    const path = `${ROOT}/${sim.file}`;
    let html = fs.readFileSync(path, 'utf8');
    const description = `${data.siteName} - ${sim.name} / ${sim.nameEn}。${sim.desc || sim.formula}`;
    html = upsertMeta(html, 'name', 'description', description);
    html = upsertMeta(html, 'property', 'og:description', description);
    fs.writeFileSync(path, html, 'utf8');
  }
}

console.log(`已从 simulations.json 更新 ${data.categories.length} 个分类页、首页计数、${total} 个模拟总数及全部模拟页 SEO 描述。`);
