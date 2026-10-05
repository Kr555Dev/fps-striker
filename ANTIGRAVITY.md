# ANTIGRAVITY.md // Antigravity Agent Configuration & Codebase Guide

This document provides system context, architecture details, and coding conventions for Google Antigravity agents working on **FPS Striker**.

---

## 🎮 Game Architecture Overview

```
                      [ index.html ]
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
         [ css/style.css ]        [ js/main.js ] (Game Loop & Three.js Init)
                                         │
        ┌──────────────┬─────────────────┼────────────────┬──────────────┐
        ▼              ▼                 ▼                ▼              ▼
  [ js/player.js ] [ js/weapons.js ] [ js/bots.js ] [ js/map.js ] [ js/ui.js ]
        │              │                 │                │              │
        └──────────────┴────────┬────────┴────────────────┴──────────────┘
                                │
                   ┌────────────┴────────────┐
                   ▼                         ▼
          [ js/textures.js ]        [ js/audio.js ]
          [ js/particles.js ]       (Web Audio Synthesis)
```

---

## 🏎️ Performance Budget & Invariants

| Metric | Target | Hard Floor |
|---|---|---|
| **Frame Rate** | 100 - 144 FPS | 60 FPS |
| **Garbage Collection Pauses** | 0 ms per frame | < 1 ms |
| **Draw Calls** | < 120 calls | < 180 calls |
| **Audio Asset Footprint** | 0 KB (100% Procedural) | 0 KB |
| **DOM Reflows per Frame** | 0 reflows | 0 reflows |

### Zero-Allocation Rule
In `js/main.js`, `js/player.js`, `js/weapons.js`, and `js/bots.js`, **NEVER** instantiate new heap objects inside `animate()` or `update()`. All vector arithmetic must use reusable module-level variables:
```javascript
// ✅ CORRECT:
const _scratchPos = new THREE.Vector3();
function update() {
    _scratchPos.copy(target).sub(origin);
}

// ❌ FORBIDDEN:
function update() {
    const diff = new THREE.Vector3().subVectors(target, origin); // Triggers GC!
}
```

---

## 🛠️ Subagent Deployment Recommendations

When breaking down large tasks in this codebase:
- **Viewmodel & Graphics**: Task subagents with modifying `js/weapons.js`, `js/textures.js`, or `js/particles.js`.
- **Bot AI & Kinematics**: Task subagents with modifying `js/bots.js` and `js/map.js`.
- **UI & HUD**: Task subagents with modifying `js/ui.js`, `css/style.css`, and `index.html`.
- **Verification**: Always run `python test_all_requirements.py` to confirm zero regressions before marking tasks complete.
