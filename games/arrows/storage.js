/** Preferences fall back to memory when browser storage is unavailable. */
const gameStorage = {
  memory: new Map(),
  getItem(key) {
    try { return localStorage.getItem(key); }
    catch (error) { return this.memory.get(key) ?? null; }
  },
  setItem(key, value) {
    this.memory.set(key, String(value));
    try { localStorage.setItem(key, String(value)); } catch (error) { /* Play without persistence. */ }
  },
  removeItem(key) {
    this.memory.delete(key);
    try { localStorage.removeItem(key); } catch (error) { /* Play without persistence. */ }
  }
};
