const fs = require('fs');
const path = require('path');

const ensureDirectoryExists = (directoryPath) => {
  if (!directoryPath) {
    return;
  }

  try {
    fs.mkdirSync(directoryPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

class PersistentCache {
  constructor({ namespace, ttlMs = 0, maxEntries = 0, storageDir } = {}) {
    if (!namespace) {
      throw new Error('PersistentCache requires a namespace.');
    }

    this.namespace = namespace;
    this.ttlMs = Number.isFinite(Number(ttlMs)) ? Math.max(Number(ttlMs), 0) : 0;
    this.maxEntries = Number.isFinite(Number(maxEntries)) ? Math.max(Number(maxEntries), 0) : 0;
    this.storageDir = storageDir
      ? path.resolve(storageDir)
      : path.join(__dirname, '..', 'static', 'cache');
    this.storagePath = path.join(this.storageDir, `${this.namespace}.json`);
    this.store = new Map();
    this._pendingPersist = null;

    ensureDirectoryExists(this.storageDir);
    this._loadFromDisk();
  }

  _loadFromDisk() {
    try {
      if (!fs.existsSync(this.storagePath)) {
        return;
      }

      const rawContents = fs.readFileSync(this.storagePath, 'utf8');
      if (!rawContents) {
        return;
      }

      const parsed = JSON.parse(rawContents);
      const now = Date.now();

      Object.entries(parsed || {}).forEach(([key, entry]) => {
        if (!entry || typeof entry !== 'object') {
          return;
        }

        const { value, timestamp } = entry;
        if (!Number.isFinite(Number(timestamp))) {
          return;
        }

        if (this.ttlMs > 0 && now - Number(timestamp) > this.ttlMs) {
          return;
        }

        this.store.set(String(key), {
          value,
          timestamp: Number(timestamp),
        });
      });

      this._enforceMaxEntries();
    } catch (error) {
      console.warn(`[PersistentCache:${this.namespace}] Failed to read cache from disk:`, error.message);
    }
  }

  _schedulePersist() {
    if (this._pendingPersist) {
      return;
    }

    this._pendingPersist = setTimeout(() => {
      this._pendingPersist = null;
      this._persistToDisk().catch((error) => {
        console.warn(`[PersistentCache:${this.namespace}] Failed to persist cache:`, error.message);
      });
    }, 50);
  }

  async _persistToDisk() {
    ensureDirectoryExists(this.storageDir);

    const serialized = {};
    for (const [key, entry] of this.store.entries()) {
      serialized[key] = {
        value: entry.value,
        timestamp: entry.timestamp,
      };
    }

    await fs.promises.writeFile(this.storagePath, JSON.stringify(serialized), 'utf8');
  }

  _enforceMaxEntries() {
    if (!this.maxEntries || this.maxEntries <= 0) {
      return;
    }

    if (this.store.size <= this.maxEntries) {
      return;
    }

    const entries = Array.from(this.store.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    while (entries.length > this.maxEntries) {
      const [keyToRemove] = entries.shift();
      this.store.delete(keyToRemove);
    }
  }

  pruneExpired() {
    if (!this.ttlMs || this.ttlMs <= 0) {
      return;
    }

    const now = Date.now();
    let removed = false;

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.store.delete(key);
        removed = true;
      }
    }

    if (removed) {
      this._schedulePersist();
    }
  }

  getEntry(key) {
    if (key === undefined || key === null) {
      return null;
    }

    const normalizedKey = String(key);
    const entry = this.store.get(normalizedKey);

    if (!entry) {
      return null;
    }

    if (this.ttlMs > 0 && Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(normalizedKey);
      this._schedulePersist();
      return null;
    }

    const ageMs = Date.now() - entry.timestamp;
    return {
      value: entry.value,
      timestamp: entry.timestamp,
      ageMs,
      expiresAt: this.ttlMs > 0 ? entry.timestamp + this.ttlMs : null,
    };
  }

  get(key) {
    const entry = this.getEntry(key);
    return entry ? entry.value : null;
  }

  set(key, value) {
    if (key === undefined || key === null) {
      throw new Error('PersistentCache.set requires a key.');
    }

    const normalizedKey = String(key);
    this.store.set(normalizedKey, {
      value,
      timestamp: Date.now(),
    });

    this._enforceMaxEntries();
    this._schedulePersist();
  }

  delete(key) {
    if (key === undefined || key === null) {
      return false;
    }

    const normalizedKey = String(key);
    const deleted = this.store.delete(normalizedKey);
    if (deleted) {
      this._schedulePersist();
    }
    return deleted;
  }

  clear() {
    if (!this.store.size) {
      return;
    }

    this.store.clear();
    this._schedulePersist();
  }
}

module.exports = {
  PersistentCache,
  ensureDirectoryExists,
};
