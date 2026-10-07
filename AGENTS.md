# AGENTS.md // Multi-Agent Directives for FPS Striker

---

## ⚡ MANDATORY INVARIANT: ALWAYS USE CODE-REVIEW-GRAPH MCP FIRST

**CRITICAL DIRECTIVE FOR ALL AGENTS IN THIS CODEBASE:**
This repository has an active Tree-sitter knowledge graph indexed by the `code-review-graph` MCP server.
You **MUST ALWAYS** use `code-review-graph` as your FIRST action when searching, exploring code, tracing callers/callees, assessing change impact, or reviewing files.
**DO NOT** start by reading full files with `view_file` or running grep/dir scans.

### How to invoke in Antigravity:
All knowledge graph tools are lazy MCP tools called via `call_mcp_tool` with `ServerName: "code-review-graph"`:
- **Trace callers/callees/references**:
  `call_mcp_tool(ServerName="code-review-graph", ToolName="query_graph_tool", Arguments={"pattern": "callers_of", "target": "<symbol>", "repo_root": "F:\\WEB projects\\fps-striker"})`
- **File structure & symbols summary**:
  `call_mcp_tool(ServerName="code-review-graph", ToolName="query_graph_tool", Arguments={"pattern": "file_summary", "target": "js/weapons.js", "repo_root": "F:\\WEB projects\\fps-striker"})`
- **Blast radius before editing**:
  `call_mcp_tool(ServerName="code-review-graph", ToolName="get_impact_radius_tool", Arguments={"target": "<symbol_or_file>", "repo_root": "F:\\WEB projects\\fps-striker"})`
- **Token-efficient targeted code context**:
  `call_mcp_tool(ServerName="code-review-graph", ToolName="get_review_context_tool", Arguments={"target": "<symbol>", "repo_root": "F:\\WEB projects\\fps-striker"})`
- **Analyze git changes**:
  `call_mcp_tool(ServerName="code-review-graph", ToolName="detect_changes_tool", Arguments={"repo_root": "F:\\WEB projects\\fps-striker"})`

Only call `view_file` or `replace_file_content` AFTER pinpointing exact lines and relationships via the graph!

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
