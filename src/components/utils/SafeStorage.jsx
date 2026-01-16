// Safe storage wrapper to prevent SecurityError
class SafeStorage {
  constructor(storageType = 'sessionStorage') {
    this.storageType = storageType;
    this.available = this.checkAvailability();
    this.fallbackStore = new Map();
  }

  checkAvailability() {
    try {
      const storage = window[this.storageType];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      console.warn(`${this.storageType} not available, using fallback`);
      return false;
    }
  }

  setItem(key, value) {
    try {
      if (this.available) {
        window[this.storageType].setItem(key, value);
      } else {
        this.fallbackStore.set(key, value);
      }
    } catch (e) {
      console.warn('Storage setItem failed:', e);
      this.fallbackStore.set(key, value);
    }
  }

  getItem(key) {
    try {
      if (this.available) {
        return window[this.storageType].getItem(key);
      } else {
        return this.fallbackStore.get(key) || null;
      }
    } catch (e) {
      console.warn('Storage getItem failed:', e);
      return this.fallbackStore.get(key) || null;
    }
  }

  removeItem(key) {
    try {
      if (this.available) {
        window[this.storageType].removeItem(key);
      } else {
        this.fallbackStore.delete(key);
      }
    } catch (e) {
      console.warn('Storage removeItem failed:', e);
      this.fallbackStore.delete(key);
    }
  }

  clear() {
    try {
      if (this.available) {
        window[this.storageType].clear();
      } else {
        this.fallbackStore.clear();
      }
    } catch (e) {
      console.warn('Storage clear failed:', e);
      this.fallbackStore.clear();
    }
  }

  key(index) {
    try {
      if (this.available) {
        return window[this.storageType].key(index);
      } else {
        return Array.from(this.fallbackStore.keys())[index] || null;
      }
    } catch (e) {
      console.warn('Storage key failed:', e);
      return Array.from(this.fallbackStore.keys())[index] || null;
    }
  }

  get length() {
    try {
      if (this.available) {
        return window[this.storageType].length;
      } else {
        return this.fallbackStore.size;
      }
    } catch (e) {
      return this.fallbackStore.size;
    }
  }
}

export const safeSessionStorage = new SafeStorage('sessionStorage');
export const safeLocalStorage = new SafeStorage('localStorage');