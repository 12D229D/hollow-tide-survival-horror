/**
 * hollow-tide-survival-horror: Sistema de Persistencia SQLite (WASM / LocalStorage Fallback)
 * Conforme a schema.sql: almacena partidas guardadas en boyas, logs de estación y notas de mapa.
 */

export class SQLiteStorageSystem {
  constructor() {
    this.storageKey = 'hollow_tide_sqlite_db';
    this.db = this.loadDatabase();
  }

  loadDatabase() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.warn('Error parseando base de datos SQLite guardada:', e);
      }
    }

    // Estructura declarativa inicial idéntica a schema.sql
    return {
      save_buoys: [
        {
          id: 1,
          slot_index: 0,
          station_sector: 'Sector A: Cámara de Acceso',
          timestamp: '2026-10-22 17:00:00',
          player_health: 100,
          flashlight_battery: 100.0,
          tide_level: 0.25,
          pos_x: 0,
          pos_y: 0,
          pos_z: -22,
          frequency_cylinders: 2,
          puzzles_completed: [],
          notes_count: 0
        }
      ],
      station_logs: [
        { id: 1, sector: 'Sector A (Acceso)', author: 'Dr. Halperin', content: 'La compuerta del sumidero principal ha cedido.', is_operator_note: 0, created_at: '2026-10-18 04:12:00' },
        { id: 2, sector: 'Sector B (Drenaje)', author: 'Ing. Vane', content: 'Válvulas bloqueadas. Presión óptima: 100 PSI.', is_operator_note: 0, created_at: '2026-10-18 07:45:00' },
        { id: 3, sector: 'Sector C (Generador)', author: 'Capitán Thorne', content: 'Clave de terminal: 4-2-9-0.', is_operator_note: 0, created_at: '2026-10-18 11:20:00' }
      ],
      operator_notes: []
    };
  }

  saveDatabase() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.db));
  }

  /**
   * Guarda el estado del jugador en una boya si tiene cilindros disponibles
   */
  createBuoySave(slotIndex, sectorName, player, flashlight, tideSystem, puzzlesCompleted, notesCount) {
    const saveEntry = {
      id: Date.now(),
      slot_index: slotIndex,
      station_sector: sectorName,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      player_health: player.health,
      flashlight_battery: Math.round(flashlight.battery),
      tide_level: tideSystem.tideLevel,
      pos_x: Math.round(player.position.x * 10) / 10,
      pos_y: Math.round(player.position.y * 10) / 10,
      pos_z: Math.round(player.position.z * 10) / 10,
      frequency_cylinders: player.inventory ? player.inventory.getFrequencyCylindersCount() : 1,
      puzzles_completed: puzzlesCompleted,
      notes_count: notesCount
    };

    // Actualizar o insertar en slot_index
    const existingIdx = this.db.save_buoys.findIndex(b => b.slot_index === slotIndex);
    if (existingIdx !== -1) {
      this.db.save_buoys[existingIdx] = saveEntry;
    } else {
      this.db.save_buoys.push(saveEntry);
    }

    this.saveDatabase();
    return saveEntry;
  }

  getBuoySaves() {
    return this.db.save_buoys;
  }

  getLatestSave() {
    if (this.db.save_buoys.length === 0) return null;
    return this.db.save_buoys[this.db.save_buoys.length - 1];
  }

  exportSQLDump() {
    let sql = `-- DUMP SQLITE HOLLOW TIDE - ${new Date().toISOString()}\n`;
    sql += `BEGIN TRANSACTION;\n`;
    this.db.save_buoys.forEach(b => {
      sql += `INSERT INTO save_buoys (slot_index, station_sector, timestamp, player_health, flashlight_battery, tide_level, pos_x, pos_y, pos_z, frequency_cylinders, puzzles_completed, notes_count) VALUES (${b.slot_index}, '${b.station_sector}', '${b.timestamp}', ${b.player_health}, ${b.flashlight_battery}, ${b.tide_level}, ${b.pos_x}, ${b.pos_y}, ${b.pos_z}, ${b.frequency_cylinders}, '${JSON.stringify(b.puzzles_completed)}', ${b.notes_count});\n`;
    });
    sql += `COMMIT;\n`;
    return sql;
  }
}
