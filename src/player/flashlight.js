/**
 * hollow-tide-survival-horror: Sistema de Linterna Submarina
 * Consume batería cuando está activa. Si se agota, parpadea y se apaga,
 * dejando al operador a merced de la oscuridad de la plataforma.
 */
import * as THREE from 'three';

export class FlashlightSystem {
  constructor(scene) {
    this.scene = scene;
    this.isOn = true;
    this.battery = 100.0; // 0 a 100%
    this.drainRate = 1.2; // por segundo encendida
    this.flickerTimer = 0;

    this.createLights();
  }

  createLights() {
    // Haz direccional de linterna tipo foco cónico
    this.spotLight = new THREE.SpotLight(0xd9f3ff, 2.5);
    this.spotLight.angle = Math.PI / 6.5;
    this.spotLight.penumbra = 0.45;
    this.spotLight.decay = 1.8;
    this.spotLight.distance = 28;
    this.spotLight.castShadow = true;

    this.targetObject = new THREE.Object3D();
    this.scene.add(this.targetObject);
    this.spotLight.target = this.targetObject;

    this.scene.add(this.spotLight);
  }

  toggle() {
    if (this.battery <= 0) return false;
    this.isOn = !this.isOn;
    this.spotLight.visible = this.isOn;
    return this.isOn;
  }

  recharge(amount = 50.0) {
    this.battery = Math.min(100.0, this.battery + amount);
    if (!this.isOn && this.battery > 10) {
      this.isOn = true;
      this.spotLight.visible = true;
    }
  }

  update(delta, playerPos, forwardDir) {
    // Actualizar posición y dirección
    this.spotLight.position.copy(playerPos).add(new THREE.Vector3(0, 1.4, 0));
    const targetPos = playerPos.clone().add(forwardDir.clone().multiplyScalar(10));
    targetPos.y += 0.8;
    this.targetObject.position.copy(targetPos);

    if (this.isOn) {
      this.battery = Math.max(0, this.battery - this.drainRate * delta);

      // Si la batería es baja (< 15%), parpadear
      if (this.battery < 15 && this.battery > 0) {
        this.flickerTimer += delta * 12;
        this.spotLight.intensity = Math.sin(this.flickerTimer) > 0 ? 1.5 : 0.2;
      } else if (this.battery <= 0) {
        this.isOn = false;
        this.spotLight.visible = false;
      } else {
        this.spotLight.intensity = 2.5;
      }
    }
  }
}
