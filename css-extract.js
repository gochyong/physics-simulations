/**
 * CSS 抽离: 从所有页面移除已迁移到 common.css 的共享样式
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BK = path.join(ROOT, '.a11y-backup');

// 这些选择器开头 → 整块移除（已在 common.css）
const SHARED_SELECTORS = new Set([
  '*', 'body', '.branding', '.logo',
  '.container', 'header', 'h1', '.subtitle',
  '.formula-display', '.formula-container', '.result-row', '.formula-item',
  '.legend', '.legend-item', '.legend-dot',
  '.diagram-section', '.controls-section',
  '.control-panel', '.param-section', '.param-section-header',
  '.control-group', '.label-row', '.val-badge',
  '.btn-row',
  '.info-card',
  '.main-wrap', '.main-canvas-wrap', '#simCanvas',
  '.sub-wrap', '.sub-label',
  '.toggle-row', '.tog-btn', '.type-badge',
  '.skip-link', ':focus-visible', '.sr-only',
  '.formula-main', '.energy-values', '.energy-item', '.energy-dot'
]);

// 需要精确匹配（包括后代/伪元素）
const EXACT_SHARED = new Set([
  'input[type=range]',
  'input[type=range]::-webkit-slider-thumb',
  '.sub-wrap canvas',
  '.ctrl-btn', '.start', '.pause', '.reset',
  '.ctrl-btn:active',
  'input[type=range]::-webkit-slider-thumb {',
  '.toggle-row', '.tog-btn', '.tog-btn.sel',
]);

// :root 标准变量名（在 common.css 中）
const STD_VARS = new Set(['--bg-color','--primary','--secondary','--accent','--text-dark','--card-bg','--shadow']);

let stats = { total:0, cleaned:0, removed:0 };

function cleanPage(file) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('<style>')) return;
  stats.total++;

  // 1. 修复三重注入的重复无障碍 CSS
  html = fixDuplicateA11y(html);

  // 2. 提取 <style> 内容并清理
  html = cleanStyleBlocks(html);

  // 3. 移除空的 <style> 标签
  html = removeEmptyStyles(html);

  fs.writeFileSync(file, html);
}

function fixDuplicateA11y(html) {
  // 移除所有无障碍 CSS（已迁到 common.css）
  html = html.replace(/\s*\/\* === 无障碍 Accessibility[^*]*\*\/\s*/g, '\n');
  html = html.replace(/[ \t]*\.skip-link\s*\{[^}]*\}/g, '');
  html = html.replace(/[ \t]*\.skip-link:focus\s*\{[^}]*\}/g, '');
  html = html.replace(/[ \t]*:focus-visible\s*\{[^}]*\}/g, '');
  html = html.replace(/[ \t]*\.sr-only\s*\{[^}]*\}/g, '');
  return html;
}

function cleanStyleBlocks(html) {
  // 处理每个 <style> 块
  return html.replace(/<style>([\s\S]*?)<\/style>/g, (match, content) => {
    let cleaned = cleanCssContent(content);
    stats.removed += (content.length - cleaned.length);
    return cleaned.trim() ? `<style>${cleaned}</style>` : '';
  });
}

function cleanCssContent(css) {
  // 方法: 逐个 CSS 规则块处理
  const rules = splitCssRules(css);
  let kept = [];
  let inRoot = false;
  let rootExtras = [];

  for (const rule of rules) {
    const sel = getSimpleSelector(rule);
    if (!sel) { kept.push(rule); continue; }

    // 处理 :root
    if (sel === ':root') {
      const vars = extractRootVars(rule);
      const extras = vars.filter(v => !STD_VARS.has(v.name));
      if (extras.length > 0) {
        // 保留额外变量
        rootExtras = extras.map(v => `    ${v.line}`.replace(/\s*$/, ''));
      }
      continue; // 移除标准 vars + 整个 :root 块
    }

    // 检查是否共享
    if (isSharedSelector(sel)) continue;

    // 处理 @media
    if (sel.startsWith('@media (max-width:1100px)') || sel.startsWith('@media (max-width: 1100px)')) {
      if (rule.includes('grid-template-areas:') && (rule.includes('"header"') || rule.includes("'header'"))) {
        continue; // 标准 1100px grid 折叠 → 移除
      }
    }

    kept.push(rule);
  }

  // 如果有额外 :root 变量，在前面插入精简版 :root
  if (rootExtras.length > 0) {
    kept.unshift('        :root {\n' + rootExtras.join('\n') + '\n        }');
  }

  return kept.join('\n').replace(/\n{3,}/g, '\n\n');
}

function splitCssRules(css) {
  // 按 CSS 块拆分（在 } 后跟着空行或新选择器）
  const rules = [];
  let depth = 0, start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        rules.push(css.substring(start, i + 1).trim());
        start = i + 1;
      }
    }
  }
  return rules.filter(r => r.length > 0);
}

function getSimpleSelector(rule) {
  // 提取第一个选择器
  let sel = rule.split('{')[0].trim();
  // 处理多选择器（逗号分隔）: 取第一个
  sel = sel.split(',')[0].trim();
  // 移除 @media 包装，提取内部选择器
  if (sel.startsWith('@media')) {
    const inner = rule.match(/\{([\s\S]*)\}/);
    if (inner) {
      // 取 @media 内第一个规则
      const innerRules = inner[1].trim();
      const firstBrace = innerRules.indexOf('{');
      if (firstBrace > 0) return innerRules.substring(0, firstBrace).trim();
    }
    return sel; // 无法提取内部 → 保留整个 @media
  }
  return sel;
}

function isSharedSelector(sel) {
  // 直接匹配白名单
  if (SHARED_SELECTORS.has(sel)) return true;

  // 精确匹配（含伪元素、后代）
  for (const ex of EXACT_SHARED) {
    if (sel.startsWith(ex)) return true;
  }

  // input[type=range] 系列
  if (sel.startsWith('input[type=range]') || sel.startsWith('input[type="range"]')) return true;

  // .ctrl-btn 系列
  if (sel === '.ctrl-btn' || sel.startsWith('.ctrl-btn:')) return true;
  if (sel === '.start' || sel === '.pause' || sel === '.reset') return true;

  // .tog-btn 系列
  if (sel === '.toggle-row' || sel === '.tog-btn' || sel.startsWith('.tog-btn.')) return true;

  return false;
}

function extractRootVars(rule) {
  const vars = [];
  const inner = rule.match(/\{([\s\S]*)\}/);
  if (!inner) return vars;
  const lines = inner[1].split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*(--[\w-]+)\s*:/);
    if (m) vars.push({ name: m[1], line: line.trim() });
  }
  return vars;
}

function removeEmptyStyles(html) {
  html = html.replace(/<style>\s*<\/style>/g, '');
  return html;
}

// ─── 执行 ────────────────────────────────────────
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
for (const f of files) {
  const fp = path.join(ROOT, f);
  if (!fs.existsSync(path.join(BK, f))) {
    fs.copyFileSync(fp, path.join(BK, f));
  }
  try {
    cleanPage(fp);
    stats.cleaned++;
  } catch(e) {
    console.error(`  ✗ ${f}: ${e.message}`);
  }
}

const kb = (stats.removed / 1024).toFixed(1);
console.log(`${stats.cleaned}/${stats.total} pages cleaned`);
console.log(`Removed ~${kb} KB of duplicate CSS`);
console.log('Backup: .a11y-backup/');
