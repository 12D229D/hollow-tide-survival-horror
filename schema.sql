-- =========================================================================
-- HOLLOW TIDE — ESQUEMA DECLARATIVO DE BASE DE DATOS SQLITE (TELEMETRÍA Y GUARDADO)
-- Conforme al estándar de persistencia de AGENTS.md y SPEC.md
-- =========================================================================

-- Tabla de Boyas de Guardado (Registros criogénicos de telemetría en la estación)
CREATE TABLE IF NOT EXISTS save_buoys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_index INTEGER NOT NULL,
  station_sector TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  player_health INTEGER NOT NULL DEFAULT 100,
  flashlight_battery REAL NOT NULL DEFAULT 100.0,
  tide_level REAL NOT NULL DEFAULT 0.25,
  pos_x REAL NOT NULL,
  pos_y REAL NOT NULL,
  pos_z REAL NOT NULL,
  frequency_cylinders INTEGER NOT NULL DEFAULT 2,
  puzzles_completed TEXT NOT NULL DEFAULT '[]', -- JSON array: ['valve', 'cipher', 'power']
  notes_count INTEGER NOT NULL DEFAULT 0
);

-- Tabla de Inventario de Operador
CREATE TABLE IF NOT EXISTS player_inventory (
  slot_index INTEGER PRIMARY KEY,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  max_stack INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL -- 'med', 'tool', 'key', 'ammo'
);

-- Tabla de Bitácora y Notas del Mapa
CREATE TABLE IF NOT EXISTS station_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sector TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  is_operator_note BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Tabla de Telemetría Acústica de La Resaca (IA Stalker)
CREATE TABLE IF NOT EXISTS stalker_acoustic_telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state TEXT NOT NULL, -- 'PATROL', 'INVESTIGATING', 'STALKING', 'HUNTING'
  last_known_node TEXT NOT NULL,
  noise_level REAL NOT NULL,
  recorded_at TEXT NOT NULL
);

-- Datos Semilla de Bitácoras de la Plataforma Brinemark
INSERT OR IGNORE INTO station_logs (id, sector, author, content, is_operator_note, created_at)
VALUES 
  (1, 'Sector A (Acceso)', 'Dr. Halperin', 'La compuerta del sumidero principal ha cedido. La salinidad está atrayendo a la biomasa abisal.', 0, '2026-10-18 04:12:00'),
  (2, 'Sector B (Drenaje)', 'Ing. Vane', 'Válvulas bloqueadas por acumulación calcárea. La presión óptima de purga es exactamente 100 PSI.', 0, '2026-10-18 07:45:00'),
  (3, 'Sector C (Generador)', 'Capitán Thorne', 'Evacuación de emergencia ordenada. Código de clave de terminal: 4-2-9-0. Dejo la cápsula lista.', 0, '2026-10-18 11:20:00');
