
import { performance } from 'perf_hooks';

// === MOCK LOCALSTORAGE ===
class LocalStorageMock {
    constructor() {
        this.store = {};
    }

    get length() {
        return Object.keys(this.store).length;
    }

    key(i) {
        const keys = Object.keys(this.store);
        return keys[i] || null;
    }

    getItem(key) {
        return this.store[key] || null;
    }

    setItem(key, value) {
        this.store[key] = String(value);
    }

    removeItem(key) {
        delete this.store[key];
    }

    clear() {
        this.store = {};
    }
}

// To verify Object.keys behavior on the mock instance,
// we need to ensure the mock behaves like an object with enumerable properties.
// The class above stores data in `this.store`.
// Real localStorage puts keys on the object itself (or behaves as if).
// So `Object.keys(localStorage)` returns the stored keys.
// My mock above: `Object.keys(mock)` will return `['store']` which is WRONG.

// I need a mock that uses a Proxy or is just a plain object for data storage
// but has methods on prototype?
// Or just use a Proxy to intercept.

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

    // We proxy the object to redirect property access to `store`
    // but keep API methods visible.
    // Also intercept 'length'.

    return new Proxy(store, {
        get: (target, prop) => {
            if (prop === 'length') return Object.keys(target).length;
            if (api[prop]) return api[prop];
            // If prop is a key in store, return it?
            // localStorage.foo returns the value of foo if it exists?
            // Yes, but usually we use getItem.
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

// However, implementing a perfect Proxy mock that supports Object.keys()
// exactly like native localStorage is tricky because Object.keys() on a Proxy
// triggers the `ownKeys` trap.
// If I use the Proxy above, `Object.keys(proxy)` calls `ownKeys`, which returns keys of `store`.
// This matches `localStorage` behavior.

const mock = createLocalStorage();

// === BENCHMARK ===

function benchmark() {
    console.log("Setting up benchmark...");
    const ITEM_COUNT = 10000;
    const PREFIX = 'flexx_';

    // Populate
    const populate = () => {
        mock.clear();
        for (let i = 0; i < ITEM_COUNT; i++) {
            const key = (i % 2 === 0 ? PREFIX : 'other_') + i;
            mock.setItem(key, 'value');
        }
    };

    // 1. Current Implementation
    populate();
    const start1 = performance.now();
    {
        const keys = [];
        for (let i = 0; i < mock.length; i++) {
            keys.push(mock.key(i));
        }
        // Iterate to simulate full logic (though we mostly care about key collection time)
        keys.forEach(key => {
            if (key.startsWith(PREFIX)) {
                mock.removeItem(key);
            }
        });
    }
    const end1 = performance.now();
    console.log(`Baseline (Loop + key()): ${(end1 - start1).toFixed(2)}ms`);

    // 2. Object.keys Implementation
    populate();
    const start2 = performance.now();
    {
        const keys = Object.keys(mock); // This uses ownKeys trap
        keys.forEach(key => {
            if (key.startsWith(PREFIX)) {
                mock.removeItem(key);
            }
        });
    }
    const end2 = performance.now();
    console.log(`Optimization (Object.keys): ${(end2 - start2).toFixed(2)}ms`);

    // Verify Correctness (Optimization)
    // Should have 5000 items left (non-flexx)
    if (mock.length !== ITEM_COUNT / 2) {
        console.error(`FAIL: Expected ${ITEM_COUNT/2} items, got ${mock.length}`);
    } else {
        console.log("PASS: Item count correct.");
    }
}

benchmark();
