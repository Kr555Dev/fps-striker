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

class Bot {
    constructor(id, name, colorHex, scene, map, audio, particles) {
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

        // Kinematics (Tuned ~20% lower for tactical, readable pacing)
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.rotationY = 0;
        this.targetRotationY = 0;
        this.pitch = 0;
        this.targetPitch = 0;
        this.speed = 7.4; // Tuned down from 9.2 (~20% reduction)

        // AI States: 'PATROL', 'ENGAGE', 'TAKE_COVER'
        this.state = 'PATROL';
        this.waypointIndex = id % this.map.waypoints.length;
        this.targetWaypoint = this.map.waypoints[this.waypointIndex].clone();
        this.attackCooldown = 0.5;
        this.fireInterval = 0.52;
        this.reactionTime = 0.38;
        this.hasLockedTarget = false;
        this.targetLockTimer = 0;
        this.lostTargetTimer = 0;

        // Backstab / Flank Alert with Delay (Requirement 2)
        this.isAlerted = false;
        this.alertReactionDelay = 0;
        this.alertAngle = 0;

        this.strafeTimer = 0;
        this.strafeDir = (id % 2 === 0) ? 1 : -1;
        this.strafeSpeed = 4.15; // Tuned down from 5.2 (~20% reduction)

        // Combat maneuvers (Requirement 5)
        this.stutterTimer = 0;
        this.tacticalBurstTimer = 0;
        this.tacticalBurstSpeed = 0;

        // Slide-hop mechanics (Requirement 5)
        this.slideHopTimer = 0;
        this.slideHopCooldown = 2.0 + Math.random() * 2.5;
        this.isSlideHopping = false;
        this.hopProgress = 0;
        this.strafeAmp = 2.2 + (id % 3) * 0.7; // Preserved for test compatibility

        this.respawnTimer = 0;
        this.walkCycle = 0;

        // Stuck watchdog
        this.lastPos = new THREE.Vector3();
        this.stuckTimer = 0;

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
        const suitMat = new THREE.MeshLambertMaterial({ color: 0x2e333a });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const tieMat = new THREE.MeshLambertMaterial({ color: 0x991b1b });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xdfa07a });
        const hairMat = new THREE.MeshLambertMaterial({ color: 0x3d2719 });
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

        // Face Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), eyeMat);
        leftEye.position.set(-0.12, 0.04, -0.26);
        this.headMesh.add(leftEye);
        const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), eyeMat);
        rightEye.position.set(0.12, 0.04, -0.26);
        this.headMesh.add(rightEye);

        // 3. Arms holding 3D Weapon
        this.leftArm = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.22), suitMat));
        this.leftArm.position.set(-0.48, 1.02, -0.06);
        this.leftArm.rotation.set(0.35, 0.2, 0);
        this.meshRoot.add(this.leftArm);

        this.rightArm = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.22), suitMat));
        this.rightArm.position.set(0.48, 1.02, -0.06);
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
        this.leftLeg.position.set(-0.22, 0.42, 0);
        this.meshRoot.add(this.leftLeg);

        this.rightLeg = setShadow(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), suitMat));
        this.rightLeg.position.set(0.22, 0.42, 0);
        this.meshRoot.add(this.rightLeg);

        this.createOverheadUI();
        this.scene.add(this.meshRoot);
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

        // Overhead style: Clean text with black outline + lime-green HP bar
        const displayName = this.name.startsWith('Bot') ? `Guest_${this.id + 1}` : this.name;

        ctx.font = 'bold 24px Rajdhani, sans-serif';
        ctx.textAlign = 'center';

        // Dark text outline for high contrast
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(displayName, 128, 26);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(displayName, 128, 26);

        // HP Bar Container (Black Border)
        const barW = 140;
        const barH = 8;
        const barX = (256 - barW) / 2;
        const barY = 36;

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

    spawn() {
        const spawns = this.map.spawnPoints;
        const sp = spawns[Math.floor(Math.random() * spawns.length)];
        this.position.set(sp.x, sp.y, sp.z);

        this.map.resolvePenetration(this.position, this.radius, this.height);

        this.meshRoot.position.copy(this.position);
        this.health = this.maxHealth;
        this.isDead = false;
        this.hasLockedTarget = false;
        this.targetLockTimer = 0;
        this.lostTargetTimer = 0;
        this.isAlerted = false;
        this.alertReactionDelay = 0;
        this.pitch = 0;
        this.targetPitch = 0;
        this.meshRoot.visible = true;
        this.lastPos.copy(this.position);
        this.stuckTimer = 0;
        this.pickNextWaypoint();
        this.renderOverheadCanvas();
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
        this.strafeTimer = 0.4 + Math.random() * 0.4;
        this.tacticalBurstTimer = 0.45;
        this.tacticalBurstSpeed = 3.3; // Tuned down from 4.2 (~20% reduction per Requirement 4)
        if (Math.random() < 0.55) {
            this.isSlideHopping = true;
            this.slideHopTimer = 0.55;
            this.hopProgress = 0;
        }
    }

    takeDamage(damage, attacker, isHeadshot, weaponName) {
        if (this.isDead) return;
        this.health -= damage;
        this.renderOverheadCanvas();

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

                if (wasInVision) {
                    // Attacker is in front / within vision cone (110°): instant combat engagement
                    this.state = (this.health < 35) ? 'TAKE_COVER' : 'ENGAGE';
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
                    this.alertReactionDelay = 0.45 + Math.random() * 0.15;
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
            }

            window.uiManager.addKillfeedItem(killerName, this.name, weaponName || 'RIFLE', isHeadshot);
        }
    }

    update(dt, player, inFrustum = true, distToPlayer = 0) {
        if (this.isDead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.spawn();
            }
            return;
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

        // Backstab / Flank Alert with Delay handling (Requirement 2)
        if (this.isAlerted && isGameStarted) {
            this.alertReactionDelay -= dt;
            if (this.alertReactionDelay <= 0) {
                // Reaction delay elapsed! Bot now turns towards the incoming damage angle
                this.isAlerted = false;
                this.targetRotationY = this.alertAngle;
                this.state = (this.health < 35) ? 'TAKE_COVER' : 'ENGAGE';
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
        } else if (this.isAlerted) {
            // Under delayed alert; maintaining evasive maneuvers until reaction timer fires
        } else if (this.state === 'PATROL') {
            // In PATROL, bot ONLY spots/aggros player if player is within 110° vision cone AND has LOS!
            if (inVisionCone && hasLos) {
                this.state = (this.health < 35) ? 'TAKE_COVER' : 'ENGAGE';
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
            // In ENGAGE or TAKE_COVER: maintain active combat target while LOS exists
            if (hasLos) {
                this.state = (this.health < 35) ? 'TAKE_COVER' : 'ENGAGE';
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
                if (this.lostTargetTimer > 1.4 || !player || player.isDead) {
                    this.hasLockedTarget = false;
                    this.targetLockTimer = 0;
                    this.state = 'PATROL';
                    this.pickNextWaypoint();
                }
            }
        }

        // Requirement 5: Slide-Hop Momentum Burst System
        this.slideHopCooldown -= dt;
        if (this.slideHopCooldown <= 0 && !this.isDead) {
            const hopChance = (this.state === 'ENGAGE') ? 0.65 : 0.30;
            if (Math.random() < hopChance) {
                this.isSlideHopping = true;
                this.slideHopTimer = 0.55;
                this.hopProgress = 0;
            }
            this.slideHopCooldown = (this.state === 'ENGAGE' ? 2.5 : 4.5) + Math.random() * 2.0;
        }

        let speedMultiplier = 1.0;
        let hopYOffset = 0;
        if (this.isSlideHopping) {
            this.slideHopTimer -= dt;
            this.hopProgress = Math.max(0, 1.0 - (this.slideHopTimer / 0.55));
            // Momentum speed burst during slide-hop (tuned down from 1.45 -> 1.25 per Requirement 4)
            speedMultiplier = 1.25;
            // Arc trajectory simulating jump & slide
            hopYOffset = Math.sin(this.hopProgress * Math.PI) * 0.35;
            if (this.slideHopTimer <= 0) {
                this.isSlideHopping = false;
                hopYOffset = 0;
            }
        }

        // State Behaviors
        if (this.state === 'ENGAGE' && player && !player.isDead && isGameStarted) {
            const dx = playerPos.x - this.position.x;
            const dz = playerPos.z - this.position.z;
            this.targetRotationY = Math.atan2(dx, dz);

            // Requirement 5 & 4: Irregular direction flips & tuned strafe rhythms (~20% reduction)
            this.strafeTimer -= dt;
            if (this.strafeTimer <= 0) {
                const roll = Math.random();
                if (roll < 0.30) {
                    this.strafeTimer = 0.25 + Math.random() * 0.25; // Quick jiggle-peek
                } else if (roll < 0.70) {
                    this.strafeTimer = 0.60 + Math.random() * 0.50; // Normal strafe
                } else {
                    this.strafeTimer = 1.20 + Math.random() * 0.60; // Wide sweep
                }
                this.strafeDir = Math.random() > 0.45 ? -this.strafeDir : (Math.random() > 0.5 ? 1 : -1);
                // Tuned from 5.0 - 7.2 -> 4.0 - 5.8 (Requirement 4)
                this.strafeSpeed = 4.0 + Math.random() * 1.8;

                // Sudden stutter-step to throw off player tracking
                if (Math.random() < 0.30) {
                    this.stutterTimer = 0.15 + Math.random() * 0.15;
                }
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

            // Tactical circle-strafing with lateral bursts
            const totalStrafeSpeed = (this.strafeSpeed + this.tacticalBurstSpeed) * speedMultiplier * moveMultiplier;
            const sideX = Math.cos(this.targetRotationY) * this.strafeDir * totalStrafeSpeed;
            const sideZ = -Math.sin(this.targetRotationY) * this.strafeDir * totalStrafeSpeed;

            // Spacing management: close in if far, backpedal if close, micro-drift in mid-range (tuned ~20% lower)
            let forwardPush = 0;
            if (distToPlayer > 18) {
                forwardPush = 3.35; // Tuned down from 4.2
            } else if (distToPlayer < 7.5) {
                forwardPush = -4.0; // Tuned down from -5.0
            } else {
                forwardPush = Math.sin(this.walkCycle * 0.8) * 1.45; // Tuned down from 1.8
            }
            forwardPush *= speedMultiplier * moveMultiplier;

            this.velocity.x = sideX + Math.sin(this.targetRotationY) * forwardPush;
            this.velocity.z = sideZ + Math.cos(this.targetRotationY) * forwardPush;

            // Requirement 3: Enforce forward FOV Frustum cone before firing!
            if (this.hasLockedTarget) {
                this.attackCooldown -= dt;
                if (this.attackCooldown <= 0) {
                    if (this.isPlayerInFrustumCone(playerPos)) {
                        this.attackCooldown = this.fireInterval + (Math.random() - 0.5) * 0.15;
                        this.fireAtPlayer(player, _botEyePos, _playerEyePos, distToPlayer);
                    } else {
                        // Hold fire until rotated into forward frustum cone
                        this.attackCooldown = 0.05;
                    }
                }
            }

        } else if (this.state === 'TAKE_COVER') {
            // Low health: Back off towards nearest open waypoint away from player with evasive zig-zag
            if (!this.targetWaypoint || this.position.distanceTo(this.targetWaypoint) < 3.0) {
                this.pickNextWaypoint();
            }
            const dx = this.targetWaypoint.x - this.position.x;
            const dz = this.targetWaypoint.z - this.position.z;
            this.targetRotationY = Math.atan2(dx, dz);

            const forwardX = Math.sin(this.targetRotationY);
            const forwardZ = Math.cos(this.targetRotationY);
            const perpX = Math.cos(this.targetRotationY);
            const perpZ = -Math.sin(this.targetRotationY);

            // Evasive sprint zig-zag (tuned down ~20% from 3.5 -> 2.8)
            const evadeWeave = Math.sin(this.walkCycle * 1.4) * 2.8;
            const retreatSpeed = this.speed * 1.12 * speedMultiplier;

            this.velocity.x = forwardX * retreatSpeed + perpX * evadeWeave;
            this.velocity.z = forwardZ * retreatSpeed + perpZ * evadeWeave;

            // Occasional defensive return fire (Requirement 3: strictly within FOV frustum)
            if (this.hasLockedTarget && isGameStarted && playerPos && Math.random() < 0.3) {
                this.attackCooldown -= dt;
                if (this.attackCooldown <= 0) {
                    if (this.isPlayerInFrustumCone(playerPos)) {
                        this.attackCooldown = 0.8;
                        this.fireAtPlayer(player, _botEyePos, _playerEyePos, distToPlayer);
                    } else {
                        this.attackCooldown = 0.08;
                    }
                }
            }

        } else {
            // PATROL: Smooth dynamic strafe weaving along open street sequence (Requirement 4 & 5)
            if (!this.targetWaypoint || this.position.distanceTo(this.targetWaypoint) < 3.0) {
                this.pickNextWaypoint();
            }

            const dx = this.targetWaypoint.x - this.position.x;
            const dz = this.targetWaypoint.z - this.position.z;
            this.targetRotationY = Math.atan2(dx, dz);

            const forwardX = Math.sin(this.targetRotationY);
            const forwardZ = Math.cos(this.targetRotationY);
            const perpX = Math.cos(this.targetRotationY);
            const perpZ = -Math.sin(this.targetRotationY);

            // Natural patrol weave smoothly scaled (~20% reduction while keeping strafeAmp property intact)
            const weaveOffset = Math.sin(this.walkCycle * 0.7 + this.id * 1.3) * (this.strafeAmp * 0.8);
            const basePatrolSpeed = this.speed * speedMultiplier;

            this.velocity.x = forwardX * basePatrolSpeed + perpX * weaveOffset;
            this.velocity.z = forwardZ * basePatrolSpeed + perpZ * weaveOffset;
        }

        // Smooth rotation interpolation (No instant snapping or spinning in place)
        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * Math.min(1.0, 10 * dt);

        // Anti-stuck watchdog (No rotating in place)
        this.stuckTimer += dt;
        if (this.stuckTimer >= 1.0) {
            if (this.position.distanceTo(this.lastPos) < 0.4) {
                // If making no progress, immediately push towards open center and switch waypoint
                this.pickNextWaypoint();
                _centerDir.set(-this.position.x, 0, -this.position.z).normalize();
                this.velocity.x = _centerDir.x * this.speed;
                this.velocity.z = _centerDir.z * this.speed;
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
        this.meshRoot.rotation.y = this.rotationY;

        // Requirement 1: 3D Aim Pitch Alignment
        // When engaging/aiming at player, pitch headMesh and torso/arms directly along aim vector to player eye height
        let targetPitch = 0;
        const isEngagingPlayer = (this.state === 'ENGAGE' || this.state === 'TAKE_COVER') && playerPos && !player.isDead && isGameStarted;
        if (isEngagingPlayer) {
            const distH = Math.hypot(playerPos.x - this.position.x, playerPos.z - this.position.z);
            const dy = playerPos.y - (this.position.y + 1.76);
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
        // Dynamic obstacle avoidance probes (probes 2.4m ahead)
        const sinY = Math.sin(this.rotationY);
        const cosY = Math.cos(this.rotationY);
        const probeDist = 2.4;

        _probeCenter.set(
            this.position.x + sinY * probeDist,
            this.position.y,
            this.position.z + cosY * probeDist
        );

        if (this.map.checkCollision(_probeCenter, this.radius, this.height)) {
            // Obstacle ahead! Probe left (-40 deg) vs right (+40 deg)
            const sinL = Math.sin(this.rotationY - 0.7);
            const cosL = Math.cos(this.rotationY - 0.7);
            const sinR = Math.sin(this.rotationY + 0.7);
            const cosR = Math.cos(this.rotationY + 0.7);

            _probeLeft.set(this.position.x + sinL * probeDist, this.position.y, this.position.z + cosL * probeDist);
            _probeRight.set(this.position.x + sinR * probeDist, this.position.y, this.position.z + cosR * probeDist);

            const leftBlocked = this.map.checkCollision(_probeLeft, this.radius, this.height);
            const rightBlocked = this.map.checkCollision(_probeRight, this.radius, this.height);

            if (!leftBlocked && rightBlocked) {
                this.targetRotationY -= 0.8;
            } else if (!rightBlocked && leftBlocked) {
                this.targetRotationY += 0.8;
            } else {
                this.pickNextWaypoint();
            }
        }

        // Wall sliding: allows moving along unobstructed axis
        const stepX = this.velocity.x * dt;
        const stepZ = this.velocity.z * dt;

        _nextX.set(this.position.x + stepX, this.position.y, this.position.z);
        if (!this.map.checkCollision(_nextX, this.radius, this.height)) {
            this.position.x += stepX;
        } else {
            this.velocity.x = 0;
        }

        _nextZ.set(this.position.x, this.position.y, this.position.z + stepZ);
        if (!this.map.checkCollision(_nextZ, this.radius, this.height)) {
            this.position.z += stepZ;
        } else {
            this.velocity.z = 0;
        }
    }

    fireAtPlayer(player, botEyePos, playerEyePos, distToPlayer) {
        if (!player || player.isDead) return;
        if (!window.game || !window.game.isGameStarted) return;
        if (!this.isPlayerInFrustumCone(player.yawObject.position)) return;

        const spreadRad = 0.05 + (distToPlayer / 100) * 0.04;
        const spreadX = (Math.random() - 0.5) * spreadRad;
        const spreadY = (Math.random() - 0.5) * spreadRad;

        _aimDir.subVectors(playerEyePos, botEyePos).normalize();
        _aimDir.x += spreadX;
        _aimDir.y += spreadY;
        _aimDir.normalize();

        const maxShotDist = 70;
        _tracerEnd.copy(botEyePos).addScaledVector(_aimDir, maxShotDist);

        this.audio.playBotShoot(distToPlayer);
        this.particles.createTracer(botEyePos, _tracerEnd, 0xff9900);

        _playerCenter.copy(player.yawObject.position);
        _playerCenter.y -= 0.85;
        const playerRadius = player.radius * 1.15;

        _toPlayer.subVectors(_playerCenter, botEyePos);
        const projection = _toPlayer.dot(_aimDir);

        if (projection > 0 && projection < distToPlayer + 2) {
            _closestPoint.copy(botEyePos).addScaledVector(_aimDir, projection);
            const hitDistance = _closestPoint.distanceTo(_playerCenter);

            if (hitDistance <= playerRadius) {
                const baseDmg = 11 + Math.floor(Math.random() * 5);
                player.takeDamage(baseDmg, this.position);
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

        // Frustum culling optimization structures (reused every frame)
        this.cameraFrustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();

        this.botTemplates = [
            { name: 'Guest_1', color: 0x2e333a },
            { name: 'Player_4', color: 0x2e333a },
            { name: 'Guest_2', color: 0x2e333a },
            { name: 'Player_5', color: 0x2e333a },
            { name: 'Guest_3', color: 0x2e333a }
        ];

        this.initBots();
    }

    initBots() {
        this.botTemplates.forEach((t, index) => {
            const bot = new Bot(index, t.name, t.color, this.scene, this.map, this.audio, this.particles);
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
    }
}

window.BotManager = BotManager;
