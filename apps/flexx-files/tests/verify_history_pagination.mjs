
// tests/verify_history_pagination.mjs

// Mock DOM
const listeners = [];
const elements = {};

function createMockElement(id) {
    if (elements[id]) return elements[id];

    const el = {
        id,
        tagName: 'DIV',
        innerHTML: '',
        textContent: '',
        value: '',
        dataset: {},
        classList: {
            add: () => {},
            remove: () => {},
            toggle: () => {},
            contains: () => false
        },
        setAttribute: () => {},
        removeAttribute: () => {},
        appendChild: () => {},
        addEventListener: (event, cb) => {
            listeners.push({ element: id, event, cb });
        },
        querySelectorAll: () => [],
        querySelector: () => null,
        focus: () => {},
        style: {},
        closest: (sel) => el, // Simple mock

        // Spy
        _appendedHTML: [],
        insertAdjacentHTML: (pos, html) => {
            if (!el._appendedHTML) el._appendedHTML = [];
            el._appendedHTML.push({ pos, html });
            if (pos === 'beforeend') {
                el.innerHTML += html;
            }
        }
    };
    elements[id] = el;
    return el;
}

global.window = {
    location: { pathname: '/test' },
    requestIdleCallback: (cb) => setTimeout(cb, 0),
    cancelIdleCallback: (id) => clearTimeout(id),
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    addEventListener: (e, cb) => {},
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: () => {}, // Mock setInterval to prevent hanging
    clearInterval: () => {}
};

const navHistory = createMockElement('nav-history');
navHistory.dataset.view = 'history';
navHistory.className = 'nav-item';

global.document = {
    getElementById: (id) => createMockElement(id),
    createElement: (tag) => createMockElement('created-' + tag),
    querySelectorAll: (sel) => {
        if (sel === '.nav-item') return [navHistory];
        return [];
    },
    querySelector: () => null,
    body: {
        classList: { add: () => {}, remove: () => {} },
        insertBefore: () => {},
        firstChild: null,
        appendChild: () => {}
    },
    documentElement: { setAttribute: () => {} },
    addEventListener: () => {}
};

Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'Test', platform: 'Node', onLine: true },
    writable: true, configurable: true
});

// Seed Data
const sessions = [];
for (let i = 0; i < 50; i++) {
    sessions.push({
        id: `s-${i}`,
        date: new Date().toISOString(),
        recoveryStatus: 'green',
        exercises: [],
        sessionNumber: i+1,
        weekNumber: 1
    });
}

global.localStorage = {
    store: { 'flexx_sessions_v3': JSON.stringify(sessions) },
    getItem(k) { return this.store[k]; },
    setItem(k, v) { this.store[k] = v; },
    removeItem(k) { delete this.store[k]; },
    length: 1,
    key: (i) => Object.keys(this.store)[i]
};

global.location = window.location;
global.performance = { now: () => Date.now(), memory: { usedJSHeapSize: 0 } };

// Import App
console.log('Importing app...');
await import('../js/app.js');
await new Promise(r => setTimeout(r, 100));

console.log('Switching to History view...');
// Find listener
const l = listeners.find(x => x.element === 'nav-history' && x.event === 'click');
// Wait, my mock element pushed { id, event, cb } but navHistory has id='nav-history'
// But createMockElement used `id` as key.
// Correct.

// Actually I need to fix listeners push
// in createMockElement: listeners.push({ element: id, event, cb });
// In test check: x.element === 'nav-history'

// Trigger click
const historyListener = listeners.find(l => l.element === 'nav-history' && l.event === 'click');

if (historyListener) {
    historyListener.cb({ target: navHistory });
} else {
    // If listeners aren't found, try to manually set view and render
    // Since we can't easily access State, this is hard.
    // But wait, the app initializes to 'today'.
    // If we can't switch, we can't test history.
    console.log('WARN: Could not find history nav listener. Assuming render default.');
}

// Wait for render
await new Promise(r => setTimeout(r, 100));

// Check render
const main = elements['main-content'];
// Force switch if needed (simulate click on nav item if found)
// The issue might be querySelectorAll returned [navHistory] but app didn't find it?
// Ah, `app.js` runs `document.querySelectorAll('.nav-item')` immediately.
// My mock returns `[navHistory]`. So it should work.

console.log('Triggering Load More...');

// Mock State.historyLimit if possible? No.
// But window.loadMoreHistory updates it.

// Call load more
try {
    global.window.loadMoreHistory();
} catch (e) {
    console.error('Load More failed:', e);
}

// Verify
const list = elements['history-list'];

if (list && list._appendedHTML && list._appendedHTML.length > 0) {
    console.log('PASS: insertAdjacentHTML called');
    console.log(`Appended ${list._appendedHTML.length} chunks`);
    process.exit(0);
} else {
    console.error('FAIL: insertAdjacentHTML NOT called on history-list');
    // For TDD, allow failure
    console.log('(Expected Failure for TDD)');
    process.exit(1); // Fail so I can see it.
}
