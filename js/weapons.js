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

class WeaponSystem {
    constructor(camera, scene, player, audio, particles) {
        this.camera = camera;
        this.scene = scene;
        this.player = player;
        this.audio = audio;
        this.particles = particles;

        this.viewmodelRoot = new THREE.Object3D();
        this.camera.add(this.viewmodelRoot);

        // Weapon Definitions
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
                spread: 0.009,
                adsFov: 55,
                hipPos: new THREE.Vector3(0.18, -0.18, -0.40),
                adsPos: new THREE.Vector3(0.0, -0.118, -0.28),
                reloadTime: 1.3
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
                recoilPitch: 0.11,
                recoilKick: 0.11,
                spread: 0.03,
                adsFov: 20,
                hipPos: new THREE.Vector3(0.18, -0.18, -0.42),
                adsPos: new THREE.Vector3(0.0, -0.118, -0.28),
                reloadTime: 2.0
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
                spread: 0.015,
                adsFov: 60,
                hipPos: new THREE.Vector3(0.16, -0.17, -0.36),
                adsPos: new THREE.Vector3(0.0, -0.115, -0.26),
                reloadTime: 1.1
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
                recoilPitch: 0.075,
                recoilKick: 0.065,
                spread: 0.008,
                adsFov: 62,
                hipPos: new THREE.Vector3(0.15, -0.17, -0.34),
                adsPos: new THREE.Vector3(0.0, -0.112, -0.26),
                reloadTime: 1.6
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
                damage: 14,
                headshotMult: 2.0,
                recoilPitch: 0.14,
                recoilKick: 0.13,
                spread: 0.048,
                adsSpread: 0.024,
                adsFov: 65,
                hipPos: new THREE.Vector3(0.18, -0.19, -0.42),
                adsPos: new THREE.Vector3(0.0, -0.125, -0.30),
                reloadTime: 1.8
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

        // 1. Assault Rifle (Commando AK-47)
        const arGroup = new THREE.Group();

        // Stamped steel receiver
        const arReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.088, 0.38), akReceiverMat);
        arReceiver.position.set(0, 0, 0);
        arGroup.add(arReceiver);

        // Receiver top curved dust cover
        const dustCover = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 10), gunmetalMat);
        dustCover.rotation.x = Math.PI / 2;
        dustCover.position.set(0, 0.045, 0.02);
        arGroup.add(dustCover);

        // Warm Wooden Lower & Upper Handguard
        const woodHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.074, 0.24), woodMat);
        woodHandguard.position.set(0, 0.005, -0.24);
        arGroup.add(woodHandguard);

        // Machined Steel Barrel & Gas Tube
        const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 8), darkSteelMat);
        gasTube.rotation.x = Math.PI / 2;
        gasTube.position.set(0, 0.048, -0.24);
        arGroup.add(gasTube);

        const arBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 8), darkSteelMat);
        arBarrel.rotation.x = Math.PI / 2;
        arBarrel.position.set(0, 0.012, -0.44);
        arGroup.add(arBarrel);

        // Front sight post
        const frontSightTower = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.042, 0.022), darkSteelMat);
        frontSightTower.position.set(0, 0.046, -0.49);
        arGroup.add(frontSightTower);

        // Slanted AK muzzle compensator
        const muzzleComp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.04), darkSteelMat);
        muzzleComp.position.set(0, 0.012, -0.55);
        arGroup.add(muzzleComp);

        // Warm Wooden Stock
        const arStock = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.098, 0.28), woodMat);
        arStock.position.set(0, -0.012, 0.28);
        arGroup.add(arStock);

        // Wooden Pistol Grip
        const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.11, 0.06), woodMat);
        pistolGrip.position.set(0, -0.085, 0.06);
        pistolGrip.rotation.x = -0.32;
        arGroup.add(pistolGrip);

        // Curved AK-47 Steel Banana Magazine
        const arMag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.17, 0.08), darkSteelMat);
        arMag.position.set(0, -0.115, -0.06);
        arMag.rotation.x = -0.34;
        arGroup.add(arMag);

        // Reflex Red Dot Optic Housing
        const reflexFrame = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.042, 0.068), gunmetalMat);
        reflexFrame.position.set(0, 0.068, -0.04);
        arGroup.add(reflexFrame);

        const reflexLens = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.028, 0.01), redReticleMat);
        reflexLens.position.set(0, 0.072, -0.04);
        arGroup.add(reflexLens);

        // Add Striker Character Arms
        arGroup.add(buildStrikerArms('ar'));
        this.viewmodelRoot.add(arGroup);
        this.weaponMeshes.ar = { root: arGroup, mag: arMag, muzzlePos: new THREE.Vector3(0, 0.012, -0.58) };

        // 2. Sniper Rifle (Marksman) - High Fidelity Voxel Bolt-Action Overhaul
        const sniperGroup = new THREE.Group();

        // Tactical Composite / Dark Timber Chassis (Full Length Bedding)
        const snChassis = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.076, 0.64), sniperChassisMat);
        snChassis.position.set(0, -0.012, -0.04);
        sniperGroup.add(snChassis);

        // Rear Stock Body & Ergonomic Bridge
        const snStock = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.104, 0.32), sniperChassisMat);
        snStock.position.set(0, -0.008, 0.38);
        sniperGroup.add(snStock);

        // Raised Sniper Cheek Rest Comb (Scoped alignment)
        const cheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.038, 0.18), sniperChassisMat);
        cheekRest.position.set(0, 0.056, 0.38);
        sniperGroup.add(cheekRest);

        // Ribbed Rubber Buttpad with White Spacer
        const snButtpad = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.116, 0.032), rubberMat);
        snButtpad.position.set(0, -0.008, 0.54);
        sniperGroup.add(snButtpad);

        const snSpacer = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.110, 0.008), cuffMat);
        snSpacer.position.set(0, -0.008, 0.522);
        sniperGroup.add(snSpacer);

        // Ergonomic Match Pistol Grip
        const snGrip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.125, 0.068), sniperChassisMat);
        snGrip.position.set(0, -0.088, 0.12);
        snGrip.rotation.x = -0.35;
        sniperGroup.add(snGrip);

        // Steel Trigger Guard & Curved Trigger
        const snTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.048, 0.072), darkSteelMat);
        snTriggerGuard.position.set(0, -0.058, 0.05);
        sniperGroup.add(snTriggerGuard);

        const snTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.026, 0.014), gunmetalMat);
        snTrigger.position.set(0, -0.048, 0.055);
        snTrigger.rotation.x = -0.2;
        sniperGroup.add(snTrigger);

        // Detachable 5-Round Box Magazine
        const snMag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.10, 0.088), darkSteelMat);
        snMag.position.set(0, -0.082, -0.06);
        sniperGroup.add(snMag);

        // Action Receiver (Cylindrical Stamped Housing)
        const snReceiver = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.34, 12), darkSteelMat);
        snReceiver.rotation.x = Math.PI / 2;
        snReceiver.position.set(0, 0.034, 0.02);
        sniperGroup.add(snReceiver);

        // Chrome Bolt Carrier Assembly visible through ejection port
        const chromeBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.28, 12), chromeBoltMat);
        chromeBolt.rotation.x = Math.PI / 2;
        chromeBolt.position.set(0, 0.034, 0.02);
        sniperGroup.add(chromeBolt);

        // Chrome Bolt Handle Stem & Polished Ball Knob
        const boltStem = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.065), chromeBoltMat);
        boltStem.position.set(0.044, 0.016, 0.12);
        boltStem.rotation.z = -0.65;
        sniperGroup.add(boltStem);

        const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), chromeBoltMat);
        boltKnob.position.set(0.078, 0.002, 0.12);
        sniperGroup.add(boltKnob);

        // Machined Picatinny Optics Rail
        const snRail = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.014, 0.32), darkSteelMat);
        snRail.position.set(0, 0.068, 0.02);
        sniperGroup.add(snRail);

        // Match Bull Barrel Assembly (Stepped shank + fluted barrel)
        const barrelShank = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.14, 10), darkSteelMat);
        barrelShank.rotation.x = Math.PI / 2;
        barrelShank.position.set(0, 0.034, -0.22);
        sniperGroup.add(barrelShank);

        const snBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.58, 10), gunmetalMat);
        snBarrel.rotation.x = Math.PI / 2;
        snBarrel.position.set(0, 0.034, -0.56);
        sniperGroup.add(snBarrel);

        // Barrel Longitudinal Fluting Ribs
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const flute = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.44), darkSteelMat);
            flute.position.set(Math.cos(angle) * 0.016, 0.034 + Math.sin(angle) * 0.016, -0.56);
            sniperGroup.add(flute);
        }

        // Tactical 3-Port Muzzle Brake / Compensator
        const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.034, 0.08), darkSteelMat);
        muzzleBrake.position.set(0, 0.034, -0.87);
        sniperGroup.add(muzzleBrake);

        // Side ports
        const portL = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.014, 0.02), rubberMat);
        portL.position.set(0, 0.034, -0.86);
        sniperGroup.add(portL);
        const portR = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.014, 0.02), rubberMat);
        portR.position.set(0, 0.034, -0.89);
        sniperGroup.add(portR);

        // High-Power Telescopic Tactical Scope
        const scopeRoot = new THREE.Group();
        scopeRoot.position.set(0, 0.108, 0.02);

        // Dual heavy ring mounts
        const ringRear = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.048, 0.032), gunmetalMat);
        ringRear.position.set(0, -0.014, 0.08);
        scopeRoot.add(ringRear);

        const ringFront = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.048, 0.032), gunmetalMat);
        ringFront.position.set(0, -0.014, -0.08);
        scopeRoot.add(ringFront);

        // Main 30mm tube
        const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.30, 14), darkSteelMat);
        scopeTube.rotation.x = Math.PI / 2;
        scopeRoot.add(scopeTube);

        // Rear Ocular Bell & Ribbed Rubber Eye Cup
        const ocularBell = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.09, 14), darkSteelMat);
        ocularBell.rotation.x = Math.PI / 2;
        ocularBell.position.set(0, 0, 0.18);
        scopeRoot.add(ocularBell);

        const eyeCup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.024, 14), rubberMat);
        eyeCup.rotation.x = Math.PI / 2;
        eyeCup.position.set(0, 0, 0.23);
        scopeRoot.add(eyeCup);

        // Forward Flared Objective Cone & Sunshade
        const objectiveCone = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.026, 0.13, 14), darkSteelMat);
        objectiveCone.rotation.x = Math.PI / 2;
        objectiveCone.position.set(0, 0, -0.19);
        scopeRoot.add(objectiveCone);

        // Luminous Anti-Reflective Front Lens
        const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.038, 16), scopeLensMat);
        frontLens.position.set(0, 0, -0.256);
        frontLens.rotation.y = Math.PI;
        scopeRoot.add(frontLens);

        // Precision Target Turrets (Elevation + Windage) with Brass Rings
        const elevTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 10), darkSteelMat);
        elevTurret.position.set(0, 0.028, 0);
        scopeRoot.add(elevTurret);
        const elevRing = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.008, 10), brassMat);
        elevRing.position.set(0, 0.022, 0);
        scopeRoot.add(elevRing);

        const windTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 10), darkSteelMat);
        windTurret.rotation.z = Math.PI / 2;
        windTurret.position.set(0.028, 0, 0);
        scopeRoot.add(windTurret);
        const windRing = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.008, 10), brassMat);
        windRing.rotation.z = Math.PI / 2;
        windRing.position.set(0.022, 0, 0);
        scopeRoot.add(windRing);

        sniperGroup.add(scopeRoot);

        // Folded Tactical Bipod under forend
        const bipodBlock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.028, 0.048), darkSteelMat);
        bipodBlock.position.set(0, -0.042, -0.32);
        sniperGroup.add(bipodBlock);

        const bipodLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.28, 6), darkSteelMat);
        bipodLegL.rotation.x = Math.PI / 2;
        bipodLegL.position.set(-0.024, -0.042, -0.18);
        sniperGroup.add(bipodLegL);
        const bipodFootL = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.026, 8), rubberMat);
        bipodFootL.rotation.x = Math.PI / 2;
        bipodFootL.position.set(-0.024, -0.042, -0.04);
        sniperGroup.add(bipodFootL);

        const bipodLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.28, 6), darkSteelMat);
        bipodLegR.rotation.x = Math.PI / 2;
        bipodLegR.position.set(0.024, -0.042, -0.18);
        sniperGroup.add(bipodLegR);
        const bipodFootR = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.026, 8), rubberMat);
        bipodFootR.rotation.x = Math.PI / 2;
        bipodFootR.position.set(0.024, -0.042, -0.04);
        sniperGroup.add(bipodFootR);

        // Character Arms
        sniperGroup.add(buildStrikerArms('sniper'));
        this.viewmodelRoot.add(sniperGroup);
        this.weaponMeshes.sniper = { root: sniperGroup, mag: snMag, muzzlePos: new THREE.Vector3(0, 0.034, -0.92) };

        // 3. SMG (Skirmisher) - MP5 / UMP-45 Inspired Tactical Submachine Gun Overhaul
        const smgGroup = new THREE.Group();

        // Stamped Steel Upper Receiver with Fire Selector Pictograms & Markings
        const smgReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.086, 0.36), smgReceiverMat);
        smgReceiver.position.set(0, 0, 0);
        smgGroup.add(smgReceiver);

        // Cylindrical Top Cocking Tube
        const smgCockingTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.36, 12), darkSteelMat);
        smgCockingTube.rotation.x = Math.PI / 2;
        smgCockingTube.position.set(0, 0.046, -0.04);
        smgGroup.add(smgCockingTube);

        // Iconic HK Cocking / Charging Handle (Turned Up into Detent Notch)
        const smgChargingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.038, 0.024), darkSteelMat);
        smgChargingHandle.position.set(-0.034, 0.062, -0.16);
        smgChargingHandle.rotation.z = 0.55;
        smgGroup.add(smgChargingHandle);

        const handleKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.022, 8), rubberMat);
        handleKnob.rotation.z = Math.PI / 2;
        handleKnob.position.set(-0.048, 0.076, -0.16);
        smgGroup.add(handleKnob);

        // Ejection Port & Brass Deflector (Right Side)
        const smgEjectionPort = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.036, 0.12), darkSteelMat);
        smgEjectionPort.position.set(0.028, 0.014, -0.02);
        smgGroup.add(smgEjectionPort);

        // Lower Receiver Housing & Trigger Group
        const smgLower = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.065, 0.22), rubberMat);
        smgLower.position.set(0, -0.052, 0.04);
        smgGroup.add(smgLower);

        const smgTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.048, 0.068), darkSteelMat);
        smgTriggerGuard.position.set(0, -0.082, 0.05);
        smgGroup.add(smgTriggerGuard);

        const smgTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.012), gunmetalMat);
        smgTrigger.position.set(0, -0.072, 0.055);
        smgTrigger.rotation.x = -0.22;
        smgGroup.add(smgTrigger);

        // Ergonomic Polymer Pistol Grip with Backstrap Rake
        const smgPistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.12, 0.068), rubberMat);
        smgPistolGrip.position.set(0, -0.118, 0.09);
        smgPistolGrip.rotation.x = -0.32;
        smgGroup.add(smgPistolGrip);

        // Vented Tactical Polymer Handguard around barrel
        const smgHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.078, 0.22), rubberMat);
        smgHandguard.position.set(0, 0.006, -0.22);
        smgGroup.add(smgHandguard);

        // Handguard Heat Ventilation Slots
        for (let i = 0; i < 3; i++) {
            const zSlot = -0.16 - i * 0.048;
            const ventL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.028), darkSteelMat);
            ventL.position.set(-0.032, 0.012, zSlot);
            smgGroup.add(ventL);
            const ventR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.028), darkSteelMat);
            ventR.position.set(0.032, 0.012, zSlot);
            smgGroup.add(ventR);
        }

        // Picatinny Accessory Lower Rail
        const smgRail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.18), darkSteelMat);
        smgRail.position.set(0, -0.038, -0.22);
        smgGroup.add(smgRail);

        // Vertical Tactical Stubby Foregrip with Ribs
        const smgForegrip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.095, 0.044), rubberMat);
        smgForegrip.position.set(0, -0.088, -0.22);
        smgGroup.add(smgForegrip);

        for (let r = 0; r < 3; r++) {
            const rib = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.010, 0.046), darkSteelMat);
            rib.position.set(0, -0.065 - r * 0.024, -0.22);
            smgGroup.add(rib);
        }

        // Curved 30-Round 9mm Banana Magazine
        const smgMagWell = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.052, 0.082), darkSteelMat);
        smgMagWell.position.set(0, -0.052, -0.06);
        smgGroup.add(smgMagWell);

        const smgMag = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.22, 0.066), darkSteelMat);
        smgMag.position.set(0, -0.142, -0.04);
        smgMag.rotation.x = -0.22;
        smgGroup.add(smgMag);

        const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.016, 0.074), rubberMat);
        magBase.position.set(0, -0.245, -0.015);
        magBase.rotation.x = -0.22;
        smgGroup.add(magBase);

        // Machined Tri-Lug Barrel & Slotted Birdcage Flash Hider
        const smgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 10), darkSteelMat);
        smgBarrel.rotation.x = Math.PI / 2;
        smgBarrel.position.set(0, 0.012, -0.38);
        smgGroup.add(smgBarrel);

        const smgFlashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.055, 10), gunmetalMat);
        smgFlashHider.rotation.x = Math.PI / 2;
        smgFlashHider.position.set(0, 0.012, -0.47);
        smgGroup.add(smgFlashHider);

        // Iconic Hooded Circular Front Sight
        const hoodGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.016, 12, 1, true);
        const sightHood = new THREE.Mesh(hoodGeo, darkSteelMat);
        sightHood.rotation.x = Math.PI / 2;
        sightHood.position.set(0, 0.062, -0.38);
        smgGroup.add(sightHood);

        const sightPost = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.022, 0.008), cyanTrimMat);
        sightPost.position.set(0, 0.056, -0.38);
        smgGroup.add(sightPost);

        // Rear Rotary Diopter Drum Sight
        const rearDiopter = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 10), darkSteelMat);
        rearDiopter.position.set(0, 0.052, 0.10);
        smgGroup.add(rearDiopter);

        // Retractable Tactical Wire Stock (Collapsed Struts & Buttpad)
        const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.26), darkSteelMat);
        strutL.position.set(-0.034, 0.01, 0.10);
        smgGroup.add(strutL);

        const strutR = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.26), darkSteelMat);
        strutR.position.set(0.034, 0.01, 0.10);
        smgGroup.add(strutR);

        const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.096, 0.026), rubberMat);
        buttPad.position.set(0, 0.01, 0.23);
        smgGroup.add(buttPad);

        // Character Arms (Holding foregrip + pistol grip)
        smgGroup.add(buildStrikerArms('smg'));
        this.viewmodelRoot.add(smgGroup);
        this.weaponMeshes.smg = { root: smgGroup, mag: smgMag, muzzlePos: new THREE.Vector3(0, 0.012, -0.50) };

        // 4. Tactical Magnum Revolver (Enforcer) - Heavy Hand Cannon Overhaul
        const revGroup = new THREE.Group();

        // Solid Magnum Steel Frame with Brushed Sheen & Top Strap
        const revFrame = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.088, 0.24), revolverSteelMat);
        revGroup.add(revFrame);

        // Top strap sight channel
        const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.022, 0.22), darkSteelMat);
        topStrap.position.set(0, 0.048, -0.01);
        revGroup.add(topStrap);

        // Rear Sight Notch (Square target notch with white outline)
        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, 0.018), darkSteelMat);
        rearSight.position.set(0, 0.054, 0.08);
        revGroup.add(rearSight);

        // Cylinder Assembly with 6 Fluted Titanium Chambers & Visible Brass Cartridges
        const revCylinderGroup = new THREE.Group();
        revCylinderGroup.position.set(0, 0.006, -0.015);

        const revCylinderBody = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.118, 16), titaniumMat);
        revCylinderBody.rotation.x = Math.PI / 2;
        revCylinderGroup.add(revCylinderBody);

        // 6 deep flutes & visible gold brass cartridge rims at the rear
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const xPos = Math.cos(angle) * 0.027;
            const yPos = Math.sin(angle) * 0.027;

            // Fluted scallop groove
            const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.120, 8), darkSteelMat);
            flute.rotation.x = Math.PI / 2;
            flute.position.set(xPos, yPos, 0);
            revCylinderGroup.add(flute);

            // Gold brass cartridge case rim at rear of cylinder
            const brassCase = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.014, 10), brassMat);
            brassCase.rotation.x = Math.PI / 2;
            brassCase.position.set(xPos, yPos, 0.058);
            revCylinderGroup.add(brassCase);

            // Nickel center primer
            const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.016, 8), titaniumMat);
            primer.rotation.x = Math.PI / 2;
            primer.position.set(xPos, yPos, 0.059);
            revCylinderGroup.add(primer);
        }
        revGroup.add(revCylinderGroup);

        // Center crane / cylinder yoke assembly
        const cylinderCrane = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.038, 0.048), darkSteelMat);
        cylinderCrane.position.set(0, -0.026, -0.04);
        revGroup.add(cylinderCrane);

        // Heavy Match Bull Barrel with Full Underlug
        const revBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.058, 0.30), revolverSteelMat);
        revBarrel.position.set(0, 0.016, -0.24);
        revGroup.add(revBarrel);

        // Full-length underlug shroud housing ejector rod
        const revUnderlug = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.034, 0.28), revolverSteelMat);
        revUnderlug.position.set(0, -0.024, -0.23);
        revGroup.add(revUnderlug);

        // Knurled ejector rod tip protruding in front of cylinder
        const ejectorRod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), darkSteelMat);
        ejectorRod.rotation.x = Math.PI / 2;
        ejectorRod.position.set(0, -0.018, -0.14);
        revGroup.add(ejectorRod);

        // Ventilated Top Barrel Rib with 3 Open Cooling Slots
        const revRib = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.016, 0.28), darkSteelMat);
        revRib.position.set(0, 0.052, -0.23);
        revGroup.add(revRib);

        for (let s = 0; s < 3; s++) {
            const ribSlot = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.014, 0.048), gunmetalMat);
            ribSlot.position.set(0, 0.050, -0.15 - s * 0.08);
            revGroup.add(ribSlot);
        }

        // High-Visibility Fluorescent Orange Front Fiber Optic Sight Blade
        const frontSightRamp = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.028, 0.052), darkSteelMat);
        frontSightRamp.position.set(0, 0.058, -0.36);
        revGroup.add(frontSightRamp);

        const frontBlade = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.020, 0.036), opticOrangeMat);
        frontBlade.position.set(0, 0.066, -0.365);
        revGroup.add(frontBlade);

        // Wide Target Spur Hammer (Cocked with serrated thumb spur)
        const revHammer = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.044, 0.036), darkSteelMat);
        revHammer.position.set(0, 0.046, 0.11);
        revHammer.rotation.x = -0.42;
        revGroup.add(revHammer);

        const hammerSpur = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.024), titaniumMat);
        hammerSpur.position.set(0, 0.062, 0.126);
        hammerSpur.rotation.x = -0.42;
        revGroup.add(hammerSpur);

        // Combat Trigger Guard & Smooth Face Trigger
        const revTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.052, 0.072), darkSteelMat);
        revTriggerGuard.position.set(0, -0.052, 0.01);
        revGroup.add(revTriggerGuard);

        const revTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.028, 0.014), titaniumMat);
        revTrigger.position.set(0, -0.044, 0.018);
        revTrigger.rotation.x = -0.25;
        revGroup.add(revTrigger);

        // Custom Sculpted Walnut Combat Grip with Finger Grooves & Gold Medallion
        const revGrip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.142, 0.078), walnutGripMat);
        revGrip.position.set(0, -0.096, 0.09);
        revGrip.rotation.x = -0.36;
        revGroup.add(revGrip);

        // 3 Finger Grooves on Front of Grip
        for (let g = 0; g < 3; g++) {
            const groove = new THREE.Mesh(new THREE.BoxGeometry(0.049, 0.018, 0.014), woodMat);
            groove.position.set(0, -0.068 - g * 0.032, 0.062 + g * 0.014);
            groove.rotation.x = -0.36;
            revGroup.add(groove);
        }

        // Gold Medallion Seal Embedded on Grip
        const goldMedallion = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.050, 12), brassMat);
        goldMedallion.rotation.z = Math.PI / 2;
        goldMedallion.position.set(0, -0.096, 0.09);
        revGroup.add(goldMedallion);

        // Two-Handed Stance Arms
        revGroup.add(buildStrikerArms('revolver'));
        this.viewmodelRoot.add(revGroup);
        this.weaponMeshes.revolver = {
            root: revGroup,
            cylinder: revCylinderGroup,
            mag: null,
            muzzlePos: new THREE.Vector3(0, 0.016, -0.40)
        };

        // 5. Double-Barrel Shotgun (Breacher) - Heavy Voxel Coach Gun Hierarchy
        const shotgunGroup = new THREE.Group();

        // Heavy Machined Tactical Steel Receiver
        const shReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.088, 0.20), gunmetalMat);
        shReceiver.position.set(0, 0.005, 0.02);
        shotgunGroup.add(shReceiver);

        // Engraved Side Plates
        const shSidePlateL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.076, 0.16), darkSteelMat);
        shSidePlateL.position.set(-0.031, 0.005, 0.02);
        shotgunGroup.add(shSidePlateL);

        const shSidePlateR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.076, 0.16), darkSteelMat);
        shSidePlateR.position.set(0.031, 0.005, 0.02);
        shotgunGroup.add(shSidePlateR);

        // Break-Action Hinge Pivot Pin
        const shHingePin = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.068, 12), chromeBoltMat);
        shHingePin.rotation.z = Math.PI / 2;
        shHingePin.position.set(0, -0.024, -0.06);
        shotgunGroup.add(shHingePin);

        // Top Tang Break Lever (Turned to unlock)
        const shBreakLever = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.048), darkSteelMat);
        shBreakLever.position.set(0.008, 0.054, 0.04);
        shBreakLever.rotation.y = 0.25;
        shotgunGroup.add(shBreakLever);

        const shBreakKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.016, 8), brassMat);
        shBreakKnob.position.set(0.014, 0.062, 0.058);
        shotgunGroup.add(shBreakKnob);

        // Tang Safety Slide Switch
        const shSafetySwitch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.010, 0.022), titaniumMat);
        shSafetySwitch.position.set(0, 0.052, 0.09);
        shotgunGroup.add(shSafetySwitch);

        // Heavy Trigger Guard & Twin Brass Triggers
        const shTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.052, 0.076), darkSteelMat);
        shTriggerGuard.position.set(0, -0.052, 0.03);
        shotgunGroup.add(shTriggerGuard);

        const shTrigger1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.012), brassMat);
        shTrigger1.position.set(0, -0.045, 0.042);
        shTrigger1.rotation.x = -0.25;
        shotgunGroup.add(shTrigger1);

        const shTrigger2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.012), brassMat);
        shTrigger2.position.set(0, -0.043, 0.020);
        shTrigger2.rotation.x = -0.25;
        shotgunGroup.add(shTrigger2);

        // Twin Blued Steel Barrels (Side-by-Side Breacher)
        // Solid Monobloc barrel junction collar
        const shMonobloc = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.046, 0.08), gunmetalMat);
        shMonobloc.position.set(0, 0.018, -0.11);
        shotgunGroup.add(shMonobloc);

        // Left barrel
        const shBarrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.36, 12), darkSteelMat);
        shBarrelL.rotation.x = Math.PI / 2;
        shBarrelL.position.set(-0.018, 0.018, -0.26);
        shotgunGroup.add(shBarrelL);

        // Right barrel
        const shBarrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.36, 12), darkSteelMat);
        shBarrelR.rotation.x = Math.PI / 2;
        shBarrelR.position.set(0.018, 0.018, -0.26);
        shotgunGroup.add(shBarrelR);

        // Dark hollow bore recesses at muzzle tip
        const shBoreL = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 12), rubberMat);
        shBoreL.rotation.x = Math.PI / 2;
        shBoreL.position.set(-0.018, 0.018, -0.435);
        shotgunGroup.add(shBoreL);

        const shBoreR = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 12), rubberMat);
        shBoreR.rotation.x = Math.PI / 2;
        shBoreR.position.set(0.018, 0.018, -0.435);
        shotgunGroup.add(shBoreR);

        // Ventilated Top Rib
        const shRib = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.34), gunmetalMat);
        shRib.position.set(0, 0.035, -0.26);
        shotgunGroup.add(shRib);

        for (let s = 0; s < 3; s++) {
            const shSlot = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.008, 0.035), darkSteelMat);
            shSlot.position.set(0, 0.038, -0.16 - s * 0.08);
            shotgunGroup.add(shSlot);
        }

        // Brass Bead Front Sight
        const shBead = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), brassMat);
        shBead.position.set(0, 0.044, -0.428);
        shotgunGroup.add(shBead);

        // Chunky Tactical Forend Underneath Barrels
        const shForend = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.052, 0.20), woodMat);
        shForend.position.set(0, -0.016, -0.18);
        shotgunGroup.add(shForend);

        const shForendIron = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.012, 0.16), darkSteelMat);
        shForendIron.position.set(0, -0.040, -0.18);
        shotgunGroup.add(shForendIron);

        const shForendCheckL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.024, 0.14), walnutGripMat);
        shForendCheckL.position.set(-0.031, -0.014, -0.18);
        shotgunGroup.add(shForendCheckL);

        const shForendCheckR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.024, 0.14), walnutGripMat);
        shForendCheckR.position.set(0.031, -0.014, -0.18);
        shotgunGroup.add(shForendCheckR);

        // Polished Walnut Tactical Stock
        const shStockWrist = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.108, 0.14), woodMat);
        shStockWrist.position.set(0, -0.048, 0.14);
        shStockWrist.rotation.x = -0.32;
        shotgunGroup.add(shStockWrist);

        const shStockBody = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.116, 0.24), woodMat);
        shStockBody.position.set(0, -0.030, 0.28);
        shotgunGroup.add(shStockBody);

        const shCheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.036, 0.16), woodMat);
        shCheekRest.position.set(0, 0.038, 0.27);
        shotgunGroup.add(shCheekRest);

        const shSpacer = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.120, 0.008), cuffMat);
        shSpacer.position.set(0, -0.030, 0.402);
        shotgunGroup.add(shSpacer);

        const shButtpad = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.124, 0.034), rubberMat);
        shButtpad.position.set(0, -0.030, 0.42);
        shotgunGroup.add(shButtpad);

        // Striker Character Arms
        shotgunGroup.add(buildStrikerArms('shotgun'));
        this.viewmodelRoot.add(shotgunGroup);
        this.weaponMeshes.shotgun = {
            root: shotgunGroup,
            mag: null,
            muzzlePos: new THREE.Vector3(0, 0.018, -0.44)
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

    calculateDamage(weaponKey, distance, isHeadshot) {
        if (weaponKey === 'ar') {
            // Base Body Damage: 28 HP
            // Headshot Multiplier: 1.90 (Math.round(28 * 1.90) = 53 HP). (2 headshots = 106 HP -> KILL)
            return isHeadshot ? Math.round(28 * 1.90) : 28;
        }

        if (weaponKey === 'shotgun') {
            // Per pellet damage based on distance d (meters) - Scaled 3-4x for realistic combat distance:
            // Point Blank (d < 8m): Base damage 14 per pellet (8 * 14 = 112 body -> 1-shot kill)
            // Close Quarters (8m <= d <= 18m): Base damage 7 per pellet (8 * 7 = 56 body, 8 * 14 = 112 headshot)
            // Mid/Long Range (d > 18m): Exponential decay factor: factor = e^(-0.12 * (d - 18))
            // Base pellet damage = max(1, round(7 * factor)). If headshot, multiplier 2.0.
            let basePelletDmg = 7;
            if (distance < 8.0) {
                basePelletDmg = 14;
            } else if (distance <= 18.0) {
                basePelletDmg = 7;
            } else {
                const factor = Math.exp(-0.12 * (distance - 18.0));
                basePelletDmg = Math.max(1, Math.round(7 * factor));
            }
            return isHeadshot ? Math.round(basePelletDmg * 2.0) : basePelletDmg;
        }

        if (weaponKey === 'revolver') {
            // Base Body Damage: 68 HP (2 body shots to kill)
            // Headshot Multiplier: 1.60 -> Math.round(68 * 1.60) = 109 HP
            // Zero headshot damage falloff at any distance (any headshot deals >= 100 HP -> 1-shot kill)
            return isHeadshot ? Math.round(68 * 1.60) : 68;
        }

        if (weaponKey === 'sniper') {
            // Base Body Damage (d <= 35m): 105 HP -> 1-shot body kill
            // Falloff (d > 35m): Body shot damage drops to 85 HP (leaves 15 HP)
            // Headshot Multiplier: 1.80 (Deals 153+ HP at all distances -> 1-shot headshot at any distance)
            const baseDmg = distance <= 35.0 ? 105 : 85;
            return isHeadshot ? Math.round(baseDmg * 1.80) : baseDmg;
        }

        if (weaponKey === 'smg') {
            // Base Damage (d <= 15m): 18 HP
            // Falloff (d > 20m): Rapid linear drop from 18 at 20m to 7 at 30m+, min 7 HP
            // Headshot multiplier: 1.4 (round(dmg * 1.4))
            let dmg = 18;
            if (distance > 20.0) {
                const t = Math.min(1.0, (distance - 20.0) / 10.0);
                dmg = Math.max(7, Math.round(18.0 - 11.0 * t));
            }
            return isHeadshot ? Math.round(dmg * 1.4) : dmg;
        }

        const weapon = this.weapons[weaponKey] || this.currentWeapon;
        return Math.round(weapon.damage * (isHeadshot ? weapon.headshotMult : 1.0));
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

        this.audio.playShoot(this.currentWeapon.id);

        // Low-ammo tactical warning: subtle tactile click when reaching last 25% of magazine
        const lowAmmoThreshold = Math.ceil(this.currentWeapon.magSize * 0.25);
        if (ammo.clip <= lowAmmoThreshold && ammo.clip > 0) {
            if (this.audio && typeof this.audio.playLowAmmoWarning === 'function') {
                this.audio.playLowAmmoWarning(ammo.clip, lowAmmoThreshold);
            }
        }

        this.recoilSpring.z += this.currentWeapon.recoilKick;
        this.recoilRot.x += this.currentWeapon.recoilPitch;
        this.particles.addTrauma(this.currentWeapon.recoilPitch * 1.4);

        if (window.uiManager) window.uiManager.expandCrosshair();

        const isHyper = !!(this.player && this.player.boosters && this.player.boosters.damage > 0);
        this.flashTimer = 0.045;
        this.muzzleLight.intensity = isHyper ? 4.5 : 2.8;
        this.muzzleLight.color.setHex(isHyper ? 0xff0044 : 0xffea78);
        this.muzzleFlashGroup.visible = true;
        const activeMuzzle = this.weaponMeshes[this.currentWeaponKey].muzzlePos;
        this.muzzleFlashGroup.position.copy(activeMuzzle);
        this.muzzleLight.position.copy(activeMuzzle);

        this.performRaycast();

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
                        this.camera.getWorldPosition(_camWorld);
                        const dist = _camWorld.distanceTo(hitPos);
                        const pelletDmg = Math.round(this.calculateDamage('shotgun', dist, isHeadshot) * damageMult);

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
            const spread = this.isAiming ? 0 : this.currentWeapon.spread;
            const spreadX = (Math.random() - 0.5) * spread;
            const spreadY = (Math.random() - 0.5) * spread;

            _screenCoords.set(spreadX, spreadY);
            _raycaster.setFromCamera(_screenCoords, this.camera);

            this.ejectShellCasing(_muzzleWorld);

            const hits = _raycaster.intersectObjects(candidateMeshes, false);
            const validHit = hits.length > 0 ? hits[0] : null;
            const hitPos = validHit ? validHit.point : _tempVec.copy(_raycaster.ray.origin).addScaledVector(_raycaster.ray.direction, 150);

            const defaultTracer = this.currentWeaponKey === 'sniper' ? 0xff3355 : (this.currentWeaponKey === 'revolver' ? 0xffaa22 : 0x00ffcc);
            const tracerColor = isHyper ? 0xff0033 : defaultTracer;
            this.particles.createTracer(_muzzleWorld, hitPos, tracerColor);

            if (validHit) {
                const hitObject = validHit.object;
                const botData = botHitboxes.find(b => b.mesh === hitObject);

                if (botData) {
                    const isHeadshot = !!botData.isHead;
                    this.camera.getWorldPosition(_camWorld);
                    const dist = _camWorld.distanceTo(hitPos);
                    const damage = Math.round(this.calculateDamage(this.currentWeaponKey, dist, isHeadshot) * damageMult);

                    this.audio.playHit(isHeadshot);
                    this.particles.createHitSplatter(hitPos, isHeadshot);
                    this.particles.addDamageNumber(damage, hitPos, isHeadshot);

                    if (window.uiManager) {
                        window.uiManager.triggerHitmarker(isHeadshot);
                    }

                    botData.bot.takeDamage(damage, this.player, isHeadshot, this.currentWeapon.name);
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

        if (this.isReloading) {
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
            if (sniperOverlay) sniperOverlay.style.display = 'block';
            if (crosshair) crosshair.style.opacity = '0';
            if (activeMeshObj) activeMeshObj.root.visible = false;
        } else {
            if (sniperOverlay) sniperOverlay.style.display = 'none';
            if (crosshair) crosshair.style.opacity = this.isAiming ? '0.15' : '1.0';
            if (activeMeshObj) activeMeshObj.root.visible = true;
        }
    }
}

window.WeaponSystem = WeaponSystem;
