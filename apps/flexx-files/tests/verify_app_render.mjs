
// Mock Global Environment for DOM
global.window = {
    location: { pathname: '/test', href: 'http://localhost/test' },
    requestIdleCallback: (cb) => setTimeout(cb, 0),
    cancelIdleCallback: (id) => clearTimeout(id),
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    addEventListener: (e, cb) => {},
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval
};
global.document = {
    getElementById: (id) => {
        if (!global.elements[id]) {
            global.elements[id] = {
                id,
                innerHTML: '',
                innerText: '',
                value: '',
                classList: {
                    add: () => {},
                    remove: () => {},
                    toggle: () => {},
                    contains: () => false
                },
                setAttribute: () => {},
                removeAttribute: () => {},
                appendChild: () => {},
                addEventListener: () => {},
                querySelectorAll: () => [],
                querySelector: () => null,
                focus: () => {},
                style: {}
            };
        }
        return global.elements[id];
    },
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        classList: { add: () => {} },
        setAttribute: () => {},
        appendChild: () => {},
        style: {},
        addEventListener: () => {},
        textContent: ''
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    body: {
        classList: { add: () => {}, remove: () => {} },
        insertBefore: () => {},
        firstChild: null,
        appendChild: () => {}
    },
    documentElement: {
        setAttribute: () => {}
    },
    addEventListener: () => {}
};
global.elements = {}; // Store created elements for inspection

Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'Test',
        platform: 'Node',
        onLine: true,
        language: 'en-US'
    },
    writable: true,
    configurable: true
});

global.localStorage = {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
    clear() { this.store = {}; },
    get length() { return Object.keys(this.store).length; },
    key(i) { return Object.keys(this.store)[i] || null; }
};
global.location = window.location;
global.performance = {
    now: () => Date.now(),
    memory: { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 }
};

// Import App
// We need to wait for app initialization
await import('../js/app.js');

// Helper to simulate startup delay
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await sleep(100);

console.log('Starting Rendering Verification...');

// 1. Simulate "Green" recovery selection -> triggers Warmup render
window.setRec('green');

// Check if main-content was populated
const main = document.getElementById('main-content');
const content = main.innerHTML;

if (content.includes('Warmup') && content.includes('Circuit')) {
    console.log('PASS: Warmup rendered');
} else {
    console.error('FAIL: Warmup failed to render');
    console.log(content);
    process.exit(1);
}

// 2. Simulate completing a warmup item
// We need to manually set state because our DOM mock doesn't handle events automatically
// But `window.updateWarmup` reads from DOM elements.
// Mock the checkbox element
const wId = 'thoracic';
const checkbox = document.getElementById(`w-${wId}`);
checkbox.checked = true;

// Call handler
window.updateWarmup(wId);

// Wait for debounce (500ms in core.js)
await sleep(600);

// Verify draft saved
const draft = JSON.parse(localStorage.getItem('flexx_draft_session'));
if (draft && draft.warmup.find(w => w.id === wId && w.completed)) {
    console.log('PASS: Warmup update persisted to draft');
} else {
    console.error('FAIL: Warmup update not saved');
    process.exit(1);
}

// 3. Move to Lifting
window.nextPhase('lifting');

const liftingContent = main.innerHTML;
if (liftingContent.includes('Lifting') && liftingContent.includes('Trap Bar Deadlift')) {
    console.log('PASS: Lifting rendered');
} else {
    console.error('FAIL: Lifting failed to render');
    console.log(liftingContent);
    process.exit(1);
}

// 4. Move to Cardio
window.nextPhase('cardio');
if (main.innerHTML.includes('Cardio')) {
    console.log('PASS: Cardio rendered');
} else {
    console.error('FAIL: Cardio failed to render');
    process.exit(1);
}

// 5. Move to Decompress
window.nextPhase('decompress');
if (main.innerHTML.includes('Decompress')) {
    console.log('PASS: Decompress rendered');
} else {
    console.error('FAIL: Decompress failed to render');
    process.exit(1);
}

console.log('All rendering checks passed.');
process.exit(0);
