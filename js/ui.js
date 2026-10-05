/**
 * Krunker HUD, UI Manager, Scoreboard & Dopamine Feedback Loop
 */

class UIManager {
    constructor() {
        this.hpVal = document.getElementById('hp-val');
        this.hpBarFill = document.getElementById('hp-bar-fill');
        this.ammoCurrent = document.getElementById('ammo-current');
        this.ammoReserve = document.getElementById('ammo-reserve');
        this.weaponName = document.getElementById('weapon-name');
        this.killfeed = document.getElementById('killfeed');
        this.hitmarker = document.getElementById('hitmarker');
        this.reloadPrompt = document.getElementById('reload-prompt');
        this.matchScore = document.getElementById('match-score');
        this.matchTimer = document.getElementById('match-timer');
        this.matchStreak = document.getElementById('match-streak');
        this.deathScreen = document.getElementById('death-screen');
        this.scoreboardModal = document.getElementById('scoreboard-modal');
        this.scoreboardBody = document.getElementById('scoreboard-body');
        this.fpsCounter = document.getElementById('fps-counter');
        this.killMedalContainer = document.getElementById('kill-medal-container');

        this.hitmarkerTimeout = null;
        this.crosshairTimeout = null;
        this.vignetteTimeout = null;
        this.matchTimeRemaining = 180;
        this.isMatchEnded = false;
        this.timerInterval = null;

        // FPS tracking
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.currentFps = 60;

        this.initSettings();
        this.initScoreboardModal();
        this.startMatchTimer();
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

        const respawnBtn = document.getElementById('btn-respawn');
        if (respawnBtn) {
            respawnBtn.addEventListener('click', () => {
                if (window.playerController) window.playerController.respawn();
            });
        }

        const resumeBtn = document.getElementById('btn-resume');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
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

    startMatchTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.isMatchEnded) return;

            if (this.matchTimeRemaining > 0) {
                this.matchTimeRemaining--;
                const mins = Math.floor(this.matchTimeRemaining / 60);
                const secs = this.matchTimeRemaining % 60;
                if (this.matchTimer) {
                    this.matchTimer.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                }
            } else {
                this.endMatch();
            }
        }, 1000);
    }

    endMatch() {
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
    }

    startNewMatch() {
        this.isMatchEnded = false;
        this.matchTimeRemaining = 180; // 3 full minutes

        if (this.matchTimer) {
            this.matchTimer.innerText = '03:00';
        }

        if (this.scoreboardModal) {
            this.scoreboardModal.style.display = 'none';
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

        // Reset bots
        if (window.botManager && window.botManager.bots) {
            window.botManager.bots.forEach(b => {
                b.score = 0;
                b.kills = 0;
                b.deaths = 0;
                b.spawn();
            });
        }

        // Reset HUD team scores
        const alphaEl = document.getElementById('score-alpha');
        const omegaEl = document.getElementById('score-omega');
        if (alphaEl) alphaEl.innerText = '0';
        if (omegaEl) omegaEl.innerText = '0';

        // Re-engage pointer lock
        document.body.requestPointerLock();
    }

    dismissModal() {
        if (this.scoreboardModal) {
            this.scoreboardModal.style.display = 'none';
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
                this.fpsCounter.innerText = `${this.currentFps} FPS`;
                this.fpsCounter.style.color = this.currentFps >= 45 ? '#00ff88' : (this.currentFps >= 30 ? '#ffaa00' : '#ff2255');
            }
        }
    }

    // Dopamine Kill Medals & Popup System
    triggerKillMedal(streak = 1, isHeadshot = false, points = 100) {
        if (!this.killMedalContainer) return;

        let title = 'ELIMINATED';
        let medalClass = 'kill-medal';

        if (isHeadshot) {
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

    expandCrosshair() {
        const ch = document.getElementById('crosshair');
        if (!ch) return;
        ch.classList.add('firing');
        if (this.crosshairTimeout) clearTimeout(this.crosshairTimeout);
        this.crosshairTimeout = setTimeout(() => {
            ch.classList.remove('firing');
        }, 75);
    }

    updateHealth(hp, maxHp = 100) {
        if (!this.hpVal) return;
        const current = Math.max(0, Math.round(hp));
        this.hpVal.innerText = current;

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
    }

    updateWeaponUI(weapon, ammo) {
        if (this.ammoCurrent) this.ammoCurrent.innerText = ammo.clip;
        const ammoMax = document.getElementById('ammo-max');
        if (ammoMax) ammoMax.innerText = weapon.magSize;
        if (this.ammoReserve) this.ammoReserve.innerText = ammo.reserve;

        // Update lobby weapon name if present
        const classGun = document.querySelector('.class-gun-name');
        if (classGun) classGun.innerText = weapon.name;
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

    showReloadPrompt() {
        if (this.reloadPrompt) this.reloadPrompt.style.display = 'block';
    }

    hideReloadPrompt() {
        if (this.reloadPrompt) this.reloadPrompt.style.display = 'none';
    }

    updateScore(score, streak) {
        if (this.matchScore) this.matchScore.innerText = score;
        if (this.matchStreak) this.matchStreak.innerText = streak > 1 ? `${streak}X STREAK` : '';
    }

    addKillfeedItem(killer, victim, weapon, isHeadshot) {
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
        if (this.deathScreen) this.deathScreen.style.display = 'flex';
        document.exitPointerLock();
    }

    hideDeathScreen() {
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
}

window.UIManager = UIManager;
