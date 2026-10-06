/**
 * FPS Striker Voxel Bot AI System (Smart Tactical AI)
 * Features:
 * - Smart wall avoidance (No rotating in place or getting trapped)
 * - Human-like aiming with smooth tracking and natural angular spread
 * - Low-health tactical retreats towards cover
 * - High resolution tactical armor skin
 */

// Pre-allocated scratch objects for zero-GC render loop (Rule: No allocations in tick)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _botEyePos = new THREE.Vector3();
const _playerEyePos = new THREE.Vector3();
const _probeCenter = new THREE.Vector3();
const _probeLeft = new THREE.Vector3();
const _probeRight = new THREE.Vector3();
const _nextX = new THREE.Vector3();
const _nextZ = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _tracerEnd = new THREE.Vector3();
const _playerCenter = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _closestPoint = new THREE.Vector3();
const _centerDir = new THREE.Vector3();
const _wpDir = new THREE.Vector3();
const _flankDir = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _nextFull = new THREE.Vector3();
const _surfaceNormal = new THREE.Vector3();
const _unstuckDir = new THREE.Vector3();
const _botBulletRay = new THREE.Raycaster();
const _wallHitNormal = new THREE.Vector3();
const _botCandDir = new THREE.Vector3();
const _wallRepulse = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _toBot = new THREE.Vector3();

// Combat Archetypes & Personality Matrix
const BOT_ARCHETYPES = {
    HUNTER: {
        archetype: 'HUNTER',
        roleTitle: 'Hunter',
        suitColor: 0x242830,
        tieColor: 0xb91c1c, // Aggressive Crimson
        hairColor: 0x1a1a1a,
        themeHex: '#ef4444',
        speed: 8.2,
        strafeSpeed: 5.0,
        reactionTime: 0.26,
        fireInterval: 0.44,
        retreatThreshold: 22,
        preferredRangeMin: 6,
        preferredRangeMax: 12,
        hopChanceEngage: 0.75,
        hopCooldownBase: 2.0,
        spreadBase: 0.055,
        targetMemory: 2.2
    },
    FLANKER: {
        archetype: 'FLANKER',
        roleTitle: 'Flanker',
        suitColor: 0x1e293b,
        tieColor: 0xd97706, // Tactical Amber
        hairColor: 0x3d2719,
        themeHex: '#f59e0b',
        speed: 7.6,
        strafeSpeed: 5.8,
        reactionTime: 0.32,
        fireInterval: 0.50,
        retreatThreshold: 35,
        preferredRangeMin: 12,
        preferredRangeMax: 18,
        hopChanceEngage: 0.60,
        hopCooldownBase: 2.4,
        spreadBase: 0.050,
        targetMemory: 1.4
    },
    PATROLLER: {
        archetype: 'PATROLLER',
        roleTitle: 'Patroller',
        suitColor: 0x334155,
        tieColor: 0x7f1d1d, // Classic Maroon
        hairColor: 0x4a3728,
        themeHex: '#94a3b8',
        speed: 6.8,
        strafeSpeed: 4.0,
        reactionTime: 0.44,
        fireInterval: 0.54,
        retreatThreshold: 30,
        preferredRangeMin: 10,
        preferredRangeMax: 20,
        hopChanceEngage: 0.35,
        hopCooldownBase: 3.5,
        spreadBase: 0.050,
        targetMemory: 1.4
    },
    CAMPER: {
        archetype: 'CAMPER',
        roleTitle: 'Camper',
        suitColor: 0x1e3a2f,
        tieColor: 0x166534, // Forest Stealth
        hairColor: 0x27272a,
        themeHex: '#10b981',
        speed: 6.5,
        strafeSpeed: 3.6,
        reactionTime: 0.35,
        fireInterval: 0.48,
        retreatThreshold: 40,
        preferredRangeMin: 14,
        preferredRangeMax: 24,
        hopChanceEngage: 0.25,
        hopCooldownBase: 4.0,
        spreadBase: 0.035,
        targetMemory: 1.2
    },
    SURVIVOR: {
        archetype: 'SURVIVOR',
        roleTitle: 'Survivor',
        suitColor: 0x1e3a8a,
        tieColor: 0x0284c7, // Cobalt Tech Cyan
        hairColor: 0x172554,
        themeHex: '#06b6d4',
        speed: 7.8,
        strafeSpeed: 4.6,
        reactionTime: 0.30,
        fireInterval: 0.56,
        retreatThreshold: 50,
        preferredRangeMin: 15,
        preferredRangeMax: 26,
        hopChanceEngage: 0.80,
        hopCooldownBase: 2.0,
        spreadBase: 0.045,
        targetMemory: 1.2
    }
};

const ARCHETYPE_KEYS = ['HUNTER', 'FLANKER', 'PATROLLER', 'CAMPER', 'SURVIVOR'];

class CombatTokenDirector {
    constructor() {
        this.maxAttackTokens = 3;
        this.maxFlankTokens = 1;
        this.attackers = new Set();
        this.flankers = new Set();
        this.lastGlobalShotTime = 0;
        this.minShotSpacing = 0.15; // 150ms shot cadence desynchronization
        this.clutchTimer = 0;
    }

    update(dt, bots, player) {
        if (player && player.health <= 25) {
            this.clutchTimer = 2.0; // during clutch, allowed attackers drops to 2 for dramatic survivability
        } else if (this.clutchTimer > 0) {
            this.clutchTimer = Math.max(0, this.clutchTimer - dt);
        }

        const allowedAttackers = (this.clutchTimer > 0) ? 2 : this.maxAttackTokens;
        const allowedFlankers = this.maxFlankTokens;

        this.attackers.clear();
        this.flankers.clear();

        if (!bots || bots.length === 0) return;

        const playerPos = player ? (player.yawObject ? player.yawObject.position : player.position) : null;
        const candidates = [];

        for (let i = 0; i < bots.length; i++) {
            const b = bots[i];
            if (b.isDead) continue;
            // Gather candidate bots with LOS and target lock
            const isEngaged = b.state === 'ENGAGE' || b.state === 'TAKE_COVER' || b.state === 'FIGHTING_RETREAT';
            if (b.hasLockedTarget || (isEngaged && b.hasLos)) {
                const dist = playerPos ? b.position.distanceTo(playerPos) : 0;
                candidates.push({ bot: b, dist: dist });
            }
        }

        // Sort by distance to player (closest gets priority)
        candidates.sort((a, b) => a.dist - b.dist);

        // Fill up to allowedAttackers into attackers set, and up to 1 into flankers set
        for (let i = 0; i < candidates.length; i++) {
            const b = candidates[i].bot;
            if (this.attackers.size < allowedAttackers) {
                this.attackers.add(b);
            } else if (this.flankers.size < allowedFlankers) {
                this.flankers.add(b);
            }
        }
    }

    hasAttackToken(bot) {
        return this.attackers.has(bot);
    }

    hasFlankToken(bot) {
        return this.flankers.has(bot);
    }

    canBotShoot(bot, now) {
        return this.attackers.has(bot) && (now - this.lastGlobalShotTime >= this.minShotSpacing);
    }

    notifyShot(now) {
        this.lastGlobalShotTime = now;
    }
}

window.CombatTokenDirector = CombatTokenDirector;

class Bot {
    constructor(id, name, colorHex, scene, map, audio, particles, config = {}) {
        this.id = id;
        this.name = name;
        this.colorHex = colorHex;
        this.scene = scene;
        this.map = map;
        this.audio = audio;
        this.particles = particles;

        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        this.kills = 0;
        this.deaths = 0;
        this.score = 0;

        // Dimensions
        this.radius = 0.55;
        this.height = 1.75;

        // Archetype configuration & Personality Matrix
        const fallbackKey = ARCHETYPE_KEYS[id % ARCHETYPE_KEYS.length];
        const baseArchetype = (config.archetype && BOT_ARCHETYPES[config.archetype]) ? BOT_ARCHETYPES[config.archetype] : BOT_ARCHETYPES[fallbackKey];
        const cfg = Object.assign({}, baseArchetype, config);

        this.archetype = cfg.archetype;
        this.roleTitle = cfg.roleTitle;
        this.suitColor = cfg.suitColor;
        this.tieColor = cfg.tieColor;
        this.hairColor = cfg.hairColor;
        this.themeHex = cfg.themeHex;
        this.speed = cfg.speed;
        this.strafeSpeed = cfg.strafeSpeed;
        this.reactionTime = cfg.reactionTime;
        this.fireInterval = cfg.fireInterval;
        this.retreatThreshold = cfg.retreatThreshold;
        this.preferredRangeMin = cfg.preferredRangeMin;
        this.preferredRangeMax = cfg.preferredRangeMax;
        this.hopChanceEngage = cfg.hopChanceEngage;
        this.hopCooldownBase = cfg.hopCooldownBase;
        this.spreadBase = cfg.spreadBase;
        this.targetMemory = cfg.targetMemory;
        this.damageMultiplier = 0.70; // 30% damage reduction across all archetypes
        this.manager = config.manager || null;
        this.spawnGraceTimer = 0;
        this.hasCoverObjective = false;
        this.isCornerHolding = false;
        this.cornerHoldTimer = 0;
        this.hasLos = false;

        // Kinematics
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.rotationY = 0;
        this.targetRotationY = 0;
        this.pitch = 0;
        this.targetPitch = 0;

        // AI States: 'PATROL', 'ENGAGE', 'TAKE_COVER', 'AMBUSH'
        this.state = 'PATROL';
        this.waypointIndex = id % this.map.waypoints.length;
        this.targetWaypoint = this.map.waypoints[this.waypointIndex].clone();
        this.attackCooldown = 0.5;
        this.hasLockedTarget = false;
        this.targetLockTimer = 0;
        this.lostTargetTimer = 0;

        // Target memory tracking (Pre-allocated for Hunter & Flanker)
        this.lastKnownPlayerPos = new THREE.Vector3();
        this.hasLastKnownPos = false;

        // Ambush mechanics (Camper)
        this.ambushTimer = 0;

        // Backstab / Flank Alert with Delay
        this.isAlerted = false;
        this.alertReactionDelay = 0;
        this.alertAngle = 0;

        this.strafeTimer = 0;
        this.strafeDir = (id % 2 === 0) ? 1 : -1;

        // Combat maneuvers
        this.stutterTimer = 0;
        this.tacticalBurstTimer = 0;
        this.tacticalBurstSpeed = 0;

        // Slide-hop mechanics
        this.slideHopTimer = 0;
        this.slideHopCooldown = this.hopCooldownBase + Math.random() * 2.0;
        this.isSlideHopping = false;
        this.hopProgress = 0;
        this.strafeAmp = 2.2 + (id % 3) * 0.7; // Preserved for test compatibility

        this.respawnTimer = 0;
        this.walkCycle = 0;

        // Stuck watchdog & active auto-unstuck routine
        this.lastPos = new THREE.Vector3();
        this.stuckTimer = 0;
        this.unstuckDuration = 0;
        this.unstuckVelocity = new THREE.Vector3();

        // 3D Model
        this.meshRoot = new THREE.Group();
        this.headMesh = null;
        this.bodyMesh = null;
        this.leftLeg = null;
        this.rightLeg = null;
        this.leftArm = null;
        this.rightArm = null;
        this.overheadCanvas = null;
        this.overheadSprite = null;

        this.buildModel();
        this.spawn();
    }

    buildModel() {
        const tex = window.textureGen;
        const suitMat = new THREE.MeshLambertMaterial({ color: this.suitColor || 0x2e333a });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const tieMat = new THREE.MeshLambertMaterial({ color: this.tieColor || 0x991b1b });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xdfa07a });
        const hairMat = new THREE.MeshLambertMaterial({ color: this.hairColor || 0x3d2719 });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1c20 });
        const woodMat = new THREE.MeshLambertMaterial({ color: 0xb57038 });

        const setShadow = (m) => {
            m.castShadow = true;
            m.receiveShadow = true;
            return m;
        };

        // 1. Torso (Suit Jacket)
        this.bodyMesh = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.40), suitMat));
        this.bodyMesh.position.y = 1.05;
        this.meshRoot.add(this.bodyMesh);

        // White Shirt Collar & Red Tie (Tactical Mercenary Suit)
        const shirtCollar = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.04), shirtMat));
        shirtCollar.position.set(0, 0.28, -0.21);
        this.bodyMesh.add(shirtCollar);

        const tie = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.42, 0.05), tieMat));
        tie.position.set(0, 0.16, -0.22);
        this.bodyMesh.add(tie);

        // 2. Head (Cube Head with Hair and Face)
        this.headMesh = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.50, 0.50), skinMat));
        this.headMesh.position.y = 1.76;
        this.meshRoot.add(this.headMesh);

        // Hair / Cap
        const hair = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.52), hairMat));
        hair.position.set(0, 0.20, 0);
        this.headMesh.add(hair);

        // Face Eyes (aligned anatomically when rotated to face forward)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), eyeMat);
        leftEye.position.set(0.12, 0.04, -0.26);
        this.headMesh.add(leftEye);
        const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), eyeMat);
        rightEye.position.set(-0.12, 0.04, -0.26);
        this.headMesh.add(rightEye);

        // 3. Arms holding 3D Weapon
        this.leftArm = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.22), suitMat));
        this.leftArm.position.set(0.48, 1.02, -0.06);
        this.leftArm.rotation.set(0.35, 0.2, 0);
        this.meshRoot.add(this.leftArm);

        this.rightArm = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.22), suitMat));
        this.rightArm.position.set(-0.48, 1.02, -0.06);
        this.rightArm.rotation.set(0.35, -0.2, 0);
        this.meshRoot.add(this.rightArm);

        // 3rd Person Weapon (Stylized AK)
        const botGun = new THREE.Group();
        const gunBody = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.42), darkMat));
        botGun.add(gunBody);

        const gunWood = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.22), woodMat));
        gunWood.position.set(0, 0, -0.24);
        botGun.add(gunWood);

        const gunBarrel = setShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 8), darkMat));
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.set(0, 0.02, -0.42);
        botGun.add(gunBarrel);

        const gunMag = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.08), darkMat));
        gunMag.position.set(0, -0.10, -0.05);
        gunMag.rotation.x = -0.3;
        botGun.add(gunMag);

        botGun.position.set(0, -0.24, -0.32);
        botGun.rotation.set(-0.25, 0, 0);
        this.rightArm.add(botGun);

        // 4. Legs
        this.leftLeg = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), suitMat));
        this.leftLeg.position.set(0.22, 0.42, 0);
        this.meshRoot.add(this.leftLeg);

        this.rightLeg = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), suitMat));
        this.rightLeg.position.set(-0.22, 0.42, 0);
        this.meshRoot.add(this.rightLeg);

        this.createOverheadUI();
        this.scene.add(this.meshRoot);
    }

    triggerUnstuck() {
        const hasNormal = this.map.getClosestCollisionNormal(this.position, this.radius, this.height, _surfaceNormal);
        if (hasNormal) {
            _unstuckDir.copy(_surfaceNormal);
            // Blend with direction to map center to guarantee clearance towards open arena
            _centerDir.set(-this.position.x, 0, -this.position.z).normalize();
            _unstuckDir.addScaledVector(_centerDir, 0.6).normalize();
        } else {
            _unstuckDir.set(-this.position.x, 0, -this.position.z).normalize();
        }

        this.unstuckDuration = 0.65;
        this.unstuckVelocity.set(_unstuckDir.x * this.speed, 0, _unstuckDir.z * this.speed);

        if (this.state === 'ENGAGE') {
            this.strafeDir *= -1;
            this.strafeTimer = 0.6;
        } else {
            this.pickNextWaypoint();
        }
    }

    createOverheadUI() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        this.overheadCanvas = canvas;
        this.renderOverheadCanvas();

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        this.overheadSprite = new THREE.Sprite(spriteMat);
        this.overheadSprite.position.set(0, 2.35, 0);
        this.overheadSprite.scale.set(2.4, 0.6, 1);
        this.meshRoot.add(this.overheadSprite);
    }

    renderOverheadCanvas() {
        if (!this.overheadCanvas) return;
        const ctx = this.overheadCanvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 64);

        // Overhead style: Clean text with black outline + role title + lime-green HP bar
        const baseName = this.name.startsWith('Bot') ? `Guest_${this.id + 1}` : this.name;
        const displayName = this.roleTitle ? `${baseName} • ${this.roleTitle}` : baseName;

        ctx.font = 'bold 20px Rajdhani, sans-serif';
        ctx.textAlign = 'center';

        // Dark text outline for high contrast
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(displayName, 128, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(displayName, 128, 24);

        // HP Bar Container (Black Border)
        const barW = 140;
        const barH = 8;
        const barX = (256 - barW) / 2;
        const barY = 34;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        // Dark bar track
        ctx.fillStyle = '#22262a';
        ctx.fillRect(barX, barY, barW, barH);

        // Bright lime-green HP fill (Matches media_1791207600381.png)
        const hpPercent = Math.max(0, this.health / this.maxHealth);
        const hpColor = hpPercent > 0.45 ? '#33ff33' : (hpPercent > 0.2 ? '#ffbb00' : '#ff2255');
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpPercent, barH);

        if (this.overheadSprite && this.overheadSprite.material.map) {
            this.overheadSprite.material.map.needsUpdate = true;
        }
    }

    spawn(isRespawn = false) {
        const player = window.playerController || (window.game ? window.game.player : null);
        if (isRespawn && this.map && typeof this.map.getSmartRespawnPoint === 'function' && player && player.yawObject) {
            const playerPos = player.yawObject.position;
            const pyaw = player.yawObject.rotation.y;
            const playerFacingDir = _botCandDir.set(-Math.sin(pyaw), 0, -Math.cos(pyaw)).normalize();
            if (player.camera) {
                player.camera.getWorldDirection(playerFacingDir);
                playerFacingDir.y = 0;
                playerFacingDir.normalize();
            }
            const activeBots = (this.manager && typeof this.manager.getActiveBotPositions === 'function')
                ? this.manager.getActiveBotPositions()
                : (window.botManager && typeof window.botManager.getActiveBotPositions === 'function' ? window.botManager.getActiveBotPositions() : []);

            const sp = this.map.getSmartRespawnPoint(playerPos, playerFacingDir, activeBots);
            if (sp) {
                this.position.set(sp.x, sp.y, sp.z);
            } else {
                const spawns = this.map.spawnPoints;
                const fallbackSp = spawns[this.id % spawns.length];
                this.position.set(fallbackSp.x, fallbackSp.y, fallbackSp.z);
            }
            this.spawnGraceTimer = 1.0; // 1s orientation grace period
        } else {
            const spawns = this.map.spawnPoints;
            // Distribute bots evenly across all map quadrants at spawn to avoid clustering
            const sp = spawns[this.id % spawns.length];
            this.position.set(sp.x, sp.y, sp.z);
            this.spawnGraceTimer = 0;
        }

        this.hasCoverObjective = false;
        this.isCornerHolding = false;
        this.cornerHoldTimer = 0;

        this.map.resolvePenetration(this.position, this.radius, this.height);

        this.meshRoot.position.copy(this.position);
        if (this.bodyMesh) this.bodyMesh.position.y = 1.05;
        this.health = this.maxHealth;
        this.isDead = false;
        this.hasLockedTarget = false;
        this.targetLockTimer = 0;
        this.lostTargetTimer = 0;
        this.hasLastKnownPos = false;
        this.ambushTimer = 0;
        this.isAlerted = false;
        this.alertReactionDelay = 0;
        this.state = 'PATROL';
        this.pitch = 0;
        this.targetPitch = 0;
        this.meshRoot.visible = true;
        this.lastPos.copy(this.position);
        this.stuckTimer = 0;
        this.unstuckDuration = 0;
        this.pickNextWaypoint();
        this.renderOverheadCanvas();
    }

    /**
     * Requirement: Smart tactical retreat that breaks line-of-sight and maximizes player distance.
     * Evaluates waypoints with zero GC allocations using pre-allocated scratch objects.
     */
    pickRetreatWaypoint(playerPos) {
        const wp = this.map.waypoints;
        if (!wp || wp.length === 0) return;
        if (!playerPos) {
            this.pickNextWaypoint();
            return;
        }

        let bestWp = null;
        let bestScore = -99999;

        _v1.set(this.position.x, this.position.y + 1.2, this.position.z);

        for (let i = 0; i < wp.length; i++) {
            const candidate = wp[i];
            const distFromBot = this.position.distanceTo(candidate);
            if (distFromBot < 3.0) continue; // Skip immediate waypoint

            _v2.set(candidate.x, candidate.y + 1.2, candidate.z);
            const distFromPlayer = candidate.distanceTo(playerPos);
            const breaksLos = !this.map.hasLineOfSight(_v2, playerPos);

            // Scoring: prioritize high player distance + massive bonus if occluded by cover
            let score = distFromPlayer + (breaksLos ? 30 : 0);

            // Vector check: penalize waypoints requiring bot to run straight into player
            _probeCenter.subVectors(candidate, this.position);
            _toPlayer.subVectors(playerPos, this.position);
            if (_probeCenter.dot(_toPlayer) > 0) {
                score -= 12;
            }

            if (score > bestScore) {
                bestScore = score;
                bestWp = candidate;
                this.waypointIndex = i;
            }
        }

        if (bestWp) {
            this.targetWaypoint.copy(bestWp);
        } else {
            this.pickNextWaypoint();
        }
    }

    pickNextWaypoint() {
        const wp = this.map.waypoints;
        _v1.set(this.position.x, this.position.y + 1.2, this.position.z);

        // Find open waypoints that have direct line of sight from bot position
        const visibleWps = [];
        for (let i = 0; i < wp.length; i++) {
            _v2.set(wp[i].x, wp[i].y + 1.2, wp[i].z);
            if (this.map.hasLineOfSight(_v1, _v2) && this.position.distanceTo(wp[i]) > 4.0) {
                visibleWps.push({ idx: i, pt: wp[i] });
            }
        }

        if (visibleWps.length > 0) {
            const choice = visibleWps[Math.floor(Math.random() * visibleWps.length)];
            this.waypointIndex = choice.idx;
            this.targetWaypoint.copy(choice.pt);
        } else {
            this.waypointIndex = (this.waypointIndex + 1) % wp.length;
            this.targetWaypoint.copy(wp[this.waypointIndex]);
        }
    }

    /**
     * Requirement 2: Vision Detection Cone (110° field of view)
     * Bots only spot/aggro player if within forward vision cone (diffAngle <= 55° / ~0.96 rad, dot >= 0.57)
     */
    isPlayerInVisionCone(targetPos) {
        if (!targetPos) return false;
        const dx = targetPos.x - this.position.x;
        const dz = targetPos.z - this.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.001) return true;

        const fwdX = Math.sin(this.rotationY);
        const fwdZ = Math.cos(this.rotationY);

        const dirX = dx / dist;
        const dirZ = dz / dist;

        const dot = fwdX * dirX + fwdZ * dirZ;
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const diffAngle = Math.acos(clampedDot);

        return diffAngle <= 0.96 && dot >= 0.57;
    }

    /**
     * Requirement 3: Field of View (FOV) Frustum Cone Check for Firing
     * Bot can ONLY shoot if the player is within its forward FOV frustum cone (diffAngle <= 0.6 rad, dot >= 0.82)
     */
    isPlayerInFrustumCone(playerPos) {
        if (!playerPos) return false;
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.001) return true;

        // Bot forward facing vector based on current rotationY: (sin(rotationY), cos(rotationY))
        const fwdX = Math.sin(this.rotationY);
        const fwdZ = Math.cos(this.rotationY);

        // Normalized vector towards player
        const dirX = dx / dist;
        const dirZ = dz / dist;

        // Dot product between facing vector and vector to player
        const dot = fwdX * dirX + fwdZ * dirZ;
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const diffAngle = Math.acos(clampedDot);

        // Require diffAngle <= 0.6 rad (~35 deg) and dot >= 0.82
        return diffAngle <= 0.6 && dot >= 0.82;
    }

    /**
     * Requirement 5: Quick evasive reaction when taking damage
     */
    triggerEvasiveDodge() {
        this.strafeDir *= -1;
        this.strafeTimer = 0.35 + Math.random() * 0.4;
        this.tacticalBurstTimer = 0.45;
        this.tacticalBurstSpeed = 3.3; // Tuned down from 4.2 (~20% reduction per Requirement 4)
        const hopChance = (this.archetype === 'SURVIVOR' || this.archetype === 'HUNTER') ? 0.75 : 0.55;
        if (Math.random() < hopChance) {
            this.isSlideHopping = true;
            this.slideHopTimer = 0.55;
            this.hopProgress = 0;
        }
    }

    takeDamage(damage, attacker, isHeadshot, weaponName) {
        if (this.isDead) return;
        this.spawnGraceTimer = 0; // Clear orientation grace on damage
        this.health -= damage;
        this.renderOverheadCanvas();

        // Spatialized bot impact reaction audio
        if (this.audio && typeof this.audio.playBotHit === 'function') {
            const player = window.playerController;
            if (player && player.yawObject) {
                const distToPlayer = this.position.distanceTo(player.yawObject.position);
                _camRight.set(1, 0, 0).applyQuaternion(player.yawObject.quaternion);
                _toBot.subVectors(this.position, player.yawObject.position).normalize();
                const pan = Math.max(-0.95, Math.min(0.95, _camRight.dot(_toBot)));
                this.audio.playBotHit(distToPlayer, pan, !!isHeadshot);
            }
        }

        this.headMesh.material.color.setHex(0xff0044);
        setTimeout(() => {
            if (this.headMesh) this.headMesh.material.color.setHex(0xdfa07a);
        }, 120);

        if (this.health <= 0) {
            this.die(attacker, isHeadshot, weaponName);
        } else {
            const isGameStarted = !!(window.game && window.game.isGameStarted);
            if (isGameStarted) {
                const attackerPos = attacker ? (attacker.yawObject ? attacker.yawObject.position : (attacker.position || null)) : null;
                const wasInVision = attackerPos ? this.isPlayerInVisionCone(attackerPos) : true;
                const shouldRetreat = (this.archetype !== 'HUNTER') && (this.health < this.retreatThreshold);

                if (this.state === 'AMBUSH') {
                    // Camper flushed out of ambush: reset crouch and react
                    if (this.bodyMesh) this.bodyMesh.position.y = 1.05;
                    this.ambushTimer = 0;
                }

                if (wasInVision) {
                    // Attacker is in front / within vision cone (110°): instant combat engagement or cover retreat
                    if (shouldRetreat) {
                        const coverPoint = (this.map && attackerPos && typeof this.map.findNearestCoverPoint === 'function')
                            ? this.map.findNearestCoverPoint(this.position, attackerPos, 16)
                            : null;
                        if (coverPoint) {
                            this.state = 'TAKE_COVER';
                            this.targetWaypoint.copy(coverPoint);
                            this.hasCoverObjective = true;
                        } else {
                            this.state = 'FIGHTING_RETREAT';
                            this.hasCoverObjective = false;
                        }
                    } else {
                        this.state = 'ENGAGE';
                        this.hasCoverObjective = false;
                    }
                    this.hasLockedTarget = true;
                    this.targetLockTimer = 0.2;
                    this.lostTargetTimer = 0;
                    if (attackerPos) {
                        const dx = attackerPos.x - this.position.x;
                        const dz = attackerPos.z - this.position.z;
                        this.targetRotationY = Math.atan2(dx, dz);
                    }
                } else {
                    // Backstab / Flank Alert (Requirement 2): Attacked from behind or out of FOV!
                    // Do NOT snap 360° instantly. Enter alerted response with reaction delay (0.45s - 0.60s).
                    this.isAlerted = true;
                    const baseDelay = (this.archetype === 'SURVIVOR') ? 0.35 : 0.45;
                    this.alertReactionDelay = baseDelay + Math.random() * 0.15;
                    this.hasLockedTarget = false;
                    this.targetLockTimer = 0;
                    this.lostTargetTimer = 0;
                    if (attackerPos) {
                        const dx = attackerPos.x - this.position.x;
                        const dz = attackerPos.z - this.position.z;
                        this.alertAngle = Math.atan2(dx, dz);
                    }
                }
            }
            this.triggerEvasiveDodge();
        }
    }

    die(killer, isHeadshot, weaponName) {
        this.isDead = true;
        this.deaths++;
        this.meshRoot.visible = false;
        this.respawnTimer = 3.5;

        this.particles.createDeathShatter(this.position, this.colorHex);

        // Requirement 2: Dynamic loot drop system on dead bots & multi-kill combo tracking
        let comboCount = 1;
        if (window.lootSystem) {
            const comboInfo = window.lootSystem.onBotDeath(this, killer, isHeadshot, weaponName);
            if (comboInfo && comboInfo.comboCount) {
                comboCount = comboInfo.comboCount;
            }
        }

        if (window.uiManager) {
            const killerName = killer ? 'YOU' : 'ARENA';
            const isPlayerKiller = !!killer;

            if (isPlayerKiller) {
                killer.kills++;
                killer.streak++;
                const isHead = !!isHeadshot;
                const points = isHead ? 150 : 100;
                killer.score += points;

                // Trigger Dopamine Audio & Medal Popups!
                this.audio.playKill(killer.streak);
                window.uiManager.triggerKillMedal(killer.streak, isHead, points, comboCount);
                window.uiManager.updateScore(killer.score, killer.streak);

                // Multi-kill Rare Booster Drop (35% chance on triple+ kill)
                if (killer.streak >= 3 && window.boosterManager && Math.random() < 0.35) {
                    window.boosterManager.spawnMultiKillDrop(this.position);
                }

                if (killer.streak >= 3 && (killer.streak === 3 || killer.streak === 5 || killer.streak === 10 || killer.streak % 5 === 0)) {
                    window.uiManager.addChatStreakMessage(killerName, killer.streak);
                }
            }

            window.uiManager.addKillfeedItem(killerName, this.name, weaponName || 'RIFLE', isHeadshot);
            window.uiManager.updateLiveLeaderboard(killer || window.playerController, window.botManager);
        }
    }

    update(dt, player, inFrustum = true, distToPlayer = 0) {
        if (this.isDead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.spawn(true);
            }
            return;
        }

        if (this.spawnGraceTimer > 0) {
            this.spawnGraceTimer -= dt;
        }

        const playerPos = player ? player.yawObject.position : null;
        _botEyePos.set(this.position.x, this.position.y + 1.76, this.position.z);
        if (playerPos) {
            _playerEyePos.copy(playerPos);
        }
        if (!distToPlayer && playerPos) distToPlayer = this.position.distanceTo(playerPos);

        // LOD 1: Distance & Frustum culling for overhead sprite nameplate
        if (this.overheadSprite) {
            this.overheadSprite.visible = inFrustum && (distToPlayer <= 48);
        }

        const isGameStarted = !!(window.game && window.game.isGameStarted);
        const inVisionCone = playerPos ? this.isPlayerInVisionCone(playerPos) : false;
        const hasLos = isGameStarted && player && !player.isDead && (distToPlayer < 42) && playerPos && this.map.hasLineOfSight(_botEyePos, _playerEyePos);
        this.hasLos = hasLos;

        // Update target memory for Hunter & Flanker tracking
        if (hasLos && playerPos) {
            this.lastKnownPlayerPos.copy(playerPos);
            this.hasLastKnownPos = true;
        }

        // Backstab / Flank Alert with Delay handling (Requirement 2)
        if (this.isAlerted && isGameStarted) {
            this.alertReactionDelay -= dt;
            if (this.alertReactionDelay <= 0) {
                // Reaction delay elapsed! Bot now turns towards the incoming damage angle
                this.isAlerted = false;
                this.targetRotationY = this.alertAngle;
                const shouldRetreat = (this.archetype !== 'HUNTER') && (this.health < this.retreatThreshold);
                if (shouldRetreat) {
                    const coverPoint = (this.map && playerPos && typeof this.map.findNearestCoverPoint === 'function')
                        ? this.map.findNearestCoverPoint(this.position, playerPos, 16)
                        : null;
                    if (coverPoint) {
                        this.state = 'TAKE_COVER';
                        this.targetWaypoint.copy(coverPoint);
                        this.hasCoverObjective = true;
                    } else {
                        this.state = 'FIGHTING_RETREAT';
                        this.hasCoverObjective = false;
                    }
                } else {
                    this.state = 'ENGAGE';
                    this.hasCoverObjective = false;
                }
                this.targetLockTimer = 0.15;
            }
        }

        // Requirement 1 & 2: Sighting & Aggro Gate
        // When game is not started, bots NEVER target, lock onto, or shoot player. They strictly patrol.
        if (!isGameStarted) {
            this.hasLockedTarget = false;
            this.targetLockTimer = 0;
            this.state = 'PATROL';
            this.isAlerted = false;
            this.ambushTimer = 0;
            if (this.bodyMesh) this.bodyMesh.position.y = 1.05;
        } else if (this.spawnGraceTimer > 0) {
            // Orientation Grace period: bot patrols and does NOT lock on or aggro player until grace ends (unless attacked)
            this.hasLockedTarget = false;
            this.targetLockTimer = 0;
            this.state = 'PATROL';
            this.isAlerted = false;
        } else if (this.isAlerted) {
            // Under delayed alert; maintaining evasive maneuvers until reaction timer fires
        } else if (this.state === 'PATROL' || this.state === 'AMBUSH') {
            if (this.state === 'AMBUSH') {
                this.ambushTimer -= dt;
                if (this.ambushTimer <= 0) {
                    this.state = 'PATROL';
                    if (this.bodyMesh) this.bodyMesh.position.y = 1.05;
                    this.pickNextWaypoint();
                }
            }

            // In PATROL or AMBUSH, bot ONLY spots/aggros player if player is within 110° vision cone AND has LOS!
            if (inVisionCone && hasLos) {
                const shouldRetreat = (this.archetype !== 'HUNTER') && (this.health < this.retreatThreshold);
                if (shouldRetreat) {
                    const coverPoint = (this.map && playerPos && typeof this.map.findNearestCoverPoint === 'function')
                        ? this.map.findNearestCoverPoint(this.position, playerPos, 16)
                        : null;
                    if (coverPoint) {
                        this.state = 'TAKE_COVER';
                        this.targetWaypoint.copy(coverPoint);
                        this.hasCoverObjective = true;
                    } else {
                        this.state = 'FIGHTING_RETREAT';
                        this.hasCoverObjective = false;
                    }
                } else {
                    this.state = 'ENGAGE';
                    this.hasCoverObjective = false;
                }
                if (this.bodyMesh && !this.isCornerHolding) this.bodyMesh.position.y = 1.05;
                this.targetLockTimer += dt;
                if (this.targetLockTimer >= this.reactionTime) {
                    this.hasLockedTarget = true;
                }
                this.lostTargetTimer = 0;
            } else {
                this.hasLockedTarget = false;
                this.targetLockTimer = 0;
            }
        } else {
            // In ENGAGE, TAKE_COVER, or FIGHTING_RETREAT: maintain active combat target while LOS exists
            if (hasLos) {
                const shouldRetreat = (this.archetype !== 'HUNTER') && (this.health < this.retreatThreshold);
                if (shouldRetreat) {
                    if (this.state !== 'TAKE_COVER' && this.state !== 'FIGHTING_RETREAT') {
                        const coverPoint = (this.map && playerPos && typeof this.map.findNearestCoverPoint === 'function')
                            ? this.map.findNearestCoverPoint(this.position, playerPos, 16)
                            : null;
                        if (coverPoint) {
                            this.state = 'TAKE_COVER';
                            this.targetWaypoint.copy(coverPoint);
                            this.hasCoverObjective = true;
                        } else {
                            this.state = 'FIGHTING_RETREAT';
                            this.hasCoverObjective = false;
                        }
                    }
                } else if (!shouldRetreat && this.state !== 'ENGAGE') {
                    this.state = 'ENGAGE';
                    this.hasCoverObjective = false;
                    this.isCornerHolding = false;
                    if (this.bodyMesh) this.bodyMesh.position.y = 1.05;
                }

                if (!this.hasLockedTarget) {
                    this.targetLockTimer += dt;
                    if (this.targetLockTimer >= this.reactionTime) {
                        this.hasLockedTarget = true;
                    }
                }
                this.lostTargetTimer = 0;
            } else {
                // Lost LOS (player broke behind cover)
                this.lostTargetTimer = (this.lostTargetTimer || 0) + dt;
                // Target lock breaks immediately when visual contact is broken into cover
                this.hasLockedTarget = false;
                this.targetLockTimer = 0;

                // Hunter pursuit behavior: tracks last known position before resetting to patrol
                if (this.archetype === 'HUNTER' && this.hasLastKnownPos && this.lostTargetTimer < this.targetMemory && isGameStarted && player && !player.isDead) {
                    const distToLast = this.position.distanceTo(this.lastKnownPlayerPos);
                    if (distToLast > 2.5) {
                        this.targetWaypoint.copy(this.lastKnownPlayerPos);
                    } else {
                        this.hasLockedTarget = false;
                        this.targetLockTimer = 0;
                        this.hasLastKnownPos = false;
                        this.state = 'PATROL';
                        this.pickNextWaypoint();
                    }
                } else if (this.lostTargetTimer > this.targetMemory || !player || player.isDead) {
                    // Memory expired: Bot has completely forgotten the player! Return to patrol
                    this.hasLockedTarget = false;
                    this.targetLockTimer = 0;
                    this.hasLastKnownPos = false;
                    this.state = 'PATROL';
                    this.isCornerHolding = false;
                    this.hasCoverObjective = false;
                    if (this.bodyMesh) this.bodyMesh.position.y = 1.05;
                    this.pickNextWaypoint();
                }
            }
        }

        // Requirement 5: Slide-Hop Momentum Burst System
        this.slideHopCooldown -= dt;
        if (this.slideHopCooldown <= 0 && !this.isDead) {
            const hopChance = (this.state === 'ENGAGE' || this.state === 'TAKE_COVER' || this.state === 'FIGHTING_RETREAT') ? this.hopChanceEngage : 0.30;
            if (Math.random() < hopChance) {
                this.isSlideHopping = true;
                this.slideHopTimer = 0.55;
                this.hopProgress = 0;
            }
            let nextHopCooldown = ((this.state === 'ENGAGE' || this.state === 'FIGHTING_RETREAT') ? this.hopCooldownBase : this.hopCooldownBase * 1.5) + Math.random() * 2.0;
            if (this.health < 50) {
                nextHopCooldown *= 1.4; // Slide-hop cooldown increased by 40% (fewer hops)
            }
            this.slideHopCooldown = nextHopCooldown;
        }

        let speedMultiplier = 1.0;
        let hopYOffset = 0;
        if (this.isSlideHopping) {
            this.slideHopTimer -= dt;
            this.hopProgress = Math.max(0, 1.0 - (this.slideHopTimer / 0.55));
            speedMultiplier = (this.archetype === 'SURVIVOR' && (this.state === 'TAKE_COVER' || this.state === 'FIGHTING_RETREAT')) ? 1.30 : 1.25;
            hopYOffset = Math.sin(this.hopProgress * Math.PI) * 0.35;
            if (this.slideHopTimer <= 0) {
                this.isSlideHopping = false;
                hopYOffset = 0;
            }
        }

        // State Behaviors
        if (this.state === 'ENGAGE' && player && !player.isDead && isGameStarted) {
            const targetP = (hasLos || !this.hasLastKnownPos) ? playerPos : this.lastKnownPlayerPos;
            const dx = targetP.x - this.position.x;
            const dz = targetP.z - this.position.z;
            this.targetRotationY = Math.atan2(dx, dz);

            // Strafe rhythms tailored per archetype
            this.strafeTimer -= dt;
            if (this.strafeTimer <= 0) {
                const roll = Math.random();
                if (this.archetype === 'FLANKER') {
                    // Flanker has frequent rapid jiggle reversals (0.2s - 0.45s)
                    this.strafeTimer = 0.20 + Math.random() * 0.35;
                    this.strafeDir = (Math.random() > 0.40) ? -this.strafeDir : (Math.random() > 0.5 ? 1 : -1);
                    this.strafeSpeed = 5.6 + Math.random() * 1.6;
                } else if (this.archetype === 'HUNTER') {
                    // Hunter uses aggressive, direct forward bursts
                    this.strafeTimer = 0.40 + Math.random() * 0.40;
                    this.strafeDir = (Math.random() > 0.50) ? -this.strafeDir : 1;
                    this.strafeSpeed = 4.6 + Math.random() * 1.4;
                } else {
                    // Standard tactical strafe
                    if (roll < 0.30) {
                        this.strafeTimer = 0.25 + Math.random() * 0.25;
                    } else if (roll < 0.70) {
                        this.strafeTimer = 0.60 + Math.random() * 0.50;
                    } else {
                        this.strafeTimer = 1.20 + Math.random() * 0.60;
                    }
                    this.strafeDir = Math.random() > 0.45 ? -this.strafeDir : (Math.random() > 0.5 ? 1 : -1);
                    this.strafeSpeed = 4.0 + Math.random() * 1.8;
                }

                // Sudden stutter-step to throw off player tracking
                if (this.health >= 50 && Math.random() < 0.28) {
                    this.stutterTimer = 0.15 + Math.random() * 0.15;
                }

                // Movement easing (< 50% HP for all bots)
                if (this.health < 50) {
                    this.strafeSpeed = 3.8 + Math.random() * 0.8; // ~22% reduction
                    if (this.strafeTimer < 0.85) {
                        this.strafeTimer = 0.85 + Math.random() * 0.35; // longer readable strafe arcs
                    }
                    this.stutterTimer = 0; // Stutter-step disabled when injured
                }
            }

            if (this.health < 50) {
                this.stutterTimer = 0;
            }

            let moveMultiplier = 1.0;
            if (this.stutterTimer > 0) {
                this.stutterTimer -= dt;
                moveMultiplier = 0.20; // Sudden momentary brake
            }

            if (this.tacticalBurstTimer > 0) {
                this.tacticalBurstTimer -= dt;
            } else {
                this.tacticalBurstSpeed = 0;
            }

            // Spacing management tailored per archetype
            const engageDist = (hasLos || !this.hasLastKnownPos) ? distToPlayer : this.position.distanceTo(this.lastKnownPlayerPos);
            let forwardPush = 0;
            if (this.archetype === 'HUNTER') {
                if (engageDist > 12) {
                    forwardPush = 4.2;
                } else if (engageDist > 6) {
                    forwardPush = 2.4;
                } else if (engageDist < 4) {
                    forwardPush = -2.0;
                } else {
                    forwardPush = 0.8;
                }
            } else if (this.archetype === 'FLANKER') {
                if (engageDist > 18) {
                    forwardPush = 3.2;
                } else if (engageDist < 9) {
                    forwardPush = -4.2;
                } else {
                    forwardPush = Math.sin(this.walkCycle * 0.9) * 1.2;
                }
            } else if (this.archetype === 'SURVIVOR') {
                if (engageDist > 24) {
                    forwardPush = 2.6;
                } else if (engageDist < 14) {
                    forwardPush = -4.5;
                } else {
                    forwardPush = -1.2;
                }
            } else {
                if (engageDist > 18) {
                    forwardPush = 3.35;
                } else if (engageDist < 7.5) {
                    forwardPush = -4.0;
                } else {
                    forwardPush = Math.sin(this.walkCycle * 0.8) * 1.45;
                }
            }
            if (!hasLos && this.archetype !== 'HUNTER') {
                forwardPush *= 0.25; // Don't bulldoze blindly into cover when player broke LOS
            }

            const director = this.manager ? this.manager.combatDirector : (window.botManager ? window.botManager.combatDirector : null);
            const hasAttackToken = director ? director.hasAttackToken(this) : true;
            let strafeBias = 1.0;
            if (!hasAttackToken) {
                // If bot does not hold attack token, prioritize lateral positioning
                forwardPush *= 0.4;
                strafeBias = 1.2;
            }

            forwardPush *= speedMultiplier * moveMultiplier;

            // Tactical circle-strafing with lateral bursts
            const totalStrafeSpeed = (this.strafeSpeed + this.tacticalBurstSpeed) * speedMultiplier * moveMultiplier * strafeBias;
            const sideX = Math.cos(this.targetRotationY) * this.strafeDir * totalStrafeSpeed;
            const sideZ = -Math.sin(this.targetRotationY) * this.strafeDir * totalStrafeSpeed;

            if (this.unstuckDuration > 0) {
                this.unstuckDuration -= dt;
                this.velocity.copy(this.unstuckVelocity);
            } else {
                this.velocity.x = sideX + Math.sin(this.targetRotationY) * forwardPush;
                this.velocity.z = sideZ + Math.cos(this.targetRotationY) * forwardPush;
            }

            // Requirement 3 & 9: Enforce CombatTokenDirector, forward FOV Frustum cone AND LOS before firing!
            if (this.hasLockedTarget && hasLos) {
                this.attackCooldown -= dt;
                if (this.attackCooldown <= 0) {
                    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() * 0.001 : Date.now() * 0.001;
                    const canShoot = director ? director.canBotShoot(this, now) : true;
                    if (canShoot && this.isPlayerInFrustumCone(playerPos) && this.map.hasLineOfSight(_botEyePos, _playerEyePos)) {
                        if (director) director.notifyShot(now);
                        this.attackCooldown = this.fireInterval + (Math.random() - 0.5) * 0.12;
                        this.fireAtPlayer(player, _botEyePos, _playerEyePos, distToPlayer);
                    } else {
                        // Hold fire until token available, rotated into forward frustum cone, and LOS verified
                        this.attackCooldown = 0.08;
                    }
                }
            } else if (!hasLos) {
                // When line of sight is broken, maintain reaction cooldown so bot doesn't insta-fire upon re-peek
                this.attackCooldown = Math.max(this.attackCooldown, this.reactionTime);
            }

        } else if (this.state === 'TAKE_COVER') {
            if (this.isCornerHolding) {
                this.cornerHoldTimer -= dt;
                this.velocity.set(0, 0, 0);
                if (this.bodyMesh) this.bodyMesh.position.y = 0.90; // crouch

                // Pre-aim corner where player was last seen
                if (this.hasLastKnownPos) {
                    const dx = this.lastKnownPlayerPos.x - this.position.x;
                    const dz = this.lastKnownPlayerPos.z - this.position.z;
                    this.targetRotationY = Math.atan2(dx, dz);
                }

                // If player peeks into LOS: trigger ambush return fire!
                if (hasLos && isGameStarted && playerPos) {
                    this.attackCooldown -= dt;
                    if (this.attackCooldown <= 0) {
                        const director = this.manager ? this.manager.combatDirector : (window.botManager ? window.botManager.combatDirector : null);
                        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() * 0.001 : Date.now() * 0.001;
                        const canShoot = director ? director.canBotShoot(this, now) : true;
                        if (canShoot && this.isPlayerInFrustumCone(playerPos) && this.map.hasLineOfSight(_botEyePos, _playerEyePos)) {
                            if (director) director.notifyShot(now);
                            this.attackCooldown = this.fireInterval + (Math.random() - 0.5) * 0.10;
                            this.fireAtPlayer(player, _botEyePos, _playerEyePos, distToPlayer);
                        } else {
                            this.attackCooldown = 0.08;
                        }
                    }
                }

                if (this.cornerHoldTimer <= 0) {
                    this.isCornerHolding = false;
                    this.hasCoverObjective = false;
                    this.state = 'PATROL';
                    if (this.bodyMesh) this.bodyMesh.position.y = 1.05;
                    this.pickNextWaypoint();
                }
            } else {
                const distToCover = this.targetWaypoint ? this.position.distanceTo(this.targetWaypoint) : 999;
                if (distToCover < 2.0 && !hasLos) {
                    this.isCornerHolding = true;
                    this.cornerHoldTimer = 3.0;
                    this.velocity.set(0, 0, 0);
                    if (this.bodyMesh) this.bodyMesh.position.y = 0.90;
                } else {
                    if (!this.targetWaypoint || (distToCover < 2.0 && hasLos)) {
                        const coverPoint = (this.map && playerPos && typeof this.map.findNearestCoverPoint === 'function')
                            ? this.map.findNearestCoverPoint(this.position, playerPos, 16)
                            : null;
                        if (coverPoint) {
                            this.targetWaypoint.copy(coverPoint);
                            this.hasCoverObjective = true;
                        } else {
                            this.state = 'FIGHTING_RETREAT';
                            this.hasCoverObjective = false;
                        }
                    }

                    if (this.state === 'TAKE_COVER') {
                        const dx = this.targetWaypoint.x - this.position.x;
                        const dz = this.targetWaypoint.z - this.position.z;
                        this.targetRotationY = Math.atan2(dx, dz);

                        const forwardX = Math.sin(this.targetRotationY);
                        const forwardZ = Math.cos(this.targetRotationY);
                        const perpX = Math.cos(this.targetRotationY);
                        const perpZ = -Math.sin(this.targetRotationY);

                        // Evasive sprint zig-zag
                        const evadeMultiplier = (this.archetype === 'SURVIVOR') ? 3.4 : 2.8;
                        const evadeWeave = Math.sin(this.walkCycle * 1.4) * evadeMultiplier;
                        const retreatSpeed = this.speed * 1.15 * speedMultiplier;

                        if (this.unstuckDuration > 0) {
                            this.unstuckDuration -= dt;
                            this.velocity.copy(this.unstuckVelocity);
                        } else {
                            this.velocity.x = forwardX * retreatSpeed + perpX * evadeWeave;
                            this.velocity.z = forwardZ * retreatSpeed + perpZ * evadeWeave;
                        }

                        // Occasional defensive return fire (strictly within FOV frustum and with LOS)
                        if (this.hasLockedTarget && isGameStarted && playerPos && hasLos && Math.random() < 0.25) {
                            this.attackCooldown -= dt;
                            if (this.attackCooldown <= 0) {
                                const director = this.manager ? this.manager.combatDirector : (window.botManager ? window.botManager.combatDirector : null);
                                const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() * 0.001 : Date.now() * 0.001;
                                const canShoot = director ? director.canBotShoot(this, now) : true;
                                if (canShoot && this.isPlayerInFrustumCone(playerPos) && this.map.hasLineOfSight(_botEyePos, _playerEyePos)) {
                                    if (director) director.notifyShot(now);
                                    this.attackCooldown = 0.8;
                                    this.fireAtPlayer(player, _botEyePos, _playerEyePos, distToPlayer);
                                } else {
                                    this.attackCooldown = 0.08;
                                }
                            }
                        }
                    }
                }
            }

        } else if (this.state === 'FIGHTING_RETREAT' && player && !player.isDead && isGameStarted) {
            if (this.bodyMesh && this.bodyMesh.position.y !== 1.05) this.bodyMesh.position.y = 1.05;
            const targetP = (hasLos || !this.hasLastKnownPos) ? playerPos : this.lastKnownPlayerPos;
            const dx = targetP.x - this.position.x;
            const dz = targetP.z - this.position.z;
            // Bot faces player
            this.targetRotationY = Math.atan2(dx, dz);

            // Backpedals away from player with lateral weave
            const backpedalSpeed = this.speed * 0.85 * speedMultiplier;
            const sideSpeed = Math.sin(this.walkCycle * 1.2) * (this.strafeSpeed * 0.85);

            const backX = -Math.sin(this.targetRotationY) * backpedalSpeed;
            const backZ = -Math.cos(this.targetRotationY) * backpedalSpeed;
            const sideX = Math.cos(this.targetRotationY) * this.strafeDir * sideSpeed;
            const sideZ = -Math.sin(this.targetRotationY) * this.strafeDir * sideSpeed;

            if (this.unstuckDuration > 0) {
                this.unstuckDuration -= dt;
                this.velocity.copy(this.unstuckVelocity);
            } else {
                this.velocity.x = backX + sideX;
                this.velocity.z = backZ + sideZ;
            }

            // Actively shoots back subject to CombatTokenDirector! Never turns back in the open.
            if (this.hasLockedTarget && hasLos) {
                this.attackCooldown -= dt;
                if (this.attackCooldown <= 0) {
                    const director = this.manager ? this.manager.combatDirector : (window.botManager ? window.botManager.combatDirector : null);
                    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() * 0.001 : Date.now() * 0.001;
                    const canShoot = director ? director.canBotShoot(this, now) : true;
                    if (canShoot && this.isPlayerInFrustumCone(playerPos) && this.map.hasLineOfSight(_botEyePos, _playerEyePos)) {
                        if (director) director.notifyShot(now);
                        this.attackCooldown = this.fireInterval + (Math.random() - 0.5) * 0.12;
                        this.fireAtPlayer(player, _botEyePos, _playerEyePos, distToPlayer);
                    } else {
                        this.attackCooldown = 0.08;
                    }
                }
            } else if (!hasLos) {
                // If broke LOS during fighting retreat, search if cover point is reachable
                const coverPoint = (this.map && playerPos && typeof this.map.findNearestCoverPoint === 'function')
                    ? this.map.findNearestCoverPoint(this.position, playerPos, 16)
                    : null;
                if (coverPoint) {
                    this.state = 'TAKE_COVER';
                    this.targetWaypoint.copy(coverPoint);
                    this.hasCoverObjective = true;
                }
            }

        } else if (this.state === 'AMBUSH') {
            // Camper stationary anchor holding corridor
            this.velocity.x = 0;
            this.velocity.z = 0;
            if (this.bodyMesh) this.bodyMesh.position.y = 0.88;
            _centerDir.set(-this.position.x, 0, -this.position.z).normalize();
            this.targetRotationY = Math.atan2(_centerDir.x, _centerDir.z);

        } else {
            if (this.bodyMesh && this.bodyMesh.position.y !== 1.05) this.bodyMesh.position.y = 1.05;

            // PATROL: Smooth dynamic strafe weaving along open street sequence (Requirement 4 & 5)
            if (!this.targetWaypoint || this.position.distanceTo(this.targetWaypoint) < 3.0) {
                if (this.archetype === 'CAMPER' && isGameStarted && Math.random() < 0.40) {
                    this.state = 'AMBUSH';
                    this.ambushTimer = 3.5 + Math.random() * 2.5;
                    this.velocity.set(0, 0, 0);
                } else {
                    this.pickNextWaypoint();
                }
            }

            if (this.state === 'PATROL') {
                const dx = this.targetWaypoint.x - this.position.x;
                const dz = this.targetWaypoint.z - this.position.z;
                const wpAngle = Math.atan2(dx, dz);

                const forwardX = Math.sin(wpAngle);
                const forwardZ = Math.cos(wpAngle);
                const perpX = Math.cos(wpAngle);
                const perpZ = -Math.sin(wpAngle);

                // Natural patrol weave smoothly scaled (~20% reduction while keeping strafeAmp property intact)
                const weaveOffset = Math.sin(this.walkCycle * 0.7 + this.id * 1.3) * (this.strafeAmp * 0.8);
                const basePatrolSpeed = this.speed * speedMultiplier;

                if (this.unstuckDuration > 0) {
                    this.unstuckDuration -= dt;
                    this.velocity.copy(this.unstuckVelocity);
                } else {
                    this.velocity.x = forwardX * basePatrolSpeed + perpX * weaveOffset;
                    this.velocity.z = forwardZ * basePatrolSpeed + perpZ * weaveOffset;
                }

                // When patrolling or navigating corners, face smoothly leads actual direction of travel
                if (this.velocity.lengthSq() > 0.1) {
                    this.targetRotationY = Math.atan2(this.velocity.x, this.velocity.z);
                } else {
                    this.targetRotationY = wpAngle;
                }
            }
        }

        // Smooth rotation interpolation (No instant snapping or spinning in place)
        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * Math.min(1.0, 10 * dt);

        // Anti-stuck watchdog (Detects corner entrapment or zero progress)
        this.stuckTimer += dt;
        if (this.stuckTimer >= 0.4) {
            const isTryingToMove = this.velocity.lengthSq() > 0.2 && this.state !== 'AMBUSH';
            if (isTryingToMove && this.position.distanceTo(this.lastPos) < 0.12) {
                this.triggerUnstuck();
            }
            this.lastPos.copy(this.position);
            this.stuckTimer = 0;
        }

        // Move with obstacle avoidance
        this.moveWithCollision(dt);

        // Always resolve any penetration
        this.map.resolvePenetration(this.position, this.radius, this.height);

        // Boundary bounds
        this.position.x = Math.max(-72, Math.min(72, this.position.x));
        this.position.z = Math.max(-72, Math.min(72, this.position.z));

        // Always advance walk cycle when moving
        const isMoving = this.velocity.lengthSq() > 0.1;
        if (isMoving) {
            this.walkCycle += dt * 9.5;
        }

        // Apply slide-hop vertical bounce offset
        this.meshRoot.position.set(this.position.x, this.position.y + hopYOffset, this.position.z);
        this.meshRoot.rotation.y = this.rotationY + Math.PI;

        // Requirement 1: 3D Aim Pitch Alignment
        // When engaging/aiming at player, pitch headMesh and torso/arms directly along aim vector to player eye height
        let targetPitch = 0;
        const isEngagingPlayer = (this.state === 'ENGAGE' || this.state === 'TAKE_COVER' || this.state === 'FIGHTING_RETREAT') && playerPos && !player.isDead && isGameStarted;
        if (isEngagingPlayer) {
            const targetPos = (hasLos || !this.hasLastKnownPos) ? playerPos : this.lastKnownPlayerPos;
            const distH = Math.hypot(targetPos.x - this.position.x, targetPos.z - this.position.z);
            const dy = (targetPos.y || 1.7) - (this.position.y + 1.76);
            targetPitch = Math.atan2(dy, Math.max(0.1, distH));
            // Anatomical pitch clamp (-48° to +48°)
            targetPitch = Math.max(-0.85, Math.min(0.85, targetPitch));
        }
        this.pitch += (targetPitch - this.pitch) * Math.min(1.0, 12 * dt);

        this.headMesh.rotation.x = this.pitch;
        this.bodyMesh.rotation.x = this.pitch * 0.35;

        // LOD 2: Frustum & Distance Culling on Limb Walk Animation
        if (inFrustum || distToPlayer < 20) {
            const legAngle = isMoving ? Math.sin(this.walkCycle) * 0.45 : 0;
            this.leftLeg.rotation.x = legAngle;
            this.rightLeg.rotation.x = -legAngle;

            if (isEngagingPlayer) {
                // Aim weapon stance aligned with pitch
                this.rightArm.rotation.x = 0.35 + this.pitch * 0.75;
                this.leftArm.rotation.x = 0.35 + this.pitch * 0.60 - legAngle * 0.2;
            } else {
                // Patrol stance: natural arm swing
                this.rightArm.rotation.x = 0.35;
                this.leftArm.rotation.x = isMoving ? -legAngle * 0.6 : 0;
            }
        }
    }

    moveWithCollision(dt) {
        // Dynamic obstacle avoidance probes aligned with movement direction
        const currentSpeed = this.velocity.length();
        if (currentSpeed > 0.4) {
            _moveDir.copy(this.velocity).multiplyScalar(1 / currentSpeed);
            const probeDist = Math.max(1.8, Math.min(3.0, currentSpeed * 0.35));

            _probeCenter.copy(this.position).addScaledVector(_moveDir, probeDist);

            if (this.map.checkCollision(_probeCenter, this.radius, this.height)) {
                // Obstacle ahead in movement path!
                if (this.state === 'ENGAGE') {
                    // Instantly reverse strafe direction away from wall
                    this.strafeDir *= -1;
                    this.strafeTimer = 0.5 + Math.random() * 0.3;
                } else if (this.state === 'PATROL') {
                    // Probe left (-45 deg) vs right (+45 deg) relative to movement direction
                    const moveAngle = Math.atan2(_moveDir.x, _moveDir.z);
                    const sinL = Math.sin(moveAngle - 0.78);
                    const cosL = Math.cos(moveAngle - 0.78);
                    const sinR = Math.sin(moveAngle + 0.78);
                    const cosR = Math.cos(moveAngle + 0.78);

                    _probeLeft.set(this.position.x + sinL * probeDist, this.position.y, this.position.z + cosL * probeDist);
                    _probeRight.set(this.position.x + sinR * probeDist, this.position.y, this.position.z + cosR * probeDist);

                    const leftBlocked = this.map.checkCollision(_probeLeft, this.radius, this.height);
                    const rightBlocked = this.map.checkCollision(_probeRight, this.radius, this.height);

                    if (!leftBlocked && rightBlocked) {
                        this.targetRotationY = moveAngle - 0.8;
                    } else if (!rightBlocked && leftBlocked) {
                        this.targetRotationY = moveAngle + 0.8;
                    } else {
                        this.pickNextWaypoint();
                    }
                }
            }
        }

        // Surface-normal sliding along unobstructed axes
        const stepX = this.velocity.x * dt;
        const stepZ = this.velocity.z * dt;

        // 1. Try full movement step first
        _nextFull.set(this.position.x + stepX, this.position.y, this.position.z + stepZ);
        if (!this.map.checkCollision(_nextFull, this.radius, this.height)) {
            this.position.x += stepX;
            this.position.z += stepZ;
        } else {
            // Full step blocked: Perform surface-normal sliding along unobstructed axes
            let movedX = false;
            let movedZ = false;

            _nextX.set(this.position.x + stepX, this.position.y, this.position.z);
            if (!this.map.checkCollision(_nextX, this.radius, this.height)) {
                this.position.x += stepX;
                movedX = true;
            } else {
                this.velocity.x = 0;
            }

            _nextZ.set(this.position.x, this.position.y, this.position.z + stepZ);
            if (!this.map.checkCollision(_nextZ, this.radius, this.height)) {
                this.position.z += stepZ;
                movedZ = true;
            } else {
                this.velocity.z = 0;
            }

            // Corner trap detection: if both axes blocked while trying to move
            if (!movedX && !movedZ && (Math.abs(stepX) > 0.001 || Math.abs(stepZ) > 0.001)) {
                if (this.unstuckDuration <= 0) {
                    this.triggerUnstuck();
                }
            }
        }

        // Dynamic Wall Repulsion: query closest collision normal and add repulsion force
        if (this.map && typeof this.map.getClosestCollisionNormal === 'function') {
            const repulseFound = this.map.getClosestCollisionNormal(this.position, this.radius + 0.35, this.height, _wallHitNormal);
            if (repulseFound) {
                const repulseStrength = 1.2;
                this.position.x += _wallHitNormal.x * repulseStrength * dt * 10;
                this.position.z += _wallHitNormal.z * repulseStrength * dt * 10;
            }
        }
    }

    fireAtPlayer(player, botEyePos, playerEyePos, distToPlayer) {
        if (!player || player.isDead) return;
        if (!window.game || !window.game.isGameStarted) return;
        if (!this.isPlayerInFrustumCone(player.yawObject.position)) return;
        // Strict Line-of-Sight verification before discharging bullet
        if (!this.map.hasLineOfSight(botEyePos, playerEyePos)) return;

        const spreadRad = (this.spreadBase || 0.05) + (distToPlayer / 100) * 0.04;
        const spreadX = (Math.random() - 0.5) * spreadRad;
        const spreadY = (Math.random() - 0.5) * spreadRad;

        _aimDir.subVectors(playerEyePos, botEyePos).normalize();
        _aimDir.x += spreadX;
        _aimDir.y += spreadY;
        _aimDir.normalize();

        const maxShotDist = 70;

        // Cast bullet ray along aim direction to detect world obstacles (crates, walls)
        _botBulletRay.set(botEyePos, _aimDir);
        _botBulletRay.near = 0.2;
        _botBulletRay.far = maxShotDist;
        const obstacleHits = _botBulletRay.intersectObjects(this.map.shootableMeshes, false);
        const obstacleDist = (obstacleHits.length > 0) ? obstacleHits[0].distance : maxShotDist;

        if (obstacleHits.length > 0) {
            _tracerEnd.copy(obstacleHits[0].point);
            const hitNormal = (obstacleHits[0].face && obstacleHits[0].face.normal) ? obstacleHits[0].face.normal : _wallHitNormal.set(0, 1, 0);
            this.particles.createWallImpact(obstacleHits[0].point, hitNormal);
        } else {
            _tracerEnd.copy(botEyePos).addScaledVector(_aimDir, maxShotDist);
        }

        const director = this.manager ? this.manager.combatDirector : (window.botManager ? window.botManager.combatDirector : null);
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() * 0.001 : Date.now() * 0.001;
        if (director) director.notifyShot(now);

        this.audio.playBotShoot(distToPlayer);
        this.particles.createTracer(botEyePos, _tracerEnd, 0xff9900);

        _playerCenter.copy(player.yawObject.position);
        _playerCenter.y -= 0.85;
        const playerRadius = player.radius * 1.15;

        _toPlayer.subVectors(_playerCenter, botEyePos);
        const projection = _toPlayer.dot(_aimDir);

        // Crucial invariant: Bullets can NEVER penetrate cover!
        // The bullet can hit the player ONLY if it reaches the player BEFORE hitting any obstacle!
        if (projection > 0 && projection < distToPlayer + 2 && projection < obstacleDist) {
            _closestPoint.copy(botEyePos).addScaledVector(_aimDir, projection);
            const hitDistance = _closestPoint.distanceTo(_playerCenter);

            if (hitDistance <= playerRadius) {
                // Scaled down by exactly 30% across all archetypes for balanced arcade accessibility
                const rawDmg = 11 + Math.floor(Math.random() * 5);
                const baseDmg = Math.max(1, Math.round(rawDmg * (this.damageMultiplier || 0.70)));
                const prevHp = player.health;
                player.takeDamage(baseDmg, this.position);
                if (prevHp > 0 && player.health <= 0) {
                    this.kills++;
                    this.score += 100;
                    if (window.uiManager) {
                        window.uiManager.addKillfeedItem(this.name, 'YOU', this.weaponType || 'RIFLE', false);
                        window.uiManager.updateLiveLeaderboard(player, window.botManager);
                    }
                }
            }
        }
    }
}

class BotManager {
    constructor(scene, map, audio, particles) {
        this.scene = scene;
        this.map = map;
        this.audio = audio;
        this.particles = particles;
        this.bots = [];
        this.combatDirector = new CombatTokenDirector();

        // Frustum culling optimization structures (reused every frame)
        this.cameraFrustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();

        // Doubled bot population (10 concurrent bots across all archetypes)
        this.botTemplates = [
            { id: 0, name: 'Guest_1', archetype: 'HUNTER', roleTitle: 'Hunter' },
            { id: 1, name: 'Player_4', archetype: 'FLANKER', roleTitle: 'Flanker' },
            { id: 2, name: 'Guest_2', archetype: 'PATROLLER', roleTitle: 'Patroller' },
            { id: 3, name: 'Player_5', archetype: 'CAMPER', roleTitle: 'Camper' },
            { id: 4, name: 'Guest_3', archetype: 'SURVIVOR', roleTitle: 'Survivor' },
            { id: 5, name: 'Guest_6', archetype: 'HUNTER', roleTitle: 'Hunter' },
            { id: 6, name: 'Ghost_8', archetype: 'FLANKER', roleTitle: 'Flanker' },
            { id: 7, name: 'Viper_9', archetype: 'PATROLLER', roleTitle: 'Patroller' },
            { id: 8, name: 'Apex_11', archetype: 'CAMPER', roleTitle: 'Camper' },
            { id: 9, name: 'Striker_7', archetype: 'SURVIVOR', roleTitle: 'Survivor' }
        ];

        this.skirmishTimer = 0;
        this.nextSkirmishInterval = 3.0 + Math.random() * 2.0;

        this.initBots();
    }

    initBots() {
        this.botTemplates.forEach((t, index) => {
            const cfg = Object.assign({ manager: this }, t);
            const bot = new Bot(index, t.name, 0x2e333a, this.scene, this.map, this.audio, this.particles, cfg);
            this.bots.push(bot);
        });
    }

    getHitboxes(outArray) {
        this.bots.forEach(bot => {
            if (!bot.isDead && bot.meshRoot.visible) {
                outArray.push({
                    mesh: bot.headMesh,
                    bot: bot,
                    isHead: true
                });
                outArray.push({
                    mesh: bot.bodyMesh,
                    bot: bot,
                    isHead: false
                });
            }
        });
    }

    getActiveBotPositions() {
        return this.bots.filter(b => !b.isDead).map(b => b.position);
    }

    update(dt, player) {
        if (this.combatDirector) {
            this.combatDirector.update(dt, this.bots, player);
        }

        let frustumReady = false;
        if (window.game && window.game.camera) {
            const cam = window.game.camera;
            this.projScreenMatrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
            this.cameraFrustum.setFromProjectionMatrix(this.projScreenMatrix);
            frustumReady = true;
        }

        const playerPos = player ? player.yawObject.position : null;

        for (let i = 0; i < this.bots.length; i++) {
            const bot = this.bots[i];
            const dist = playerPos ? bot.position.distanceTo(playerPos) : 0;
            const inFrustum = frustumReady ? this.cameraFrustum.containsPoint(bot.position) : true;
            bot.update(dt, player, inFrustum, dist);
        }

        // Simulate occasional bot skirmishes in the background (every 3-5 seconds)
        // when match is actively running to make arena feel alive
        if (window.game && window.game.isGameStarted && !window.game.isPaused && this.bots.length >= 2) {
            this.skirmishTimer = (this.skirmishTimer || 0) + dt;
            if (this.skirmishTimer >= (this.nextSkirmishInterval || 3.5)) {
                this.skirmishTimer = 0;
                this.nextSkirmishInterval = 3.0 + Math.random() * 2.0;

                // Pick two random distinct bots
                const idxA = Math.floor(Math.random() * this.bots.length);
                let idxB = Math.floor(Math.random() * (this.bots.length - 1));
                if (idxB >= idxA) idxB++;

                const botA = this.bots[idxA];
                const botB = this.bots[idxB];

                if (botA && botB) {
                    botA.kills = (botA.kills || 0) + 1;
                    botA.score = (botA.score || 0) + 100;
                    botB.deaths = (botB.deaths || 0) + 1;

                    if (window.uiManager) {
                        const skirmishWeapons = ['AR-47', 'SMG-9', 'AWM', 'REVOLVER', 'SHOTGUN'];
                        const weapon = skirmishWeapons[Math.floor(Math.random() * skirmishWeapons.length)];
                        const isHead = Math.random() < 0.25;
                        window.uiManager.addKillfeedItem(botA.name, botB.name, weapon, isHead);
                        window.uiManager.updateLiveLeaderboard(player || window.playerController, this);
                    }
                }
            }
        }
    }
}

window.BotManager = BotManager;
