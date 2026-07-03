
import { Storage } from '../js/core.js';

// Mock LocalStorage
global.localStorage = {
    store: {},
    getItem(k) { return this.store[k]; },
    setItem(k, v) { this.store[k] = v; },
    removeItem(k) { delete this.store[k]; }
};
global.window = global;
global.window.location = { pathname: '/test', href: 'http://localhost/test' };
global.window.requestIdleCallback = (cb) => setTimeout(cb, 0);
global.window.cancelIdleCallback = (id) => clearTimeout(id);

// Init
const sessions = [{ id: '1' }, { id: '2' }, { id: '3' }];
localStorage.store['flexx_sessions_v3'] = JSON.stringify(sessions);
Storage._sessionCache = null;

// Load
const loaded = Storage.getSessions();
console.log('Initial count:', loaded.length); // 3

// Delete
const success = Storage.deleteSession('2');
console.log('Delete success:', success); // true

// Verify
const after = Storage.getSessions();
console.log('After count:', after.length); // 2
console.log('Contains 1:', after.some(s => s.id === '1'));
console.log('Contains 2:', after.some(s => s.id === '2'));
console.log('Contains 3:', after.some(s => s.id === '3'));

if (after.length === 2 && !after.some(s => s.id === '2')) {
    console.log('PASS: Correctness verified');
} else {
    console.error('FAIL: Correctness failed');
}
