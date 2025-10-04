// Reuse audio engine: adapted SFX presets for Snake

const NOTE_FREQS = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'E5': 659.25, 'F#5': 739.99, 'G5': 783.99, 'A5': 880.00,
  'C6': 1046.50, 'D#6': 1244.51, 'E6': 1318.51, 'G6': 1567.98, 'G2': 98.00
};

// Bespoke Snake sound design:
// - eat: short, satisfying "blip" rising interval
// - move: faint tick, randomized to avoid fatigue
// - die: descending triad, slightly detuned
// - intro: simple arpeggio motif evocative of classic Snake
export const SNAKE_SFX = {
  intro: { name: '开场音乐', bpm: 128, waveform: 'triangle', score: 'C4/8 E4/8 G4/8 C5/8 R/8 G4/8 E4/8 C4/4' },
  neon_start: { name: '开始 (霓虹)', bpm: 160, waveform: 'triangle', score: 'C5/8 E5/8 G5/8 C6/8 R/8 G5/8 E5/8 C5/4' },
  neon_eat: { name: '吃食物 (霓虹)', bpm: 260, waveform: 'triangle', score: 'E6/32 G6/32 B6/32' },
  neon_move: { name: '移动 (霓虹)', bpm: 320, waveform: 'square', score: 'C6/64' },
  neon_turn: { name: '转向 (霓虹)', bpm: 300, waveform: 'square', score: 'E6/32' },
  neon_invalid: { name: '无效方向 (霓虹)', bpm: 260, waveform: 'sine', score: 'C4/64' },
  // Echoes neon_start motif descending: C6 → G5 → E5 → C5
  neon_die: { name: '撞击 (霓虹)', bpm: 140, waveform: 'sawtooth', score: 'C6/8 G5/8 E5/8 C5/8' },
  retro_start: { name: '开始 (复古)', bpm: 150, waveform: 'square', score: 'C4/8 D4/8 E4/8 G4/8 R/8 E4/8 D4/8 C4/4' },
  retro_eat: { name: '吃食物 (复古)', bpm: 220, waveform: 'sine', score: 'C5/32 D5/32' },
  retro_move: { name: '移动 (复古)', bpm: 300, waveform: 'square', score: 'C4/64' },
  retro_turn: { name: '转向 (复古)', bpm: 280, waveform: 'square', score: 'D4/64' },
  retro_invalid: { name: '无效方向 (复古)', bpm: 240, waveform: 'sine', score: 'A3/64' },
  // Echoes retro_start motif descending: G4 → E4 → D4 → C4 (8-bit square)
  retro_die: { name: '撞击 (复古)', bpm: 120, waveform: 'square', score: 'G4/8 E4/8 D4/8 C4/8' },
};

let audioCtx = null;
let masterGain = null;
const activeOscillators = new Set();
let currentIntro = null;

export function parseScore(scoreText, bpm) {
  const quarterNoteDuration = 60 / bpm;
  const sequence = [];
  for (const noteString of scoreText.trim().split(/\s+/)) {
    if (noteString.toUpperCase().startsWith('R')) {
      const restMatch = noteString.match(/^R\/(\d+)(\.?)$/i);
      if (!restMatch) continue;
      let duration = (4 / parseInt(restMatch[1])) * quarterNoteDuration;
      if (restMatch[2] === '.') duration *= 1.5;
      sequence.push({ freq: null, duration });
    } else {
      const match = noteString.match(/^([A-G]#?)(\d)\/(\d+)(\.?)$/i);
      if (!match) continue;
      const [, noteName, octave, durationVal, isDotted] = match;
      const freq = NOTE_FREQS[noteName.toUpperCase() + octave];
      if (!freq) continue;
      let duration = (4 / parseInt(durationVal)) * quarterNoteDuration;
      if (isDotted === '.') duration *= 1.5;
      sequence.push({ freq, duration });
    }
  }
  return sequence;
}

// Ensure audio context is only started after a user gesture
let audioUnlocked = false;
export function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    audioUnlocked = true;
  } catch(_) {}
}

export function playScore(scoreData) {
  if (!scoreData) return;
  if (!audioUnlocked) return; // avoid autoplay warnings before user gesture
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { console.error('Web Audio API is not supported'); return; }
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(1, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }
  try { if (audioCtx.state === 'suspended') audioCtx.resume(); } catch(_) {}
  if (masterGain) {
    masterGain.gain.cancelScheduledValues(0);
    masterGain.gain.setValueAtTime(1, audioCtx.currentTime);
  }
  const sequence = parseScore(scoreData.score, scoreData.bpm);
  let currentTime = audioCtx.currentTime + 0.001;
  sequence.forEach(note => {
    if (note.freq) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(masterGain || audioCtx.destination);
      o.type = scoreData.waveform || 'square';
      o.frequency.setValueAtTime(note.freq, currentTime);
      g.gain.setValueAtTime(0.22, currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, currentTime + note.duration * 0.9);
      o.start(currentTime); o.stop(currentTime + note.duration);
      try { activeOscillators.add(o); o.onended = () => { try { activeOscillators.delete(o); } catch(_) {} }; } catch(_) {}
    }
    currentTime += note.duration;
  });
}

export function playIntro(scoreData) {
  if (!scoreData) return;
  if (!audioUnlocked) return; // wait for user gesture
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { console.error('Web Audio API is not supported'); return; }
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(1, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }
  if (masterGain) {
    masterGain.gain.cancelScheduledValues(0);
    masterGain.gain.setValueAtTime(1, audioCtx.currentTime);
  }
  try { if (currentIntro && currentIntro.osc) currentIntro.osc.stop(); } catch(_) {}
  currentIntro = null;
  const sequence = parseScore(scoreData.score, scoreData.bpm);
  const startAt = audioCtx.currentTime + 0.05;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(masterGain || audioCtx.destination);
  o.type = scoreData.waveform || 'square';
  g.gain.setValueAtTime(0.0001, startAt);
  let t = startAt;
  sequence.forEach(note => {
    if (note.freq) {
      o.frequency.setValueAtTime(note.freq, t);
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + note.duration * 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + note.duration * 0.9);
    } else {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(0.0001, t);
    }
    t += note.duration;
  });
  try { o.start(startAt); o.stop(t); } catch(_) {}
  currentIntro = { osc: o, gain: g };
}

export function playSound(type, theme = 'neon') {
  const key = `${theme}_${type}`;
  if (SNAKE_SFX[key]) playScore(SNAKE_SFX[key]);
}

export async function stopAll() {
  if (audioCtx) {
    try { if (masterGain) { masterGain.gain.cancelScheduledValues(0); masterGain.gain.setValueAtTime(0, audioCtx.currentTime); } } catch(_) {}
    try { if (currentIntro && currentIntro.osc) currentIntro.osc.stop(); } catch(_) {}
    currentIntro = null;
    try { for (const o of Array.from(activeOscillators)) { try { o.stop(); } catch(_) {} } activeOscillators.clear(); } catch(_) {}
    try { await audioCtx.suspend(); } catch(_) {}
    try { const ctx = audioCtx; audioCtx = null; masterGain = null; await ctx.close(); } catch(_) {}
  }
}
