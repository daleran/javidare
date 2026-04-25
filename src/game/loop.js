const TICK_DT = 1 / 60;
const MAX_ACCUMULATE = TICK_DT * 5; // cap to avoid spiral-of-death after tab blur

export function createLoop(onUpdate, onRender) {
  let lastTime = null;
  let accumulator = 0;
  let rafId = null;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (lastTime === null) {
      lastTime = now;
      return;
    }
    const elapsed = Math.min((now - lastTime) / 1000, MAX_ACCUMULATE);
    lastTime = now;
    accumulator += elapsed;

    while (accumulator >= TICK_DT) {
      onUpdate(TICK_DT);
      accumulator -= TICK_DT;
    }

    onRender(accumulator / TICK_DT);
  }

  return {
    start() { rafId = requestAnimationFrame(frame); },
    stop() { if (rafId !== null) cancelAnimationFrame(rafId); },
  };
}
