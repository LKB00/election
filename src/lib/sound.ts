'use client';
// The EVM beep: one long tone after you press the button. Short and soft, synthesized (no audio file).
let ctx: AudioContext | null = null;
// People often vote in public: the beep can be switched off (top bar), and the choice is remembered on this phone.
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
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
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
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
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
