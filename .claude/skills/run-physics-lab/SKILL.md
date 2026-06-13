---
name: run-physics-lab
description: Launch, serve, and screenshot the Wuli布雷克 physics simulation lab (26 interactive simulations). Use for starting the dev server, taking screenshots of pages, or verifying visual regressions.
---

# Run: Wuli布雷克 Physics Simulation Lab

Static HTML physics lab — 26 self-contained interactive simulations. No build step, no dependencies. Each `.html` file is a standalone sim (canvas-based, inline CSS/JS).

## Prerequisites

```bash
# Nothing to install for serving — Node.js (for one-liner) or Python3
node --version || python3 --version
```

## Build

No build step. Files are served as-is from the repo root.

## Run (agent path)

All paths relative to the repo root.

### 1. Start dev server

```bash
node -e "
const http=require('http'),fs=require('fs'),path=require('path'),base=__dirname;
http.createServer((req,res)=>{
  const file=req.url==='/'?'/index.html':req.url;
  const f=path.join(base,file.split('?')[0]);
  fs.readFile(f,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return}
    const ext=path.extname(f);
    const types={'.html':'text/html','.css':'text/css','.js':'application/javascript'};
    res.writeHead(200,{'Content-Type':types[ext]||'text/plain'});
    res.end(data);
  });
}).listen(8765,()=>console.log('http://localhost:8765'));
" &
```

### 2. Take screenshots

```bash
# Install Playwright once (cached):
npx --yes playwright install chromium

# Screenshot a page:
npx playwright screenshot http://localhost:8765/ screenshot-index.png --viewport-size=1280,800

# Screenshot specific simulations:
npx playwright screenshot http://localhost:8765/WaveSpeed.html screenshot-wavespeed.png --viewport-size=1280,800
npx playwright screenshot http://localhost:8765/StandingWave.html screenshot-standingwave.png --viewport-size=1280,800
npx playwright screenshot http://localhost:8765/DoubleSlitInterference.html screenshot-doubleslit.png --viewport-size=1280,800
```

### 3. Inspect DOM / verify content

```bash
# Check index lists all simulations
curl -s http://localhost:8765/ | grep -c 'sim-card'

# Check a specific page loads
curl -sI http://localhost:8765/StandingWave.html | head -1
# HTTP/1.1 200 OK
```

### 4. Stop server

```bash
kill %1 2>/dev/null || pkill -f 'node -e' 2>/dev/null
```

## Page listing

| Path | Title |
|------|-------|
| `/` | 首页 / Index (26 sim cards) |
| `/WaveSpeed.html` | 波速公式 / Wave Equation |
| `/StandingWave.html` | 驻波形成 / Standing Wave Formation |
| `/DoubleSlitInterference.html` | 双缝干涉 / Double-Slit Interference |
| `/DopplerEffect.html` | 多普勒效应 / Doppler Effect |
| `/WaveGeneration.html` | 波形产生 / Wave Generation |
| `/TransverseLongitudinalWave.html` | 横波与纵波 / Transverse & Longitudinal |
| `/NewtonLaw.html` | 牛顿定律 / Newton's Laws |
| `/HookesLaw.html` | 胡克定律 / Hooke's Law |
| `/EnergyConservation.html` | 能量守恒 / Energy Conservation |
| `/MomentumConservation.html` | 动量守恒 / Momentum Conservation |
| … | (26 total, all `.html` files at root) |

## Gotchas

- **No hot reload.** After editing an HTML file, refresh the browser or re-screenshot.
- **Canvas sizing.** Simulations resize to `canvas.clientWidth/Height` on `resize` event. Viewport size matters — too narrow triggers mobile layout.
- **Dark background on DoubleSlit.** `DoubleSlitInterference.html` uses `#1a1a2e` canvas background — don't mistake for broken rendering.
- **Playwright first run.** `npx playwright install chromium` downloads ~300MB — one-time cost.
