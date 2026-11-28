'use client';

import type * as ToneModule from 'tone';

export type GameSfxType = 'swipe_yes' | 'swipe_no' | 'tick' | 'vote' | 'winner' | 'badge';

const STORAGE_KEY = 'qc_game_sfx_muted';

export function isGameSfxMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setGameSfxMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
}

interface SoundEngine {
  Tone: typeof ToneModule;
  playBell: (note: string, duration: string, time: number, velocity?: number) => void;
  playSoft: (note: string, duration: string, time: number, velocity?: number) => void;
  tickSynth: ToneModule.MembraneSynth;
}

let enginePromise: Promise<SoundEngine | null> | null = null;

async function getEngine(): Promise<SoundEngine | null> {
  if (typeof window === 'undefined') return null;

  if (!enginePromise) {
    enginePromise = import('tone')
      .then((Tone) => {
        const bellVoices = Array.from({ length: 5 }, () => {
          const s = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 0.25, sustain: 0.08, release: 0.45 },
          }).toDestination();
          s.volume.value = -6;
          return s;
        });

        const softVoices = Array.from({ length: 3 }, () => {
          const s = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.008, decay: 0.14, sustain: 0.04, release: 0.22 },
          }).toDestination();
          s.volume.value = -8;
          return s;
        });

        let bellIdx = 0;
        let softIdx = 0;

        const playBell = (note: string, duration: string, time: number, velocity = 0.85) => {
          const voice = bellVoices[bellIdx % bellVoices.length];
          bellIdx += 1;
          voice.triggerAttackRelease(note, duration, time, velocity);
        };

        const playSoft = (note: string, duration: string, time: number, velocity = 0.7) => {
          const voice = softVoices[softIdx % softVoices.length];
          softIdx += 1;
          voice.triggerAttackRelease(note, duration, time, velocity);
        };

        const tickSynth = new Tone.MembraneSynth({
          pitchDecay: 0.012,
          octaves: 3,
          envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.02 },
        }).toDestination();
        tickSynth.volume.value = -10;

        return { Tone, playBell, playSoft, tickSynth };
      })
      .catch(() => {
        enginePromise = null;
        return null;
      });
  }

  return enginePromise;
}

function playBadgeStrings(Tone: typeof ToneModule) {
  const SHIFT = 6;
  const limiter = new Tone.Limiter(-2).toDestination();
  const bus = new Tone.Compressor(-18, 3).connect(limiter);

  const voices = [
    { detune: -6, delay: 0.0, vib: [5.8, 0.05] as const, vol: -16 },
    { detune: 9, delay: 0.014, vib: [6.4, 0.06] as const, vol: -17 },
  ].map((v) => {
    const vibrato = new Tone.Vibrato(v.vib[0], v.vib[1]).connect(bus);
    const filter = new Tone.Filter(3000, 'lowpass', -12).connect(vibrato);
    return { ...v, vibrato, filter };
  });

  const synths: ToneModule.Synth[] = [];
  const startTime = Tone.now() + 0.01;

  const play = (note: string, dur: number, offset: number, vel = 0.8) => {
    const transposed = Tone.Frequency(note).transpose(SHIFT).toNote();
    voices.forEach((v) => {
      const s = new Tone.Synth({
        detune: v.detune,
        oscillator: { type: 'fatsawtooth', count: 2, spread: 6 },
        envelope: { attack: 0.012, decay: 0.4, sustain: 0.2, release: 0.3 },
      }).connect(v.filter);
      s.volume.value = v.vol;
      s.triggerAttackRelease(transposed, dur, startTime + offset + v.delay, vel);
      synths.push(s);
    });
  };

  play('A#4', 0.1, 0.0, 0.7);
  play('C#5', 0.1, 0.0, 0.75);
  play('B4', 0.55, 0.11, 0.8);
  play('F#5', 0.55, 0.11, 0.9);

  window.setTimeout(() => {
    synths.forEach((s) => s.dispose());
    voices.forEach((v) => {
      v.filter.dispose();
      v.vibrato.dispose();
    });
    bus.dispose();
    limiter.dispose();
  }, 3000);
}

export function playGameSfx(type: GameSfxType): void {
  if (typeof window === 'undefined' || isGameSfxMuted()) return;

  void (async () => {
    try {
      const engine = await getEngine();
      if (!engine) return;

      const { Tone, playBell, playSoft, tickSynth } = engine;
      if (Tone.getContext().state !== 'running') {
        await Tone.start();
      }

      const now = Tone.now() + 0.01;

      switch (type) {
        case 'swipe_yes':
          playSoft('E5', '16n', now, 0.7);
          playSoft('A5', '8n', now + 0.06, 0.8);
          break;
        case 'swipe_no':
          playSoft('D4', '16n', now, 0.55);
          playSoft('A3', '16n', now + 0.05, 0.5);
          break;
        case 'tick':
          tickSynth.triggerAttackRelease('G4', '64n', now, 0.65);
          break;
        case 'vote':
          playBell('G5', '16n', now, 0.7);
          playBell('C6', '8n', now + 0.06, 0.85);
          break;
        case 'winner':
          playBell('D5', '16n', now, 0.75);
          playBell('F#5', '16n', now + 0.08, 0.8);
          playBell('A5', '16n', now + 0.16, 0.85);
          playBell('D5', '4n', now + 0.25, 0.8);
          playBell('A5', '4n', now + 0.25, 0.85);
          playBell('D6', '4n', now + 0.25, 0.9);
          break;
        case 'badge':
          playBadgeStrings(Tone);
          break;
      }
    } catch {
      // Ignore audio playback errors when blocked by browser autoplay policy
    }
  })();
}
