// Module-level pre-allocated scratch objects (Zero-GC invariant)
const _p_wishDir = new THREE.Vector3();
const _p_foot = new THREE.Vector3();

class PlayerController {
    constructor(camera, scene, map, audio, particles) {
        this.camera = camera;
        this.scene = scene;
        this.map = map;
        this.audio = audio;
        this.particles = particles;

        // Yaw and Pitch containers
        this.pitchObject = new THREE.Object3D();
        this.pitchObject.add(this.camera);

        this.yawObject = new THREE.Object3D();
        this.yawObject.position.y = 1.7;
        this.yawObject.add(this.pitchObject);
        this.scene.add(this.yawObject);

        // Dimensions
        this.radius = 0.55;
        this.standingHeight = 1.75;
        this.crouchHeight = 1.0;
        this.currentHeight = 1.75;

        // Balanced Physics Parameters
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.baseSpeed = 10.5;       // Controllable, solid tactical speed (was 20!)
        this.sprintSpeed = 14.0;
        this.slideSpeed = 16.5;
        this.groundFriction = 22.0;  // Snappy, non-slippery halt on key release
        this.gravity = 25.0;         // Natural gravity
        this.jumpPower = 8.8;        // Realistic ~1.45m jump height (was 14.5!)
        this.maxAirSpeed = 16.0;

        // Slide Mechanics
        this.isSliding = false;
        this.slideTimer = 0;
        this.maxSlideDuration = 0.7;

        // Camera Dynamics
        this.bobTimer = 0;
        this.cameraTilt = 0;
        this.sensitivity = 0.0022;
        this.isLocked = false;

        // Stats & Invulnerability
        this.health = 100;
        this.maxHealth = 100;
        this.shield = 0;
        this.maxShield = 50;
        this.isDead = false;
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;
        this.lastDamageTime = 0;
        this.score = 0;
        this.kills = 0;
        this.deaths = 0;
        this.streak = 0;

        // Arcade Boosters & Power-Ups
        this.boosters = {
            speed: 0,
            damage: 0,
            shield: 0
        };
        this.boosterMaxDurations = {
            speed: 10.0,
            damage: 8.0,
            shield: 15.0
        };

        // Inputs
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            slide: false
        };
        this.jumpFreshPress = false;

        this.initInput();
        this.spawn();
    }

    initInput() {
        document.addEventListener('click', (e) => {
            const startMenu = document.getElementById('start-menu');
            if (startMenu && startMenu.style.display !== 'none') return;
            if (!window.game || !window.game.isGameStarted) return;
            if (!this.isLocked && !this.isDead) {
                if (e.target.closest('.screen-card') || e.target.closest('button') || e.target.closest('input')) return;
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === document.body;
            const pauseMenu = document.getElementById('pause-menu');
            if (!this.isLocked && !this.isDead) {
                if (pauseMenu && window.game && window.game.isGameStarted) pauseMenu.style.display = 'flex';
            } else {
                if (pauseMenu) pauseMenu.style.display = 'none';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!window.game || !window.game.isGameStarted) return;
            if (!this.isLocked || this.isDead) return;

            let effectiveSens = this.sensitivity;
            if (window.weaponSystem && window.weaponSystem.isAiming) {
                if (window.weaponSystem.currentWeaponKey === 'sniper') {
                    // High-magnification optical scope: reduce sensitivity to 0.35x for pinpoint accuracy
                    effectiveSens *= 0.35;
                } else {
                    // Standard ADS zoom: reduce sensitivity to 0.75x
                    effectiveSens *= 0.75;
                }
            }

            this.yawObject.rotation.y -= (e.movementX || 0) * effectiveSens;
            this.pitchObject.rotation.x -= (e.movementY || 0) * effectiveSens;

            const maxPitch = Math.PI / 2 - 0.02;
            this.pitchObject.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.pitchObject.rotation.x));
        });

        window.addEventListener('keydown', (e) => {
            if (!window.game || !window.game.isGameStarted) return;
            if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.forward = true;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.backward = true;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
            if (e.code === 'Space') {
                if (!this.keys.jump) {
                    this.jumpFreshPress = true;
                }
                this.keys.jump = true;
                e.preventDefault();
            }
            if (e.code === 'ShiftLeft' || e.code === 'KeyC') {
                this.keys.slide = true;
            }
            if (e.code === 'KeyR') {
                if (window.weaponSystem) window.weaponSystem.reload();
            }
            if (e.code === 'Tab') {
                e.preventDefault();
                const sb = document.getElementById('scoreboard-modal');
                if (sb) {
                    sb.style.display = 'flex';
                    if (window.uiManager && window.botManager) {
                        window.uiManager.updateScoreboard(this, window.botManager);
                    }
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.forward = false;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.backward = false;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
            if (e.code === 'Space') {
                this.keys.jump = false;
                this.jumpFreshPress = false;
            }
            if (e.code === 'ShiftLeft' || e.code === 'KeyC') this.keys.slide = false;
            if (e.code === 'Tab') {
                e.preventDefault();
                const sb = document.getElementById('scoreboard-modal');
                if (sb && window.uiManager && !window.uiManager.isMatchEnded) {
                    sb.style.display = 'none';
                }
            }
        });
    }

    spawn() {
        const botPositions = window.botManager ? window.botManager.getActiveBotPositions() : [];
        const safeSpawn = this.map.getSafeSpawnPoint(botPositions, 25);

        this.yawObject.position.set(safeSpawn.x, safeSpawn.y + 1.7, safeSpawn.z);
        this.velocity.set(0, 0, 0);
        this.health = this.maxHealth;
        this.shield = 0;
        this.boosters.speed = 0;
        this.boosters.damage = 0;
        this.boosters.shield = 0;
        this.isDead = false;
        this.currentHeight = this.standingHeight;
        this.yawObject.rotation.y = Math.random() * Math.PI * 2;
        this.pitchObject.rotation.x = 0;
        this.pitchObject.rotation.z = 0;

        this.isInvulnerable = true;
        this.invulnerableTimer = 2.5;

        const shieldBadge = document.getElementById('shield-badge');
        if (shieldBadge) shieldBadge.style.display = 'block';

        if (window.uiManager) {
            if (typeof window.uiManager.clearAllBoosters === 'function') {
                window.uiManager.clearAllBoosters();
            }
            window.uiManager.updateHealth(this.health, this.maxHealth, this.shield, this.maxShield);
        }
    }

    hasSpeedBooster() {
        return this.boosters.speed > 0;
    }

    hasDamageBooster() {
        return this.boosters.damage > 0;
    }

    hasShieldBooster() {
        return this.boosters.shield > 0 && this.shield > 0;
    }

    getSpeedMultiplier() {
        return this.hasSpeedBooster() ? 1.4 : 1.0;
    }

    getSlideMultiplier() {
        return this.hasSpeedBooster() ? 1.5 : 1.0;
    }

    applyBooster(type) {
        if (type === 'speed') {
            this.boosters.speed = this.boosterMaxDurations.speed;
            if (this.audio && this.audio.playBoosterPickup) this.audio.playBoosterPickup('speed');
            if (window.uiManager) {
                window.uiManager.showBooster('speed', 'ADRENALINE BURST', '+40% SPEED & SLIDE', this.boosterMaxDurations.speed, '#00ffcc');
            }
        } else if (type === 'damage') {
            this.boosters.damage = this.boosterMaxDurations.damage;
            if (this.audio && this.audio.playBoosterPickup) this.audio.playBoosterPickup('damage');
            if (window.uiManager) {
                window.uiManager.showBooster('damage', 'HYPER DAMAGE', '2.5x WEAPON DAMAGE', this.boosterMaxDurations.damage, '#ff0055');
            }
        } else if (type === 'shield') {
            this.shield = Math.min(this.maxShield, this.shield + 50);
            this.boosters.shield = this.boosterMaxDurations.shield;
            if (this.audio && this.audio.playBoosterPickup) this.audio.playBoosterPickup('shield');
            if (window.uiManager) {
                window.uiManager.showBooster('shield', 'NANO-SHIELD', '+50 ACTIVE ARMOR', this.boosterMaxDurations.shield, '#ffaa00');
                window.uiManager.updateHealth(this.health, this.maxHealth, this.shield, this.maxShield);
            }
        }
    }

    takeDamage(amount, sourcePos) {
        if (!window.game || !window.game.isGameStarted) return;
        if (this.isDead || this.isInvulnerable) return;

        // Nano-Shield absorption: takes damage before health!
        if (this.shield > 0) {
            const absorbed = Math.min(this.shield, amount);
            this.shield -= absorbed;
            amount -= absorbed;

            if (this.audio && this.audio.playShieldHit) {
                this.audio.playShieldHit();
            }
            if (window.uiManager && window.uiManager.triggerShieldDeflect) {
                window.uiManager.triggerShieldDeflect();
            }

            if (this.shield <= 0) {
                this.shield = 0;
                this.boosters.shield = 0;
                if (this.audio && this.audio.playBoosterExpire) {
                    this.audio.playBoosterExpire('shield');
                }
                if (window.uiManager) {
                    window.uiManager.removeBooster('shield');
                }
            }

            if (window.uiManager) {
                window.uiManager.updateHealth(this.health, this.maxHealth, this.shield, this.maxShield);
            }
        }

        if (amount > 0) {
            this.health -= amount;
            this.lastDamageTime = performance.now();
            this.audio.playHurt();
            this.particles.addTrauma(0.35);

            const vig = document.getElementById('damage-vignette');
            if (vig) {
                vig.classList.add('hit');
                setTimeout(() => vig.classList.remove('hit'), 180);
            }

            if (window.uiManager) {
                window.uiManager.updateHealth(this.health, this.maxHealth, this.shield, this.maxShield);
            }
        }

        if (window.uiManager && sourcePos) {
            window.uiManager.showDamageIndicator(sourcePos, this.yawObject.position, this.yawObject.rotation.y);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    die() {
        if (!window.game || !window.game.isGameStarted) return;
        this.isDead = true;
        this.deaths++;
        this.streak = 0;
        this.audio.playHurt();
        this.pitchObject.rotation.z = 0.5;
        this.pitchObject.rotation.x = 0.4;

        if (window.uiManager) {
            window.uiManager.updateHealth(0, this.maxHealth, 0, this.maxShield);
            window.uiManager.showDeathScreen();
        }
    }

    respawn() {
        this.spawn();
        if (window.weaponSystem) window.weaponSystem.resetAmmo();
        if (window.uiManager) window.uiManager.hideDeathScreen();
        document.body.requestPointerLock();
    }

    update(dt) {
        if (!window.game || !window.game.isGameStarted) return;
        if (this.isDead) return;

        // Arcade Booster Timers Update
        if (this.boosters.speed > 0) {
            this.boosters.speed -= dt;
            if (this.boosters.speed <= 0) {
                this.boosters.speed = 0;
                if (this.audio && this.audio.playBoosterExpire) this.audio.playBoosterExpire('speed');
                if (window.uiManager) window.uiManager.removeBooster('speed');
            }
        }
        if (this.boosters.damage > 0) {
            this.boosters.damage -= dt;
            if (this.boosters.damage <= 0) {
                this.boosters.damage = 0;
                if (this.audio && this.audio.playBoosterExpire) this.audio.playBoosterExpire('damage');
                if (window.uiManager) window.uiManager.removeBooster('damage');
            }
        }
        if (this.boosters.shield > 0) {
            this.boosters.shield -= dt;
            if (this.boosters.shield <= 0 || this.shield <= 0) {
                this.boosters.shield = 0;
                this.shield = 0;
                if (this.audio && this.audio.playBoosterExpire) this.audio.playBoosterExpire('shield');
                if (window.uiManager) {
                    window.uiManager.removeBooster('shield');
                    window.uiManager.updateHealth(this.health, this.maxHealth, this.shield, this.maxShield);
                }
            }
        }

        // Invulnerability timer
        if (this.isInvulnerable) {
            this.invulnerableTimer -= dt;
            if (this.invulnerableTimer <= 0) {
                this.isInvulnerable = false;
                const shieldBadge = document.getElementById('shield-badge');
                if (shieldBadge) shieldBadge.style.display = 'none';
            }
        }

        // Health Regeneration
        const now = performance.now();
        if (now - this.lastDamageTime > 4000 && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + dt * 25);
            if (window.uiManager) window.uiManager.updateHealth(this.health, this.maxHealth, this.shield, this.maxShield);
        }

        // Desired Direction
        const forward = (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0);
        const right = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);

        const yaw = this.yawObject.rotation.y;
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);

        _p_wishDir.set(
            -sin * forward + cos * right,
            0,
            -cos * forward - sin * right
        );

        const isMoving = _p_wishDir.lengthSq() > 0.001;
        if (isMoving) _p_wishDir.normalize();

        // Slide logic (Enhanced with 1.5x Adrenaline Burst)
        const wantsSlide = this.keys.slide;
        const currentSlideSpeed = this.slideSpeed * this.getSlideMultiplier();
        if (wantsSlide && this.onGround && isMoving && !this.isSliding) {
            this.isSliding = true;
            this.slideTimer = this.maxSlideDuration;
            this.audio.playSlide();

            this.velocity.x = _p_wishDir.x * currentSlideSpeed;
            this.velocity.z = _p_wishDir.z * currentSlideSpeed;
        }

        if (this.isSliding) {
            this.slideTimer -= dt;
            if (!wantsSlide || this.slideTimer <= 0) {
                this.isSliding = false;
            }
        }

        // Camera height
        const targetHeight = this.isSliding ? this.crouchHeight : this.standingHeight;
        this.currentHeight += (targetHeight - this.currentHeight) * 16 * dt;

        // Ground vs Air Movement (Enhanced with +40% Speed multiplier)
        const speedMult = this.getSpeedMultiplier();
        if (this.onGround) {
            if (this.isSliding) {
                // Low slide friction
                this.velocity.x -= this.velocity.x * 3.5 * dt;
                this.velocity.z -= this.velocity.z * 3.5 * dt;
            } else {
                if (isMoving) {
                    const targetSpeed = this.baseSpeed * speedMult;
                    const accel = 60.0;
                    const targetVelX = _p_wishDir.x * targetSpeed;
                    const targetVelZ = _p_wishDir.z * targetSpeed;

                    this.velocity.x += (targetVelX - this.velocity.x) * Math.min(1.0, accel * dt);
                    this.velocity.z += (targetVelZ - this.velocity.z) * Math.min(1.0, accel * dt);
                } else {
                    // Snappy stop (no ice slipperiness!)
                    const friction = this.groundFriction;
                    this.velocity.x -= this.velocity.x * friction * dt;
                    this.velocity.z -= this.velocity.z * friction * dt;
                    if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
                    if (Math.abs(this.velocity.z) < 0.1) this.velocity.z = 0;
                }
            }

            // Footsteps
            if (isMoving && !this.isSliding) {
                this.bobTimer += dt * 11.0;
                if (this.bobTimer > Math.PI * 2) {
                    this.bobTimer = 0;
                    this.audio.playFootstep();
                }
            }

            // Jump: requires fresh press
            if (this.jumpFreshPress) {
                this.velocity.y = this.jumpPower;
                this.onGround = false;
                this.jumpFreshPress = false;
                this.audio.playJump();

                // Slide boost (controlled, not runaway)
                if (this.isSliding) {
                    this.velocity.x *= 1.15;
                    this.velocity.z *= 1.15;
                    this.isSliding = false;
                }
            }
        } else {
            // Air state: Directional air control without infinite acceleration
            if (isMoving) {
                const airSteer = 14.0;
                this.velocity.x += _p_wishDir.x * airSteer * dt;
                this.velocity.z += _p_wishDir.z * airSteer * dt;

                // Strict air speed cap
                const maxAir = this.maxAirSpeed * speedMult;
                const hSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
                if (hSpeed > maxAir) {
                    this.velocity.x = (this.velocity.x / hSpeed) * maxAir;
                    this.velocity.z = (this.velocity.z / hSpeed) * maxAir;
                }
            }

            this.velocity.y -= this.gravity * dt;
        }

        // Jump pads check
        this.checkJumpPads();

        // Resolve collisions
        this.resolveCollisions(dt);

        // Anti-clipping depenetration
        const curPos = this.yawObject.position;
        this.map.resolvePenetration(curPos, this.radius, this.currentHeight);

        // Camera dynamics
        const strafeTiltTarget = (this.keys.right ? -0.02 : 0) + (this.keys.left ? 0.02 : 0);
        this.cameraTilt += (strafeTiltTarget - this.cameraTilt) * 12 * dt;

        const shake = this.particles.getShakeOffset();
        this.pitchObject.rotation.z = this.cameraTilt + shake.roll;
        this.camera.position.x = shake.x;
        this.camera.position.y = shake.y;

        if (this.onGround && isMoving && !this.isSliding) {
            this.camera.position.y += Math.sin(this.bobTimer) * 0.035;
        }

        // Update speedometer
        const currentHSpeed = Math.round(Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z) * 10);
        const speedEl = document.getElementById('speed-val');
        if (speedEl) speedEl.innerText = `${currentHSpeed} SPD`;
    }

    checkJumpPads() {
        const foot = this.getFootPosition();
        for (const pad of this.map.jumpPads) {
            if (foot.x >= pad.min.x && foot.x <= pad.max.x &&
                foot.z >= pad.min.z && foot.z <= pad.max.z &&
                foot.y >= pad.min.y && foot.y <= pad.max.y) {
                this.velocity.y = pad.power;
                this.onGround = false;
                this.audio.playJump();
                break;
            }
        }
    }

    getFootPosition() {
        _p_foot.set(
            this.yawObject.position.x,
            this.yawObject.position.y - this.currentHeight,
            this.yawObject.position.z
        );
        return _p_foot;
    }

    resolveCollisions(dt) {
        const foot = this.getFootPosition();

        const dx = this.velocity.x * dt;
        const dz = this.velocity.z * dt;

        foot.x += dx;
        if (this.checkHorizontalCollision(foot)) {
            // Attempt step-up for stairs/curbs (steps on ramp are 0.95m high)
            const stepUpHeight = 1.05;
            foot.y += stepUpHeight;
            if (!this.checkHorizontalCollision(foot)) {
                this.yawObject.position.y += stepUpHeight;
            } else {
                foot.y -= stepUpHeight;
                foot.x -= dx;
                this.velocity.x = 0;
            }
        }

        foot.z += dz;
        if (this.checkHorizontalCollision(foot)) {
            const stepUpHeight = 1.05;
            foot.y += stepUpHeight;
            if (!this.checkHorizontalCollision(foot)) {
                this.yawObject.position.y += stepUpHeight;
            } else {
                foot.y -= stepUpHeight;
                foot.z -= dz;
                this.velocity.z = 0;
            }
        }

        foot.y += this.velocity.y * dt;
        const floorY = this.getFloorHeight(foot);

        if (foot.y <= floorY) {
            if (!this.onGround && this.velocity.y < -6) {
                this.audio.playFootstep();
            }
            foot.y = floorY;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        const ceilY = this.getCeilingHeight(foot);
        if (foot.y + this.currentHeight >= ceilY) {
            foot.y = ceilY - this.currentHeight;
            if (this.velocity.y > 0) this.velocity.y = 0;
        }

        this.yawObject.position.x = foot.x;
        this.yawObject.position.y = foot.y + this.currentHeight;
        this.yawObject.position.z = foot.z;
    }

    checkHorizontalCollision(pos) {
        const r = this.radius;
        const minX = pos.x - r;
        const maxX = pos.x + r;
        const minY = pos.y + 0.1;
        const maxY = pos.y + this.currentHeight - 0.1;
        const minZ = pos.z - r;
        const maxZ = pos.z + r;

        for (let i = 0; i < this.map.colliders.length; i++) {
            const c = this.map.colliders[i];
            if (c.max.y <= 0.1) continue;
            // Ramps only allow walking on top if the player's feet are within step-up reach of the top surface
            if (c.isRamp && pos.y >= c.max.y - 0.5) continue;

            if (minX < c.max.x && maxX > c.min.x &&
                minY < c.max.y && maxY > c.min.y &&
                minZ < c.max.z && maxZ > c.min.z) {
                return true;
            }
        }
        return false;
    }

    getFloorHeight(pos) {
        let maxFloor = 0;
        const r = this.radius * 0.7;

        for (const c of this.map.colliders) {
            if (pos.x + r > c.min.x && pos.x - r < c.max.x &&
                pos.z + r > c.min.z && pos.z - r < c.max.z) {
                if (c.max.y <= pos.y + 1.05) {
                    if (c.max.y > maxFloor) {
                        maxFloor = c.max.y;
                    }
                }
            }
        }
        return maxFloor;
    }

    getCeilingHeight(pos) {
        let minCeil = 999;
        const r = this.radius * 0.7;

        for (const c of this.map.colliders) {
            if (pos.x + r > c.min.x && pos.x - r < c.max.x &&
                pos.z + r > c.min.z && pos.z - r < c.max.z) {
                if (c.min.y >= pos.y + this.currentHeight * 0.5) {
                    if (c.min.y < minCeil) {
                        minCeil = c.min.y;
                    }
                }
            }
        }
        return minCeil;
    }
}

window.PlayerController = PlayerController;
