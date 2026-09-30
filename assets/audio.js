// Procedural Web Audio Engine for School Surveillance Duty
// Generates 100% synthetic, zero-dependency sound effects and ambient soundscapes.

class SurveillanceAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.ambientGain = null;
        this.isMuted = false;
        this.volume = 0.7;
        this.humOsc = null;
        this.humGain = null;
        this.noiseNode = null;
        this.noiseGain = null;
        this.alarmInterval = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.startAmbientHum();
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.setVolume(this.volume);
        return this.isMuted;
    }

    // Low background drone (electrical camera buzz + night room tone)
    startAmbientHum() {
        if (!this.ctx) return;

        // 50Hz electrical transformer hum
        this.humOsc = this.ctx.createOscillator();
        this.humOsc.type = 'sawtooth';
        this.humOsc.frequency.setValueAtTime(50, this.ctx.currentTime);

        const humFilter = this.ctx.createBiquadFilter();
        humFilter.type = 'lowpass';
        humFilter.frequency.setValueAtTime(120, this.ctx.currentTime);

        this.humGain = this.ctx.createGain();
        this.humGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

        this.humOsc.connect(humFilter);
        humFilter.connect(this.humGain);
        this.humGain.connect(this.masterGain);
        this.humOsc.start();

        // Subtle pink noise for tape/sensor hiss
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            output[i] = (b0 + b1 + b2) * 0.06;
        }

        this.noiseNode = this.ctx.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
        noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

        this.noiseGain = this.ctx.createGain();
        this.noiseGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

        this.noiseNode.connect(noiseFilter);
        noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.masterGain);
        this.noiseNode.start();
    }

    // Camera switch sound: mechanical relay click + burst of white noise static
    playCameraSwitch() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Relay click
        const clickOsc = this.ctx.createOscillator();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(180, now);
        clickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.04);

        const clickGain = this.ctx.createGain();
        clickGain.gain.setValueAtTime(0.3, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        clickOsc.connect(clickGain);
        clickGain.connect(this.masterGain);
        clickOsc.start(now);
        clickOsc.stop(now + 0.05);

        // Static burst
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.09);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.2;
        }

        const burst = this.ctx.createBufferSource();
        burst.buffer = buffer;

        const burstFilter = this.ctx.createBiquadFilter();
        burstFilter.type = 'highpass';
        burstFilter.frequency.setValueAtTime(600, now);

        const burstGain = this.ctx.createGain();
        burstGain.gain.setValueAtTime(0.2, now);
        burstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        burst.connect(burstFilter);
        burstFilter.connect(burstGain);
        burstGain.connect(this.masterGain);
        burst.start(now);
    }

    // Fluorescent light flicker crackle
    playLightFlicker() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.setValueAtTime(120, now + 0.03);
        osc.frequency.setValueAtTime(80, now + 0.06);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    // Blackout thud / power failure sound
    playBlackout() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.6);
    }

    // Button click / UI beep
    playBeep(freq = 880, duration = 0.04) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + duration);
    }

    // Report processing scan sound
    playReportScan() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.3);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    // Success: Anomaly cleaned up! (Pleasant positive double chime)
    playSuccess() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        [587.33, 880].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.45);
        });
    }

    // Error: False report / No anomaly found! (Low buzzer)
    playError() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    // Tension / Danger alert (pulses when active anomalies are high)
    setDangerLevel(activeCount) {
        if (!this.ctx) return;
        if (activeCount >= 3) {
            if (!this.alarmInterval) {
                this.alarmInterval = setInterval(() => {
                    this.playAlarmPulse();
                }, 2200);
            }
        } else {
            if (this.alarmInterval) {
                clearInterval(this.alarmInterval);
                this.alarmInterval = null;
            }
        }
    }

    playAlarmPulse() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.6);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.7);
    }

    // Game Over jumpscare / static crash
    playGameOver() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        if (this.alarmInterval) {
            clearInterval(this.alarmInterval);
            this.alarmInterval = null;
        }

        // Harsh loud glitch / bass impact
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 1.2);

        const bufferSize = this.ctx.sampleRate * 1.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.4;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const masterCrash = this.ctx.createGain();
        masterCrash.gain.setValueAtTime(0.6, now);
        masterCrash.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.connect(masterCrash);
        noise.connect(masterCrash);
        masterCrash.connect(this.masterGain);

        osc.start(now);
        noise.start(now);
        osc.stop(now + 1.6);
        noise.stop(now + 1.6);
    }

    // 06:00 AM School bell chime (Victory melody!)
    playVictoryBell() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Westminister / Dutch School Bell quarters: E4, G#4, F#4, B3 -> E4, F#4, G#4, E4
        const notes = [
            { f: 329.63, t: 0.0 },
            { f: 415.30, t: 0.5 },
            { f: 369.99, t: 1.0 },
            { f: 246.94, t: 1.5 },
            { f: 329.63, t: 2.2 },
            { f: 369.99, t: 2.7 },
            { f: 415.30, t: 3.2 },
            { f: 329.63, t: 3.7 }
        ];

        notes.forEach(n => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(n.f, now + n.t);

            // bell harmonic
            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(n.f * 2.76, now + n.t);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now + n.t);
            gain.gain.linearRampToValueAtTime(0.3, now + n.t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + 1.4);

            const gain2 = this.ctx.createGain();
            gain2.gain.setValueAtTime(0, now + n.t);
            gain2.gain.linearRampToValueAtTime(0.08, now + n.t + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.8);

            osc.connect(gain);
            osc2.connect(gain2);
            gain.connect(this.masterGain);
            gain2.connect(this.masterGain);

            osc.start(now + n.t);
            osc2.start(now + n.t);
            osc.stop(now + n.t + 1.5);
            osc2.stop(now + n.t + 1.5);
        });
    }
}

// Global audio singleton
window.surveillanceAudio = new SurveillanceAudio();
