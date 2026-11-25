/**
 * hollow-tide-survival-horror: Punto de Entrada Principal (Main)
 * Inicializa Three.js, Sistemas de Mundo, Audio Espacial, IA de La Resaca,
 * Jugador, Puzles, Persistencia SQLite y orquesta los eventos.
 */
import * as THREE from 'three';
import { SpatialAudioEngine } from './audio/spatialAudio.js';
import { PlatformLayout } from './world/platformLayout.js';
import { TideSystem } from './world/tide.js';
import { DoorSystem } from './world/doors.js';
import { SoundPropagationSystem } from './ai/soundPropagation.js';
import { MemoryRoutesSystem } from './ai/memoryRoutes.js';
import { StalkerFSM } from './ai/stalkerFSM.js';
import { PlayerController } from './player/controller.js';
import { FlashlightSystem } from './player/flashlight.js';
import { InventorySystem } from './player/inventory.js';
import { ValveBoardPuzzle } from './puzzles/valveBoard.js';
import { CipherLogPuzzle } from './puzzles/cipherLog.js';
import { PowerGridPuzzle } from './puzzles/powerGrid.js';
import { SQLiteStorageSystem } from './storage/sqlite.js';
import { MapNotesSystem } from './ui/mapNotes.js';
import { HUDSystem } from './ui/hud.js';
import { GameLoop } from './loop.js';

class HollowTideGame {
  constructor() {
    this.completedPuzzles = [];
    this.isVictory = false;
    this.isGameOver = false;

    this.initThree();
    this.initSystems();
    this.bindGlobalEvents();
  }

  initThree() {
    const container = document.getElementById('viewport-canvas-container');

    // Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060f14);
    this.scene.fog = new THREE.FogExp2(0x060f14, 0.045); // Niebla espesa abisal

    // Cámara
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    // Renderizador con sombras
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Redimensionamiento
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initSystems() {
    // 1. Audio Espacial
    this.audio = new SpatialAudioEngine();

    // 2. Entorno y Mundo 3D
    this.world = new PlatformLayout(this.scene);
    this.doors = new DoorSystem(this.scene, this.world.colliders);
    this.tide = new TideSystem(this.scene);

    // 3. Sistemas de Sonido e IA
    this.soundSystem = new SoundPropagationSystem(this.world.navNodes, this.world.navConnections);
    this.memoryRoutes = new MemoryRoutesSystem();
    this.stalker = new StalkerFSM(
      this.scene,
      this.world.navNodes,
      this.world.navConnections,
      this.soundSystem,
      this.memoryRoutes,
      this.audio
    );

    // 4. Jugador e Inventario
    this.player = new PlayerController(this.scene, this.camera, this.world.colliders, this.soundSystem, this.audio);
    this.flashlight = new FlashlightSystem(this.scene);
    this.inventory = new InventorySystem(8);

    // Vincular inventario a la referencia del jugador
    this.player.inventory = this.inventory;

    // 5. Puzles Ambientales
    this.valvePuzzle = new ValveBoardPuzzle(this.tide, this.audio);
    this.cipherPuzzle = new CipherLogPuzzle(this.audio, this.inventory);
    this.powerPuzzle = new PowerGridPuzzle(this.audio);

    // 6. Persistencia SQLite y UI
    this.storage = new SQLiteStorageSystem();
    this.mapSystem = new MapNotesSystem('schematic-map-canvas', this.memoryRoutes);
    this.hud = new HUDSystem(
      this.inventory,
      this.flashlight,
      this.player,
      this.tide,
      this.soundSystem,
      this.storage,
      this.audio
    );

    // 7. Bucle Principal
    this.loop = new GameLoop(
      (delta) => this.update(delta),
      () => this.render()
    );
  }

  bindGlobalEvents() {
    // Inicio del juego desde el modal de presentación (para activar Web Audio)
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        this.audio.init();
        this.audio.resume();
        document.getElementById('splash-modal').classList.add('hidden');
        this.loop.start();
        this.hud.showLogNotification('Conexión con el soporte vital establecida.');
      });
    }

    // Tecla Linterna (F)
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyF') {
        const state = this.flashlight.toggle();
        if (this.audio) this.audio.playMechanicalClank();
        this.hud.showLogNotification(state ? 'Linterna ENCENDIDA' : 'Linterna APAGADA');
      }

      // Tecla Interactuar (E)
      if (e.code === 'KeyE') {
        this.checkInteraction();
      }

      // Tecla Mapa (M)
      if (e.code === 'KeyM') {
        const mapModal = document.getElementById('map-modal');
        if (mapModal.classList.contains('hidden')) {
          this.mapSystem.openModal(
            this.player.position,
            this.stalker.group.position,
            this.valvePuzzle.isSolved,
            this.powerPuzzle.isSolved
          );
        } else {
          this.mapSystem.closeModal();
        }
      }
    });

    // Puzles resueltos
    window.addEventListener('puzzleCompleted', e => {
      const type = e.detail.type;
      if (!this.completedPuzzles.includes(type)) {
        this.completedPuzzles.push(type);
      }

      if (type === 'valve') {
        this.hud.showLogNotification('¡Marea drenada! La velocidad del jugador se restablece.');
      } else if (type === 'cipher') {
        this.hud.showLogNotification('Tarjeta de Acceso C agregada al inventario.');
      } else if (type === 'power') {
        this.hud.showLogNotification('¡Subestación activada! Esclusas energizadas.');
        this.doors.unlockDoor('door_c');
      }
    });

    // Mute de audio en menú pausa
    const btnMute = document.getElementById('btn-toggle-sound');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        const muted = this.audio.toggleMute();
        btnMute.textContent = muted ? 'DESMUTEAR AUDIO' : 'MUTEAR AUDIO';
      });
    }

    // Reanudar pausa
    const btnResume = document.getElementById('btn-resume-game');
    if (btnResume) {
      btnResume.addEventListener('click', () => {
        this.hud.togglePause();
      });
    }

    // Reiniciar desde última boya (GameOver / Botón)
    const btnReload = document.getElementById('btn-gameover-reload');
    if (btnReload) {
      btnReload.addEventListener('click', () => {
        this.reloadFromBuoy();
      });
    }

    const btnReset = document.getElementById('btn-reset-game');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.reloadFromBuoy();
        this.hud.togglePause();
      });
    }

    const btnVicRestart = document.getElementById('btn-victory-restart');
    if (btnVicRestart) {
      btnVicRestart.addEventListener('click', () => {
        location.reload();
      });
    }
  }

  checkInteraction() {
    const playerPos = this.player.position;

    // 1. Revisar objetos interactuables del escenario
    for (let i = 0; i < this.world.interactables.length; i++) {
      const item = this.world.interactables[i];
      const dist = playerPos.distanceTo(item.position);

      if (dist <= (item.radius || 2.5)) {
        // Tipo Pickup
        if (item.type === 'pickup') {
          const added = this.inventory.addItem({
            id: item.itemId,
            name: item.itemName,
            category: item.category,
            quantity: item.quantity,
            maxStack: item.itemId === 'freq_cylinder' ? 5 : 3
          });

          if (added) {
            this.scene.remove(item.mesh);
            this.world.interactables.splice(i, 1);
            if (this.audio) this.audio.playMechanicalClank();
            this.hud.showLogNotification(`Recogido: ${item.itemName}`);
          } else {
            this.hud.showLogNotification('Inventario lleno. No puedes cargar más objetos.');
          }
          return;
        }

        // Tipo Save Buoy
        if (item.type === 'save_buoy') {
          this.hud.openSaveModal(item.name, this.completedPuzzles, this.memoryRoutes.getNotes().length);
          return;
        }

        // Tipo Puzzle
        if (item.type === 'puzzle') {
          if (item.puzzleType === 'valve') this.valvePuzzle.openModal();
          if (item.puzzleType === 'cipher') this.cipherPuzzle.openModal();
          if (item.puzzleType === 'power') this.powerPuzzle.openModal();
          return;
        }

        // Tipo Escape Pod (Condición de Victoria)
        if (item.type === 'escape_pod') {
          if (!this.valvePuzzle.isSolved) {
            this.hud.showLogNotification('ALERTA: El muelle está inundado. Debes drenar la marea en el Sector B.');
            return;
          }
          if (!this.powerPuzzle.isSolved) {
            this.hud.showLogNotification('ALERTA: La cápsula carece de energía. Debes conmutar los relés en el Sector C.');
            return;
          }

          // Victoria
          this.triggerVictory();
          return;
        }
      }
    }

    // 2. Revisar puertas herméticas
    for (const door of this.doors.doors) {
      const dist = playerPos.distanceTo(door.group.position);
      if (dist <= 3.2) {
        if (door.id === 'door_c' && !this.inventory.hasItem('access_keycard')) {
          this.hud.showLogNotification('ESCLUSA SELLADA: Requiere Tarjeta de Acceso C (Archivo de Bitácora).');
          if (this.audio) this.audio.playMechanicalClank();
          return;
        }

        this.doors.toggleDoor(door.id, this.audio);
        return;
      }
    }
  }

  update(delta) {
    if (this.isVictory || this.isGameOver) return;

    // Actualizar Marea
    this.tide.update(delta);

    // Actualizar Puertas
    this.doors.update(delta);

    // Actualizar Jugador
    this.player.update(delta, this.tide.tideLevel, this.tide);

    // Actualizar Linterna
    this.flashlight.update(delta, this.player.position, this.player.getForwardDirection());

    // Actualizar Propagación de Sonido
    this.soundSystem.update(delta);

    // Registrar memoria de ruta del jugador
    this.trackPlayerSector();

    // Actualizar IA de La Resaca
    this.stalker.update(delta, this.player.position, this.player.isRunning, this.tide.tideLevel);

    // Comprobar daño de La Resaca
    const damage = this.stalker.checkPlayerDamage(this.player.position);
    if (damage > 0) {
      this.player.takeDamage(damage);
      this.hud.showLogNotification('¡La Resaca te ha herido gravemente!');
      if (this.player.isDead) {
        this.triggerGameOver();
      }
    }

    // Actualizar Audio Espacial
    this.audio.setListenerPosition(this.player.position.x, this.player.position.y + 1.6, this.player.position.z);
    const distToStalker = this.player.position.distanceTo(this.stalker.group.position);
    const tension = Math.max(0, 1.0 - (distToStalker / 22.0));
    this.audio.setTension(tension);

    // Actualizar HUD
    this.hud.updateVitalHUD();
    this.hud.updateStalkerSensor(this.stalker.state, distToStalker);

    // Comprobar prompt interactivo visual
    this.updateInteractionPrompt();
  }

  trackPlayerSector() {
    // Detectar nodo más cercano para alimentar el mapa de calor
    let closestNode = null;
    let minDist = 999;
    for (const node of this.world.navNodes) {
      const d = Math.hypot(node.x - this.player.position.x, node.z - this.player.position.z);
      if (d < minDist) {
        minDist = d;
        closestNode = node;
      }
    }
    if (closestNode && minDist < 4.0) {
      this.memoryRoutes.recordPlayerVisit(closestNode.id);
    }
  }

  updateInteractionPrompt() {
    const promptEl = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('interaction-prompt-text');
    let nearbyText = null;

    for (const item of this.world.interactables) {
      if (this.player.position.distanceTo(item.position) <= (item.radius || 2.5)) {
        nearbyText = item.name;
        break;
      }
    }

    if (!nearbyText) {
      for (const door of this.doors.doors) {
        if (this.player.position.distanceTo(door.group.position) <= 3.2) {
          nearbyText = door.isOpen ? `Cerrar ${door.label} [E]` : `Abrir ${door.label} [E]`;
          break;
        }
      }
    }

    if (nearbyText) {
      promptText.textContent = nearbyText;
      promptEl.classList.remove('hidden');
    } else {
      promptEl.classList.add('hidden');
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    document.getElementById('gameover-modal').classList.remove('hidden');
    this.audio.playDamageSting();
  }

  triggerVictory() {
    this.isVictory = true;
    const vicModal = document.getElementById('victory-modal');
    const statsEl = document.getElementById('victory-stats-display');
    if (statsEl) {
      statsEl.innerHTML = `
        <p><strong>Puzles resueltos:</strong> 3 / 3 (Válvulas, Bitácora, Subestación)</p>
        <p><strong>Salud residual:</strong> ${this.player.health} HP</p>
        <p><strong>Notas en el mapa:</strong> ${this.memoryRoutes.getNotes().length}</p>
        <p><strong>Estado del Stalker:</strong> Ecos perdidos en la bajamar</p>
      `;
    }
    vicModal.classList.remove('hidden');
    this.audio.playMechanicalClank();
  }

  reloadFromBuoy() {
    const latest = this.storage.getLatestSave();
    if (latest) {
      this.player.health = latest.player_health;
      this.player.isDead = false;
      this.player.position.set(latest.pos_x, latest.pos_y, latest.pos_z);
      this.flashlight.battery = latest.flashlight_battery;
      this.isGameOver = false;
      document.getElementById('gameover-modal').classList.add('hidden');
      this.hud.showLogNotification('Recuperado desde la última boya de registro.');
    } else {
      location.reload();
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

// Inicialización
window.addEventListener('DOMContentLoaded', () => {
  new HollowTideGame();
});
