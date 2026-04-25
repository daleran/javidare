const MAX_CAMERA_LEAD_PX = 10; // screen-pixel lead toward cursor

export function createCamera(canvas) {
  return {
    x: 0,
    y: 0,
    leadX: 0,
    leadY: 0,
    zoom: 1,
    canvas,

    // Call before updateMouseWorld each frame — uses raw screen coords, no world needed
    follow(target, mouse) {
      this.x = target.x;
      this.y = target.y;
      const sdx = mouse.screenX - window.innerWidth / 2;
      const sdy = mouse.screenY - window.innerHeight / 2;
      const sDist = Math.hypot(sdx, sdy);
      const lead = sDist > 0 ? Math.min(sDist * 0.4, MAX_CAMERA_LEAD_PX) : 0;
      this.leadX = sDist > 0 ? (sdx / sDist) * lead : 0;
      this.leadY = sDist > 0 ? (sdy / sDist) * lead : 0;
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
      ctx.translate(window.innerWidth / 2 + this.leadX, window.innerHeight / 2 + this.leadY);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.x, -this.y);
    },
  };
}
