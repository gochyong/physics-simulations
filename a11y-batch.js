/**
 * 无障碍批量改造脚本
 * 将 Transformer.html 样板中的改造模式应用到所有页面
 * 用法: node a11y-batch.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = __dirname;
const BACKUP_DIR = path.join(ROOT, '.a11y-backup');

let stats = { total: 0, modified: 0, skipped: 0, errors: [] };

function read(f) { return fs.readFileSync(f, 'utf8'); }
function write(f, c) {
  if (DRY_RUN) { console.log('  [dry-run] would write:', f); return; }
  fs.writeFileSync(f, c);
}

// ─── CSS 注入 ────────────────────────────────────────
function addA11yCss(html) {
  const cssBlock = `
        /* === 无障碍 Accessibility (批量注入) === */
        .skip-link { position: absolute; top: -40px; left: 8px; z-index: 2000; background: #185FA5; color: #fff; padding: 8px 16px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; text-decoration: none; transition: top 0.2s; }
        .skip-link:focus { top: 8px; }
        :focus-visible { outline: 3px solid #185FA5; outline-offset: 2px; border-radius: 6px; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }`;

  // 如果已存在 skip-link 样式, 跳过
  if (html.includes('.skip-link')) return html;

  // 每个 <style> 块末尾注入
  let modified = false;
  html = html.replace(/    <\/style>/g, () => { modified = true; return cssBlock + '\n    </style>'; });
  // 处理其他缩进的 </style>
  html = html.replace(/  <\/style>/g, () => { modified = true; return cssBlock.replace(/    /g, '  ') + '\n  </style>'; });
  html = html.replace(/<\/style>/g, () => { modified = true; return cssBlock.replace(/    /g, '') + '\n</style>'; });
  return { html, modified };
}

// ─── 颜色修复 #888 → #6B6B6B ──────────────────────────
function fixColors(html) {
  // 不在 href/src 上下文中替换
  const modified = html.includes('#888');
  html = html.replace(/(?<!href=")(?<!src=")(?<!url\()#888(?!\w)/g, '#6B6B6B');
  return { html, modified };
}

// ─── 跳过链接 ─────────────────────────────────────────
function addSkipLink(html) {
  if (html.includes('skip-link')) return { html, modified: false };
  html = html.replace(/<body>/, '<body>\n<a href="#main" class="skip-link">跳到主内容</a>');
  return { html, modified: true };
}

// ─── main-content id ──────────────────────────────────
function addMainContentId(html) {
  if (html.includes('id="main"')) return { html, modified: false };
  // 优先匹配 <div class="container"> (模拟页和分类页)
  // 保守起见，只改第一个
  html = html.replace(
    /<div class="container">/,
    '<div class="container" id="main">'
  );
  html = html.replace(
    /<main class="grid-container">/,
    '<main class="grid-container" id="main">'
  );
  return { html, modified: html.includes('id="main"') };
}

// ─── Canvas aria (role="img" + 从 title 生成的 aria-label) ──
function fixCanvas(html) {
  if (html.includes('role="img"')) return { html, modified: false };
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(/<\/?[^>]+>/g, '').trim() : '物理模拟';
  const shortTitle = title.split(/[/-]/)[0].trim();

  let count = 0;
  html = html.replace(/<canvas\b([^>]*)>/g, (m, attrs) => {
    if (attrs.includes('role=') || attrs.includes('aria-label')) return m;
    count++;
    const label = `"${shortTitle}模拟动画 — 交互式物理仿真画面"`;
    return `<canvas${attrs} role="img" aria-label=${label}>`;
  });
  return { html, modified: count > 0 };
}

// ─── Range 输入：label 包裹 + aria 属性 ───────────────────
function fixRangeInputs(html) {
  if (html.includes('label for=') || html.includes('aria-valuemin')) return { html, modified: false };

  let count = 0;
  // 匹配 label-row div + 紧随的 input[type=range]
  // 格式: <div class="label-row"><span>TEXT</span><span class="val-badge"...>VALUE</span></div>
  //       <input type="range" id="SLIDER-ID" min="MIN" max="MAX" step="STEP" value="VAL">
  html = html.replace(
    /<div class="label-row"([^>]*)>(\s*)<span>([^<]+)<\/span>(\s*)<span([^>]*class="val-badge"[^>]*)>([^<]*)<\/span>(\s*)<\/div>(\s*)<input type="range"\s+id="([^"]+)"\s+min="([^"]+)"\s+max="([^"]+)"\s+step="([^"]*)"\s+value="([^"]*)"/g,
    (m, divAttrs, ws1, labelText, ws2, badgeAttrs, badgeVal, ws3, ws4, id, min, max, step, value) => {
      count++;
      const unit = labelText.includes('频率') ? '赫兹' : labelText.includes('电压') ? '伏' : labelText.includes('Vp') ? '伏' : '匝';
      const valText = `${value}${unit}`;
      // 处理可能没有 step 属性的情况
      const stepAttr = step ? ` step="${step}"` : '';
      return `<label for="${id}" class="label-row"${divAttrs}>${ws1}<span>${labelText}</span>${ws2}<span${badgeAttrs} aria-live="polite">${badgeVal}</span>${ws3}</label>${ws4}<input type="range" id="${id}" min="${min}" max="${max}"${stepAttr} value="${value}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${valText}">`;
    }
  );
  return { html, modified: count > 0 };
}

// ─── 按钮 aria-label + aria-pressed ──────────────────────
function fixButtons(html) {
  if (html.includes('aria-pressed') || html.includes('aria-label="开始')) return { html, modified: false };

  let count = 0;
  // 开始/暂停按钮
  html = html.replace(
    /(<button[^>]*id="btn-start"[^>]*)>/g,
    (m, pre) => { count++; return `${pre} aria-label="开始模拟" aria-pressed="false">`; }
  );
  // 重置按钮
  html = html.replace(
    /(<button[^>]*id="btn-reset"[^>]*)>/g,
    (m, pre) => { count++; return `${pre} aria-label="重置参数">`; }
  );
  return { html, modified: count > 0 };
}

// ─── val-badge 无 aria-live 的补充 ──────────────────────
function fixBadges(html) {
  // 如果已经有 aria-live（来自 fixRangeInputs），跳过
  if ((html.match(/aria-live="polite"/g) || []).length >= (html.match(/val-badge/g) || []).length / 2) {
    return { html, modified: false };
  }
  let count = 0;
  html = html.replace(
    /class="val-badge"(?![\s\S]*?aria-live)/g,
    (m) => { count++; return 'class="val-badge" aria-live="polite"'; }
  );
  return { html, modified: count > 0 };
}

// ─── JS: 键盘快捷键注入（追加在 </script> 前） ──────────
function addKeyboardHandler(html) {
  if (html.includes('addEventListener.*keydown')) return { html, modified: false };

  const kbCode = `
document.addEventListener('keydown',(e)=>{
  const tag=e.target.tagName;
  if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')return;
  const startBtn=document.getElementById('btn-start');
  const resetBtn=document.getElementById('btn-reset');
  if(e.code==='Space'){e.preventDefault();startBtn&&startBtn.click();}
  else if(e.code==='KeyR'){e.preventDefault();resetBtn&&resetBtn.click();}
});`;

  html = html.replace(/<\/script>/, kbCode + '\n</script>');
  return { html, modified: true };
}

// ─── JS: aria 状态同步（在 animation loop 或 draw 末尾） ───
function addAriaSync(html) {
  if (html.includes("setAttribute('aria-valuenow'")) return { html, modified: false };

  // 在 draw() 函数末尾（或 requestAnimationFrame 调用前）注入 aria 同步代码
  // 让 animation frame 本身同步 slider aria 状态
  const syncCode = `
  // aria状态同步
  (function syncAria(){
    const ranges=document.querySelectorAll('input[type=range]');
    ranges.forEach(r=>{
      const v=r.value,min=r.min,max=r.max;
      const unit=r.id.includes('freq')?'赫兹':r.id.includes('vp')?'伏':'匝';
      r.setAttribute('aria-valuenow',v);
      r.setAttribute('aria-valuetext',v+unit);
    });
    const startBtn=document.getElementById('btn-start');
    if(startBtn&&startBtn.textContent.includes('暂停')){
      startBtn.setAttribute('aria-pressed','true');
      startBtn.setAttribute('aria-label','暂停模拟');
    }
  })();\n`;

  // 在 draw() 函数体内的末尾（但在函数闭合 } 前）
  // 更简单的方案：在 requestAnimationFrame(loop) 行之前注入
  html = html.replace(
    /(\s*)requestAnimationFrame\(loop\)/g,
    syncCode + '$&'
  );

  return { html, modified: true };
}

// ─── 分类页：section aria-label ──────────────────────────
function fixSections(html) {
  if (html.includes('aria-label="公式与实时数值"')) return { html, modified: false };
  let count = 0;
  html = html.replace(
    /<section class="formula-display">/g,
    () => { count++; return '<section class="formula-display" aria-label="公式与实时数值">'; }
  );
  html = html.replace(
    /<section class="diagram-section">/g,
    () => { count++; return '<section class="diagram-section" aria-label="模拟动画区">'; }
  );
  html = html.replace(
    /<section class="controls-section">/g,
    () => { count++; return '<section class="controls-section" aria-label="参数控制区">'; }
  );
  html = html.replace(
    /<div class="legend">/g,
    () => { count++; return '<div class="legend" aria-label="图例说明">'; }
  );
  return { html, modified: count > 0 };
}

// ─── 返回链接 aria-label ─────────────────────────────────
function fixBackLink(html) {
  if (html.includes('aria-label="返回')) return { html, modified: false };
  let count = 0;
  html = html.replace(
    /class="back-link">← 返回(\S+)</g,
    (m, cat) => { count++; return `class="back-link" aria-label="返回${cat}分类页">← 返回${cat}<`; }
  );
  return { html, modified: count > 0 };
}

// ─── 分类页卡片 aria-label ────────────────────────────────
function fixCategoryCards(html) {
  if (html.includes('aria-label="访问')) return { html, modified: false };
  let count = 0;
  html = html.replace(
    /<a href="([^"]+)\.html" class="sim-card">(\s*)<div class="sim-card-header">(\s*)<span class="sim-card-icon">([^<]+)<\/span>(\s*)<div>(\s*)<div class="sim-card-title">([^<]+)<\/div>/g,
    (m, href, ws1, ws2, icon, ws3, ws4, title) => {
      count++; return `<a href="${href}.html" class="sim-card" aria-label="访问${title}">${ws1}<div class="sim-card-header">${ws2}<span class="sim-card-icon" aria-hidden="true">${icon}</span>${ws3}<div>${ws4}<div class="sim-card-title">${title}</div>`;
    }
  );
  return { html, modified: count > 0 };
}

// ─── 主页分类卡 aria-label ────────────────────────────────
function fixHomepageCards(html) {
  if (html.includes('aria-label="查看')) return { html, modified: false };
  let count = 0;
  html = html.replace(
    /<a href="(\w+)\.html" class="cat-card([^"]*)">(\s*)<div class="cat-icon">([^<]+)<\/div>(\s*)<div class="cat-title">([^<]+)<\/div>/g,
    (m, href, cls, ws1, icon, ws2, title) => {
      count++; return `<a href="${href}.html" class="cat-card${cls}" aria-label="查看${title}分类（${href}）">${ws1}<div class="cat-icon" aria-hidden="true">${icon}</div>${ws2}<div class="cat-title">${title}</div>`;
    }
  );
  return { html, modified: count > 0 };
}

// ─── 执行 ────────────────────────────────────────────────
function processFile(file) {
  let html = read(file);
  const og = html;
  const isSim = html.includes('<canvas');
  const isCategory = html.includes('grid-container') && html.includes('sim-card');
  const isIndex = file.endsWith('index.html');

  let todo = [];

  // CSS 注入
  let r = addA11yCss(html); html = r.html; if (r.modified) todo.push('css-rules');

  // 颜色修复
  r = fixColors(html); html = r.html; if (r.modified) todo.push('colors');

  // 跳过链接
  r = addSkipLink(html); html = r.html; if (r.modified) todo.push('skip-link');

  // 主体标记
  r = addMainContentId(html); html = r.html; if (r.modified) todo.push('main-id');

  // 模拟页专用
  if (isSim) {
    r = fixCanvas(html); html = r.html; if (r.modified) todo.push(`canvas(${grepCount(html,'role="img"')})`);
    r = fixRangeInputs(html); html = r.html; if (r.modified) todo.push(`range-label(${grepCount(html,'label for=')})`);
    r = fixButtons(html); html = r.html; if (r.modified) todo.push(`buttons`);
    r = fixBadges(html); html = r.html; if (r.modified) todo.push(`badges`);
    r = fixSections(html); html = r.html; if (r.modified) todo.push(`sections`);
    r = fixBackLink(html); html = r.html; if (r.modified) todo.push(`back-link`);
    // JS: 只对有 <script> 的页面注入
    if (html.includes('<script>')) {
      r = addKeyboardHandler(html); html = r.html; if (r.modified) todo.push('keyboard');
      r = addAriaSync(html); html = r.html; if (r.modified) todo.push('aria-sync');
    }
  }

  // 分类页专用
  if (isCategory) {
    r = fixCategoryCards(html); html = r.html; if (r.modified) todo.push('card-aria');
  }

  // 主页专用
  if (isIndex) {
    r = fixHomepageCards(html); html = r.html; if (r.modified) todo.push('homepage-cards');
  }

  if (todo.length > 0) {
    // 备份原文件
    if (!DRY_RUN && !fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    if (!DRY_RUN) fs.writeFileSync(path.join(BACKUP_DIR, path.basename(file)), og);

    write(file, html);
    stats.modified++;
    console.log(`✓ ${path.basename(file)}: [${todo.join(', ')}]`);
  } else {
    stats.skipped++;
    console.log(`- ${path.basename(file)}: (no changes)`);
  }
}

function grepCount(html, pat) {
  return (html.match(new RegExp(pat, 'g')) || []).length;
}

// ─── 入口 ────────────────────────────────────────────────
console.log(DRY_RUN ? '=== DRY RUN (不写入文件) ===' : '=== 开始批量改造 ===');
console.log('备份目录:', BACKUP_DIR, '\n');

const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

for (const f of files) {
  stats.total++;
  try {
    processFile(path.join(ROOT, f));
  } catch (e) {
    stats.errors.push({ file: f, error: e.message });
    console.error('  ✗ ERROR:', f, '-', e.message);
  }
}

console.log(`\n=== 完成: ${stats.modified} 修改 / ${stats.skipped} 跳过 / ${stats.total} 总计 ===`);
if (stats.errors.length) {
  console.log('错误:', stats.errors.map(e => e.file).join(', '));
}
console.log('备份保存在:', BACKUP_DIR);
if (DRY_RUN) console.log('运行 node a11y-batch.js 实际执行写入');
