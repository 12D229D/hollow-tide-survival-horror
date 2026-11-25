/**
 * hollow-tide-survival-horror: Bucle Principal de Juego (Game Loop)
 * Gestiona el paso del tiempo (DeltaTime), actualización a 60 FPS de entidades,
 * física, comprobación de interacciones, detección de daño y estados de victoria/derrota.
 */

export class GameLoop {
  constructor(updateCallback, renderCallback) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
    this.lastTime = 0;
    this.isRunning = false;
    this.animationFrameId = null;

    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  tick(currentTime) {
    if (!this.isRunning) return;

    const delta = Math.min(0.1, (currentTime - this.lastTime) / 1000.0);
    this.lastTime = currentTime;

    if (this.updateCallback) {
      this.updateCallback(delta);
    }

    if (this.renderCallback) {
      this.renderCallback();
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}
