/**
 * MIRA – db.js
 * Persistent storage via localStorage.
 * Schema: { id, name, dob, email, glucose, haemoglobin, cholesterol, remarks, riskLevel, createdAt }
 */

const DB_KEY = 'mira_patients';

const db = {
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY)) || [];
    } catch {
      return [];
    }
  },

  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },

  create(patient) {
    const patients = this.getAll();
    const record = {
      ...patient,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString()
    };
    patients.unshift(record);
    localStorage.setItem(DB_KEY, JSON.stringify(patients));
    return record;
  },

  update(id, updates) {
    const patients = this.getAll();
    const idx = patients.findIndex(p => p.id === id);
    if (idx === -1) return null;
    patients[idx] = { ...patients[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(DB_KEY, JSON.stringify(patients));
    return patients[idx];
  },

  delete(id) {
    const patients = this.getAll().filter(p => p.id !== id);
    localStorage.setItem(DB_KEY, JSON.stringify(patients));
  },

  stats() {
    const all = this.getAll();
    return {
      total:    all.length,
      high:     all.filter(p => p.riskLevel === 'HIGH').length,
      moderate: all.filter(p => p.riskLevel === 'MODERATE').length,
      low:      all.filter(p => ['LOW', 'NORMAL'].includes(p.riskLevel)).length,
    };
  }
};
