// Web Audio API to generate mechanical keyboard sounds procedurally
// This avoids external dependencies and assets

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

export const playTypeSound = () => {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const t = ctx.currentTime;

        // 1. Key "Thock" sound (Low frequency sine/triangle with rapid decay)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Randomize pitch slightly for realism
        const baseFreq = 200 + Math.random() * 50;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);

        // Volume envelope (Attack -> Decay)
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.start(t);
        osc.stop(t + 0.1);

        // 2. Key "Click" sound (High frequency noise/click)
        // Simulating the high-pitched click of a switch
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();

        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);

        clickOsc.type = 'square';
        clickOsc.frequency.setValueAtTime(2000 + Math.random() * 500, t);
        clickOsc.frequency.exponentialRampToValueAtTime(1000, t + 0.02);

        clickGain.gain.setValueAtTime(0, t);
        clickGain.gain.linearRampToValueAtTime(0.05, t + 0.005); // Very quiet
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        clickOsc.start(t);
        clickOsc.stop(t + 0.03);

    } catch (e) {
        console.error("Audio play failed", e);
    }
};
