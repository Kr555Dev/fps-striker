/**
 * FPS Striker Realistic Tactical Weapons System & 3D Viewmodels
 * Enhanced with:
 * - High-resolution generated textures for ALL 4 WEAPONS (AR, Sniper, SMG, Revolver)
 * - Mouse Wheel scroll weapon switching
 * - Multi-stage tactical reload animations with camera dips
 * - Ejected spinning brass cartridges
 */

// Module-level scratch objects to guarantee zero GC allocations in render/raycast loops
const _raycaster = new THREE.Raycaster();
const _screenCoords = new THREE.Vector2();
const _muzzleWorld = new THREE.Vector3();
const _tempVec = new THREE.Vector3();
const _wallNormal = new THREE.Vector3();
const _camWorld = new THREE.Vector3();
const _tempBotPos = new THREE.Vector3();
const _toBotVec = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _favouredHitPos = new THREE.Vector3();
const _losRaycaster = new THREE.Raycaster();

class WeaponSystem {
    constructor(camera, scene, player, audio, particles) {
        this.camera = camera;
        this.scene = scene;
        this.player = player;
        this.audio = audio;
        this.particles = particles;

        this.viewmodelRoot = new THREE.Object3D();
        this.camera.add(this.viewmodelRoot);

        // Weapon Definitions with CS2 Recoil, Burst Dynamics & Favoured Aim
        this.weapons = {
            ar: {
                id: 'ar',
                name: 'Assault Rifle',
                class: 'Commando',
                magSize: 30,
                maxReserve: 90,
                initialClip: 30,
                initialReserve: 90,
                fireRate: 110,
                auto: true,
                damage: 28,
                headshotMult: 1.90,
                recoilPitch: 0.038,
                recoilKick: 0.045,
                spread: 0.005,
                adsSpread: 0.002,
                adsFov: 55,
                hipPos: new THREE.Vector3(0.18, -0.18, -0.40),
                adsPos: new THREE.Vector3(0.0, -0.084, -0.34),
                reloadTime: 1.3,
                // Recoil & Burst Dynamics
                cameraKickPitch: 0.034,
                cameraKickYaw: 0.007,
                recoilRecoverySpeed: 18,
                burstBloomPerShot: 0.0022,
                maxBurstBloom: 0.026,
                burstResetWindow: 260,
                // Close-range Favoured Aim Envelope (3.5% tolerance up to 6.5m)
                favouredRange: 6.5,
                favouredTolerance: 0.035
            },
            sniper: {
                id: 'sniper',
                name: 'Sniper Rifle',
                class: 'Marksman',
                magSize: 3,
                maxReserve: 6,
                initialClip: 3,
                initialReserve: 6,
                fireRate: 850,
                auto: false,
                damage: 105,
                headshotMult: 1.80,
                recoilPitch: 0.12,
                recoilKick: 0.12,
                spread: 0.035,
                adsSpread: 0.0,
                adsFov: 20,
                hipPos: new THREE.Vector3(0.18, -0.18, -0.42),
                adsPos: new THREE.Vector3(0.0, -0.108, -0.28),
                reloadTime: 2.0,
                // Recoil & Optical Shudder
                cameraKickPitch: 0.082,
                cameraKickYaw: 0.004,
                recoilRecoverySpeed: 9,
                burstBloomPerShot: 0.0,
                maxBurstBloom: 0.0,
                burstResetWindow: 400,
                // Close-range Favoured Aim (DISABLED - 100% skill required)
                favouredRange: 0.0,
                favouredTolerance: 0.0
            },
            smg: {
                id: 'smg',
                name: 'SMG',
                class: 'Skirmisher',
                magSize: 34,
                maxReserve: 136,
                initialClip: 34,
                initialReserve: 136,
                fireRate: 72,
                auto: true,
                damage: 18,
                headshotMult: 1.4,
                recoilPitch: 0.028,
                recoilKick: 0.032,
                spread: 0.009,
                adsSpread: 0.004,
                adsFov: 60,
                hipPos: new THREE.Vector3(0.16, -0.17, -0.36),
                adsPos: new THREE.Vector3(0.0, -0.090, -0.34),
                reloadTime: 1.1,
                // Recoil & Burst Dynamics
                cameraKickPitch: 0.026,
                cameraKickYaw: 0.009,
                recoilRecoverySpeed: 24,
                burstBloomPerShot: 0.0018,
                maxBurstBloom: 0.032,
                burstResetWindow: 200,
                // Close-range Favoured Aim Envelope (5.0% tolerance up to 9.0m)
                favouredRange: 9.0,
                favouredTolerance: 0.050
            },
            revolver: {
                id: 'revolver',
                name: 'Revolver',
                class: 'Enforcer',
                magSize: 6,
                maxReserve: 12,
                initialClip: 6,
                initialReserve: 12,
                fireRate: 300,
                auto: false,
                damage: 68,
                headshotMult: 1.60,
                recoilPitch: 0.11,
                recoilKick: 0.085,
                spread: 0.003,
                adsSpread: 0.001,
                adsFov: 62,
                hipPos: new THREE.Vector3(0.15, -0.17, -0.34),
                adsPos: new THREE.Vector3(0.0, -0.073, -0.32),
                reloadTime: 1.6,
                // CS2 Deagle-style Snappy Recoil & Heavy Recovery
                cameraKickPitch: 0.058,
                cameraKickYaw: 0.010,
                recoilRecoverySpeed: 11,
                burstBloomPerShot: 0.035,
                maxBurstBloom: 0.055,
                burstResetWindow: 320,
                // Close-range Favoured Aim Envelope (2.5% tolerance up to 4.5m)
                favouredRange: 4.5,
                favouredTolerance: 0.025
            },
            shotgun: {
                id: 'shotgun',
                name: 'Double-Barrel Shotgun',
                class: 'Breacher',
                magSize: 2,
                maxReserve: 14,
                initialClip: 2,
                initialReserve: 14,
                fireRate: 350,
                auto: false,
                damage: 28,
                headshotMult: 1.5,
                recoilPitch: 0.16,
                recoilKick: 0.18,
                spread: 0.048,
                adsSpread: 0.024,
                adsFov: 65,
                hipPos: new THREE.Vector3(0.18, -0.19, -0.42),
                adsPos: new THREE.Vector3(0.09, -0.135, -0.36),
                reloadTime: 1.8,
                // Heavy Concussive Recoil
                cameraKickPitch: 0.088,
                cameraKickYaw: 0.012,
                recoilRecoverySpeed: 13,
                burstBloomPerShot: 0.0,
                maxBurstBloom: 0.0,
                burstResetWindow: 450,
                // Close-range Favoured Aim Envelope (7.0% tolerance up to 8.0m)
                favouredRange: 8.0,
                favouredTolerance: 0.070
            }
        };

        this.weaponKeys = ['ar', 'revolver', 'sniper', 'smg', 'shotgun'];
        this.currentWeaponIndex = 0;
        this.currentWeaponKey = 'ar';
        this.currentWeapon = this.weapons.ar;

        this.ammoState = {
            ar: { clip: 30, reserve: 90 },
            revolver: { clip: 6, reserve: 12 },
            sniper: { clip: 3, reserve: 6 },
            smg: { clip: 34, reserve: 136 },
            shotgun: { clip: 2, reserve: 14 }
        };

        // Recoil & Sway
        this.recoilSpring = new THREE.Vector3();
        this.recoilRot = new THREE.Vector3();
        this.cameraRecoil = { pitch: 0, yaw: 0 };
        this.burstCount = 0;
        this.lastBurstShotTime = 0;
        this.swayPos = new THREE.Vector3();
        this.targetSway = new THREE.Vector3();

        // Viewmodel Mesh References
        this.weaponMeshes = {};
        this.muzzleLight = null;
        this.muzzleFlashGroup = null;
        this.flashTimer = 0;
        this.casings = [];

        // Flags
        this.isAiming = false;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.lastShotTime = 0;
        this.isFiring = false;
        this.lastScrollTime = 0;

        this.buildAllViewmodels();
        this.switchWeapon('ar');
        this.initInput();
    }

    initInput() {
        window.addEventListener('mousedown', (e) => {
            if (!this.player.isLocked || this.player.isDead) return;
            if (e.button === 0) {
                this.isFiring = true;
                this.shoot();
            } else if (e.button === 2) {
                if (this.isReloading) return;
                this.isAiming = true;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isFiring = false;
            } else if (e.button === 2) {
                this.isAiming = false;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.player.isLocked || this.player.isDead) return;
            const factor = this.isAiming ? 0.0002 : 0.0005;
            this.targetSway.x = -e.movementX * factor;
            this.targetSway.y = e.movementY * factor;
        });

        // Mouse Wheel Scroll Weapon Switching
        window.addEventListener('wheel', (e) => {
            if (!this.player.isLocked || this.player.isDead) return;
            const now = performance.now();
            if (now - this.lastScrollTime < 180) return;
            this.lastScrollTime = now;

            if (e.deltaY > 0) {
                this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weaponKeys.length;
            } else {
                this.currentWeaponIndex = (this.currentWeaponIndex - 1 + this.weaponKeys.length) % this.weaponKeys.length;
            }
            this.switchWeapon(this.weaponKeys[this.currentWeaponIndex]);
        }, { passive: true });

        // Digit Keys
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Digit1') this.switchWeapon('ar');
            if (e.code === 'Digit2') this.switchWeapon('revolver');
            if (e.code === 'Digit3') this.switchWeapon('sniper');
            if (e.code === 'Digit4') this.switchWeapon('smg');
            if (e.code === 'Digit5') this.switchWeapon('shotgun');
        });
    }

    buildAllViewmodels() {
        const tex = window.textureGen;

        // Stylized materials matching tactical FPS aesthetic
        const akReceiverMat = new THREE.MeshLambertMaterial({
            map: tex.getAKReceiver ? tex.getAKReceiver() : null,
            color: 0x33373e
        });

        const woodMat = new THREE.MeshLambertMaterial({
            map: tex.getWoodTexture ? tex.getWoodTexture() : null,
            color: 0xc27a42
        });

        const sniperChassisMat = new THREE.MeshLambertMaterial({
            map: tex.getSniperChassis ? tex.getSniperChassis() : null,
            color: 0x3d463f
        });

        const smgReceiverMat = new THREE.MeshLambertMaterial({
            map: tex.getSMGReceiver ? tex.getSMGReceiver() : null,
            color: 0x2b3038
        });

        const revolverSteelMat = new THREE.MeshLambertMaterial({
            map: tex.getRevolverSteel ? tex.getRevolverSteel() : null,
            color: 0x8a929d
        });

        const darkSteelMat = new THREE.MeshLambertMaterial({ color: 0x1e2126 });
        const gunmetalMat = new THREE.MeshLambertMaterial({ color: 0x383e47 });
        const titaniumMat = new THREE.MeshStandardMaterial({ color: 0xc8d0db, metalness: 0.85, roughness: 0.2 });
        const chromeBoltMat = new THREE.MeshStandardMaterial({ color: 0xdde3eb, metalness: 0.92, roughness: 0.15 });
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.82, roughness: 0.25 });
        const walnutGripMat = new THREE.MeshLambertMaterial({ color: 0x482a17 });
        const rubberMat = new THREE.MeshLambertMaterial({ color: 0x121417 });
        const opticOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const redReticleMat = new THREE.MeshBasicMaterial({ color: 0xff1133 });
        const cyanTrimMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        const scopeLensMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff });
        const luminousPipMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
        const glassLensMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.35 });
        const tritiumGreenMat = new THREE.MeshBasicMaterial({ color: 0x33ff66 });
        const steelScrewMat = new THREE.MeshLambertMaterial({ color: 0x444b54 });

        // Player Character Arms Materials (Suit sleeve, white shirt cuff, skin hand)
        const suitMat = new THREE.MeshLambertMaterial({
            map: tex.getSuitFabric ? tex.getSuitFabric() : null,
            color: 0x24282e
        });
        const cuffMat = new THREE.MeshLambertMaterial({ color: 0xf0f0f5 });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xdfa07a });

        // Helper: Build Striker Stylized Voxel Arms
        // Redesigned as contiguous, unbroken volumetric limbs with zero visible gaps
        const buildStrikerArms = (type = 'ar') => {
            const armRoot = new THREE.Group();

            // Builder for a solid, contiguous voxel limb (Forearm Sleeve -> Cuff -> Wrist -> Hand)
            const createLimb = (shoulder, wrist, options = {}) => {
                const limbGroup = new THREE.Group();
                limbGroup.position.copy(shoulder);

                const delta = wrist.clone().sub(shoulder);
                const dist = delta.length();
                const forward = delta.clone().normalize();

                const upApprox = new THREE.Vector3(0, 1, 0);
                if (Math.abs(forward.dot(upApprox)) > 0.95) {
                    upApprox.set(0, 0, 1);
                }
                const right = new THREE.Vector3().crossVectors(forward, upApprox).normalize();
                const trueUp = new THREE.Vector3().crossVectors(right, forward).normalize();

                const basisMat = new THREE.Matrix4().makeBasis(right, trueUp, forward.clone().negate());
                limbGroup.quaternion.setFromRotationMatrix(basisMat);

                // 1. Forearm Sleeve (suitMat)
                // Extends from behind the screen (z = +0.28) to lead directly into the shirt cuff
                const backExt = 0.28;
                const sleeveTerminus = -(dist - 0.045);
                const sleeveLen = backExt + (dist - 0.045);
                const sleeveCenterZ = (backExt + sleeveTerminus) / 2;
                const sleeveW = options.sleeveW || 0.082;
                const sleeveH = options.sleeveH || 0.082;
                const sleeveMesh = new THREE.Mesh(new THREE.BoxGeometry(sleeveW, sleeveH, sleeveLen), suitMat);
                sleeveMesh.position.set(0, 0, sleeveCenterZ);
                limbGroup.add(sleeveMesh);

                // 2. White Shirt Cuff (cuffMat)
                // Wraps the sleeve terminus snugly with 0.010 dimensional overlap so no background leaks through
                const cuffLen = 0.040;
                const cuffCenterZ = -(dist - 0.035);
                const cuffW = options.cuffW || 0.086;
                const cuffH = options.cuffH || 0.086;
                const cuffMesh = new THREE.Mesh(new THREE.BoxGeometry(cuffW, cuffH, cuffLen), cuffMat);
                cuffMesh.position.set(0, 0, cuffCenterZ);
                limbGroup.add(cuffMesh);

                // 3. Skin Wrist (skinMat)
                // Emerges seamlessly from inside the cuff and leads directly into the hand palm with 0.020 overlap
                const wristLen = 0.050;
                const wristCenterZ = -(dist);
                const wristW = options.wristW || 0.072;
                const wristH = options.wristH || 0.072;
                const wristMesh = new THREE.Mesh(new THREE.BoxGeometry(wristW, wristH, wristLen), skinMat);
                wristMesh.position.set(0, 0, wristCenterZ);
                limbGroup.add(wristMesh);

                // 4. Hand Group
                // Anchored at z = -dist (the exact wrist terminus)
                const handGroup = new THREE.Group();
                handGroup.position.set(0, 0, -dist);
                limbGroup.add(handGroup);

                return { limbGroup, handGroup, dist };
            };

            // Weapon-specific limb configurations
            if (type === 'ar') {
                // --- AR: Commando AK-47 ---
                // Right Arm: holds pistol grip
                const rShoulder = new THREE.Vector3(0.14, -0.09, 0.20);
                const rWrist = new THREE.Vector3(0.035, -0.055, 0.04);
                const rightLimb = createLimb(rShoulder, rWrist);

                // Right Palm & Gripped Fingers wrapping pistol grip
                const rPalm = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.076, 0.065), skinMat);
                rPalm.position.set(0, 0, -0.015);
                rightLimb.handGroup.add(rPalm);

                const rFingers = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.065, 0.032), skinMat);
                rFingers.position.set(-0.018, -0.012, -0.042);
                rightLimb.handGroup.add(rFingers);

                const rThumb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.038), skinMat);
                rThumb.position.set(-0.028, 0.018, -0.015);
                rightLimb.handGroup.add(rThumb);

                const rTriggerFinger = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.042), skinMat);
                rTriggerFinger.position.set(-0.014, 0.015, -0.052);
                rightLimb.handGroup.add(rTriggerFinger);

                armRoot.add(rightLimb.limbGroup);

                // Left Arm: extends forward supporting wooden handguard underneath
                const lShoulder = new THREE.Vector3(-0.14, -0.18, 0.14);
                const lWrist = new THREE.Vector3(-0.015, -0.045, -0.22);
                const leftLimb = createLimb(lShoulder, lWrist);

                // Left Palm cupping bottom of wooden handguard
                const lPalm = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.045, 0.074), skinMat);
                lPalm.position.set(0, -0.005, -0.015);
                leftLimb.handGroup.add(lPalm);

                const lFingers = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.050, 0.070), skinMat);
                lFingers.position.set(0.034, 0.016, -0.015);
                leftLimb.handGroup.add(lFingers);

                const lThumb = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.028, 0.052), skinMat);
                lThumb.position.set(-0.032, 0.022, -0.015);
                leftLimb.handGroup.add(lThumb);

                armRoot.add(leftLimb.limbGroup);

            } else if (type === 'sniper') {
                // --- Sniper: Marksman Bolt-Action Rifle ---
                // Right Arm: holds angled rifle grip
                const rShoulder = new THREE.Vector3(0.14, -0.09, 0.20);
                const rWrist = new THREE.Vector3(0.035, -0.055, 0.06);
                const rightLimb = createLimb(rShoulder, rWrist);

                const rPalm = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.076, 0.065), skinMat);
                rPalm.position.set(0, 0, -0.015);
                rightLimb.handGroup.add(rPalm);

                const rFingers = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.065, 0.032), skinMat);
                rFingers.position.set(-0.018, -0.012, -0.042);
                rightLimb.handGroup.add(rFingers);

                const rThumb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.038), skinMat);
                rThumb.position.set(-0.028, 0.018, -0.015);
                rightLimb.handGroup.add(rThumb);

                const rTriggerFinger = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.042), skinMat);
                rTriggerFinger.position.set(-0.014, 0.015, -0.052);
                rightLimb.handGroup.add(rTriggerFinger);

                armRoot.add(rightLimb.limbGroup);

                // Left Arm: reaches forward supporting composite chassis under match barrel
                const lShoulder = new THREE.Vector3(-0.14, -0.18, 0.14);
                const lWrist = new THREE.Vector3(-0.015, -0.055, -0.26);
                const leftLimb = createLimb(lShoulder, lWrist);

                const lPalm = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.045, 0.078), skinMat);
                lPalm.position.set(0, -0.005, -0.015);
                leftLimb.handGroup.add(lPalm);

                const lFingers = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.052, 0.074), skinMat);
                lFingers.position.set(0.035, 0.018, -0.015);
                leftLimb.handGroup.add(lFingers);

                const lThumb = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.028, 0.055), skinMat);
                lThumb.position.set(-0.034, 0.024, -0.015);
                leftLimb.handGroup.add(lThumb);

                armRoot.add(leftLimb.limbGroup);

            } else if (type === 'smg') {
                // --- SMG: Skirmisher Submachine Gun ---
                // Right Arm: holds pistol grip
                const rShoulder = new THREE.Vector3(0.14, -0.09, 0.20);
                const rWrist = new THREE.Vector3(0.035, -0.065, 0.05);
                const rightLimb = createLimb(rShoulder, rWrist);

                const rPalm = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.076, 0.065), skinMat);
                rPalm.position.set(0, 0, -0.015);
                rightLimb.handGroup.add(rPalm);

                const rFingers = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.065, 0.032), skinMat);
                rFingers.position.set(-0.018, -0.012, -0.042);
                rightLimb.handGroup.add(rFingers);

                const rThumb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.038), skinMat);
                rThumb.position.set(-0.028, 0.018, -0.015);
                rightLimb.handGroup.add(rThumb);

                const rTriggerFinger = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.042), skinMat);
                rTriggerFinger.position.set(-0.014, 0.015, -0.052);
                rightLimb.handGroup.add(rTriggerFinger);

                armRoot.add(rightLimb.limbGroup);

                // Left Arm: wraps around vertical stubby foregrip
                const lShoulder = new THREE.Vector3(-0.14, -0.18, 0.14);
                const lWrist = new THREE.Vector3(-0.020, -0.075, -0.20);
                const leftLimb = createLimb(lShoulder, lWrist);

                const lPalm = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.072, 0.054), skinMat);
                lPalm.position.set(0, 0, -0.015);
                leftLimb.handGroup.add(lPalm);

                const lFingers = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.068, 0.032), skinMat);
                lFingers.position.set(0.018, 0, -0.042);
                leftLimb.handGroup.add(lFingers);

                const lThumb = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.026, 0.040), skinMat);
                lThumb.position.set(-0.024, 0.024, -0.018);
                leftLimb.handGroup.add(lThumb);

                armRoot.add(leftLimb.limbGroup);

            } else if (type === 'revolver') {
                // --- Revolver: Enforcer Magnum ---
                // Both hands locked in a solid two-handed combat grip
                // Right Arm: holds combat grip
                const rShoulder = new THREE.Vector3(0.12, -0.09, 0.20);
                const rWrist = new THREE.Vector3(0.035, -0.065, 0.04);
                const rightLimb = createLimb(rShoulder, rWrist);

                const rPalm = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.076, 0.065), skinMat);
                rPalm.position.set(0, 0, -0.015);
                rightLimb.handGroup.add(rPalm);

                const rFingers = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.065, 0.032), skinMat);
                rFingers.position.set(-0.018, -0.012, -0.042);
                rightLimb.handGroup.add(rFingers);

                const rThumb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.038), skinMat);
                rThumb.position.set(-0.028, 0.018, -0.015);
                rightLimb.handGroup.add(rThumb);

                const rTriggerFinger = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.042), skinMat);
                rTriggerFinger.position.set(-0.014, 0.015, -0.052);
                rightLimb.handGroup.add(rTriggerFinger);

                armRoot.add(rightLimb.limbGroup);

                // Left Arm: wraps firmly around right hand and grip
                const lShoulder = new THREE.Vector3(-0.09, -0.12, 0.20);
                const lWrist = new THREE.Vector3(0.015, -0.075, 0.035);
                const leftLimb = createLimb(lShoulder, lWrist);

                const lPalm = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.074, 0.065), skinMat);
                lPalm.position.set(0, 0, -0.015);
                leftLimb.handGroup.add(lPalm);

                const lFingers = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.070, 0.038), skinMat);
                lFingers.position.set(0.024, -0.005, -0.040);
                leftLimb.handGroup.add(lFingers);

                const lThumb = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.024, 0.045), skinMat);
                lThumb.position.set(-0.026, 0.020, -0.018);
                leftLimb.handGroup.add(lThumb);

                armRoot.add(leftLimb.limbGroup);

            } else if (type === 'shotgun') {
                // --- Shotgun: Breacher Double-Barrel Shotgun ---
                // Right Arm: Grips angled walnut stock / grip with trigger finger aligned
                const rShoulder = new THREE.Vector3(0.14, -0.09, 0.20);
                const rWrist = new THREE.Vector3(0.035, -0.055, 0.05);
                const rightLimb = createLimb(rShoulder, rWrist);

                const rPalm = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.076, 0.065), skinMat);
                rPalm.position.set(0, 0, -0.015);
                rightLimb.handGroup.add(rPalm);

                const rFingers = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.065, 0.032), skinMat);
                rFingers.position.set(-0.018, -0.012, -0.042);
                rightLimb.handGroup.add(rFingers);

                const rThumb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.038), skinMat);
                rThumb.position.set(-0.028, 0.018, -0.015);
                rightLimb.handGroup.add(rThumb);

                const rTriggerFinger = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.042), skinMat);
                rTriggerFinger.position.set(-0.014, 0.015, -0.052);
                rightLimb.handGroup.add(rTriggerFinger);

                armRoot.add(rightLimb.limbGroup);

                // Left Arm: Reaches forward underneath to firmly cup and support the tactical forend
                const lShoulder = new THREE.Vector3(-0.14, -0.18, 0.14);
                const lWrist = new THREE.Vector3(-0.012, -0.052, -0.18);
                const leftLimb = createLimb(lShoulder, lWrist);

                const lPalm = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.046, 0.078), skinMat);
                lPalm.position.set(0, -0.005, -0.015);
                leftLimb.handGroup.add(lPalm);

                const lFingers = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.052, 0.074), skinMat);
                lFingers.position.set(0.034, 0.016, -0.015);
                leftLimb.handGroup.add(lFingers);

                const lThumb = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.028, 0.055), skinMat);
                lThumb.position.set(-0.032, 0.022, -0.015);
                leftLimb.handGroup.add(lThumb);

                armRoot.add(leftLimb.limbGroup);
            }

            return armRoot;
        };

        // 1. Assault Rifle (Commando AK-47) - High-Fidelity Tactical Overhaul
        const arGroup = new THREE.Group();

        // --- Receiver Assembly ---
        // Stamped steel lower receiver chassis
        const arReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.076, 0.36), akReceiverMat);
        arReceiver.position.set(0, 0, 0);
        arGroup.add(arReceiver);

        // Flared magazine well housing underneath
        const arMagWell = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.032, 0.11), darkSteelMat);
        arMagWell.position.set(0, -0.046, -0.05);
        arGroup.add(arMagWell);

        // Receiver top ribbed dust cover (segmented curved profile with ribs)
        const dustCover = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.31, 12), gunmetalMat);
        dustCover.rotation.x = Math.PI / 2;
        dustCover.position.set(0, 0.042, 0.025);
        arGroup.add(dustCover);

        // Transverse strengthening ribs on dust cover
        for (let r = 0; r < 3; r++) {
            const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.0305, 0.0305, 0.012, 12), darkSteelMat);
            rib.rotation.x = Math.PI / 2;
            rib.position.set(0, 0.042, -0.05 + r * 0.08);
            arGroup.add(rib);
        }

        // Dust cover release latch at rear
        const dustCoverLatch = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.018), titaniumMat);
        dustCoverLatch.position.set(0, 0.038, 0.185);
        arGroup.add(dustCoverLatch);

        // Ejection port cutout & chrome bolt carrier (Right Side)
        const ejectionPort = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.030, 0.11), darkSteelMat);
        ejectionPort.position.set(0.026, 0.022, -0.02);
        arGroup.add(ejectionPort);

        const chromeBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 10), chromeBoltMat);
        chromeBolt.rotation.x = Math.PI / 2;
        chromeBolt.position.set(0.024, 0.022, -0.02);
        arGroup.add(chromeBolt);

        // Charging handle attached to bolt carrier
        const chargingStem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.038, 8), darkSteelMat);
        chargingStem.rotation.z = Math.PI / 2;
        chargingStem.position.set(0.044, 0.024, -0.02);
        arGroup.add(chargingStem);

        const chargingKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.016, 8), chromeBoltMat);
        chargingKnob.rotation.z = Math.PI / 2;
        chargingKnob.position.set(0.062, 0.024, -0.02);
        arGroup.add(chargingKnob);

        // Fire selector lever (Right Side)
        const selectorLever = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.072), darkSteelMat);
        selectorLever.position.set(0.031, 0.004, 0.06);
        selectorLever.rotation.x = -0.15;
        arGroup.add(selectorLever);

        // Receiver pins & rivets
        const pinL1 = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.064, 8), titaniumMat);
        pinL1.rotation.z = Math.PI / 2;
        pinL1.position.set(0, -0.012, 0.04);
        arGroup.add(pinL1);

        const pinL2 = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.064, 8), titaniumMat);
        pinL2.rotation.z = Math.PI / 2;
        pinL2.position.set(0, -0.012, 0.10);
        arGroup.add(pinL2);

        // --- Trigger Assembly ---
        const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.044, 0.068), darkSteelMat);
        triggerGuard.position.set(0, -0.052, 0.035);
        arGroup.add(triggerGuard);

        const arTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.012), titaniumMat);
        arTrigger.position.set(0, -0.044, 0.042);
        arTrigger.rotation.x = -0.22;
        arGroup.add(arTrigger);

        const magReleasePaddle = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.022, 0.010), darkSteelMat);
        magReleasePaddle.position.set(0, -0.045, 0.002);
        magReleasePaddle.rotation.x = 0.25;
        arGroup.add(magReleasePaddle);

        // --- Curved AK-47 Steel Banana Magazine ---
        const arMag = new THREE.Group();
        arMag.position.set(0, -0.055, -0.05);

        // Segment 1 (Top entering magwell)
        const magSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.060, 0.076), darkSteelMat);
        magSeg1.position.set(0, -0.025, 0);
        magSeg1.rotation.x = -0.16;
        arMag.add(magSeg1);

        // Segment 2 (Mid curve)
        const magSeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.070, 0.074), darkSteelMat);
        magSeg2.position.set(0, -0.075, -0.012);
        magSeg2.rotation.x = -0.32;
        arMag.add(magSeg2);

        // Segment 3 (Lower curve)
        const magSeg3 = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.070, 0.072), darkSteelMat);
        magSeg3.position.set(0, -0.125, -0.032);
        magSeg3.rotation.x = -0.46;
        arMag.add(magSeg3);

        // Flared steel floorplate / baseplate
        const arMagBase = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.012, 0.078), gunmetalMat);
        arMagBase.position.set(0, -0.158, -0.050);
        arMagBase.rotation.x = -0.46;
        arMag.add(arMagBase);

        // Embossed magazine reinforcement ribs
        for (let r = 0; r < 3; r++) {
            const rib = new THREE.Mesh(new THREE.BoxGeometry(0.037, 0.008, 0.070), gunmetalMat);
            rib.position.set(0, -0.055 - r * 0.035, -0.006 - r * 0.014);
            rib.rotation.x = -0.32;
            arMag.add(rib);
        }
        arGroup.add(arMag);

        // --- Contoured Wooden Furniture (Handguard & Stock) ---
        // Rear sight trunnion block
        const sightBlock = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.042, 0.06), gunmetalMat);
        sightBlock.position.set(0, 0.034, -0.185);
        arGroup.add(sightBlock);

        // Rear tangent elevation sight leaf
        const rearSightLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.010, 0.065), darkSteelMat);
        rearSightLeaf.position.set(0, 0.052, -0.185);
        rearSightLeaf.rotation.x = 0.06;
        arGroup.add(rearSightLeaf);

        // Lower wooden handguard with ergonomic palm swell
        const woodLowerHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.058, 0.22), woodMat);
        woodLowerHandguard.position.set(0, -0.008, -0.28);
        arGroup.add(woodLowerHandguard);

        // Handguard lower finger contour
        const handguardContour = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.016, 0.18), woodMat);
        handguardContour.position.set(0, -0.038, -0.28);
        arGroup.add(handguardContour);

        // Upper wooden handguard covering gas tube
        const woodUpperHandguard = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.19, 10), woodMat);
        woodUpperHandguard.rotation.x = Math.PI / 2;
        woodUpperHandguard.position.set(0, 0.036, -0.28);
        arGroup.add(woodUpperHandguard);

        // Steel handguard ferrule caps (front and rear)
        const handguardCapRear = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.066, 0.016), darkSteelMat);
        handguardCapRear.position.set(0, 0.005, -0.175);
        arGroup.add(handguardCapRear);

        const handguardCapFront = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.062, 0.016), darkSteelMat);
        handguardCapFront.position.set(0, 0.005, -0.385);
        arGroup.add(handguardCapFront);

        // --- Gas System, Barrel & Cleaning Rod ---
        // Gas block (45-degree angled AK gas port)
        const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.050, 0.042), darkSteelMat);
        gasBlock.position.set(0, 0.028, -0.42);
        arGroup.add(gasBlock);

        // Machined steel barrel
        const arBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.013, 0.26, 10), darkSteelMat);
        arBarrel.rotation.x = Math.PI / 2;
        arBarrel.position.set(0, 0.012, -0.49);
        arGroup.add(arBarrel);

        // Slim under-barrel cleaning rod
        const cleaningRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.32, 6), titaniumMat);
        cleaningRod.rotation.x = Math.PI / 2;
        cleaningRod.position.set(0, -0.012, -0.41);
        arGroup.add(cleaningRod);

        // Authentic AK Hooded Front Sight Tower & High-Visibility Luminous Front Sight Pip
        const frontSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.052, 0.028), darkSteelMat);
        frontSightBase.position.set(0, 0.046, -0.57);
        arGroup.add(frontSightBase);

        // Protective Hooded Wings / Ears
        const leftEar = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.024, 0.020), darkSteelMat);
        leftEar.position.set(-0.011, 0.076, -0.57);
        arGroup.add(leftEar);

        const rightEar = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.024, 0.020), darkSteelMat);
        rightEar.position.set(0.011, 0.076, -0.57);
        arGroup.add(rightEar);

        // Central Sight Post Pin
        const frontSightPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.010), darkSteelMat);
        frontSightPost.position.set(0, 0.076, -0.57);
        arGroup.add(frontSightPost);

        // High-Visibility Luminous Front Sight Pip / Dot (luminous fluorescent green)
        const frontSightPip = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.012), luminousPipMat);
        frontSightPip.position.set(0, 0.084, -0.57);
        arGroup.add(frontSightPip);

        // Slanted AK Muzzle Compensator
        const muzzleComp = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.050, 10), darkSteelMat);
        muzzleComp.rotation.x = Math.PI / 2;
        muzzleComp.position.set(0, 0.012, -0.63);
        arGroup.add(muzzleComp);

        const compSlant = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.014, 0.024), gunmetalMat);
        compSlant.position.set(0, 0.018, -0.64);
        compSlant.rotation.x = 0.45;
        arGroup.add(compSlant);

        // --- Wooden Stock Assembly ---
        const arStockGroup = new THREE.Group();
        arStockGroup.position.set(0, 0, 0.18);

        // Main stock body with comb taper
        const stockBody = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.090, 0.24), woodMat);
        stockBody.position.set(0, -0.018, 0.12);
        stockBody.rotation.x = 0.08;
        arStockGroup.add(stockBody);

        // Raised cheek comb
        const stockComb = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.024, 0.16), woodMat);
        stockComb.position.set(0, 0.032, 0.11);
        arStockGroup.add(stockComb);

        // Steel buttplate with screws
        const arButtplate = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.105, 0.018), darkSteelMat);
        arButtplate.position.set(0, -0.024, 0.245);
        arStockGroup.add(arButtplate);

        // Sling swivel loop on stock
        const slingLoop = new THREE.Mesh(new THREE.TorusGeometry(0.010, 0.003, 6, 12), titaniumMat);
        slingLoop.rotation.y = Math.PI / 2;
        slingLoop.position.set(-0.027, -0.038, 0.18);
        arStockGroup.add(slingLoop);

        arGroup.add(arStockGroup);

        // --- Contoured Wooden Pistol Grip ---
        const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.115, 0.058), woodMat);
        pistolGrip.position.set(0, -0.088, 0.065);
        pistolGrip.rotation.x = -0.35;
        arGroup.add(pistolGrip);

        const gripCap = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.012, 0.062), darkSteelMat);
        gripCap.position.set(0, -0.140, 0.085);
        gripCap.rotation.x = -0.35;
        arGroup.add(gripCap);



        // Add Striker Character Arms
        arGroup.add(buildStrikerArms('ar'));
        this.viewmodelRoot.add(arGroup);
        this.weaponMeshes.ar = { root: arGroup, mag: arMag, muzzlePos: new THREE.Vector3(0, 0.012, -0.66) };

        // 2. Sniper Rifle (Marksman) - Precision Tactical Chassis Overhaul
        const sniperGroup = new THREE.Group();

        // --- Tactical Composite Chassis (Sleek AWM / M200 Profile) ---
        // Main receiver bedding block & forend
        const snChassis = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.068, 0.58), sniperChassisMat);
        snChassis.position.set(0, -0.010, -0.06);
        sniperGroup.add(snChassis);

        // M-LOK side ventilation slots along the forend
        for (let s = 0; s < 4; s++) {
            const slotL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.048), darkSteelMat);
            slotL.position.set(-0.0295, -0.008, -0.16 - s * 0.065);
            sniperGroup.add(slotL);

            const slotR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.048), darkSteelMat);
            slotR.position.set(0.0295, -0.008, -0.16 - s * 0.065);
            sniperGroup.add(slotR);
        }

        // --- Iconic Skeletonized Thumbhole Sniper Stock ---
        // Upper stock spine leading to cheek rest
        const stockSpine = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.042, 0.28), sniperChassisMat);
        stockSpine.position.set(0, 0.018, 0.35);
        sniperGroup.add(stockSpine);

        // Lower strut connecting pistol grip to rear butt (creating authentic negative space thumbhole!)
        const stockStrut = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.032, 0.26), sniperChassisMat);
        stockStrut.position.set(0, -0.076, 0.33);
        stockStrut.rotation.x = -0.15;
        sniperGroup.add(stockStrut);

        // Rear vertical butt frame uniting spine and strut
        const buttFrame = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.118, 0.06), sniperChassisMat);
        buttFrame.position.set(0, -0.015, 0.49);
        sniperGroup.add(buttFrame);

        // Bottom monopod rail on underside of butt
        const monoRail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.12), darkSteelMat);
        monoRail.position.set(0, -0.078, 0.44);
        sniperGroup.add(monoRail);

        // Adjustable Raised Sniper Cheek Rest Comb
        const cheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.034, 0.16), sniperChassisMat);
        cheekRest.position.set(0, 0.054, 0.35);
        sniperGroup.add(cheekRest);

        // Dual Knurled Cheekpiece Height Adjustment Thumbwheels
        const thumbWheel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.054, 12), titaniumMat);
        thumbWheel1.rotation.z = Math.PI / 2;
        thumbWheel1.position.set(0, 0.040, 0.30);
        sniperGroup.add(thumbWheel1);

        const thumbWheel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.054, 12), titaniumMat);
        thumbWheel2.rotation.z = Math.PI / 2;
        thumbWheel2.position.set(0, 0.040, 0.40);
        sniperGroup.add(thumbWheel2);

        // Multi-segment Ribbed Rubber Buttpad with White Accent Spacer
        const snSpacer = new THREE.Mesh(new THREE.BoxGeometry(0.053, 0.122, 0.008), cuffMat);
        snSpacer.position.set(0, -0.015, 0.524);
        sniperGroup.add(snSpacer);

        const snButtpad = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.128, 0.034), rubberMat);
        snButtpad.position.set(0, -0.015, 0.545);
        sniperGroup.add(snButtpad);

        // Match Vertical Pistol Grip
        const snGrip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.122, 0.062), sniperChassisMat);
        snGrip.position.set(0, -0.082, 0.13);
        snGrip.rotation.x = -0.32;
        sniperGroup.add(snGrip);

        const gripPalmShelf = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.016, 0.072), darkSteelMat);
        gripPalmShelf.position.set(0, -0.138, 0.15);
        sniperGroup.add(gripPalmShelf);

        // Winter Trigger Guard & Flat Match Trigger
        const snTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.048, 0.076), darkSteelMat);
        snTriggerGuard.position.set(0, -0.052, 0.05);
        sniperGroup.add(snTriggerGuard);

        const snTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.012), titaniumMat);
        snTrigger.position.set(0, -0.044, 0.055);
        snTrigger.rotation.x = -0.12;
        sniperGroup.add(snTrigger);

        // Detachable 5-Round Box Magazine with Stamped Ribs
        const snMag = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.095, 0.082), darkSteelMat);
        snMag.position.set(0, -0.078, -0.06);
        sniperGroup.add(snMag);

        const snMagBase = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.014, 0.088), rubberMat);
        snMagBase.position.set(0, -0.128, -0.06);
        sniperGroup.add(snMagBase);

        // --- Action Receiver & Chrome Fluted Bolt Carrier ---
        const snReceiver = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.36, 14), darkSteelMat);
        snReceiver.rotation.x = Math.PI / 2;
        snReceiver.position.set(0, 0.032, 0.02);
        sniperGroup.add(snReceiver);

        // Ejection Port Cutout
        const snEjectionCut = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.034, 0.12), gunmetalMat);
        snEjectionCut.position.set(0.024, 0.034, 0.04);
        sniperGroup.add(snEjectionCut);

        // Chrome Fluted Bolt Body
        const snChromeBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.30, 12), chromeBoltMat);
        snChromeBolt.rotation.x = Math.PI / 2;
        snChromeBolt.position.set(0, 0.032, 0.02);
        sniperGroup.add(snChromeBolt);

        // Swept-back Bolt Handle with Knurled Ball Knob
        const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.065, 8), chromeBoltMat);
        boltStem.position.set(0.044, 0.014, 0.12);
        boltStem.rotation.z = -0.72;
        sniperGroup.add(boltStem);

        const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), chromeBoltMat);
        boltKnob.position.set(0.082, -0.002, 0.12);
        sniperGroup.add(boltKnob);

        // Rear Cocking Indicator Shroud
        const cockingShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.038, 10), darkSteelMat);
        cockingShroud.rotation.x = Math.PI / 2;
        cockingShroud.position.set(0, 0.032, 0.20);
        sniperGroup.add(cockingShroud);

        // --- Heavy Match Bull Barrel with Recessed Flutes ---
        const barrelShank = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.023, 0.14, 12), darkSteelMat);
        barrelShank.rotation.x = Math.PI / 2;
        barrelShank.position.set(0, 0.032, -0.23);
        sniperGroup.add(barrelShank);

        const snBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.017, 0.58, 12), gunmetalMat);
        snBarrel.rotation.x = Math.PI / 2;
        snBarrel.position.set(0, 0.032, -0.58);
        sniperGroup.add(snBarrel);

        // Longitudinal Barrel Fluting (6 deep flutes)
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.46, 6), darkSteelMat);
            flute.rotation.x = Math.PI / 2;
            flute.position.set(Math.cos(angle) * 0.017, 0.032 + Math.sin(angle) * 0.017, -0.58);
            sniperGroup.add(flute);
        }

        // Heavy Tactical Dual-Baffle Muzzle Brake
        const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.038, 0.095), darkSteelMat);
        muzzleBrake.position.set(0, 0.032, -0.91);
        sniperGroup.add(muzzleBrake);

        // Lateral gas ports
        const portL1 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.016, 0.024), rubberMat);
        portL1.position.set(0, 0.032, -0.89);
        sniperGroup.add(portL1);

        const portL2 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.016, 0.024), rubberMat);
        portL2.position.set(0, 0.032, -0.93);
        sniperGroup.add(portL2);

        // --- Folded Tactical Bipod Assembly ---
        const bipodBlock = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.030, 0.052), darkSteelMat);
        bipodBlock.position.set(0, -0.044, -0.32);
        sniperGroup.add(bipodBlock);

        // Telescoping Legs with Knurled Collars & Rubber Feet
        for (let side of [-1, 1]) {
            const legUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), darkSteelMat);
            legUpper.rotation.x = Math.PI / 2;
            legUpper.position.set(side * 0.026, -0.044, -0.22);
            sniperGroup.add(legUpper);

            const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.018, 8), titaniumMat);
            collar.rotation.x = Math.PI / 2;
            collar.position.set(side * 0.026, -0.044, -0.14);
            sniperGroup.add(collar);

            const legLower = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 8), titaniumMat);
            legLower.rotation.x = Math.PI / 2;
            legLower.position.set(side * 0.026, -0.044, -0.07);
            sniperGroup.add(legLower);

            const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.026, 8), rubberMat);
            foot.rotation.x = Math.PI / 2;
            foot.position.set(side * 0.026, -0.044, 0.01);
            sniperGroup.add(foot);
        }

        // --- High-Power Telescopic Tactical Scope & Cantilever Mount ---
        const scopeRoot = new THREE.Group();
        scopeRoot.position.set(0, 0.108, 0.02);

        // Picatinny Base Rail
        const scopeRail = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.014, 0.34), darkSteelMat);
        scopeRail.position.set(0, -0.042, 0);
        scopeRoot.add(scopeRail);

        // Heavy Skeletonized Dual Ring Cantilever Mount with Cross-bolts
        const ringRear = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.048, 0.032), gunmetalMat);
        ringRear.position.set(0, -0.014, 0.08);
        scopeRoot.add(ringRear);

        const boltRear = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.052, 6), titaniumMat);
        boltRear.rotation.z = Math.PI / 2;
        boltRear.position.set(0, -0.026, 0.08);
        scopeRoot.add(boltRear);

        const ringFront = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.048, 0.032), gunmetalMat);
        ringFront.position.set(0, -0.014, -0.08);
        scopeRoot.add(ringFront);

        const boltFront = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.052, 6), titaniumMat);
        boltFront.rotation.z = Math.PI / 2;
        boltFront.position.set(0, -0.026, -0.08);
        scopeRoot.add(boltFront);

        // 34mm Main Tube
        const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.32, 16), darkSteelMat);
        scopeTube.rotation.x = Math.PI / 2;
        scopeRoot.add(scopeTube);

        // Rear Ocular Bell & Ribbed Rubber Eye Cup
        const ocularBell = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.09, 16), darkSteelMat);
        ocularBell.rotation.x = Math.PI / 2;
        ocularBell.position.set(0, 0, 0.185);
        scopeRoot.add(ocularBell);

        const eyeCup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.026, 16), rubberMat);
        eyeCup.rotation.x = Math.PI / 2;
        eyeCup.position.set(0, 0, 0.235);
        scopeRoot.add(eyeCup);

        // Forward Flared Objective Bell & Sunshade
        const objectiveBell = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.026, 0.13, 16), darkSteelMat);
        objectiveBell.rotation.x = Math.PI / 2;
        objectiveBell.position.set(0, 0, -0.19);
        scopeRoot.add(objectiveBell);

        const sunshade = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.065, 16), darkSteelMat);
        sunshade.rotation.x = Math.PI / 2;
        sunshade.position.set(0, 0, -0.27);
        scopeRoot.add(sunshade);

        // Luminous Anti-Reflective Front Lens
        const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.040, 16), scopeLensMat);
        frontLens.position.set(0, 0, -0.268);
        frontLens.rotation.y = Math.PI;
        scopeRoot.add(frontLens);

        // Tactical Target Turrets (Elevation, Windage, Parallax) with Brass Index Rings
        const elevTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 12), darkSteelMat);
        elevTurret.position.set(0, 0.028, 0);
        scopeRoot.add(elevTurret);
        const elevRing = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.008, 12), brassMat);
        elevRing.position.set(0, 0.022, 0);
        scopeRoot.add(elevRing);

        const windTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 12), darkSteelMat);
        windTurret.rotation.z = Math.PI / 2;
        windTurret.position.set(0, 0.028, 0);
        scopeRoot.add(windTurret);
        const windRing = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.008, 12), brassMat);
        windRing.rotation.z = Math.PI / 2;
        windRing.position.set(0, 0.022, 0);
        scopeRoot.add(windRing);

        const paraTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 12), darkSteelMat);
        paraTurret.rotation.z = -Math.PI / 2;
        paraTurret.position.set(-0.028, 0, 0);
        scopeRoot.add(paraTurret);

        sniperGroup.add(scopeRoot);

        // Character Arms
        sniperGroup.add(buildStrikerArms('sniper'));
        this.viewmodelRoot.add(sniperGroup);
        this.weaponMeshes.sniper = { root: sniperGroup, mag: snMag, muzzlePos: new THREE.Vector3(0, 0.032, -0.96) };

        // 3. SMG (Skirmisher) - HK MP5 / UMP Tactical Submachine Gun Overhaul
        const smgGroup = new THREE.Group();

        // --- Upper Stamped Receiver & Cocking Tube ---
        const smgReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.082, 0.34), smgReceiverMat);
        smgReceiver.position.set(0, 0, 0);
        smgGroup.add(smgReceiver);

        // Cylindrical Top Cocking Tube
        const cockingTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 12), darkSteelMat);
        cockingTube.rotation.x = Math.PI / 2;
        cockingTube.position.set(0, 0.046, -0.04);
        smgGroup.add(cockingTube);

        // Iconic HK Cocking Notch & Charging Handle locked in rear detent
        const cockingDetent = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.040), gunmetalMat);
        cockingDetent.position.set(-0.022, 0.054, -0.16);
        smgGroup.add(cockingDetent);

        const cockingHandleStem = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.034, 0.020), darkSteelMat);
        cockingHandleStem.position.set(-0.032, 0.062, -0.16);
        cockingHandleStem.rotation.z = 0.52;
        smgGroup.add(cockingHandleStem);

        const cockingKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.022, 8), rubberMat);
        cockingKnob.rotation.z = Math.PI / 2;
        cockingKnob.position.set(-0.046, 0.076, -0.16);
        smgGroup.add(cockingKnob);

        // Recessed Ejection Port on Right Side with Brass Cartridge
        const smgEjectionPort = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.032, 0.11), darkSteelMat);
        smgEjectionPort.position.set(0.028, 0.014, -0.02);
        smgGroup.add(smgEjectionPort);

        const smgChamberBrass = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.048, 8), brassMat);
        smgChamberBrass.rotation.x = Math.PI / 2;
        smgChamberBrass.position.set(0.024, 0.014, -0.02);
        smgGroup.add(smgChamberBrass);

        // --- Polymer Lower Receiver & Fire Selector ---
        const smgLower = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.064, 0.22), rubberMat);
        smgLower.position.set(0, -0.052, 0.04);
        smgGroup.add(smgLower);

        // Molded Pistol Grip with Palm Swell
        const smgPistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.124, 0.065), rubberMat);
        smgPistolGrip.position.set(0, -0.116, 0.088);
        smgPistolGrip.rotation.x = -0.32;
        smgGroup.add(smgPistolGrip);

        const smgGripCap = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.014, 0.068), darkSteelMat);
        smgGripCap.position.set(0, -0.170, 0.108);
        smgGripCap.rotation.x = -0.32;
        smgGroup.add(smgGripCap);

        // Enlarged Trigger Guard & Polished Trigger
        const smgTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.046, 0.066), darkSteelMat);
        smgTriggerGuard.position.set(0, -0.078, 0.048);
        smgGroup.add(smgTriggerGuard);

        const smgTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.012), titaniumMat);
        smgTrigger.position.set(0, -0.068, 0.052);
        smgTrigger.rotation.x = -0.22;
        smgGroup.add(smgTrigger);

        // Fire Selector Switch with Markings
        const selectorSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.012, 0.026), darkSteelMat);
        selectorSwitch.position.set(0, -0.038, 0.07);
        selectorSwitch.rotation.z = -0.28;
        smgGroup.add(selectorSwitch);

        // --- Curved 30-Round 9mm Banana Magazine ---
        const smgMagWell = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.048, 0.084), darkSteelMat);
        smgMagWell.position.set(0, -0.048, -0.06);
        smgGroup.add(smgMagWell);

        const smgMagRelease = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.024, 0.012), titaniumMat);
        smgMagRelease.position.set(0, -0.052, -0.015);
        smgGroup.add(smgMagRelease);

        const smgMag = new THREE.Group();
        smgMag.position.set(0, -0.06, -0.06);

        // Curved Mag Segment 1
        const smgMagSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.10, 0.064), darkSteelMat);
        smgMagSeg1.position.set(0, -0.04, 0.008);
        smgMagSeg1.rotation.x = -0.16;
        smgMag.add(smgMagSeg1);

        // Curved Mag Segment 2
        const smgMagSeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.033, 0.10, 0.062), darkSteelMat);
        smgMagSeg2.position.set(0, -0.125, -0.012);
        smgMagSeg2.rotation.x = -0.28;
        smgMag.add(smgMagSeg2);

        // Magazine Bumper Baseplate with Grip Ribs
        const smgMagBumper = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.018, 0.070), rubberMat);
        smgMagBumper.position.set(0, -0.174, -0.026);
        smgMagBumper.rotation.x = -0.28;
        smgMag.add(smgMagBumper);

        // 3 Round Witness Holes (brass accents)
        for (let h = 0; h < 3; h++) {
            const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.035, 6), brassMat);
            hole.rotation.z = Math.PI / 2;
            hole.position.set(0, -0.05 - h * 0.035, 0.026 - h * 0.008);
            smgMag.add(hole);
        }
        smgGroup.add(smgMag);

        // --- Tactical Vented Handguard & Stubby CQB Foregrip ---
        const smgHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.074, 0.22), rubberMat);
        smgHandguard.position.set(0, 0.006, -0.22);
        smgGroup.add(smgHandguard);

        // Lateral Heat Ventilation Slots
        for (let i = 0; i < 3; i++) {
            const zSlot = -0.16 - i * 0.048;
            const ventL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.028), darkSteelMat);
            ventL.position.set(-0.030, 0.012, zSlot);
            smgGroup.add(ventL);
            const ventR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.028), darkSteelMat);
            ventR.position.set(0.030, 0.012, zSlot);
            smgGroup.add(ventR);
        }

        // Lower Picatinny Accessory Rail
        const smgRail = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.012, 0.18), darkSteelMat);
        smgRail.position.set(0, -0.036, -0.22);
        smgGroup.add(smgRail);

        // Ergonomic Stubby CQB Foregrip
        const smgForegrip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.092, 0.044), rubberMat);
        smgForegrip.position.set(0, -0.086, -0.22);
        smgGroup.add(smgForegrip);

        const foregripStop = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.014, 0.052), darkSteelMat);
        foregripStop.position.set(0, -0.134, -0.22);
        smgGroup.add(foregripStop);

        // --- Barrel, 3-Lug Collar & Birdcage Flash Hider ---
        const smgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 10), darkSteelMat);
        smgBarrel.rotation.x = Math.PI / 2;
        smgBarrel.position.set(0, 0.012, -0.38);
        smgGroup.add(smgBarrel);

        // HK 3-Lug Collar
        const triLug = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.035, 10), gunmetalMat);
        triLug.rotation.x = Math.PI / 2;
        triLug.position.set(0, 0.012, -0.44);
        smgGroup.add(triLug);

        // Slotted Birdcage Flash Hider
        const smgFlashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.055, 12), darkSteelMat);
        smgFlashHider.rotation.x = Math.PI / 2;
        smgFlashHider.position.set(0, 0.012, -0.49);
        smgGroup.add(smgFlashHider);

        // Flash Hider Muzzle Recess
        const muzzleBore = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.02, 10), rubberMat);
        muzzleBore.rotation.x = Math.PI / 2;
        muzzleBore.position.set(0, 0.012, -0.52);
        smgGroup.add(muzzleBore);

        // --- Tactical Top Optic Rail & CQB Reflex Holographic Sight ---
        // Raised top Picatinny rail
        const smgTopRail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.16), darkSteelMat);
        smgTopRail.position.set(0, 0.058, -0.02);
        smgGroup.add(smgTopRail);

        // Tactical Reflex Optic Base Mount
        const smgOpticBase = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.014, 0.072), gunmetalMat);
        smgOpticBase.position.set(0, 0.069, -0.02);
        smgGroup.add(smgOpticBase);

        // Hooded Reflex Sight Frame (protective hood with open center window)
        // Left upright post
        const reflexPostL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.038, 0.022), darkSteelMat);
        reflexPostL.position.set(-0.018, 0.090, -0.02);
        smgGroup.add(reflexPostL);

        // Right upright post
        const reflexPostR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.038, 0.022), darkSteelMat);
        reflexPostR.position.set(0.018, 0.090, -0.02);
        smgGroup.add(reflexPostR);

        // Top bridging crossbar
        const reflexPostTop = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.006, 0.022), darkSteelMat);
        reflexPostTop.position.set(0, 0.109, -0.02);
        smgGroup.add(reflexPostTop);

        // Transparent Glass Lens inside reflex window
        const reflexLens = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.032, 0.004), glassLensMat);
        reflexLens.position.set(0, 0.090, -0.02);
        smgGroup.add(reflexLens);

        // Luminous Fluorescent Green Reticle Dot
        const reflexDot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.006), luminousPipMat);
        reflexDot.position.set(0, 0.090, -0.02);
        smgGroup.add(reflexDot);

        // Front Cowitness Sight Post
        const smgFrontBase = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.036, 0.024), darkSteelMat);
        smgFrontBase.position.set(0, 0.062, -0.38);
        smgGroup.add(smgFrontBase);

        const smgFrontPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.004), cyanTrimMat);
        smgFrontPost.position.set(0, 0.086, -0.38);
        smgGroup.add(smgFrontPost);

        // --- Retractable Tactical PDW Wire Stock ---
        const strutL = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.26, 8), darkSteelMat);
        strutL.rotation.x = Math.PI / 2;
        strutL.position.set(-0.033, 0.01, 0.11);
        smgGroup.add(strutL);

        const strutR = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.26, 8), darkSteelMat);
        strutR.rotation.x = Math.PI / 2;
        strutR.position.set(0.033, 0.01, 0.11);
        smgGroup.add(strutR);

        const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.096, 0.024), rubberMat);
        buttPad.position.set(0, 0.01, 0.24);
        smgGroup.add(buttPad);

        // Character Arms
        smgGroup.add(buildStrikerArms('smg'));
        this.viewmodelRoot.add(smgGroup);
        this.weaponMeshes.smg = { root: smgGroup, mag: smgMag, muzzlePos: new THREE.Vector3(0, 0.012, -0.53) };

        // 4. Tactical Magnum Revolver (Enforcer) - Heavy Hand Cannon Overhaul
        const revGroup = new THREE.Group();

        // --- Solid Magnum Steel Frame with Brushed Sheen & Contours ---
        // Narrower frame (0.038 width) with dark steel bevelled side plates & recoil shield
        const revFrame = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.078, 0.24), darkSteelMat);
        revGroup.add(revFrame);

        const revSideL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.070, 0.22), revolverSteelMat);
        revSideL.position.set(-0.019, -0.002, 0);
        revGroup.add(revSideL);

        const revSideR = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.070, 0.22), revolverSteelMat);
        revSideR.position.set(0.019, -0.002, 0);
        revGroup.add(revSideR);

        // Top strap sight channel with anti-glare serrations
        const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.018, 0.22), darkSteelMat);
        topStrap.position.set(0, 0.046, -0.01);
        revGroup.add(topStrap);

        // Cylinder Latch Slide Button (Left Side)
        const cylLatch = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.028), titaniumMat);
        cylLatch.position.set(-0.028, 0.022, 0.06);
        revGroup.add(cylLatch);

        // Crane / Yoke Assembly
        const cylinderCrane = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.034, 0.054), darkSteelMat);
        cylinderCrane.position.set(0, -0.024, -0.04);
        revGroup.add(cylinderCrane);

        // Micro-adjustable Elevated Rear Target Sight Notch (Clean U-notch outline)
        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.018, 0.024), darkSteelMat);
        rearSight.position.set(0, 0.060, 0.09);
        revGroup.add(rearSight);

        const rearSightPostL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.022), darkSteelMat);
        rearSightPostL.position.set(-0.010, 0.073, 0.09);
        revGroup.add(rearSightPostL);

        const rearSightPostR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.022), darkSteelMat);
        rearSightPostR.position.set(0.010, 0.073, 0.09);
        revGroup.add(rearSightPostR);

        // White rear notch highlight lines
        const rearDotL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.004), cuffMat);
        rearDotL.position.set(-0.009, 0.072, 0.102);
        revGroup.add(rearDotL);

        const rearDotR = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.004), cuffMat);
        rearDotR.position.set(0.009, 0.072, 0.102);
        revGroup.add(rearDotR);

        // --- 6-Chamber Fluted Titanium Cylinder ---
        const revCylinderGroup = new THREE.Group();
        revCylinderGroup.position.set(0, 0.006, -0.015);

        const revCylinderBody = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.116, 16), titaniumMat);
        revCylinderBody.rotation.x = Math.PI / 2;
        revCylinderGroup.add(revCylinderBody);

        // Center Ratchet Ejector Star
        const centerEjector = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.124, 10), chromeBoltMat);
        centerEjector.rotation.x = Math.PI / 2;
        revCylinderGroup.add(centerEjector);

        // 6 fluted scallops & gold brass cartridge rims
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const xPos = Math.cos(angle) * 0.026;
            const yPos = Math.sin(angle) * 0.026;

            // Fluted scallop groove
            const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.118, 8), darkSteelMat);
            flute.rotation.x = Math.PI / 2;
            flute.position.set(xPos, yPos, 0);
            revCylinderGroup.add(flute);

            // Brass cartridge rim
            const brassCase = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.014, 10), brassMat);
            brassCase.rotation.x = Math.PI / 2;
            brassCase.position.set(xPos, yPos, 0.058);
            revCylinderGroup.add(brassCase);

            // Nickel center primer
            const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.016, 8), chromeBoltMat);
            primer.rotation.x = Math.PI / 2;
            primer.position.set(xPos, yPos, 0.059);
            revCylinderGroup.add(primer);
        }
        revGroup.add(revCylinderGroup);

        // --- Slab-Sided Bull Barrel with Ventilated Rib ---
        // Slab-sided barrel core
        const revBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.054, 0.30), revolverSteelMat);
        revBarrel.position.set(0, 0.016, -0.24);
        revGroup.add(revBarrel);

        // Full-length underlug shroud enclosing ejector rod
        const revUnderlug = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.032, 0.28), revolverSteelMat);
        revUnderlug.position.set(0, -0.022, -0.23);
        revGroup.add(revUnderlug);

        // Knurled ejector rod tip
        const ejectorRod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.12, 8), darkSteelMat);
        ejectorRod.rotation.x = Math.PI / 2;
        ejectorRod.position.set(0, -0.016, -0.14);
        revGroup.add(ejectorRod);

        // Recessed target muzzle crown
        const revMuzzleBore = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10), rubberMat);
        revMuzzleBore.rotation.x = Math.PI / 2;
        revMuzzleBore.position.set(0, 0.018, -0.392);
        revGroup.add(revMuzzleBore);

        // Ventilated Top Barrel Rib with 3 Open Cooling Slots
        const revRib = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.016, 0.28), darkSteelMat);
        revRib.position.set(0, 0.048, -0.23);
        revGroup.add(revRib);

        for (let s = 0; s < 3; s++) {
            const ribSlot = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.044), gunmetalMat);
            ribSlot.position.set(0, 0.046, -0.15 - s * 0.08);
            revGroup.add(ribSlot);
        }

        // High-Visibility Fluorescent Orange Fiber-Optic Front Sight
        const frontSightRamp = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.034, 0.048), darkSteelMat);
        frontSightRamp.position.set(0, 0.060, -0.36);
        revGroup.add(frontSightRamp);

        const frontBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.036, 8), opticOrangeMat);
        frontBlade.rotation.x = Math.PI / 2;
        frontBlade.position.set(0, 0.073, -0.365);
        revGroup.add(frontBlade);

        // Wide Target Spur Hammer (Cocked)
        const revHammer = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.042, 0.034), darkSteelMat);
        revHammer.position.set(0, 0.044, 0.105);
        revHammer.rotation.x = -0.42;
        revGroup.add(revHammer);

        const hammerSpur = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.010, 0.022), titaniumMat);
        hammerSpur.position.set(0, 0.058, 0.120);
        hammerSpur.rotation.x = -0.42;
        revGroup.add(hammerSpur);

        // Combat Trigger Guard & Smooth Face Trigger
        const revTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.050, 0.070), darkSteelMat);
        revTriggerGuard.position.set(0, -0.050, 0.01);
        revGroup.add(revTriggerGuard);

        const revTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.014), titaniumMat);
        revTrigger.position.set(0, -0.042, 0.018);
        revTrigger.rotation.x = -0.25;
        revGroup.add(revTrigger);

        // --- Sculpted Walnut Combat Grip with Finger Grooves & Gold Medallion ---
        const revGrip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.138, 0.074), walnutGripMat);
        revGrip.position.set(0, -0.092, 0.088);
        revGrip.rotation.x = -0.36;
        revGroup.add(revGrip);

        // Curved backstrap contour
        const backstrap = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.12, 0.020), walnutGripMat);
        backstrap.position.set(0, -0.096, 0.128);
        backstrap.rotation.x = -0.36;
        revGroup.add(backstrap);

        // 3 Finger Grooves on Front of Grip
        for (let g = 0; g < 3; g++) {
            const groove = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.016, 0.014), woodMat);
            groove.position.set(0, -0.066 - g * 0.030, 0.058 + g * 0.014);
            groove.rotation.x = -0.36;
            revGroup.add(groove);
        }

        // Gold Medallion Seal Embedded on Grip
        const goldMedallion = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.048, 12), brassMat);
        goldMedallion.rotation.z = Math.PI / 2;
        goldMedallion.position.set(0, -0.092, 0.088);
        revGroup.add(goldMedallion);

        // Two-Handed Stance Arms
        revGroup.add(buildStrikerArms('revolver'));
        this.viewmodelRoot.add(revGroup);
        this.weaponMeshes.revolver = {
            root: revGroup,
            cylinder: revCylinderGroup,
            mag: null,
            muzzlePos: new THREE.Vector3(0, 0.018, -0.41)
        };

        // 5. Double-Barrel Shotgun (Breacher) - Heavy Coach Gun Overhaul
        const shotgunGroup = new THREE.Group();

        // --- Machined Box-Lock Steel Receiver ---
        const shReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.070, 0.19), gunmetalMat);
        shReceiver.position.set(0, -0.006, 0.02);
        shotgunGroup.add(shReceiver);

        // Beveled Engraved Side Plates
        const shSidePlateL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.062, 0.16), darkSteelMat);
        shSidePlateL.position.set(-0.030, -0.006, 0.02);
        shotgunGroup.add(shSidePlateL);

        const shSidePlateR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.062, 0.16), darkSteelMat);
        shSidePlateR.position.set(0.030, -0.006, 0.02);
        shotgunGroup.add(shSidePlateR);

        // Break-Action Hinge Trunnion Pin
        const shHingePin = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.066, 12), chromeBoltMat);
        shHingePin.rotation.z = Math.PI / 2;
        shHingePin.position.set(0, -0.028, -0.06);
        shotgunGroup.add(shHingePin);

        // Curved Recoil Shield Fences at Breech
        const recoilFenceL = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.024, 10), gunmetalMat);
        recoilFenceL.position.set(-0.018, 0.016, -0.05);
        shotgunGroup.add(recoilFenceL);

        const recoilFenceR = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.024, 10), gunmetalMat);
        recoilFenceR.position.set(0.018, 0.016, -0.05);
        shotgunGroup.add(recoilFenceR);

        // Top Tang Break Lever with Knurled Brass Knob (lowered below sight plane)
        const shBreakLever = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.010, 0.042), darkSteelMat);
        shBreakLever.position.set(0.008, 0.032, 0.04);
        shBreakLever.rotation.y = 0.22;
        shotgunGroup.add(shBreakLever);

        const shBreakKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 8), brassMat);
        shBreakKnob.position.set(0.014, 0.036, 0.058);
        shotgunGroup.add(shBreakKnob);

        // Tang Safety Slide Switch
        const shSafetySwitch = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.018), titaniumMat);
        shSafetySwitch.position.set(0, 0.032, 0.088);
        shotgunGroup.add(shSafetySwitch);

        // Heavy Trigger Guard & Twin Brass Triggers
        const shTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.050, 0.076), darkSteelMat);
        shTriggerGuard.position.set(0, -0.050, 0.03);
        shotgunGroup.add(shTriggerGuard);

        const shTrigger1 = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.026, 0.012), brassMat);
        shTrigger1.position.set(0, -0.043, 0.042);
        shTrigger1.rotation.x = -0.25;
        shotgunGroup.add(shTrigger1);

        const shTrigger2 = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.024, 0.012), brassMat);
        shTrigger2.position.set(0, -0.041, 0.020);
        shTrigger2.rotation.x = -0.25;
        shotgunGroup.add(shTrigger2);

        // --- Twin Blued Steel Barrels & Solid Monobloc ---
        const shMonobloc = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.044, 0.08), gunmetalMat);
        shMonobloc.position.set(0, 0.018, -0.11);
        shotgunGroup.add(shMonobloc);

        // Left barrel (slight forward choke taper)
        const shBarrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.38, 12), darkSteelMat);
        shBarrelL.rotation.x = Math.PI / 2;
        shBarrelL.position.set(-0.018, 0.018, -0.27);
        shotgunGroup.add(shBarrelL);

        // Right barrel
        const shBarrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.38, 12), darkSteelMat);
        shBarrelR.rotation.x = Math.PI / 2;
        shBarrelR.position.set(0.018, 0.018, -0.27);
        shotgunGroup.add(shBarrelR);

        // Dark hollow bore recesses at muzzle tips
        const shBoreL = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 12), rubberMat);
        shBoreL.rotation.x = Math.PI / 2;
        shBoreL.position.set(-0.018, 0.018, -0.455);
        shotgunGroup.add(shBoreL);

        const shBoreR = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 12), rubberMat);
        shBoreR.rotation.x = Math.PI / 2;
        shBoreR.position.set(0.018, 0.018, -0.455);
        shotgunGroup.add(shBoreR);

        // Ventilated Top Center Rib with Cooling Slots
        const shRib = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.014, 0.36), gunmetalMat);
        shRib.position.set(0, 0.038, -0.27);
        shotgunGroup.add(shRib);

        for (let s = 0; s < 3; s++) {
            const shSlot = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.007, 0.035), darkSteelMat);
            shSlot.position.set(0, 0.036, -0.17 - s * 0.08);
            shotgunGroup.add(shSlot);
        }

        // Bottom rib uniting barrels
        const bottomRib = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.32), darkSteelMat);
        bottomRib.position.set(0, 0.003, -0.27);
        shotgunGroup.add(bottomRib);

        // Brass Bead Front Sight (proudly perched atop muzzle rib)
        const shBeadPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.012), gunmetalMat);
        shBeadPedestal.position.set(0, 0.044, -0.448);
        shotgunGroup.add(shBeadPedestal);

        const shBead = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), brassMat);
        shBead.position.set(0, 0.050, -0.448);
        shotgunGroup.add(shBead);

        // --- Sculpted Beavertail Walnut Forend ---
        const shForend = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.048, 0.22), woodMat);
        shForend.position.set(0, -0.014, -0.19);
        shotgunGroup.add(shForend);

        // Forend checkering side panels
        const shCheckL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.026, 0.16), walnutGripMat);
        shCheckL.position.set(-0.029, -0.012, -0.19);
        shotgunGroup.add(shCheckL);

        const shCheckR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.026, 0.16), walnutGripMat);
        shCheckR.position.set(0.029, -0.012, -0.19);
        shotgunGroup.add(shCheckR);

        // Inlaid steel forend release iron latch
        const shForendIron = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.010, 0.16), darkSteelMat);
        shForendIron.position.set(0, -0.036, -0.19);
        shotgunGroup.add(shForendIron);

        // --- Flowing Walnut Coach Gun Stock ---
        // Dropped & offset to the right shoulder so the line-of-sight down the center rib is 100% unobstructed
        const shStockGroup = new THREE.Group();
        shStockGroup.position.set(0.018, -0.052, 0.11);
        shStockGroup.rotation.x = -0.28; // Authentic coach gun downward drop
        shStockGroup.rotation.y = -0.04; // Slight cast-off to shoulder

        // Wrist / Grip neck
        const shWrist = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.076, 0.13), woodMat);
        shWrist.position.set(0, -0.015, 0.05);
        shWrist.rotation.x = -0.15;
        shStockGroup.add(shWrist);

        // Main stock body flowing into butt
        const shBody = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.088, 0.20), woodMat);
        shBody.position.set(0, -0.010, 0.16);
        shStockGroup.add(shBody);

        // Slim cheek comb resting low on the stock
        const shComb = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.018, 0.14), woodMat);
        shComb.position.set(0, 0.038, 0.15);
        shStockGroup.add(shComb);

        // White accent line spacer
        const shSpacer = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.096, 0.008), cuffMat);
        shSpacer.position.set(0, -0.010, 0.264);
        shStockGroup.add(shSpacer);

        // Ribbed rubber recoil buttpad
        const shButtpad = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.100, 0.028), rubberMat);
        shButtpad.position.set(0, -0.010, 0.280);
        shStockGroup.add(shButtpad);

        shotgunGroup.add(shStockGroup);

        // Striker Character Arms
        shotgunGroup.add(buildStrikerArms('shotgun'));
        this.viewmodelRoot.add(shotgunGroup);
        this.weaponMeshes.shotgun = {
            root: shotgunGroup,
            mag: null,
            muzzlePos: new THREE.Vector3(0, 0.018, -0.46)
        };

        // Muzzle Flash
        this.muzzleLight = new THREE.PointLight(0xffea78, 0, 8);
        this.viewmodelRoot.add(this.muzzleLight);

        this.muzzleFlashGroup = new THREE.Group();
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffea78, transparent: true, opacity: 0.95 });
        const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), flashMat);
        const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), flashMat);
        p2.rotation.y = Math.PI / 2;
        this.muzzleFlashGroup.add(p1);
        this.muzzleFlashGroup.add(p2);
        this.muzzleFlashGroup.visible = false;
        this.viewmodelRoot.add(this.muzzleFlashGroup);
    }

    switchWeapon(key) {
        if (!this.weapons[key] || this.isReloading) return;
        this.currentWeaponKey = key;
        this.currentWeaponIndex = this.weaponKeys.indexOf(key);
        this.currentWeapon = this.weapons[key];

        // Reset burst count and camera recoil on weapon swap
        this.burstCount = 0;
        this.cameraRecoil.pitch = 0;
        this.cameraRecoil.yaw = 0;

        Object.keys(this.weaponMeshes).forEach(k => {
            this.weaponMeshes[k].root.visible = (k === key);
        });

        if (this.audio && typeof this.audio.playSwitchWeapon === 'function') {
            this.audio.playSwitchWeapon();
        }

        if (window.uiManager) {
            window.uiManager.updateWeaponUI(this.currentWeapon, this.ammoState[key], this.ammoState);
            window.uiManager.setActiveHotbarSlot(key);
            if (this.ammoState[key].clip <= 0) {
                if (this.ammoState[key].reserve > 0) {
                    window.uiManager.showReloadPrompt();
                } else {
                    window.uiManager.showNoAmmoAlert();
                }
            } else {
                window.uiManager.hideReloadPrompt();
                window.uiManager.hideNoAmmoAlert();
            }
        }
    }

    canReload() {
        if (this.isReloading || (this.player && this.player.isDead)) return false;
        const ammo = this.ammoState[this.currentWeaponKey];
        if (!ammo) return false;
        return ammo.clip < this.currentWeapon.magSize && ammo.reserve > 0;
    }

    resetAmmo() {
        for (const key of this.weaponKeys) {
            const w = this.weapons[key];
            if (w) {
                this.ammoState[key] = {
                    clip: w.initialClip !== undefined ? w.initialClip : w.magSize,
                    reserve: w.initialReserve !== undefined ? w.initialReserve : w.maxReserve
                };
            }
        }
        this.isReloading = false;
        this.reloadTimer = 0;
        if (window.uiManager) {
            window.uiManager.updateWeaponUI(this.currentWeapon, this.ammoState[this.currentWeaponKey], this.ammoState);
            window.uiManager.hideReloadPrompt();
            window.uiManager.hideLowAmmoWarning();
            window.uiManager.hideNoAmmoAlert();
        }
    }

    reload() {
        if (this.isReloading || (this.player && this.player.isDead)) return false;

        const ammo = this.ammoState[this.currentWeaponKey];
        if (!ammo) return false;

        // Clip already fully loaded: no reload needed
        if (ammo.clip >= this.currentWeapon.magSize) {
            return false;
        }

        // Reserve pool depleted: cannot reload, trigger empty chamber click sound & visual hint
        if (ammo.reserve <= 0) {
            if (this.audio && typeof this.audio.playEmptyClick === 'function') {
                this.audio.playEmptyClick();
            }
            if (window.uiManager) {
                window.uiManager.updateWeaponUI(this.currentWeapon, ammo, this.ammoState);
                if (ammo.clip === 0) {
                    window.uiManager.showNoAmmoAlert();
                } else {
                    window.uiManager.showAmmoWarning("NO RESERVE");
                }
            }
            return false;
        }

        this.isReloading = true;
        this.reloadTimer = this.currentWeapon.reloadTime;
        if (this.isAiming) {
            this.isAiming = false;
        }

        if (window.uiManager) {
            window.uiManager.hideReloadPrompt();
            window.uiManager.hideLowAmmoWarning();
        }

        // Stage 1: Mag release
        this.audio.playReload(1, this.currentWeaponKey);

        // Stage 2: Slap in new mag
        setTimeout(() => {
            if (this.isReloading) this.audio.playReload(2, this.currentWeaponKey);
        }, this.currentWeapon.reloadTime * 450);

        // Stage 3: Slide rack / chamber
        setTimeout(() => {
            if (this.isReloading) this.audio.playReload(3, this.currentWeaponKey);
        }, this.currentWeapon.reloadTime * 800);

        return true;
    }

    finishReload() {
        const ammo = this.ammoState[this.currentWeaponKey];
        if (!ammo) return;

        const needed = this.currentWeapon.magSize - ammo.clip;
        const toLoad = Math.min(needed, ammo.reserve);
        ammo.clip += toLoad;
        ammo.reserve -= toLoad;
        this.isReloading = false;

        if (window.uiManager) {
            window.uiManager.updateWeaponUI(this.currentWeapon, ammo, this.ammoState);
            window.uiManager.hideReloadPrompt();
        }
    }

    ejectShellCasing(muzzleWorld) {
        const isShotgun = this.currentWeaponKey === 'shotgun';
        const casingGeo = isShotgun ? new THREE.CylinderGeometry(0.016, 0.016, 0.055, 8) : new THREE.CylinderGeometry(0.012, 0.012, 0.04, 6);
        const casingMat = new THREE.MeshBasicMaterial({ color: isShotgun ? 0xcc2222 : 0xffcc33 });
        const mesh = new THREE.Mesh(casingGeo, casingMat);
        mesh.position.copy(muzzleWorld).add(_tempVec.set(0.1, -0.05, 0.1));

        const yaw = this.player.yawObject.rotation.y;
        const rightVec = _tempVec.set(Math.cos(yaw), 1.2, -Math.sin(yaw)).normalize();
        const velocity = new THREE.Vector3().copy(rightVec).multiplyScalar(3.2 + Math.random() * 1.5);

        this.scene.add(mesh);
        this.casings.push({
            mesh: mesh,
            velocity: velocity,
            rotVel: new THREE.Vector3(Math.random() * 15, Math.random() * 15, Math.random() * 15),
            life: 1.0
        });
    }

    calculateDamage(weaponKey, distance, isHeadshot = false, isLimb = false) {
        let dmg = 0;
        if (weaponKey === 'ar') {
            // Base Body Damage: 28 HP
            // Headshot Multiplier: 1.90 (Math.round(28 * 1.90) = 53 HP). (2 headshots = 106 HP -> KILL)
            dmg = isHeadshot ? Math.round(28 * 1.90) : 28;
        } else if (weaponKey === 'shotgun') {
            // Shotgun Pellet Damage Model:
            // Point Blank & Close Quarters (< 12.0m):
            // - Double damage on body: base pellet damage is 28 HP (doubled from 14! 8 pellets = 224 total body damage!)
            // - Double damage on limbs: 28 * 0.85 = 24 HP per pellet! (applied via limb multiplier below)
            // - 1.5x on head: 28 * 1.5 = 42 HP per pellet!
            // Mid/Long Range (>= 12.0m):
            // - Normal exponential falloff applies
            let basePelletDmg = 28;
            if (distance < 12.0) {
                basePelletDmg = 28;
                dmg = isHeadshot ? Math.round(basePelletDmg * 1.5) : basePelletDmg;
            } else {
                const factor = Math.exp(-0.12 * (distance - 12.0));
                basePelletDmg = Math.max(1, Math.round(14 * factor));
                dmg = isHeadshot ? Math.round(basePelletDmg * 1.5) : basePelletDmg;
            }
        } else if (weaponKey === 'revolver') {
            // Base Body Damage: 68 HP (2 body shots to kill)
            // Headshot Multiplier: 1.60 -> Math.round(68 * 1.60) = 109 HP
            // Zero headshot damage falloff at any distance (any headshot deals >= 100 HP -> 1-shot kill)
            dmg = isHeadshot ? Math.round(68 * 1.60) : 68;
        } else if (weaponKey === 'sniper') {
            // Base Body Damage (d <= 35m): 105 HP -> 1-shot body kill
            // Falloff (d > 35m): Body shot damage drops to 85 HP (leaves 15 HP)
            // Headshot Multiplier: 1.80 (Deals 153+ HP at all distances -> 1-shot headshot at any distance)
            const baseDmg = distance <= 35.0 ? 105 : 85;
            dmg = isHeadshot ? Math.round(baseDmg * 1.80) : baseDmg;
        } else if (weaponKey === 'smg') {
            // Base Damage (d <= 15m): 18 HP
            // Falloff (d > 20m): Rapid linear drop from 18 at 20m to 7 at 30m+, min 7 HP
            // Headshot multiplier: 1.4 (round(dmg * 1.4))
            let baseDmg = 18;
            if (distance > 20.0) {
                const t = Math.min(1.0, (distance - 20.0) / 10.0);
                baseDmg = Math.max(7, Math.round(18.0 - 11.0 * t));
            }
            dmg = isHeadshot ? Math.round(baseDmg * 1.4) : baseDmg;
        } else {
            const weapon = this.weapons[weaponKey] || this.currentWeapon;
            dmg = Math.round(weapon.damage * (isHeadshot ? weapon.headshotMult : 1.0));
        }

        // Option B: 85% Limb Damage Multiplier for arms and legs
        if (isLimb && !isHeadshot) {
            dmg = Math.max(1, Math.round(dmg * 0.85));
        }
        return dmg;
    }

    shoot() {
        if (this.isReloading || (this.player && this.player.isDead)) return;
        const now = performance.now();
        if (now - this.lastShotTime < this.currentWeapon.fireRate) return;

        const ammo = this.ammoState[this.currentWeaponKey];
        if (!ammo) return;

        if (ammo.clip <= 0) {
            // Reserve is also empty -> Total ammo exhaustion!
            if (ammo.reserve <= 0) {
                const emptyClickInterval = Math.max(250, this.currentWeapon.fireRate);
                if (now - this.lastShotTime >= emptyClickInterval) {
                    this.lastShotTime = now;
                    if (this.audio && typeof this.audio.playEmptyClick === 'function') {
                        this.audio.playEmptyClick();
                    }
                    if (window.uiManager) {
                        window.uiManager.updateWeaponUI(this.currentWeapon, ammo, this.ammoState);
                        window.uiManager.showNoAmmoAlert();
                    }
                }
                return;
            }

            // Reserve available: auto-trigger reload
            this.reload();
            return;
        }

        ammo.clip--;
        this.lastShotTime = now;

        // Burst Tracking: Reset if previous burst interval expired
        const burstWindow = this.currentWeapon.burstResetWindow || 260;
        if (now - this.lastBurstShotTime > burstWindow) {
            this.burstCount = 0;
        }
        this.burstCount++;
        this.lastBurstShotTime = now;

        this.audio.playShoot(this.currentWeapon.id);

        // Low-ammo tactical warning: subtle tactile click when reaching last 25% of magazine
        const lowAmmoThreshold = Math.ceil(this.currentWeapon.magSize * 0.25);
        if (ammo.clip <= lowAmmoThreshold && ammo.clip > 0) {
            if (this.audio && typeof this.audio.playLowAmmoWarning === 'function') {
                this.audio.playLowAmmoWarning(ammo.clip, lowAmmoThreshold);
            }
        }

        const isHyper = !!(this.player && this.player.boosters && this.player.boosters.damage > 0);
        this.flashTimer = 0.045;
        this.muzzleLight.intensity = isHyper ? 4.5 : 2.8;
        this.muzzleLight.color.setHex(isHyper ? 0xff0044 : 0xffea78);
        this.muzzleFlashGroup.visible = true;
        const activeMuzzle = this.weaponMeshes[this.currentWeaponKey].muzzlePos;
        this.muzzleFlashGroup.position.copy(activeMuzzle);
        this.muzzleLight.position.copy(activeMuzzle);

        this.performRaycast();

        // Camera Recoil Impulse (CS2-style camera kick from this shot)
        const kickPitch = this.currentWeapon.cameraKickPitch || 0.02;
        const kickYaw = (this.currentWeapon.cameraKickYaw || 0.005) * (Math.random() > 0.5 ? 1 : -1);
        this.cameraRecoil.pitch = Math.min(0.28, this.cameraRecoil.pitch + kickPitch);
        this.cameraRecoil.yaw = Math.max(-0.08, Math.min(0.08, this.cameraRecoil.yaw + kickYaw));

        // Immediately sync camera rotation for zero-latency frame update
        this.camera.rotation.x = this.cameraRecoil.pitch;
        this.camera.rotation.y = this.cameraRecoil.yaw;
        this.camera.updateMatrixWorld();

        // Viewmodel Kick & Rotation
        this.recoilSpring.z += this.currentWeapon.recoilKick;
        this.recoilRot.x += this.currentWeapon.recoilPitch;

        // Screen Micro-Trauma Shake (scales with weapon caliber & continuous burst)
        const traumaBase = this.currentWeapon.id === 'shotgun' ? 0.45 : (this.currentWeapon.id === 'revolver' ? 0.32 : (this.currentWeapon.id === 'sniper' ? 0.38 : 0.09));
        const burstTraumaBonus = Math.min(0.15, this.burstCount * 0.012);
        this.particles.addTrauma(traumaBase + burstTraumaBonus);

        if (window.uiManager) {
            const bloomFactor = Math.min(16, 4.0 + this.burstCount * 1.4);
            window.uiManager.expandCrosshair(bloomFactor);
        }

        if (window.uiManager) {
            window.uiManager.updateWeaponUI(this.currentWeapon, ammo, this.ammoState);
            if (ammo.clip <= 0) {
                if (ammo.reserve > 0) {
                    // Smart auto-reload on empty magazine when reserves are available
                    this.reload();
                } else {
                    // Depleted: do NOT auto-reload, trigger stylized NO AMMO alert badge
                    window.uiManager.showNoAmmoAlert();
                }
            }
        }
    }

    performRaycast() {
        this.muzzleFlashGroup.getWorldPosition(_muzzleWorld);

        const botHitboxes = [];
        if (window.botManager) {
            window.botManager.getHitboxes(botHitboxes);
        }

        const candidateMeshes = botHitboxes.map(b => b.mesh).concat(this.player.map.shootableMeshes);

        const isHyper = !!(this.player && this.player.boosters && this.player.boosters.damage > 0);
        const damageMult = isHyper ? 2.5 : 1.0;

        if (this.currentWeaponKey === 'shotgun') {
            const PELLET_COUNT = 8;
            const spreadRadius = this.isAiming ? this.currentWeapon.adsSpread : this.currentWeapon.spread;

            this.ejectShellCasing(_muzzleWorld);

            // Aggregate hits per bot in that frame
            const botHits = new Map();

            for (let i = 0; i < PELLET_COUNT; i++) {
                // Randomized Gaussian/radial offset within spread cone
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * spreadRadius;
                const spreadX = Math.cos(angle) * r;
                const spreadY = Math.sin(angle) * r;

                _screenCoords.set(spreadX, spreadY);
                _raycaster.setFromCamera(_screenCoords, this.camera);

                const hits = _raycaster.intersectObjects(candidateMeshes, false);
                const validHit = hits.length > 0 ? hits[0] : null;
                const hitPos = validHit ? validHit.point : _tempVec.copy(_raycaster.ray.origin).addScaledVector(_raycaster.ray.direction, 100);

                // Buckshot tracer (Crimson when Hyper Damage is active)
                const buckshotColor = isHyper ? 0xff0033 : 0xffaa33;
                this.particles.createTracer(_muzzleWorld, hitPos, buckshotColor);

                if (validHit) {
                    const hitObject = validHit.object;
                    const botData = botHitboxes.find(b => b.mesh === hitObject);

                    if (botData) {
                        const isHeadshot = !!botData.isHead;
                        const isLimb = !!botData.isLimb;
                        this.camera.getWorldPosition(_camWorld);
                        const dist = _camWorld.distanceTo(hitPos);
                        const pelletDmg = Math.round(this.calculateDamage('shotgun', dist, isHeadshot, isLimb) * damageMult);

                        this.particles.createHitSplatter(hitPos, isHeadshot);

                        if (!botHits.has(botData.bot)) {
                            botHits.set(botData.bot, {
                                bot: botData.bot,
                                totalDamage: pelletDmg,
                                hadHeadshot: isHeadshot,
                                hitPos: hitPos.clone()
                            });
                        } else {
                            const entry = botHits.get(botData.bot);
                            entry.totalDamage += pelletDmg;
                            if (isHeadshot) entry.hadHeadshot = true;
                            entry.hitPos.copy(hitPos);
                        }
                    } else {
                        const normal = validHit.face ? validHit.face.normal : _wallNormal.set(0, 1, 0);
                        this.particles.createWallImpact(hitPos, normal);
                    }
                }
            }

            // Close-Range Breacher Tolerance: If point-blank shotgun shot missed all pellets, rescue near-miss
            if (botHits.size === 0 && this.currentWeapon.favouredRange > 0 && window.botManager) {
                this.camera.getWorldPosition(_camWorld);
                this.camera.getWorldDirection(_rayDir);

                let bestBot = null;
                let bestAngle = Infinity;
                let bestDist = Infinity;

                for (let i = 0; i < window.botManager.bots.length; i++) {
                    const b = window.botManager.bots[i];
                    if (b.isDead || !b.meshRoot || !b.meshRoot.visible) continue;

                    const toBotX = b.position.x - _camWorld.x;
                    const toBotZ = b.position.z - _camWorld.z;
                    const hDist = Math.hypot(toBotX, toBotZ);
                    if (hDist > this.currentWeapon.favouredRange) continue;

                    const rayDirH = Math.hypot(_rayDir.x, _rayDir.z);
                    const t = rayDirH > 0.001 ? (hDist / rayDirH) : hDist;
                    const yRay = _camWorld.y + t * _rayDir.y;
                    const botBaseY = b.position.y || 0;
                    const targetY = Math.max(botBaseY + 0.2, Math.min(botBaseY + 1.85, yRay));

                    _tempBotPos.set(b.position.x, targetY, b.position.z);
                    const d = _camWorld.distanceTo(_tempBotPos);
                    if (d > this.currentWeapon.favouredRange) continue;

                    _toBotVec.subVectors(_tempBotPos, _camWorld).normalize();
                    const dot = _rayDir.dot(_toBotVec);
                    if (dot <= 0.82) continue;

                    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                    const maxAllowedAngle = this.currentWeapon.favouredTolerance * (1.0 - (d / this.currentWeapon.favouredRange));
                    if (angle <= maxAllowedAngle) {
                        _losRaycaster.set(_camWorld, _toBotVec);
                        const obsHits = _losRaycaster.intersectObjects(this.player.map.shootableMeshes, false);
                        if (obsHits.length > 0 && obsHits[0].distance < d - 0.25) continue;

                        if (angle < bestAngle) {
                            bestAngle = angle;
                            bestBot = b;
                            bestDist = d;
                            _favouredHitPos.copy(_tempBotPos);
                        }
                    }
                }

                if (bestBot) {
                    const proxPellets = 4;
                    const pelletDmg = Math.round(this.calculateDamage('shotgun', bestDist, false, false) * damageMult);
                    const totalDamage = pelletDmg * proxPellets;
                    botHits.set(bestBot, {
                        bot: bestBot,
                        totalDamage: totalDamage,
                        hadHeadshot: false,
                        hitPos: _favouredHitPos.clone()
                    });
                    this.particles.createHitSplatter(_favouredHitPos, false);
                }
            }

            if (botHits.size > 0) {
                let anyHeadshot = false;
                botHits.forEach(entry => {
                    if (entry.hadHeadshot) anyHeadshot = true;
                    this.particles.addDamageNumber(entry.totalDamage, entry.hitPos, entry.hadHeadshot);
                    entry.bot.takeDamage(entry.totalDamage, this.player, entry.hadHeadshot, this.currentWeapon.name);
                });

                this.audio.playHit(anyHeadshot);
                if (window.uiManager) {
                    window.uiManager.triggerHitmarker(anyHeadshot);
                }
            }

        } else {
            // Single bullet weapons: AR, Sniper, SMG, Revolver
            const baseSpread = this.isAiming ? (this.currentWeapon.adsSpread || 0) : this.currentWeapon.spread;
            const bloom = Math.min(this.currentWeapon.maxBurstBloom || 0, Math.max(0, this.burstCount - 1) * (this.currentWeapon.burstBloomPerShot || 0));
            const spread = baseSpread + bloom;

            const spreadX = (Math.random() - 0.5) * spread;
            const spreadY = (Math.random() - 0.5) * spread;

            _screenCoords.set(spreadX, spreadY);
            _raycaster.setFromCamera(_screenCoords, this.camera);

            this.ejectShellCasing(_muzzleWorld);

            const hits = _raycaster.intersectObjects(candidateMeshes, false);
            let validHit = hits.length > 0 ? hits[0] : null;
            let hitBotData = validHit ? botHitboxes.find(b => b.mesh === validHit.object) : null;
            let isFavouredHit = false;

            // Hybrid Favoured Aim (Close-Range Proximity Magnetism - Option B)
            if (!hitBotData && this.currentWeapon.favouredRange > 0 && this.currentWeapon.favouredTolerance > 0 && window.botManager) {
                this.camera.getWorldPosition(_camWorld);
                _rayDir.copy(_raycaster.ray.direction).normalize();

                let bestBot = null;
                let bestAngle = Infinity;
                let bestDist = Infinity;

                for (let i = 0; i < window.botManager.bots.length; i++) {
                    const b = window.botManager.bots[i];
                    if (b.isDead || !b.meshRoot || !b.meshRoot.visible) continue;

                    const toBotX = b.position.x - _camWorld.x;
                    const toBotZ = b.position.z - _camWorld.z;
                    const hDist = Math.hypot(toBotX, toBotZ);
                    if (hDist > this.currentWeapon.favouredRange) continue;

                    const rayDirH = Math.hypot(_rayDir.x, _rayDir.z);
                    const t = rayDirH > 0.001 ? (hDist / rayDirH) : hDist;
                    const yRay = _camWorld.y + t * _rayDir.y;
                    const botBaseY = b.position.y || 0;
                    const targetY = Math.max(botBaseY + 0.2, Math.min(botBaseY + 1.85, yRay));

                    _tempBotPos.set(b.position.x, targetY, b.position.z);
                    const d = _camWorld.distanceTo(_tempBotPos);
                    if (d > this.currentWeapon.favouredRange) continue;

                    _toBotVec.subVectors(_tempBotPos, _camWorld).normalize();
                    const dot = _rayDir.dot(_toBotVec);
                    if (dot <= 0.82) continue; // Forward cone test

                    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                    // Linear falloff: maximum tolerance at point-blank, 0 at favouredRange
                    const maxAllowedAngle = this.currentWeapon.favouredTolerance * (1.0 - (d / this.currentWeapon.favouredRange));
                    if (angle <= maxAllowedAngle) {
                        // Anti-Wall / Obstacle Line-of-Sight verification
                        _losRaycaster.set(_camWorld, _toBotVec);
                        const obsHits = _losRaycaster.intersectObjects(this.player.map.shootableMeshes, false);
                        if (obsHits.length > 0 && obsHits[0].distance < d - 0.25) {
                            // Wall blocks line of sight: disqualified!
                            continue;
                        }

                        if (angle < bestAngle) {
                            bestAngle = angle;
                            bestBot = b;
                            bestDist = d;
                            _favouredHitPos.copy(_tempBotPos);
                        }
                    }
                }

                if (bestBot) {
                    hitBotData = {
                        bot: bestBot,
                        isHead: false,
                        isLimb: false,
                        mesh: bestBot.bodyMesh
                    };
                    validHit = {
                        point: _favouredHitPos.clone(),
                        object: bestBot.bodyMesh
                    };
                    isFavouredHit = true;
                }
            }

            const hitPos = validHit ? validHit.point : _tempVec.copy(_raycaster.ray.origin).addScaledVector(_raycaster.ray.direction, 150);

            const defaultTracer = this.currentWeaponKey === 'sniper' ? 0xff3355 : (this.currentWeaponKey === 'revolver' ? 0xffaa22 : 0x00ffcc);
            const tracerColor = isHyper ? 0xff0033 : defaultTracer;
            this.particles.createTracer(_muzzleWorld, hitPos, tracerColor);

            if (validHit) {
                if (hitBotData) {
                    const isHeadshot = isFavouredHit ? false : !!hitBotData.isHead;
                    const isLimb = isFavouredHit ? false : !!hitBotData.isLimb;
                    this.camera.getWorldPosition(_camWorld);
                    const dist = _camWorld.distanceTo(hitPos);
                    const damage = Math.round(this.calculateDamage(this.currentWeaponKey, dist, isHeadshot, isLimb) * damageMult);

                    this.audio.playHit(isHeadshot);
                    this.particles.createHitSplatter(hitPos, isHeadshot);
                    this.particles.addDamageNumber(damage, hitPos, isHeadshot);

                    if (window.uiManager) {
                        window.uiManager.triggerHitmarker(isHeadshot);
                    }

                    hitBotData.bot.takeDamage(damage, this.player, isHeadshot, this.currentWeapon.name);
                } else {
                    const normal = validHit.face ? validHit.face.normal : _wallNormal.set(0, 1, 0);
                    this.particles.createWallImpact(hitPos, normal);
                }
            }
        }
    }

    update(dt) {
        if (this.isFiring && this.currentWeapon.auto) {
            this.shoot();
        }

        // Camera Recoil Recovery (CS2-style exponential return)
        // ONLY apply recovery decay when not actively firing!
        // When the player stops firing, smoothly recover back down to 0 over ~0.35s with exponential spring decay.
        const isGunActivelyFiring = this.isFiring && !this.isReloading && (this.ammoState[this.currentWeaponKey] && this.ammoState[this.currentWeaponKey].clip > 0);
        if (!isGunActivelyFiring) {
            const recoilRecovery = 10; // ~0.35s exponential spring decay
            this.cameraRecoil.pitch *= Math.exp(-recoilRecovery * dt);
            this.cameraRecoil.yaw *= Math.exp(-recoilRecovery * dt);
            if (Math.abs(this.cameraRecoil.pitch) < 0.0001) this.cameraRecoil.pitch = 0;
            if (Math.abs(this.cameraRecoil.yaw) < 0.0001) this.cameraRecoil.yaw = 0;
        }

        // Reset burst count when trigger released and reset window passed
        const now = performance.now();
        if (!this.isFiring && (now - this.lastBurstShotTime > (this.currentWeapon.burstResetWindow || 260))) {
            this.burstCount = 0;
        }

        if (this.isReloading) {
            if (this.isAiming) {
                this.isAiming = false;
            }
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.finishReload();
            }
        }

        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer <= 0) {
                this.muzzleLight.intensity = 0;
                this.muzzleFlashGroup.visible = false;
            }
        }

        for (let i = this.casings.length - 1; i >= 0; i--) {
            const c = this.casings[i];
            c.life -= dt;
            if (c.life <= 0) {
                this.scene.remove(c.mesh);
                c.mesh.geometry.dispose();
                this.casings.splice(i, 1);
                continue;
            }
            c.velocity.y -= 18 * dt;
            c.mesh.position.addScaledVector(c.velocity, dt);
            c.mesh.rotation.x += c.rotVel.x * dt;
            c.mesh.rotation.y += c.rotVel.y * dt;

            if (c.mesh.position.y <= 0.05) {
                c.mesh.position.y = 0.05;
                c.velocity.y = -c.velocity.y * 0.35;
                c.velocity.x *= 0.6;
                c.velocity.z *= 0.6;
            }
        }

        // Viewmodel Positioning & Tactical Reload Animations
        const targetPos = this.isAiming ? this.currentWeapon.adsPos : this.currentWeapon.hipPos;
        const posLerpSpeed = this.isAiming ? 20 : 14;

        this.recoilSpring.z *= Math.exp(-24 * dt);
        this.recoilRot.x *= Math.exp(-22 * dt);

        this.swayPos.x += (this.targetSway.x - this.swayPos.x) * 14 * dt;
        this.swayPos.y += (this.targetSway.y - this.swayPos.y) * 14 * dt;
        this.targetSway.set(0, 0, 0);

        // Tactical Reload Animation (Dip, Tilt & Mag Drop)
        let reloadDipY = 0;
        let reloadTiltZ = 0;
        let reloadTiltX = 0;

        if (this.isReloading) {
            const progress = (this.currentWeapon.reloadTime - this.reloadTimer) / this.currentWeapon.reloadTime;
            // Smooth bell curve dip
            reloadDipY = Math.sin(progress * Math.PI) * 0.18;
            reloadTiltZ = Math.sin(progress * Math.PI) * 0.35; // 20 deg tactical tilt
            reloadTiltX = Math.sin(progress * Math.PI) * 0.15;
        }

        const activeMeshObj = this.weaponMeshes[this.currentWeaponKey];
        if (activeMeshObj) {
            const root = activeMeshObj.root;
            root.position.x += (targetPos.x + this.swayPos.x - root.position.x) * posLerpSpeed * dt;
            root.position.y += (targetPos.y - reloadDipY + this.swayPos.y - root.position.y) * posLerpSpeed * dt;
            root.position.z += (targetPos.z + this.recoilSpring.z - root.position.z) * posLerpSpeed * dt;

            root.rotation.x = this.recoilRot.x + reloadTiltX + (this.isAiming ? 0 : this.swayPos.y * 1.2);
            root.rotation.y = this.swayPos.x * 1.5;
            root.rotation.z = reloadTiltZ;

            // Revolver cylinder swing-out animation during reload
            if (this.currentWeaponKey === 'revolver' && activeMeshObj.cylinder) {
                if (this.isReloading) {
                    const progress = (this.currentWeapon.reloadTime - this.reloadTimer) / this.currentWeapon.reloadTime;
                    activeMeshObj.cylinder.rotation.z = Math.sin(progress * Math.PI) * 0.78;
                } else {
                    activeMeshObj.cylinder.rotation.z = 0;
                }
            }
        }

        const baseFov = (window.gameSettings ? window.gameSettings.fov : 75);
        let targetFov = this.isAiming ? this.currentWeapon.adsFov : baseFov;
        if (!this.isAiming && this.player && this.player.boosters && this.player.boosters.speed > 0) {
            targetFov += 10; // Adrenaline Burst dynamic FOV warp
        }
        this.camera.fov += (targetFov - this.camera.fov) * 16 * dt;
        this.camera.updateProjectionMatrix();

        const sniperOverlay = document.getElementById('sniper-scope');
        const crosshair = document.getElementById('crosshair');

        if (this.currentWeaponKey === 'sniper' && this.isAiming) {
            if (sniperOverlay && sniperOverlay.style.display !== 'block') sniperOverlay.style.display = 'block';
            if (crosshair && crosshair.style.opacity !== '0') crosshair.style.opacity = '0';
            if (activeMeshObj) activeMeshObj.root.visible = false;
        } else {
            if (sniperOverlay && sniperOverlay.style.display !== 'none') sniperOverlay.style.display = 'none';
            if (crosshair && crosshair.style.opacity !== '1') crosshair.style.opacity = '1';
            if (activeMeshObj) activeMeshObj.root.visible = true;
        }
    }
}

window.WeaponSystem = WeaponSystem;
