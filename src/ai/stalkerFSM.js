/**
 * hollow-tide-survival-horror: IA de La Resaca (Máquina de Estados FSM)
 * Estados: PATROL (patrulla de nodos), INVESTIGATE (acude al punto de ruido),
 * STALK (se posiciona a media distancia acechando sombras), HUNT (persecución agresiva).
 * La velocidad y agresión se ven potenciadas si el nivel de marea es alto o si el operador corre.
 */
import * as THREE from 'three';

export class StalkerFSM {
  constructor(scene, navNodes, navConnections, soundSystem, memoryRoutes, audio) {
    this.scene = scene;
    this.navNodes = navNodes;
    this.navConnections = navConnections;
    this.soundSystem = soundSystem;
    this.memoryRoutes = memoryRoutes;
    this.audio = audio;

    this.state = 'PATROL'; // PATROL, INVESTIGATE, STALK, HUNT
    this.targetNode = null;
    this.targetPos = new THREE.Vector3(0, 1.2, 12);
    this.investigationPoint = null;
    this.investigateTimer = 0;

    this.speed = 2.4;
    this.sightRange = 14.0;
    this.stalkDistance = 9.0;
    this.attackRange = 2.2;
    this.attackCooldown = 0;

    this.createStalkerMesh();
    this.subscribeToNoise();
  }

  createStalkerMesh() {
    this.group = new THREE.Group();
    this.group.position.set(0, 1.5, 12); // Comienza patrullando Sector B

    // Cuerpo biomorfo abisal (textura oscura con bioluminiscencia sutil azul verdoso)
    const bodyGeo = new THREE.ConeGeometry(0.8, 2.4, 8);
    bodyGeo.rotateX(Math.PI);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x051016,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x021f24,
      emissiveIntensity: 0.4
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.group.add(this.bodyMesh);

    // Ojos/Sensores hidroacústicos bioluminiscentes
    const eyeGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(0.25, 0.4, 0.6);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(-0.25, 0.4, 0.6);
    this.group.add(eyeL);
    this.group.add(eyeR);

    // Luz propia de advertencia distante (tenue cian)
    this.glowLight = new THREE.PointLight(0x06b6d4, 1.2, 10);
    this.glowLight.position.set(0, 0.5, 0);
    this.group.add(this.glowLight);

    this.scene.add(this.group);
  }

  subscribeToNoise() {
    this.soundSystem.onSoundEmitted(noiseEvent => {
      // Si el ruido es relevante y no está cazando directamente, cambiar a INVESTIGATE
      if (this.state !== 'HUNT' && noiseEvent.intensity >= 20) {
        this.state = 'INVESTIGATE';
        this.investigationPoint = new THREE.Vector3(noiseEvent.x, 1.2, noiseEvent.z);
        this.investigateTimer = 6.0; // Buscar en esa zona durante 6 segundos
        if (this.audio) {
          this.audio.playStalkerScream(this.group.position.x, this.group.position.y, this.group.position.z, false);
        }
      }
    });
  }

  update(delta, playerPos, isPlayerRunning, tideLevel) {
    if (this.attackCooldown > 0) this.attackCooldown -= delta;

    const stalkerPos = this.group.position;
    const distToPlayer = stalkerPos.distanceTo(playerPos);

    // Ajustar velocidad según la marea (en aguas altas La Resaca es mucho más rápida y letal)
    const waterSpeedBuff = 1.0 + (tideLevel * 0.8);
    const currentSpeed = (this.state === 'HUNT' ? 4.8 : 2.5) * waterSpeedBuff;

    // Evaluación de transiciones de estados
    this.evaluateTransitions(distToPlayer, playerPos, isPlayerRunning);

    // Lógica por estado
    switch (this.state) {
      case 'PATROL':
        this.runPatrol(delta, currentSpeed);
        this.glowLight.color.setHex(0x06b6d4); // Cian vigilante
        break;

      case 'INVESTIGATE':
        this.runInvestigate(delta, currentSpeed);
        this.glowLight.color.setHex(0xf59e0b); // Ámbar de sospecha
        break;

      case 'STALK':
        this.runStalk(delta, playerPos, currentSpeed);
        this.glowLight.color.setHex(0xe11d48); // Rojo acecho
        break;

      case 'HUNT':
        this.runHunt(delta, playerPos, currentSpeed);
        this.glowLight.color.setHex(0xff0033); // Carmesí letal
        break;
    }

    // Flotación / ondulación biomecánica
    this.group.position.y = 1.2 + Math.sin(Date.now() * 0.004) * 0.25;
    this.bodyMesh.rotation.y += delta * 0.8;
  }

  evaluateTransitions(distToPlayer, playerPos, isPlayerRunning) {
    // Si está muy cerca o el jugador corre en su rango de visión, pasa a HUNT
    if (distToPlayer < 7.0 || (distToPlayer < this.sightRange && isPlayerRunning)) {
      if (this.state !== 'HUNT') {
        this.state = 'HUNT';
        if (this.audio) {
          this.audio.playStalkerScream(this.group.position.x, this.group.position.y, this.group.position.z, true);
        }
      }
      return;
    }

    // Si está a media distancia en su cono de detección y no está investigando un ruido puntual
    if (distToPlayer < this.sightRange && this.state === 'PATROL') {
      this.state = 'STALK';
      return;
    }

    // Si pierde de vista al jugador estando en HUNT por más de 18 metros
    if (this.state === 'HUNT' && distToPlayer > 18.0) {
      this.state = 'INVESTIGATE';
      this.investigationPoint = playerPos.clone();
      this.investigateTimer = 5.0;
    }
  }

  runPatrol(delta, speed) {
    if (!this.targetNode) {
      this.pickNextPatrolNode();
    }

    if (!this.targetNode) return;

    const dir = new THREE.Vector3(this.targetNode.x - this.group.position.x, 0, this.targetNode.z - this.group.position.z);
    const dist = dir.length();

    if (dist < 1.2) {
      this.pickNextPatrolNode();
    } else {
      dir.normalize();
      this.group.position.addScaledVector(dir, speed * delta);
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  pickNextPatrolNode() {
    // Consultar el sistema de memoria: ¿hay un nodo preferido para emboscar?
    const ambushId = this.memoryRoutes.getPreferredAmbushNode();
    if (ambushId && Math.random() < 0.4) {
      const node = this.navNodes.find(n => n.id === ambushId);
      if (node) {
        this.targetNode = node;
        return;
      }
    }

    // Si no, tomar un nodo adyacente o aleatorio
    const randIndex = Math.floor(Math.random() * this.navNodes.length);
    this.targetNode = this.navNodes[randIndex];
  }

  runInvestigate(delta, speed) {
    if (!this.investigationPoint) {
      this.state = 'PATROL';
      return;
    }

    const dir = new THREE.Vector3(
      this.investigationPoint.x - this.group.position.x,
      0,
      this.investigationPoint.z - this.group.position.z
    );
    const dist = dir.length();

    if (dist < 1.5) {
      this.investigateTimer -= delta;
      if (this.investigateTimer <= 0) {
        this.state = 'PATROL';
        this.investigationPoint = null;
      }
    } else {
      dir.normalize();
      this.group.position.addScaledVector(dir, speed * delta);
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  runStalk(delta, playerPos, speed) {
    // Se mantiene a distancia táctica sin atacar frontalmente aún
    const dir = new THREE.Vector3(playerPos.x - this.group.position.x, 0, playerPos.z - this.group.position.z);
    const dist = dir.length();

    dir.normalize();
    this.group.rotation.y = Math.atan2(dir.x, dir.z);

    if (dist > this.stalkDistance + 1) {
      this.group.position.addScaledVector(dir, speed * delta);
    } else if (dist < this.stalkDistance - 1) {
      this.group.position.addScaledVector(dir, -speed * delta * 0.7);
    }
  }

  runHunt(delta, playerPos, speed) {
    const dir = new THREE.Vector3(playerPos.x - this.group.position.x, 0, playerPos.z - this.group.position.z);
    dir.normalize();
    this.group.position.addScaledVector(dir, speed * delta);
    this.group.rotation.y = Math.atan2(dir.x, dir.z);
  }

  checkPlayerDamage(playerPos) {
    const dist = this.group.position.distanceTo(playerPos);
    if (dist < this.attackRange && this.attackCooldown <= 0) {
      this.attackCooldown = 1.8; // Tiempo entre golpes
      return 35; // 35 de daño físico por zarpazo abisal
    }
    return 0;
  }
}
