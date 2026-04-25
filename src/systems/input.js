export function createInput(canvas) {
  const keys = {};
  const pressed = new Set();
  const released = new Set();
  const mouse = { screenX: 0, screenY: 0, worldX: 0, worldY: 0 };

  window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
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
    mouse.screenX = e.clientX - r.left;   // CSS pixels
    mouse.screenY = e.clientY - r.top;
  });

  return {
    keys,
    mouse,
    wasPressed: (code) => pressed.has(code),
    wasReleased: (code) => released.has(code),
    flush() { pressed.clear(); released.clear(); },
    updateMouseWorld(camera) {
      const w = camera.screenToWorld(mouse.screenX, mouse.screenY);
      mouse.worldX = w.x;
      mouse.worldY = w.y;
    },
  };
}
