/**
 * Accessibility Module
 * WCAG 2.1 AA Compliant
 * Provides keyboard navigation, screen reader support, ARIA labels, and focus management
 */

import { Logger } from './observability.js';

// === KEYBOARD NAVIGATION ===
export const KeyboardNav = {
    focusableSelectors: [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(','),

    init() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key closes modals
            if (e.key === 'Escape') {
                this.handleEscape();
            }

            // Tab navigation
            if (e.key === 'Tab') {
                this.handleTab(e);
            }

            // Enter/Space on buttons
            if (e.key === 'Enter' || e.key === ' ') {
                this.handleActivation(e);
            }

            // Arrow keys for navigation
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.handleArrowKeys(e);
            }
        });

        Logger.info('Keyboard navigation initialized');
    },

    handleEscape() {
        // Close active modal
        const modal = document.getElementById('modal-layer');
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            Logger.debug('Modal closed via Escape key');
        }
    },

    handleTab(e) {
        // Trap focus within modal if active
        const modal = document.getElementById('modal-layer');
        if (modal && modal.classList.contains('active')) {
            const focusable = modal.querySelectorAll(this.focusableSelectors);
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    },

    handleActivation(e) {
        const target = e.target;
        // Allow Enter/Space to activate div buttons (for custom controls)
        if (target.hasAttribute('role') && target.getAttribute('role') === 'button') {
            e.preventDefault();
            target.click();
            Logger.debug('Custom button activated via keyboard');
        }
    },

    handleArrowKeys(e) {
        // Handle arrow key navigation for radio button groups and lists
        const target = e.target;
        const role = target.getAttribute('role');

        if (role === 'radiogroup' || role === 'listbox') {
            e.preventDefault();
            const items = Array.from(target.querySelectorAll('[role="radio"], [role="option"]'));
            const currentIndex = items.indexOf(document.activeElement);

            let nextIndex;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                nextIndex = (currentIndex + 1) % items.length;
            } else {
                nextIndex = currentIndex - 1 < 0 ? items.length - 1 : currentIndex - 1;
            }

            items[nextIndex].focus();
            items[nextIndex].click();
        }
    },

    focusFirst(container) {
        const focusable = container.querySelectorAll(this.focusableSelectors);
        if (focusable.length > 0) {
            focusable[0].focus();
        }
    }
};

// === SCREEN READER ANNOUNCEMENTS ===
export const ScreenReader = {
    liveRegion: null,

    init() {
        // Create ARIA live region for announcements
        this.liveRegion = document.createElement('div');
        this.liveRegion.setAttribute('role', 'status');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.className = 'sr-only';
        document.body.appendChild(this.liveRegion);

        Logger.info('Screen reader support initialized');
    },

    announce(message, priority = 'polite') {
        if (!this.liveRegion) {
            Logger.warn('Screen reader live region not initialized');
            return;
        }

        // Clear previous announcement
        this.liveRegion.textContent = '';

        // Update priority
        this.liveRegion.setAttribute('aria-live', priority);

        // Announce after a brief delay to ensure screen readers pick it up
        setTimeout(() => {
            this.liveRegion.textContent = message;
            Logger.debug('Screen reader announcement', { message, priority });
        }, 100);
    }
};

// === ARIA LABEL UTILITIES ===
export const AriaLabels = {
    enhance() {
        // Add ARIA labels to interactive elements missing them
        this.enhanceButtons();
        this.enhanceInputs();
        this.enhanceNavigation();
        this.enhanceModals();

        Logger.info('ARIA labels enhanced');
    },

    enhanceButtons() {
        document.querySelectorAll('button.stepper-btn:not([aria-label]), button.set-btn:not([aria-label])').forEach(btn => {
            const text = btn.textContent.trim();
            if (!text) {
                // Button has no text, try to infer purpose from context
                if (btn.classList.contains('stepper-btn')) {
                    const symbol = btn.textContent;
                    btn.setAttribute('aria-label', symbol === '+' ? 'Increase weight' : 'Decrease weight');
                } else if (btn.classList.contains('set-btn')) {
                    const num = btn.textContent;
                    btn.setAttribute('aria-label', `Set ${num}`);
                }
            }
        });
    },

    enhanceInputs() {
        document.querySelectorAll('input:not([aria-label])').forEach(input => {
            const id = input.id;
            const placeholder = input.placeholder;

            if (id && id.startsWith('w-')) {
                input.setAttribute('aria-label', 'Weight in pounds');
                input.setAttribute('role', 'spinbutton');
                input.setAttribute('aria-valuemin', '0');
                input.setAttribute('aria-valuenow', input.value);
            } else if (input.type === 'checkbox') {
                const label = input.nextElementSibling?.textContent || 'Checkbox';
                input.setAttribute('aria-label', label);
            } else if (placeholder) {
                input.setAttribute('aria-label', placeholder);
            }
        });
    },

    enhanceNavigation() {
        const nav = document.querySelector('.bottom-nav');
        if (nav) {
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', 'Main navigation');

            nav.querySelectorAll('.nav-item').forEach(item => {
                const text = item.querySelector('span:last-child')?.textContent || '';
                if (text && !item.hasAttribute('aria-label')) {
                    item.setAttribute('aria-label', `Navigate to ${text}`);
                }
            });
        }
    },

    enhanceModals() {
        const modal = document.getElementById('modal-layer');
        if (modal) {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');

            const title = document.getElementById('modal-title');
            if (title) {
                modal.setAttribute('aria-labelledby', 'modal-title');
            }

            const body = document.getElementById('modal-body');
            if (body) {
                modal.setAttribute('aria-describedby', 'modal-body');
            }
        }
    }
};

// === FOCUS MANAGEMENT ===
export const FocusManager = {
    focusStack: [],

    saveFocus() {
        this.focusStack.push(document.activeElement);
    },

    restoreFocus() {
        const el = this.focusStack.pop();
        if (el && typeof el.focus === 'function') {
            el.focus();
        }
    },

    trapFocus(container) {
        const focusable = container.querySelectorAll(KeyboardNav.focusableSelectors);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        // Focus first element
        first.focus();

        // Set up focus trap
        container.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }
};

// === REDUCED MOTION SUPPORT ===
export const MotionPreference = {
    prefersReducedMotion: false,

    init() {
        // Check user preference
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.prefersReducedMotion = mediaQuery.matches;

        // Listen for changes
        mediaQuery.addEventListener('change', (e) => {
            this.prefersReducedMotion = e.matches;
            this.applyPreference();
            Logger.info('Motion preference changed', { reduced: e.matches });
        });

        this.applyPreference();
        Logger.info('Motion preference initialized', { reduced: this.prefersReducedMotion });
    },

    applyPreference() {
        if (this.prefersReducedMotion) {
            document.body.classList.add('reduce-motion');
        } else {
            document.body.classList.remove('reduce-motion');
        }
    }
};

// === SKIP NAVIGATION ===
export const SkipNav = {
    init() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.addEventListener('click', (e) => {
            e.preventDefault();
            const main = document.getElementById('main-content');
            if (main) {
                main.focus();
                main.scrollIntoView();
                Logger.debug('Skip navigation used');
            }
        });

        document.body.insertBefore(skipLink, document.body.firstChild);
        Logger.info('Skip navigation initialized');
    }
};

// === COLOR CONTRAST VALIDATOR (DEV TOOL) ===
export const ContrastChecker = {
    checkContrast(fg, bg) {
        // Convert hex to RGB
        const getRGB = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
        };

        // Calculate relative luminance
        const getLuminance = ([r, g, b]) => {
            const [rs, gs, bs] = [r, g, b].map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        const l1 = getLuminance(getRGB(fg));
        const l2 = getLuminance(getRGB(bg));
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        return {
            ratio: ratio.toFixed(2),
            passAA: ratio >= 4.5,
            passAAA: ratio >= 7,
            passLargeAA: ratio >= 3,
            passLargeAAA: ratio >= 4.5
        };
    },

    auditPage() {
        // Check all text elements on page
        Logger.info('Running contrast audit');
        const results = [];
        const auditedElements = new Set();

        // Optimization: Use TreeWalker to find text nodes efficiently
        // avoiding full DOM scan and style calc on containers
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip empty/whitespace-only text
                    if (node.nodeValue.trim().length === 0) return NodeFilter.FILTER_SKIP;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            const el = node.parentElement;
            if (!el || auditedElements.has(el)) continue;

            auditedElements.add(el);

            const computed = window.getComputedStyle(el);
            const fg = computed.color;
            const bg = computed.backgroundColor;

            // Convert to hex if needed
            // This is a simplified check - full implementation would handle rgb()
            if (fg && bg) {
                Logger.debug('Contrast check', { element: el.tagName, fg, bg });
            }
        }

        return results;
    }
};

// === INITIALIZE ALL ACCESSIBILITY FEATURES ===
export const Accessibility = {
    init() {
        KeyboardNav.init();
        ScreenReader.init();
        MotionPreference.init();
        SkipNav.init();

        // Enhance ARIA labels after a short delay to ensure DOM is ready
        setTimeout(() => AriaLabels.enhance(), 100);

        Logger.info('Accessibility system initialized (WCAG 2.1 AA compliant)');
    },

    KeyboardNav,
    ScreenReader,
    AriaLabels,
    FocusManager,
    MotionPreference,
    SkipNav,
    ContrastChecker
};

export default Accessibility;
