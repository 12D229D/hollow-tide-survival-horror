/**
 * hollow-tide-survival-horror: Puzle 3 - Cuadro de Fusibles y Subestación Eléctrica
 * Mecánica: 5 conmutadores con diferentes voltajes (40V, 60V, 80V, 100V, 120V).
 * El jugador debe conmutar la combinación exacta que sume exactamente 240V
 * (ej: 40V + 80V + 120V = 240V o 60V + 80V + 100V = 240V).
 * Energiza la cápsula de evacuación y abre la esclusa final.
 */

export class PowerGridPuzzle {
  constructor(audio) {
    this.audio = audio;
    this.isSolved = false;

    // Valores de voltaje de cada relé
    this.breakers = [
      { id: 0, voltage: 40, active: false, label: 'RELÉ α (40V)' },
      { id: 1, voltage: 60, active: false, label: 'RELÉ β (60V)' },
      { id: 2, voltage: 80, active: false, label: 'RELÉ γ (80V)' },
      { id: 3, voltage: 100, active: false, label: 'RELÉ δ (100V)' },
      { id: 4, voltage: 120, active: false, label: 'RELÉ ε (120V)' }
    ];

    this.renderBreakers();
    this.bindEvents();
  }

  renderBreakers() {
    const grid = document.getElementById('breakers-grid');
    if (!grid) return;
    grid.innerHTML = '';

    this.breakers.forEach(b => {
      const el = document.createElement('div');
      el.className = `breaker-switch ${b.active ? 'active' : ''}`;
      el.innerHTML = `
        <span class="label" style="font-size: 0.65rem;">${b.label}</span>
        <div class="breaker-handle"></div>
        <span class="status-val">${b.voltage}V</span>
      `;
      el.addEventListener('click', () => {
        if (this.isSolved) return;
        b.active = !b.active;
        if (this.audio) this.audio.playMechanicalClank();
        this.renderBreakers();
        this.updatePowerSummary();
      });
      grid.appendChild(el);
    });
  }

  bindEvents() {
    const btnEngage = document.getElementById('btn-engage-power');
    if (btnEngage) {
      btnEngage.addEventListener('click', () => {
        this.attemptPowerEngage();
      });
    }

    const btnClose = document.getElementById('btn-close-power');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  calculateTotalVoltage() {
    return this.breakers.reduce((sum, b) => sum + (b.active ? b.voltage : 0), 0);
  }

  updatePowerSummary() {
    const total = this.calculateTotalVoltage();
    const voltEl = document.getElementById('current-voltage');
    if (voltEl) voltEl.textContent = total;

    const statEl = document.getElementById('power-status-indicator');
    if (statEl) {
      if (total === 240) {
        statEl.textContent = 'CIRCUITO COMPATIBLE // LISTO PARA ENGANCHE';
        statEl.className = 'valve-balanced';
      } else if (total > 240) {
        statEl.textContent = 'SOBRECARGA ELÉCTRICA // DISYUNTORES DISPARADOS';
        statEl.className = 'valve-unbalanced';
      } else {
        statEl.textContent = 'POTENCIA INSUFICIENTE // CIRCUITO ABIERTO';
        statEl.className = 'power-off';
      }
    }
  }

  attemptPowerEngage() {
    const total = this.calculateTotalVoltage();
    if (total === 240) {
      this.isSolved = true;
      if (this.audio) this.audio.playMechanicalClank();

      const statEl = document.getElementById('power-status-indicator');
      if (statEl) statEl.textContent = 'SUB-ESTACIÓN ENLIGADA // ENERGÍA RESTAURADA';

      setTimeout(() => {
        this.closeModal();
      }, 1200);

      window.dispatchEvent(new CustomEvent('puzzleCompleted', { detail: { type: 'power' } }));
    } else {
      const statEl = document.getElementById('power-status-indicator');
      if (statEl) statEl.textContent = 'ERROR DE ENLACE // FASE ERRÓNEA';
    }
  }

  openModal() {
    this.renderBreakers();
    this.updatePowerSummary();
    document.getElementById('puzzle-power-modal').classList.remove('hidden');
  }

  closeModal() {
    document.getElementById('puzzle-power-modal').classList.add('hidden');
  }
}
