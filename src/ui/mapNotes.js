/**
 * hollow-tide-survival-horror: Sistema de Notas del Mapa y Renderizado Táctico
 * Dibuja un plano esquemático 2D de la plataforma Brinemark (Sectores A, B, C, pasillos,
 * posición del operador, ecos acústicos y notas manuscritas de advertencia).
 */

export class MapNotesSystem {
  constructor(canvasId, memoryRoutes) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.memoryRoutes = memoryRoutes;

    this.bindEvents();
  }

  bindEvents() {
    const btnAdd = document.getElementById('btn-add-note');
    const input = document.getElementById('note-input');
    if (btnAdd && input) {
      btnAdd.addEventListener('click', () => {
        const text = input.value.trim();
        if (text) {
          this.memoryRoutes.addNote(text);
          input.value = '';
          this.renderNotesList();
        }
      });

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const text = input.value.trim();
          if (text) {
            this.memoryRoutes.addNote(text);
            input.value = '';
            this.renderNotesList();
          }
        }
      });
    }

    const btnClose = document.getElementById('btn-close-map');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  renderNotesList() {
    const list = document.getElementById('notes-list');
    if (!list) return;
    list.innerHTML = '';

    const notes = this.memoryRoutes.getNotes();
    if (notes.length === 0) {
      list.innerHTML = '<span style="color: var(--text-dim); font-style: italic;">Sin anotaciones registradas aún.</span>';
      return;
    }

    notes.forEach(n => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; color:var(--c-teal-ocean); font-size:0.75rem; margin-bottom:4px;">
          <span>${n.sector}</span>
          <span>${n.timestamp}</span>
        </div>
        <div>${n.text}</div>
      `;
      list.appendChild(card);
    });
  }

  drawSchematic(playerPos, stalkerPos, tideDrained, powerEngaged) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Limpiar fondo
    ctx.fillStyle = '#0a141c';
    ctx.fillRect(0, 0, w, h);

    // Rejilla técnica militar
    ctx.strokeStyle = '#122533';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Escala y transformación de coordenadas (Mundo 3D -> Canvas 2D)
    // Rango X: -15 a 45 -> 60 unidades. Rango Z: -30 a 25 -> 55 unidades.
    const toCanvasX = (worldX) => 120 + (worldX + 15) * 6.5;
    const toCanvasY = (worldZ) => 50 + (worldZ + 30) * 5.8;

    // Dibujar Sector A (Acceso)
    ctx.fillStyle = '#142633';
    ctx.strokeStyle = '#254b66';
    ctx.lineWidth = 2;
    ctx.fillRect(toCanvasX(-11), toCanvasY(-29), 22 * 6.5, 18 * 5.8);
    ctx.strokeRect(toCanvasX(-11), toCanvasY(-29), 22 * 6.5, 18 * 5.8);

    // Pasillo A-B
    ctx.fillRect(toCanvasX(-3), toCanvasY(-11), 6 * 6.5, 12 * 5.8);
    ctx.strokeRect(toCanvasX(-3), toCanvasY(-11), 6 * 6.5, 12 * 5.8);

    // Sector B (Drenaje)
    ctx.fillRect(toCanvasX(-13), toCanvasY(1), 26 * 6.5, 22 * 5.8);
    ctx.strokeRect(toCanvasX(-13), toCanvasY(1), 26 * 6.5, 22 * 5.8);

    // Pasillo B-C
    ctx.fillRect(toCanvasX(13), toCanvasY(9), 10 * 6.5, 6 * 5.8);
    ctx.strokeRect(toCanvasX(13), toCanvasY(9), 10 * 6.5, 6 * 5.8);

    // Sector C (Generador & Cápsula)
    ctx.fillRect(toCanvasX(22), toCanvasY(1), 20 * 6.5, 22 * 5.8);
    ctx.strokeRect(toCanvasX(22), toCanvasY(1), 20 * 6.5, 22 * 5.8);

    // Rótulos de Salas
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText('SECTOR A: ACCESO', toCanvasX(-8), toCanvasY(-20));
    ctx.fillText('SECTOR B: DRENAJE', toCanvasX(-8), toCanvasY(12));
    ctx.fillText('SECTOR C: ENERGÍA', toCanvasX(24), toCanvasY(12));

    // Indicadores de Puzles / Boyas
    // Boya 1
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(toCanvasX(6), toCanvasY(-24), 5, 0, Math.PI * 2);
    ctx.fill();

    // Boya 2
    ctx.beginPath();
    ctx.arc(toCanvasX(26), toCanvasY(18), 5, 0, Math.PI * 2);
    ctx.fill();

    // Válvulas (Puzle 1)
    ctx.fillStyle = tideDrained ? '#10b981' : '#c084fc';
    ctx.fillRect(toCanvasX(-9), toCanvasY(13), 8, 8);

    // Cripto terminal (Puzle 2)
    ctx.fillRect(toCanvasX(7), toCanvasY(-27), 8, 8);

    // Subestación (Puzle 3)
    ctx.fillStyle = powerEngaged ? '#10b981' : '#c084fc';
    ctx.fillRect(toCanvasX(37), toCanvasY(5), 8, 8);

    // Ecos de La Resaca (Stalker)
    if (stalkerPos) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(toCanvasX(stalkerPos.x), toCanvasY(stalkerPos.z), 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(toCanvasX(stalkerPos.x), toCanvasY(stalkerPos.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Posición del Operador (Jugador)
    if (playerPos) {
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.arc(toCanvasX(playerPos.x), toCanvasY(playerPos.z), 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(toCanvasX(playerPos.x), toCanvasY(playerPos.z), 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  openModal(playerPos, stalkerPos, tideDrained, powerEngaged) {
    this.renderNotesList();
    this.drawSchematic(playerPos, stalkerPos, tideDrained, powerEngaged);
    document.getElementById('map-modal').classList.remove('hidden');
  }

  closeModal() {
    document.getElementById('map-modal').classList.add('hidden');
  }
}
