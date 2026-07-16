export const AudioSys = (() => {
    let audioCtx = null;
    let isMuted = false;

    const init = () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    };

    const playTone = (freq, type, duration, vol = 0.1) => {
        if (!audioCtx || isMuted) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    };

    return {
        init: init,
        toggleMute: () => { isMuted = !isMuted; return isMuted; },
        playHover: () => playTone(400, 'sine', 0.1, 0.05),
        playClick: () => {
            if (!audioCtx || isMuted) return;
            playTone(600, 'triangle', 0.1, 0.1);
            setTimeout(() => playTone(800, 'sine', 0.1, 0.1), 50);
        },
        playSuccess: () => {
             if (!audioCtx || isMuted) return;
             // Coin sound / Ding
             playTone(1200, 'sine', 0.1, 0.2);
             setTimeout(() => playTone(1800, 'triangle', 0.3, 0.2), 100);
        },
        playError: () => {
            if (!audioCtx || isMuted) return;
            // Low buzz
            playTone(150, 'sawtooth', 0.3, 0.2);
            setTimeout(() => playTone(100, 'sawtooth', 0.3, 0.2), 100);
        },
        playSiren: () => {
             if (!audioCtx || isMuted) return;
             // Wee-woo
             const osc = audioCtx.createOscillator();
             const gain = audioCtx.createGain();
             osc.type = 'square';
             osc.frequency.setValueAtTime(600, audioCtx.currentTime);
             osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.5);
             
             gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
             gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);

             osc.connect(gain);
             gain.connect(audioCtx.destination);
             osc.start();
             osc.stop(audioCtx.currentTime + 1.0);
        },
        playPop: () => playTone(700, 'sine', 0.1, 0.1)
    };
})();
