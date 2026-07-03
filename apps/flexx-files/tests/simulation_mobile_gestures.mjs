import fs from 'fs';
import path from 'path';

// Define the required selectors and the property we are looking for
const REQUIRED_SELECTORS = [
    'button',
    '.nav-item',
    '.stepper-btn',
    '.set-btn',
    '.timer-dock',
    'summary',
    'label',
    'a',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="tab"]',
    '[role="switch"]'
];
const REQUIRED_PROPERTY = 'touch-action';
const REQUIRED_VALUE = 'manipulation';

// Read the CSS file
const cssPath = path.join(process.cwd(), 'css', 'styles.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Strip comments to ensure clean selector parsing
cssContent = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');

// A simple regex-based parser to find CSS rules
// This is not a full CSS parser but sufficient for checking specific rules
const ruleRegex = /([^{]+)\{([^}]+)\}/g;

const missingSelectors = new Set(REQUIRED_SELECTORS);

let match;
while ((match = ruleRegex.exec(cssContent)) !== null) {
    // Clean up selectors string (handle newlines)
    const selectorsString = match[1].replace(/\n/g, ' ');
    const selectors = selectorsString.split(',').map(s => s.trim());
    const declarations = match[2].split(';').map(d => d.trim());

    // Check if this rule block contains the required property and value
    const hasProperty = declarations.some(d => {
        const parts = d.split(':');
        if (parts.length < 2) return false;
        const prop = parts[0].trim();
        const val = parts[1].trim();
        return prop === REQUIRED_PROPERTY && val === REQUIRED_VALUE;
    });

    if (hasProperty) {
        // If it has the property, mark found selectors as present
        selectors.forEach(selector => {
            if (missingSelectors.has(selector)) {
                missingSelectors.delete(selector);
            }
        });
    }
}

if (missingSelectors.size === 0) {
    console.log('✅ PASS: All required mobile gesture protections are active.');
    process.exit(0);
} else {
    console.error('❌ FAIL: The following selectors are missing `touch-action: manipulation`:');
    missingSelectors.forEach(s => console.error(`   - ${s}`));
    console.error('\nEnsure `css/styles.css` includes `touch-action: manipulation` for all interactive elements to prevent double-tap zoom.');
    process.exit(1);
}
