/**
 * hollow-tide-survival-horror: Sistema de Marea Oceánica Dinámica
 * Modula la altura del agua en la plataforma (de 0.05m en bajamar a 1.4m en pleamar).
 * Afecta la velocidad del operador, la amplificación del sonido por chapoteo,
 * la visibilidad submarina y el alcance de desplazamiento de La Resaca.
 */
import * as THREE from 'three';

export class TideSystem {
  constructor(scene) {
    this.scene = scene;
    this.tideLevel = 0.25; // 0.0 a 1.0 (0% a 100%)
    this.targetTide = 0.25;
    this.waterHeight = 0.25; // metros en el eje Y
    this.isDrained = false;
    this.cycleRate = 0.003; // oscilación sutil por marea oceánica

    this.createWaterMesh();
  }

  createWaterMesh() {
    // Malla horizontal de agua traslúcida con tinte salino abisal
    const waterGeo = new THREE.PlaneGeometry(120, 120, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x0a3344,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.65,
    });

    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.position.y = this.waterHeight;
    this.scene.add(this.waterMesh);
  }

  update(delta) {
    // Si no está drenado manualmente, la marea oscila de forma inquietante
    if (!this.isDrained) {
      this.targetTide += Math.sin(Date.now() * 0.0005) * 0.0001;
      this.targetTide = Math.max(0.15, Math.min(0.85, this.targetTide));
    }

    // Suavizado hacia el objetivo
    this.tideLevel += (this.targetTide - this.tideLevel) * (delta * 0.8);
    this.waterHeight = 0.1 + this.tideLevel * 1.3;
    this.waterMesh.position.y = this.waterHeight;

    // Ondulación de la superficie salina
    const time = Date.now() * 0.0015;
    this.waterMesh.rotation.y = Math.sin(time * 0.1) * 0.02;

    // Ajustar opacidad según profundidad
    this.waterMat.opacity = 0.5 + this.tideLevel * 0.35;
  }

  drainTide() {
    this.isDrained = true;
    this.targetTide = 0.05; // Nivel mínimo de seguridad
  }

  getTidePercentage() {
    return Math.round(this.tideLevel * 100);
  }

  isPositionSubmerged(pos) {
    return pos.y < this.waterHeight;
  }
}
