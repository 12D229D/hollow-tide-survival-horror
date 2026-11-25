/**
 * hollow-tide-survival-horror: Sistema de Rutas y Memoria Adaptativa
 * Almacena las zonas más transitadas por el jugador y las notas dejadas en el mapa.
 * La entidad 'La Resaca' analiza estos patrones para tender emboscadas en pasillos clave.
 */

export class MemoryRoutesSystem {
  constructor() {
    this.operatorHeatmap = {}; // nodoId -> conteo de visitas del jugador
    this.operatorNotes = []; // array de { id, text, timestamp, sector }
    this.ambushNodes = [];
  }

  recordPlayerVisit(nodeId) {
    if (!nodeId) return;
    this.operatorHeatmap[nodeId] = (this.operatorHeatmap[nodeId] || 0) + 1;
    this.updateAmbushLikelihood();
  }

  addNote(text, sector = 'Planta General') {
    const note = {
      id: Date.now(),
      text,
      sector,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.operatorNotes.push(note);
    return note;
  }

  getNotes() {
    return this.operatorNotes;
  }

  updateAmbushLikelihood() {
    // Identificar los 2 nodos con mayor tráfico para priorizarlos en el acecho
    const sorted = Object.entries(this.operatorHeatmap).sort((a, b) => b[1] - a[1]);
    this.ambushNodes = sorted.slice(0, 3).map(entry => entry[0]);
  }

  getPreferredAmbushNode() {
    if (this.ambushNodes.length === 0) return null;
    return this.ambushNodes[Math.floor(Math.random() * this.ambushNodes.length)];
  }
}
