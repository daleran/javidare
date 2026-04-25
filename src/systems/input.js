export function createInput(canvas) {
  const keys = {};
  const pressed = new Set();
  const released = new Set();
  const mouse = { screenX: 0, screenY: 0, worldX: 0, worldY: 0, scrollDelta: 0 };

  window.addEventListener('keydown', e => {
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (!keys[e.code]) pressed.add(e.code);
    keys[e.code] = true;
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
    released.add(e.code);
  });

  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
  });

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.screenX = e.clientX - r.left;
    mouse.screenY = e.clientY - r.top;
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    mouse.scrollDelta += e.deltaY;
  }, { passive: false });

  return {
    keys,
    mouse,
    wasPressed: (code) => pressed.has(code),
    wasReleased: (code) => released.has(code),
    flush() { pressed.clear(); released.clear(); mouse.scrollDelta = 0; },
    updateMouseWorld(camera) {
      const w = camera.screenToWorld(mouse.screenX, mouse.screenY);
      mouse.worldX = w.x;
      mouse.worldY = w.y;
    },
  };
}
