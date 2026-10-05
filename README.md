# ⚡ FPS STRIKER // 3D Fast-Paced Voxel FPS

[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=flat&logo=three.js)](https://threejs.org/)
[![Web Audio](https://img.shields.io/badge/Audio-Procedural_Web_Audio_API-blue?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Performance](https://img.shields.io/badge/Performance-100%2B_FPS_Zero--GC-brightgreen?style=flat)](docs/OPTIMIZATION_AND_ALGORITHMS.md)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)](LICENSE)

A high-performance, browser-based 3D first-person shooter. Built with **Three.js**, pure vanilla ES6 JavaScript, procedural Web Audio API synthesis, and a custom kinematic slide-hopping movement engine.

---

## 🎮 Highlights & Features

- **🚀 100+ FPS Zero-GC Engine**: Architectural zero-allocation render loop, geometry sharing, texture palette caching, and dirty-flagged DOM HUD updates.
- **🏃 Authentic Slide-Hopping Physics**: Bunny-hop momentum conservation, crouch-slide impulses, air strafing, and responsive ground friction.
- **🔫 4 Distinct Weapon Classes**: Assault Rifle, Sniper Rifle, Submachine Gun, and Heavy Revolver with continuous volumetric viewmodel limbs, spring-damped recoil, and precision ADS (Aim Down Sights).
- **🤖 Tactical Bot AI**: Bots featuring forward frustum cone firing restrictions ($\le 35^\circ$), sinusoidal strafe weaving, reactive evasive dodging, slide-hop jumps, and line-of-sight obstruction checks.
- **🎯 Tactical Directional Hit Indicator**: Bulging neon crimson shield arc with directional apex chevron and edge vignettes.
- **🔊 100% Procedural Audio**: Zero audio file downloads; all 14 sound effects are synthesized in real-time using native Web Audio API oscillators and filters.
- **📦 100% Portable**: Self-contained relative path architecture. Runs instantly from any drive (`C:`, `F:`, USB drive, or remote server).

---

## ⚡ Quick Start

### Option 1: One-Click Launch (Windows)
Double-click **`start.bat`** in the project folder. It will launch the local HTTP server and automatically open the game in your default browser.

### Option 2: Python CLI
```bash
python serve.py
```
Listens on `http://localhost:8080` with auto-opening browser support.

### Option 3: Node / npx
```bash
npx serve -l 8080 .
# or
npm start
```

---

## 🎮 Controls

| Action | Control |
|---|---|
| **Movement** | `W`, `A`, `S`, `D` |
| **Look / Aim** | `Mouse` (Pointer Lock) |
| **Shoot** | `Left Click` |
| **Aim Down Sights (ADS)** | `Right Click` (Zoom + aligned reflex optic) |
| **Slide** | Hold `Shift` or `C` while moving |
| **Slide-Hop (Bhop)** | Press `Space` while sliding to boost momentum |
| **Reload** | `R` |
| **Switch Weapons** | Keys `1`, `2`, `3`, `4` or hotbar click |
| **Scoreboard / Leaderboard** | Hold `Tab` |
| **Pause / Settings** | `Esc` (Sensitivity, FOV, Audio Volume) |

---

## 🛠️ Tech Stack & Zero-Dependency Architecture

| Component | Technology | Version | Notes |
|---|---|---|---|
| **3D Rendering** | Three.js | `r128` | Pre-bundled locally in `lib/three.min.js` (~600 KB) |
| **Logic & Scripting** | Vanilla JavaScript | ES6+ | Zero transpilation, pure native browser execution |
| **Audio Synthesis** | Web Audio API | W3C Standard | 100% procedural sound effects; zero audio asset downloads |
| **Styling & HUD** | HTML5 / CSS3 | Modern CSS | GPU-composited transforms with zero DOM reflow overhead |
| **Local Web Server** | Python Standard Library | Python 3.8+ | Zero external pip dependencies; uses built-in `http.server` |
| **Optional Server** | Node.js | Node 16+ | `npx serve -l 8080 .` |
| **Automated Testing** | Playwright (Python) | 1.40+ | Automated visual regression and combat physics verification |

### 🚨 Zero External Runtime Dependencies
- **No NPM Install Required**: The game runs out of the box with zero setup.
- **No CDN Connectivity Required**: All vendor code (`lib/three.min.js`) is stored locally.
- **100% Offline Capable**: Can be launched and played completely disconnected from the internet.

---

## 🖥️ System & Browser Requirements

| Specification | Minimum (40–60 FPS) | Recommended (100–144+ FPS) |
|---|---|---|
| **OS** | Windows 10/11, macOS 10.14+, Ubuntu 20.04+ | Windows 10/11 (64-bit) |
| **CPU** | Intel Core i3 (4th Gen) / AMD FX-6300 | Intel Core i5 (8th Gen+) / AMD Ryzen 5+ |
| **GPU** | Integrated Intel HD Graphics 4400 / AMD Vega 3 | Dedicated NVIDIA GTX 1050 / AMD RX 560+ |
| **RAM** | 4 GB | 8 GB+ |
| **Browser** | Chrome 80+, Edge 80+, Firefox 75+, Brave | Chrome / Edge / Opera GX (Latest) |
| **Disk Space** | < 35 MB | < 35 MB |

---

## 📂 Project Structure

```
fps-striker/
├── index.html                   # Game shell & HUD overlay
├── css/
│   └── style.css                # Tactical HUD, crosshairs & hit indicators
├── js/
│   ├── main.js                  # Engine coordinator, Three.js loop & lifecycle
│   ├── player.js                # Kinematic physics, slide-hopping & health
│   ├── weapons.js               # 4 weapon classes, viewmodels & recoil spring
│   ├── bots.js                  # Bot AI, frustum cone check & strafe kinematics
│   ├── map.js                   # Arena geometry & spawn anchors
│   ├── textures.js              # Procedural canvas textures & material cache
│   ├── particles.js             # Tracers, muzzle flashes & blood voxels
│   ├── audio.js                 # Procedural Web Audio API synthesizer
│   └── ui.js                    # Tactical damage indicators & HUD updates
├── lib/
│   └── three.min.js             # Bundled Three.js r128 library
├── assets/                      # Baked weapon & armor texture assets
├── docs/                        # Deep-dive technical documentation
│   ├── OPTIMIZATION_AND_ALGORITHMS.md # 100+ FPS algorithms & Three.js breakdown
│   ├── ARCHITECTURE.md          # High-level architecture & sequence graphs
│   └── DEVELOPER_GUIDE.md       # Guide for adding weapons, maps & bot tuning
├── GEMINI.md                    # Antigravity & Gemini CLI root project rules
├── AGENTS.md                    # Multi-agent system instructions & invariants
├── CLAUDE.md                    # Anthropic Claude Code operational guide
├── ANTIGRAVITY.md               # Dedicated Antigravity assistant guide
├── package.json                 # Project configuration & npm scripts
├── serve.py                     # Portable zero-dependency local HTTP server
└── start.bat                    # Windows one-click launcher
```

---

## 🧠 AI Agent Instructions & Multi-Platform Support

This project includes pre-configured project instruction files that are automatically loaded by modern AI coding tools when opened from any folder or drive (`C:\`, `F:\`, etc.):

- **[GEMINI.md](GEMINI.md)**: Automatically discovered by Google Antigravity and Gemini CLI.
- **[AGENTS.md](AGENTS.md)**: Universal multi-agent collaboration directives.
- **[CLAUDE.md](CLAUDE.md)**: Anthropic Claude Code workspace rules.
- **[ANTIGRAVITY.md](ANTIGRAVITY.md)**: Deep Antigravity coding conventions and performance budget.

---

## 🏎️ In-Depth Technical Documentation

For deep technical details on the algorithms and optimization techniques used in this engine, consult the documentation in `docs/`:
- **[Tech Stack, System Requirements & Dependencies](docs/TECH_STACK_AND_REQUIREMENTS.md)**
- **[Optimization & Algorithmic Engine Guide](docs/OPTIMIZATION_AND_ALGORITHMS.md)**
- **[System Architecture & Sequence Flows](docs/ARCHITECTURE.md)**
- **[Developer & Modding Guide](docs/DEVELOPER_GUIDE.md)**

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
