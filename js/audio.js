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

        if (type === 'sniper') {
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
    playReload(stage = 1) {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

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
}

window.soundEngine = new SoundEngine();
