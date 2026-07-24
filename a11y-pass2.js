/**
 * 无障碍改造 - 第二遍: 给所有 range 补 aria 属性 + oninput, 给按钮补静态 aria
 */
const fs = require('fs');
const path = require('path');

const BK = path.join(__dirname, '.a11y-backup');
if (!fs.existsSync(BK)) fs.mkdirSync(BK, { recursive: true });

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
let total = 0;

for (const file of files) {
  const fp = path.join(__dirname, file);
  let html = fs.readFileSync(fp, 'utf8');
  let changes = [];

  // 补 range 的 aria + oninput
  let c = 0;
  html = html.replace(
    /<input type="range"\s+id="([^"]+)"\s+min="([^"]+)"\s+max="([^"]+)"((?:\s+step="[^"]*")?)\s+value="([^"]*)"(?![^>]*aria-valuemin)/g,
    (m, id, min, max, step, value) => {
      c++;
      const unit = /freq/i.test(id) ? '赫兹' : /v[p12]|voltage|volt/i.test(id) ? '伏' : /speed|vel/i.test(id) ? '' : '匝';
      const vt = unit ? value + unit : value;
      const oninput = unit
        ? ` oninput="this.setAttribute('aria-valuenow',this.value);this.setAttribute('aria-valuetext',this.value+'${unit}')"`
        : ` oninput="this.setAttribute('aria-valuenow',this.value);this.setAttribute('aria-valuetext',this.value)"`;
      return `<input type="range" id="${id}" min="${min}" max="${max}"${step} value="${value}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${vt}"${oninput}>`;
    }
  );
  if (c) changes.push(`range-aria(${c})`);

  // 补按钮的静态 aria（仅当缺失时）
  let bc = 0;
  // 开始按钮缺 aria-label
  html = html.replace(
    /(<button[^>]*id="btn-start"[^>]*)>(?![^<]*aria-label)/,
    (m, pre) => { bc++; return pre + ' aria-label="开始模拟" aria-pressed="false">'; }
  );
  // 重置按钮缺 aria-label
  html = html.replace(
    /(<button[^>]*id="btn-reset"[^>]*)>(?![^<]*aria-label)/,
    (m, pre) => { bc++; return pre + ' aria-label="重置参数">'; }
  );
  if (bc) changes.push(`button-aria(${bc})`);

  if (changes.length) {
    total++;
    if (!fs.existsSync(path.join(BK, file))) fs.writeFileSync(path.join(BK, file), fs.readFileSync(fp, 'utf8'));
    fs.writeFileSync(fp, html);
    console.log(`✓ ${file}: [${changes.join(', ')}]`);
  }
}

console.log(`\n第二遍完成: ${total} 个文件补充`);
