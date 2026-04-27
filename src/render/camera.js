const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;
const ZOOM_SPEED = 0.001;
const PAN_SPEED = 600; // world units/sec at zoom=1

export function createCamera(canvas) {
  return {
    x: 0,
    y: 0,
    panOffsetX: 0,
    panOffsetY: 0,
    zoom: 1,
    canvas,

    applyScroll(scrollDelta) {
      if (scrollDelta === 0) return;
      this.zoom *= 1 - scrollDelta * ZOOM_SPEED;
      this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom));
    },

    pan(dx, dy, dt) {
      this.panOffsetX += dx * (PAN_SPEED / this.zoom) * dt;
      this.panOffsetY += dy * (PAN_SPEED / this.zoom) * dt;
    },

    followStation(station) {
      if (!station) return;
      this.x = station.x + this.panOffsetX;
      this.y = station.y + this.panOffsetY;
    },

    worldToScreen(wx, wy) {
      return {
        x: (wx - this.x) * this.zoom + window.innerWidth / 2,
        y: (wy - this.y) * this.zoom + window.innerHeight / 2,
      };
    },

    screenToWorld(sx, sy) {
      return {
        x: (sx - window.innerWidth / 2) / this.zoom + this.x,
        y: (sy - window.innerHeight / 2) / this.zoom + this.y,
      };
    },

    applyTransform(ctx) {
      const dpr = window.devicePixelRatio || 1;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      ctx.setTransform(
        dpr * this.zoom, 0,
        0, dpr * this.zoom,
        dpr * (cx - this.zoom * this.x),
        dpr * (cy - this.zoom * this.y),
      );
    },
  };
}
