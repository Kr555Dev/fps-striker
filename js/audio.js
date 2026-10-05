/**
 * FPS Striker High-Dopamine Procedural Audio Engine
 * 100% Web Audio API synthesized - Deep punch, multi-kill chord escalations,
 * tactile reload sounds, and crystal clear hit confirmations.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.75;
        this.sfxGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
            this.sfxGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('AudioContext not supported or blocked:', e);
        }
    }

    resume() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMasterVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        }
    }

    createNoiseBuffer(duration = 0.5) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    playShoot(type = 'ar') {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        if (type === 'shotgun') {
            // Booming, deep shotgun blast
            // Sub-Bass Transient: Sine oscillator pitching from 140Hz down to 28Hz over 0.22s, gain starting at 1.2 and ramping down to 0.001 over 0.3s
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(140, now);
            sub.frequency.exponentialRampToValueAtTime(28, now + 0.22);
            subGain.gain.setValueAtTime(1.2, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            sub.connect(subGain);
            subGain.connect(this.sfxGain);
            sub.start(now);
            sub.stop(now + 0.3);

            // Mechanical Buckshot Crack: Filtered white noise burst (createNoiseBuffer(0.35)), bandpass filter at 1200Hz, Q: 1.2, gain starting at 1.25 and ramping down to 0.001 over 0.28s
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.35);
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(1200, now);
            noiseFilter.Q.setValueAtTime(1.2, now);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(1.25, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.sfxGain);
            noise.start(now);
            noise.stop(now + 0.3);

            // Room Slapback / Body Thud: Triangle oscillator starting at 95Hz pitching down to 32Hz over 0.18s, gain 0.5 ramping down to 0.001 over 0.2s
            const thud = this.ctx.createOscillator();
            const thudGain = this.ctx.createGain();
            thud.type = 'triangle';
            thud.frequency.setValueAtTime(95, now);
            thud.frequency.exponentialRampToValueAtTime(32, now + 0.18);
            thudGain.gain.setValueAtTime(0.5, now);
            thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            thud.connect(thudGain);
            thudGain.connect(this.sfxGain);
            thud.start(now);
            thud.stop(now + 0.2);

        } else if (type === 'sniper') {
            // Booming heavy sub bass
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(160, now);
            sub.frequency.exponentialRampToValueAtTime(28, now + 0.38);
            subGain.gain.setValueAtTime(1.1, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            sub.connect(subGain);
            subGain.connect(this.sfxGain);
            sub.start(now);
            sub.stop(now + 0.45);

            // Explosive crack
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.5);
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(1750, now);
            noiseFilter.Q.setValueAtTime(2.2, now);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(1.3, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.sfxGain);
            noise.start(now);
            noise.stop(now + 0.52);

        } else if (type === 'revolver') {
            // Heavy Hand Cannon Blast + Metallic Ring
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(32, now + 0.3);
            oscGain.gain.setValueAtTime(0.9, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            osc.connect(oscGain);
            oscGain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.32);

            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.35);
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(1300, now);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(1.0, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.sfxGain);
            noise.start(now);
            noise.stop(now + 0.32);

        } else if (type === 'smg') {
            // High tempo snappy crack
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.12);
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.setValueAtTime(1500, now);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.75, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.sfxGain);
            noise.start(now);
            noise.stop(now + 0.12);

            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(190, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
            oscGain.gain.setValueAtTime(0.45, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(oscGain);
            oscGain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.09);

        } else {
            // AR: Punchy, tactile snap
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(190, now);
            osc.frequency.exponentialRampToValueAtTime(36, now + 0.16);
            oscGain.gain.setValueAtTime(0.9, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(oscGain);
            oscGain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.18);

            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.2);
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(1900, now);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.9, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.sfxGain);
            noise.start(now);
            noise.stop(now + 0.2);
        }
    }

    playBotShoot(dist) {
        if (!this.ctx || dist > 100) return;
        this.resume();
        const now = this.ctx.currentTime;
        const atten = Math.max(0.05, 1.0 - (dist / 100));

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.1);
        oscGain.gain.setValueAtTime(0.25 * atten, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.11);
    }

    // Hitmarker Feedback
    playHit(isHeadshot = false) {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        if (isHeadshot) {
            // Crystal clear double bell ping
            [2350, 2900].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.035);
                gain.gain.setValueAtTime(0.4, now + idx * 0.035);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.18);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now + idx * 0.035);
                osc.stop(now + idx * 0.035 + 0.2);
            });
        } else {
            // Sharp hit tick
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1550, now);
            osc.frequency.exponentialRampToValueAtTime(950, now + 0.045);
            gain.gain.setValueAtTime(0.42, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.06);
        }
    }

    // Dopamine Escalating Kill Chime
    playKill(streak = 1) {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        let notes = [523.25, 659.25]; // C5, E5
        if (streak === 2) notes = [659.25, 783.99, 1046.50]; // E5, G5, C6 (Double Kill)
        else if (streak === 3) notes = [783.99, 987.77, 1174.66, 1318.51]; // Triple Kill Triad
        else if (streak >= 4) notes = [523.25, 783.99, 1046.50, 1318.51, 1567.98]; // Rampage Fanfare!

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.04);
            gain.gain.setValueAtTime(0.42, now + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.4);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.04);
            osc.stop(now + i * 0.04 + 0.42);
        });

        // Sub bass drop on streak kills
        if (streak >= 2) {
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(120, now);
            sub.frequency.exponentialRampToValueAtTime(30, now + 0.4);
            subGain.gain.setValueAtTime(0.6, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
            sub.connect(subGain);
            subGain.connect(this.sfxGain);
            sub.start(now);
            sub.stop(now + 0.45);
        }
    }

    // Tactile multi-stage reload sounds
    playReload(stage = 1, weaponType = null) {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        if (weaponType === 'shotgun') {
            if (stage === 1) {
                // Break-action snap open / latch release (crisp metallic click + latch release click: triangle/sawtooth 420Hz->180Hz over 0.07s)
                const saw = this.ctx.createOscillator();
                const sawGain = this.ctx.createGain();
                saw.type = 'sawtooth';
                saw.frequency.setValueAtTime(420, now);
                saw.frequency.exponentialRampToValueAtTime(180, now + 0.07);
                sawGain.gain.setValueAtTime(0.45, now);
                sawGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                saw.connect(sawGain);
                sawGain.connect(this.sfxGain);
                saw.start(now);
                saw.stop(now + 0.08);

                const tri = this.ctx.createOscillator();
                const triGain = this.ctx.createGain();
                tri.type = 'triangle';
                tri.frequency.setValueAtTime(420, now);
                tri.frequency.exponentialRampToValueAtTime(180, now + 0.07);
                triGain.gain.setValueAtTime(0.35, now);
                triGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                tri.connect(triGain);
                triGain.connect(this.sfxGain);
                tri.start(now);
                tri.stop(now + 0.08);

            } else if (stage === 2) {
                // Twin shell casing ejection clink (dual high-pitched metallic brass clinks at ~1850Hz and ~2200Hz)
                [1850, 2200].forEach((freq, idx) => {
                    const clink = this.ctx.createOscillator();
                    const clinkGain = this.ctx.createGain();
                    clink.type = 'sine';
                    const offset = idx * 0.05;
                    clink.frequency.setValueAtTime(freq, now + offset);
                    clink.frequency.exponentialRampToValueAtTime(freq * 0.85, now + offset + 0.06);
                    clinkGain.gain.setValueAtTime(0.38, now + offset);
                    clinkGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
                    clink.connect(clinkGain);
                    clinkGain.connect(this.sfxGain);
                    clink.start(now + offset);
                    clink.stop(now + offset + 0.08);
                });

            } else if (stage === 3) {
                // Fresh shell insertion click & solid snap closed (dual thud + lock snap: 320Hz click + 120Hz solid closure thud)
                const snap = this.ctx.createOscillator();
                const snapGain = this.ctx.createGain();
                snap.type = 'triangle';
                snap.frequency.setValueAtTime(320, now);
                snap.frequency.exponentialRampToValueAtTime(160, now + 0.05);
                snapGain.gain.setValueAtTime(0.42, now);
                snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                snap.connect(snapGain);
                snapGain.connect(this.sfxGain);
                snap.start(now);
                snap.stop(now + 0.07);

                const thud = this.ctx.createOscillator();
                const thudGain = this.ctx.createGain();
                thud.type = 'sine';
                thud.frequency.setValueAtTime(120, now + 0.025);
                thud.frequency.exponentialRampToValueAtTime(35, now + 0.12);
                thudGain.gain.setValueAtTime(0.5, now + 0.025);
                thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                thud.connect(thudGain);
                thudGain.connect(this.sfxGain);
                thud.start(now + 0.025);
                thud.stop(now + 0.15);
            }
            return;
        }

        if (stage === 1) {
            // Mag release & drop: click + thunk
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(380, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.09);

        } else if (stage === 2) {
            // New mag slap & click: snap + metal click
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(820, now);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.06);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.08);

        } else if (stage === 3) {
            // Bolt rack / chamber slide
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            gain.gain.setValueAtTime(0.42, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.12);
        }
    }

    playEmptyClick() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // 1. Crisp metallic hammer strike transient (sharp triangle down-chirp)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1600, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.045);

        // 2. Firing pin spring click (high metallic ping)
        const ping = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();
        ping.type = 'sawtooth';
        ping.frequency.setValueAtTime(2600, now);
        ping.frequency.exponentialRampToValueAtTime(650, now + 0.022);
        pingGain.gain.setValueAtTime(0.28, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);
        ping.connect(pingGain);
        pingGain.connect(this.sfxGain);
        ping.start(now);
        ping.stop(now + 0.03);

        // 3. Hollow empty chamber acoustic resonance
        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(240, now);
        thud.frequency.exponentialRampToValueAtTime(60, now + 0.045);
        thudGain.gain.setValueAtTime(0.22, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        thud.connect(thudGain);
        thudGain.connect(this.sfxGain);
        thud.start(now);
        thud.stop(now + 0.055);
    }

    playJump() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.1);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    playSlide() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.3);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(550, now);
        filter.frequency.exponentialRampToValueAtTime(1100, now + 0.28);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.3);
    }

    playFootstep() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80 + Math.random() * 20, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    playHurt() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.18);
        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    // ==========================================
    // PROCEDURAL ARCADE BOOSTER AUDIO SYNTHESIS
    // ==========================================

    playBoosterPickup(type = 'speed') {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        if (type === 'speed') {
            // ADRENALINE BURST: Rapid ascending high-velocity cyber arpeggio
            const freqs = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51];
            freqs.forEach((freq, idx) => {
                const noteTime = now + idx * 0.045;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.05, noteTime + 0.08);

                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.28, noteTime + 0.012);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.14);

                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(noteTime);
                osc.stop(noteTime + 0.15);
            });

            // Resonant high-pass whoosh transient
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.25);
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, now);
            filter.frequency.exponentialRampToValueAtTime(4200, now + 0.22);
            filter.Q.setValueAtTime(2.5, now);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.22, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.sfxGain);
            noise.start(now);
            noise.stop(now + 0.26);

        } else if (type === 'damage') {
            // HYPER DAMAGE: Heavy aggressive Quad-Damage power chord & sub-bass punch
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(140, now);
            sub.frequency.exponentialRampToValueAtTime(32, now + 0.35);
            subGain.gain.setValueAtTime(0.9, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            sub.connect(subGain);
            subGain.connect(this.sfxGain);
            sub.start(now);
            sub.stop(now + 0.42);

            // Menacing chord triad (Root 110Hz, 5th 165Hz, Octave 220Hz, Flat 7th 392Hz)
            const chordFreqs = [110, 165, 220, 392];
            chordFreqs.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(900, now);
                filter.frequency.exponentialRampToValueAtTime(3600, now + 0.08);
                filter.frequency.exponentialRampToValueAtTime(600, now + 0.38);

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + 0.45);
            });

        } else if (type === 'shield') {
            // NANO-SHIELD: Radiant crystalline aegis chime with warm barrier lock
            const shieldFreqs = [440, 554.37, 659.25, 880];
            shieldFreqs.forEach((freq, idx) => {
                const noteTime = now + idx * 0.05;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.26, noteTime + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(noteTime);
                osc.stop(noteTime + 0.3);
            });

            // Deep resonant barrier lock hum
            const lock = this.ctx.createOscillator();
            const lockGain = this.ctx.createGain();
            lock.type = 'triangle';
            lock.frequency.setValueAtTime(95, now);
            lock.frequency.exponentialRampToValueAtTime(115, now + 0.35);
            lockGain.gain.setValueAtTime(0.35, now);
            lockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            lock.connect(lockGain);
            lockGain.connect(this.sfxGain);
            lock.start(now);
            lock.stop(now + 0.4);
        }
    }

    playBoosterExpire(type = 'speed') {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Downward pitched power-down warning hum
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(98, now + 0.26);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + 0.26);

        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.28);
    }

    playShieldHit() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Kinetic shield deflection ping
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1450, now);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.11);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    // Procedural tactical ammo crate pickup sound (Dual chime arpeggio + mechanical latch click + transient tap)
    playAmmoPickup() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // 1. Dual high-frequency bright tactical chime (784Hz [G5] -> 1046.5Hz [C6])
        const freqs = [784, 1046.5];
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const startT = now + idx * 0.055;
            osc.frequency.setValueAtTime(freq, startT);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.06, startT + 0.09);
            gain.gain.setValueAtTime(0.35, startT);
            gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.12);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(startT);
            osc.stop(startT + 0.13);
        });

        // 2. Mechanical metallic latch snap (bandpass filtered noise burst)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.08);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2800, now);
        filter.Q.setValueAtTime(2.5, now);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.38, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.08);

        // 3. Crisp bottom transient tap
        const tap = this.ctx.createOscillator();
        const tapGain = this.ctx.createGain();
        tap.type = 'triangle';
        tap.frequency.setValueAtTime(320, now);
        tap.frequency.exponentialRampToValueAtTime(110, now + 0.04);
        tapGain.gain.setValueAtTime(0.28, now);
        tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        tap.connect(tapGain);
        tapGain.connect(this.sfxGain);
        tap.start(now);
        tap.stop(now + 0.055);
    }
}

window.soundEngine = new SoundEngine();
