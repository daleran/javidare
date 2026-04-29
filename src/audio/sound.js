const VOLUME_KEY = 'javidare_volume';

let ctx = null;
let masterGain = null;
const buffers = {};
const loopSources = {};
let _volume = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '0.7');

const SOUND_FILES = {
  alien_bark:       ['/sounds/alien_bark.wav', '/sounds/alien_bark2.wav', '/sounds/alien_bark3.wav', '/sounds/alien_bark4.wav', '/sounds/alien_bark5.wav'],
  boss_destroyed:   ['/sounds/boss_destroyed.wav'],
  build:            ['/sounds/build.wav', '/sounds/build2.wav'],
  button_click:     ['/sounds/button_click.wav'],
  button_hover:     ['/sounds/button_hover.wav'],
  follower_spawned: ['/sounds/follower_spawned.wav'],
  laser:            ['/sounds/laser.wav'],
  pickup_credit:    ['/sounds/pickup_credit.wav'],
  ship_destroyed:   ['/sounds/ship_destroyed.wav'],
  ship_thrust:      ['/sounds/ship_thrust.wav'],
  upgrade:          ['/sounds/upgrade.wav', '/sounds/upgrade2.wav'],
  wave_start:       ['/sounds/wave_start.wav'],
};

function ensureContext() {
  if (ctx) return;
  ctx = new AudioContext();
  masterGain = ctx.createGain();
  masterGain.gain.value = _volume;
  masterGain.connect(ctx.destination);
  loadAll();
}

async function loadAll() {
  for (const [name, urls] of Object.entries(SOUND_FILES)) {
    buffers[name] = [];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        buffers[name].push(buf);
      } catch (_) { /* missing file, skip */ }
    }
  }
}

function pickBuffer(name) {
  const bufs = buffers[name];
  if (!bufs || bufs.length === 0) return null;
  return bufs[Math.floor(Math.random() * bufs.length)];
}

export function play(name) {
  ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  const buf = pickBuffer(name);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(masterGain);
  src.start();
}

export function startLoop(name) {
  if (!ctx || ctx.state === 'suspended') return; // only loop after unlock
  if (loopSources[name]) return;
  const buf = pickBuffer(name);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(masterGain);
  src.start();
  loopSources[name] = src;
}

export function stopLoop(name) {
  const src = loopSources[name];
  if (!src) return;
  try { src.stop(); } catch (_) {}
  delete loopSources[name];
}

export function setVolume(v) {
  _volume = Math.max(0, Math.min(1, v));
  localStorage.setItem(VOLUME_KEY, String(_volume));
  if (masterGain) masterGain.gain.value = _volume;
}

export function getVolume() {
  return _volume;
}

export function init() {
  ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
}
