/**
 * hollow-tide-survival-horror: Sistema de HUD Diegético y Menús
 * Gestiona el ECG de salud, la batería de la linterna, los indicadores de marea y ruido,
 * el modal de inventario con acciones (usar, descartar) y el terminal de boyas de guardado.
 */

export class HUDSystem {
  constructor(inventory, flashlight, player, tideSystem, soundSystem, storage, audio) {
    this.inventory = inventory;
    this.flashlight = flashlight;
    this.player = player;
    this.tideSystem = tideSystem;
    this.soundSystem = soundSystem;
    this.storage = storage;
    this.audio = audio;

    this.selectedItemIndex = null;
    this.bindEvents();
  }

  bindEvents() {
    // Tecla rápida para inventario (TAB / I) y mapa (M)
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault();
        this.toggleInventory();
      }
      if (e.code === 'Escape') {
        this.togglePause();
      }
    });

    const btnCloseInv = document.getElementById('btn-close-inventory');
    if (btnCloseInv) {
      btnCloseInv.addEventListener('click', () => {
        this.closeInventory();
      });
    }

    const btnCloseSave = document.getElementById('btn-close-save');
    if (btnCloseSave) {
      btnCloseSave.addEventListener('click', () => {
        this.closeSaveModal();
      });
    }

    const btnDoSave = document.getElementById('btn-do-save');
    if (btnDoSave) {
      btnDoSave.addEventListener('click', () => {
        this.performSave();
      });
    }

    const btnExportSql = document.getElementById('btn-export-sqlite');
    if (btnExportSql) {
      btnExportSql.addEventListener('click', () => {
        this.exportDatabase();
      });
    }
  }

  updateVitalHUD() {
    // Salud
    const hp = this.player.health;
    const hpText = document.getElementById('health-value-text');
    const statusText = document.getElementById('health-status-text');
    if (hpText) hpText.textContent = `${hp} HP`;

    if (statusText) {
      if (hp > 65) {
        statusText.textContent = 'ESTABLE';
        statusText.className = 'health-fine';
      } else if (hp > 30) {
        statusText.textContent = 'PRECAUCIÓN';
        statusText.className = 'health-caution';
      } else {
        statusText.textContent = 'PELIGRO CRÍTICO';
        statusText.className = 'health-danger';
      }
    }

    // Batería Linterna
    const bat = Math.round(this.flashlight.battery);
    const batFill = document.getElementById('battery-fill');
    const batText = document.getElementById('battery-text');
    if (batFill) {
      batFill.style.width = `${bat}%`;
      batFill.style.backgroundColor = bat < 20 ? 'var(--c-red-danger)' : (bat < 50 ? 'var(--c-amber-warning)' : 'var(--c-teal-ocean)');
    }
    if (batText) {
      batText.textContent = `${bat}%`;
    }

    // Marea
    const tidePct = this.tideSystem.getTidePercentage();
    const tideFill = document.getElementById('tide-fill');
    const tideText = document.getElementById('tide-text');
    if (tideFill) tideFill.style.width = `${tidePct}%`;
    if (tideText) {
      tideText.textContent = `${tidePct}% (${this.tideSystem.isDrained ? 'BAJAMAR DE SEGURIDAD' : (tidePct > 55 ? 'PLEAMAR DE RIESGO' : 'MAREA MEDIA')})`;
    }

    // Ruido y sensor acústico
    const noisePulse = document.getElementById('noise-pulse');
    const noiseLabel = document.getElementById('noise-level-text');
    if (noisePulse) {
      noisePulse.className = `pulse-dot ${this.soundSystem.getPulseClass()}`;
    }
    if (noiseLabel) {
      noiseLabel.textContent = this.soundSystem.getNoiseLabel();
    }
  }

  updateStalkerSensor(stalkerState, distToPlayer) {
    const alertBox = document.getElementById('stalker-proximity-warning');
    const alertMsg = document.getElementById('stalker-alert-msg');
    if (!alertBox || !alertMsg) return;

    if (stalkerState === 'HUNT') {
      alertBox.className = 'threat-alert-panel stalker-hunt';
      alertMsg.textContent = '¡SENSOR DEPREDADOR: AMENAZA ACÚSTICA INMINENTE!';
      alertBox.style.display = 'flex';
    } else if (distToPlayer < 12.0 || stalkerState === 'STALK') {
      alertBox.className = 'threat-alert-panel stalker-near';
      alertMsg.textContent = 'SENSOR ECOICO: VIBRACIÓN ABISAL DETECTADA';
      alertBox.style.display = 'flex';
    } else {
      alertBox.className = 'threat-alert-panel';
      alertMsg.textContent = 'SENSOR ECOICO: CALMA HIDROSTÁTICA';
    }
  }

  toggleInventory() {
    const invModal = document.getElementById('inventory-modal');
    if (invModal.classList.contains('hidden')) {
      this.openInventory();
    } else {
      this.closeInventory();
    }
  }

  openInventory() {
    this.renderInventory();
    document.getElementById('inventory-modal').classList.remove('hidden');
  }

  closeInventory() {
    document.getElementById('inventory-modal').classList.add('hidden');
    this.selectedItemIndex = null;
  }

  renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    this.inventory.slots.forEach((item, index) => {
      const slot = document.createElement('div');
      slot.className = `inv-slot ${item ? '' : 'empty'} ${this.selectedItemIndex === index ? 'selected' : ''}`;

      if (item) {
        let icon = '📦';
        if (item.category === 'med') icon = '🩹';
        if (item.id === 'battery_pack') icon = '🔋';
        if (item.id === 'freq_cylinder') icon = '🧪';
        if (item.category === 'key') icon = '🔑';

        slot.innerHTML = `
          <span class="inv-slot-icon">${icon}</span>
          ${item.quantity > 1 ? `<span class="inv-slot-count">x${item.quantity}</span>` : ''}
        `;

        slot.addEventListener('click', () => {
          this.selectedItemIndex = index;
          this.renderInventory();
          this.renderItemDetails(item, index);
        });
      }

      grid.appendChild(slot);
    });

    if (this.selectedItemIndex === null) {
      document.getElementById('item-detail-title').textContent = 'Selecciona un objeto';
      document.getElementById('item-detail-desc').textContent = 'El equipo de buceo solo cuenta con 8 compartimentos presurizados.';
      document.getElementById('item-actions').innerHTML = '';
    }
  }

  renderItemDetails(item, index) {
    document.getElementById('item-detail-title').textContent = item.name;
    document.getElementById('item-detail-desc').textContent = item.desc;

    const actBox = document.getElementById('item-actions');
    actBox.innerHTML = '';

    if (item.category === 'med') {
      const btnUse = document.createElement('button');
      btnUse.className = 'btn-terminal highlight';
      btnUse.textContent = 'APLICAR BOTIQUÍN (+45 HP)';
      btnUse.addEventListener('click', () => {
        this.player.heal(45);
        this.inventory.removeItem(index);
        if (this.audio) this.audio.playFootstep(false, false);
        this.selectedItemIndex = null;
        this.renderInventory();
        this.showLogNotification('Has aplicado el botiquín de sal y gasa.');
      });
      actBox.appendChild(btnUse);
    } else if (item.id === 'battery_pack') {
      const btnBat = document.createElement('button');
      btnBat.className = 'btn-terminal highlight';
      btnBat.textContent = 'RECARGAR LINTERNA (+50%)';
      btnBat.addEventListener('click', () => {
        this.flashlight.recharge(50);
        this.inventory.removeItem(index);
        this.selectedItemIndex = null;
        this.renderInventory();
        this.showLogNotification('Batería de linterna recargada.');
      });
      actBox.appendChild(btnBat);
    }
  }

  openSaveModal(sectorName, completedPuzzles, notesCount) {
    this.currentSectorName = sectorName;
    this.completedPuzzles = completedPuzzles;
    this.notesCount = notesCount;
    this.renderSaveSlots();
    document.getElementById('save-modal').classList.remove('hidden');
  }

  closeSaveModal() {
    document.getElementById('save-modal').classList.add('hidden');
  }

  renderSaveSlots() {
    const cont = document.getElementById('save-slots-container');
    if (!cont) return;
    cont.innerHTML = '';

    const saves = this.storage.getBuoySaves();
    const cylinders = this.inventory.getFrequencyCylindersCount();

    if (saves.length === 0) {
      cont.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">No hay registros grabados en boyas de telemetría.</span>';
    } else {
      saves.forEach(s => {
        const row = document.createElement('div');
        row.className = 'save-slot-row';
        row.innerHTML = `
          <div>
            <strong>${s.station_sector}</strong> [${s.timestamp}]<br>
            <span style="font-size:0.75rem; color:var(--text-muted);">Salud: ${s.player_health} HP | Linterna: ${s.flashlight_battery}% | Puzles: ${s.puzzles_completed.length}/3</span>
          </div>
          <span style="color:var(--c-teal-ocean); font-weight:600;">SLOT #${s.slot_index + 1}</span>
        `;
        cont.appendChild(row);
      });
    }

    const btnDoSave = document.getElementById('btn-do-save');
    if (btnDoSave) {
      btnDoSave.textContent = `GRABAR ESTADO (Requiere 1 Cilindro - Tienes ${cylinders})`;
      btnDoSave.disabled = cylinders <= 0;
    }
  }

  performSave() {
    if (this.inventory.consumeItem('freq_cylinder')) {
      const saves = this.storage.getBuoySaves();
      const slotIdx = saves.length % 3; // 3 slots rotativos
      this.storage.createBuoySave(
        slotIdx,
        this.currentSectorName || 'Sector de Plataforma',
        this.player,
        this.flashlight,
        this.tideSystem,
        this.completedPuzzles || [],
        this.notesCount || 0
      );

      if (this.audio) this.audio.playMechanicalClank();
      this.showLogNotification('¡Telemetría grabada exitosamente en la Boya de Registro!');
      this.renderSaveSlots();
    } else {
      this.showLogNotification('ERROR: No posees Cilindros de Frecuencia suficientes.');
    }
  }

  exportDatabase() {
    const dump = this.storage.exportSQLDump();
    const blob = new Blob([dump], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hollow_tide_telemetry_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    this.showLogNotification('Script SQL exportado.');
  }

  showLogNotification(msg) {
    const feed = document.getElementById('log-feed');
    if (!feed) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[SISTEMA]: ${msg}`;
    feed.appendChild(entry);
    setTimeout(() => {
      entry.remove();
    }, 5000);
  }

  togglePause() {
    const pauseModal = document.getElementById('pause-modal');
    if (pauseModal.classList.contains('hidden')) {
      pauseModal.classList.remove('hidden');
    } else {
      pauseModal.classList.add('hidden');
    }
  }
}
