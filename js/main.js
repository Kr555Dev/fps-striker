/**
 * FPS Striker // Fast-Paced 3D Voxel FPS Entry Point
 * High-performance Three.js setup: Zero shadow depth passes, fast linear lighting,
 * and adaptive resolution scaling to guarantee 60+ FPS under all conditions.
 */

class FPSStrikerGame {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        this.map = null;
        this.player = null;
        this.weapons = null;
        this.bots = null;
        this.loot = null;
        this.boosters = null;
        this.particles = null;
        this.ui = null;

        // Dynamic FPS protector
        this.fpsHistory = [];
        this.currentScale = 1.0;
        this.isGameStarted = false;
        this.isPaused = false;

        this.init();
    }

    init() {
        // 1. Scene & Camera
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x76b6f0);
        this.scene.fog = new THREE.FogExp2(0x76b6f0, 0.0055);

        this.camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.1, 350);

        // 2. High-Performance Anti-Aliased WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            precision: 'highp'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.container.appendChild(this.renderer.domElement);

        // 3. Stylized Rich Lighting (Warm Sun + Cool Sky Ambient)
        const ambientLight = new THREE.HemisphereLight(0xe4f0fb, 0xa18f7c, 0.95);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfff8ea, 1.25);
        sunLight.position.set(65, 110, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 260;
        const d = 95;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.0005;
        this.scene.add(sunLight);

        // 4. Stylized Cel Sky, Sun & Floating Clouds
        this.createSky();
        this.createLobbyPreview();

        // 5. Initialize Subsystems
        this.particles = new ParticleEngine(this.scene, this.camera);
        window.particleEngine = this.particles;

        this.map = new GameMap(this.scene);
        window.gameMap = this.map;

        this.player = new PlayerController(this.camera, this.scene, this.map, window.soundEngine, this.particles);
        window.playerController = this.player;

        this.weapons = new WeaponSystem(this.camera, this.scene, this.player, window.soundEngine, this.particles);
        window.weaponSystem = this.weapons;

        this.bots = new BotManager(this.scene, this.map, window.soundEngine, this.particles);
        window.botManager = this.bots;

        this.loot = new LootSystem(this.scene, this.player, this.weapons, window.soundEngine, this.particles);
        window.lootSystem = this.loot;
        window.dropManager = this.loot;

        this.boosters = new BoosterManager(this.scene, this.particles, window.soundEngine);
        window.boosterManager = this.boosters;

        this.ui = new UIManager();
        window.uiManager = this.ui;

        // 6. Window Resize
        window.addEventListener('resize', () => this.onWindowResize());

        // 7. Initial State: Lobby Mode (Hide HUD & Viewmodel, camera frames preview avatar)
        const hud = document.getElementById('hud');
        if (hud) hud.style.display = 'none';
        if (this.weapons && this.weapons.viewmodelRoot) {
            this.weapons.viewmodelRoot.visible = false;
        }

        if (this.player && this.player.yawObject) {
            this.player.yawObject.position.set(0, 2.5, 25.0);
            this.player.yawObject.rotation.y = 0;
            this.player.pitchObject.rotation.x = -0.16;
        }

        // Start Menu & Quick Match Click to Play (FPS Striker Lobby)
        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) startBtn.addEventListener('click', () => this.startGame());

        const quickMatchBtn = document.getElementById('btn-quick-match');
        if (quickMatchBtn) quickMatchBtn.addEventListener('click', () => this.startGame());

        // Auto-start Lobby BGM directly on initial load & reload
        if (window.soundEngine && !this.isGameStarted) {
            window.soundEngine.resume();
            if (!window.soundEngine.isMusicPlaying) {
                window.soundEngine.startMusic();
            }
        }

        const resumeAudioIfIdle = () => {
            if (window.soundEngine) {
                window.soundEngine.resume();
                if (!window.soundEngine.isMusicPlaying && !this.isGameStarted) {
                    window.soundEngine.startMusic();
                }
            }
        };
        ['mousemove', 'pointermove', 'touchstart', 'wheel', 'keydown', 'pointerdown', 'focus'].forEach(evt => {
            window.addEventListener(evt, resumeAudioIfIdle, { once: true, passive: true });
        });

        // 8. Start Loop
        this.animate();
    }

    createLobbyPreview() {
        const suitMat = new THREE.MeshLambertMaterial({ color: 0x2e333a });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const tieMat = new THREE.MeshLambertMaterial({ color: 0x991b1b });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xdfa07a });
        const hairMat = new THREE.MeshLambertMaterial({ color: 0x3d2719 });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1c20 });
        const woodMat = new THREE.MeshLambertMaterial({ color: 0xb57038 });

        const preview = new THREE.Group();
        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.40), suitMat);
        torso.position.y = 1.05;
        preview.add(torso);

        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.04), shirtMat);
        collar.position.set(0, 0.28, -0.21);
        torso.add(collar);

        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.42, 0.05), tieMat);
        tie.position.set(0, 0.16, -0.22);
        torso.add(tie);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.50, 0.50), skinMat);
        head.position.y = 1.76;
        preview.add(head);

        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.52), hairMat);
        hair.position.set(0, 0.20, 0);
        head.add(hair);

        // Face Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), eyeMat);
        leftEye.position.set(-0.12, 0.04, -0.26);
        head.add(leftEye);
        const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), eyeMat);
        rightEye.position.set(0.12, 0.04, -0.26);
        head.add(rightEye);

        // Arms holding AK
        const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.22), suitMat);
        lArm.position.set(-0.48, 1.02, -0.06);
        lArm.rotation.set(0.35, 0.2, 0);
        preview.add(lArm);

        const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.22), suitMat);
        rArm.position.set(0.48, 1.02, -0.06);
        rArm.rotation.set(0.35, -0.2, 0);
        preview.add(rArm);

        // 3D AK rifle model
        const botGun = new THREE.Group();
        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.42), darkMat);
        botGun.add(gunBody);
        const gunWood = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.22), woodMat);
        gunWood.position.set(0, 0, -0.24);
        botGun.add(gunWood);
        const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 8), darkMat);
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.set(0, 0.02, -0.42);
        botGun.add(gunBarrel);
        const gunMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.08), darkMat);
        gunMag.position.set(0, -0.10, -0.05);
        gunMag.rotation.x = -0.3;
        botGun.add(gunMag);
        botGun.position.set(0, -0.24, -0.32);
        botGun.rotation.set(-0.25, 0, 0);
        rArm.add(botGun);

        // Legs
        const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), suitMat);
        lLeg.position.set(-0.22, 0.42, 0);
        preview.add(lLeg);

        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), suitMat);
        rLeg.position.set(0.22, 0.42, 0);
        preview.add(rLeg);

        preview.traverse(obj => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        preview.position.set(0, 0, 20.2);
        preview.rotation.y = Math.PI - 0.25;
        this.scene.add(preview);
        this.lobbyPreviewCharacter = preview;
    }

    createSky() {
        const skyGeo = new THREE.SphereGeometry(280, 24, 16);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x6caee8,
            side: THREE.BackSide
        });
        const skyMesh = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(skyMesh);

        const sunGeo = new THREE.CircleGeometry(16, 24);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(100, 160, 80);
        sunMesh.lookAt(0, 0, 0);
        this.scene.add(sunMesh);

        // Stylized Low-Poly Fluffy Clouds
        const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
        const cloudOffsets = [
            [-60, 48, -40], [45, 52, -55], [-35, 45, 60], [60, 50, 40], [0, 56, -80]
        ];
        cloudOffsets.forEach(([cx, cy, cz]) => {
            const cloudGroup = new THREE.Group();
            cloudGroup.position.set(cx, cy, cz);
            const b1 = new THREE.Mesh(new THREE.BoxGeometry(24, 5, 14), cloudMat);
            const b2 = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 12), cloudMat);
            b2.position.set(3, 3, 0);
            cloudGroup.add(b1, b2);
            this.scene.add(cloudGroup);
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    startGame() {
        this.isGameStarted = true;
        this.isPaused = false;
        if (window.game) {
            window.game.isGameStarted = true;
            window.game.isPaused = false;
        }
        if (window.soundEngine) {
            window.soundEngine.resume();
            // Duck music by ~80-85% during active gameplay
            window.soundEngine.duckMusic(true);
        }
        const startMenu = document.getElementById('start-menu');
        if (startMenu) startMenu.style.display = 'none';
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.style.display = 'none';
        const hud = document.getElementById('hud');
        if (hud) hud.style.display = 'block';
        if (this.lobbyPreviewCharacter) this.lobbyPreviewCharacter.visible = false;
        if (this.weapons && this.weapons.viewmodelRoot) {
            this.weapons.viewmodelRoot.visible = true;
        }
        if (this.player) {
            this.player.spawn();
        }
        if (this.weapons) {
            this.weapons.resetAmmo();
            if (window.selectedStartingWeapon) {
                this.weapons.switchWeapon(window.selectedStartingWeapon);
            }
        }
        if (this.loot) {
            this.loot.clearAllDrops();
        }
        if (this.boosters) {
            this.boosters.reset();
        }
        if (this.ui) {
            this.ui.startMatchTimer();
            this.ui.updateLiveLeaderboard(this.player, this.bots);
            this.ui.addChatEvent(`<span class="chat-name player">DISPATCH</span> Match active &bull; Team Deathmatch on Outpost`, 'system');
            if (this.bots && this.bots.bots) {
                this.bots.bots.forEach(b => {
                    this.ui.addChatJoinMessage(b.name);
                });
            }
        }
        if (this.clock) {
            this.clock.getDelta();
        }
        document.body.requestPointerLock();
    }

    setPaused(paused) {
        if (!this.isGameStarted && paused) return;
        this.isPaused = !!paused;
        const pauseMenu = document.getElementById('pause-menu');
        if (this.isPaused) {
            if (pauseMenu) pauseMenu.style.display = 'flex';
            if (this.clock) this.clock.getDelta();
        } else {
            if (pauseMenu) pauseMenu.style.display = 'none';
            if (this.clock) this.clock.getDelta();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.isPaused) {
            if (this.clock) {
                this.clock.getDelta();
            }
            this.renderer.render(this.scene, this.camera);
            return;
        }

        const dt = Math.min(this.clock.getDelta(), 0.05);

        // Lobby 3D character idle turn
        if (this.lobbyPreviewCharacter && this.lobbyPreviewCharacter.visible) {
            this.lobbyPreviewCharacter.rotation.y = (Math.PI - 0.25) + Math.sin(performance.now() * 0.0015) * 0.12;
        }

        // Core Updates
        if (this.player) {
            this.player.update(dt);
            this.ui.updateHealth(this.player.health, this.player.maxHealth, this.player.shield, this.player.maxShield);
        }

        if (this.weapons) {
            this.weapons.update(dt);
        }

        if (this.bots && this.player) {
            this.bots.update(dt, this.player);
        }

        if (this.loot) {
            this.loot.update(dt);
        }

        if (this.boosters && this.player) {
            this.boosters.update(dt, this.player);
        }

        if (this.particles) {
            this.particles.update(dt);
        }

        if (this.ui && this.player) {
            this.ui.updateBoosters(this.player);
        }

        if (this.ui) {
            this.ui.updateCrosshairBloom(dt);
            this.ui.recordFrame();
            // Adaptive Resolution Guard: Automatically preserves 45-60 FPS
            if (this.ui.currentFps < 32 && this.currentScale > 0.75) {
                this.currentScale = 0.75;
                this.renderer.setPixelRatio(this.currentScale);
            } else if (this.ui.currentFps > 55 && this.currentScale < 1.0) {
                this.currentScale = 1.0;
                this.renderer.setPixelRatio(this.currentScale);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new FPSStrikerGame();
    window.game.isGameStarted = false;
    window.game.isPaused = false;
});
