/**
 * FPS Striker Arcade Booster & Power-Up System
 * 
 * Features 3 High-Impact Arcade Power-Ups:
 * 1. ADRENALINE BURST: +40% Speed, 1.5x Slide, Dynamic FOV warp feel (10s)
 * 2. HYPER DAMAGE: 2.5x Quad Weapon Damage, Crimson Tracers & Muzzle Flashes (8s)
 * 3. NANO-SHIELD: +50 Overheal Armor, Absorbs Damage Before Health (15s)
 * 
 * Architecture:
 * - Shared geometries and materials for Zero GC allocations.
 * - Distinctive 3D voxel/geometric pickup models that bob and rotate.
 * - Strategic static tactical pads and dynamic multi-kill drops (25%+ on 3+ streaks).
 */

// Module-level pre-allocated scratch objects (Zero-GC invariant)
const _b_v1 = new THREE.Vector3();
const _b_v2 = new THREE.Vector3();
const _playerPosScratch = new THREE.Vector3();

class BoosterManager {
    constructor(scene, particles, audio) {
        this.scene = scene;
        this.particles = particles;
        this.audio = audio;

        this.time = 0;
        this.pickups = []; // Static & dynamic pickups
        this.materials = {};
        this.geometries = {};

        this.initSharedResources();
        this.initStaticPads();
    }

    initSharedResources() {
        // Shared Geometries
        this.geometries.pedestal = new THREE.CylinderGeometry(0.72, 0.82, 0.12, 16);
        this.geometries.floorGlow = new THREE.RingGeometry(0.75, 1.15, 24);
        
        // Speed Booster Geometries (Adrenaline Burst)
        this.geometries.octaCore = new THREE.OctahedronGeometry(0.32, 0);
        this.geometries.torusRing1 = new THREE.TorusGeometry(0.48, 0.04, 8, 24);
        this.geometries.torusRing2 = new THREE.TorusGeometry(0.58, 0.035, 8, 24);
        this.geometries.boltVoxel = new THREE.BoxGeometry(0.12, 0.38, 0.12);

        // Hyper Damage Geometries (Crimson Spiked Star / Prism)
        this.geometries.spikeCore = new THREE.OctahedronGeometry(0.38, 0);
        this.geometries.starHorn = new THREE.ConeGeometry(0.14, 0.34, 4);
        this.geometries.damageRing = new THREE.TorusGeometry(0.52, 0.045, 4, 16);
        this.geometries.floatingShard = new THREE.OctahedronGeometry(0.12, 0);

        // Nano-Shield Geometries (Aegis Hexagonal Crest & Pulsing Orbit)
        this.geometries.hexShield = new THREE.CylinderGeometry(0.44, 0.44, 0.12, 6);
        this.geometries.shieldCrossV = new THREE.BoxGeometry(0.10, 0.46, 0.14);
        this.geometries.shieldCrossH = new THREE.BoxGeometry(0.32, 0.10, 0.14);
        this.geometries.hexAuraRing = new THREE.CylinderGeometry(0.62, 0.62, 0.035, 6, 1, true);

        // Shared Materials
        this.materials.pedestalDark = new THREE.MeshLambertMaterial({ color: 0x181c24 });
        
        // Speed Colors (Neon Cyan / Emerald Green)
        this.materials.speedCore = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        this.materials.speedRing = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: false });
        this.materials.speedGlow = new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });

        // Damage Colors (Blazing Ruby / Crimson Star)
        this.materials.damageCore = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        this.materials.damageRing = new THREE.MeshBasicMaterial({ color: 0xff2200, wireframe: false });
        this.materials.damageGlow = new THREE.MeshBasicMaterial({ color: 0xff0033, side: THREE.DoubleSide, transparent: true, opacity: 0.70 });

        // Shield Colors (Electric Gold / Amber Aegis)
        this.materials.shieldCore = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        this.materials.shieldTrim = new THREE.MeshBasicMaterial({ color: 0xffe066 });
        this.materials.shieldAura = new THREE.MeshBasicMaterial({ color: 0xffbb00, wireframe: true, transparent: true, opacity: 0.85 });
        this.materials.shieldGlow = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
    }

    createBoosterMesh(type) {
        const rootGroup = new THREE.Group();

        // 1. Pedestal Base
        const pedestal = new THREE.Mesh(this.geometries.pedestal, this.materials.pedestalDark);
        pedestal.position.y = 0.06;
        rootGroup.add(pedestal);

        // 2. Floor Radiant Beacon Ring
        let glowMat = this.materials.speedGlow;
        let lightColor = 0x00ffcc;

        if (type === 'damage') {
            glowMat = this.materials.damageGlow;
            lightColor = 0xff0044;
        } else if (type === 'shield') {
            glowMat = this.materials.shieldGlow;
            lightColor = 0xffaa00;
        }

        const floorRing = new THREE.Mesh(this.geometries.floorGlow, glowMat);
        floorRing.rotation.x = -Math.PI / 2;
        floorRing.position.y = 0.13;
        rootGroup.add(floorRing);

        // 3. Floating Animated Center Model
        const floatingGroup = new THREE.Group();
        floatingGroup.position.y = 1.25;

        // Visual Nodes to animate
        const animNodes = {
            floatingGroup: floatingGroup,
            core: null,
            ring1: null,
            ring2: null,
            shards: []
        };

        if (type === 'speed') {
            // "ADRENALINE BURST": Neon green/cyan spinning energy bolt & dual-ring voxel orb
            const coreMesh = new THREE.Mesh(this.geometries.octaCore, this.materials.speedCore);
            floatingGroup.add(coreMesh);
            animNodes.core = coreMesh;

            // Bolt accents
            const bolt1 = new THREE.Mesh(this.geometries.boltVoxel, this.materials.speedRing);
            bolt1.rotation.z = Math.PI / 4;
            coreMesh.add(bolt1);

            const r1 = new THREE.Mesh(this.geometries.torusRing1, this.materials.speedRing);
            floatingGroup.add(r1);
            animNodes.ring1 = r1;

            const r2 = new THREE.Mesh(this.geometries.torusRing2, this.materials.speedCore);
            r2.rotation.x = Math.PI / 3;
            floatingGroup.add(r2);
            animNodes.ring2 = r2;

        } else if (type === 'damage') {
            // "HYPER DAMAGE": Blazing ruby/crimson spinning spiked star / crystal prism
            const coreMesh = new THREE.Mesh(this.geometries.spikeCore, this.materials.damageCore);
            floatingGroup.add(coreMesh);
            animNodes.core = coreMesh;

            // 4 Spiked horns emerging from star
            const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
            angles.forEach(ang => {
                const horn = new THREE.Mesh(this.geometries.starHorn, this.materials.damageRing);
                horn.position.set(Math.cos(ang) * 0.38, 0, Math.sin(ang) * 0.38);
                horn.rotation.z = -Math.PI / 2;
                horn.rotation.y = -ang;
                coreMesh.add(horn);
            });

            const r1 = new THREE.Mesh(this.geometries.damageRing, this.materials.damageRing);
            floatingGroup.add(r1);
            animNodes.ring1 = r1;

            // 4 Floating orbiting shards
            for (let i = 0; i < 4; i++) {
                const shard = new THREE.Mesh(this.geometries.floatingShard, this.materials.damageCore);
                floatingGroup.add(shard);
                animNodes.shards.push(shard);
            }

        } else if (type === 'shield') {
            // "NANO-SHIELD": Electric gold/amber rotating aegis hexagonal shield badge
            const shieldMesh = new THREE.Mesh(this.geometries.hexShield, this.materials.shieldCore);
            shieldMesh.rotation.x = Math.PI / 2;
            floatingGroup.add(shieldMesh);
            animNodes.core = shieldMesh;

            // Embossed Golden Cross
            const crossV = new THREE.Mesh(this.geometries.shieldCrossV, this.materials.shieldTrim);
            const crossH = new THREE.Mesh(this.geometries.shieldCrossH, this.materials.shieldTrim);
            shieldMesh.add(crossV);
            shieldMesh.add(crossH);

            // Orbiting Hex Aura
            const aura = new THREE.Mesh(this.geometries.hexAuraRing, this.materials.shieldAura);
            floatingGroup.add(aura);
            animNodes.ring1 = aura;
        }

        // Point Light attached to power-up
        const light = new THREE.PointLight(lightColor, 1.5, 9.0);
        light.position.y = 1.35;
        rootGroup.add(light);
        animNodes.light = light;

        rootGroup.add(floatingGroup);

        return {
            root: rootGroup,
            animNodes: animNodes
        };
    }

    initStaticPads() {
        // Place 3 Strategic Arena Power-Up Pads across Outpost
        const padConfigs = [
            {
                type: 'damage',
                name: 'HYPER DAMAGE',
                x: 0,
                y: 2.05,
                z: 0,
                desc: '2.5x Quad Weapon Damage'
            },
            {
                type: 'speed',
                name: 'ADRENALINE BURST',
                x: -24,
                y: 0,
                z: 24,
                desc: '+40% Speed & Slide-Hop Boost'
            },
            {
                type: 'shield',
                name: 'NANO-SHIELD',
                x: 24,
                y: 0,
                z: -24,
                desc: '+50 Overheal Armor Shield'
            }
        ];

        padConfigs.forEach(cfg => {
            const meshBundle = this.createBoosterMesh(cfg.type);
            meshBundle.root.position.set(cfg.x, cfg.y, cfg.z);
            this.scene.add(meshBundle.root);

            this.pickups.push({
                type: cfg.type,
                name: cfg.name,
                isStatic: true,
                isActive: true,
                respawnTimer: 0,
                maxRespawnTime: 25.0, // Respawns 25s after collection
                x: cfg.x,
                y: cfg.y,
                z: cfg.z,
                baseY: cfg.y + 1.25,
                bobOffset: Math.random() * Math.PI * 2,
                root: meshBundle.root,
                animNodes: meshBundle.animNodes
            });
        });
    }

    // Dynamic Multi-Kill Spawn (Rare 25-30% drop on killstreak)
    spawnMultiKillDrop(position, forcedType = null) {
        const types = ['speed', 'damage', 'shield'];
        const chosenType = forcedType || types[Math.floor(Math.random() * types.length)];

        const meshBundle = this.createBoosterMesh(chosenType);
        meshBundle.root.position.set(position.x, position.y + 0.1, position.z);
        this.scene.add(meshBundle.root);

        this.pickups.push({
            type: chosenType,
            name: chosenType === 'speed' ? 'ADRENALINE BURST' : (chosenType === 'damage' ? 'HYPER DAMAGE' : 'NANO-SHIELD'),
            isStatic: false,
            isActive: true,
            despawnTimer: 24.0, // Disappears after 24s if unclaimed
            x: position.x,
            y: position.y,
            z: position.z,
            baseY: position.y + 1.25,
            bobOffset: Math.random() * Math.PI * 2,
            root: meshBundle.root,
            animNodes: meshBundle.animNodes
        });
    }

    update(dt, player) {
        this.time += dt;

        if (!player || !player.yawObject) return;
        _playerPosScratch.copy(player.yawObject.position);

        const isGameActive = !!(window.game && window.game.isGameStarted && !player.isDead);

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];

            // 1. Handle Respawn / Despawn Timers
            if (!p.isActive) {
                if (p.isStatic) {
                    p.respawnTimer -= dt;
                    if (p.respawnTimer <= 0) {
                        p.isActive = true;
                        p.root.visible = true;
                        if (p.animNodes.light) p.animNodes.light.intensity = 1.5;
                        // Spawn burst visual
                        this.particles.createBoosterPickupEffect(p.root.position, p.type === 'speed' ? 0x00ffcc : (p.type === 'damage' ? 0xff0044 : 0xffaa00));
                    }
                }
                continue;
            }

            if (!p.isStatic) {
                p.despawnTimer -= dt;
                // Blink when expiring (< 4s)
                if (p.despawnTimer < 4.0) {
                    p.root.visible = (Math.sin(this.time * 16.0) > 0);
                }
                if (p.despawnTimer <= 0) {
                    this.scene.remove(p.root);
                    this.pickups.splice(i, 1);
                    continue;
                }
            }

            // 2. High-Fidelity Bobbing & Rotating Animation
            const anim = p.animNodes;
            const floatGrp = anim.floatingGroup;
            
            // Bobbing: Math.sin(time * 3.5) * 0.15
            floatGrp.position.y = 1.25 + Math.sin(this.time * 3.5 + p.bobOffset) * 0.15;
            floatGrp.rotation.y += dt * 2.2;

            if (p.type === 'speed') {
                if (anim.core) anim.core.rotation.z += dt * 3.0;
                if (anim.ring1) {
                    anim.ring1.rotation.x += dt * 3.5;
                    anim.ring1.rotation.y += dt * 2.5;
                }
                if (anim.ring2) {
                    anim.ring2.rotation.y -= dt * 4.0;
                    anim.ring2.rotation.z += dt * 2.0;
                }
            } else if (p.type === 'damage') {
                if (anim.core) {
                    anim.core.rotation.x += dt * 2.8;
                    anim.core.rotation.y += dt * 3.2;
                }
                if (anim.ring1) {
                    anim.ring1.rotation.z += dt * 4.5;
                }
                if (anim.shards) {
                    anim.shards.forEach((shard, sIdx) => {
                        const ang = this.time * 3.2 + (sIdx * Math.PI / 2);
                        shard.position.set(Math.cos(ang) * 0.65, Math.sin(ang * 2) * 0.12, Math.sin(ang) * 0.65);
                        shard.rotation.x += dt * 4.0;
                        shard.rotation.y += dt * 4.0;
                    });
                }
            } else if (p.type === 'shield') {
                if (anim.core) {
                    anim.core.rotation.z += dt * 1.8;
                }
                if (anim.ring1) {
                    anim.ring1.rotation.y -= dt * 3.2;
                    anim.ring1.rotation.x = Math.sin(this.time * 2.5) * 0.3;
                }
            }

            // Pulsing Point Light
            if (anim.light) {
                anim.light.intensity = 1.4 + Math.sin(this.time * 6.0) * 0.35;
            }

            // 3. Player Pickup Collision Detection (Zero GC Distance check)
            if (isGameActive) {
                _b_v1.set(p.x, p.y + 1.0, p.z);
                const distSq = _b_v1.distanceToSquared(_playerPosScratch);

                if (distSq < 2.2 * 2.2) {
                    // Collect Booster!
                    this.collectBooster(p, player);
                }
            }
        }
    }

    collectBooster(pickup, player) {
        // Apply effect to player
        player.applyBooster(pickup.type);

        if (window.uiManager && typeof window.uiManager.addChatBoosterMessage === 'function') {
            const labels = { speed: 'ADRENALINE BURST', damage: 'HYPER DAMAGE', shield: 'NANO-SHIELD' };
            window.uiManager.addChatBoosterMessage('YOU', labels[pickup.type] || pickup.type.toUpperCase());
        }

        // Particle FX
        const color = pickup.type === 'speed' ? 0x00ffcc : (pickup.type === 'damage' ? 0xff0044 : 0xffaa00);
        this.particles.createBoosterPickupEffect(pickup.root.position, color);

        if (pickup.isStatic) {
            pickup.isActive = false;
            pickup.root.visible = false;
            pickup.respawnTimer = pickup.maxRespawnTime;
        } else {
            this.scene.remove(pickup.root);
            const idx = this.pickups.indexOf(pickup);
            if (idx !== -1) {
                this.pickups.splice(idx, 1);
            }
        }
    }

    reset() {
        this.pickups.forEach(p => {
            if (p.isStatic) {
                p.isActive = true;
                p.root.visible = true;
                p.respawnTimer = 0;
            } else {
                this.scene.remove(p.root);
            }
        });
        this.pickups = this.pickups.filter(p => p.isStatic);
    }
}

window.BoosterManager = BoosterManager;
