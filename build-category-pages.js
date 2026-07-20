// Build script: reads simulations.json and regenerates all category page cards
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('simulations.json', 'utf8'));

const catFiles = {
    mechanics: 'mechanics.html',
    thermal: 'thermal.html',
    electricity: 'electricity.html',
    waves: 'waves.html',
    modern: 'modern-physics.html',
    astronomy: 'astronomy.html'
};

function makeCard(sim, idx) {
    return `        <!-- ${idx}. ${sim.name} / ${sim.nameEn} -->
        <a href="${sim.file}" class="sim-card">
            <div class="sim-card-header">
                <span class="sim-card-icon">${sim.icon||'📝'}</span>
                <div>
                    <div class="sim-card-title">${sim.name}</div>
                    <div class="sim-card-subtitle">${sim.nameEn}</div>
                </div>
            </div>
            <div class="sim-card-desc">${sim.desc||sim.formula}</div>
            <span class="tag">${data.categories.find(c=>c.id===catId(sim.file)).name} / ${data.categories.find(c=>c.id===catId(sim.file)).nameEn}</span>
        </a>`;
}

function catId(filename) {
    for (const cat of data.categories) {
        if (cat.simulations.some(s => s.file === filename)) return cat.id;
    }
    return '';
}

// Process each category
data.categories.forEach(cat => {
    const file = catFiles[cat.id];
    if (!file) return;
    let html = fs.readFileSync(file, 'utf8');

    // Build all cards
    const cards = cat.simulations.map((sim, i) => makeCard(sim, i + 1)).join('\n\n');

    // Replace the card section between <!-- Sim Card Grid --> and </main>
    const startMarker = '<!-- Sim Card Grid -->';
    const endMarker = '    </main>';
    const startIdx = html.indexOf(startMarker);
    const endIdx = html.indexOf(endMarker, startIdx);
    if (startIdx === -1 || endIdx === -1) {
        console.log('WARNING: Could not find card grid in ' + file);
        return;
    }

    const before = html.substring(0, startIdx + startMarker.length);
    const after = html.substring(endIdx);
    const newHtml = before + '\n\n' + cards + '\n\n' + after;

    // Update the count
    const updatedCount = newHtml.replace(/(\d+)\s*个模拟/, `${cat.count} 个模拟`);

    fs.writeFileSync(file, updatedCount);
    console.log(`Generated ${cat.count} cards for ${file} (${cat.name})`);
});

// Add "更新中" card
data.categories.forEach(cat => {
    const file = catFiles[cat.id];
    let html = fs.readFileSync(file, 'utf8');
    if (!html.includes('更新中')) {
        const comingSoon = '\n        <div class="sim-card" style="opacity:0.5;cursor:default;border:2px dashed #e0d0c0;"><div class="sim-card-header" style="justify-content:center;"><span class="sim-card-icon">📝</span><div><div class="sim-card-title">更新中</div><div class="sim-card-subtitle">More Coming Soon</div></div></div><div class="sim-card-desc" style="text-align:center;">新模拟持续添加中，敬请期待。</div></div>\n';
        html = html.replace('    </main>', comingSoon + '    </main>');
        fs.writeFileSync(file, html);
        console.log('Added coming-soon to: ' + file);
    }
});

console.log('\nDone! All category pages regenerated from simulations.json');
