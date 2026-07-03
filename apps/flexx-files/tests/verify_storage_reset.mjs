
import { strict as assert } from 'assert';

// === MOCK ENVIRONMENT ===
const createLocalStorage = () => {
    const store = {};
    const api = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => {
            for (const k in store) delete store[k];
        },
        key: (i) => Object.keys(store)[i] || null,
    };

    return new Proxy(store, {
        get: (target, prop) => {
            if (prop === 'length') return Object.keys(target).length;
            if (api[prop]) return api[prop];
            return target[prop];
        },
        set: (target, prop, value) => {
            target[prop] = String(value);
            return true;
        },
        deleteProperty: (target, prop) => {
             delete target[prop];
             return true;
        },
        ownKeys: (target) => {
            return Object.keys(target);
        },
        getOwnPropertyDescriptor: (target, prop) => {
            return Object.getOwnPropertyDescriptor(target, prop);
        }
    });
};

const localStorageMock = createLocalStorage();

// Setup Globals
global.window = {
    location: {
        pathname: '/test',
        href: 'http://localhost/test',
        reload: () => {
            global.window._reloadCalled = true;
        }
    },
    addEventListener: () => {},
    requestIdleCallback: (cb) => cb(),
    cancelIdleCallback: () => {}
};
global.window._reloadCalled = false;

Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'NodeTest' },
    writable: true,
    configurable: true
});

global.localStorage = localStorageMock;
global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    memory: { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 }
};
global.document = {
    createElement: () => ({ textContent: '', innerHTML: '', href: '', click: () => {} }),
    querySelector: () => null
};
global.alert = (msg) => console.log('ALERT:', msg);
global.confirm = () => true;

// === TEST ===
async function runTest() {
    console.log("Loading Storage module...");

    // Import Storage dynamically after setting globals
    const { Storage } = await import('../js/core.js');
    const CONST = await import('../js/constants.js'); // Assuming we can get prefix from constants

    const PREFIX = CONST.STORAGE_PREFIX || 'flexx_';
    const OTHER_PREFIX = 'otherapp_';

    console.log(`Prefix is: ${PREFIX}`);

    // Populate Mock
    localStorageMock.setItem(`${PREFIX}session1`, 'data1');
    localStorageMock.setItem(`${PREFIX}prefs`, 'prefs1');
    localStorageMock.setItem(`${OTHER_PREFIX}data`, 'other1');
    localStorageMock.setItem('randomKey', 'random1');

    console.log('Initial keys:', Object.keys(localStorageMock));
    assert.equal(localStorageMock.length, 4);

    // Call Reset
    console.log("Calling Storage.reset()...");
    Storage.reset();

    // Verify
    console.log('Final keys:', Object.keys(localStorageMock));

    // Check specific keys
    assert.equal(localStorageMock.getItem(`${PREFIX}session1`), null, 'Session should be removed');
    assert.equal(localStorageMock.getItem(`${PREFIX}prefs`), null, 'Prefs should be removed');
    assert.equal(localStorageMock.getItem(`${OTHER_PREFIX}data`), 'other1', 'Other app data should be preserved');
    assert.equal(localStorageMock.getItem('randomKey'), 'random1', 'Random key should be preserved');

    assert.equal(localStorageMock.length, 2, 'Should have 2 keys remaining');

    // Verify Reload
    assert.ok(global.window._reloadCalled, 'window.location.reload() should be called');

    console.log("PASS: Storage.reset() works correctly.");
}

runTest().catch(err => {
    console.error("FAIL:", err);
    process.exit(1);
});
