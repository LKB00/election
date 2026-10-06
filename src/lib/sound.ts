'use client';
// The EVM beep: one long tone after you press the button. Short and soft, synthesized (no audio file).
let ctx: AudioContext | null = null;
// iPhones suspend sound after an app switch or a call; wake it up on every sound (they run from a tap).
function audio(): AudioContext | null {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state !== 'running') void ctx.resume().catch(() => {});
  return ctx;
}
// People often vote in public: the beep can be switched off (You page, SoundRow), and the choice is remembered on this phone.
export function soundOn() {
  try {
    return localStorage.getItem('sound') !== 'off';
  } catch {
    return true;
  }
}
export function setSound(on: boolean) {
  try {
    localStorage.setItem('sound', on ? 'on' : 'off');
  } catch {
    /* private mode */
  }
}
/** The VVPAT slip landing in its sealed box: one soft, low thud. */
export function vvpatThud() {
  if (!soundOn()) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    /* sound is a bonus, never an error */
  }
}

export function evmBeep() {
  if (!soundOn()) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 2200;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(0.05, ctx.currentTime + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.82);
  } catch {
    /* sound is a bonus, never an error */
  }
}

// One short synthesized sound (no audio files). All of them respect the beep on/off switch.
function blip(type: OscillatorType, from: number, to: number, ms: number, vol: number) {
  if (!soundOn()) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const end = ctx.currentTime + ms / 1000;
    osc.type = type;
    osc.frequency.setValueAtTime(from, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, end);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(end + 0.02);
  } catch {
    /* sound is a bonus, never an error */
  }
}

/** The EVM key going down: plays the instant you press, before the server answers (the beep follows). */
export const keyClick = () => blip('square', 900, 500, 30, 0.035);
/** The VVPAT printer feeding the slip: one tiny tick per step. */
export const printTick = () => blip('square', 2600, 2200, 12, 0.012);
/** A vote saved, outside Election mode: one soft rising "pop" (the EVM beep is for Election mode). */
export const votePop = () => blip('sine', 520, 880, 140, 0.06);
