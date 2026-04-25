export function createCamera(canvas) {
  return {
    x: 0,
    y: 0,
    zoom: 1,
    canvas,

    follow(target, cursor, dt) {
      const lx = target.x + (cursor.worldX - target.x) * 0.1;
      const ly = target.y + (cursor.worldY - target.y) * 0.1;
      const k = Math.min(1, dt * 5);
      this.x += (lx - this.x) * k;
      this.y += (ly - this.y) * k;
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
      ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.x, -this.y);
    },
  };
}
