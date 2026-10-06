/**
 * FPS STRIKER // DYNAMIC LOOT DROP & KILL-STREAK COMBO SYSTEM
 * 
 * Features:
 * 1. Timestamp-based kill chain combos:
 *    - Double Kill (<= 3.0s interval)
 *    - Triple Kill (<= 6.0s chain or <= 3.0s interval)
 *    - Multi / Mega Kill (4x, 5x+ streak)
 * 2. Dynamic 3D Voxel Ammo Crate Drops on Dead Bots:
 *    - 100% drop chance on multi-kills (double+), 60% on regular kills
 *    - 5 Tailored weapon crate types (AR, Sniper, Shotgun, SMG, Revolver)
 *    - Continuous bobbing (Math.sin(time * 3)), rotation, and pulsing glow
 * 3. Strict No-Stack Cap Rule:
 *    - Never exceeds max initial capacity (magSize + maxReserve)
 *    - If capped: Drop is not consumed, plays bounce & "AMMO FULL"
 *    - If room: Adds up to cap, plays procedural pickup audio, displays floating feedback
 * 4. High Performance & Zero-GC:
 *    - 20 max active drops cap (oldest despawns)
 *    - 25s auto-cleanup with fading blink
 *    - Pre-pooled geometries, shared materials, and zero allocations in update loop
 */

// Module-level scratch vectors to guarantee zero GC allocations in the update loop
const _lootScratch = new THREE.Vector3();
const _lootDiff = new THREE.Vector3();

class LootSystem {
    constructor(scene, player, weapons, audio, particles) {
        this.scene = scene;
        this.player = player;
        this.weapons = weapons;
        this.audio = audio;
        this.particles = particles;

        // Kill chain tracking
        this.lastKillTime = 0;
        this.firstChainKillTime = 0;
        this.killChainCount = 0;

        // World drops state
        this.drops = [];
        this.maxDrops = 20;
        this.dropLifespan = 25.0; // 25 seconds lifetime

        // 5 Tailored Weapon Drop Definitions (Strict caps match initial loadout capacities)
        this.dropDefs = {
            ar: {
                id: 'ar',
                name: 'AR Ammo Box',
                shortName: 'AR AMMO',
                amount: 30,
                maxCapacity: 120, // 30 mag + 90 reserve
                color: 0x15803d, // Tactical forest green
                glowColor: 0x4ade80,
                label: '+30 AR AMMO'
            },
            sniper: {
                id: 'sniper',
                name: 'Sniper Ammo Box',
                shortName: 'SNIPER AMMO',
                amount: 3,
                maxCapacity: 9, // 3 mag + 6 reserve
                color: 0x0284c7, // Marksman azure cyan
                glowColor: 0x38bdf8,
                label: '+3 SNIPER AMMO'
            },
            shotgun: {
                id: 'shotgun',
                name: 'Shotgun Shells',
                shortName: 'SHOTGUN SHELLS',
                amount: 4,
                maxCapacity: 16, // 2 mag + 14 reserve
                color: 0xb91c1c, // Crimson breacher red
                glowColor: 0xf87171,
                label: '+4 SHOTGUN SHELLS'
            },
            smg: {
                id: 'smg',
                name: 'SMG Ammo Box',
                shortName: 'SMG AMMO',
                amount: 34,
                maxCapacity: 170, // 34 mag + 136 reserve
                color: 0xd97706, // Amber skirmisher gold
                glowColor: 0xfbbf24,
                label: '+34 SMG AMMO'
            },
            revolver: {
                id: 'revolver',
                name: 'Revolver Cylinder',
                shortName: 'REVOLVER AMMO',
                amount: 6,
                maxCapacity: 18, // 6 mag + 12 reserve
                color: 0x7e22ce, // Royal enforcer purple
                glowColor: 0xc084fc,
                label: '+6 REVOLVER AMMO'
            }
        };

        this.initResources();

        // Mesh Object Pool (categorized by weapon id)
        this.meshPool = {
            ar: [],
            sniper: [],
            shotgun: [],
            smg: [],
            revolver: []
        };
    }

    /**
     * Pre-allocates shared geometries & materials (Zero runtime mesh geometry generation)
     */
    initResources() {
        // Geometries
        this.geoCrateBody = new THREE.BoxGeometry(0.44, 0.28, 0.34);
        this.geoCrateLid = new THREE.BoxGeometry(0.46, 0.08, 0.36);
        this.geoCrateStrap = new THREE.BoxGeometry(0.47, 0.29, 0.08);
        this.geoGlowCore = new THREE.BoxGeometry(0.22, 0.16, 0.20);
        this.geoCylinder = new THREE.CylinderGeometry(0.18, 0.18, 0.30, 8);
        this.geoCylinderCap = new THREE.CylinderGeometry(0.19, 0.19, 0.06, 8);
        this.geoGroundShadow = new THREE.PlaneGeometry(0.52, 0.52);

        // Common Materials
        this.matDarkTrim = new THREE.MeshLambertMaterial({ color: 0x1f242d });
        this.matMetalStrap = new THREE.MeshLambertMaterial({ color: 0x475569 });
        this.matShadow = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 });

        // Weapon Specific Materials
        this.bodyMaterials = {
            ar: new THREE.MeshLambertMaterial({ color: this.dropDefs.ar.color }),
            sniper: new THREE.MeshLambertMaterial({ color: this.dropDefs.sniper.color }),
            shotgun: new THREE.MeshLambertMaterial({ color: this.dropDefs.shotgun.color }),
            smg: new THREE.MeshLambertMaterial({ color: this.dropDefs.smg.color }),
            revolver: new THREE.MeshLambertMaterial({ color: this.dropDefs.revolver.color })
        };

        this.glowMaterials = {
            ar: new THREE.MeshBasicMaterial({ color: this.dropDefs.ar.glowColor, transparent: true, opacity: 0.75 }),
            sniper: new THREE.MeshBasicMaterial({ color: this.dropDefs.sniper.glowColor, transparent: true, opacity: 0.75 }),
            shotgun: new THREE.MeshBasicMaterial({ color: this.dropDefs.shotgun.glowColor, transparent: true, opacity: 0.75 }),
            smg: new THREE.MeshBasicMaterial({ color: this.dropDefs.smg.glowColor, transparent: true, opacity: 0.75 }),
            revolver: new THREE.MeshBasicMaterial({ color: this.dropDefs.revolver.glowColor, transparent: true, opacity: 0.75 })
        };
    }

    /**
     * Constructs a voxel ammo pickup mesh using pre-allocated geometries & materials
     */
    buildPickupMesh(type) {
        const root = new THREE.Group();
        const bodyMat = this.bodyMaterials[type] || this.bodyMaterials.ar;
        const glowMat = this.glowMaterials[type] || this.glowMaterials.ar;

        if (type === 'revolver') {
            // Revolver cylinder drum model
            const cyl = new THREE.Mesh(this.geoCylinder, bodyMat);
            cyl.position.y = 0.16;
            cyl.castShadow = true;
            root.add(cyl);

            const topCap = new THREE.Mesh(this.geoCylinderCap, this.matDarkTrim);
            topCap.position.y = 0.29;
            root.add(topCap);

            const botCap = new THREE.Mesh(this.geoCylinderCap, this.matDarkTrim);
            botCap.position.y = 0.03;
            root.add(botCap);

            // Glowing primer core
            const glow = new THREE.Mesh(this.geoGlowCore, glowMat);
            glow.position.y = 0.16;
            root.add(glow);
            root.userData.glowMesh = glow;
        } else {
            // Tactical military ammo box model
            const body = new THREE.Mesh(this.geoCrateBody, bodyMat);
            body.position.y = 0.14;
            body.castShadow = true;
            root.add(body);

            const lid = new THREE.Mesh(this.geoCrateLid, this.matDarkTrim);
            lid.position.y = 0.28;
            root.add(lid);

            const strap = new THREE.Mesh(this.geoCrateStrap, this.matMetalStrap);
            strap.position.y = 0.14;
            root.add(strap);

            const glow = new THREE.Mesh(this.geoGlowCore, glowMat);
            glow.position.y = 0.15;
            root.add(glow);
            root.userData.glowMesh = glow;
        }

        // Ground shadow plane
        const shadow = new THREE.Mesh(this.geoGroundShadow, this.matShadow);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.015;
        root.add(shadow);
        root.userData.shadowMesh = shadow;

        return root;
    }

    getMesh(type) {
        const pool = this.meshPool[type];
        if (pool && pool.length > 0) {
            const mesh = pool.pop();
            mesh.visible = true;
            return mesh;
        }
        return this.buildPickupMesh(type);
    }

    recycleMesh(type, mesh) {
        if (!mesh) return;
        mesh.visible = false;
        if (mesh.parent) mesh.parent.remove(mesh);
        if (this.meshPool[type]) {
            this.meshPool[type].push(mesh);
        }
    }

    /**
     * Requirement 1: Kill chain timestamp tracking
     * - Double Kill: interval <= 3.0s between kills.
     * - Triple Kill: interval <= 6.0s (or <= 3s from previous kill).
     * - Multi / Mega Kill: 4x, 5x+ streak.
     */
    recordKill(killer) {
        const now = performance.now() / 1000;
        const timeSinceLastKill = now - this.lastKillTime;
        const timeSinceChainStart = now - this.firstChainKillTime;

        if (this.lastKillTime > 0 && (timeSinceLastKill <= 3.0 || (this.killChainCount === 2 && timeSinceChainStart <= 6.0))) {
            this.killChainCount++;
        } else {
            this.killChainCount = 1;
            this.firstChainKillTime = now;
        }
        this.lastKillTime = now;

        const isMultiKill = this.killChainCount >= 2;
        let comboName = 'SINGLE';
        if (this.killChainCount === 2) comboName = 'DOUBLE KILL';
        else if (this.killChainCount === 3) comboName = 'TRIPLE KILL';
        else if (this.killChainCount === 4) comboName = 'MULTI KILL';
        else if (this.killChainCount >= 5) comboName = 'MEGA KILL';

        return {
            comboCount: this.killChainCount,
            isMultiKill: isMultiKill,
            comboName: comboName
        };
    }

    /**
     * Tailors dynamic ammo crates to current combat context
     * Prioritizes equipped/killer weapon if depleted, or other depleted weapons
     */
    selectTailoredWeapon(killerWeaponName) {
        const weaponKeys = ['ar', 'sniper', 'shotgun', 'smg', 'revolver'];

        let killerKey = null;
        if (killerWeaponName) {
            const lower = killerWeaponName.toLowerCase();
            if (lower.includes('sniper')) killerKey = 'sniper';
            else if (lower.includes('shotgun')) killerKey = 'shotgun';
            else if (lower.includes('smg')) killerKey = 'smg';
            else if (lower.includes('revolver')) killerKey = 'revolver';
            else if (lower.includes('ar') || lower.includes('rifle') || lower.includes('commando')) killerKey = 'ar';
        }
        if (!killerKey && this.weapons) {
            killerKey = this.weapons.currentWeaponKey;
        }

        const ammoState = this.weapons ? this.weapons.ammoState : null;
        if (!ammoState) {
            return killerKey || weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
        }

        // 1. If killer/equipped weapon is below cap, spawn that!
        if (killerKey && this.dropDefs[killerKey]) {
            const def = this.dropDefs[killerKey];
            const state = ammoState[killerKey];
            if (state && (state.clip + state.reserve < def.maxCapacity)) {
                return killerKey;
            }
        }

        // 2. Otherwise find other weapons that have room for ammo
        const needyWeapons = [];
        for (let i = 0; i < weaponKeys.length; i++) {
            const key = weaponKeys[i];
            const def = this.dropDefs[key];
            const state = ammoState[key];
            if (state && (state.clip + state.reserve < def.maxCapacity)) {
                needyWeapons.push(key);
            }
        }

        if (needyWeapons.length > 0) {
            return needyWeapons[Math.floor(Math.random() * needyWeapons.length)];
        }

        // 3. Fallback to killer weapon or random
        return killerKey || weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
    }

    /**
     * Requirement 2: Dead bot drops
     * - Spawns pickup crate at bot position
     * - 100% chance on multi-kill (double+), 60% on regular kill
     */
    onBotDeath(bot, killer, isHeadshot, weaponName) {
        if (!bot || !bot.position) return null;

        const isPlayerKiller = !!killer && (killer === this.player || killer === window.playerController);
        let comboInfo = null;
        let isMultiKill = false;

        if (isPlayerKiller) {
            comboInfo = this.recordKill(killer);
            isMultiKill = comboInfo.isMultiKill;
        }

        // Drop chance: 100% on multi-kill (double+), 60% on regular kill
        const dropChance = isMultiKill ? 1.0 : 0.60;
        if (Math.random() <= dropChance) {
            const targetType = this.selectTailoredWeapon(weaponName);
            this.spawnDrop(bot.position, targetType);
        }

        return comboInfo;
    }

    /**
     * Spawns a dynamic 3D drop crate in the world
     */
    spawnDrop(position, weaponKey = 'ar') {
        const def = this.dropDefs[weaponKey] || this.dropDefs.ar;

        // Requirement 4: Max 20 drops limit in world (oldest despawns)
        while (this.drops.length >= this.maxDrops) {
            this.removeDrop(0);
        }

        const mesh = this.getMesh(def.id);
        const spawnY = Math.max(0.08, position.y);
        mesh.position.set(position.x, spawnY + 0.35, position.z);
        mesh.rotation.set(0, Math.random() * Math.PI * 2, 0);

        this.scene.add(mesh);

        const drop = {
            id: 'drop_' + Date.now() + '_' + Math.random(),
            type: def.id,
            def: def,
            mesh: mesh,
            baseY: spawnY,
            lifetime: 0,
            seed: Math.random() * 10,
            bounceTimer: 0,
            fullPromptCooldown: 0
        };

        this.drops.push(drop);
        return drop;
    }

    /**
     * Zero-GC update loop for drops bobbing, rotation, timeout, and player collision
     */
    update(dt) {
        if (!this.player || !this.player.yawObject) return;

        const playerPos = this.player.yawObject.position;
        const isDead = this.player.isDead;

        for (let i = this.drops.length - 1; i >= 0; i--) {
            const drop = this.drops[i];
            drop.lifetime += dt;

            // Debounce timer for "AMMO FULL" floating text
            if (drop.fullPromptCooldown > 0) {
                drop.fullPromptCooldown -= dt;
            }

            // Requirement 4: Auto-cleanup of drops after 25s
            if (drop.lifetime >= this.dropLifespan) {
                this.removeDrop(i);
                continue;
            }

            // Fading blink during final 4 seconds (t > 21s)
            if (drop.lifetime > 21.0) {
                const blink = Math.floor(drop.lifetime * 8) % 2 === 0;
                drop.mesh.visible = blink;
            } else {
                drop.mesh.visible = true;
            }

            // Requirement 2: Subtle glow/bobbing animations (Math.sin(time * 3) bob and rotation)
            const bob = Math.sin((drop.lifetime + drop.seed) * 3.0) * 0.09;
            let currentY = drop.baseY + 0.32 + bob;

            // Subtle rejection bounce animation when ammo is full
            if (drop.bounceTimer > 0) {
                drop.bounceTimer -= dt;
                const bounce = Math.sin(drop.bounceTimer * 18.0) * 0.16;
                currentY += Math.max(0, bounce);
            }

            drop.mesh.position.y = currentY;
            drop.mesh.rotation.y += 1.75 * dt;

            // Pulse glowing core accent
            if (drop.mesh.userData && drop.mesh.userData.glowMesh) {
                const glowMat = drop.mesh.userData.glowMesh.material;
                if (glowMat) {
                    glowMat.opacity = 0.50 + 0.35 * Math.sin((drop.lifetime + drop.seed) * 4.0);
                }
            }

            // Collision check with player (collection radius ~1.4m)
            if (!isDead) {
                const dx = drop.mesh.position.x - playerPos.x;
                const dy = drop.mesh.position.y - (playerPos.y - 0.85);
                const dz = drop.mesh.position.z - playerPos.z;
                const distSq = dx * dx + dz * dz;

                if (distSq < 2.0 && Math.abs(dy) < 2.0) {
                    this.tryCollectDrop(drop, i);
                }
            }
        }
    }

    /**
     * Requirement 3 (CRITICAL): No-Stack Cap Rule
     * Pickups must NEVER exceed the gun's maximum initial capacity:
     * - AR: 30 + 90 = 120 total bullets.
     * - Sniper: 3 + 6 = 9 total bullets.
     * - Shotgun: 2 + 14 = 16 total shells.
     * - SMG: 34 + 136 = 170 total bullets.
     * - Revolver: 6 + 12 = 18 total bullets.
     * Total bullets = current.clip + current.reserve.
     */
    tryCollectDrop(drop, index) {
        if (!this.weapons || !this.weapons.ammoState) return;

        const weaponKey = drop.type;
        const ammoState = this.weapons.ammoState[weaponKey];
        if (!ammoState) return;

        const maxCapacity = drop.def.maxCapacity;
        const totalBullets = ammoState.clip + ammoState.reserve;

        // If player is already capped for that weapon:
        if (totalBullets >= maxCapacity) {
            // Drop is NOT consumed!
            // Displays floating feedback "AMMO FULL" or subtle bounce
            if (drop.fullPromptCooldown <= 0) {
                drop.fullPromptCooldown = 1.0;
                drop.bounceTimer = 0.35;
                if (this.particles && typeof this.particles.addDamageNumber === 'function') {
                    this.particles.addDamageNumber('AMMO FULL', drop.mesh.position);
                }
            }
            return;
        }

        // If player has room:
        // Add to reserve up to the cap:
        // ammo.reserve = Math.min(ammo.reserve + addAmount, maxCapacity - ammo.clip)
        const oldReserve = ammoState.reserve;
        const addAmount = drop.def.amount;
        ammoState.reserve = Math.min(ammoState.reserve + addAmount, maxCapacity - ammoState.clip);
        const actualAdded = ammoState.reserve - oldReserve;

        // Play procedural pickup sound
        if (this.audio && typeof this.audio.playAmmoPickup === 'function') {
            this.audio.playAmmoPickup();
        }

        // Display floating feedback (e.g. "+30 AR AMMO")
        const feedbackText = `+${actualAdded} ${drop.def.shortName}`;
        if (this.particles) {
            if (typeof this.particles.addFloatingText === 'function') {
                this.particles.addFloatingText(feedbackText, drop.mesh.position, 'ammo-pickup');
            } else if (typeof this.particles.addDamageNumber === 'function') {
                this.particles.addDamageNumber(feedbackText, drop.mesh.position);
            }
        }

        // Immediately update HUD if player is currently holding this weapon
        if (window.uiManager && this.weapons.currentWeaponKey === weaponKey) {
            window.uiManager.updateWeaponUI(this.weapons.currentWeapon, ammoState);
        }

        // Remove pickup mesh and recycle to pool
        this.removeDrop(index);
    }

    removeDrop(index) {
        if (index < 0 || index >= this.drops.length) return;
        const drop = this.drops[index];
        this.recycleMesh(drop.type, drop.mesh);
        this.drops.splice(index, 1);
    }

    clearAllDrops() {
        for (let i = this.drops.length - 1; i >= 0; i--) {
            this.removeDrop(i);
        }
        this.killChainCount = 0;
        this.lastKillTime = 0;
        this.firstChainKillTime = 0;
    }
}

// Global class exports & alias
window.LootSystem = LootSystem;
window.DropManager = LootSystem;
