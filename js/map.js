/**
 * FPS Striker Arena Map Generator (Outpost Arena)
 * Unified clean bounding colliders without crevice traps, seamless cover props,
 * open-air navigation network, and robust penetration resolution.
 */

// Pre-allocated scratch objects for zero-GC raycasting
const _losDir = new THREE.Vector3();
const _losRay = new THREE.Raycaster();
const _spawnEye = new THREE.Vector3();
const _playerEye = new THREE.Vector3();
const _candDir = new THREE.Vector3();
const _coverEye = new THREE.Vector3();
const _toCover = new THREE.Vector3();

class GameMap {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.shootableMeshes = [];
        this.jumpPads = [];
        this.spawnPoints = [];
        this.tacticalCoverPoints = [];
        this.waypoints = [];
        this.materials = {};
        this.initMaterials();
        this.buildArena();
    }

    initMaterials() {
        const tex = window.textureGen;
        this.materials = {
            grassVoxel: new THREE.MeshLambertMaterial({ map: tex.getGrassVoxel(24, 24) }),
            dirtPath: new THREE.MeshLambertMaterial({ map: tex.getDirtPath(8, 8) }),
            stoneBrick: new THREE.MeshLambertMaterial({ map: tex.getStoneMasonry(8, 2) }),
            stoneBrickLong: new THREE.MeshLambertMaterial({ map: tex.getStoneMasonry(16, 2) }),
            stonePillar: new THREE.MeshLambertMaterial({ map: tex.getStoneMasonry(2, 6) }),
            concrete: new THREE.MeshLambertMaterial({ map: tex.getConcrete(4, 2) }),
            woodCrate: new THREE.MeshLambertMaterial({ map: tex.getWoodCrate() }),
            militaryCrate: new THREE.MeshLambertMaterial({ map: tex.getMilitaryCrate() }),
            containerOrange: new THREE.MeshLambertMaterial({ map: tex.getShippingContainer('#d95328') }),
            containerTeal: new THREE.MeshLambertMaterial({ map: tex.getShippingContainer('#0088aa') }),
            diamondPlate: new THREE.MeshLambertMaterial({ map: tex.getDiamondPlate() }),
            jumpPad: new THREE.MeshBasicMaterial({ map: tex.getJumpPadTexture() }),
            trimDark: new THREE.MeshLambertMaterial({ color: 0x22262a }),
            foliage: new THREE.MeshLambertMaterial({ map: tex.getFoliageTexture() })
        };
        this.materials.sandBrick = this.materials.stoneBrick;
        this.materials.sandBrickLong = this.materials.stoneBrickLong;
    }

    addBox(x, y, z, width, height, depth, material, canCollide = true, isRamp = false, isShootable = null) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Optimization: Disable per-frame matrix computation for static map geometry
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        this.scene.add(mesh);

        if (canCollide) {
            const halfW = width / 2;
            const halfH = height / 2;
            const halfD = depth / 2;
            this.colliders.push({
                min: new THREE.Vector3(x - halfW, y - halfH, z - halfD),
                max: new THREE.Vector3(x + halfW, y + halfH, z + halfD),
                isRamp: isRamp
            });
        }

        const shouldBeShootable = (isShootable !== null) ? isShootable : canCollide;
        if (shouldBeShootable) {
            this.shootableMeshes.push(mesh);
        }
        return mesh;
    }

    addJumpPad(x, y, z, power = 16) {
        this.addBox(x, y + 0.1, z, 4, 0.2, 4, this.materials.jumpPad, false);
        this.addBox(x, y, z, 4.4, 0.2, 4.4, this.materials.trimDark, true);

        this.jumpPads.push({
            min: new THREE.Vector3(x - 2.2, y - 0.5, z - 2.2),
            max: new THREE.Vector3(x + 2.2, y + 2.0, z + 2.2),
            power: power
        });
    }

    buildArena() {
        // 1. Arena Ground: Rich Voxel Olive Grass Base
        const floorGeo = new THREE.PlaneGeometry(160, 160);
        const floorMesh = new THREE.Mesh(floorGeo, this.materials.grassVoxel);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.y = 0;
        floorMesh.receiveShadow = true;
        floorMesh.matrixAutoUpdate = false;
        floorMesh.updateMatrix();
        this.scene.add(floorMesh);
        this.shootableMeshes.push(floorMesh);

        this.colliders.push({
            min: new THREE.Vector3(-80, -2, -80),
            max: new THREE.Vector3(80, 0, 80)
        });

        // 2. Winding Dirt Paths & Central Clay Courtyard
        const addDirtSlab = (x, z, w, d) => {
            const slabGeo = new THREE.PlaneGeometry(w, d);
            const slab = new THREE.Mesh(slabGeo, this.materials.dirtPath);
            slab.rotation.x = -Math.PI / 2;
            slab.position.set(x, 0.04, z);
            slab.receiveShadow = true;
            slab.castShadow = false;
            slab.matrixAutoUpdate = false;
            slab.updateMatrix();
            this.scene.add(slab);
            this.shootableMeshes.push(slab);
        };

        // Main arterial dirt paths
        addDirtSlab(0, 0, 28, 28);      // Central square
        addDirtSlab(0, 36, 12, 48);     // South path
        addDirtSlab(0, -36, 12, 48);    // North path
        addDirtSlab(36, 0, 48, 12);     // East path
        addDirtSlab(-36, 0, 48, 12);    // West path
        addDirtSlab(-28, -28, 20, 20);  // NW courtyard
        addDirtSlab(28, 28, 20, 20);    // SE courtyard

        // 3. Outer Perimeter Fortress Walls with Dark Capstone Trim
        const wallH = 14;
        const wallThick = 4;
        // North wall + trim
        this.addBox(0, wallH / 2, -78, 160, wallH, wallThick, this.materials.stoneBrickLong);
        this.addBox(0, wallH + 0.4, -78, 162, 0.8, wallThick + 0.6, this.materials.trimDark, false, false, true);

        // South wall + trim
        this.addBox(0, wallH / 2, 78, 160, wallH, wallThick, this.materials.stoneBrickLong);
        this.addBox(0, wallH + 0.4, 78, 162, 0.8, wallThick + 0.6, this.materials.trimDark, false, false, true);

        // West wall + trim
        this.addBox(-78, wallH / 2, 0, wallThick, wallH, 160, this.materials.stoneBrickLong);
        this.addBox(-78, wallH + 0.4, 0, wallThick + 0.6, 0.8, 162, this.materials.trimDark, false, false, true);

        // East wall + trim
        this.addBox(78, wallH / 2, 0, wallThick, wallH, 160, this.materials.stoneBrickLong);
        this.addBox(78, wallH + 0.4, 0, wallThick + 0.6, 0.8, 162, this.materials.trimDark, false, false, true);

        // 4. Central Plaza Ruined Fortress & Tiered Pillars
        // Main dais
        this.addBox(0, 0.9, 0, 18, 1.8, 18, this.materials.stoneBrick);
        this.addBox(0, 1.9, 0, 19, 0.3, 19, this.materials.trimDark);

        // Central Stone Monument Pillars with Tiered Cornices
        const pillarCoords = [
            [-6, -6], [6, -6], [-6, 6], [6, 6]
        ];
        pillarCoords.forEach(([px, pz]) => {
            this.addBox(px, 4.5, pz, 3.2, 5.0, 3.2, this.materials.stonePillar);
            this.addBox(px, 7.2, pz, 3.8, 0.6, 3.8, this.materials.trimDark, false, false, true);
        });

        // Top lintel stone slabs
        this.addBox(0, 7.2, -6, 12, 0.6, 3.2, this.materials.stoneBrick);
        this.addBox(0, 7.2, 6, 12, 0.6, 3.2, this.materials.stoneBrick);

        // Central dais steps
        this.addBox(0, 0.45, 10.2, 8, 0.9, 2.4, this.materials.stoneBrick);
        this.addBox(0, 0.45, -10.2, 8, 0.9, 2.4, this.materials.stoneBrick);
        this.addBox(10.2, 0.45, 0, 2.4, 0.9, 8, this.materials.stoneBrick);
        this.addBox(-10.2, 0.45, 0, 2.4, 0.9, 8, this.materials.stoneBrick);

        // 5. Stylized Voxel Foliage (Grass tufts & shrub cubes)
        const foliageCoords = [
            [-8, 0.6, -11], [8, 0.6, -11], [-11, 0.6, -8], [11, 0.6, 8],
            [-12, 0.7, 12], [12, 0.7, -12], [-32, 0.6, -12], [32, 0.6, 12],
            [-50, 0.6, 28], [50, 0.6, -28], [-20, 0.6, 26], [20, 0.6, -26]
        ];
        foliageCoords.forEach(([fx, fy, fz]) => {
            this.addBox(fx, fy, fz, 1.4, 1.2, 1.4, this.materials.foliage, false);
            this.addBox(fx + 0.4, fy - 0.2, fz + 0.3, 1.0, 0.8, 1.0, this.materials.foliage, false);
        });

        // Shipping Containers (Clean unified single box colliders)
        this.addBox(-16, 2.5, -16, 6, 5, 14, this.materials.containerOrange);
        this.addBox(18, 2.5, 14, 14, 5, 6, this.materials.containerTeal);
        this.addBox(-22, 2.5, 18, 14, 5, 6, this.materials.containerTeal);
        this.addBox(20, 2.5, -20, 6, 5, 14, this.materials.containerOrange);

        // 4. North-East Sniper Tower
        const towerX = 45;
        const towerZ = -45;
        this.addBox(towerX, 4.5, towerZ, 16, 9, 16, this.materials.concrete);
        this.addBox(towerX, 9.2, towerZ, 18, 0.4, 18, this.materials.diamondPlate);
        this.addBox(towerX, 10.5, towerZ - 8.5, 16, 2.2, 1, this.materials.sandBrick);
        this.addBox(towerX, 10.5, towerZ + 8.5, 16, 2.2, 1, this.materials.sandBrick);
        this.addBox(towerX - 8.5, 10.5, towerZ, 1, 2.2, 16, this.materials.sandBrick);
        this.addBox(towerX + 8.5, 10.5, towerZ, 1, 2.2, 16, this.materials.sandBrick);

        // Ramp up to Tower (16 climbable steps with 0.55m riser height)
        for (let i = 0; i < 16; i++) {
            const stepTop = 0.55 + (i * 0.55);
            const stepH = stepTop;
            const stepY = stepH / 2;
            const stepX = 35.5 - (i * 1.2);
            this.addBox(stepX, stepY, towerZ, 1.3, stepH, 5, this.materials.diamondPlate, true, true);
        }

        // 5. South-West Elevated Fortress
        const fortX = -45;
        const fortZ = 45;
        this.addBox(fortX, 3.5, fortZ, 20, 7, 20, this.materials.sandBrick);
        this.addBox(fortX, 7.2, fortZ, 22, 0.4, 22, this.materials.diamondPlate);
        this.addBox(fortX - 10.5, 8.5, fortZ, 1, 2, 20, this.materials.concrete);
        this.addBox(fortX + 10.5, 8.5, fortZ, 1, 2, 20, this.materials.concrete);
        this.addBox(fortX, 8.5, fortZ + 10.5, 20, 2, 1, this.materials.concrete);

        // Ramp up to Fort (13 climbable steps with 0.52m riser height)
        for (let i = 0; i < 13; i++) {
            const stepTop = 0.55 + (i * 0.52);
            const stepH = stepTop;
            const stepY = stepH / 2;
            const stepZ = 18.0 + (i * 1.2);
            this.addBox(fortX, stepY, stepZ, 5, stepH, 1.3, this.materials.diamondPlate, true, true);
        }

        // Skybridge Overlook
        this.addBox(fortX + 20, 7.2, fortZ, 16, 0.4, 4, this.materials.diamondPlate);
        this.addBox(fortX + 28, 3.5, fortZ, 2, 7, 2, this.materials.trimDark);

        // 6. Courtyard Walls & Flanking Alleys
        this.addBox(-40, 3.5, -15, 4, 7, 36, this.materials.sandBrick);
        this.addBox(-56, 3.5, -15, 4, 7, 36, this.materials.sandBrick);
        this.addBox(40, 3.5, 20, 4, 7, 36, this.materials.sandBrick);
        this.addBox(56, 3.5, 20, 4, 7, 36, this.materials.sandBrick);

        // 7. Tactical Crates (Seamless, zero internal crevice traps)
        this.createSolidCrateGroup(-12, 0, 32);
        this.createSolidCrateGroup(32, 0, -12);
        this.createSolidCrateGroup(-36, 0, -48);
        this.createSolidCrateGroup(48, 0, 48);
        this.createSolidCrateGroup(0, 0, -45);

        // 8. Jump Pads
        this.addJumpPad(-2, 0, -32, 16);
        this.addJumpPad(28, 0, 35, 18);
        this.addJumpPad(-55, 0, 25, 16);
        this.addJumpPad(45, 0, -20, 18);

        // 9. Safe Open Spawn Points (20 balanced arena spawn points)
        this.spawnPoints = [
            new THREE.Vector3(-55, 0.5, -55),
            new THREE.Vector3(55, 0.5, 55),
            new THREE.Vector3(-55, 0.5, 55),
            new THREE.Vector3(55, 0.5, -55),
            new THREE.Vector3(0, 0.5, 60),
            new THREE.Vector3(0, 0.5, -60),
            new THREE.Vector3(-60, 0.5, 0),
            new THREE.Vector3(60, 0.5, 0),
            new THREE.Vector3(25, 0.5, -30),
            new THREE.Vector3(-25, 0.5, 30),
            // Expanded perimeter and corridor safe spawns
            new THREE.Vector3(-62, 0.5, -28),
            new THREE.Vector3(62, 0.5, 28),
            new THREE.Vector3(-28, 0.5, -58),
            new THREE.Vector3(28, 0.5, 58),
            new THREE.Vector3(-46, 0.5, 12),
            new THREE.Vector3(46, 0.5, -12),
            new THREE.Vector3(-18, 0.5, -48),
            new THREE.Vector3(18, 0.5, 48),
            new THREE.Vector3(-52, 0.5, -50),
            new THREE.Vector3(52, 0.5, 50)
        ];

        // 10. Tactical Cover Anchors (Behind crates, pillars, containers, and courtyard walls)
        this.tacticalCoverPoints = [
            // Behind crate group (-12, 0, 32)
            new THREE.Vector3(-12, 0.5, 36.5),
            new THREE.Vector3(-16.5, 0.5, 32),
            // Behind crate group (32, 0, -12)
            new THREE.Vector3(32, 0.5, -16.5),
            new THREE.Vector3(36.5, 0.5, -12),
            // Behind crate group (-36, 0, -48)
            new THREE.Vector3(-36, 0.5, -52.5),
            new THREE.Vector3(-41.0, 0.5, -48),
            // Behind crate group (48, 0, 48)
            new THREE.Vector3(48, 0.5, 52.5),
            new THREE.Vector3(52.5, 0.5, 48),
            // Behind crate group (0, 0, -45)
            new THREE.Vector3(0, 0.5, -49.5),
            new THREE.Vector3(-4.5, 0.5, -45),
            new THREE.Vector3(4.5, 0.5, -45),
            // Behind shipping containers
            new THREE.Vector3(-21, 0.5, -16),
            new THREE.Vector3(-16, 0.5, -24),
            new THREE.Vector3(25, 0.5, 14),
            new THREE.Vector3(18, 0.5, 19),
            new THREE.Vector3(-29, 0.5, 18),
            new THREE.Vector3(27, 0.5, -20),
            // Behind central dais pillars & courtyard walls
            new THREE.Vector3(-7.5, 0.5, -7.5),
            new THREE.Vector3(7.5, 0.5, -7.5),
            new THREE.Vector3(-7.5, 0.5, 7.5),
            new THREE.Vector3(7.5, 0.5, 7.5),
            new THREE.Vector3(-48, 0.5, -15),
            new THREE.Vector3(48, 0.5, 20)
        ];

        // 10. Open Lane AI Waypoints
        this.waypoints = [
            new THREE.Vector3(0, 0.5, 26),
            new THREE.Vector3(0, 0.5, -26),
            new THREE.Vector3(26, 0.5, 0),
            new THREE.Vector3(-26, 0.5, 0),
            new THREE.Vector3(48, 0.5, 42),
            new THREE.Vector3(-48, 0.5, -42),
            new THREE.Vector3(42, 0.5, -24),
            new THREE.Vector3(-42, 0.5, 24),
            new THREE.Vector3(0, 2.6, 0),
            new THREE.Vector3(28, 0.5, 52),
            new THREE.Vector3(-28, 0.5, -52),
            new THREE.Vector3(-48, 0.5, 0),
            new THREE.Vector3(48, 0.5, 0)
        ];
    }

    // Seamless, flush crate group with zero internal crevice traps
    createSolidCrateGroup(cx, cy, cz) {
        // Base tier: 2x2 flush crates (shootable to block bullets and sightlines!)
        this.addBox(cx - 1.5, cy + 1.5, cz - 1.5, 3, 3, 3, this.materials.woodCrate, false, false, true);
        this.addBox(cx + 1.5, cy + 1.5, cz - 1.5, 3, 3, 3, this.materials.woodCrate, false, false, true);
        this.addBox(cx - 1.5, cy + 1.5, cz + 1.5, 3, 3, 3, this.materials.militaryCrate, false, false, true);
        this.addBox(cx + 1.5, cy + 1.5, cz + 1.5, 3, 3, 3, this.materials.militaryCrate, false, false, true);
        // Top tier
        this.addBox(cx, cy + 4.5, cz, 3, 3, 3, this.materials.woodCrate, false, false, true);

        // Unified compound collider for the whole group (prevents getting wedged between crates!)
        this.colliders.push({
            min: new THREE.Vector3(cx - 3.0, cy, cz - 3.0),
            max: new THREE.Vector3(cx + 3.0, cy + 3.0, cz + 3.0),
            isRamp: false
        });
        // Top tier collider
        this.colliders.push({
            min: new THREE.Vector3(cx - 1.5, cy + 3.0, cz - 1.5),
            max: new THREE.Vector3(cx + 1.5, cy + 6.0, cz + 1.5),
            isRamp: false
        });
    }

    hasLineOfSight(fromPos, toPos) {
        _losDir.subVectors(toPos, fromPos);
        const distance = _losDir.length();
        if (distance < 0.1) return true;
        _losDir.normalize();

        _losRay.set(fromPos, _losDir);
        _losRay.near = 0.1;
        _losRay.far = Math.max(0.1, distance - 0.05);
        const hits = _losRay.intersectObjects(this.shootableMeshes, false);
        return hits.length === 0;
    }

    checkCollision(pos, radius = 0.55, height = 1.75) {
        const minX = pos.x - radius;
        const maxX = pos.x + radius;
        const minY = pos.y + 0.1;
        const maxY = pos.y + height - 0.1;
        const minZ = pos.z - radius;
        const maxZ = pos.z + radius;

        for (let i = 0; i < this.colliders.length; i++) {
            const c = this.colliders[i];
            if (c.max.y <= 0.1) continue;
            // Ramp allows walking across surface if character's feet/base is near or above step top
            if (c.isRamp && pos.y >= c.max.y - 0.5) continue;

            if (minX < c.max.x && maxX > c.min.x &&
                minY < c.max.y && maxY > c.min.y &&
                minZ < c.max.z && maxZ > c.min.z) {
                return true;
            }
        }
        return false;
    }

    resolvePenetration(pos, radius = 0.55, height = 1.75) {
        const minY = pos.y + 0.1;
        const maxY = pos.y + height - 0.1;

        // 3-pass iterative resolution for rock-solid corner & compound box depenetration
        for (let pass = 0; pass < 3; pass++) {
            for (let i = 0; i < this.colliders.length; i++) {
                const c = this.colliders[i];
                if (c.max.y <= 0.1) continue;
                if (c.isRamp && pos.y >= c.max.y - 0.5) continue;
                if (maxY <= c.min.y || minY >= c.max.y) continue;

                const minX = pos.x - radius;
                const maxX = pos.x + radius;
                const minZ = pos.z - radius;
                const maxZ = pos.z + radius;

                if (maxX > c.min.x && minX < c.max.x &&
                    maxZ > c.min.z && minZ < c.max.z) {

                    const overlapLeft = maxX - c.min.x;
                    const overlapRight = c.max.x - minX;
                    const overlapFront = maxZ - c.min.z;
                    const overlapBack = c.max.z - minZ;

                    const minOverlap = Math.min(overlapLeft, overlapRight, overlapFront, overlapBack);

                    if (minOverlap === overlapLeft) pos.x = c.min.x - radius - 0.005;
                    else if (minOverlap === overlapRight) pos.x = c.max.x + radius + 0.005;
                    else if (minOverlap === overlapFront) pos.z = c.min.z - radius - 0.005;
                    else if (minOverlap === overlapBack) pos.z = c.max.z + radius + 0.005;
                }
            }
        }
    }

    getClosestCollisionNormal(pos, radius = 0.55, height = 1.75, outNormal = null) {
        if (!outNormal) outNormal = new THREE.Vector3();
        outNormal.set(0, 0, 0);

        const minY = pos.y + 0.1;
        const maxY = pos.y + height - 0.1;
        let minOverlap = 999999;
        let found = false;
        const margin = 0.20; // Proximity margin for wall contact detection

        for (let i = 0; i < this.colliders.length; i++) {
            const c = this.colliders[i];
            if (c.max.y <= 0.1) continue;
            if (c.isRamp && pos.y >= c.max.y - 0.5) continue;
            if (maxY <= c.min.y || minY >= c.max.y) continue;

            const minX = pos.x - radius - margin;
            const maxX = pos.x + radius + margin;
            const minZ = pos.z - radius - margin;
            const maxZ = pos.z + radius + margin;

            if (maxX > c.min.x && minX < c.max.x &&
                maxZ > c.min.z && minZ < c.max.z) {

                const overlapLeft = (pos.x + radius) - c.min.x;
                const overlapRight = c.max.x - (pos.x - radius);
                const overlapFront = (pos.z + radius) - c.min.z;
                const overlapBack = c.max.z - (pos.z - radius);

                const currentMin = Math.min(overlapLeft, overlapRight, overlapFront, overlapBack);
                if (currentMin < minOverlap) {
                    minOverlap = currentMin;
                    found = true;
                    if (currentMin === overlapLeft) outNormal.set(-1, 0, 0);
                    else if (currentMin === overlapRight) outNormal.set(1, 0, 0);
                    else if (currentMin === overlapFront) outNormal.set(0, 0, -1);
                    else if (currentMin === overlapBack) outNormal.set(0, 0, 1);
                }
            }
        }
        return found;
    }

    getSafeSpawnPoint(enemyPositions = [], minDistance = 20) {
        let bestSpawn = this.spawnPoints[0];
        let maxMinDist = -1;

        for (let i = 0; i < this.spawnPoints.length; i++) {
            const sp = this.spawnPoints[i];
            let closestDist = 9999;

            for (let j = 0; j < enemyPositions.length; j++) {
                const dist = sp.distanceTo(enemyPositions[j]);
                if (dist < closestDist) {
                    closestDist = dist;
                }
            }

            if (closestDist > maxMinDist) {
                maxMinDist = closestDist;
                bestSpawn = sp;
            }
        }
        return bestSpawn.clone();
    }

    /**
     * Requirement 1: Smart Post-Kill Respawn Selection
     * Evaluates candidate spawn points with zero GC allocations using pre-allocated scratch objects.
     * Criteria:
     * - Minimum safe distance from player (>= 22m, ideally 35m-60m)
     * - Raycast Line-of-Sight occlusion (spawn behind crates/walls, NOT in open sightlines)
     * - Player camera FOV cone check (avoid spawning directly in front of the player's crosshairs)
     * - Anti-clustering (penalizes spawning on top of other alive bots)
     */
    getSmartRespawnPoint(playerPos, playerFacingDir, enemyPositions = []) {
        if (!playerPos) {
            return this.getSafeSpawnPoint(enemyPositions, 20);
        }

        _playerEye.set(playerPos.x, playerPos.y + 1.7, playerPos.z);
        let bestSpawn = null;
        let bestScore = -999999;

        for (let i = 0; i < this.spawnPoints.length; i++) {
            const sp = this.spawnPoints[i];
            const distToPlayer = sp.distanceTo(playerPos);

            // Hard reject if within 22m of the player!
            if (distToPlayer < 22) continue;

            let score = distToPlayer * 1.5;

            // Direct Line-of-Sight check:
            // Spawning in plain sight of the player is heavily penalized. Spawning behind cover is rewarded.
            _spawnEye.set(sp.x, sp.y + 1.75, sp.z);
            const hasLos = this.hasLineOfSight(_spawnEye, _playerEye);
            if (hasLos) {
                score -= 100;
            } else {
                score += 65;
            }

            // Player camera FOV cone check:
            // Do NOT spawn in the direction the player is looking
            if (playerFacingDir) {
                _candDir.subVectors(sp, playerPos);
                _candDir.y = 0;
                _candDir.normalize();
                const fovDot = _candDir.dot(playerFacingDir);
                if (fovDot > 0.4) {
                    score -= 50; // Directly in front of player's camera
                } else if (fovDot < -0.2) {
                    score += 25; // Out of player's view cone
                }
            }

            // Spread away from other alive bots to prevent bot stacking
            for (let j = 0; j < enemyPositions.length; j++) {
                const bPos = enemyPositions[j];
                if (bPos) {
                    const bDist = sp.distanceTo(bPos);
                    if (bDist < 7.0) score -= 35;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestSpawn = sp;
            }
        }

        // Fallback if all spawns were within 22m (e.g. edge-case)
        if (!bestSpawn) {
            return this.getSafeSpawnPoint(enemyPositions, 20);
        }

        return bestSpawn.clone();
    }

    /**
     * Requirement 3: Tactical Cover Search
     * Finds nearest tactical cover point within maxDist that breaks Line-of-Sight with player.
     */
    findNearestCoverPoint(fromPos, playerPos, maxDist = 18) {
        if (!fromPos || !playerPos || !this.tacticalCoverPoints) return null;

        _playerEye.set(playerPos.x, playerPos.y + 1.6, playerPos.z);
        let bestCover = null;
        let shortestDist = maxDist;

        for (let i = 0; i < this.tacticalCoverPoints.length; i++) {
            const cp = this.tacticalCoverPoints[i];
            const distFromBot = fromPos.distanceTo(cp);
            if (distFromBot > shortestDist || distFromBot < 1.0) continue;

            // Check if this cover point breaks Line-of-Sight with player
            _coverEye.set(cp.x, cp.y + 1.5, cp.z);
            const hasLos = this.hasLineOfSight(_coverEye, _playerEye);
            if (hasLos) continue; // Does not provide cover from player!

            // Vector check: Ensure moving to this cover does not push directly toward player
            _toCover.subVectors(cp, fromPos).normalize();
            _candDir.subVectors(playerPos, fromPos).normalize();
            const approachDot = _toCover.dot(_candDir);
            if (approachDot > 0.75) continue; // Heading directly into the player

            shortestDist = distFromBot;
            bestCover = cp;
        }

        return bestCover ? bestCover.clone() : null;
    }
}

window.GameMap = GameMap;
