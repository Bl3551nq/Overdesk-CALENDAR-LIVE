/**
 * Browser-native Web Audio API synthesizer for the Overdesk widget system
 * High quality, real-time audio synthesis to avoid bulky static files
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    // Standard AudioContext initialization with compatibility fallback
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  
  // Resume context if suspended (browser security restriction)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(err => console.warn('[AudioSynth] Failed to resume AudioContext:', err));
  }
  
  return audioCtx;
}

/**
 * Utility to strike a resonant bell sound.
 * Combines multiple sine oscillators to mimic physical metal resonance.
 */
function playBellStrike(ctx: AudioContext, destination: AudioNode, freq: number, duration: number, gainValue: number = 0.3) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Fundamental frequency
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, ctx.currentTime);

  // Sweet higher major-third / perfect-fifth harmonics
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);

  // Sharp high bell metallic ring harmonic
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(freq * 2.61, ctx.currentTime);

  // Beautiful decay linear envelope to avoid exponential positive-value restrictions
  gainNode.gain.setValueAtTime(gainValue, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  osc3.connect(gainNode);
  gainNode.connect(destination);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc3.start(ctx.currentTime);

  osc1.stop(ctx.currentTime + duration);
  osc2.stop(ctx.currentTime + duration);
  osc3.stop(ctx.currentTime + duration);
}

/**
 * Main synthesizer coordinator
 * Integrates directly as a seamless fallback if dataUri sound options are chosen
 */
export function playSynthesizedSound(soundKey: string): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;

  // Force resume context on user-gesture
  if (ctx.state === 'suspended') {
    ctx.resume().catch(e => console.warn('[AudioSynth] Playback rescue resume failed:', e));
  }

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0.4, ctx.currentTime);
  mainGain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (soundKey) {
    case 'pokemon_colo_heal': {
      // Authentic retro 8-bit Pokémon Center Recovery Heal chime
      const notes = [
        { f: 783.99,  t: 0.0,   d: 0.13 }, // G5
        { f: 1046.50, t: 0.12,  d: 0.13 }, // C6
        { f: 783.99,  t: 0.24,  d: 0.11 }, // G5
        { f: 1046.50, t: 0.35,  d: 0.13 }, // C6
        { f: 1174.66, t: 0.46,  d: 0.13 }, // D6
        { f: 1318.51, t: 0.57,  d: 0.13 }, // E6
        { f: 1567.98, t: 0.69,  d: 0.15 }, // G6
        { f: 1318.51, t: 0.81,  d: 0.13 }, // E6
        { f: 1567.98, t: 0.93,  d: 0.42 }, // G6
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = note.f > 1200 ? 'sine' : 'triangle'; // triangle has a beautiful hollow woodwind/retro feel
        osc.frequency.setValueAtTime(note.f, now + note.t);

        g.gain.setValueAtTime(0.18, now + note.t);
        g.gain.linearRampToValueAtTime(0, now + note.t + note.d);

        osc.connect(g);
        g.connect(mainGain);

        osc.start(now + note.t);
        osc.stop(now + note.t + note.d + 0.05);
      });
      return true;
    }

    case 'happy_bell': {
      // Clear, crystal beautiful desk bell chime
      const freq = 987.77; // B5 pitch
      playBellStrike(ctx, mainGain, freq, 1.4, 0.4);
      return true;
    }

    case 'school_bell': {
      // 12 rapid classic metallic hammer strikes with slight resonant flutter
      const strikes = 13;
      const freq = 680;
      for (let i = 0; i < strikes; i++) {
        const osc = ctx.createOscillator();
        const oscDetune = ctx.createOscillator();
        const g = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        
        oscDetune.type = 'triangle';
        oscDetune.frequency.setValueAtTime(freq * 1.34 + Math.sin(i * 1.5) * 15, now + i * 0.08);

        g.gain.setValueAtTime(0.22, now + i * 0.08);
        g.gain.linearRampToValueAtTime(0, now + i * 0.08 + 0.14);

        osc.connect(g);
        oscDetune.connect(g);
        g.connect(mainGain);

        osc.start(now + i * 0.08);
        oscDetune.start(now + i * 0.08);
        
        osc.stop(now + i * 0.08 + 0.14);
        oscDetune.stop(now + i * 0.08 + 0.14);
      }
      return true;
    }

    case 'sms_bell': {
      // Double sweet modern smartphone ding
      // Chime 1
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      g1.gain.setValueAtTime(0.3, now);
      g1.gain.linearRampToValueAtTime(0, now + 0.35);
      osc1.connect(g1);
      g1.connect(mainGain);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Chime 2 (offset by 120ms, pitch jump to E6)
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.12); // E6
      g2.gain.setValueAtTime(0.35, now + 0.12);
      g2.gain.linearRampToValueAtTime(0, now + 0.12 + 0.45);
      osc2.connect(g2);
      g2.connect(mainGain);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.12 + 0.45);
      return true;
    }

    case 'princess_bell': {
      // Sparkly, fairy-dust wind chime ascending major pentatonic flourish
      const notes = [1046.50, 1174.66, 1318.51, 1567.98, 1760.00, 2093.00, 2637.02]; // C6 to E7 pentatonic glide
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.06);
        g.gain.setValueAtTime(0.18, now + i * 0.06);
        g.gain.linearRampToValueAtTime(0, now + i * 0.06 + 0.4);
        osc.connect(g);
        g.connect(mainGain);
        
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.45);
      });
      return true;
    }

    case 'htc_sms_mail': {
      // Sweet triple-note rapid marimba woodblock notifications
      const htcNotes = [783.99, 987.77, 1174.66]; // G5, B5, D6
      htcNotes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        g.gain.setValueAtTime(0.24, now + i * 0.08);
        g.gain.linearRampToValueAtTime(0, now + i * 0.08 + 0.22);
        osc.connect(g);
        g.connect(mainGain);
        
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
      return true;
    }

    case 'lyft_tone': {
      // Ascending premium rideshare dual-chime chord
      // Note 1 (F5)
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now);
      g1.gain.setValueAtTime(0.28, now);
      g1.gain.linearRampToValueAtTime(0, now + 0.28);
      osc1.connect(g1);
      g1.connect(mainGain);
      osc1.start(now);
      osc1.stop(now + 0.28);

      // Note 2 (Bb5)
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(932.33, now + 0.14);
      g2.gain.setValueAtTime(0.28, now + 0.14);
      g2.gain.linearRampToValueAtTime(0, now + 0.14 + 0.5);
      osc2.connect(g2);
      g2.connect(mainGain);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.14 + 0.55);
      return true;
    }

    default:
      return false;
  }
}
