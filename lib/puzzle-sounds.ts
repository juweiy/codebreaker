'use client';

type PuzzleSound = 'success' | 'failure';

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function preparePuzzleSounds() {
  const context = getAudioContext();
  if (context?.state === 'suspended') {
    return context.resume().catch(() => undefined);
  }
  return Promise.resolve();
}

function playTone({
  context,
  frequency,
  endFrequency,
  startsAt,
  duration,
  volume,
  type = 'sine',
}: {
  context: AudioContext;
  frequency: number;
  endFrequency?: number;
  startsAt: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
}) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      startsAt + duration
    );
  }

  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

export function playPuzzleSound(sound: PuzzleSound) {
  const context = getAudioContext();
  if (!context || context.state !== 'running') return;

  const now = context.currentTime + 0.01;
  if (sound === 'success') {
    playTone({
      context,
      frequency: 523.25,
      startsAt: now,
      duration: 0.22,
      volume: 0.045,
      type: 'triangle',
    });
    playTone({
      context,
      frequency: 659.25,
      startsAt: now + 0.11,
      duration: 0.24,
      volume: 0.04,
      type: 'triangle',
    });
    playTone({
      context,
      frequency: 783.99,
      startsAt: now + 0.22,
      duration: 0.3,
      volume: 0.035,
      type: 'triangle',
    });
    return;
  }

  playTone({
    context,
    frequency: 220,
    endFrequency: 138.59,
    startsAt: now,
    duration: 0.34,
    volume: 0.04,
  });
  playTone({
    context,
    frequency: 164.81,
    endFrequency: 110,
    startsAt: now + 0.08,
    duration: 0.3,
    volume: 0.025,
    type: 'triangle',
  });
}
