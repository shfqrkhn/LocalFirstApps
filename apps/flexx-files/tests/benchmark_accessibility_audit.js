
import { performance } from 'perf_hooks';
import { ContrastChecker } from '../js/accessibility.js';

// === MOCK DOM & WINDOW ===
const elements = []; // Store all elements for querySelectorAll
let styleRecalcCount = 0;

// Minimal Node constants
global.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3
};

global.NodeFilter = {
    SHOW_ELEMENT: 1,
    SHOW_TEXT: 4,
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2,
    FILTER_SKIP: 3
};

class MockNode {
    constructor(nodeType) {
        this.nodeType = nodeType;
        this.parentNode = null;
    }

    get parentElement() {
        return this.parentNode;
    }
}

class MockTextNode extends MockNode {
    constructor(text) {
        super(global.Node.TEXT_NODE);
        this.nodeValue = text;
        this.textContent = text;
        this.tagName = '#TEXT';
    }
}

class MockElement extends MockNode {
    constructor(tagName) {
        super(global.Node.ELEMENT_NODE);
        this.tagName = tagName.toUpperCase();
        this.children = []; // For iteration
        this.childNodes = []; // For standard compliance
        elements.push(this);
    }

    appendChild(node) {
        node.parentNode = this;
        this.childNodes.push(node);
        if (node.nodeType === global.Node.ELEMENT_NODE) {
            this.children.push(node);
        }
    }

    get textContent() {
        return this.childNodes.map(c => c.textContent).join('');
    }

    get parentElement() {
        return this.parentNode;
    }
}

// Build a deep DOM tree
// Root -> 10 Containers -> 10 Wrappers -> 10 Spans (with text node)
const root = new MockElement('BODY');

for (let i = 0; i < 10; i++) {
    const container = new MockElement('DIV');
    root.appendChild(container);
    for (let j = 0; j < 10; j++) {
        const wrapper = new MockElement('DIV');
        container.appendChild(wrapper);
        for (let k = 0; k < 10; k++) {
            const span = new MockElement('SPAN');
            wrapper.appendChild(span);
            span.appendChild(new MockTextNode('Text content'));
        }
    }
}

global.document = {
    body: root,
    querySelectorAll: (selector) => {
        if (selector === '*') {
            return elements;
        }
        return [];
    },
    createTreeWalker: (rootNode, whatToShow, filter) => {
        const nodes = [];

        function traverse(node) {
            let accepted = true; // Default to accept if no filter/type check

            // Check nodeType against whatToShow
            const mask = (1 << (node.nodeType - 1));
            // simplified check for SHOW_ELEMENT (1) and SHOW_TEXT (4)
            // Node types: Element=1, Text=3.
            // whatToShow: SHOW_ELEMENT=1, SHOW_TEXT=4.
            // If whatToShow is SHOW_TEXT (4), we want nodeType 3.
            // 4 has bit 2 set. 1 << (3-1) = 4. Matches!

            // However, whatToShow is a bitmask.
            let matchesType = false;
            if (whatToShow === 0xFFFFFFFF) matchesType = true; // SHOW_ALL
            else if ((whatToShow & global.NodeFilter.SHOW_ELEMENT) && node.nodeType === global.Node.ELEMENT_NODE) matchesType = true;
            else if ((whatToShow & global.NodeFilter.SHOW_TEXT) && node.nodeType === global.Node.TEXT_NODE) matchesType = true;

            if (!matchesType) {
                 // Even if type doesn't match, we traverse children?
                 // TreeWalker logic: yes, unless filter rejects/skips.
                 // But we don't return THIS node.
                 accepted = false;
            }

            // Apply Filter ONLY if matchesType (or to decide traversal? logic is complex, but for SHOW_TEXT we shouldn't filter elements)
            // Spec: "If the node is not accepted by whatToShow, the filter is not called."
            let filterResult = global.NodeFilter.FILTER_ACCEPT;

            if (matchesType && filter && filter.acceptNode) {
                 filterResult = filter.acceptNode(node);
            } else if (matchesType && typeof filter === 'function') {
                 filterResult = filter(node);
            }

            if (filterResult === global.NodeFilter.FILTER_REJECT) {
                // Reject node and its children
                return;
            }

            if (filterResult === global.NodeFilter.FILTER_SKIP) {
                accepted = false; // Skip this node but traverse children
            }

            if (accepted && matchesType) {
                nodes.push(node);
            }

            if (node.childNodes) {
                node.childNodes.forEach(traverse);
            }
        }

        traverse(rootNode);

        let currentIdx = -1;
        return {
            nextNode: () => {
                currentIdx++;
                return nodes[currentIdx] || null;
            }
        };
    }
};

global.window = {
    getComputedStyle: (el) => {
        styleRecalcCount++;
        return {
            color: 'rgb(0, 0, 0)',
            backgroundColor: 'rgb(255, 255, 255)'
        };
    },
    location: { pathname: '/test' },
    matchMedia: () => ({ matches: false, addEventListener: () => {} })
};

// Handle navigator
if (!global.navigator) {
    global.navigator = {};
}
try {
    Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Node.js Benchmark' },
        writable: true
    });
} catch (e) {
    if (global.navigator) {
         try {
             Object.defineProperty(global.navigator, 'userAgent', { value: 'Node.js Benchmark', configurable: true });
         } catch(e2) {}
    }
}

// Mock localStorage
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

// Suppress console
const originalConsoleLog = console.log;
console.log = () => {};

// === BENCHMARK ===
originalConsoleLog('Running auditPage benchmark (Better Mock)...');
originalConsoleLog(`Total elements in mock DOM: ${elements.length}`);

const ITERATIONS = 100;
styleRecalcCount = 0;
const start = performance.now();

for (let i = 0; i < ITERATIONS; i++) {
    ContrastChecker.auditPage();
}

const end = performance.now();
const totalTime = end - start;
originalConsoleLog(`Total time for ${ITERATIONS} iterations: ${totalTime.toFixed(2)}ms`);
originalConsoleLog(`Average time per call: ${(totalTime / ITERATIONS).toFixed(4)}ms`);
originalConsoleLog(`Total getComputedStyle calls: ${styleRecalcCount}`);
originalConsoleLog(`Avg getComputedStyle calls per audit: ${styleRecalcCount / ITERATIONS}`);
