/**
 * hollow-tide-survival-horror: Sistema de Inventario Limitado (8 ranuras clásicas)
 * Objetos: Botiquín de Sal y Gasa, Batería de Linterna, Cilindro de Frecuencia de Boya, Llave Esclusa.
 */

export class InventorySystem {
  constructor(maxSlots = 8) {
    this.maxSlots = maxSlots;
    this.slots = new Array(maxSlots).fill(null);
    this.selectedIndex = null;

    // Inicializar con suministros básicos
    this.addItem({
      id: 'med_sal',
      name: 'Botiquín de Sal y Gasa',
      category: 'med',
      quantity: 1,
      maxStack: 3,
      desc: 'Compresa estéril saturada de sal marina hipertónica. Detiene hemorragias y restaura 45 HP.'
    });

    this.addItem({
      id: 'freq_cylinder',
      name: 'Cilindro de Frecuencia',
      category: 'tool',
      quantity: 2,
      maxStack: 5,
      desc: 'Cilindro de resonancia magnética necesario para fijar registros de telemetría en las Boyas de Guardado.'
    });
  }

  addItem(item) {
    // Buscar si ya existe para apilar
    const existing = this.slots.find(s => s && s.id === item.id && s.quantity < s.maxStack);
    if (existing) {
      existing.quantity += item.quantity || 1;
      return true;
    }

    // Buscar primera ranura vacía
    const emptyIndex = this.slots.findIndex(s => s === null);
    if (emptyIndex !== -1) {
      this.slots[emptyIndex] = {
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity || 1,
        maxStack: item.maxStack || 1,
        desc: item.desc || 'Suministro de la estación Brinemark.'
      };
      return true;
    }

    return false; // Inventario lleno
  }

  removeItem(index) {
    if (this.slots[index]) {
      this.slots[index].quantity -= 1;
      if (this.slots[index].quantity <= 0) {
        this.slots[index] = null;
      }
      return true;
    }
    return false;
  }

  hasItem(itemId) {
    return this.slots.some(s => s && s.id === itemId && s.quantity > 0);
  }

  consumeItem(itemId) {
    const idx = this.slots.findIndex(s => s && s.id === itemId && s.quantity > 0);
    if (idx !== -1) {
      return this.removeItem(idx);
    }
    return false;
  }

  getFrequencyCylindersCount() {
    const item = this.slots.find(s => s && s.id === 'freq_cylinder');
    return item ? item.quantity : 0;
  }
}
