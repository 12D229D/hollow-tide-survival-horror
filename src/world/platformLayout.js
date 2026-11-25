/**
 * hollow-tide-survival-horror: Diseño del nivel de la plataforma Brinemark
 * Genera la geometría 3D con Three.js: Sectores A (Acceso/Esclusa), B (Drenaje/Válvulas),
 * C (Generadores/Relés), Pasillos interconectados, tuberías, boyas de guardado y objetos.
 */
import * as THREE from 'three';

export class PlatformLayout {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Cajas de colisión AABB para jugador y stalker
    this.interactables = []; // Objetos con los que el operador puede interactuar
    this.navNodes = []; // Grafo de navegación para la IA de La Resaca
    this.rooms = [];
    this.lights = [];

    this.initLayout();
  }

  initLayout() {
    this.setupMaterials();
    this.buildSectors();
    this.buildPipesAndDebris();
    this.setupNavigationGraph();
    this.setupLighting();
  }

  setupMaterials() {
    // Materiales industriales envejecidos
    this.floorMat = new THREE.MeshStandardMaterial({
      color: 0x1b2832,
      roughness: 0.85,
      metalness: 0.35,
    });

    this.wallMat = new THREE.MeshStandardMaterial({
      color: 0x182026,
      roughness: 0.9,
      metalness: 0.2,
    });

    this.grateMat = new THREE.MeshStandardMaterial({
      color: 0x27343e,
      roughness: 0.6,
      metalness: 0.7,
      wireframe: false,
    });

    this.hazardMat = new THREE.MeshStandardMaterial({
      color: 0xc88214,
      roughness: 0.5,
      metalness: 0.1,
    });

    this.doorMat = new THREE.MeshStandardMaterial({
      color: 0x223640,
      roughness: 0.7,
      metalness: 0.5,
    });

    this.buoyMat = new THREE.MeshStandardMaterial({
      color: 0xe6a117,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x3d2805,
    });

    this.terminalMat = new THREE.MeshStandardMaterial({
      color: 0x094441,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x042120,
    });
  }

  buildSectors() {
    // Sector A: Cámara de Acceso y Rescate (Esclusa de salida y boya 1)
    this.createRoom({
      id: 'sector_a',
      name: 'Sector A: Cámara de Acceso',
      x: 0, z: -20, width: 22, depth: 18, height: 6,
      color: 0x15222b
    });

    // Pasillo A-B
    this.createCorridor(0, -6, 6, 12, 5);

    // Sector B: Sala de Drenaje y Válvulas Maestras
    this.createRoom({
      id: 'sector_b',
      name: 'Sector B: Válvulas de Drenaje',
      x: 0, z: 12, width: 26, depth: 22, height: 7,
      color: 0x141e24
    });

    // Pasillo B-C (curvado o hacia el lateral este)
    this.createCorridor(16, 12, 14, 6, 5);

    // Sector C: Subestación Eléctrica y Cápsula de Evacuación
    this.createRoom({
      id: 'sector_c',
      name: 'Sector C: Generador & Escape',
      x: 32, z: 12, width: 20, depth: 22, height: 6,
      color: 0x121c22
    });

    // Esclusa de evacuación final en Sector C
    this.createEscapePod(40, 0, 12);

    // Boya de guardado #1 en Sector A
    this.createSaveBuoy(6, 0.8, -24, 'Boya #01 - Acceso');
    // Boya de guardado #2 en Sector C
    this.createSaveBuoy(26, 0.8, 18, 'Boya #02 - Subestación');

    // Consolas de Puzles Ambientales
    this.createPuzzleTerminal(-8, 1, 14, 'valve', 'Consola de Válvulas de Drenaje [E]');
    this.createPuzzleTerminal(8, 1, -26, 'cipher', 'Terminal Criptográfico de Bitácora [E]');
    this.createPuzzleTerminal(38, 1, 6, 'power', 'Cuadro de Relés de Potencia [E]');

    // Suministros repartidos en el escenario (Botiquines de sal/gasa, Baterías, Cilindros de guardado)
    this.createPickupItem(-6, 0.4, -18, 'med_sal', 'Botiquín de Sal y Gasa', 'med', 1);
    this.createPickupItem(4, 0.4, 16, 'battery_pack', 'Batería de Celda Marina', 'tool', 1);
    this.createPickupItem(-8, 0.4, 20, 'freq_cylinder', 'Cilindro de Frecuencia de Boya', 'tool', 1);
    this.createPickupItem(26, 0.4, 6, 'med_sal', 'Botiquín de Sal y Gasa', 'med', 1);
    this.createPickupItem(36, 0.4, 20, 'freq_cylinder', 'Cilindro de Frecuencia de Boya', 'tool', 1);
  }

  createRoom({ id, name, x, z, width, depth, height }) {
    this.rooms.push({ id, name, x, z, width, depth });

    // Suelo metálico con reja
    const floorGeo = new THREE.BoxGeometry(width, 0.4, depth);
    const floor = new THREE.Mesh(floorGeo, this.floorMat);
    floor.position.set(x, -0.2, z);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Techo
    const ceilingGeo = new THREE.BoxGeometry(width, 0.3, depth);
    const ceiling = new THREE.Mesh(ceilingGeo, this.wallMat);
    ceiling.position.set(x, height, z);
    this.scene.add(ceiling);

    // Paredes perimetrales con vanos
    const wallThick = 0.6;
    // Norte (Z -)
    this.createWall(x, height / 2, z - depth / 2, width, height, wallThick);
    // Sur (Z +)
    this.createWall(x, height / 2, z + depth / 2, width, height, wallThick);
    // Oeste (X -)
    this.createWall(x - width / 2, height / 2, z, wallThick, height, depth);
    // Este (X +)
    this.createWall(x + width / 2, height / 2, z, wallThick, height, depth);

    // Columnas de soporte estructural
    const colGeo = new THREE.BoxGeometry(1.2, height, 1.2);
    const colMat = this.hazardMat;
    const offsets = [
      { dx: -width * 0.35, dz: -depth * 0.35 },
      { dx: width * 0.35, dz: -depth * 0.35 },
      { dx: -width * 0.35, dz: depth * 0.35 },
      { dx: width * 0.35, dz: depth * 0.35 },
    ];
    offsets.forEach(off => {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(x + off.dx, height / 2, z + off.dz);
      col.castShadow = true;
      col.receiveShadow = true;
      this.scene.add(col);
      this.colliders.push(new THREE.Box3().setFromObject(col));
    });
  }

  createWall(x, y, z, w, h, d) {
    const wallGeo = new THREE.BoxGeometry(w, h, d);
    const wall = new THREE.Mesh(wallGeo, this.wallMat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.colliders.push(new THREE.Box3().setFromObject(wall));
  }

  createCorridor(x, z, width, depth, height) {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.4, depth), this.grateMat);
    floor.position.set(x, -0.2, z);
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, depth), this.wallMat);
    ceiling.position.set(x, height, z);
    this.scene.add(ceiling);

    // Paredes de pasillo
    if (width < depth) {
      this.createWall(x - width / 2, height / 2, z, 0.5, height, depth);
      this.createWall(x + width / 2, height / 2, z, 0.5, height, depth);
    } else {
      this.createWall(x, height / 2, z - depth / 2, width, height, 0.5);
      this.createWall(x, height / 2, z + depth / 2, width, height, 0.5);
    }
  }

  createEscapePod(x, y, z) {
    const podGroup = new THREE.Group();
    podGroup.position.set(x, y, z);

    // Cápsula esférica/cilíndrica
    const bodyGeo = new THREE.CylinderGeometry(2.5, 2.5, 4.5, 12);
    const bodyMesh = new THREE.Mesh(bodyGeo, this.doorMat);
    bodyMesh.position.y = 2.2;
    podGroup.add(bodyMesh);

    // Ventanilla reforzada
    const portGeo = new THREE.SphereGeometry(0.8, 12, 12);
    const portMat = new THREE.MeshStandardMaterial({ color: 0x51c9c4, emissive: 0x114441, roughness: 0.2 });
    const port = new THREE.Mesh(portGeo, portMat);
    port.position.set(-2, 2.5, 0);
    podGroup.add(port);

    this.scene.add(podGroup);
    this.colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, y + 2, z),
      new THREE.Vector3(5, 5, 5)
    ));

    // Interactuable de escape
    this.interactables.push({
      type: 'escape_pod',
      name: 'Cápsula de Evacuación Hidrostática [E]',
      position: new THREE.Vector3(x - 3.5, 1, z),
      radius: 3.5,
      requiresPower: true,
      requiresDrain: true
    });
  }

  createSaveBuoy(x, y, z, label) {
    const buoyGroup = new THREE.Group();
    buoyGroup.position.set(x, y, z);

    // Base flotante/anclada cónica
    const baseGeo = new THREE.CylinderGeometry(0.5, 0.8, 1.2, 12);
    const baseMesh = new THREE.Mesh(baseGeo, this.buoyMat);
    buoyGroup.add(baseMesh);

    // Luz de baliza intermitente ámbar
    const bulbGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = 0.8;
    buoyGroup.add(bulb);

    const buoyLight = new THREE.PointLight(0xf59e0b, 1.5, 8);
    buoyLight.position.y = 0.8;
    buoyGroup.add(buoyLight);

    this.scene.add(buoyGroup);

    this.interactables.push({
      type: 'save_buoy',
      name: `${label} [E]`,
      position: new THREE.Vector3(x, y, z),
      radius: 2.5,
      light: buoyLight,
      mesh: buoyGroup
    });
  }

  createPuzzleTerminal(x, y, z, puzzleType, promptText) {
    const termGeo = new THREE.BoxGeometry(1.4, 2.0, 1.0);
    const termMesh = new THREE.Mesh(termGeo, this.terminalMat);
    termMesh.position.set(x, y, z);
    this.scene.add(termMesh);
    this.colliders.push(new THREE.Box3().setFromObject(termMesh));

    // Pantalla fosforescente
    const scrGeo = new THREE.PlaneGeometry(0.8, 0.6);
    const scrMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6 });
    const scr = new THREE.Mesh(scrGeo, scrMat);
    scr.position.set(x, y + 0.4, z + 0.52);
    this.scene.add(scr);

    this.interactables.push({
      type: 'puzzle',
      puzzleType: puzzleType,
      name: promptText,
      position: new THREE.Vector3(x, y, z + 1.2),
      radius: 2.8,
      screenMesh: scr
    });
  }

  createPickupItem(x, y, z, itemId, itemName, category, qty) {
    const geom = new THREE.BoxGeometry(0.6, 0.4, 0.4);
    let color = 0x14b8a6;
    if (itemId === 'med_sal') color = 0x22c55e;
    if (itemId === 'freq_cylinder') color = 0xf59e0b;

    const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.25
    }));
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.interactables.push({
      type: 'pickup',
      itemId,
      name: `${itemName} [E]`,
      itemName,
      category,
      quantity: qty,
      position: new THREE.Vector3(x, y, z),
      radius: 2.2,
      mesh: mesh
    });
  }

  buildPipesAndDebris() {
    // Tuberías industriales en techos
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 35, 8), pipeMat);
    p1.rotation.z = Math.PI / 2;
    p1.position.set(0, 4.5, 0);
    this.scene.add(p1);

    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 30, 8), pipeMat);
    p2.rotation.x = Math.PI / 2;
    p2.position.set(16, 4.2, 12);
    this.scene.add(p2);
  }

  setupLighting() {
    // Luz ambiental muy tenue y desaturada (claustrofóbica)
    const ambientLight = new THREE.AmbientLight(0x0a131a, 0.7);
    this.scene.add(ambientLight);

    // Faros halógenos parpadeantes de emergencia en la estación
    const lightA = new THREE.PointLight(0x408090, 1.8, 16);
    lightA.position.set(0, 4.5, -20);
    this.scene.add(lightA);

    const lightB = new THREE.PointLight(0x306870, 2.0, 20);
    lightB.position.set(0, 5.0, 12);
    this.scene.add(lightB);

    const lightC = new THREE.PointLight(0x705030, 1.5, 18);
    lightC.position.set(30, 4.5, 12);
    this.scene.add(lightC);

    this.lights = [lightA, lightB, lightC];
  }

  setupNavigationGraph() {
    // Grafo de nodos espaciales para el pathfinding y patrulla de La Resaca
    this.navNodes = [
      { id: 'node_a_north', x: 0, z: -25, sector: 'Sector A' },
      { id: 'node_a_center', x: 0, z: -20, sector: 'Sector A' },
      { id: 'node_a_south', x: 0, z: -14, sector: 'Sector A' },
      { id: 'node_corr_ab', x: 0, z: -4, sector: 'Pasillo A-B' },
      { id: 'node_corr_ab2', x: 0, z: 4, sector: 'Pasillo A-B' },
      { id: 'node_b_north', x: 0, z: 8, sector: 'Sector B' },
      { id: 'node_b_center', x: 0, z: 12, sector: 'Sector B' },
      { id: 'node_b_valves', x: -8, z: 14, sector: 'Sector B' },
      { id: 'node_b_east', x: 8, z: 12, sector: 'Sector B' },
      { id: 'node_corr_bc', x: 18, z: 12, sector: 'Pasillo B-C' },
      { id: 'node_c_west', x: 26, z: 12, sector: 'Sector C' },
      { id: 'node_c_center', x: 32, z: 12, sector: 'Sector C' },
      { id: 'node_c_power', x: 38, z: 8, sector: 'Sector C' },
      { id: 'node_c_escape', x: 38, z: 16, sector: 'Sector C' }
    ];

    // Conexiones de adyacencia
    this.navConnections = {
      'node_a_north': ['node_a_center'],
      'node_a_center': ['node_a_north', 'node_a_south'],
      'node_a_south': ['node_a_center', 'node_corr_ab'],
      'node_corr_ab': ['node_a_south', 'node_corr_ab2'],
      'node_corr_ab2': ['node_corr_ab', 'node_b_north'],
      'node_b_north': ['node_corr_ab2', 'node_b_center'],
      'node_b_center': ['node_b_north', 'node_b_valves', 'node_b_east'],
      'node_b_valves': ['node_b_center'],
      'node_b_east': ['node_b_center', 'node_corr_bc'],
      'node_corr_bc': ['node_b_east', 'node_c_west'],
      'node_c_west': ['node_corr_bc', 'node_c_center'],
      'node_c_center': ['node_c_west', 'node_c_power', 'node_c_escape'],
      'node_c_power': ['node_c_center'],
      'node_c_escape': ['node_c_center']
    };
  }
}
