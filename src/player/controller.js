/**
 * hollow-tide-survival-horror: Controlador del Jugador (Operadora de Mantenimiento)
 * Movimiento cinemático en 3D (WASD), colisiones AABB contra la estación,
 * aceleración con Shift (genera sonido), paso del agua según la marea,
 * control de cámara en tercera persona u opción de cámaras fijas CCTV.
 */
import * as THREE from 'three';

export class PlayerController {
  constructor(scene, camera, colliders, soundSystem, audio) {
    this.scene = scene;
    this.camera = camera;
    this.colliders = colliders;
    this.soundSystem = soundSystem;
    this.audio = audio;

    this.position = new THREE.Vector3(0, 0, -22); // Spawn en Sector A
    this.rotation = 0; // Ángulo de rotación del personaje
    this.health = 100;
    this.maxHealth = 100;
    this.isDead = false;

    // Movimiento
    this.speed = 3.6; // Caminar
    this.runMultiplier = 1.6; // Correr
    this.isMoving = false;
    this.isRunning = false;
    this.stepTimer = 0;

    // Modo de cámara: 'orbital' (tercera persona libre) o 'cctv' (cámara fija estilo clásico)
    this.cameraMode = 'orbital';
    this.cameraAngle = { yaw: 0, pitch: 0.35, distance: 4.8 };
    this.isDraggingMouse = false;
    this.previousMousePosition = { x: 0, y: 0 };

    this.keys = {};
    this.createCharacterMesh();
    this.bindInputs();
  }

  createCharacterMesh() {
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    // Malla de mono de buceo técnico amarillo/naranja gastado
    const torsoGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8);
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0xc8751b, // Naranja óxido de buceo
      roughness: 0.7,
      metalness: 0.3
    });
    this.torso = new THREE.Mesh(torsoGeo, suitMat);
    this.torso.position.y = 0.9;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Casco escafandra con visera reflectante
    const helmGeo = new THREE.SphereGeometry(0.3, 10, 10);
    const helmMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.2,
      metalness: 0.8
    });
    const helmet = new THREE.Mesh(helmGeo, helmMat);
    helmet.position.y = 1.65;
    this.group.add(helmet);

    const visorGeo = new THREE.BoxGeometry(0.32, 0.18, 0.18);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.65, 0.22);
    this.group.add(visor);

    this.scene.add(this.group);
  }

  bindInputs() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyC') {
        this.cameraMode = this.cameraMode === 'orbital' ? 'cctv' : 'orbital';
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    // Control de rotación de cámara con ratón
    window.addEventListener('mousedown', e => {
      if (e.target.tagName === 'CANVAS') {
        this.isDraggingMouse = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingMouse = false;
    });

    window.addEventListener('mousemove', e => {
      if (this.isDraggingMouse && this.cameraMode === 'orbital') {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.cameraAngle.yaw -= deltaX * 0.006;
        this.cameraAngle.pitch = Math.max(0.1, Math.min(1.2, this.cameraAngle.pitch + deltaY * 0.005));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health = Math.max(0, this.health - amount);
    if (this.audio) this.audio.playDamageSting();
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  update(delta, tideLevel, tideSystem) {
    if (this.isDead) return;

    // Cálculo de vector de movimiento respecto a la cámara
    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    this.isMoving = (moveX !== 0 || moveZ !== 0);
    this.isRunning = this.isMoving && (this.keys['ShiftLeft'] || this.keys['ShiftRight']);

    // Si la marea es alta (> 50%), el agua en el suelo frena el movimiento
    const waterDrag = tideLevel > 0.4 ? 0.75 : 1.0;
    const currentSpeed = (this.isRunning ? this.speed * this.runMultiplier : this.speed) * waterDrag;

    if (this.isMoving) {
      // Vector relativo al yaw de la cámara
      const angle = this.cameraAngle.yaw;
      const forward = new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle));
      const right = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));

      const dir = new THREE.Vector3()
        .addScaledVector(forward, -moveZ)
        .addScaledVector(right, moveX)
        .normalize();

      // Nueva posición calculada
      const newPos = this.position.clone().addScaledVector(dir, currentSpeed * delta);

      // Verificación de colisiones AABB simples
      if (!this.checkCollision(newPos)) {
        this.position.copy(newPos);
      }

      // Orientar personaje hacia la dirección de avance
      this.rotation = Math.atan2(dir.x, dir.z);
      this.group.rotation.y = this.rotation;

      // Generación de pasos y ruido
      const inWater = tideSystem.isPositionSubmerged(this.position);
      this.stepTimer += delta * (this.isRunning ? 3.5 : 2.2);

      if (this.stepTimer >= 1.0) {
        this.stepTimer = 0;
        if (this.audio) this.audio.playFootstep(inWater, this.isRunning);

        // Emitir evento acústico
        const noiseIntensity = this.isRunning ? (inWater ? 45 : 30) : (inWater ? 18 : 8);
        this.soundSystem.emitSound(
          this.position.x,
          this.position.z,
          noiseIntensity,
          this.isRunning ? 'Carrera chapoteando' : 'Paso cauteloso'
        );
      }
    }

    // Actualizar posición del grupo visual
    this.group.position.set(this.position.x, 0, this.position.z);

    // Oscilación sutil al caminar
    if (this.isMoving) {
      this.torso.position.y = 0.9 + Math.sin(Date.now() * 0.012) * 0.04;
    }

    // Actualizar cámara
    this.updateCamera();
  }

  checkCollision(targetPos) {
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(targetPos.x, 1.2, targetPos.z),
      new THREE.Vector3(0.9, 2.2, 0.9)
    );

    for (const collider of this.colliders) {
      if (playerBox.intersectsBox(collider)) {
        return true; // Hay colisión
      }
    }
    return false;
  }

  updateCamera() {
    if (this.cameraMode === 'orbital') {
      // Cámara en tercera persona cinemática detrás del operador
      const distance = this.cameraAngle.distance;
      const pitch = this.cameraAngle.pitch;
      const yaw = this.cameraAngle.yaw;

      const camX = this.position.x + Math.sin(yaw) * Math.cos(pitch) * distance;
      const camY = this.position.y + 1.6 + Math.sin(pitch) * distance;
      const camZ = this.position.z + Math.cos(yaw) * Math.cos(pitch) * distance;

      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(this.position.x, this.position.y + 1.2, this.position.z);
    } else {
      // Modo CCTV fijo clásico: cámara anclada en esquina superior del sector actual
      let cctvPos = new THREE.Vector3(0, 5, -12); // Sector A
      if (this.position.z > -8 && this.position.z < 6) {
        cctvPos = new THREE.Vector3(3, 4.5, -1); // Pasillo
      } else if (this.position.z >= 6 && this.position.x < 15) {
        cctvPos = new THREE.Vector3(-10, 5.5, 20); // Sector B
      } else if (this.position.x >= 15) {
        cctvPos = new THREE.Vector3(26, 5.5, 18); // Sector C
      }

      this.camera.position.lerp(cctvPos, 0.08);
      this.camera.lookAt(this.position.x, this.position.y + 1.0, this.position.z);
    }
  }

  getForwardDirection() {
    return new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
  }
}
