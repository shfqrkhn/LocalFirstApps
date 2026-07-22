
import { performance } from 'perf_hooks';

console.log('Preparing Render Nav Benchmark...');

// === MOCK DOM ===
const DOM_SIZE = 1000; // Number of elements in the "DOM" to search through
const NAV_COUNT = 4; // Number of nav items

// Create a flat list of "elements"
const allElements = [];
for (let i = 0; i < DOM_SIZE; i++) {
    allElements.push({
        className: i < NAV_COUNT ? 'nav-item' : 'div',
        dataset: { view: i < NAV_COUNT ? ['today', 'history', 'progress', 'settings'][i] : '' },
        classList: {
            classes: new Set(),
            toggle(cls, active) {
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
        // Naive implementation to simulate DOM traversal cost
        if (selector === '.nav-item') {
            return allElements.filter(el => el.className === 'nav-item');
        }
        return [];
    }
};

const State = { view: 'history' };

// === BASELINE IMPLEMENTATION ===
function renderBaseline() {
    // Redundant Query
    document.querySelectorAll('.nav-item').forEach(el => {
        const isActive = el.dataset.view === State.view;
        el.classList.toggle('active', isActive);
        if (isActive) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
    });
}

// === OPTIMIZED IMPLEMENTATION ===
let _navCache = null;
function renderOptimized() {
    // Cached Query
    if (!_navCache) {
        _navCache = document.querySelectorAll('.nav-item');
    }

    _navCache.forEach(el => {
        const isActive = el.dataset.view === State.view;
        el.classList.toggle('active', isActive);
        if (isActive) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
    });
}

// === RUN BENCHMARK ===
const ITERATIONS = 10000;

// Warmup
for (let i = 0; i < 100; i++) {
    renderBaseline();
    renderOptimized();
}

console.log(`Running ${ITERATIONS} iterations...`);

// Test Baseline
const startBaseline = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    renderBaseline();
}
const endBaseline = performance.now();
const baselineTime = endBaseline - startBaseline;

// Test Optimized
const startOptimized = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    renderOptimized();
}
const endOptimized = performance.now();
const optimizedTime = endOptimized - startOptimized;

console.log(`Baseline Time: ${baselineTime.toFixed(2)}ms`);
console.log(`Optimized Time: ${optimizedTime.toFixed(2)}ms`);
console.log(`Improvement: ${(baselineTime / optimizedTime).toFixed(2)}x faster`);
