'use client';

export type GameSfxType = 'swipe_yes' | 'swipe_no' | 'tick' | 'vote' | 'winner';

const STORAGE_KEY = 'qc_game_sfx_muted';

export function isGameSfxMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setGameSfxMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
}

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08
) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playGameSfx(sound: GameSfxType): void {
  if (isGameSfxMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    switch (sound) {
      case 'tick':
        playTone(ctx, 760, 0, 0.04, 'triangle', 0.05);
        break;
      case 'swipe_yes':
        playTone(ctx, 523.25, 0, 0.08, 'sine', 0.07);
        playTone(ctx, 659.25, 0.06, 0.11, 'sine', 0.08);
        break;
      case 'swipe_no':
        playTone(ctx, 320, 0, 0.09, 'triangle', 0.06);
        playTone(ctx, 240, 0.06, 0.1, 'triangle', 0.05);
        break;
      case 'vote':
        playTone(ctx, 587.33, 0, 0.08, 'sine', 0.07);
        playTone(ctx, 880, 0.06, 0.14, 'sine', 0.08);
        break;
      case 'winner':
        playTone(ctx, 523.25, 0, 0.12, 'triangle', 0.09);
        playTone(ctx, 659.25, 0.1, 0.12, 'triangle', 0.09);
        playTone(ctx, 783.99, 0.2, 0.14, 'triangle', 0.09);
        playTone(ctx, 1046.5, 0.32, 0.35, 'triangle', 0.1);
        break;
    }
  } catch {
    // Ignore audio playback errors when blocked by browser autoplay policy
  }
}
