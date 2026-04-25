const MAX_CAMERA_LEAD_PX = 10;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;
const ZOOM_SPEED = 0.001;

export function createCamera(canvas) {
  return {
    x: 0,
    y: 0,
    leadX: 0,
    leadY: 0,
    zoom: 1,
    canvas,

    applyScroll(scrollDelta) {
      if (scrollDelta === 0) return;
      this.zoom *= 1 - scrollDelta * ZOOM_SPEED;
      this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom));
    },

    follow(target) {
      this.x = target.x;
      this.y = target.y;
      this.leadX = 0;
      this.leadY = 0;
    },

    worldToScreen(wx, wy) {
      return {
        x: (wx - this.x) * this.zoom + window.innerWidth / 2 + this.leadX,
        y: (wy - this.y) * this.zoom + window.innerHeight / 2 + this.leadY,
      };
    },

    screenToWorld(sx, sy) {
      return {
        x: (sx - window.innerWidth / 2 - this.leadX) / this.zoom + this.x,
        y: (sy - window.innerHeight / 2 - this.leadY) / this.zoom + this.y,
      };
    },

    applyTransform(ctx) {
      const dpr = window.devicePixelRatio || 1;
      const cx = window.innerWidth / 2 + this.leadX;
      const cy = window.innerHeight / 2 + this.leadY;
      ctx.setTransform(
        dpr * this.zoom, 0,
        0, dpr * this.zoom,
        dpr * (cx - this.zoom * this.x),
        dpr * (cy - this.zoom * this.y),
      );
    },
  };
}
