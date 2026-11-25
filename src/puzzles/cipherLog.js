/**
 * hollow-tide-survival-horror: Puzle 2 - Terminal Criptográfico de Bitácora
 * Mecánica: Ingresar el código armónico de 4 dígitos (4-2-9-0) extraído de los indicios.
 * Desbloquea las bitácoras secretas del Dr. Halperin y la tarjeta de acceso a la subestación.
 */

export class CipherLogPuzzle {
  constructor(audio, inventory) {
    this.audio = audio;
    this.inventory = inventory;
    this.isSolved = false;
    this.codeCorrect = '4290';
    this.currentCode = '';

    this.bindEvents();
  }

  bindEvents() {
    const keys = document.querySelectorAll('.btn-key[data-num]');
    keys.forEach(k => {
      k.addEventListener('click', () => {
        if (this.currentCode.length < 4) {
          this.currentCode += k.dataset.num;
          if (this.audio) this.audio.playFootstep(false, false);
          this.updateDisplay();
        }
      });
    });

    const btnClear = document.getElementById('btn-cipher-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.currentCode = '';
        this.updateDisplay();
      });
    }

    const btnSubmit = document.getElementById('btn-cipher-submit');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        this.verifyCode();
      });
    }

    const btnClose = document.getElementById('btn-close-cipher');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  updateDisplay() {
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById(`cd-${i}`);
      if (d) {
        d.textContent = this.currentCode[i] || '_';
      }
    }
  }

  verifyCode() {
    const fb = document.getElementById('cipher-feedback');
    if (this.currentCode === this.codeCorrect) {
      this.isSolved = true;
      if (fb) {
        fb.textContent = 'ACCESO CONCEDIDO // FRECUENCIA SINCRONIZADA';
        fb.style.color = 'var(--c-teal-ocean)';
      }
      if (this.audio) this.audio.playMechanicalClank();

      // Entregar tarjeta de acceso si cabe en inventario
      this.inventory.addItem({
        id: 'access_keycard',
        name: 'Tarjeta de Esclusa C',
        category: 'key',
        quantity: 1,
        maxStack: 1,
        desc: 'Tarjeta magnética que energiza la esclusa del Sector C.'
      });

      setTimeout(() => {
        this.closeModal();
      }, 1400);

      window.dispatchEvent(new CustomEvent('puzzleCompleted', { detail: { type: 'cipher' } }));
    } else {
      if (fb) {
        fb.textContent = 'CÓDIGO INCORRECTO // FRECUENCIA ARMÓNICA DESAJUSTADA';
        fb.style.color = 'var(--c-red-danger)';
      }
      this.currentCode = '';
      this.updateDisplay();
    }
  }

  openModal() {
    this.currentCode = '';
    this.updateDisplay();
    const fb = document.getElementById('cipher-feedback');
    if (fb) fb.textContent = '';
    document.getElementById('puzzle-cipher-modal').classList.remove('hidden');
  }

  closeModal() {
    document.getElementById('puzzle-cipher-modal').classList.add('hidden');
  }
}
