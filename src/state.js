/**
 * BQ Skill Explorer — Simple Reactive State Store
 */

class Store {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /**
   * Get a state value.
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Set a state value and notify listeners.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    const old = this.state[key];
    this.state[key] = value;

    if (old !== value) {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.forEach(fn => fn(value, old));
      }
    }
  }

  /**
   * Subscribe to changes on a key.
   * @param {string} key
   * @param {Function} callback - (newValue, oldValue) => void
   * @returns {Function} Unsubscribe function
   */
  on(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }
}

export const store = new Store({
  currentRoute: '/explorer',
  selectedTier: null,
  selectedCategory: null,
  selectedSkillId: null,
  searchQuery: '',
  mapperQuery: '',
  mapperAllTiers: false,
  dashboardFilter: null,
});
