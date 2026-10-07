/**
 * FPS Striker HUD, UI Manager, Scoreboard & Dopamine Feedback Loop
 */

class UIManager {
    constructor() {
        this.hpVal = document.getElementById('hp-val');
        this.hpBarFill = document.getElementById('hp-bar-fill');
        this.ammoCurrent = document.getElementById('ammo-current');
        this.ammoReserve = document.getElementById('ammo-reserve');
        this.ammoStatus = document.getElementById('ammo-status');
        this.ammoNumbers = document.querySelector('.ammo-numbers');
        this.ammoMax = document.getElementById('ammo-max');
        this.ammoTotal = document.getElementById('ammo-total');
        this.weaponName = document.getElementById('weapon-name');
        this.weaponClassTag = document.getElementById('weapon-class-tag');
        this.weaponFiremode = document.getElementById('weapon-firemode');
        this.activeWeaponHud = document.getElementById('active-weapon-hud');
        this.ammoGaugeFill = document.getElementById('ammo-gauge-fill');
        this.currentWeaponId = null;
        this.killfeed = document.getElementById('killfeed');
        this.hitmarker = document.getElementById('hitmarker');
        this.reloadPrompt = document.getElementById('reload-prompt');
        this.lowAmmoAlert = document.getElementById('low-ammo-alert');
        this.noAmmoAlert = document.getElementById('no-ammo-alert');
        this.matchScore = document.getElementById('match-score');
        this.matchTimer = document.getElementById('match-timer');
        this.matchStreak = document.getElementById('match-streak');
        this.deathScreen = document.getElementById('death-screen');
        this.scoreboardModal = document.getElementById('scoreboard-modal');
        this.scoreboardBody = document.getElementById('scoreboard-body');
        this.fpsCounter = document.getElementById('fps-counter');
        this.pingDisplay = document.getElementById('ping-display');
        this.killMedalContainer = document.getElementById('kill-medal-container');
        this.lowHealthOverlay = document.getElementById('low-health-overlay');
        this.currentLowHealthTier = 0; // 0 = none, 1 = moderate, 2 = critical

        this.hitmarkerTimeout = null;
        this.crosshairTimeout = null;
        this.vignetteTimeout = null;
        this.ammoWarningTimeout = null;
        this.matchTimeRemaining = 180;
        this.isMatchEnded = false;
        this.timerInterval = null;

        // FPS & Telemetry tracking
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.currentFps = 60;
        this.currentPing = 28;
        this.lastPingUpdate = performance.now();

        // Dynamic Chat & Event Feed
        this.chatBox = document.getElementById('chat-box');

        // Dynamic Crosshair Bloom State
        this.crosshairEl = document.getElementById('crosshair');
        this.crosshairSpread = 0;
        this.crosshairRecoilImpulse = 0;
        this.lastAppliedSpread = -1;
        this.isCrosshairAds = false;

        this.crosshairModal = document.getElementById('crosshair-customizer-modal');
        this.crosshairPreviewEl = document.getElementById('crosshair-preview');
        this.crosshairModalOrigin = 'lobby';

        this.initSettings();
        this.initCrosshairCustomizer();
        this.initScoreboardModal();
        this.initLobbyInteractions();
        if (this.matchTimer) {
            this.matchTimer.innerText = '03:00';
        }
        this.updateLiveLeaderboard(null, null);
    }

    initSettings() {
        window.gameSettings = {
            fov: 75,
            sensitivity: 0.0022,
            volume: 0.75
        };

        const fovSlider = document.getElementById('setting-fov');
        const fovVal = document.getElementById('setting-fov-val');
        if (fovSlider) {
            fovSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                window.gameSettings.fov = val;
                if (fovVal) fovVal.innerText = val;
            });
        }

        const sensSlider = document.getElementById('setting-sens');
        const sensVal = document.getElementById('setting-sens-val');
        if (sensSlider) {
            sensSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                window.gameSettings.sensitivity = val * 0.001;
                if (sensVal) sensVal.innerText = val.toFixed(1);
                if (window.playerController) window.playerController.sensitivity = window.gameSettings.sensitivity;
            });
        }

        const volSlider = document.getElementById('setting-vol');
        const volVal = document.getElementById('setting-vol-val');
        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                window.gameSettings.volume = val / 100;
                if (volVal) volVal.innerText = `${val}%`;
                if (window.soundEngine) window.soundEngine.setMasterVolume(window.gameSettings.volume);
            });
        }

        const bgmSlider = document.getElementById('setting-bgm');
        const bgmVal = document.getElementById('setting-bgm-val');
        if (bgmSlider) {
            bgmSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                if (bgmVal) bgmVal.innerText = `${val}%`;
                if (window.soundEngine) window.soundEngine.setMusicVolume(val / 100);
            });
        }

        // Tactical Audio Engine Sound Test Buttons
        const audioTestBtns = document.querySelectorAll('.audio-test-btn');
        audioTestBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!window.soundEngine) return;
                window.soundEngine.resume();
                const sound = btn.dataset.sound;
                switch (sound) {
                    case 'ar':
                    case 'sniper':
                    case 'smg':
                    case 'revolver':
                    case 'shotgun':
                        window.soundEngine.playShoot(sound);
                        break;
                    case 'headshot':
                        window.soundEngine.playHit(true);
                        break;
                    case 'hit':
                        window.soundEngine.playHit(false);
                        break;
                    case 'empty':
                        window.soundEngine.playEmptyClick();
                        break;
                    case 'lowammo':
                        window.soundEngine.playLowAmmoWarning(2, 8);
                        break;
                    case 'heartbeat':
                        window.soundEngine.playHeartbeatThud(2);
                        break;
                }
            });
        });

        const respawnBtn = document.getElementById('btn-respawn');
        if (respawnBtn) {
            respawnBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.playerController) window.playerController.respawn();
            });
        }

        // Global Space/Enter immediate respawn when eliminated (zero focus friction)
        window.addEventListener('keydown', (e) => {
            const isEliminated = (window.playerController && window.playerController.isDead) ||
                                 (this.deathScreen && this.deathScreen.style.display === 'flex');
            if (isEliminated && (e.code === 'Space' || e.code === 'Enter')) {
                e.preventDefault();
                e.stopPropagation();
                if (window.playerController) {
                    window.playerController.respawn();
                }
            }
        }, true);

        // Click anywhere on death screen overlay also respawns
        if (this.deathScreen) {
            this.deathScreen.addEventListener('click', () => {
                if (window.playerController && window.playerController.isDead) {
                    window.playerController.respawn();
                }
            });
        }

        const resumeBtn = document.getElementById('btn-resume');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                if (window.game && typeof window.game.setPaused === 'function') {
                    window.game.setPaused(false);
                }
                document.body.requestPointerLock();
            });
        }

        const classBtns = document.querySelectorAll('.hotbar-slot, .loadout-slot');
        classBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const weaponId = e.currentTarget.dataset.slot;
                if (window.weaponSystem) window.weaponSystem.switchWeapon(weaponId);
            });
        });
    }

    loadCrosshairSettings() {
        const defaults = {
            preset: 'cs-pro',
            size: 5,
            gap: 3,
            thick: 2,
            color: '#ffffff',
            dot: false,
            circle: false,
            lines: true
        };
        try {
            const raw = localStorage.getItem('striker_crosshair_settings');
            if (raw) {
                const parsed = JSON.parse(raw);
                return Object.assign({}, defaults, parsed);
            }
        } catch (e) {
            console.warn('Crosshair settings localStorage load error:', e);
        }
        return defaults;
    }

    saveCrosshairSettings() {
        try {
            localStorage.setItem('striker_crosshair_settings', JSON.stringify(this.crosshairSettings));
        } catch (e) {
            console.warn('Crosshair settings localStorage save error:', e);
        }
    }

    applyCrosshairSettings() {
        const s = this.crosshairSettings;
        if (!this.crosshairEl) {
            this.crosshairEl = document.getElementById('crosshair');
        }
        if (!this.crosshairPreviewEl) {
            this.crosshairPreviewEl = document.getElementById('crosshair-preview');
        }

        // Global CSS custom variables
        document.documentElement.style.setProperty('--ch-size', `${s.size}px`);
        document.documentElement.style.setProperty('--ch-gap', `${s.gap}px`);
        document.documentElement.style.setProperty('--ch-thick', `${s.thick}px`);
        document.documentElement.style.setProperty('--ch-color', s.color);
        document.documentElement.style.setProperty('--ch-dot-size', `${Math.max(2, s.thick + 1)}px`);

        const updateReticle = (el) => {
            if (!el) return;
            el.style.setProperty('--ch-size', `${s.size}px`);
            el.style.setProperty('--ch-gap', `${s.gap}px`);
            el.style.setProperty('--ch-thick', `${s.thick}px`);
            el.style.setProperty('--ch-color', s.color);
            el.style.setProperty('--ch-dot-size', `${Math.max(2, s.thick + 1)}px`);

            if (s.lines === false || s.size <= 0) {
                el.classList.add('hide-lines');
            } else {
                el.classList.remove('hide-lines');
            }

            if (s.dot) {
                el.classList.add('has-dot');
            } else {
                el.classList.remove('has-dot');
            }

            if (s.circle) {
                el.classList.add('has-circle');
            } else {
                el.classList.remove('has-circle');
            }
        };

        updateReticle(this.crosshairEl);
        updateReticle(this.crosshairPreviewEl);

        this.syncCrosshairControlsUI();
    }

    syncCrosshairControlsUI() {
        const s = this.crosshairSettings;

        const sizeSlider = document.getElementById('ch-slider-size');
        const sizeVal = document.getElementById('ch-size-val');
        if (sizeSlider && parseInt(sizeSlider.value) !== s.size) sizeSlider.value = s.size;
        if (sizeVal && sizeVal.textContent !== `${s.size}px`) sizeVal.textContent = `${s.size}px`;

        const gapSlider = document.getElementById('ch-slider-gap');
        const gapVal = document.getElementById('ch-gap-val');
        if (gapSlider && parseInt(gapSlider.value) !== s.gap) gapSlider.value = s.gap;
        if (gapVal && gapVal.textContent !== `${s.gap}px`) gapVal.textContent = `${s.gap}px`;

        const thickSlider = document.getElementById('ch-slider-thick');
        const thickVal = document.getElementById('ch-thick-val');
        if (thickSlider && parseInt(thickSlider.value) !== s.thick) thickSlider.value = s.thick;
        if (thickVal && thickVal.textContent !== `${s.thick}px`) thickVal.textContent = `${s.thick}px`;

        const dotCheckbox = document.getElementById('ch-toggle-dot');
        if (dotCheckbox && dotCheckbox.checked !== !!s.dot) dotCheckbox.checked = !!s.dot;

        document.querySelectorAll('.ch-color-btn').forEach(btn => {
            const btnColor = btn.dataset.color;
            if (btnColor && btnColor.toLowerCase() === s.color.toLowerCase()) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        document.querySelectorAll('.ch-preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === s.preset);
        });
    }

    initCrosshairCustomizer() {
        this.crosshairModal = document.getElementById('crosshair-customizer-modal');
        this.crosshairPreviewEl = document.getElementById('crosshair-preview');
        this.crosshairSettings = this.loadCrosshairSettings();
        this.applyCrosshairSettings();

        // 4 Presets definitions
        const presets = {
            'cs-pro': { preset: 'cs-pro', size: 5, gap: 2, thick: 2, color: '#ffffff', dot: false, circle: false, lines: true },
            'dot': { preset: 'dot', size: 0, gap: 0, thick: 2, color: '#00ffcc', dot: true, circle: false, lines: false },
            'cyber-cross': { preset: 'cyber-cross', size: 6, gap: 3, thick: 2, color: '#00ffcc', dot: true, circle: false, lines: true },
            'circle-dot': { preset: 'circle-dot', size: 0, gap: 0, thick: 2, color: '#00ffcc', dot: true, circle: true, lines: false }
        };

        // Preset buttons
        document.querySelectorAll('.ch-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetKey = btn.dataset.preset;
                if (presets[presetKey]) {
                    this.crosshairSettings = Object.assign({}, presets[presetKey]);
                    this.applyCrosshairSettings();
                    this.saveCrosshairSettings();
                    if (window.soundEngine && typeof window.soundEngine.playEmptyClick === 'function') {
                        window.soundEngine.playEmptyClick();
                    }
                }
            });
        });

        // Sliders
        const sizeSlider = document.getElementById('ch-slider-size');
        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                this.crosshairSettings.size = parseInt(e.target.value);
                this.crosshairSettings.lines = this.crosshairSettings.size > 0;
                this.crosshairSettings.circle = false;
                this.crosshairSettings.preset = 'custom';
                this.applyCrosshairSettings();
                this.saveCrosshairSettings();
            });
        }

        const gapSlider = document.getElementById('ch-slider-gap');
        if (gapSlider) {
            gapSlider.addEventListener('input', (e) => {
                this.crosshairSettings.gap = parseInt(e.target.value);
                this.crosshairSettings.preset = 'custom';
                this.applyCrosshairSettings();
                this.saveCrosshairSettings();
            });
        }

        const thickSlider = document.getElementById('ch-slider-thick');
        if (thickSlider) {
            thickSlider.addEventListener('input', (e) => {
                this.crosshairSettings.thick = parseInt(e.target.value);
                this.crosshairSettings.preset = 'custom';
                this.applyCrosshairSettings();
                this.saveCrosshairSettings();
            });
        }

        // Color buttons
        document.querySelectorAll('.ch-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = btn.dataset.color;
                if (color) {
                    this.crosshairSettings.color = color;
                    this.applyCrosshairSettings();
                    this.saveCrosshairSettings();
                    if (window.soundEngine && typeof window.soundEngine.playEmptyClick === 'function') {
                        window.soundEngine.playEmptyClick();
                    }
                }
            });
        });

        // Center dot checkbox
        const dotCheckbox = document.getElementById('ch-toggle-dot');
        if (dotCheckbox) {
            dotCheckbox.addEventListener('change', (e) => {
                this.crosshairSettings.dot = !!e.target.checked;
                this.crosshairSettings.preset = 'custom';
                this.applyCrosshairSettings();
                this.saveCrosshairSettings();
            });
        }

        // Prevent click bleed into game pointer lock
        if (this.crosshairModal) {
            this.crosshairModal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Pause menu crosshair settings button
        const pauseCrosshairBtn = document.getElementById('btn-crosshair-settings');
        if (pauseCrosshairBtn) {
            pauseCrosshairBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openCrosshairModal('pause');
            });
        }

        // Lobby top bar crosshair button
        const lobbyCrosshairBtn = document.getElementById('btn-lobby-crosshair');
        if (lobbyCrosshairBtn) {
            lobbyCrosshairBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openCrosshairModal('lobby');
            });
        }

        // Modal close buttons
        const closeCrosshairBtn = document.getElementById('btn-close-crosshair');
        if (closeCrosshairBtn) {
            closeCrosshairBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeCrosshairModal();
            });
        }

        const closeCrosshairX = document.getElementById('btn-close-crosshair-x');
        if (closeCrosshairX) {
            closeCrosshairX.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeCrosshairModal();
            });
        }

        // Keyboard Escape handler
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.crosshairModal && this.crosshairModal.style.display === 'flex') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeCrosshairModal();
                }
            }
        }, true);
    }

    openCrosshairModal(origin = 'lobby') {
        this.crosshairModalOrigin = origin;
        if (!this.crosshairModal) {
            this.crosshairModal = document.getElementById('crosshair-customizer-modal');
        }
        if (!this.crosshairModal) return;

        if (origin === 'pause') {
            const pauseMenu = document.getElementById('pause-menu');
            if (pauseMenu) pauseMenu.style.display = 'none';
        }

        this.syncCrosshairControlsUI();
        this.crosshairModal.style.display = 'flex';
        if (window.soundEngine && typeof window.soundEngine.playEmptyClick === 'function') {
            window.soundEngine.playEmptyClick();
        }
    }

    closeCrosshairModal() {
        if (!this.crosshairModal) {
            this.crosshairModal = document.getElementById('crosshair-customizer-modal');
        }
        if (this.crosshairModal) {
            this.crosshairModal.style.display = 'none';
        }

        if (window.soundEngine && typeof window.soundEngine.playEmptyClick === 'function') {
            window.soundEngine.playEmptyClick();
        }

        if (this.crosshairModalOrigin === 'pause' && window.game && window.game.isGameStarted) {
            const pauseMenu = document.getElementById('pause-menu');
            if (pauseMenu) {
                pauseMenu.style.display = 'flex';
            }
        }
    }

    initScoreboardModal() {
        // Cross dismiss button
        const closeBtn = document.getElementById('btn-close-scoreboard');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startNewMatch();
            });
        }

        // Restart button
        const restartBtn = document.getElementById('btn-restart-match');
        if (restartBtn) {
            restartBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startNewMatch();
            });
        }

        // Dismiss / Continue button
        const dismissBtn = document.getElementById('btn-dismiss-match');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismissModal();
            });
        }

        // Keyboard handler for modal shortcuts
        window.addEventListener('keydown', (e) => {
            if (this.scoreboardModal && this.scoreboardModal.style.display === 'flex') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    this.startNewMatch();
                } else if (e.code === 'Escape') {
                    e.preventDefault();
                    this.dismissModal();
                }
            }
        });
    }

    initLobbyInteractions() {
        // --- 1. Loadout / Weapon Customization Modal ---
        const openCustomizeBtns = [
            document.getElementById('btn-open-customize'),
            document.getElementById('btn-customize-tag')
        ].filter(Boolean);

        const customizeModal = document.getElementById('customize-modal');
        const closeCustomizeBtn = document.getElementById('btn-close-customize');
        const confirmLoadoutBtn = document.getElementById('btn-confirm-loadout');
        const lobbyClassTitle = document.getElementById('lobby-class-title');
        const lobbyGunName = document.getElementById('lobby-gun-name');

        const classInfo = {
            ar: { title: 'Commando', name: 'Assault Rifle' },
            revolver: { title: 'Enforcer', name: '.357 Magnum' },
            sniper: { title: 'Marksman', name: 'AWM Sniper' },
            smg: { title: 'Infiltrator', name: 'SMG-9' },
            shotgun: { title: 'Vanguard', name: 'Double-Barrel' }
        };

        const openCustomize = (e) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            if (!customizeModal) return;
            customizeModal.style.display = 'flex';
            if (window.soundEngine) window.soundEngine.playEmptyClick();

            // Highlight selected card
            const currentWeapon = window.selectedStartingWeapon || 'ar';
            document.querySelectorAll('#customize-modal .weapon-card').forEach(card => {
                card.classList.toggle('active', card.dataset.weapon === currentWeapon);
            });
        };

        const closeCustomize = (e) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            if (customizeModal) customizeModal.style.display = 'none';
            if (window.soundEngine) window.soundEngine.playEmptyClick();
        };

        openCustomizeBtns.forEach(btn => btn.addEventListener('click', openCustomize));
        if (closeCustomizeBtn) closeCustomizeBtn.addEventListener('click', closeCustomize);
        if (confirmLoadoutBtn) confirmLoadoutBtn.addEventListener('click', closeCustomize);

        // Weapon card selection in modal
        const weaponCards = document.querySelectorAll('#customize-modal .weapon-card');
        weaponCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                const weapon = card.dataset.weapon;
                if (!weapon) return;

                weaponCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                window.selectedStartingWeapon = weapon;
                if (classInfo[weapon]) {
                    if (lobbyClassTitle) lobbyClassTitle.innerText = classInfo[weapon].title;
                    if (lobbyGunName) lobbyGunName.innerText = classInfo[weapon].name;
                }

                // If match is active, equip immediately
                if (window.weaponSystem && window.game && window.game.isGameStarted) {
                    window.weaponSystem.switchWeapon(weapon);
                }

                if (window.soundEngine) {
                    window.soundEngine.resume();
                    window.soundEngine.playSwitch();
                }
            });
        });

        // --- 2. Developer Contact Modal ---
        const contactNavBtn = document.getElementById('nav-contact-btn');
        const contactModal = document.getElementById('contact-modal');
        const closeContactBtn = document.getElementById('btn-close-contact');
        const doneContactBtn = document.getElementById('btn-done-contact');
        const copyEmailBtn = document.getElementById('btn-copy-email-modal');

        const openContact = (e) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            if (contactModal) contactModal.style.display = 'flex';
            if (window.soundEngine) window.soundEngine.playEmptyClick();
        };

        const closeContact = (e) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            if (contactModal) contactModal.style.display = 'none';
            if (window.soundEngine) window.soundEngine.playEmptyClick();
        };

        if (contactNavBtn) contactNavBtn.addEventListener('click', openContact);
        if (closeContactBtn) closeContactBtn.addEventListener('click', closeContact);
        if (doneContactBtn) doneContactBtn.addEventListener('click', closeContact);

        if (copyEmailBtn) {
            copyEmailBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const email = 'gurjar.kartik2003@gmail.com';
                const doCopy = () => {
                    const originalText = copyEmailBtn.innerHTML;
                    copyEmailBtn.innerHTML = '✓ Copied!';
                    copyEmailBtn.style.color = '#00ff88';
                    copyEmailBtn.style.borderColor = '#00ff88';
                    if (window.soundEngine) {
                        window.soundEngine.resume();
                        window.soundEngine.playHit(false);
                    }
                    setTimeout(() => {
                        copyEmailBtn.innerHTML = originalText;
                        copyEmailBtn.style.color = '#00ffcc';
                        copyEmailBtn.style.borderColor = '#00ffcc';
                    }, 2200);
                };

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(email).then(doCopy).catch(() => {
                        const input = document.createElement('input');
                        input.value = email;
                        document.body.appendChild(input);
                        input.select();
                        document.execCommand('copy');
                        document.body.removeChild(input);
                        doCopy();
                    });
                } else {
                    const input = document.createElement('input');
                    input.value = email;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    doCopy();
                }
            });
        }

        // --- 3. Persistent Background Music Toggle ---
        const musicToggleBtn = document.getElementById('btn-music-toggle');
        if (musicToggleBtn) {
            const isMuted = (typeof localStorage !== 'undefined') && localStorage.getItem('fps_striker_music_muted') === 'true';
            if (isMuted) {
                musicToggleBtn.innerHTML = '🔇 MUSIC: OFF';
                musicToggleBtn.classList.add('muted');
            }

            musicToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (window.soundEngine) {
                    window.soundEngine.resume();
                    const nowMuted = window.soundEngine.toggleMusicMute();
                    musicToggleBtn.innerHTML = nowMuted ? '🔇 MUSIC: OFF' : '🎵 MUSIC: ON';
                    musicToggleBtn.classList.toggle('muted', nowMuted);
                }
            });
        }

        // Close modals on Escape or clicking backdrop
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (customizeModal && customizeModal.style.display === 'flex') {
                    closeCustomize();
                }
                if (contactModal && contactModal.style.display === 'flex') {
                    closeContact();
                }
            }
        });

        [customizeModal, contactModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                        if (window.soundEngine) window.soundEngine.playEmptyClick();
                    }
                });
            }
        });

        // --- 4. Extra Lobby Action Buttons (Ranked, Host, Find, Custom) with Tactical Toast Notifications ---
        const secondaryModeConfigs = [
            { id: 'btn-ranked', title: 'RANKED MATCHMAKING', desc: 'Multiplayer & Ranked Matchmaking arriving in upcoming update // Solo Skirmish active', icon: '🎖️' },
            { id: 'btn-host', title: 'HOST GAME LOBBY', desc: 'Custom multiplayer room hosting arriving in upcoming update // Solo Skirmish active', icon: '🏠' },
            { id: 'btn-find', title: 'SERVER BROWSER', desc: 'Global multiplayer server browser arriving in upcoming update // Solo Skirmish active', icon: '🔍' },
            { id: 'btn-custom', title: 'CUSTOM GAMES', desc: 'Custom match rules & lobby creator arriving in upcoming update // Solo Skirmish active', icon: '🎮' }
        ];

        secondaryModeConfigs.forEach(cfg => {
            const btn = document.getElementById(cfg.id);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.showToast(cfg.title, cfg.desc, cfg.icon);
                });
            }
        });
    }

    startMatchTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        const updateTimerDisplay = () => {
            const mins = Math.floor(this.matchTimeRemaining / 60);
            const secs = this.matchTimeRemaining % 60;
            if (this.matchTimer) {
                this.matchTimer.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            }
        };
        updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            if (!window.game || !window.game.isGameStarted) return;
            if (window.game && window.game.isPaused) return;
            if (this.isMatchEnded) return;

            if (this.matchTimeRemaining > 0) {
                this.matchTimeRemaining--;
                updateTimerDisplay();
            } else {
                this.endMatch();
            }
        }, 1000);
    }

    endMatch() {
        if (!window.game || !window.game.isGameStarted) return;
        if (this.isMatchEnded) return;
        this.isMatchEnded = true;

        // Release pointer lock so user can click modal buttons
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }

        // Populate match summary
        const player = window.playerController;
        const bots = window.botManager ? window.botManager.bots : [];

        const killsEl = document.getElementById('summary-kills');
        const deathsEl = document.getElementById('summary-deaths');
        const scoreEl = document.getElementById('summary-score');
        const mvpEl = document.getElementById('summary-mvp');
        const titleEl = document.getElementById('match-outcome-title');

        if (player) {
            if (killsEl) killsEl.innerText = player.kills;
            if (deathsEl) deathsEl.innerText = player.deaths;
            if (scoreEl) scoreEl.innerText = player.score;
        }

        let highestScore = player ? player.score : 0;
        let mvpName = 'YOU';

        bots.forEach(b => {
            if (b.score > highestScore) {
                highestScore = b.score;
                mvpName = b.name;
            }
        });

        if (mvpEl) mvpEl.innerText = `${mvpName} (${highestScore} PTS)`;

        if (titleEl) {
            if (mvpName === 'YOU') {
                titleEl.innerText = '★ VICTORY - MATCH MVP! ★';
                titleEl.style.color = '#00ff88';
            } else {
                titleEl.innerText = 'MATCH COMPLETED';
                titleEl.style.color = '#00e5ff';
            }
        }

        // Render full table
        if (player && window.botManager) {
            this.updateScoreboard(player, window.botManager);
        }

        if (this.scoreboardModal) {
            this.scoreboardModal.style.display = 'flex';
        }

        // Restore energetic lobby BGM during post-match scoreboard
        if (window.soundEngine) {
            window.soundEngine.duckMusic(false);
        }
    }

    showScoreboard() {
        this.endMatch();
    }

    startNewMatch() {
        this.clearLowHealthEffects();
        this.isMatchEnded = false;
        this.matchTimeRemaining = 180; // 3 full minutes

        if (this.matchTimer) {
            this.matchTimer.innerText = '03:00';
        }

        if (this.scoreboardModal) {
            this.scoreboardModal.style.display = 'none';
        }
        if (this.crosshairModal) {
            this.crosshairModal.style.display = 'none';
        }

        // Duck music during active gameplay
        if (window.soundEngine) {
            window.soundEngine.duckMusic(true);
        }

        // Reset player stats & respawn
        if (window.playerController) {
            window.playerController.score = 0;
            window.playerController.kills = 0;
            window.playerController.deaths = 0;
            window.playerController.streak = 0;
            window.playerController.spawn();
            this.updateScore(0, 0);
        }
        if (window.weaponSystem) {
            window.weaponSystem.resetAmmo();
        }

        // Reset bots
        if (window.botManager && window.botManager.bots) {
            window.botManager.bots.forEach(b => {
                b.score = 0;
                b.kills = 0;
                b.deaths = 0;
                b.spawn();
            });
        }

        // Reset loot drops & arcade boosters
        if (window.lootSystem) {
            window.lootSystem.clearAllDrops();
        }
        if (window.boosterManager) {
            window.boosterManager.reset();
        }
        this.clearAllBoosters();

        // Reset HUD team scores
        const alphaEl = document.getElementById('score-alpha');
        const omegaEl = document.getElementById('score-omega');
        if (alphaEl) alphaEl.innerText = '0';
        if (omegaEl) omegaEl.innerText = '0';

        // Start match timer and reset live leaderboard
        this.startMatchTimer();
        this.updateLiveLeaderboard(window.playerController, window.botManager);

        // Re-engage pointer lock
        document.body.requestPointerLock();
    }

    dismissModal() {
        if (this.scoreboardModal) {
            this.scoreboardModal.style.display = 'none';
        }
        if (this.crosshairModal) {
            this.crosshairModal.style.display = 'none';
        }
        document.body.requestPointerLock();
    }


    recordFrame() {
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 500) {
            this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            if (this.fpsCounter) {
                const text = `${this.currentFps} FPS`;
                if (this.fpsCounter.textContent !== text) {
                    this.fpsCounter.textContent = text;
                }
                const color = this.currentFps >= 45 ? '#00ff88' : (this.currentFps >= 30 ? '#ffaa00' : '#ff2255');
                if (this.fpsCounter.style.color !== color) {
                    this.fpsCounter.style.color = color;
                }
            }

            // Subtle dynamic ping variation every ~2.5s for authentic esports telemetry
            if (this.pingDisplay && now - this.lastPingUpdate >= 2500) {
                this.lastPingUpdate = now;
                this.currentPing = 26 + Math.floor(Math.random() * 8);
                const pingText = `${this.currentPing} PING`;
                if (this.pingDisplay.textContent !== pingText) {
                    this.pingDisplay.textContent = pingText;
                }
            }
        }
    }

    // Dopamine Kill Medals & Popup System
    triggerKillMedal(streak = 1, isHeadshot = false, points = 100, combo = 1) {
        this.updateLiveLeaderboard(window.playerController, window.botManager);
        if (!this.killMedalContainer) return;

        let title = 'ELIMINATED';
        let medalClass = 'kill-medal';

        if (combo === 2) {
            title = '⚡ DOUBLE KILL!';
            medalClass += ' streak double';
        } else if (combo === 3) {
            title = '⚡ TRIPLE KILL!';
            medalClass += ' streak triple';
        } else if (combo === 4) {
            title = '⚡ MULTI KILL!';
            medalClass += ' streak multi';
        } else if (combo >= 5) {
            title = '⚡ MEGA KILL!';
            medalClass += ' streak mega';
        } else if (isHeadshot) {
            title = '★ HEADSHOT!';
            medalClass += ' headshot';
        } else if (streak === 2) {
            title = 'DOUBLE KILL!';
            medalClass += ' streak';
        } else if (streak === 3) {
            title = 'TRIPLE KILL!';
            medalClass += ' streak';
        } else if (streak === 4) {
            title = 'KILLING SPREE!';
            medalClass += ' streak';
        } else if (streak >= 5) {
            title = 'RAMPAGE!';
            medalClass += ' streak';
        }

        const medalDiv = document.createElement('div');
        medalDiv.className = medalClass;
        medalDiv.innerText = title;

        const ptsDiv = document.createElement('div');
        ptsDiv.className = 'kill-pts';
        ptsDiv.innerText = `+${points}`;

        this.killMedalContainer.appendChild(medalDiv);
        this.killMedalContainer.appendChild(ptsDiv);

        setTimeout(() => {
            if (medalDiv.parentNode) medalDiv.parentNode.removeChild(medalDiv);
            if (ptsDiv.parentNode) ptsDiv.parentNode.removeChild(ptsDiv);
        }, 850);
    }

    triggerCrosshairRecoil(amount = 4.0) {
        this.crosshairRecoilImpulse = Math.min(18.0, this.crosshairRecoilImpulse + amount);
    }

    updateCrosshairBloom(dt) {
        if (!this.crosshairEl) {
            this.crosshairEl = document.getElementById('crosshair');
            if (!this.crosshairEl) return;
        }

        const ws = window.weaponSystem;
        const player = window.playerController;

        if (ws && ws.isAiming) {
            // Instant snap-collapse when aiming down sights (ADS)
            if (!this.isCrosshairAds) {
                this.crosshairEl.classList.add('ads');
                this.isCrosshairAds = true;
            }
            this.crosshairSpread = 0;
            this.crosshairRecoilImpulse = 0;
            if (this.lastAppliedSpread !== 0) {
                this.crosshairEl.style.setProperty('--ch-spread', '0px');
                this.lastAppliedSpread = 0;
            }
            return;
        }

        if (this.isCrosshairAds) {
            this.crosshairEl.classList.remove('ads');
            this.isCrosshairAds = false;
        }

        let targetSpread = 0;
        if (player) {
            // Jump air-time bloom expansion
            if (!player.isGrounded) {
                targetSpread += 6.5;
            }

            // High-speed slide-hopping & sprint bloom
            const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
            if (horizontalSpeed > 7.0) {
                targetSpread += Math.min(8.0, (horizontalSpeed - 7.0) * 0.45);
            }
        }

        // Weapon firing recoil bloom decay
        if (this.crosshairRecoilImpulse > 0) {
            targetSpread += this.crosshairRecoilImpulse;
            this.crosshairRecoilImpulse = Math.max(0, this.crosshairRecoilImpulse - dt * 24.0);
        }

        // Smooth spring lerp (zero GC allocations, zero thrashing)
        this.crosshairSpread += (targetSpread - this.crosshairSpread) * Math.min(1.0, dt * 18.0);

        const roundedSpread = Math.round(this.crosshairSpread * 10) / 10;
        if (Math.abs(roundedSpread - this.lastAppliedSpread) >= 0.15) {
            this.crosshairEl.style.setProperty('--ch-spread', `${roundedSpread}px`);
            this.lastAppliedSpread = roundedSpread;
        }
    }

    expandCrosshair(amount = 4.0) {
        this.triggerCrosshairRecoil(amount);
        const ch = this.crosshairEl || document.getElementById('crosshair');
        if (!ch) return;
        ch.classList.add('firing');
        if (this.crosshairTimeout) clearTimeout(this.crosshairTimeout);
        this.crosshairTimeout = setTimeout(() => {
            ch.classList.remove('firing');
        }, 75);
    }

    showToast(title, message, icon = '🎖️', duration = 3800) {
        let container = document.getElementById('tactical-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'tactical-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'tactical-toast';
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-desc">${message}</div>
            </div>
        `;
        container.appendChild(toast);

        if (window.soundEngine && typeof window.soundEngine.playEmptyClick === 'function') {
            window.soundEngine.playEmptyClick();
        }

        setTimeout(() => {
            toast.classList.add('fading');
        }, duration - 400);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
    }

    addChatEvent(html, type = 'system') {
        if (!this.chatBox) {
            this.chatBox = document.getElementById('chat-box');
        }
        if (!this.chatBox) return;

        const div = document.createElement('div');
        div.className = `chat-msg ${type}-msg`;
        div.innerHTML = html;
        this.chatBox.appendChild(div);

        // Limit visible messages to prevent viewport occlusion
        while (this.chatBox.children.length > 5) {
            const first = this.chatBox.firstElementChild;
            if (first) this.chatBox.removeChild(first);
        }

        // 5-second lifetime: 4.5s fade-out, 5.0s cleanup
        setTimeout(() => {
            div.classList.add('fading');
        }, 4500);

        setTimeout(() => {
            if (div.parentNode) {
                div.parentNode.removeChild(div);
            }
        }, 5000);
    }

    addChatJoinMessage(name) {
        this.addChatEvent(`<span class="chat-name bot">${name}</span> joined the game`, 'system');
    }

    addChatKillMessage(killer, victim, weapon, isHeadshot) {
        const killerClass = killer === 'YOU' ? 'player' : 'bot';
        const victimClass = victim === 'YOU' ? 'player' : 'bot';
        const headshotTag = isHeadshot ? ' <span style="color:#ff2a5f;font-size:11px;">★</span>' : '';
        this.addChatEvent(`<span class="chat-name ${killerClass}">${killer}</span> eliminated <span class="chat-name ${victimClass}">${victim}</span> <span class="chat-weapon-badge">[${weapon}]</span>${headshotTag}`, 'kill');
    }

    addChatStreakMessage(name, streak) {
        const nameClass = name === 'YOU' ? 'player' : 'bot';
        this.addChatEvent(`🔥 <span class="chat-name ${nameClass}">${name}</span> is on a ${streak} Kill Streak!`, 'streak');
    }

    addChatBoosterMessage(collector, boosterName) {
        const nameClass = collector === 'YOU' ? 'player' : 'bot';
        this.addChatEvent(`⚡ <span class="chat-name ${nameClass}">${collector}</span> picked up <span class="chat-booster-name">${boosterName}</span>!`, 'booster');
    }

    updateHealth(hp, maxHp = 100, shield = 0, maxShield = 50) {
        if (!this.hpVal) return;
        const current = Math.max(0, Math.round(hp));
        if (this.hpVal.innerText !== String(current)) {
            this.hpVal.innerText = current;
        }

        // Update segmented HP blocks (1 to 5)
        const activeSegments = Math.ceil((current / maxHp) * 5);
        for (let i = 1; i <= 5; i++) {
            const seg = document.querySelector(`.seg-${i}`);
            if (seg) {
                if (i <= activeSegments) {
                    seg.classList.add('active');
                } else {
                    seg.classList.remove('active');
                }
            }
        }

        // Nano-Shield Armor Status
        const shieldRow = document.getElementById('shield-row');
        const shieldVal = document.getElementById('shield-val');
        if (shieldRow) {
            if (shield > 0) {
                shieldRow.style.display = 'flex';
                if (shieldVal) shieldVal.innerText = Math.round(shield);
                const sActiveSegs = Math.ceil((shield / maxShield) * 3);
                for (let i = 1; i <= 3; i++) {
                    const sSeg = document.querySelector(`.s-seg-${i}`);
                    if (sSeg) {
                        if (i <= sActiveSegs) sSeg.classList.add('active');
                        else sSeg.classList.remove('active');
                    }
                }
            } else {
                shieldRow.style.display = 'none';
            }
        }

        // Two-Tier Low Health Indicator Logic
        this.updateLowHealthState(current);
    }

    updateLowHealthState(currentHp) {
        let targetTier = 0;
        if (currentHp > 0 && currentHp <= 20) {
            targetTier = 2; // Tier 2: Critical
        } else if (currentHp > 20 && currentHp <= 50) {
            targetTier = 1; // Tier 1: Moderate
        } else {
            targetTier = 0; // Safe / Restored (> 50) or Dead (0)
        }

        if (this.currentLowHealthTier === targetTier) return;
        this.currentLowHealthTier = targetTier;

        const overlay = this.lowHealthOverlay || document.getElementById('low-health-overlay');
        const playerCard = document.getElementById('player-card');
        const hpRow = document.querySelector('.hp-row');

        if (targetTier === 2) {
            // Activate Tier 2 (Critical)
            if (overlay) {
                overlay.classList.add('active', 'tier-2');
                overlay.classList.remove('tier-1');
            }
            if (playerCard) {
                playerCard.classList.add('danger-critical');
                playerCard.classList.remove('danger-moderate');
            }
            if (hpRow) {
                hpRow.classList.add('danger-critical');
                hpRow.classList.remove('danger-moderate');
            }

            // Procedural Audio Engine
            if (window.soundEngine) {
                window.soundEngine.startLowHealthAudio(2);
            }
        } else if (targetTier === 1) {
            // Activate Tier 1 (Moderate)
            if (overlay) {
                overlay.classList.add('active', 'tier-1');
                overlay.classList.remove('tier-2');
            }
            if (playerCard) {
                playerCard.classList.add('danger-moderate');
                playerCard.classList.remove('danger-critical');
            }
            if (hpRow) {
                hpRow.classList.add('danger-moderate');
                hpRow.classList.remove('danger-critical');
            }

            // Procedural Audio Engine
            if (window.soundEngine) {
                window.soundEngine.startLowHealthAudio(1);
            }
        } else {
            // Tier 0: Seamlessly deactivate all effects
            this.clearLowHealthEffects();
        }
    }

    clearLowHealthEffects() {
        this.currentLowHealthTier = 0;
        const overlay = this.lowHealthOverlay || document.getElementById('low-health-overlay');
        const playerCard = document.getElementById('player-card');
        const hpRow = document.querySelector('.hp-row');

        if (overlay) {
            overlay.classList.remove('active', 'tier-1', 'tier-2');
        }
        if (playerCard) {
            playerCard.classList.remove('danger-moderate', 'danger-critical');
        }
        if (hpRow) {
            hpRow.classList.remove('danger-moderate', 'danger-critical');
        }

        if (window.soundEngine) {
            window.soundEngine.stopLowHealthAudio();
        }
    }

    // ==========================================
    // ARCADE POWER-UP & BOOSTER HUD MANAGEMENT
    // ==========================================

    showBooster(type, name, desc, duration, colorHex) {
        const container = document.getElementById('active-boosters-hud');
        if (!container) return;

        let el = document.getElementById(`booster-banner-${type}`);
        if (!el) {
            el = document.createElement('div');
            el.id = `booster-banner-${type}`;
            el.className = `booster-banner booster-${type}`;
            
            const iconChar = type === 'speed' ? '⚡' : (type === 'damage' ? '⚔️' : '🛡️');
            el.innerHTML = `
                <div class="booster-icon-wrap">
                    <span class="booster-icon">${iconChar}</span>
                </div>
                <div class="booster-body">
                    <div class="booster-title-row">
                        <span class="booster-title">${name}</span>
                        <span class="booster-timer-text">${duration.toFixed(1)}s</span>
                    </div>
                    <div class="booster-desc-text">${desc}</div>
                    <div class="booster-bar-track">
                        <div class="booster-bar-fill"></div>
                    </div>
                </div>
            `;
            container.appendChild(el);
        } else {
            // Reset critical state if refreshed
            el.classList.remove('critical');
            el.classList.remove('fade-out');
        }

        // Cache references
        el._timerText = el.querySelector('.booster-timer-text');
        el._barFill = el.querySelector('.booster-bar-fill');
        el._maxDuration = duration;
    }

    updateBoosters(player) {
        if (!player || !player.boosters) return;

        const types = ['speed', 'damage', 'shield'];
        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            const timeRemaining = player.boosters[type];
            const el = document.getElementById(`booster-banner-${type}`);
            if (!el) continue;

            if (timeRemaining > 0) {
                if (el._timerText) {
                    el._timerText.innerText = `${timeRemaining.toFixed(1)}s`;
                }
                if (el._barFill && player.boosterMaxDurations) {
                    const maxDur = player.boosterMaxDurations[type] || 10;
                    const pct = Math.max(0, Math.min(100, (timeRemaining / maxDur) * 100));
                    el._barFill.style.width = `${pct}%`;
                }
                if (timeRemaining <= 2.5) {
                    el.classList.add('critical');
                } else {
                    el.classList.remove('critical');
                }
            } else {
                this.removeBooster(type);
            }
        }
    }

    removeBooster(type) {
        const el = document.getElementById(`booster-banner-${type}`);
        if (el && el.parentNode) {
            el.classList.add('fade-out');
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 250);
        }
    }

    clearAllBoosters() {
        const container = document.getElementById('active-boosters-hud');
        if (container) {
            container.innerHTML = '';
        }
    }

    triggerShieldDeflect() {
        const vig = document.getElementById('damage-vignette');
        if (vig) {
            vig.classList.add('shield-deflect');
            setTimeout(() => vig.classList.remove('shield-deflect'), 160);
        }
    }

    updateWeaponUI(weapon, ammo, allAmmoState = null) {
        if (!weapon || !ammo) return;

        // Dirty-flagged DOM updates to prevent layout thrashing
        const clipStr = String(ammo.clip);
        const resStr = String(ammo.reserve);

        if (this.ammoCurrent && this.ammoCurrent.textContent !== clipStr) {
            this.ammoCurrent.textContent = clipStr;
        }

        if (this.ammoReserve && this.ammoReserve.textContent !== resStr) {
            this.ammoReserve.textContent = resStr;
        }

        const ammoMax = this.ammoMax || document.getElementById('ammo-max');
        if (ammoMax) {
            const magStr = String(weapon.magSize);
            if (ammoMax.textContent !== magStr) {
                ammoMax.textContent = magStr;
            }
        }

        const ammoTotal = this.ammoTotal || document.getElementById('ammo-total');
        if (ammoTotal) {
            const totStr = String(ammo.clip + ammo.reserve);
            if (ammoTotal.textContent !== totStr) {
                ammoTotal.textContent = totStr;
            }
        }

        // Active weapon card name, subtitle & firemode
        if (this.currentWeaponId !== weapon.id) {
            this.currentWeaponId = weapon.id;

            const weaponUpper = (weapon.name || weapon.id).toUpperCase();
            const nameEl = this.weaponName || document.getElementById('weapon-name');
            if (nameEl && nameEl.textContent !== weaponUpper) {
                nameEl.textContent = weaponUpper;
            }

            const metaMap = {
                ar: { tag: 'COMMANDO // 5.56 NATO', firemode: 'AUTO' },
                revolver: { tag: 'ENFORCER // .44 MAGNUM', firemode: 'SEMI' },
                sniper: { tag: 'MARKSMAN // .50 BMG', firemode: 'BOLT' },
                smg: { tag: 'SKIRMISHER // 9MM HYPER', firemode: 'AUTO' },
                shotgun: { tag: 'BREACHER // 12 GAUGE', firemode: 'BREAK' }
            };
            const meta = metaMap[weapon.id] || { tag: 'TACTICAL WEAPON', firemode: 'SEMI' };

            const tagEl = this.weaponClassTag || document.getElementById('weapon-class-tag');
            if (tagEl && tagEl.textContent !== meta.tag) {
                tagEl.textContent = meta.tag;
            }

            const firemodeEl = this.weaponFiremode || document.getElementById('weapon-firemode');
            if (firemodeEl && firemodeEl.textContent !== meta.firemode) {
                firemodeEl.textContent = meta.firemode;
            }

            // Featured 2D Silhouette Switching (Instant zero-allocation class toggle)
            const silhouettes = document.querySelectorAll('.featured-silhouette');
            silhouettes.forEach(s => {
                s.classList.toggle('active', s.dataset.weapon === weapon.id);
            });
        }

        // Update Tactical Ammo Gauge Bar
        const gauge = this.ammoGaugeFill || document.getElementById('ammo-gauge-fill');
        if (gauge) {
            const pct = weapon.magSize > 0 ? Math.max(0, Math.min(100, Math.round((ammo.clip / weapon.magSize) * 100))) : 0;
            const pctStr = `${pct}%`;
            if (gauge.style.width !== pctStr) {
                gauge.style.width = pctStr;
            }
            if (pct <= 25) {
                gauge.classList.add('low');
            } else {
                gauge.classList.remove('low');
            }
        }

        // Tactical Ammo Status Styling (< 25% Mag Capacity = Low Ammo)
        const magSize = weapon.magSize || 30;
        const lowAmmoThreshold = Math.max(1, Math.floor(magSize * 0.25));
        const isLowAmmo = ammo.clip > 0 && ammo.clip <= lowAmmoThreshold;

        const ammoStatus = this.ammoStatus || document.getElementById('ammo-status');
        const ammoNumbers = this.ammoNumbers || document.querySelector('.ammo-numbers');
        const activeHud = this.activeWeaponHud || document.getElementById('active-weapon-hud');

        if (ammoStatus) {
            if (ammo.clip === 0 && ammo.reserve === 0) {
                // Completely exhausted!
                ammoStatus.classList.add('out-of-ammo');
                ammoStatus.classList.remove('clip-empty', 'reserve-empty', 'low-ammo');
                if (ammoNumbers) {
                    ammoNumbers.classList.add('out-of-ammo');
                    ammoNumbers.classList.remove('low-ammo');
                }
                if (activeHud) {
                    activeHud.classList.add('out-of-ammo');
                    activeHud.classList.remove('clip-empty', 'reserve-empty', 'low-ammo');
                }
                this.hideLowAmmoWarning();
            } else if (ammo.clip === 0 && ammo.reserve > 0) {
                // Magazine empty, but reserves available
                ammoStatus.classList.add('clip-empty');
                ammoStatus.classList.remove('out-of-ammo', 'reserve-empty', 'low-ammo');
                if (ammoNumbers) {
                    ammoNumbers.classList.remove('out-of-ammo', 'low-ammo');
                }
                if (activeHud) {
                    activeHud.classList.add('clip-empty');
                    activeHud.classList.remove('out-of-ammo', 'reserve-empty', 'low-ammo');
                }
                this.hideLowAmmoWarning();
            } else if (ammo.reserve === 0 && ammo.clip > 0) {
                // Chamber has bullets, but reserve pool is empty
                ammoStatus.classList.add('reserve-empty');
                ammoStatus.classList.remove('out-of-ammo', 'clip-empty');
                if (ammoNumbers) ammoNumbers.classList.remove('out-of-ammo');
                if (activeHud) {
                    activeHud.classList.add('reserve-empty');
                    activeHud.classList.remove('out-of-ammo', 'clip-empty');
                }
                if (isLowAmmo) {
                    ammoStatus.classList.add('low-ammo');
                    if (ammoNumbers) ammoNumbers.classList.add('low-ammo');
                    if (activeHud) activeHud.classList.add('low-ammo');
                    this.showLowAmmoWarning();
                } else {
                    ammoStatus.classList.remove('low-ammo');
                    if (ammoNumbers) ammoNumbers.classList.remove('low-ammo');
                    if (activeHud) activeHud.classList.remove('low-ammo');
                    this.hideLowAmmoWarning();
                }
            } else if (isLowAmmo) {
                // Low ammo (< 25% magazine capacity)
                ammoStatus.classList.add('low-ammo');
                ammoStatus.classList.remove('out-of-ammo', 'clip-empty', 'reserve-empty');
                if (ammoNumbers) {
                    ammoNumbers.classList.add('low-ammo');
                    ammoNumbers.classList.remove('out-of-ammo');
                }
                if (activeHud) {
                    activeHud.classList.add('low-ammo');
                    activeHud.classList.remove('out-of-ammo', 'clip-empty', 'reserve-empty');
                }
                this.showLowAmmoWarning();
            } else {
                // Fully supplied
                ammoStatus.classList.remove('out-of-ammo', 'clip-empty', 'reserve-empty', 'low-ammo');
                if (ammoNumbers) {
                    ammoNumbers.classList.remove('out-of-ammo', 'low-ammo');
                }
                if (activeHud) {
                    activeHud.classList.remove('out-of-ammo', 'clip-empty', 'reserve-empty', 'low-ammo');
                }
                this.hideLowAmmoWarning();
            }
        }

        // Hotbar / Loadout slots ammo status indicators
        const states = allAmmoState || (window.weaponSystem ? window.weaponSystem.ammoState : null);
        if (states) {
            Object.keys(states).forEach(key => {
                const slotAmmoEl = document.getElementById(`slot-ammo-${key}`);
                const slotEl = document.querySelector(`.loadout-slot[data-slot="${key}"]`);
                const st = states[key];
                if (slotAmmoEl && st) {
                    const str = `${st.clip}/${st.reserve}`;
                    if (slotAmmoEl.textContent !== str) {
                        slotAmmoEl.textContent = str;
                    }
                    if (st.clip === 0 && st.reserve === 0) {
                        slotAmmoEl.classList.add('empty');
                    } else {
                        slotAmmoEl.classList.remove('empty');
                    }
                }
                if (slotEl && st) {
                    if (st.clip === 0 && st.reserve === 0) {
                        slotEl.classList.add('depleted');
                    } else {
                        slotEl.classList.remove('depleted');
                    }
                }
            });
        }

        // Update lobby weapon name if present
        const classGun = document.querySelector('.class-gun-name');
        if (classGun && classGun.textContent !== weapon.name) {
            classGun.textContent = weapon.name;
        }
    }

    setActiveHotbarSlot(key) {
        const slots = document.querySelectorAll('.loadout-slot, .hotbar-slot');
        slots.forEach(slot => {
            if (slot.dataset.slot === key) {
                slot.classList.add('active');
            } else {
                slot.classList.remove('active');
            }
        });

        // Keep featured silhouette aligned
        const silhouettes = document.querySelectorAll('.featured-silhouette');
        silhouettes.forEach(s => {
            s.classList.toggle('active', s.dataset.weapon === key);
        });
    }

    triggerHitmarker(isHeadshot = false) {
        if (!this.hitmarker) return;
        if (this.hitmarkerTimeout) clearTimeout(this.hitmarkerTimeout);

        if (isHeadshot) {
            this.hitmarker.classList.add('headshot');
        } else {
            this.hitmarker.classList.remove('headshot');
        }

        this.hitmarker.classList.add('active');
        this.hitmarkerTimeout = setTimeout(() => {
            this.hitmarker.classList.remove('active');
        }, 120);
    }

    showLowAmmoWarning() {
        const el = this.lowAmmoAlert || document.getElementById('low-ammo-alert');
        if (el) {
            el.style.display = 'flex';
        }
    }

    hideLowAmmoWarning() {
        const el = this.lowAmmoAlert || document.getElementById('low-ammo-alert');
        if (el) {
            el.style.display = 'none';
        }
    }

    showNoAmmoAlert() {
        const text = '[ ! NO AMMO // OUT OF AMMO ]';
        if (this.reloadPrompt) {
            this.reloadPrompt.textContent = text;
            this.reloadPrompt.classList.add('ammo-depleted-warning', 'no-ammo-alert');
            this.reloadPrompt.style.display = 'block';
        }

        const noAmmoBadge = this.noAmmoAlert || document.getElementById('no-ammo-alert');
        if (noAmmoBadge) {
            noAmmoBadge.style.display = 'none';
        }

        this.hideLowAmmoWarning();

        if (this.ammoWarningTimeout) clearTimeout(this.ammoWarningTimeout);
        this.ammoWarningTimeout = setTimeout(() => {
            if (this.reloadPrompt && this.reloadPrompt.classList.contains('ammo-depleted-warning')) {
                this.reloadPrompt.style.display = 'none';
                this.reloadPrompt.classList.remove('ammo-depleted-warning', 'no-ammo-alert');
                this.reloadPrompt.textContent = 'PRESS [R] TO RELOAD';
            }
            const badge = this.noAmmoAlert || document.getElementById('no-ammo-alert');
            if (badge) {
                badge.style.display = 'none';
            }
        }, 1300);
    }

    hideNoAmmoAlert() {
        if (this.reloadPrompt) {
            this.reloadPrompt.style.display = 'none';
            this.reloadPrompt.classList.remove('ammo-depleted-warning', 'no-ammo-alert');
        }
        const noAmmoBadge = this.noAmmoAlert || document.getElementById('no-ammo-alert');
        if (noAmmoBadge) {
            noAmmoBadge.style.display = 'none';
        }
    }

    showAmmoWarning(text = 'OUT OF AMMO') {
        if (text === 'OUT OF AMMO' || text === 'NO AMMO') {
            this.showNoAmmoAlert();
            return;
        }
        if (!this.reloadPrompt) return;
        this.reloadPrompt.textContent = text;
        this.reloadPrompt.classList.add('ammo-depleted-warning');
        this.reloadPrompt.style.display = 'block';

        if (this.ammoWarningTimeout) clearTimeout(this.ammoWarningTimeout);
        this.ammoWarningTimeout = setTimeout(() => {
            if (this.reloadPrompt && this.reloadPrompt.classList.contains('ammo-depleted-warning')) {
                this.reloadPrompt.style.display = 'none';
                this.reloadPrompt.classList.remove('ammo-depleted-warning');
                this.reloadPrompt.textContent = 'PRESS [R] TO RELOAD';
            }
        }, 1200);
    }

    showReloadPrompt() {
        if (!this.reloadPrompt) return;
        this.reloadPrompt.classList.remove('ammo-depleted-warning', 'no-ammo-alert');
        this.reloadPrompt.textContent = 'PRESS [R] TO RELOAD';
        this.reloadPrompt.style.display = 'block';
    }

    hideReloadPrompt() {
        if (this.reloadPrompt) {
            this.reloadPrompt.style.display = 'none';
            this.reloadPrompt.classList.remove('ammo-depleted-warning', 'no-ammo-alert');
        }
        const noAmmoBadge = this.noAmmoAlert || document.getElementById('no-ammo-alert');
        if (noAmmoBadge) {
            noAmmoBadge.style.display = 'none';
        }
    }

    updateScore(score, streak) {
        if (this.matchScore) this.matchScore.innerText = score;
        if (this.matchStreak) this.matchStreak.innerText = streak > 1 ? `${streak}X STREAK` : '';
        this.updateLiveLeaderboard(window.playerController, window.botManager);
    }

    addKillfeedItem(killer, victim, weapon, isHeadshot) {
        this.addChatKillMessage(killer, victim, weapon, isHeadshot);

        if (!this.killfeed) return;
        const div = document.createElement('div');
        div.className = `feed-item ${isHeadshot ? 'headshot' : ''}`;
        div.innerHTML = `
            <span class="feed-killer">${killer}</span>
            <span class="feed-icon">[${weapon}]</span>
            ${isHeadshot ? '<span style="color:#ff2a5f;font-size:12px;">★ HEADSHOT</span>' : ''}
            <span class="feed-victim">${victim}</span>
        `;
        this.killfeed.appendChild(div);

        setTimeout(() => {
            if (div.parentNode) div.parentNode.removeChild(div);
        }, 4000);
    }

    showDamageIndicator(sourcePos, playerPos, playerYaw) {
        if (!sourcePos || !playerPos) return;

        const hud = document.getElementById('hud');
        if (!hud) return;

        // Vector from player to damage source
        const dx = sourcePos.x - playerPos.x;
        const dz = sourcePos.z - playerPos.z;

        // Player forward and right unit vectors in X-Z plane
        const fwdX = -Math.sin(playerYaw);
        const fwdZ = -Math.cos(playerYaw);
        const rightX = Math.cos(playerYaw);
        const rightZ = -Math.sin(playerYaw);

        // Project damage direction onto player local axes
        const localForward = dx * fwdX + dz * fwdZ;
        const localRight = dx * rightX + dz * rightZ;

        // Angle relative to player view (0 = directly ahead, +90 = right, 180 = behind, -90 = left)
        let angleDeg = 0;
        if (Math.hypot(dx, dz) >= 0.001) {
            const angleRad = Math.atan2(localRight, localForward);
            angleDeg = angleRad * (180 / Math.PI);
        }

        // Trigger directional red edge pulse on screen vignette
        const vig = document.getElementById('damage-vignette');
        if (vig) {
            vig.style.setProperty('--hit-angle', `${angleDeg}deg`);
            vig.classList.add('hit');
            if (this.vignetteTimeout) clearTimeout(this.vignetteTimeout);
            this.vignetteTimeout = setTimeout(() => {
                vig.classList.remove('hit');
            }, 250);
        }

        // Create high-contrast tactical damage indicator
        const indicator = document.createElement('div');
        indicator.className = 'damage-indicator';
        indicator.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;

        // Unique gradient ID per instance to prevent SVG reference collision
        const gradId = `dmg-grad-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        indicator.innerHTML = `
            <div class="damage-indicator-wedge">
                <svg viewBox="0 0 240 240" class="damage-indicator-svg">
                    <defs>
                        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#ff0044" stop-opacity="0.95"/>
                            <stop offset="30%" stop-color="#ff1744" stop-opacity="0.8"/>
                            <stop offset="65%" stop-color="#cc0033" stop-opacity="0.45"/>
                            <stop offset="100%" stop-color="#800020" stop-opacity="0.05"/>
                        </linearGradient>
                    </defs>
                    <!-- Tactical Curved Arc Shield with Outward Bulge -->
                    <path class="damage-shield-path" fill="url(#${gradId})" d="
                        M 58.4 41.2
                        Q 80.7 22.6 100.9 11.7
                        L 120 3
                        L 139.1 11.7
                        Q 159.3 22.6 181.6 41.2
                        L 165.8 52
                        Q 137.5 37.8 120 32
                        Q 102.5 37.8 74.2 52
                        Z
                    " />
                    <!-- Tactical Accent Marks -->
                    <line x1="86" y1="28" x2="80" y2="35" class="damage-tech-accent" />
                    <line x1="154" y1="28" x2="160" y2="35" class="damage-tech-accent" />
                    <!-- Razor-Sharp Central Chevron Arrow pointing directly at enemy -->
                    <polygon points="120,7 128,21 120,17 112,21" class="damage-arrow-head" />
                </svg>
            </div>
        `;

        hud.appendChild(indicator);

        // Remove element after animation completes (560ms)
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 560);
    }

    showDeathScreen() {
        this.clearLowHealthEffects();
        if (this.deathScreen) this.deathScreen.style.display = 'flex';
        document.exitPointerLock();
    }

    hideDeathScreen() {
        this.clearLowHealthEffects();
        if (this.deathScreen) this.deathScreen.style.display = 'none';
    }

    updateScoreboard(player, botManager) {
        if (!this.scoreboardBody) return;
        const rows = [];

        rows.push({
            name: 'YOU',
            kills: player.kills,
            deaths: player.deaths,
            score: player.score,
            ping: '12ms',
            isPlayer: true
        });

        if (botManager && botManager.bots) {
            botManager.bots.forEach(b => {
                rows.push({
                    name: b.name,
                    kills: b.kills,
                    deaths: b.deaths,
                    score: b.score,
                    ping: '0ms',
                    isPlayer: false
                });
            });
        }

        rows.sort((a, b) => b.score - a.score);

        let html = '';
        rows.forEach((r, idx) => {
            html += `
                <tr class="${r.isPlayer ? 'player-row' : ''}">
                    <td>#${idx + 1}</td>
                    <td>${r.name}</td>
                    <td>${r.kills}</td>
                    <td>${r.deaths}</td>
                    <td>${r.score}</td>
                    <td>${r.ping}</td>
                </tr>
            `;
        });
        this.scoreboardBody.innerHTML = html;
    }

    updateLiveLeaderboard(player, botManager) {
        player = player || window.playerController;
        botManager = botManager || window.botManager;

        const entries = [];
        const pScore = (player && typeof player.score === 'number') ? player.score : 0;
        const pKills = (player && typeof player.kills === 'number') ? player.kills : 0;

        entries.push({
            name: 'YOU',
            score: pScore,
            kills: pKills,
            isPlayer: true
        });

        if (botManager && Array.isArray(botManager.bots)) {
            botManager.bots.forEach(b => {
                entries.push({
                    name: b.name || 'Bot',
                    score: typeof b.score === 'number' ? b.score : 0,
                    kills: typeof b.kills === 'number' ? b.kills : 0,
                    isPlayer: false
                });
            });
        }

        // Sort descending by score, tiebreaker by kills descending
        entries.sort((a, b) => (b.score - a.score) || (b.kills - a.kills));

        // Update #score-alpha (player score) and #score-omega (leading bot score, or 0 if none)
        const alphaEl = document.getElementById('score-alpha');
        const omegaEl = document.getElementById('score-omega');
        if (alphaEl) {
            alphaEl.innerText = pScore;
        }

        const topBot = entries.find(e => !e.isPlayer);
        const leadingBotScore = topBot ? topBot.score : 0;
        if (omegaEl) {
            omegaEl.innerText = leadingBotScore;
        }

        // Render top 6 entries in #top-right-leaderboard HUD card
        const lbContainer = document.getElementById('top-right-leaderboard');
        if (lbContainer) {
            const top6 = entries.slice(0, 6);
            let html = '';
            top6.forEach((entry, idx) => {
                const rank = idx + 1;
                const rankClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : '');
                const playerClass = entry.isPlayer ? 'rank-player is-player' : '';
                html += `
                    <div class="leaderboard-entry ${rankClass} ${playerClass}">
                        <span class="lb-rank">${rank}.</span>
                        <span class="lb-name">${entry.name}</span>
                        <span class="lb-score">${entry.score}</span>
                    </div>
                `;
            });
            lbContainer.innerHTML = html;
        }
    }

    clearAllBoosters() {
        // Clear booster UI indicators if present
        const boosterContainer = document.getElementById('booster-container');
        if (boosterContainer) boosterContainer.innerHTML = '';
    }
}

window.UIManager = UIManager;
