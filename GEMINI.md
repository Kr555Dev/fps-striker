# FPS STRIKER // GEMINI & ANTIGRAVITY PROJECT INSTRUCTIONS

This file is automatically loaded by **Antigravity** and **Gemini CLI** upon opening this project directory on any drive. It serves as the primary system directive, context provider, and quality guardrail for all coding tasks.

---

## 🎯 Target Audience & Core Design Philosophy
- **Target Audience**: Kids and teenagers aged **8 to 16–18** who love fast-paced competitive shooter games but do not own a PS5, high-end gaming PC, or money to purchase expensive titles. They are seeking high-octane, highly responsive, free browser and low-end hardware alternatives (reminiscent of Krunker / CS:GO / arcade classics). Casual adult players will also jump in for quick casual sessions.
- **Future Multiplayer Roadmap**: Full multiplayer will be built on top of this entire codebase. All game state, entity tracking, physics tick cycles, and event dispatchers are cleanly decoupled with modular multiplayer network replication in mind.
- **Performance Mandate**: Runs ultra-smoothly at **100 FPS** with zero stuttering or memory leaks on standard budget laptops and integrated graphics.

---

## 🎯 Project Overview & Tech Stack
- **Game**: FPS Striker — High-speed 3D browser-based voxel First-Person Shooter.
- **Engine**: Three.js (r128), pure vanilla ES6 JavaScript, HTML5 Canvas 2D, CSS3 HUD.
- **Audio**: Custom procedural Web Audio API synthesis engine (zero external `.mp3`/`.wav` dependencies).
- **Physics & Movement**: Custom kinematic controller featuring slide-hopping (bunny hopping), air strafing, and AABB bounding box collision.
- **Hosting / Portability**: 100% self-contained and portable. All paths are relative (`./assets`, `./js`). Works identically on any drive, Linux, macOS, or any web server.

---

## 📦 Runtime Dependencies & Zero-Dependency Setup
- **Vendor Dependencies**: Three.js (`r128`) is vendored locally in `lib/three.min.js`.
- **Zero NPM/Pip Runtime Requirements**: The game runs out-of-the-box with **zero** external package installs.
- **Offline Capable**: Works 100% offline with zero CDN calls.
- **Development/Testing Only**: Python 3.8+ for `serve.py`; `playwright` for optional automated tests (`pip install playwright`).

## 🖥️ System & Browser Requirements
- **Target Performance**: 60–100+ FPS.
- **Hardware Minimum**: Dual-Core CPU, Integrated Intel HD 4400 / AMD Vega 3, 4GB RAM.
- **Hardware Recommended**: Quad-Core CPU, Dedicated GPU (GTX 1050 / RX 560+), 8GB RAM.
- **Supported Browsers**: Google Chrome 80+, Microsoft Edge 80+, Mozilla Firefox 75+, Brave, Opera.
- **Web APIs Required**: WebGL 1.0/2.0, Pointer Lock API, Web Audio API.

---

## ⚡ Quick Commands & Serving
- **Launch Local Server**:
  - Windows Batch: `start.bat`
  - Python CLI: `python serve.py` (listens on `http://localhost:8080`)
  - Node / npx: `npx serve .`
- **Automated Playwright Test Suite**:
  - `python test_all_requirements.py` (verifies lobby immunity, bot FOV cone, viewmodels, FPS, and damage indicator)

---

## 🛡️ Core Architectural Rules & Guardrails

### 1. Performance & Zero-GC Philosophy (Target $\ge 100$ FPS)
- **Zero Allocations in Render Loop**: Never instantiate `new THREE.Vector3()`, `new THREE.Quaternion()`, or arrays inside `update()`, `animate()`, or tick cycles. Always use scratch objects declared in module scope (`_v1`, `_quat`, etc.).
- **DOM Layout Thrashing**: Never update `innerHTML` every frame. Only mutate cached `textContent` or `style.transform` when values actually change (dirty-flagged).
- **Material & Geometry Pooling**: Share geometries across voxel elements (e.g. standard unit cube `THREE.BoxGeometry(1, 1, 1)` scaled via mesh transformation). Reuse `MeshLambertMaterial` / `MeshBasicMaterial` from the texture palette cache.
- **Raycast Throttling**: Raycasts for Line-of-Sight and bullet impacts must strictly test against pre-filtered `shootableMeshes` / `collisionBoxes` lists, never traversing the whole `scene.children`.

### 2. Viewmodel & Voxel Modeling Guidelines
- **Continuous Kinematic Limbs**: First-person arms (`js/weapons.js`) must be built as continuous, seamless limbs (sleeve $\to$ white shirt cuff $\to$ wrist $\to$ gripped palm & voxel fingers). 
- **Joint Overlaps**: Adjacent voxel blocks must overlap by at least `0.005` to `0.010` units to prevent camera clipping or skybox leakage between joints from any perspective.
- **Dual Stance Support**: Every weapon must define both Hipfire and ADS (`adsOffset`) camera transforms with smooth spring/lerp interpolation.

### 3. Bot AI Invariants
- **Lobby State Gate**: Bots must strictly respect `window.game.isGameStarted`. Before the match begins, bots cannot acquire, lock onto, or shoot at the player.
- **Frustum FOV Firing Cone**: Bots can ONLY shoot if the player is within their forward frustum cone ($\Delta\theta \le 35^\circ$ or dot product $\ge 0.82$). If facing away or misaligned, bots must hold fire until their yaw aligns with the target.
- **Line-of-Sight (LOS)**: Bots must cast an obstacle ray before shooting. Never shoot through walls or map cover.
- **Kinematic Variety**: Bots must use lateral strafe weaving (`Math.sin(...)`), stutter-steps, reactive evasive dodges upon taking damage (+4.2 m/s burst), and slide-hop 3D arc jumps.

### 4. Audio & Asset Self-Containment
- All sound effects must remain procedural via `js/audio.js` using Web Audio oscillators, noise buffers, and biquad filters, or use lightweight fallback synthesizers. Never introduce external blocking audio asset downloads.
- Relative paths only: never commit absolute paths or hardcoded machine drive letters.

---

## 📂 Source Code Directory Map

| Path | Purpose |
|---|---|
| `index.html` | Game shell, HUD overlay containers, crosshairs, modal templates |
| `css/style.css` | Cyberpunk/Tactical HUD, tactical bulging hit indicator, death screen |
| `js/main.js` | Game coordinator, Three.js renderer/camera, animation loop, lobby lifecycle |
| `js/player.js` | Player movement physics, slide-hopping, input capture, health, damage receiver |
| `js/weapons.js` | 4 weapon classes (AR, Sniper, SMG, Revolver), viewmodels, recoil, ADS |
| `js/bots.js` | Bot AI state machine, frustum shooting check, AABB collision, strafe kinematics |
| `js/map.js` | Arena map generation, voxel geometry, cover obstacles, spawn points |
| `js/textures.js` | Procedural HTML5 canvas texture synthesis & material cache |
| `js/particles.js` | Bullet tracers, muzzle flashes, voxel blood splatters, bullet decals |
| `js/audio.js` | Web Audio API synthesizer for all gunshot, hitmarker, jump, and reload FX |
| `js/ui.js` | Bulging hit indicator, HUD score updates, killfeed, damage floating text |
| `docs/` | Deep-dive technical documentation on architecture, algorithms, and performance |
