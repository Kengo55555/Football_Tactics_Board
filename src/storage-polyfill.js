/**
 * 本アプリは元々 window.storage (ネイティブ/ホスト向け) を想定。
 * ブラウザ単体では localStorage で同等 API を提供する。
 */
const PREFIX = 'ftb_storage:';

function toStoreKey(key) {
  return `${PREFIX}${key}`;
}

if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async list(prefix) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const raw = localStorage.key(i);
        if (!raw || !raw.startsWith(PREFIX)) continue;
        const logical = raw.slice(PREFIX.length);
        if (logical.startsWith(prefix)) keys.push(logical);
      }
      return { keys };
    },
    async get(key) {
      const v = localStorage.getItem(toStoreKey(key));
      return v != null ? { value: v } : null;
    },
    async set(key, value) {
      localStorage.setItem(toStoreKey(key), value);
    },
    async delete(key) {
      localStorage.removeItem(toStoreKey(key));
    },
  };
}
