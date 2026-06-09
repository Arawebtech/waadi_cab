// localStorage polyfill for Node.js build environment
// This is needed because HtmlWebpackPlugin tries to access localStorage during build

if (typeof global !== 'undefined' && typeof global.localStorage === 'undefined') {
  const storage = {};
  
  global.localStorage = {
    getItem: function(key) {
      return storage[key] || null;
    },
    setItem: function(key, value) {
      storage[key] = String(value);
    },
    removeItem: function(key) {
      delete storage[key];
    },
    clear: function() {
      Object.keys(storage).forEach(key => delete storage[key]);
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: function(index) {
      const keys = Object.keys(storage);
      return keys[index] || null;
    }
  };
}

// Also set it on globalThis for newer Node.js versions
if (typeof globalThis !== 'undefined' && typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = global.localStorage;
}

