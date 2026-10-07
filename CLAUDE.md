# CLAUDE.md // Anthropic & Claude Code Project Guide

## Project Summary
FPS Striker is a high-performance browser-based 3D voxel First-Person Shooter. It runs in Three.js (r128) with pure vanilla ES6 JavaScript, procedural Web Audio API sound synthesis, and custom kinematic movement physics (slide-hopping, bunny hopping).

## 🎯 Target Audience & Core Design Philosophy
- **Target Audience**: Kids and teenagers aged **8 to 16–18** who love fast-paced competitive shooter games but do not own a PS5, high-end gaming PC, or money to purchase expensive titles. They are seeking high-octane, highly responsive, free browser and low-end hardware alternatives (reminiscent of Krunker / CS:GO / arcade classics). Casual adult players will also jump in for quick casual sessions.
- **Future Multiplayer Roadmap**: Full multiplayer will be built on top of this entire codebase. All game state, entity tracking, physics tick cycles, and event dispatchers are cleanly decoupled with modular multiplayer network replication in mind.
- **Performance Mandate**: Runs ultra-smoothly at **100 FPS** with zero stuttering or memory leaks on standard budget laptops and integrated graphics.

## Primary Commands
- Launch local server: `python serve.py` or double-click `start.bat`
- Alternative server: `npx serve .`
- Run Playwright test suite: `python test_all_requirements.py`

## Architecture & Code Map
- `index.html`: Entry point & HUD overlay
- `css/style.css`: Tactical UI, crosshairs, scoreboards, hit indicators
- `js/main.js`: Game loop, Three.js initialization, match lifecycle
- `js/player.js`: Player movement physics, slide-hopping, recoil, health
- `js/weapons.js`: 4 weapon classes (AR, Sniper, SMG, Revolver), viewmodels, ADS
- `js/bots.js`: Bot AI, frustum FOV cone shooting check, strafe weaving, AABB collision
- `js/map.js`: Arena map layout, voxel blocks, cover, spawn points
- `js/textures.js`: Procedural canvas textures & material caching
- `js/particles.js`: Bullet tracers, muzzle flashes, blood voxels
- `js/audio.js`: Synthesized Web Audio API sound effects
- `js/ui.js`: Tactical damage indicators, HUD updates, killfeed

## Critical Engineering Guidelines
1. **Target 100+ FPS**: Never instantiate objects (`new THREE.Vector3`) or trigger DOM layout thrashing (`innerHTML`) in per-frame update cycles.
2. **Portability**: All asset and script references must be relative (`./assets/`, `./js/`).
3. **Bot Frustum Shooting**: Bots must only fire when the player is within $\le 35^\circ$ forward FOV and facing the player.
4. **Lobby Immunity**: Player cannot take damage or be targeted before `window.game.isGameStarted === true`.
5. **Viewmodels**: Viewmodel arms must be contiguous volumetric limbs with overlapping joints.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**This project has a knowledge graph. Start with the code-review-graph
MCP tools to narrow scope, then read the source.** The graph is cheaper than scanning files and
gives you structural context (callers, dependents, test coverage) that file search cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

### Verify in the source

- Narrow scope with the graph, then read the source. Do not change code from graph output alone.
- For any non-trivial change, read the implementation and the relevant tests before concluding.
- Verify the exact source when touching behavior, database logic, migrations, retries, fallbacks,
  recovery, or compatibility code.
- When the graph and the source disagree, the source wins. The graph may be stale or may not
  model that relationship.
- An empty graph result can mean "not indexed" or "not statically visible", not "does not exist".

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes_tool` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context_tool` | Need source snippets for review — token-efficient |
| `get_impact_radius_tool` | Understanding blast radius of a change |
| `get_affected_flows_tool` | Finding which execution paths are impacted |
| `query_graph_tool` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool` | Finding functions/classes by name or keyword |
| `get_architecture_overview_tool` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.
<!-- /code-review-graph MCP tools -->
