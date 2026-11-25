/**
 * hollow-tide-survival-horror: Puzle 1 - Consola de Válvulas de Drenaje
 * Mecánica: 3 válvulas giratorias (α: +25 PSI, β: +35 PSI, γ: -15 PSI por giro de 90°).
 * El jugador debe alcanzar exactamente 100 PSI para iniciar la purga de agua de la plataforma.
 */

export class ValveBoardPuzzle {
  constructor(tideSystem, audio) {
    this.tideSystem = tideSystem;
    this.audio = audio;
    this.isSolved = false;

    // Estado de las 3 válvulas (en grados: 0, 90, 180, 270)
    this.valves = {
      a: 0, // Válvula Alfa
      b: 0, // Válvula Beta
      c: 0  // Válvula Gamma
    };

    this.bindEvents();
  }

  bindEvents() {
    const btnTurns = document.querySelectorAll('.btn-turn-valve');
    btnTurns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        this.rotateValve(target);
      });
    });

    const btnDrain = document.getElementById('btn-execute-drain');
    if (btnDrain) {
      btnDrain.addEventListener('click', () => {
        this.attemptPurge();
      });
    }

    const btnClose = document.getElementById('btn-close-valve');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  rotateValve(vKey) {
    if (this.isSolved) return;
    this.valves[vKey] = (this.valves[vKey] + 90) % 360;
    if (this.audio) this.audio.playMechanicalClank();
    this.updateUI();
  }

  calculatePressure() {
    // Alfa aporta 25 por cada 90°
    const pA = (this.valves.a / 90) * 25;
    // Beta aporta 35 por cada 90°
    const pB = (this.valves.b / 90) * 35;
    // Gamma purga -15 por cada 90°
    const pC = (this.valves.c / 90) * (-15);

    return Math.max(0, pA + pB + pC);
  }

  updateUI() {
    // Actualizar visual de las ruedas
    ['a', 'b', 'c'].forEach(k => {
      const el = document.getElementById(`valve-${k}`);
      if (el) {
        el.style.transform = `rotate(${this.valves[k]}deg)`;
        el.textContent = `${this.valves[k]}°`;
      }
    });

    const currentP = this.calculatePressure();
    const sumEl = document.getElementById('current-pressure-sum');
    if (sumEl) sumEl.textContent = currentP;

    const indEl = document.getElementById('valve-status-indicator');
    if (indEl) {
      if (currentP === 100) {
        indEl.textContent = 'ESTABILIZADO EN 100 PSI (LISTO)';
        indEl.className = 'valve-balanced';
      } else {
        indEl.textContent = currentP > 100 ? 'SOBREPRESIÓN DE RIESGO' : 'PRESIÓN INSUFICIENTE';
        indEl.className = 'valve-unbalanced';
      }
    }
  }

  attemptPurge() {
    const currentP = this.calculatePressure();
    if (currentP === 100) {
      this.isSolved = true;
      this.tideSystem.drainTide();
      if (this.audio) this.audio.playMechanicalClank();

      const indEl = document.getElementById('valve-status-indicator');
      if (indEl) indEl.textContent = 'DRENAJE COMPLETADO — BAJAMAR';

      setTimeout(() => {
        this.closeModal();
      }, 1200);

      window.dispatchEvent(new CustomEvent('puzzleCompleted', { detail: { type: 'valve' } }));
    } else {
      const indEl = document.getElementById('valve-status-indicator');
      if (indEl) indEl.textContent = 'ERROR: PRESIÓN INESTABLE';
    }
  }

  openModal() {
    this.updateUI();
    document.getElementById('puzzle-valve-modal').classList.remove('hidden');
  }

  closeModal() {
    document.getElementById('puzzle-valve-modal').classList.add('hidden');
  }
}
