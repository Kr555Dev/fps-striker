# 🛠️ FPS Striker Developer & Modding Guide

> **Document Scope**: Practical guide for developers and AI agents on adding weapons, building new maps, configuring bot behavior, and running automated test suites.

---

## 1. Adding or Modifying Weapons

Weapons are declared in [`js/weapons.js`](../js/weapons.js) under the `WEAPONS` dictionary.

### Weapon Definition Schema
```javascript
WEAPONS['shotgun'] = {
    name: 'Shotgun',
    damage: 18,              // Damage per pellet
    pellets: 6,              // Number of rays cast per shot
    fireRate: 0.8,           // Delay between shots in seconds
    spread: 0.05,            // Inaccuracy cone in radians
    magSize: 5,              // Magazine capacity
    reserveAmmo: 30,         // Starting reserve ammo
    reloadTime: 2.2,         // Reload duration in seconds
    range: 40,               // Max effective distance
    recoilAmount: 0.18,       // Recoil vertical pitch kick
    hipOffset: { x: 0.28, y: -0.22, z: -0.50 }, // Hipfire viewmodel position
    adsOffset: { x: 0.00, y: -0.16, z: -0.42 }, // ADS centered sight position
    adsFov: 60,              // FOV when zoomed
    sound: 'shotgun',        // Identifier for audio synthesizer in js/audio.js
    modelBuilder: (w) => this.buildShotgunMesh(w) // Mesh builder function
};
```

### Building Voxel Viewmodels
Always adhere to the continuous kinematic rule:
```javascript
// Ensure contiguous limb connections:
const rightArm = this.buildStrikerArms('shotgun');
weaponGroup.add(rightArm);
```

---

## 2. Arena Map Customization

Maps are generated procedurally in [`js/map.js`](../js/map.js) via the `ArenaMap` class.

### Key Map Customization Methods
- `createGround()`: Sets up the base textured grid plane.
- `createPerimeterWalls()`: Generates the boundary collision barriers.
- `createBuilding(x, z, width, depth, height, colorType)`: Builds multi-story voxel structures.
- `createCoverObstacles()`: Places tactical crates and barriers.
- `spawnPoints`: Array of `THREE.Vector3` coordinates where players and bots safely spawn.

---

## 3. Tuning Bot AI

Bot parameters are configured in [`js/bots.js`](../js/bots.js) within the `Bot` class constructor:

| Parameter | Default | Effect |
|---|---|---|
| `this.moveSpeed` | `7.0` | Base walking speed (m/s) |
| `this.strafeAmp` | `1.2` | Patrol sinusoidal weaving amplitude |
| `this.strafeFreq` | `2.4` | Frequency of lateral patrol weaves |
| `this.attackRange` | `45.0` | Maximum acquisition distance |
| `this.frustumThreshold` | `0.82` | Dot product required to shoot (~$35^\circ$ cone) |
| `this.reactionTime` | `0.18` | Artificial aim reaction delay |

---

## 4. Running Automated Tests

A comprehensive Playwright test script is provided in `test_all_requirements.py`:
```bash
python test_all_requirements.py
```

The test script automatically verifies:
1. **Lobby Immunity**: Confirms bots do not shoot or deal damage before the match starts.
2. **Frustum Cone**: Confirms bots can only shoot when facing the player.
3. **Continuous Limbs**: Takes screenshots of all 4 viewmodels for visual inspection.
4. **Bulging Hit Detector**: Injects directional damage and captures indicator rendering.
5. **60–100 FPS Performance**: Samples the engine frame rate during active bot combat.
