// Web Audio API Sound Synthesizer for Hotel POS & Kitchen KDS
let sharedAudioCtx = null;

/**
 * Proactively unlocks mobile browser AudioContext on first tap
 */
export const unlockAudio = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    // Warm up mobile audio hardware with a micro-buffer
    const buf = sharedAudioCtx.createBuffer(1, 1, 22050);
    const src = sharedAudioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(sharedAudioCtx.destination);
    src.start(0);
    return sharedAudioCtx;
  } catch (e) {
    console.warn('Unlock audio error:', e);
    return null;
  }
};

export const playSound = (type = 'order') => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Also trigger mobile device physical vibration for urgent kitchen orders
    if ((type === 'order' || type === 'new_order' || type === 'waiter' || type === 'alert') && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([350, 150, 350, 150, 500]);
      } catch (err) {}
    }

    if (type === 'order' || type === 'new_order' || type === 'kitchen_bell') {
      // High-volume, piercing dual-tone Kitchen Order Chime (Ding-Dong x2)
      const now = ctx.currentTime;
      [0, 0.35].forEach((offset) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(659.25, now + offset); // E5
        osc1.frequency.setValueAtTime(880.00, now + offset + 0.12); // A5

        osc2.frequency.setValueAtTime(783.99, now + offset); // G5
        osc2.frequency.setValueAtTime(1046.50, now + offset + 0.12); // C6

        gain.gain.setValueAtTime(0.4, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.32);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now + offset);
        osc2.start(now + offset);
        osc1.stop(now + offset + 0.32);
        osc2.stop(now + offset + 0.32);
      });
    } else if (type === 'waiter' || type === 'alert') {
      // Urgent Waiter Call Chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'ready' || type === 'pickup') {
      // Ascending triple-tone runner pickup alert (G5 -> B5 -> D6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
      osc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.12); // B5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.24); // D6

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } else if (type === 'click') {
      // Soft UI tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'success' || type === 'settle') {
      // Payment Completed Sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    console.log('Audio playback prevented or unsupported:', e);
  }
};
