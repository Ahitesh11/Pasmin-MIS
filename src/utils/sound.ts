/**
 * Tiny UI sounds generated with the Web Audio API (no audio files to download).
 * The on/off choice is remembered per browser.
 */
const STORAGE_KEY = 'pasmin_sound_enabled_v1';

let ctx: AudioContext | null = null;
let enabled = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
})();

const listeners = new Set<(on: boolean) => void>();

export const isSoundEnabled = () => enabled;

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Preference just won't persist
  }
  listeners.forEach(fn => fn(on));
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** One short tone with a soft attack/decay so it never "pops" */
function tone(freq: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function playClick() {
  if (!enabled) return;
  tone(1200, 0, 0.05, 0.05, 'triangle');
}

export function playSuccess() {
  if (!enabled) return;
  tone(660, 0, 0.12, 0.08);
  tone(990, 0.09, 0.18, 0.08);
}

export function playError() {
  if (!enabled) return;
  tone(330, 0, 0.14, 0.09, 'triangle');
  tone(220, 0.12, 0.22, 0.09, 'triangle');
}

/** Play a soft click for every button-like element the user presses */
export function installClickSounds() {
  const handler = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const el = target?.closest('button, a[href], [role="button"], select, input[type="checkbox"], input[type="radio"]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    playClick();
  };
  document.addEventListener('click', handler, true);
  return () => document.removeEventListener('click', handler, true);
}
