export function createInput(canvas) {
  const keys = {};
  const pressed = new Set();
  const released = new Set();
  const mouse = { screenX: 0, screenY: 0, worldX: 0, worldY: 0, scrollDelta: 0 };
  const clicked = new Set();      // left-click edge triggers
  const rightClicked = new Set(); // right-click edge triggers

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

  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) clicked.add('left');
    if (e.button === 2) rightClicked.add('right');
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  return {
    keys,
    mouse,
    clicked,
    rightClicked,
    wasPressed: (code) => pressed.has(code),
    wasReleased: (code) => released.has(code),
    wasClicked: () => clicked.has('left'),
    wasRightClicked: () => rightClicked.has('right'),
    flush() {
      pressed.clear();
      released.clear();
      clicked.clear();
      rightClicked.clear();
      mouse.scrollDelta = 0;
    },
    updateMouseWorld(camera) {
      const w = camera.screenToWorld(mouse.screenX, mouse.screenY);
      mouse.worldX = w.x;
      mouse.worldY = w.y;
    },
  };
}
