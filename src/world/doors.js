/**
 * hollow-tide-survival-horror: Sistema de Puertas y Esclusas Herméticas
 * Gestiona el paso entre sectores, esclusas de presión y requisitos de energía.
 */
import * as THREE from 'three';

export class DoorSystem {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.doors = [];

    this.initDoors();
  }

  initDoors() {
    // Puerta hermética entre Sector A y Pasillo A-B
    this.createAirtightDoor(0, 1.8, -11, 'door_ab', 'Esclusa A-B');
    // Puerta hermética entre Pasillo A-B y Sector B
    this.createAirtightDoor(0, 1.8, 1, 'door_b', 'Esclusa Sector B');
    // Esclusa de alta seguridad Sector C (requiere energía)
    this.createAirtightDoor(23, 1.8, 12, 'door_c', 'Esclusa de Contención Sector C', true);
  }

  createAirtightDoor(x, y, z, id, label, locked = false) {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(x, y, z);

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x273b47,
      roughness: 0.6,
      metalness: 0.7,
    });

    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 0.4), doorMat);
    leftPanel.position.set(-1.2, 0, 0);
    doorGroup.add(leftPanel);

    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 0.4), doorMat);
    rightPanel.position.set(1.2, 0, 0);
    doorGroup.add(rightPanel);

    // Indicador luminoso (verde si desbloqueada, rojo si sellada)
    const indGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const indMat = new THREE.MeshBasicMaterial({ color: locked ? 0xef4444 : 0x10b981 });
    const indMesh = new THREE.Mesh(indGeo, indMat);
    indMesh.position.set(0, 1.8, 0.25);
    doorGroup.add(indMesh);

    this.scene.add(doorGroup);

    const boxCollider = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(5, 4, 0.8)
    );
    this.colliders.push(boxCollider);

    this.doors.push({
      id,
      label,
      group: doorGroup,
      leftPanel,
      rightPanel,
      indMesh,
      collider: boxCollider,
      isOpen: false,
      isLocked: locked,
      openProgress: 0,
    });
  }

  unlockDoor(id) {
    const door = this.doors.find(d => d.id === id);
    if (door) {
      door.isLocked = false;
      door.indMesh.material.color.setHex(0x10b981);
    }
  }

  toggleDoor(id, audio) {
    const door = this.doors.find(d => d.id === id);
    if (!door) return false;
    if (door.isLocked) {
      if (audio) audio.playMechanicalClank();
      return false;
    }

    door.isOpen = !door.isOpen;
    if (audio) audio.playMechanicalClank();
    return true;
  }

  update(delta) {
    for (const door of this.doors) {
      const targetProg = door.isOpen ? 1 : 0;
      door.openProgress += (targetProg - door.openProgress) * (delta * 4.0);

      const offset = door.openProgress * 2.2;
      door.leftPanel.position.x = -1.2 - offset;
      door.rightPanel.position.x = 1.2 + offset;

      // Si está abierta, mover el colisionador lejos para permitir el paso
      if (door.openProgress > 0.8) {
        door.collider.min.set(999, 999, 999);
        door.collider.max.set(999, 999, 999);
      } else {
        door.collider.setFromCenterAndSize(door.group.position, new THREE.Vector3(5, 4, 0.8));
      }
    }
  }
}
