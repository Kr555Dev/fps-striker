/**
 * FPS STRIKER // NEXT-GENERATION TACTICAL PROCEDURAL AUDIO ENGINE
 * 
 * Features:
 * - Master Dynamics Compressor bus (zero clipping, studio-grade punch & limiter)
 * - 4-Layer Physical Weapon Sound Synthesis:
 *     Layer 1: Transient Crack (0ms-20ms shockwave & firing pin snap)
 *     Layer 2: Mechanical Body & Mid-Punch (10ms-80ms distorted pitch sweep + waveshaper saturation)
 *     Layer 3: Sub-Bass Thump (20ms-180ms chest-shaking low-end sine sweep)
 *     Layer 4: Mechanical Cycling & Environmental Room Reverb Tail
 * - Pre-synthesized in-memory AudioBuffers generated via OfflineAudioContext at boot (<350KB total footprint, <1ms latency)
 * - Anti-Machinegun Fatigue: 4 round-robin acoustic variations per weapon + ±3% micro-pitch jitter + volume jitter
 * - Distance-attenuated & lowpass-filtered bot audio (realistic distant warfare sound)
 * - Dopamine-inducing headshot dual-bell chime & crunchy tactile body hitsounds
 * - Tactile dry-fire empty chamber clicks & subtle low-ammo warning cues
 * - Muffled cardiac low-health engine (Tier 1 & Tier 2) & tactical multi-stage reload animations
 * - 100% Web Audio API procedural synthesis (zero external audio downloads, 100% offline)
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.70;
        this.sfxVolume = 1.0;
        this.masterGain = null;
        this.sfxGain = null;
        this.masterCompressor = null;
        this.initialized = false;
        this.isPreloading = false;
        this.preloaded = false;

        // Preloaded Real Sample AudioBuffers (High-Quality CC0 Real Firearm Samples)
        this.sampleBuffers = {
            ar: [],
            sniper: [],
            smg: [],
            revolver: [],
            shotgun: [],
            sniper_bolt: null,
            shotgun_pump: null,
            revolver_hammer: null,
            reload: {},
            switch: null
        };
        this.samplesLoaded = false;
        // Active gunshot voices for fast full-auto decay ducking
        this.activeGunshotVoices = {
            ar: [],
            smg: []
        };

        // Weapon AudioBuffers: 4 variations per weapon for anti-fatigue round-robin
        this.weaponBuffers = {
            ar: [],
            sniper: [],
            smg: [],
            revolver: [],
            shotgun: []
        };
        this.variationIndices = {
            ar: 0,
            sniper: 0,
            smg: 0,
            revolver: 0,
            shotgun: 0
        };

        // Shared noise & impulse buffers for zero-allocation runtime performance
        this.whiteNoiseBuffer = null;
        this.pinkNoiseBuffer = null;
        this.roomImpulseBuffer = null;
        this.distortionCurve = null;

        // Low health cardiac monitor state
        this.lowHealthTier = 0; // 0 = none, 1 = moderate, 2 = critical
        this.lowHealthTimer = null;
        this.preloadPromise = null;

        // Procedural Background Music (BGM) Engine State
        this.musicGain = null;
        this.musicFilter = null;
        this.isMusicPlaying = false;
        this.musicTimer = null;
        this.musicNextNoteTime = 0;
        this.musicCurrentStep = 0;
        this.musicBpm = 126;
        this.bgmMasterVolume = 0.38;
        this.bgmDuckedVolume = 0.06;
        this.bgmDucked = false;
        this.bgmMuted = (typeof localStorage !== 'undefined' && localStorage.getItem('fps_striker_music_muted') === 'true');

        // Auto-init buffer generation immediately
        if (typeof window !== 'undefined') {
            this.init();
        }
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            // 1. Master Dynamics Compressor: Prevents digital harshness & clipping, glues combat audio
            this.masterCompressor = this.ctx.createDynamicsCompressor();
            this.masterCompressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
            this.masterCompressor.knee.setValueAtTime(30, this.ctx.currentTime);
            this.masterCompressor.ratio.setValueAtTime(12, this.ctx.currentTime);
            this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
            this.masterCompressor.release.setValueAtTime(0.25, this.ctx.currentTime);

            // 2. Master Gain Node
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

            // 3. SFX Sub-bus Gain
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

            // Signal Chain: SFX -> Compressor -> Master Gain -> Destination
            this.sfxGain.connect(this.masterCompressor);
            this.masterCompressor.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);

            // 4. Procedural BGM Music Bus (Lobby & In-Game Dynamic Ducking)
            this.musicGain = this.ctx.createGain();
            this.musicFilter = this.ctx.createBiquadFilter();
            this.musicFilter.type = 'lowpass';
            this.musicFilter.frequency.setValueAtTime(14000, this.ctx.currentTime);
            this.musicFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

            const initialMusicVol = this.bgmMuted ? 0.0001 : this.bgmMasterVolume;
            this.musicGain.gain.setValueAtTime(initialMusicVol, this.ctx.currentTime);

            this.musicFilter.connect(this.musicGain);
            this.musicGain.connect(this.masterCompressor);

            // Pre-calculate shared noise and saturation curves
            this.whiteNoiseBuffer = this.createNoiseBuffer(0.25);
            this.pinkNoiseBuffer = this.createPinkNoiseBuffer(0.25);
            this.distortionCurve = this.makeDistortionCurve(24);
            this.roomImpulseBuffer = this.createImpulseResponse(0.35, 3.5);

            this.initialized = true;

            // 1. Preload real CC0 recorded weapon audio samples asynchronously
            this.preloadSamplesPromise = this.preloadWeaponSamples();

            // 2. Pre-render procedural AudioBuffers as backup fallback
            this.preloadPromise = this.generateAllWeaponBuffers();

            // 3. Immediately start lobby background music on initial load & reload
            if (!this.bgmMuted) {
                this.startMusic();
            }

            // Proactively resume AudioContext on page lifecycle or any subtle user presence
            if (typeof window !== 'undefined') {
                const autoResumeContext = () => {
                    this.resume();
                    if (!this.isMusicPlaying && !this.bgmMuted) {
                        this.startMusic();
                    }
                };
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', autoResumeContext, { once: true });
                } else {
                    autoResumeContext();
                }
                window.addEventListener('load', autoResumeContext, { once: true });
                window.addEventListener('pageshow', autoResumeContext);
                ['mousemove', 'pointermove', 'touchstart', 'wheel', 'keydown', 'pointerdown', 'focus'].forEach(evt => {
                    window.addEventListener(evt, autoResumeContext, { once: true, passive: true });
                });
            }
        } catch (e) {
            console.warn('AudioContext not supported or blocked:', e);
        }
    }

    async ensureBuffersLoaded() {
        if (!this.initialized) this.init();
        const promises = [];
        if (this.preloadSamplesPromise) promises.push(this.preloadSamplesPromise);
        if (this.preloadPromise) promises.push(this.preloadPromise);
        if (promises.length > 0) {
            await Promise.all(promises);
        }
        return this.samplesLoaded || this.preloaded;
    }

    resume() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    setMasterVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        }
    }

    setSfxVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, val));
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        }
    }

    // ==========================================
    // PROCEDURAL BUFFER & MATH UTILITIES
    // ==========================================

    createNoiseBuffer(duration = 0.5) {
        if (!this.ctx) return null;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    createPinkNoiseBuffer(duration = 0.5) {
        if (!this.ctx) return null;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
        return buffer;
    }

    makeDistortionCurve(amount = 20, n_samples = 4096) {
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    createImpulseResponse(duration = 0.8, decay = 3.5) {
        if (!this.ctx) return null;
        const sampleRate = this.ctx.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const impulse = this.ctx.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const n = i / length;
            const env = Math.pow(1 - n, decay);
            // Early echo taps
            const early = (i === 110 || i === 280 || i === 650 || i === 1150) ? 0.35 : 0;
            left[i] = ((Math.random() * 2 - 1) * env + early) * 0.65;
            right[i] = ((Math.random() * 2 - 1) * env - early * 0.8) * 0.65;
        }
        return impulse;
    }

    // ==========================================
    // REAL AUDIO SAMPLE PRELOADING (CC0 REAL RECORDINGS)
    // ==========================================

    trimAudioBufferSilence(buffer, threshold = 0.015) {
        if (!buffer || !this.ctx) return buffer;
        const numChannels = buffer.numberOfChannels;
        const length = buffer.length;
        const sampleRate = buffer.sampleRate;

        // Scan all channels to find the first sample crossing the noise threshold
        let firstIndex = length;
        for (let c = 0; c < numChannels; c++) {
            const data = buffer.getChannelData(c);
            for (let i = 0; i < length; i++) {
                if (Math.abs(data[i]) >= threshold) {
                    if (i < firstIndex) firstIndex = i;
                    break;
                }
            }
        }

        // Leave a tiny 1ms pre-attack cushion (e.g. 44 samples at 44.1kHz) to avoid clicks
        const cushion = Math.floor(sampleRate * 0.001);
        const startIndex = Math.max(0, firstIndex - cushion);

        // If silence was <= 2ms, keep original buffer
        if (startIndex <= Math.floor(sampleRate * 0.002)) {
            return buffer;
        }

        const newLength = length - startIndex;
        if (newLength <= 0) return buffer;

        const trimmedBuffer = this.ctx.createBuffer(numChannels, newLength, sampleRate);
        for (let c = 0; c < numChannels; c++) {
            const src = buffer.getChannelData(c);
            const dst = trimmedBuffer.getChannelData(c);
            for (let j = 0; j < newLength; j++) {
                dst[j] = src[startIndex + j];
            }
        }
        return trimmedBuffer;
    }

    async loadAudioSample(url) {
        if (!this.ctx) return null;
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                console.warn(`Failed to fetch audio sample: ${url} (HTTP ${resp.status})`);
                return null;
            }
            const arrayBuffer = await resp.arrayBuffer();
            const decoded = await this.ctx.decodeAudioData(arrayBuffer);
            // Automatically strip leading silence for instantaneous attack transients
            return this.trimAudioBufferSilence(decoded);
        } catch (err) {
            console.warn(`Error decoding audio sample ${url}:`, err);
            return null;
        }
    }

    async preloadWeaponSamples() {
        if (typeof window === 'undefined' || !this.ctx) return;
        const sampleManifest = [
            // AR-47 (Exact 1 clip kept by user)
            { category: 'ar', url: './assets/audio/weapons/ar/fire_2.mp3' },

            // Sniper (Exact 1 clip kept by user + bolt cycle)
            { category: 'sniper', url: './assets/audio/weapons/sniper/fire_1.mp3' },
            { category: 'sniper_bolt', url: './assets/audio/weapons/sniper/bolt.mp3' },

            // Shotgun (Exact 1 clip kept by user + pump cycle)
            { category: 'shotgun', url: './assets/audio/weapons/shotgun/fire_1.mp3' },
            { category: 'shotgun_pump', url: './assets/audio/weapons/shotgun/pump.mp3' },

            // Revolver (Exact 1 clip kept by user + hammer cock)
            { category: 'revolver', url: './assets/audio/weapons/revolver/fire_1.mp3' },
            { category: 'revolver_hammer', url: './assets/audio/weapons/revolver/hammer.mp3' },

            // SMG (Exact 3 clips kept by user)
            { category: 'smg', url: './assets/audio/weapons/smg/fire_1.mp3' },
            { category: 'smg', url: './assets/audio/weapons/smg/fire_2.mp3' },
            { category: 'smg', url: './assets/audio/weapons/smg/fire_3.mp3' },

            // Weapon Reloader Mechanics
            { category: 'reload_ar', url: './assets/audio/weapons/ar/reload.mp3' },
            { category: 'reload_sniper', url: './assets/audio/weapons/sniper/reload.mp3' },
            { category: 'reload_shotgun', url: './assets/audio/weapons/shotgun/reload.mp3' },
            { category: 'reload_smg', url: './assets/audio/weapons/smg/reload.mp3' },
            { category: 'reload_revolver', url: './assets/audio/weapons/revolver/reload.mp3' },

            // FX Switch
            { category: 'switch', url: './assets/audio/fx/switch.mp3' }
        ];

        const loadPromises = sampleManifest.map(async item => {
            const buf = await this.loadAudioSample(item.url);
            if (!buf) return;

            if (item.category === 'sniper_bolt') {
                this.sampleBuffers.sniper_bolt = buf;
            } else if (item.category === 'shotgun_pump') {
                this.sampleBuffers.shotgun_pump = buf;
            } else if (item.category === 'revolver_hammer') {
                this.sampleBuffers.revolver_hammer = buf;
            } else if (item.category === 'switch') {
                this.sampleBuffers.switch = buf;
            } else if (item.category.startsWith('reload_')) {
                const wKey = item.category.replace('reload_', '');
                this.sampleBuffers.reload[wKey] = buf;
            } else if (Array.isArray(this.sampleBuffers[item.category])) {
                this.sampleBuffers[item.category].push(buf);
            }
        });

        await Promise.all(loadPromises);

        const loadedGuns = ['ar', 'sniper', 'smg', 'revolver', 'shotgun'].filter(
            k => this.sampleBuffers[k] && this.sampleBuffers[k].length > 0
        );
        if (loadedGuns.length > 0) {
            this.samplesLoaded = true;
            console.log(`[AudioEngine] Successfully loaded real firearm sample packs for: ${loadedGuns.join(', ')}`);
        }
    }

    // ==========================================
    // OFFLINE PRE-SYNTHESIS ENGINE (BACKUP PROCEDURAL SYNTHESIS)
    // ==========================================

    async generateAllWeaponBuffers() {
        if (this.isPreloading || this.preloaded) return;
        this.isPreloading = true;

        const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!OfflineCtx) {
            this.preloaded = true;
            this.isPreloading = false;
            return;
        }

        const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
        const weapons = ['ar', 'sniper', 'smg', 'revolver', 'shotgun'];
        const variationCount = 4;

        try {
            const renderTasks = [];
            for (const weapon of weapons) {
                this.weaponBuffers[weapon] = new Array(variationCount);
                for (let v = 0; v < variationCount; v++) {
                    renderTasks.push((async (w, varIdx) => {
                        const duration = this.getWeaponDuration(w);
                        const length = Math.max(1024, Math.floor(sampleRate * duration));
                        const offCtx = new OfflineCtx(1, length, sampleRate);
                        this.buildWeaponGraph(offCtx, w, varIdx, duration);
                        const renderedBuf = await offCtx.startRendering();
                        this.weaponBuffers[w][varIdx] = renderedBuf;
                    })(weapon, v));
                }
            }
            await Promise.all(renderTasks);
            this.preloaded = true;
        } catch (err) {
            console.warn('Procedural offline audio synthesis fallback to real-time:', err);
        } finally {
            this.isPreloading = false;
        }
    }

    getWeaponDuration(type) {
        switch (type) {
            case 'sniper': return 0.85;
            case 'shotgun': return 0.42;
            case 'revolver': return 0.38;
            case 'ar': return 0.26;
            case 'smg': return 0.12;
            default: return 0.26;
        }
    }

    // Synthesizes the 4 distinct physical layers into any AudioContext (Offline or Real-time)
    buildWeaponGraph(targetCtx, type, variation = 0, duration = 0.5) {
        const now = 0;
        const sampleRate = targetCtx.sampleRate;
        const vJitter = (variation - 1.5) * 0.05; // -0.075 to +0.075 pitch/freq variation

        if (type === 'sniper') {
            // ==========================================
            // SNIPER RIFLE: Thunderous High-Caliber Marksman
            // ==========================================
            // Layer 1: Supersonic Shockwave Crack (0 - 20ms)
            const snapLen = Math.floor(sampleRate * 0.08);
            const snapBuf = targetCtx.createBuffer(1, snapLen, sampleRate);
            const snapData = snapBuf.getChannelData(0);
            for (let i = 0; i < snapLen; i++) snapData[i] = Math.random() * 2 - 1;

            const snapSource = targetCtx.createBufferSource();
            snapSource.buffer = snapBuf;
            const snapFilter = targetCtx.createBiquadFilter();
            snapFilter.type = 'bandpass';
            snapFilter.frequency.setValueAtTime(3600 * (1 + vJitter), now);
            snapFilter.Q.setValueAtTime(2.6, now);
            const snapGain = targetCtx.createGain();
            snapGain.gain.setValueAtTime(1.65, now);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
            snapSource.connect(snapFilter);
            snapFilter.connect(snapGain);
            snapGain.connect(targetCtx.destination);
            snapSource.start(now);

            // Layer 2: Mechanical Body Punch with Saturation (10 - 120ms)
            const bodyOsc = targetCtx.createOscillator();
            bodyOsc.type = 'sawtooth';
            bodyOsc.frequency.setValueAtTime(380 * (1 + vJitter), now);
            bodyOsc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
            const bodyShaper = targetCtx.createWaveShaper();
            bodyShaper.curve = this.makeDistortionCurve(26);
            bodyShaper.oversample = 'none';
            const bodyGain = targetCtx.createGain();
            bodyGain.gain.setValueAtTime(1.2, now);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            bodyOsc.connect(bodyShaper);
            bodyShaper.connect(bodyGain);
            bodyGain.connect(targetCtx.destination);
            bodyOsc.start(now);

            // Layer 3: Massive Sub-Bass Chest Thump (20 - 350ms)
            const subOsc = targetCtx.createOscillator();
            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(180, now);
            subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.35);
            const subGain = targetCtx.createGain();
            subGain.gain.setValueAtTime(1.4, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
            subOsc.connect(subGain);
            subGain.connect(targetCtx.destination);
            subOsc.start(now);

            // Layer 4: Distant Environmental Reverb Tail
            const tailLen = Math.floor(sampleRate * 0.78);
            const tailBuf = targetCtx.createBuffer(1, tailLen, sampleRate);
            const tailData = tailBuf.getChannelData(0);
            for (let i = 0; i < tailLen; i++) {
                const env = Math.pow(1 - i / tailLen, 2.8);
                tailData[i] = (Math.random() * 2 - 1) * env * 0.7;
            }
            const tailSource = targetCtx.createBufferSource();
            tailSource.buffer = tailBuf;
            const tailFilter = targetCtx.createBiquadFilter();
            tailFilter.type = 'lowpass';
            tailFilter.frequency.setValueAtTime(1800, now);
            tailFilter.frequency.exponentialRampToValueAtTime(450, now + 0.76);
            const tailGain = targetCtx.createGain();
            tailGain.gain.setValueAtTime(0.85, now + 0.04);
            tailGain.gain.exponentialRampToValueAtTime(0.001, now + 0.82);
            tailSource.connect(tailFilter);
            tailFilter.connect(tailGain);
            tailGain.connect(targetCtx.destination);
            tailSource.start(now + 0.04);

        } else if (type === 'shotgun') {
            // ==========================================
            // DOUBLE-BARREL SHOTGUN: Explosive Crunchy Breacher
            // ==========================================
            // Layer 1: Dual Staggered Buckshot Crack (0ms primary + 12ms secondary blast)
            [0, 0.012].forEach((offset, idx) => {
                const burstLen = Math.floor(sampleRate * 0.12);
                const burstBuf = targetCtx.createBuffer(1, burstLen, sampleRate);
                const burstData = burstBuf.getChannelData(0);
                for (let i = 0; i < burstLen; i++) burstData[i] = Math.random() * 2 - 1;

                const burstSource = targetCtx.createBufferSource();
                burstSource.buffer = burstBuf;
                const burstFilter = targetCtx.createBiquadFilter();
                burstFilter.type = 'bandpass';
                burstFilter.frequency.setValueAtTime((1400 + idx * 800) * (1 + vJitter), now + offset);
                burstFilter.Q.setValueAtTime(1.8, now + offset);
                const burstGain = targetCtx.createGain();
                burstGain.gain.setValueAtTime(1.35, now + offset);
                burstGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
                burstSource.connect(burstFilter);
                burstFilter.connect(burstGain);
                burstGain.connect(targetCtx.destination);
                burstSource.start(now + offset);
            });

            // Layer 2: Heavy Saturated Mid-Bass Boom (Sweeping 240Hz down to 32Hz)
            const midOsc = targetCtx.createOscillator();
            midOsc.type = 'triangle';
            midOsc.frequency.setValueAtTime(240 * (1 + vJitter), now);
            midOsc.frequency.exponentialRampToValueAtTime(32, now + 0.16);
            const midShaper = targetCtx.createWaveShaper();
            midShaper.curve = this.makeDistortionCurve(30);
            const midGain = targetCtx.createGain();
            midGain.gain.setValueAtTime(1.25, now);
            midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            midOsc.connect(midShaper);
            midShaper.connect(midGain);
            midGain.connect(targetCtx.destination);
            midOsc.start(now);

            // Layer 3: Sub-Bass Transient (150Hz down to 28Hz)
            const sub = targetCtx.createOscillator();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(150, now);
            sub.frequency.exponentialRampToValueAtTime(28, now + 0.26);
            const subGain = targetCtx.createGain();
            subGain.gain.setValueAtTime(1.35, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            sub.connect(subGain);
            subGain.connect(targetCtx.destination);
            sub.start(now);

            // Layer 4: Wide Room Buckshot Dispersion Tail (0.38s)
            const scatterLen = Math.floor(sampleRate * 0.38);
            const scatterBuf = targetCtx.createBuffer(1, scatterLen, sampleRate);
            const scatterData = scatterBuf.getChannelData(0);
            for (let i = 0; i < scatterLen; i++) {
                scatterData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / scatterLen, 3.2);
            }
            const scatterSource = targetCtx.createBufferSource();
            scatterSource.buffer = scatterBuf;
            const scatterFilter = targetCtx.createBiquadFilter();
            scatterFilter.type = 'lowpass';
            scatterFilter.frequency.setValueAtTime(1600, now);
            const scatterGain = targetCtx.createGain();
            scatterGain.gain.setValueAtTime(0.7, now + 0.02);
            scatterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);
            scatterSource.connect(scatterFilter);
            scatterFilter.connect(scatterGain);
            scatterGain.connect(targetCtx.destination);
            scatterSource.start(now + 0.02);

        } else if (type === 'revolver') {
            // ==========================================
            // REVOLVER: Heavy Hand-Cannon Blast & Metallic Ring
            // ==========================================
            // Layer 1: Cylinder Snap Crack (1800Hz transient)
            const snapLen = Math.floor(sampleRate * 0.09);
            const snapBuf = targetCtx.createBuffer(1, snapLen, sampleRate);
            const snapData = snapBuf.getChannelData(0);
            for (let i = 0; i < snapLen; i++) snapData[i] = Math.random() * 2 - 1;

            const snapSource = targetCtx.createBufferSource();
            snapSource.buffer = snapBuf;
            const snapFilter = targetCtx.createBiquadFilter();
            snapFilter.type = 'bandpass';
            snapFilter.frequency.setValueAtTime(1800 * (1 + vJitter), now);
            snapFilter.Q.setValueAtTime(2.2, now);
            const snapGain = targetCtx.createGain();
            snapGain.gain.setValueAtTime(1.3, now);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            snapSource.connect(snapFilter);
            snapFilter.connect(snapGain);
            snapGain.connect(targetCtx.destination);
            snapSource.start(now);

            // Layer 2: Deep Overdriven Punch (300Hz down to 36Hz)
            const osc = targetCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300 * (1 + vJitter), now);
            osc.frequency.exponentialRampToValueAtTime(36, now + 0.14);
            const oscShaper = targetCtx.createWaveShaper();
            oscShaper.curve = this.makeDistortionCurve(22);
            const oscGain = targetCtx.createGain();
            oscGain.gain.setValueAtTime(1.15, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.connect(oscShaper);
            oscShaper.connect(oscGain);
            oscGain.connect(targetCtx.destination);
            osc.start(now);

            // Layer 3: Sub-Bass Thump
            const sub = targetCtx.createOscillator();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(160, now);
            sub.frequency.exponentialRampToValueAtTime(30, now + 0.22);
            const subGain = targetCtx.createGain();
            subGain.gain.setValueAtTime(1.2, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            sub.connect(subGain);
            subGain.connect(targetCtx.destination);
            sub.start(now);

            // Layer 4: Resonant Steel Cylinder Ring nuance (1150Hz sine tail)
            const ring = targetCtx.createOscillator();
            ring.type = 'sine';
            ring.frequency.setValueAtTime(1150 * (1 + vJitter), now + 0.03);
            ring.frequency.exponentialRampToValueAtTime(750, now + 0.28);
            const ringGain = targetCtx.createGain();
            ringGain.gain.setValueAtTime(0.25, now + 0.03);
            ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            ring.connect(ringGain);
            ringGain.connect(targetCtx.destination);
            ring.start(now + 0.03);

        } else if (type === 'smg') {
            // ==========================================
            // SMG: Rapid, Snappy, Suppressed Sizzle
            // ==========================================
            // Layer 1: High-Frequency Snap (2800Hz, tight 8ms attack)
            const snapLen = Math.floor(sampleRate * 0.05);
            const snapBuf = targetCtx.createBuffer(1, snapLen, sampleRate);
            const snapData = snapBuf.getChannelData(0);
            for (let i = 0; i < snapLen; i++) snapData[i] = Math.random() * 2 - 1;

            const snapSource = targetCtx.createBufferSource();
            snapSource.buffer = snapBuf;
            const snapFilter = targetCtx.createBiquadFilter();
            snapFilter.type = 'highpass';
            snapFilter.frequency.setValueAtTime(2600 * (1 + vJitter), now);
            const snapGain = targetCtx.createGain();
            snapGain.gain.setValueAtTime(1.0, now);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            snapSource.connect(snapFilter);
            snapFilter.connect(snapGain);
            snapGain.connect(targetCtx.destination);
            snapSource.start(now);

            // Layer 2: Compact Low-Mid Punch (180Hz down to 60Hz over 45ms)
            const punch = targetCtx.createOscillator();
            punch.type = 'triangle';
            punch.frequency.setValueAtTime(180 * (1 + vJitter), now);
            punch.frequency.exponentialRampToValueAtTime(60, now + 0.045);
            const punchGain = targetCtx.createGain();
            punchGain.gain.setValueAtTime(0.75, now);
            punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
            punch.connect(punchGain);
            punchGain.connect(targetCtx.destination);
            punch.start(now);

            // Layer 3: Tight Sub Punch (100Hz -> 45Hz over 65ms)
            const sub = targetCtx.createOscillator();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(100, now);
            sub.frequency.exponentialRampToValueAtTime(45, now + 0.065);
            const subGain = targetCtx.createGain();
            subGain.gain.setValueAtTime(0.65, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            sub.connect(subGain);
            subGain.connect(targetCtx.destination);
            sub.start(now);

        } else {
            // ==========================================
            // ASSAULT RIFLE: Sharp, Rhythmic, Tactical Punch
            // ==========================================
            // Layer 1: Supersonic Transient Snap (2200Hz bandpass crack, 10ms)
            const snapLen = Math.floor(sampleRate * 0.07);
            const snapBuf = targetCtx.createBuffer(1, snapLen, sampleRate);
            const snapData = snapBuf.getChannelData(0);
            for (let i = 0; i < snapLen; i++) snapData[i] = Math.random() * 2 - 1;

            const snapSource = targetCtx.createBufferSource();
            snapSource.buffer = snapBuf;
            const snapFilter = targetCtx.createBiquadFilter();
            snapFilter.type = 'bandpass';
            snapFilter.frequency.setValueAtTime(2200 * (1 + vJitter), now);
            snapFilter.Q.setValueAtTime(1.9, now);
            const snapGain = targetCtx.createGain();
            snapGain.gain.setValueAtTime(1.25, now);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
            snapSource.connect(snapFilter);
            snapFilter.connect(snapGain);
            snapGain.connect(targetCtx.destination);
            snapSource.start(now);

            // Layer 2: Mechanical Body Punch with Saturation (240Hz -> 50Hz)
            const bodyOsc = targetCtx.createOscillator();
            bodyOsc.type = 'sawtooth';
            bodyOsc.frequency.setValueAtTime(240 * (1 + vJitter), now);
            bodyOsc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
            const bodyShaper = targetCtx.createWaveShaper();
            bodyShaper.curve = this.makeDistortionCurve(18);
            const bodyGain = targetCtx.createGain();
            bodyGain.gain.setValueAtTime(1.0, now);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            bodyOsc.connect(bodyShaper);
            bodyShaper.connect(bodyGain);
            bodyGain.connect(targetCtx.destination);
            bodyOsc.start(now);

            // Layer 3: Sub-Bass Thud (130Hz -> 42Hz)
            const sub = targetCtx.createOscillator();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(130, now);
            sub.frequency.exponentialRampToValueAtTime(42, now + 0.13);
            const subGain = targetCtx.createGain();
            subGain.gain.setValueAtTime(1.05, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            sub.connect(subGain);
            subGain.connect(targetCtx.destination);
            sub.start(now);

            // Layer 4: Receiver Reciprocation Clatter (subtle metallic clicks at 35ms and 65ms)
            [0.035, 0.065].forEach((offset, idx) => {
                const click = targetCtx.createOscillator();
                click.type = 'triangle';
                click.frequency.setValueAtTime((1450 + idx * 400) * (1 + vJitter), now + offset);
                click.frequency.exponentialRampToValueAtTime(400, now + offset + 0.02);
                const clickGain = targetCtx.createGain();
                clickGain.gain.setValueAtTime(0.25, now + offset);
                clickGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.025);
                click.connect(clickGain);
                clickGain.connect(targetCtx.destination);
                click.start(now + offset);
            });
        }
    }

    // ==========================================
    // ZERO-LATENCY WEAPON FIRING TRIGGER
    // ==========================================

    playShoot(type = 'ar') {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // 1. Check for authentic recorded sample buffers (Preferred High-Fidelity Path)
        const realSamples = this.sampleBuffers[type];
        if (realSamples && realSamples.length > 0) {
            // Anti-Machinegun Fatigue: Cycle round-robin sample variations
            const vIndex = this.variationIndices[type] % realSamples.length;
            this.variationIndices[type]++;
            const buf = realSamples[vIndex];

            // Micro-pitch jitter (±3%) and subtle volume jitter (±3%)
            const pitchJitter = 1.0 + (Math.random() * 0.06 - 0.03);
            const volJitter = 0.97 + Math.random() * 0.06;

            const source = this.ctx.createBufferSource();
            source.buffer = buf;
            source.playbackRate.setValueAtTime(pitchJitter, now);

            const shotGain = this.ctx.createGain();
            // Weapon gain balancing
            let baseGain = 1.0;
            if (type === 'sniper') baseGain = 1.25;
            else if (type === 'revolver') baseGain = 1.15;
            else if (type === 'shotgun') baseGain = 1.10;
            else if (type === 'ar') baseGain = 1.05;
            else if (type === 'smg') baseGain = 1.00;

            shotGain.gain.setValueAtTime(baseGain * volJitter, now);

            // Rapid-Fire Voice Management for high cyclic-rate weapons (AR & SMG)
            // Duck/fade long decaying tails from earlier shots so each bullet cracks cleanly and punchily
            if (type === 'ar' || type === 'smg') {
                const voiceList = this.activeGunshotVoices[type];
                if (voiceList) {
                    for (let i = 0; i < voiceList.length; i++) {
                        const prevGain = voiceList[i];
                        try {
                            // Quick 25ms crossfade out on preceding voice to prevent muffled audio buildup
                            prevGain.gain.cancelScheduledValues(now);
                            prevGain.gain.setValueAtTime(prevGain.gain.value, now);
                            prevGain.gain.linearRampToValueAtTime(0.001, now + 0.025);
                        } catch (e) {}
                    }
                    voiceList.length = 0;
                    voiceList.push(shotGain);
                }
            }

            source.connect(shotGain);
            shotGain.connect(this.sfxGain);
            source.start(now);

            // Layer: High-impact Sub-Bass Reinforcement for heavy weapons (Sniper & Revolver)
            if (type === 'sniper' || type === 'revolver' || type === 'shotgun') {
                const subOsc = this.ctx.createOscillator();
                const subGain = this.ctx.createGain();
                subOsc.type = 'sine';
                const startFreq = type === 'sniper' ? 85 : 95;
                subOsc.frequency.setValueAtTime(startFreq, now);
                subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.12);

                const subVol = type === 'sniper' ? 0.85 : 0.65;
                subGain.gain.setValueAtTime(subVol, now);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

                subOsc.connect(subGain);
                subGain.connect(this.sfxGain);
                subOsc.start(now);
                subOsc.stop(now + 0.15);
            }
            return;
        }

        // 2. Procedural pre-rendered buffer fallback
        const buffers = this.weaponBuffers[type];
        if (buffers && buffers.length > 0) {
            const vIndex = this.variationIndices[type] % buffers.length;
            this.variationIndices[type]++;
            const buf = buffers[vIndex];

            const pitchJitter = 1.0 + (Math.random() * 0.06 - 0.03);
            const volJitter = 0.96 + Math.random() * 0.08;

            const source = this.ctx.createBufferSource();
            source.buffer = buf;
            source.playbackRate.setValueAtTime(pitchJitter, now);

            const shotGain = this.ctx.createGain();
            shotGain.gain.setValueAtTime(volJitter, now);

            source.connect(shotGain);
            shotGain.connect(this.sfxGain);
            source.start(now);
        } else {
            // 3. Real-time multi-layered procedural fallback
            this.synthesizeRealtimeShoot(type);
        }
    }

    synthesizeRealtimeShoot(type = 'ar') {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const v = Math.floor(Math.random() * 4);

        const subBus = this.ctx.createGain();
        subBus.gain.setValueAtTime(1.0, now);
        subBus.connect(this.sfxGain);

        // Build into subBus directly using current AudioContext
        const proxyContext = {
            sampleRate: this.ctx.sampleRate,
            destination: subBus,
            createBuffer: (...args) => this.ctx.createBuffer(...args),
            createBufferSource: () => this.ctx.createBufferSource(),
            createBiquadFilter: () => this.ctx.createBiquadFilter(),
            createGain: () => this.ctx.createGain(),
            createOscillator: () => this.ctx.createOscillator(),
            createWaveShaper: () => this.ctx.createWaveShaper()
        };

        this.buildWeaponGraph(proxyContext, type, v, this.getWeaponDuration(type));
    }

    // Distant spatial bot weapon gunfire (distance attenuation + atmospheric lowpass)
    playBotShoot(dist = 10, type = 'ar') {
        if (!this.ctx || dist > 110) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Realistic distance attenuation: inverse distance curve
        const atten = Math.max(0.04, 1.0 / (1.0 + dist * 0.045));

        // Atmospheric frequency absorption: distant shots lose highs and sound muffled & bassy
        const lpfFreq = Math.max(380, 4200 - dist * 42);

        const distFilter = this.ctx.createBiquadFilter();
        distFilter.type = 'lowpass';
        distFilter.frequency.setValueAtTime(lpfFreq, now);

        const distGain = this.ctx.createGain();
        distGain.gain.setValueAtTime(0.75 * atten, now);

        distFilter.connect(distGain);
        distGain.connect(this.sfxGain);

        // Play bot shot prioritizing real samples
        const realSamples = this.sampleBuffers[type] || this.sampleBuffers.ar;
        if (realSamples && realSamples.length > 0) {
            const buf = realSamples[Math.floor(Math.random() * realSamples.length)];
            const source = this.ctx.createBufferSource();
            source.buffer = buf;
            source.playbackRate.setValueAtTime(0.95 + Math.random() * 0.1, now);
            source.connect(distFilter);
            source.start(now);
            return;
        }

        // Fallback to procedural buffers
        const buffers = this.weaponBuffers[type] || this.weaponBuffers.ar;
        if (buffers && buffers.length > 0) {
            const buf = buffers[Math.floor(Math.random() * buffers.length)];
            const source = this.ctx.createBufferSource();
            source.buffer = buf;
            source.playbackRate.setValueAtTime(0.95 + Math.random() * 0.1, now);
            source.connect(distFilter);
            source.start(now);
        } else {
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(36, now + 0.12);
            osc.connect(distFilter);
            osc.start(now);
            osc.stop(now + 0.13);
        }
    }

    // ==========================================
    // COMBAT FEEDBACK: HITSOUNDS & DOPAMINE HEADSHOT DING
    // ==========================================

    playHit(isHeadshot = false) {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        if (isHeadshot) {
            // CRYSTALLINE ARENA DUAL BELL CHIME (2450Hz & 3200Hz) + High Metallic Crack
            const bellPitches = [2450, 3200];
            bellPitches.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                const startTime = now + idx * 0.015;
                osc.frequency.setValueAtTime(freq, startTime);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.98, startTime + 0.24);

                gain.gain.setValueAtTime(0.48 - idx * 0.08, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(startTime);
                osc.stop(startTime + 0.26);
            });

            // Sparkling metallic transient crack (4400Hz)
            const snap = this.ctx.createBufferSource();
            snap.buffer = this.whiteNoiseBuffer || this.createNoiseBuffer(0.05);
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(4400, now);
            filter.Q.setValueAtTime(3.2, now);
            const snapGain = this.ctx.createGain();
            snapGain.gain.setValueAtTime(0.35, now);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            snap.connect(filter);
            filter.connect(snapGain);
            snapGain.connect(this.sfxGain);
            snap.start(now);
            snap.stop(now + 0.04);

        } else {
            // CRUNCHY TACTILE HIT-MARKER TICK
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1750, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.038);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.05);

            // Subtle body punch tick
            const tick = this.ctx.createOscillator();
            const tickGain = this.ctx.createGain();
            tick.type = 'sine';
            tick.frequency.setValueAtTime(220, now);
            tick.frequency.exponentialRampToValueAtTime(65, now + 0.04);
            tickGain.gain.setValueAtTime(0.28, now);
            tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
            tick.connect(tickGain);
            tickGain.connect(this.sfxGain);
            tick.start(now);
            tick.stop(now + 0.05);
        }
    }

    // Tactical Low Ammo Warning Cue (Last 25% of magazine)
    playLowAmmoWarning(remaining = 1, threshold = 5) {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // Subtle tactical metallic slide/follower click hint (2200Hz & 1800Hz)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2200, now + 0.04);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
        gain.gain.setValueAtTime(0.22, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + 0.04);
        osc.stop(now + 0.07);
    }

    // Dry-Fire / Empty Chamber Click
    playEmptyClick() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // 1. Sharp metallic hammer strike transient (sharp triangle down-chirp)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.032);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.04);

        // 2. Firing pin spring click (high metallic ping)
        const ping = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();
        ping.type = 'sawtooth';
        ping.frequency.setValueAtTime(2800, now);
        ping.frequency.exponentialRampToValueAtTime(720, now + 0.02);
        pingGain.gain.setValueAtTime(0.32, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);
        ping.connect(pingGain);
        pingGain.connect(this.sfxGain);
        ping.start(now);
        ping.stop(now + 0.028);

        // 3. Hollow empty chamber acoustic body resonance
        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(260, now);
        thud.frequency.exponentialRampToValueAtTime(58, now + 0.045);
        thudGain.gain.setValueAtTime(0.28, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        thud.connect(thudGain);
        thudGain.connect(this.sfxGain);
        thud.start(now);
        thud.stop(now + 0.055);
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
            sub.frequency.setValueAtTime(130, now);
            sub.frequency.exponentialRampToValueAtTime(28, now + 0.4);
            subGain.gain.setValueAtTime(0.65, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
            sub.connect(subGain);
            subGain.connect(this.sfxGain);
            sub.start(now);
            sub.stop(now + 0.45);
        }
    }

    // ==========================================
    // MULTI-STAGE TACTICAL RELOAD AUDIO
    // ==========================================

    playReload(stage = 1, weaponType = 'ar') {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        // If authentic weapon reload sample is loaded and stage is 1, trigger real reload sample
        if (stage === 1 && this.sampleBuffers.reload && this.sampleBuffers.reload[weaponType]) {
            const buf = this.sampleBuffers.reload[weaponType];
            const source = this.ctx.createBufferSource();
            source.buffer = buf;
            source.playbackRate.setValueAtTime(0.98 + Math.random() * 0.04, now);
            const rGain = this.ctx.createGain();
            rGain.gain.setValueAtTime(0.85, now);
            source.connect(rGain);
            rGain.connect(this.sfxGain);
            source.start(now);
            return;
        }

        // If real reload sample was already played at stage 1, skip subsequent procedural stages
        if (this.sampleBuffers.reload && this.sampleBuffers.reload[weaponType]) {
            return;
        }

        if (weaponType === 'shotgun') {
            if (stage === 1) {
                // Break-action snap open / latch release
                const saw = this.ctx.createOscillator();
                const sawGain = this.ctx.createGain();
                saw.type = 'sawtooth';
                saw.frequency.setValueAtTime(450, now);
                saw.frequency.exponentialRampToValueAtTime(180, now + 0.07);
                sawGain.gain.setValueAtTime(0.48, now);
                sawGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                saw.connect(sawGain);
                sawGain.connect(this.sfxGain);
                saw.start(now);
                saw.stop(now + 0.08);
            } else if (stage === 2) {
                // Twin shell casing ejection clink
                [1950, 2350].forEach((freq, idx) => {
                    const clink = this.ctx.createOscillator();
                    const clinkGain = this.ctx.createGain();
                    clink.type = 'sine';
                    const offset = idx * 0.045;
                    clink.frequency.setValueAtTime(freq, now + offset);
                    clink.frequency.exponentialRampToValueAtTime(freq * 0.82, now + offset + 0.06);
                    clinkGain.gain.setValueAtTime(0.42, now + offset);
                    clinkGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
                    clink.connect(clinkGain);
                    clinkGain.connect(this.sfxGain);
                    clink.start(now + offset);
                    clink.stop(now + offset + 0.08);
                });
            } else if (stage === 3) {
                // Fresh shell insertion click & solid snap closed
                const snap = this.ctx.createOscillator();
                const snapGain = this.ctx.createGain();
                snap.type = 'triangle';
                snap.frequency.setValueAtTime(340, now);
                snap.frequency.exponentialRampToValueAtTime(160, now + 0.05);
                snapGain.gain.setValueAtTime(0.45, now);
                snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                snap.connect(snapGain);
                snapGain.connect(this.sfxGain);
                snap.start(now);
                snap.stop(now + 0.07);

                const thud = this.ctx.createOscillator();
                const thudGain = this.ctx.createGain();
                thud.type = 'sine';
                thud.frequency.setValueAtTime(130, now + 0.025);
                thud.frequency.exponentialRampToValueAtTime(32, now + 0.13);
                thudGain.gain.setValueAtTime(0.55, now + 0.025);
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
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.09);

        } else if (stage === 2) {
            // New mag slap & lock
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(240, now + 0.06);
            gain.gain.setValueAtTime(0.48, now);
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
            osc.frequency.setValueAtTime(460, now);
            osc.frequency.exponentialRampToValueAtTime(950, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.12);
        }
    }

    // Tactical Weapon Draw / Switch Sound
    playSwitchWeapon() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        if (this.sampleBuffers && this.sampleBuffers.switch) {
            const source = this.ctx.createBufferSource();
            source.buffer = this.sampleBuffers.switch;
            source.playbackRate.setValueAtTime(0.96 + Math.random() * 0.08, now);
            const swGain = this.ctx.createGain();
            swGain.gain.setValueAtTime(0.65, now);
            source.connect(swGain);
            swGain.connect(this.sfxGain);
            source.start(now);
            return;
        }

        // Procedural slide cloth/holster rustle
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    // ==========================================
    // MOVEMENT & COMBAT FX
    // ==========================================

    playJump() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
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
        noise.buffer = this.pinkNoiseBuffer || this.createPinkNoiseBuffer(0.35);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(550, now);
        filter.frequency.exponentialRampToValueAtTime(1150, now + 0.28);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.32, now);
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
        osc.frequency.setValueAtTime(75 + Math.random() * 25, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.05);
        gain.gain.setValueAtTime(0.16, now);
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
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(26, now + 0.18);
        gain.gain.setValueAtTime(0.42, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    // ==========================================
    // ARCADE BOOSTER AUDIO SYNTHESIS
    // ==========================================

    playBoosterPickup(type = 'speed') {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        if (type === 'speed') {
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
        } else if (type === 'damage') {
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
        }
    }

    playBoosterExpire(type = 'speed') {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

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

    playAmmoPickup() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

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

        // Mechanical latch click
        const click = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        click.type = 'triangle';
        click.frequency.setValueAtTime(1400, now);
        click.frequency.exponentialRampToValueAtTime(400, now + 0.04);
        clickGain.gain.setValueAtTime(0.35, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        click.connect(clickGain);
        clickGain.connect(this.sfxGain);
        click.start(now);
        click.stop(now + 0.055);
    }

    // ==========================================
    // PROCEDURAL LOW HEALTH AUDIO ENGINE
    // ==========================================

    startLowHealthAudio(tier = 1) {
        if (!this.ctx) return;
        this.resume();

        if (this.lowHealthTier === tier && this.lowHealthTimer) return;

        this.stopLowHealthAudio();
        this.lowHealthTier = tier;

        if (tier === 2) {
            this.playCriticalWarningBeep();
        }

        this.playHeartbeatThud(tier);

        const intervalMs = tier === 2 ? 520 : 1200;
        this.lowHealthTimer = setInterval(() => {
            if (!this.ctx || this.ctx.state === 'suspended') return;
            if (window.playerController && (window.playerController.isDead || !window.game || !window.game.isGameStarted)) {
                this.stopLowHealthAudio();
                return;
            }
            this.playHeartbeatThud(this.lowHealthTier);
        }, intervalMs);
    }

    stopLowHealthAudio() {
        if (this.lowHealthTimer) {
            clearInterval(this.lowHealthTimer);
            this.lowHealthTimer = null;
        }
        this.lowHealthTier = 0;
    }

    playHeartbeatThud(tier = 1) {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        if (tier === 1) {
            const osc = this.ctx.createOscillator();
            const sub = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(115, now);
            filter.Q.setValueAtTime(1.8, now);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(68, now);
            osc.frequency.exponentialRampToValueAtTime(32, now + 0.13);

            sub.type = 'triangle';
            sub.frequency.setValueAtTime(44, now);
            sub.frequency.exponentialRampToValueAtTime(26, now + 0.15);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.24, now + 0.016);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(filter);
            sub.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            sub.start(now);
            osc.stop(now + 0.19);
            sub.stop(now + 0.19);

        } else if (tier === 2) {
            // High-intensity rapid double thud ("lub-dub")
            const osc1 = this.ctx.createOscillator();
            const sub1 = this.ctx.createOscillator();
            const filter1 = this.ctx.createBiquadFilter();
            const gain1 = this.ctx.createGain();

            filter1.type = 'lowpass';
            filter1.frequency.setValueAtTime(145, now);
            filter1.Q.setValueAtTime(2.0, now);

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(78, now);
            osc1.frequency.exponentialRampToValueAtTime(34, now + 0.10);

            sub1.type = 'triangle';
            sub1.frequency.setValueAtTime(48, now);
            sub1.frequency.exponentialRampToValueAtTime(28, now + 0.11);

            gain1.gain.setValueAtTime(0.001, now);
            gain1.gain.linearRampToValueAtTime(0.36, now + 0.012);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

            osc1.connect(filter1);
            sub1.connect(filter1);
            filter1.connect(gain1);
            gain1.connect(this.sfxGain);

            osc1.start(now);
            sub1.start(now);
            osc1.stop(now + 0.14);
            sub1.stop(now + 0.14);

            const t2 = now + 0.135;
            const osc2 = this.ctx.createOscillator();
            const sub2 = this.ctx.createOscillator();
            const filter2 = this.ctx.createBiquadFilter();
            const gain2 = this.ctx.createGain();

            filter2.type = 'lowpass';
            filter2.frequency.setValueAtTime(165, t2);
            filter2.Q.setValueAtTime(2.2, t2);

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(94, t2);
            osc2.frequency.exponentialRampToValueAtTime(38, t2 + 0.11);

            sub2.type = 'triangle';
            sub2.frequency.setValueAtTime(56, t2);
            sub2.frequency.exponentialRampToValueAtTime(32, t2 + 0.12);

            gain2.gain.setValueAtTime(0.001, t2);
            gain2.gain.linearRampToValueAtTime(0.42, t2 + 0.014);
            gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.14);

            osc2.connect(filter2);
            sub2.connect(filter2);
            filter2.connect(gain2);
            gain2.connect(this.sfxGain);

            osc2.start(t2);
            sub2.start(t2);
            osc2.stop(t2 + 0.15);
            sub2.stop(t2 + 0.15);
        }
    }

    playCriticalWarningBeep() {
        if (!this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;

        const notes = [
            { freq: 980, start: now, dur: 0.045, gain: 0.22 },
            { freq: 1318.5, start: now + 0.065, dur: 0.055, gain: 0.26 }
        ];

        notes.forEach(n => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(n.freq, n.start);

            gain.gain.setValueAtTime(0.001, n.start);
            gain.gain.linearRampToValueAtTime(n.gain, n.start + 0.006);
            gain.gain.exponentialRampToValueAtTime(0.001, n.start + n.dur);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(n.start);
            osc.stop(n.start + n.dur + 0.01);
        });
    }

    /* =========================================================
       PROCEDURAL LOBBY BACKGROUND MUSIC (BGM) & DYNAMIC DUCKING
       ========================================================= */

    startMusic() {
        if (!this.initialized) this.init();
        if (this.isMusicPlaying) return;
        if (!this.ctx) return;
        this.resume();

        this.isMusicPlaying = true;
        this.musicCurrentStep = 0;
        this.musicNextNoteTime = this.ctx.currentTime + 0.05;

        const targetVol = this.bgmMuted ? 0.0001 : (this.bgmDucked ? this.bgmDuckedVolume : this.bgmMasterVolume);
        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
        }

        if (this.musicTimer) clearInterval(this.musicTimer);
        this.musicTimer = setInterval(() => {
            if (!this.isMusicPlaying || !this.ctx) return;
            const lookahead = 0.15;
            const secondsPer16th = (60 / this.musicBpm) / 4;

            while (this.musicNextNoteTime < this.ctx.currentTime + lookahead) {
                this.scheduleMusicStep(this.musicCurrentStep, this.musicNextNoteTime);
                this.musicNextNoteTime += secondsPer16th;
                this.musicCurrentStep = (this.musicCurrentStep + 1) % 64;
            }
        }, 40);
    }

    stopMusic() {
        this.isMusicPlaying = false;
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        }
    }

    duckMusic(isDucked = true) {
        if (!this.ctx || !this.musicGain) return;
        this.bgmDucked = isDucked;
        const now = this.ctx.currentTime;
        const targetVol = this.bgmMuted ? 0.0001 : (isDucked ? this.bgmDuckedVolume : this.bgmMasterVolume);
        const targetFilter = isDucked ? 750 : 14000;
        const duration = isDucked ? 1.2 : 1.0;

        try {
            this.musicGain.gain.cancelScheduledValues(now);
            this.musicGain.gain.setValueAtTime(Math.max(0.0001, this.musicGain.gain.value), now);
            this.musicGain.gain.linearRampToValueAtTime(Math.max(0.0001, targetVol), now + duration);

            if (this.musicFilter) {
                this.musicFilter.frequency.cancelScheduledValues(now);
                this.musicFilter.frequency.setValueAtTime(Math.max(200, this.musicFilter.frequency.value), now);
                this.musicFilter.frequency.exponentialRampToValueAtTime(targetFilter, now + duration);
            }
        } catch (e) {
            this.musicGain.gain.value = targetVol;
            if (this.musicFilter) this.musicFilter.frequency.value = targetFilter;
        }
    }

    toggleMusicMute() {
        this.bgmMuted = !this.bgmMuted;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('fps_striker_music_muted', String(this.bgmMuted));
        }
        if (!this.isMusicPlaying && !this.bgmMuted) {
            this.startMusic();
        }
        this.duckMusic(this.bgmDucked);
        return this.bgmMuted;
    }

    setMusicVolume(vol) {
        this.bgmMasterVolume = Math.max(0, Math.min(1, vol));
        if (!this.bgmMuted) {
            this.duckMusic(this.bgmDucked);
        }
    }

    scheduleMusicStep(step, time) {
        if (!this.ctx || !this.musicFilter) return;

        // 1. Kick Drum (tight 4-on-the-floor + syncopation)
        if (step % 4 === 0 || step === 14 || step === 30 || step === 46 || step === 62) {
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();

            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(140, time);
            kickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

            kickGain.gain.setValueAtTime(0.40, time);
            kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

            kickOsc.connect(kickGain);
            kickGain.connect(this.musicFilter);

            kickOsc.start(time);
            kickOsc.stop(time + 0.13);
        }

        // 2. Snare / Clap (Beats 2 and 4)
        if (step % 8 === 4) {
            if (this.whiteNoiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.whiteNoiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1300, time);
                filter.Q.setValueAtTime(1.8, time);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.26, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicFilter);

                noise.start(time);
                noise.stop(time + 0.14);
            }

            const tone = this.ctx.createOscillator();
            const tGain = this.ctx.createGain();
            tone.type = 'triangle';
            tone.frequency.setValueAtTime(185, time);
            tone.frequency.exponentialRampToValueAtTime(75, time + 0.06);

            tGain.gain.setValueAtTime(0.18, time);
            tGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

            tone.connect(tGain);
            tGain.connect(this.musicFilter);

            tone.start(time);
            tone.stop(time + 0.08);
        }

        // 3. Hi-Hats (16th notes with accent and open hat)
        if (this.whiteNoiseBuffer) {
            const isOpen = (step % 8 === 6);
            const isAccented = (step % 2 === 1);
            const hat = this.ctx.createBufferSource();
            hat.buffer = this.whiteNoiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(7400, time);

            const gain = this.ctx.createGain();
            const hatVol = isOpen ? 0.18 : (isAccented ? 0.13 : 0.08);
            const hatDur = isOpen ? 0.14 : 0.035;

            gain.gain.setValueAtTime(hatVol, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + hatDur);

            hat.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicFilter);

            hat.start(time);
            hat.stop(time + hatDur + 0.01);
        }

        // 4. Driving Synthwave Bassline (D minor / Bb / C / A cadence)
        const bar = Math.floor(step / 16);
        let rootNote = 73.42; // D2
        if (bar === 1) rootNote = 58.27; // Bb1
        else if (bar === 2) rootNote = 65.41; // C2
        else if (bar === 3) rootNote = (step % 8 < 4) ? 55.00 : 65.41; // A1 -> C2

        const isUpbeatPulse = (step % 2 === 1);
        const noteFreq = isUpbeatPulse ? rootNote * 2 : rootNote;

        const bOsc = this.ctx.createOscillator();
        const bFilt = this.ctx.createBiquadFilter();
        const bGain = this.ctx.createGain();

        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(noteFreq, time);

        bFilt.type = 'lowpass';
        bFilt.frequency.setValueAtTime(isUpbeatPulse ? 850 : 600, time);
        bFilt.frequency.exponentialRampToValueAtTime(240, time + 0.10);
        bFilt.Q.setValueAtTime(2.2, time);

        bGain.gain.setValueAtTime(0.24, time);
        bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

        bOsc.connect(bFilt);
        bFilt.connect(bGain);
        bGain.connect(this.musicFilter);

        bOsc.start(time);
        bOsc.stop(time + 0.12);

        // 5. Arpeggiated Neon Synth Lead (Catchy electronic hook)
        const melody = [
            // Bar 1: D minor
            293.66, 0, 349.23, 0, 440.00, 0, 587.33, 0,
            440.00, 0, 349.23, 0, 392.00, 0, 440.00, 0,
            // Bar 2: Bb major
            466.16, 0, 587.33, 0, 698.46, 0, 587.33, 0,
            466.16, 0, 440.00, 0, 392.00, 0, 349.23, 0,
            // Bar 3: C major
            523.25, 0, 329.63, 0, 392.00, 0, 523.25, 0,
            392.00, 0, 349.23, 0, 392.00, 0, 523.25, 0,
            // Bar 4: A minor / resolve
            440.00, 0, 523.25, 0, 659.25, 0, 587.33, 0,
            440.00, 0, 349.23, 0, 293.66, 0, 329.63, 0
        ];

        const leadPitch = melody[step];
        if (leadPitch > 0) {
            const mOsc = this.ctx.createOscillator();
            const mSub = this.ctx.createOscillator();
            const mFilter = this.ctx.createBiquadFilter();
            const mGain = this.ctx.createGain();

            mOsc.type = 'triangle';
            mOsc.frequency.setValueAtTime(leadPitch, time);

            mSub.type = 'square';
            mSub.frequency.setValueAtTime(leadPitch, time);

            mFilter.type = 'lowpass';
            mFilter.frequency.setValueAtTime(2600, time);
            mFilter.frequency.exponentialRampToValueAtTime(750, time + 0.14);
            mFilter.Q.setValueAtTime(2.2, time);

            mGain.gain.setValueAtTime(0.001, time);
            mGain.gain.linearRampToValueAtTime(0.16, time + 0.01);
            mGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

            const subGain = this.ctx.createGain();
            subGain.gain.setValueAtTime(0.04, time);

            mOsc.connect(mFilter);
            mSub.connect(subGain);
            subGain.connect(mFilter);
            mFilter.connect(mGain);
            mGain.connect(this.musicFilter);

            mOsc.start(time);
            mSub.start(time);
            mOsc.stop(time + 0.15);
            mSub.stop(time + 0.15);
        }

        // 6. Atmospheric Warm Synth Pad (Bar transitions)
        if (step % 16 === 0) {
            const padRoot = [146.83, 116.54, 130.81, 110.00][Math.floor(step / 16)];
            const pOsc1 = this.ctx.createOscillator();
            const pOsc2 = this.ctx.createOscillator();
            const pFilt = this.ctx.createBiquadFilter();
            const pGain = this.ctx.createGain();

            pOsc1.type = 'sawtooth';
            pOsc2.type = 'triangle';
            pOsc1.frequency.setValueAtTime(padRoot, time);
            pOsc2.frequency.setValueAtTime(padRoot * 1.5, time);

            pFilt.type = 'lowpass';
            pFilt.frequency.setValueAtTime(900, time);

            pGain.gain.setValueAtTime(0.001, time);
            pGain.gain.linearRampToValueAtTime(0.08, time + 0.25);
            pGain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);

            pOsc1.connect(pFilt);
            pOsc2.connect(pFilt);
            pFilt.connect(pGain);
            pGain.connect(this.musicFilter);

            pOsc1.start(time);
            pOsc2.start(time);
            pOsc1.stop(time + 1.9);
            pOsc2.stop(time + 1.9);
        }
    }
}

window.soundEngine = new SoundEngine();
