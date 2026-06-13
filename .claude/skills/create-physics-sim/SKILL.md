---
name: create-physics-sim
description: Create a new physics simulation HTML page matching the Wuli布雷克 visual style. Use when adding a new sim page, creating a demo, or extending the lab with a new topic.
---

# Create: new physics simulation page

All pages in this project follow one canonical look. This skill has the
template and checklist so every new page comes out consistent.

## Template

Start from `.claude/skills/create-physics-sim/template.html`.
It contains:

- Full CSS (warm palette, Fredoka font, grid layout, responsive breakpoint)
- Branding `<div class="logo">Wuli布雷克</div>` fixed top-left
- Grid layout: `header / formula / diagram / controls`
- Canvas placeholder with `resize()` handler
- Control panel skeleton (sliders, buttons, info cards)
- Comments marking where to insert content (`【...】`)

## How to use

1. Copy `template.html` to `<SimName>.html` at repo root
2. Replace every `【...】` comment with real content
3. Fill in the JS: canvas drawing, sliders, animation loop
4. Add the index card to `index.html`

## Index card snippet

Add inside `<main class="grid-container">`:

```html
<a href="SimName.html" class="sim-card">
    <div>
        <h3>中文名 / English Name</h3>
        <p>一句话描述这个模拟演示了什么。</p>
    </div>
    <span class="tag">分类标签</span>
</a>
```

Existing categories: `力学 / Mechanics`, `声学与波 / Waves`, `电学 / Electricity`, `原子物理 / Atomic`.

## Style checklist

- [ ] Title format: `中文 / English`
- [ ] Uses `var(--primary)` / `var(--bg-color)` etc from :root
- [ ] Formula section has colored legends matching simulation colors
- [ ] Info card has 4 key-point items with icon+title+subtitle
- [ ] Buttons: `ctrl-btn start` / `ctrl-btn reset`
- [ ] Canvas handles `resize` event
- [ ] `@media (max-width: 1100px)` single-column fallback present
- [ ] No scroll required at 1080p (compact sizing as in WaveSpeed)
- [ ] `<title>` ends with `- Wuli布雷克`
