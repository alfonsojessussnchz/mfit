/* Mfit · base de datos interna (IndexedDB), con localStorage como respaldo */
'use strict';

const DB = (() => {
  const NAME = 'mfit';
  const VERSION = 2; // v2: diario de comidas y medidas
  const STORES = ['sessions', 'bodyweights', 'foodlog', 'measures'];
  let db = null;
  let mode = 'idb';

  // ---------- IndexedDB ----------
  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB no disponible'));
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        for (const s of STORES) {
          if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }).createIndex('date', 'date');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB bloqueada'));
    });
  }

  function run(store, txMode, fn) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, txMode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  // ---------- Respaldo localStorage ----------
  const LS_KEY = 'mfit:fallback';
  const emptySnap = () => ({ kv: {}, sessions: {}, bodyweights: {}, foodlog: {}, measures: {} });
  let snap = emptySnap();
  function lsLoad() {
    try { snap = Object.assign(emptySnap(), JSON.parse(localStorage.getItem(LS_KEY)) || {}); } catch (e) { /* vacío */ }
  }
  function lsSave() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(snap)); } catch (e) { console.error('No se pudo guardar', e); }
  }

  // ---------- API pública ----------
  async function init() {
    try {
      db = await openIDB();
      mode = 'idb';
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) {
      console.warn('Usando localStorage como respaldo:', e);
      mode = 'ls';
      lsLoad();
    }
    return mode;
  }

  async function loadAll() {
    if (mode === 'ls') {
      const out = { kv: { ...snap.kv } };
      STORES.forEach(st => { out[st] = Object.values(snap[st] || {}); });
      return out;
    }
    const kv = {};
    await new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { kv[c.key] = c.value; c.continue(); }
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    const out = { kv };
    for (const st of STORES) out[st] = await run(st, 'readonly', s => s.getAll());
    return out;
  }

  function setKV(key, value) {
    if (mode === 'ls') { snap.kv[key] = value; lsSave(); return Promise.resolve(); }
    return run('kv', 'readwrite', s => s.put(value, key));
  }

  function put(store, obj) {
    if (mode === 'ls') { snap[store][obj.id] = obj; lsSave(); return Promise.resolve(); }
    return run(store, 'readwrite', s => s.put(obj));
  }

  function del(store, id) {
    if (mode === 'ls') { delete snap[store][id]; lsSave(); return Promise.resolve(); }
    return run(store, 'readwrite', s => s.delete(id));
  }

  async function clearAll() {
    if (mode === 'ls') { snap = emptySnap(); lsSave(); return; }
    for (const s of ['kv', ...STORES]) await run(s, 'readwrite', st => st.clear());
  }

  return { init, loadAll, setKV, put, del, clearAll, get mode() { return mode; } };
})();
