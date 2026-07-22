import { performance } from 'perf_hooks';

console.log('Preparing Render Nav Skip Benchmark...');

// === MOCK DOM ===
const DOM_SIZE = 1000;
const NAV_COUNT = 4;
let toggleCount = 0;

const allElements = [];
for (let i = 0; i < DOM_SIZE; i++) {
    allElements.push({
        className: i < NAV_COUNT ? 'nav-item' : 'div',
        dataset: { view: i < NAV_COUNT ? ['today', 'history', 'progress', 'settings'][i] : '' },
        classList: {
            classes: new Set(),
            toggle(cls, active) {
                toggleCount++; // Count operations
                if (active) this.classes.add(cls);
                else this.classes.delete(cls);
            }
        },
        setAttribute(k, v) {},
        removeAttribute(k) {}
    });
}

const document = {
    querySelectorAll(selector) {
        if (selector === '.nav-item') {
            return allElements.filter(el => el.className === 'nav-item');
        }
        return [];
    }
};

const State = { view: 'today' };

// === CURRENT IMPLEMENTATION ===
let _navCacheCurrent = null;
function renderCurrent() {
    if (!_navCacheCurrent) {
        _navCacheCurrent = document.querySelectorAll('.nav-item');
    }
    _navCacheCurrent.forEach(el => {
        const isActive = el.dataset.view === State.view;
        el.classList.toggle('active', isActive);
        if (isActive) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
    });
}

// === PROPOSED IMPLEMENTATION ===
let _navCacheProposed = null;
let _lastNavView = null;
function renderProposed() {
    if (_lastNavView !== State.view) {
        if (!_navCacheProposed) {
            _navCacheProposed = document.querySelectorAll('.nav-item');
        }
        _navCacheProposed.forEach(el => {
            const isActive = el.dataset.view === State.view;
            el.classList.toggle('active', isActive);
            if (isActive) el.setAttribute('aria-current', 'page');
            else el.removeAttribute('aria-current');
        });
        _lastNavView = State.view;
    }
}

// === RUN BENCHMARK ===
const ITERATIONS = 10000;

// Warmup
for (let i = 0; i < 100; i++) {
    renderCurrent();
    renderProposed();
}

console.log(`Running ${ITERATIONS} iterations with same view...`);

// Test Current
toggleCount = 0;
const startCurrent = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    renderCurrent();
}
const endCurrent = performance.now();
const currentOps = toggleCount;

// Test Proposed
State.view = 'today'; // Ensure start state
_lastNavView = null; // Reset
toggleCount = 0;
const startProposed = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    renderProposed();
}
const endProposed = performance.now();
const proposedOps = toggleCount;

console.log(`Current Time: ${(endCurrent - startCurrent).toFixed(2)}ms, Ops: ${currentOps}`);
console.log(`Proposed Time: ${(endProposed - startProposed).toFixed(2)}ms, Ops: ${proposedOps}`);

// Test View Switching
console.log('Testing View Switching...');
State.view = 'history';
const startSwitch = performance.now();
renderProposed();
const endSwitch = performance.now();

if (toggleCount > proposedOps) {
     console.log('SUCCESS: View switch triggered update.');
} else {
     console.error('FAIL: View switch did NOT trigger update.');
     process.exit(1);
}

if (proposedOps < currentOps) {
    console.log(`SUCCESS: Operations reduced by ${((currentOps - proposedOps)/currentOps * 100).toFixed(1)}%`);
} else {
    console.error('FAIL: Operations not reduced.');
    process.exit(1);
}
