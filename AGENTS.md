# AGENTS.md // Multi-Agent Directives for FPS Striker

This file defines guidelines, roles, constraints, and architecture rules for autonomous AI coding agents collaborating on the FPS Striker project.

---

## 🚀 Agent Roles & Specializations

When deploying subagents or collaborating in teams, structure tasks across these distinct specializations:

1. **Rendering & Three.js Engineer**:
   - Focus: Scene graph efficiency, geometry sharing, shader/material optimization, viewmodel positioning, camera frustum/ADS alignment.
   - Constraint: Must maintain $\ge 60$ FPS (target 100+ FPS). Zero garbage collection allocations in the render loop.

2. **Kinematics & Player Physics Engineer**:
   - Focus: Slide-hopping physics, velocity integration, air strafing, friction coefficients, AABB swept collision detection, jump arcs.
   - Constraint: Player movement must feel identical to authentic high-speed tactical slide-hopping.

3. **Bot AI & Combat Engineer**:
   - Focus: State machines (PATROL, ENGAGE, EVADE), frustum FOV cone calculation ($\le 35^\circ$), raycasted Line-of-Sight, strafe weaving, slide-hop dodging.
   - Constraint: Bots must NEVER shoot through walls, must NEVER shoot while facing away, and must NEVER target or damage players in the pre-match lobby.

4. **UI & FX Engineer**:
   - Focus: HUD responsiveness, tactical directional damage indicators, crosshair bloom, hitmarkers, killfeed, death/victory screens.
   - Constraint: Zero per-frame DOM layout thrashing. Only update text/transform when dirty.

5. **Audio Synthesis Engineer**:
   - Focus: Web Audio API oscillators, bandpass/lowpass filters, noise bursts, ADSR envelopes.
   - Constraint: Zero external audio file downloads. All sounds generated procedurally in `js/audio.js`.

---

## 🛡️ Critical Code Invariants

- **Relative Paths**: Always use relative paths (`./assets/`, `./js/`). Never hardcode `C:\` or `F:\` or machine-specific locations.
- **Pre-Allocated Vectors**: Use module-level scratch `THREE.Vector3` and `THREE.Quaternion` instances. Never call `new THREE.Vector3()` in high-frequency update loops.
- **Seamless Voxel Models**: Viewmodel arms and weapons must use continuous overlapping bounding boxes to prevent joint gaps from any camera angle.
- **Verification**: Always verify changes via browser testing or running `python test_all_requirements.py`.
