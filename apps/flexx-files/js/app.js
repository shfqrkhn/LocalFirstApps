import { EXERCISES, WARMUP, DECOMPRESSION, CARDIO_OPTIONS, RECOVERY_CONFIG, EXERCISE_MAP, WARMUP_MAP, DECOMPRESSION_MAP } from './config.js';
import { Storage, Calculator, Validator } from './core.js';
import { Observability, Logger, Metrics, Analytics } from './observability.js';
import { Accessibility, ScreenReader } from './accessibility.js';
import { Security, Sanitizer } from './security.js';
import { I18n, DateFormatter } from './i18n.js';
import * as CONST from './constants.js';

// === MODAL SYSTEM ===
const Modal = {
    el: document.getElementById('modal-layer'),
    title: document.getElementById('modal-title'),
    body: document.getElementById('modal-body'),
    actions: document.getElementById('modal-actions'),
    resolve: null,
    previousFocus: null,
    show(opts) {
        return new Promise((resolve) => {
            this.previousFocus = document.activeElement;
            // Null checks for modal elements
            if (!this.el || !this.title || !this.body || !this.actions) {
                Logger.error('Modal elements not found in DOM');
                // Fallback to native alert/confirm
                if (opts.type === 'confirm') {
                    resolve(confirm(opts.text || opts.title || 'Confirm?'));
                } else {
                    alert(opts.text || opts.title || 'Notice');
                    resolve(true);
                }
                return;
            }

            this.resolve = resolve;
            this.title.innerText = opts.title || 'Notice';
            this.body.innerText = opts.text || '';
            this.actions.innerHTML = '';
            if (opts.type === 'confirm') {
                const cancel = document.createElement('button');
                cancel.className = 'btn-modal btn-ghost';
                cancel.innerText = 'Cancel';
                cancel.setAttribute('aria-label', 'Cancel and close dialog');
                cancel.onclick = () => this.close(false);
                this.actions.appendChild(cancel);
            }
            const ok = document.createElement('button');
            ok.className = opts.danger ? 'btn-modal btn-danger' : 'btn-modal btn-confirm';
            ok.innerText = opts.okText || 'OK';
            ok.setAttribute('aria-label', opts.okText ? `${opts.okText} and close dialog` : 'Confirm and close dialog');
            ok.onclick = () => this.close(true);
            this.actions.appendChild(ok);
            this.el.classList.add('active');
            this.el.setAttribute('aria-hidden', 'false');
            ok.focus(); // Move focus into modal for accessibility
        });
    },
    close(res) {
        if (!this.el) {
            Logger.error('Modal element not found');
            if (this.resolve) this.resolve(res);
            if (this.previousFocus) this.previousFocus.focus();
            return;
        }
        this.el.classList.remove('active');
        this.el.setAttribute('aria-hidden', 'true');
        if (this.resolve) this.resolve(res);
        if (this.previousFocus) {
            this.previousFocus.focus();
            this.previousFocus = null;
        }
    }
};

// === PRE-OPTIMIZATION ===
function preSanitizeConfig() {
    try {
        const sanitize = (obj) => {
            if (obj.video) obj.video = Sanitizer.sanitizeURL(obj.video);
            if (obj.altLinks) {
                for (const key in obj.altLinks) {
                    if (Object.prototype.hasOwnProperty.call(obj.altLinks, key)) {
                        obj.altLinks[key] = Sanitizer.sanitizeURL(obj.altLinks[key]);
                    }
                }
            }
        };

        EXERCISES.forEach(sanitize);
        WARMUP.forEach(sanitize);
        DECOMPRESSION.forEach(sanitize);
        CARDIO_OPTIONS.forEach(sanitize);

        Logger.info('Static configuration URLs pre-sanitized');
    } catch (e) {
        Logger.error('Failed to pre-sanitize config', { error: e.message });
    }
}

// === STATE & TOOLS ===
const State = { view: 'today', phase: null, recovery: null, activeSession: null, historyLimit: CONST.HISTORY_PAGINATION_LIMIT };
let _navCache = null;
let _lastNavView = null;
// Optimization: Cache generated session cards to avoid repeated string generation/sanitization
const _sessionCardCache = new WeakMap();
const Haptics = {
    success: () => navigator.vibrate?.([10, 30, 10]),
    light: () => navigator.vibrate?.(10),
    heavy: () => navigator.vibrate?.(50)
};

const Timer = {
    interval: null, endTime: null,
    start(sec = CONST.DEFAULT_REST_TIMER_SECONDS) {
        if (this.interval) clearInterval(this.interval);
        this.endTime = Date.now() + (sec * 1000);
        const timerDock = document.getElementById('timer-dock');
        if (!timerDock) {
            Logger.error('Timer dock element not found');
            return;
        }
        timerDock.classList.add('active');
        this.tick();
        this.interval = setInterval(() => this.tick(), 1000);
    },
    tick() {
        const rem = Math.ceil((this.endTime - Date.now()) / 1000);
        if (rem <= 0) {
            this.stop();
            Haptics.success();
            ScreenReader.announce('Rest period complete. Ready for next set.');
            return;
        }
        const m = Math.floor(rem / 60);
        const s = rem % 60;
        const timerVal = document.getElementById('timer-val');
        if (!timerVal) {
            Logger.error('Timer value element not found');
            this.stop();
            return;
        }
        timerVal.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    },
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.endTime = null;

        const timerVal = document.getElementById('timer-val');
        if (timerVal) {
            const m = Math.floor(CONST.DEFAULT_REST_TIMER_SECONDS / 60);
            const s = CONST.DEFAULT_REST_TIMER_SECONDS % 60;
            timerVal.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        }

        const timerDock = document.getElementById('timer-dock');
        if (timerDock) timerDock.classList.remove('active');
    }
};

// === RENDER ROUTER ===
function render() {
    try {
        const main = document.getElementById('main-content');
        if (!main) {
            Logger.error('Main content element not found');
            return;
        }

        // Update active tab state
        if (_lastNavView !== State.view) {
            if (!_navCache) {
                _navCache = document.querySelectorAll('.nav-item');
            }
            _navCache.forEach(el => {
                const isActive = el.dataset.view === State.view;
                el.classList.toggle('active', isActive);
                if (isActive) el.setAttribute('aria-current', 'page');
                else el.removeAttribute('aria-current');
            });
            _lastNavView = State.view;
        }

        main.innerHTML = '';
        main.className = 'fade-in';

        switch (State.view) {
            case 'today': renderToday(main); break;
            case 'history': renderHistory(main); break;
            case 'progress': renderProgress(main); break;
            case 'settings': renderSettings(main); break;
            case 'protocol': renderProtocol(main); break;
            default:
                Logger.warn(`Unknown view: ${State.view}`);
                renderToday(main);
        }

        // Accessibility: Move focus to main content on view change
        // This ensures screen readers announce the new content and keyboard users aren't lost
        main.focus();
    } catch (e) {
        Logger.error('Render error:', e);
        // Try to show error to user
        const main = document.getElementById('main-content');
        if (main) {
            main.innerHTML = `
                <div class="container">
                    <div class="card" style="border-color:var(--error)">
                        <h3>⚠️ Something went wrong</h3>
                        <p class="text-xs">Please refresh the page. If the problem persists, try exporting your data and clearing the app cache.</p>
                    </div>
                </div>`;
        }
    }
}

// === VIEWS ===
function renderToday(c) {
    if (!State.recovery) renderRecovery(c);
    else if (State.phase === 'warmup') renderWarmup(c);
    else if (State.phase === 'lifting') renderLifting(c);
    else if (State.phase === 'cardio') renderCardio(c);
    else renderDecompress(c);
}

function renderRecovery(c) {
    const check = Validator.canStartWorkout();
    if (!check.valid && !State.forceRestSkip) {
        const nextDate = check.nextAvailable ? DateFormatter.format(check.nextAvailable) : '';
        c.innerHTML = `
            <div class="container">
                <h1>⏸️ ${I18n.t('recovery.restRequired')}</h1>
                <div class="card">
                    <h3>${I18n.t('recovery.restDesc')}</h3>
                    <p style="margin-top:1rem; color:var(--text-secondary)">
                        <strong style="color:var(--accent)">${check.hours} hours</strong> remaining
                    </p>
                    ${nextDate ? `<p class="text-xs" style="margin-top:0.5rem">${I18n.t('recovery.nextWorkout', { date: nextDate })}</p>` : ''}
                    <p class="text-xs" style="margin-top:1rem; opacity:0.7">${I18n.t('recovery.restTip')}</p>
                </div>
                <button class="btn btn-secondary" onclick="window.skipRest()" aria-label="Override rest requirement and train anyway">${I18n.t('recovery.trainAnyway')}</button>
            </div>`;
        return;
    }
    c.innerHTML = `
        <div class="container">
            <h1>${I18n.t('recovery.title')}</h1>
            <p class="text-xs" style="margin-bottom:1rem; text-align:center; opacity:0.8">${I18n.t('recovery.subtitle')}</p>
            ${check.isFirst ? `
                <div class="card" style="border-color:var(--accent)">
                    <h3>🎯 ${I18n.t('recovery.calibration')}</h3>
                    <p class="text-xs">${I18n.t('recovery.calibrationDesc')}</p>
                </div>` : ''}
            ${check.warning ? `
                <div class="card" style="border-color:var(--warning)">
                    <h3>⚠️ ${I18n.t('recovery.longGap')}</h3>
                    <p class="text-xs">${I18n.t('recovery.longGapDesc', { days: check.days })}</p>
                </div>` : ''}
            <button type="button" class="card" onclick="window.setRec('green')" style="cursor:pointer; width:100%; text-align:left; font-family:inherit; font-size:inherit; color:inherit">
                <h3 style="color:var(--success)">✓ ${I18n.t('recovery.green')}</h3>
                <p class="text-xs">${I18n.t('recovery.greenDesc')}</p>
            </button>
            <button type="button" class="card" onclick="window.setRec('yellow')" style="cursor:pointer; width:100%; text-align:left; font-family:inherit; font-size:inherit; color:inherit">
                <h3 style="color:var(--warning)">⚠ ${I18n.t('recovery.yellow')}</h3>
                <p class="text-xs">${I18n.t('recovery.yellowDesc')}</p>
            </button>
            <button type="button" class="card" onclick="window.setRec('red')" style="cursor:pointer; width:100%; text-align:left; font-family:inherit; font-size:inherit; color:inherit">
                <h3 style="color:var(--error)">✕ ${I18n.t('recovery.red')}</h3>
                <p class="text-xs">${I18n.t('recovery.redDesc')}</p>
            </button>
        </div>`;
}

function renderWarmup(c) {
    let warmupHtml = '';
    // Optimization: Create Map for O(1) lookup
    const activeMap = new Map();
    if (State.activeSession?.warmup) {
        for (const w of State.activeSession.warmup) {
            activeMap.set(w.id, w);
        }
    }

    for (let i = 0; i < WARMUP.length; i++) {
        const w = WARMUP[i];
        const activeW = activeMap.get(w.id);
        const isChecked = activeW ? activeW.completed : false;
        const altUsed = activeW ? activeW.altUsed : '';
        const displayName = Sanitizer.sanitizeString(altUsed || w.name);
        const vidUrl = altUsed && w.altLinks?.[altUsed] ? w.altLinks[altUsed] : w.video;

        let optionsHtml = '';
        for (let j = 0; j < w.alternatives.length; j++) {
            const a = w.alternatives[j];
            optionsHtml += `<option value="${a}" ${altUsed === a ? 'selected' : ''}>${a}</option>`;
        }

        warmupHtml += `
            <div style="margin-bottom:1.5rem; border-bottom:1px solid #333; padding-bottom:1rem;">
                <div class="flex-row" style="justify-content:space-between; margin-bottom:0.5rem;">
                    <label class="checkbox-wrapper" style="margin:0; padding:0; background:none; border:none; width:auto; cursor:pointer" for="w-${w.id}">
                        <input type="checkbox" class="big-check" id="w-${w.id}" ${isChecked ? 'checked' : ''} onchange="window.updateWarmup('${w.id}')">
                        <div><div id="name-${w.id}">${displayName}</div><div class="text-xs">${w.reps}</div></div>
                    </label>
                    <a id="vid-${w.id}" href="${vidUrl}" target="_blank" rel="noopener noreferrer" style="font-size:1.5rem; text-decoration:none; padding-left:1rem;" aria-label="Watch video for ${displayName}">🎥</a>
                </div>
                <details><summary class="text-xs" style="opacity:0.7; cursor:pointer">Alternatives</summary>
                    <select id="alt-${w.id}" onchange="window.swapAlt('${w.id}')" style="width:100%; margin-top:0.5rem; padding:0.5rem; background:var(--bg-secondary); color:white; border:none; border-radius:var(--radius-sm);" aria-label="Select alternative for ${w.name}">
                        <option value="">${w.name}</option>
                        ${optionsHtml}
                    </select>
                </details>
            </div>`;
    }

    c.innerHTML = `
        <div class="container">
            <div class="flex-row" style="justify-content:space-between; margin-bottom:1rem;">
                <h1>${I18n.t('workout.warmup')}</h1>
                <span class="text-xs" style="opacity:0.8">${I18n.t('workout.warmupSubtitle')}</span>
            </div>
            <div class="card">
                ${warmupHtml}
            </div>
            <button class="btn btn-primary" onclick="window.nextPhase('lifting')" aria-label="${I18n.t('workout.startLifting')}">${I18n.t('workout.startLifting')}</button>
        </div>`;
}

function renderLifting(c) {
    const sessions = Storage.getSessions();
    const isDeload = Calculator.isDeloadWeek(sessions);
    c.innerHTML = `
        <div class="container">
            <div class="flex-row" style="justify-content:space-between; margin-bottom:0.5rem;">
                <h1>${I18n.t('workout.lifting')}</h1>
                <div class="flex-row" style="gap:0.5rem">
                    ${isDeload ? `<span class="text-xs" style="border:1px solid var(--accent); color:var(--accent); padding:0.25rem 0.5rem; border-radius:0.75rem">${I18n.t('workout.deload')}</span>` : ''}
                    <span class="text-xs" style="border:1px solid var(--border); padding:0.25rem 0.5rem; border-radius:0.75rem">${State.recovery.toUpperCase()}</span>
                </div>
            </div>
            <p class="text-xs" style="margin-bottom:1.5rem; text-align:center; opacity:0.8">${I18n.t('workout.tempo')}</p>
            ${(() => {
                let exercisesHtml = '';
                // Optimization: Create Map for O(1) lookup
                const activeMap = new Map();
                if (State.activeSession?.exercises) {
                    for (const e of State.activeSession.exercises) {
                        activeMap.set(e.id, e);
                    }
                }

                for (let j = 0; j < EXERCISES.length; j++) {
                    const ex = EXERCISES[j];
                    // Check state first for persistence
                    const activeEx = activeMap.get(ex.id);
                    const hasAlt = activeEx?.usingAlternative;
                    const name = Sanitizer.sanitizeString(hasAlt ? activeEx.altName : ex.name);
                    const vid = hasAlt && ex.altLinks?.[activeEx.altName] ? ex.altLinks[activeEx.altName] : ex.video;

                    const w = activeEx ? activeEx.weight : Calculator.getRecommendedWeight(ex.id, State.recovery, sessions);
                    // Name Display Fix: Pass actual name (alternative if used) for history lookup
                    const lookupName = hasAlt ? activeEx.altName : ex.id;
                    const last = Calculator.getLastCompletedExercise(lookupName, sessions);
                    const lastText = last ? I18n.t('exercise.last', { weight: last.weight }) : I18n.t('exercise.firstSession');

                    // Optimization: Use for loop to avoid garbage collection pressure from Array.from
                    let setButtonsHtml = '';
                    for (let i = 0; i < ex.sets; i++) {
                        const isSetDone = activeEx && i < activeEx.setsCompleted;
                        const completedClass = isSetDone ? ' completed' : '';
                        const ariaPressed = isSetDone ? 'true' : 'false';
                        setButtonsHtml += `<button type="button" class="set-btn${completedClass}" id="s-${ex.id}-${i}" onclick="window.togS('${ex.id}',${i},${ex.sets})" aria-label="${I18n.t('a11y.set', { number: i+1 })}" aria-pressed="${ariaPressed}">${i+1}</button>`;
                    }

                    exercisesHtml += `
                <div class="card" id="card-${ex.id}">
                    <div class="flex-row" style="justify-content:space-between; margin-bottom:0.25rem;">
                        <div>
                            <div class="text-xs" style="color:var(--accent)">${ex.category}</div>
                            <h2 id="name-${ex.id}" style="margin-bottom:0">${name}</h2>
                            <div class="text-xs" style="opacity:0.8; margin-bottom:0.25rem">${ex.sets} sets × ${ex.reps} reps</div>
                            <div id="last-${ex.id}" class="text-xs" style="opacity:0.6; margin-bottom:0.5rem">${lastText}</div>
                        </div>
                        <a id="vid-${ex.id}" href="${vid}" target="_blank" rel="noopener noreferrer" style="font-size:1.5rem; text-decoration:none" aria-label="Watch video for ${name}">🎥</a>
                    </div>
                    <div class="stepper-control">
                        <button class="stepper-btn" onclick="window.modW('${ex.id}', -2.5)" aria-label="${I18n.t('a11y.decreaseWeight')} for ${name}">−</button>
                        <input type="number" class="stepper-value" id="w-${ex.id}" value="${w}" step="2.5" readonly inputmode="none" aria-label="${I18n.t('a11y.weightPounds')} for ${name}">
                        <button class="stepper-btn" onclick="window.modW('${ex.id}', 2.5)" aria-label="${I18n.t('a11y.increaseWeight')} for ${name}">+</button>
                    </div>
                    <div id="pl-${ex.id}" class="text-xs" style="text-align:center; font-family:monospace; margin:0.5rem 0 1rem 0; color:var(--text-secondary)" aria-live="polite">${Calculator.getPlateLoad(w)} ${I18n.t('exercise.perSide')}</div>
                    <div class="set-group" role="group" aria-label="Sets for ${name}">
                        ${setButtonsHtml}
                    </div>
                    <details class="mt-4" style="margin-top:1rem; padding-top:0.5rem; border-top:1px solid var(--border)">
                        <summary class="text-xs">${I18n.t('exercise.alternatives')}</summary>
                        <select id="alt-${ex.id}" onchange="window.swapAlt('${ex.id}')" style="width:100%; margin-top:0.5rem; padding:0.5rem; background:var(--bg-secondary); color:white; border:none" aria-label="Select alternative for ${ex.name}">
                            <option value="">${ex.name}</option>
                            ${ex.alternatives.map(a=>`<option value="${a}" ${hasAlt && activeEx.altName === a ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                    </details>
                </div>`;
                }
                return exercisesHtml;
            })()}
            <button class="btn btn-primary" onclick="window.nextPhase('cardio')" aria-label="${I18n.t('workout.nextCardio')}">${I18n.t('workout.nextCardio')}</button>
        </div>`;
}

function renderCardio(c) {
    const activeCardio = State.activeSession?.cardio;
    const selectedType = activeCardio ? activeCardio.type : CARDIO_OPTIONS[0].name;
    const isCompleted = activeCardio ? activeCardio.completed : false;
    const cfg = CARDIO_OPTIONS.find(o => o.name === selectedType) || CARDIO_OPTIONS[0];

    c.innerHTML = `
        <div class="container"><h1>${I18n.t('workout.cardio')}</h1><div class="card">
            <div class="flex-row" style="justify-content:space-between; margin-bottom:0.5rem;"><h3>${I18n.t('exercise.selection')}</h3><a id="cardio-vid" href="${cfg.video}" target="_blank" rel="noopener noreferrer" style="font-size:1.5rem; text-decoration:none" aria-label="Watch video for ${cfg.name}">🎥</a></div>
            <div class="text-xs" style="opacity:0.8; margin-bottom:1rem">${I18n.t('workout.cardioSubtitle')}</div>
            <select id="cardio-type" onchange="window.swapCardioLink(); window.updateCardio()" style="width:100%; padding:1rem; background:var(--bg-secondary); color:white; border:none; margin-bottom:1rem;" aria-label="Select cardio type">${CARDIO_OPTIONS.map(o=>`<option value="${o.name}" ${o.name === selectedType ? 'selected' : ''}>${o.name}</option>`).join('')}</select>
            <button class="btn btn-secondary" onclick="window.startCardio()" aria-label="${I18n.t('exercise.startTimer')}">${I18n.t('exercise.startTimer')}</button>
            <label class="checkbox-wrapper" style="margin-top:1rem; cursor:pointer" for="cardio-done"><input type="checkbox" class="big-check" id="cardio-done" ${isCompleted ? 'checked' : ''} onchange="window.updateCardio()"><span>${I18n.t('exercise.completed')}</span></label>
        </div><button class="btn btn-primary" onclick="window.nextPhase('decompress')" aria-label="${I18n.t('workout.nextDecompress')}">${I18n.t('workout.nextDecompress')}</button></div>`;
}

function renderDecompress(c) {
    let decompressHtml = '';
    // Optimization: Create Map for O(1) lookup
    const activeMap = new Map();
    if (State.activeSession?.decompress) {
        for (const d of State.activeSession.decompress) {
            activeMap.set(d.id, d);
        }
    }

    for (let i = 0; i < DECOMPRESSION.length; i++) {
        const d = DECOMPRESSION[i];
        const activeD = activeMap.get(d.id);
        const isChecked = activeD ? activeD.completed : false;
        const val = activeD ? activeD.val : '';
        const safeVal = Sanitizer.sanitizeString(String(val || ''));
        const altUsed = activeD ? activeD.altUsed : '';
        const displayName = Sanitizer.sanitizeString(altUsed || d.name);
        const vidUrl = altUsed && d.altLinks?.[altUsed] ? d.altLinks[altUsed] : d.video;

        let optionsHtml = '';
        for (let j = 0; j < d.alternatives.length; j++) {
            const a = d.alternatives[j];
            optionsHtml += `<option value="${a}" ${altUsed === a ? 'selected' : ''}>${a}</option>`;
        }

        decompressHtml += `
            <div class="card">
                <div class="flex-row" style="justify-content:space-between; margin-bottom:0.25rem;">
                    <h3 id="name-${d.id}">${displayName}</h3>
                    <a id="vid-${d.id}" href="${vidUrl}" target="_blank" rel="noopener noreferrer" style="font-size:1.5rem; text-decoration:none" aria-label="Watch video for ${displayName}">🎥</a>
                </div>
                <div class="text-xs" style="opacity:0.8; margin-bottom:0.75rem">${d.duration}</div>
                    ${d.inputLabel ? `<input type="number" id="val-${d.id}" value="${safeVal}" placeholder="${d.inputLabel}" aria-label="${d.inputLabel} for ${d.name}" style="width:100%; padding:1rem; background:var(--bg-secondary); border:none; color:white; margin-bottom:0.5rem" onchange="window.updateDecompress('${d.id}')">` : ''}
                <label class="checkbox-wrapper" style="cursor:pointer" for="done-${d.id}"><input type="checkbox" class="big-check" id="done-${d.id}" ${isChecked ? 'checked' : ''} onchange="window.updateDecompress('${d.id}')"><span>${I18n.t('exercise.completed')}</span></label>
                <details style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid var(--border)">
                    <summary class="text-xs" style="opacity:0.7; cursor:pointer">${I18n.t('exercise.alternatives')}</summary>
                    <select id="alt-${d.id}" onchange="window.swapAlt('${d.id}')" style="width:100%; margin-top:0.5rem; padding:0.5rem; background:var(--bg-secondary); color:white; border:none; border-radius:var(--radius-sm);" aria-label="Select alternative for ${d.name}">
                        <option value="">Default</option>
                        ${optionsHtml}
                    </select>
                </details>
            </div>`;
    }

    c.innerHTML = `
        <div class="container"><h1>${I18n.t('workout.decompress')}</h1>
            ${decompressHtml}
            <button class="btn btn-primary" onclick="window.finish()" aria-label="${I18n.t('workout.saveFinish')}">${I18n.t('workout.saveFinish')}</button>
        </div>`;
}

function _generateSessionCard(x) {
    // Optimization: Return cached HTML if available for this session object
    if (_sessionCardCache.has(x)) {
        return _sessionCardCache.get(x);
    }

    let warmupHtml = I18n.t('history.noData');
    if (x.warmup) {
        warmupHtml = '';
        for (let j = 0; j < x.warmup.length; j++) {
            const w = x.warmup[j];
            if (w.completed) {
                warmupHtml += `✓ ${Sanitizer.sanitizeString(w.altUsed || w.id)} `;
            }
        }
    }

    let exercisesHtml = '';
    for (let j = 0; j < x.exercises.length; j++) {
        const e = x.exercises[j];
        const rawName = e.altName || e.name || EXERCISE_MAP.get(e.id)?.name || e.id;
        const displayName = Sanitizer.sanitizeString(rawName);
        exercisesHtml += `<div class="flex-row" style="justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem; ${e.skipped ? 'opacity:0.5; text-decoration:line-through' : ''}"><span>${displayName}</span><span>${e.weight} lbs</span></div>`;
    }

    const decompressStatus = Array.isArray(x.decompress) ?
        (x.decompress.every(d => d.completed) ? I18n.t('history.fullSession') : I18n.t('history.partial')) :
        (x.decompress?.completed ? I18n.t('exercise.completed') : I18n.t('exercise.skip'));

    const html = `
<div class="card">
    <div class="flex-row" style="justify-content:space-between">
        <div><h3>${DateFormatter.format(x.date)}</h3><span class="text-xs" style="border:1px solid var(--border); padding:0.125rem 0.375rem; border-radius:var(--radius-sm)">${Sanitizer.sanitizeString(x.recoveryStatus).toUpperCase()}</span></div>
        <button class="btn btn-secondary btn-delete-session" style="width:44px; height:44px; padding:0; display:flex; align-items:center; justify-content:center; flex-shrink:0" data-session-id="${x.id}" aria-label="Delete session from ${DateFormatter.format(x.date)}">✕</button>
    </div>
    <details style="margin-top:1rem; border-top:1px solid var(--border); padding-top:0.5rem;">
        <summary class="text-xs" style="cursor:pointer; padding:0.5rem 0; opacity:0.8">${I18n.t('history.viewDetails')}</summary>
        <div class="text-xs" style="margin-bottom:0.5rem; color:var(--accent)">${I18n.t('history.warmup')}</div>
        <div class="text-xs" style="margin-bottom:1rem; line-height:1.4">${warmupHtml}</div>
        <div class="text-xs" style="margin-bottom:0.5rem; color:var(--accent)">${I18n.t('history.lifting')}</div>
        ${exercisesHtml}
        <div class="text-xs" style="margin:1rem 0 0.5rem 0; color:var(--accent)">${I18n.t('history.finisher')}</div>
        <div class="text-xs">
            ${I18n.t('workout.cardio')}: ${Sanitizer.sanitizeString(x.cardio?.type || 'N/A')}<br>
            ${I18n.t('workout.decompress')}: ${decompressStatus}
        </div>
    </details>
</div>`;

    _sessionCardCache.set(x, html);
    return html;
}

function renderHistory(c) {
    // Optimization: Iterating backwards avoids O(N) copy & reverse of entire history array
    const sessions = Storage.getSessions();
    const limit = State.historyLimit || CONST.HISTORY_PAGINATION_LIMIT;

    let historyHtml = '';
    if (sessions.length === 0) {
        historyHtml = `<div class="card"><p>${I18n.t('history.noLogs')}</p></div>`;
    } else {
        // Iterate backwards from end
        let count = 0;
        for (let i = sessions.length - 1; i >= 0 && count < limit; i--) {
            historyHtml += _generateSessionCard(sessions[i]);
            count++;
        }
    }

    c.innerHTML = `<div class="container"><h1>${I18n.t('history.title')}</h1>
        <div id="history-list">${historyHtml}</div>
        ${limit < sessions.length ? `<button id="load-more-btn" class="btn btn-secondary" style="width:100%; margin-top:1rem; padding:1rem">${I18n.t('history.loadMore', { remaining: sessions.length - limit })}</button>` : ''}
        </div>`;

    const loadMoreBtn = c.querySelector('#load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', window.loadMoreHistory);
    }
}

function renderProgress(c) {
    c.innerHTML = `<div class="container"><h1>${I18n.t('progress.title')}</h1><div class="card"><select id="chart-ex" onchange="window.drawChart(this.value)" aria-label="Select exercise for progress chart" style="width:100%; padding:0.5rem; background:var(--bg-secondary); color:white; border:none; margin-bottom:1rem; border-radius:var(--radius-sm);">${EXERCISES.map(e=>`<option value="${e.id}">${Sanitizer.sanitizeString(e.name)}</option>`).join('')}</select><div id="chart-area" style="min-height:250px"></div></div></div>`;
    setTimeout(()=>window.drawChart('hinge'),100);
}

function renderSettings(c) {
    c.innerHTML = `
        <div class="container">
            <h1>${I18n.t('settings.title')}</h1>
            <div class="card">
                <button class="btn btn-secondary" onclick="window.viewProtocol()" aria-label="${I18n.t('settings.protocolGuide')}">${I18n.t('settings.protocolGuide')}</button>
            </div>
            <div class="card">
                <button class="btn btn-secondary" id="backup-btn">${I18n.t('settings.backupData')}</button>
                <div style="position:relative; margin-top:0.5rem">
                    <button class="btn btn-secondary" tabindex="-1" aria-hidden="true">${I18n.t('settings.restoreData')}</button>
                    <input type="file" onchange="window.imp(this)" aria-label="${I18n.t('settings.restoreData')}"
                           onfocus="this.previousElementSibling.style.outline='2px solid var(--accent)';this.previousElementSibling.style.outlineOffset='2px'"
                           onblur="this.previousElementSibling.style.outline=''"
                           style="position:absolute;top:0;left:0;opacity:0;width:100%;height:100%">
                </div>
                <button class="btn btn-secondary" style="margin-top:0.5rem; color:var(--error)" onclick="window.wipe()" aria-label="${I18n.t('settings.factoryReset')}">${I18n.t('settings.factoryReset')}</button>
            </div>
            <div class="text-xs" style="text-align:center; margin-top:2rem; opacity:0.5">
                v${CONST.APP_VERSION} (${CONST.STORAGE_VERSION})
            </div>
        </div>`;

    const usage = Storage.getUsage();
    const storageHtml = `
        <div class="card">
            <h3>${I18n.t('settings.storage')}</h3>
            <p class="text-xs" style="margin-bottom:0.5rem">${I18n.t('settings.storageUsage', {
                percent: usage.percent.toFixed(1),
                used: (usage.bytes / 1024).toFixed(0) + 'KB',
                total: (usage.limit / 1024 / 1024).toFixed(0) + 'MB'
            })}</p>
            <div style="width:100%; height:8px; background:var(--bg-secondary); border-radius:4px; overflow:hidden">
                <div style="width:${usage.percent}%; height:100%; background:${usage.percent > 90 ? 'var(--error)' : 'var(--accent)'}"></div>
            </div>
        </div>`;

    // Insert storage card before backup card
    const container = c.querySelector('.container');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = storageHtml;
    // Find the backup card (2nd card)
    const cards = container.querySelectorAll('.card');
    if (cards.length > 1) {
        container.insertBefore(tempDiv.firstElementChild, cards[1]);
    } else {
        container.appendChild(tempDiv.firstElementChild);
    }

    const backupBtn = c.querySelector('#backup-btn');
    if (backupBtn) {
        backupBtn.addEventListener('click', () => {
            try {
                Storage.exportData();
            } catch(e) {
                Modal.show({ title: I18n.t('errors.exportFailed'), text: e.message });
            }
        });
    }
}

function renderProtocol(c) {
    c.innerHTML = `
        <div class="container">
            <div class="flex-row" style="margin-bottom:1rem">
                <button class="btn btn-secondary" style="width:auto; padding:0.5rem 1rem" onclick="window.closeProtocol()" aria-label="${I18n.t('protocol.back')}">${I18n.t('protocol.back')}</button>
            </div>
            <h1>${I18n.t('protocol.title')}</h1>
            <div class="card">
                <h3 style="color:var(--accent)">${I18n.t('protocol.hygiene')}</h3>
                <p class="text-xs" style="margin-bottom:1rem">${I18n.t('protocol.hygieneDesc')}</p>

                <h3 style="color:var(--accent)">${I18n.t('protocol.overview')}</h3>
                <ul class="text-xs" style="padding-left:1.2rem; line-height:1.6">
                    <li><strong>Schedule:</strong> 3 days/week (e.g., Mon/Wed/Fri)</li>
                    <li><strong>Time:</strong> 58 Minutes</li>
                    <li><strong>Spacing:</strong> 48–72 hours rest required</li>
                </ul>
            </div>

            <div class="card">
                <h3 style="color:var(--warning)">${I18n.t('protocol.faultTolerance')}</h3>
                <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:0.5rem; font-size:0.8rem; margin-top:0.5rem">
                    <div>Missed 1</div><div>Slide schedule (maintain 48h gap)</div>
                    <div>Missed 2+</div><div>Reduce weights 10%</div>
                    <div>Sick (Fever)</div><div>FULL REST. Resume 24h after fever. Reduce 20%.</div>
                    <div>Injury</div><div>Skip aggravating exercise. Do others.</div>
                </div>
            </div>

            <div class="card" style="border-color:var(--error)">
                <h3>🚨 ${I18n.t('protocol.gymClosed')}</h3>
                <p class="text-xs" style="margin-bottom:0.5rem">${I18n.t('protocol.emergencyCircuit')}</p>
                <ul class="text-xs" style="padding-left:1.2rem; line-height:1.6">
                    <li><strong>Push:</strong> Incline Push-ups (Hands on furniture)</li>
                    <li><strong>Legs:</strong> Bodyweight Squats (Tempo: 3s down)</li>
                    <li><strong>Pull:</strong> Inverted Rows (Table) OR Door Rows</li>
                    <li><strong>Core:</strong> Hardstyle Plank</li>
                </ul>
            </div>
        </div>`;
}

// === HANDLERS ===
window.updateWarmup = (id) => {
    try {
        const el = document.getElementById(`w-${id}`);
        if (!el) return;

        if (State.activeSession && State.activeSession.warmup) {
            const w = State.activeSession.warmup.find(x => x.id === id);
            if (w) {
                w.completed = el.checked;
                Storage.saveDraft(State.activeSession);
            }
        }
    } catch (e) {
        Logger.error('Error updating warmup:', e);
    }
};

window.updateCardio = () => {
    try {
        const typeEl = document.getElementById('cardio-type');
        const doneEl = document.getElementById('cardio-done');

        if (State.activeSession && State.activeSession.cardio) {
            if (typeEl) State.activeSession.cardio.type = typeEl.value;
            if (doneEl) State.activeSession.cardio.completed = doneEl.checked;
            Storage.saveDraft(State.activeSession);
        }
    } catch (e) {
        Logger.error('Error updating cardio:', e);
    }
};

window.updateDecompress = (id) => {
    try {
        const valEl = document.getElementById(`val-${id}`);
        const doneEl = document.getElementById(`done-${id}`);

        if (State.activeSession && State.activeSession.decompress) {
            const d = State.activeSession.decompress.find(x => x.id === id);
            if (d) {
                if (valEl) d.val = valEl.value;
                if (doneEl) d.completed = doneEl.checked;
                Storage.saveDraft(State.activeSession);
            }
        }
    } catch (e) {
        Logger.error('Error updating decompress:', e);
    }
};

window.setRec = async (r) => {
    Metrics.mark('recovery-select-start');

    if (r === 'red') {
        Logger.info('Red recovery selected - confirming override', { recovery: r });
        ScreenReader.announce(I18n.t('modal.lowRecovery'));
        const proceed = await Modal.show({
            type: 'confirm',
            title: I18n.t('modal.lowRecovery'),
            text: I18n.t('modal.restWarning'),
            danger: true,
            okText: I18n.t('modal.trainAnyway')
        });
        if (!proceed) {
            Analytics.track('recovery_selected', { status: 'red', action: 'skipped' });
            return;
        }
        Analytics.track('recovery_selected', { status: 'red', action: 'override' });
        Logger.warn('Red recovery override - user chose to train anyway', { recovery: r });
    }

    State.recovery = r;
    State.activeSession = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        recoveryStatus: r,
        exercises: [],
        warmup: WARMUP.map(w => ({ id: w.id, completed: false, altUsed: '' }))
    };
    State.phase = 'warmup';

    Logger.info('Workout started', { recovery: r, sessionId: State.activeSession.id });
    Analytics.track('recovery_selected', { status: r });

    // Announce recovery selection
    const recoveryText = r === 'green' ? I18n.t('recovery.green') : (r === 'yellow' ? I18n.t('recovery.yellow') : I18n.t('recovery.red'));
    ScreenReader.announce(`${recoveryText} selected. Starting warmup.`);

    Haptics.success(); // Tactile feedback for start
    Metrics.measure('recovery-select', 'recovery-select-start');
    render();
};
window.modW = (id, d) => {
    try {
        const el = document.getElementById(`w-${id}`);
        if (!el) {
            Logger.error(`Weight input not found: w-${id}`);
            return;
        }
        const currentValue = parseFloat(el.value) || 0;
        const newValue = Math.max(0, currentValue + d);
        el.value = newValue;

        // Persistence: Update active session state
        const activeEx = State.activeSession?.exercises?.find(e => e.id === id);
        if (activeEx) activeEx.weight = newValue;

        // Palette: Update plate math display in real-time
        const plateEl = document.getElementById(`pl-${id}`);
        if (plateEl) {
            plateEl.textContent = `${Calculator.getPlateLoad(newValue)} / side`;
        }

        if (State.activeSession) Storage.saveDraft(State.activeSession);
        Haptics.light();
    } catch (e) {
        Logger.error('Error modifying weight:', e);
    }
};

window.togS = (ex, i, max) => {
    try {
        const el = document.getElementById(`s-${ex}-${i}`);
        if (!el) {
            Logger.error(`Set button not found: s-${ex}-${i}`);
            return;
        }
        const isCompleted = el.classList.toggle('completed');
        el.setAttribute('aria-pressed', isCompleted);

        if(isCompleted) {
            Haptics.success();
            // Auto-start rest timer after every completed set (including last set)
            Timer.start();
        }

        // Persistence: Update active session state
        if (State.activeSession?.exercises) {
            const activeEx = State.activeSession.exercises.find(e => e.id === ex);
            if (activeEx) {
                const card = document.getElementById(`card-${ex}`);
                if (card) {
                    const sets = card.querySelectorAll('.set-btn.completed').length;
                    activeEx.setsCompleted = sets;
                    activeEx.completed = sets >= max;
                }
            }
            Storage.saveDraft(State.activeSession);
        }
    } catch (e) {
        Logger.error('Error toggling set:', e);
    }
};

window.swapAlt = (id) => {
    try {
        const selElement = document.getElementById(`alt-${id}`);
        if (!selElement) {
            Logger.error(`Alternative selector not found: alt-${id}`);
            return;
        }
        const sel = selElement.value;
        const cfg = EXERCISE_MAP.get(id) || WARMUP_MAP.get(id) || DECOMPRESSION_MAP.get(id);
        if (!cfg) {
            Logger.error(`Exercise config not found: ${id}`);
            return;
        }
        const vidElement = document.getElementById(`vid-${id}`);
        const nameElement = document.getElementById(`name-${id}`);

        if (vidElement) {
            vidElement.href = sel && cfg.altLinks[sel] ? cfg.altLinks[sel] : cfg.video;
            vidElement.rel = 'noopener noreferrer';
            vidElement.setAttribute('aria-label', `Watch video for ${sel || cfg.name}`);
        }
        if (nameElement) {
            nameElement.textContent = sel || cfg.name;
        }

        // Persist alternative choice to state immediately
        if (State.activeSession) {
            if (State.phase === 'lifting') {
                const ex = State.activeSession.exercises.find(e => e.id === id);
                if (ex) {
                    ex.usingAlternative = !!sel;
                    ex.altName = sel;

                    // Update recommended weight and stats for the new selection
                    const target = sel || ex.id;
                    const sessions = Storage.getSessions();

                    // Update weight in state
                    ex.weight = Calculator.getRecommendedWeight(target, State.recovery, sessions);

                    // Update UI elements
                    const inputEl = document.getElementById(`w-${id}`);
                    if (inputEl) inputEl.value = ex.weight;

                    const plateEl = document.getElementById(`pl-${id}`);
                    if (plateEl) plateEl.textContent = `${Calculator.getPlateLoad(ex.weight)} / side`;

                    const lastEl = document.getElementById(`last-${id}`);
                    if (lastEl) {
                        const last = Calculator.getLastCompletedExercise(target, sessions);
                        lastEl.textContent = last ? `Last: ${last.weight} lbs` : 'First Session';
                    }
                }
            } else if (State.phase === 'warmup') {
                const w = State.activeSession.warmup.find(e => e.id === id);
                if (w) w.altUsed = sel;
            } else if (State.phase === 'decompress') {
                const d = State.activeSession.decompress.find(e => e.id === id);
                if (d) d.altUsed = sel;
            }
            Storage.saveDraft(State.activeSession);
        }
    } catch (e) {
        Logger.error('Error swapping alternative:', e);
    }
};

window.swapCardioLink = () => {
    try {
        const cardioTypeElement = document.getElementById('cardio-type');
        if (!cardioTypeElement) {
            Logger.error('Cardio type selector not found');
            return;
        }
        const selName = cardioTypeElement.value;
        const cfg = CARDIO_OPTIONS.find(o => o.name === selName);
        if (cfg) {
            const vidElement = document.getElementById('cardio-vid');
            if (vidElement) {
                vidElement.href = cfg.video;
                vidElement.rel = 'noopener noreferrer';
                vidElement.setAttribute('aria-label', `Watch video for ${cfg.name}`);
            }
        }
    } catch (e) {
        Logger.error('Error swapping cardio link:', e);
    }
};

window.nextPhase = async (p) => {
    try {
        if(p === 'lifting') {
            State.activeSession.warmup = WARMUP.map(w => {
                const checkElement = document.getElementById(`w-${w.id}`);
                const altElement = document.getElementById(`alt-${w.id}`);
                return {
                    id: w.id,
                    completed: checkElement ? checkElement.checked : false,
                    altUsed: altElement ? altElement.value : ''
                };
            });

            // Initialize exercises with recommended weights for persistence
            const sessions = Storage.getSessions();
            State.activeSession.exercises = EXERCISES.map(ex => ({
                id: ex.id,
                name: ex.name,
                weight: Calculator.getRecommendedWeight(ex.id, State.recovery, sessions),
                setsCompleted: 0,
                completed: false,
                usingAlternative: false,
                skipped: false
            }));
        }

        if(p === 'cardio') {
            State.activeSession.exercises = EXERCISES.map(ex => {
                const weightElement = document.getElementById(`w-${ex.id}`);
                const w = weightElement ? (parseFloat(weightElement.value) || 0) : 0;
                const sets = document.querySelectorAll(`#card-${ex.id} .set-btn.completed`).length;
                const altElement = document.getElementById(`alt-${ex.id}`);
                const alt = altElement ? altElement.value : '';
                return {
                    id: ex.id,
                    name: ex.name,
                    weight: w,
                    setsCompleted: sets,
                    completed: sets === ex.sets,
                    usingAlternative: !!alt,
                    altName: alt
                };
            });
            if (!State.activeSession.cardio) {
                State.activeSession.cardio = { type: CARDIO_OPTIONS[0].name, completed: false };
            }
        }

        if(p === 'decompress') {
            const cardioTypeElement = document.getElementById('cardio-type');
            const cardioDoneElement = document.getElementById('cardio-done');
            State.activeSession.cardio = {
                type: cardioTypeElement ? cardioTypeElement.value : 'Unknown',
                completed: cardioDoneElement ? cardioDoneElement.checked : false
            };
            if (!State.activeSession.decompress) {
                State.activeSession.decompress = DECOMPRESSION.map(d => ({
                    id: d.id, val: null, completed: false, altUsed: ''
                }));
            }
        }

        State.phase = p;
        Logger.info('Phase transition', { from: State.phase, to: p });
        Analytics.track('phase_transition', { phase: p });

        const phaseNames = {
            warmup: I18n.t('workout.warmup'),
            lifting: I18n.t('workout.lifting'),
            cardio: I18n.t('workout.cardio'),
            decompress: I18n.t('workout.decompress')
        };
        ScreenReader.announce(`Starting ${phaseNames[p] || p} phase`);

        if (State.activeSession) Storage.saveDraft(State.activeSession);
        render();
    } catch (e) {
        Logger.error('Error transitioning phase', { phase: p, error: e.message });
        Logger.error('Error transitioning phase:', e);
        ScreenReader.announce(I18n.t('modal.saveError'), 'assertive');
        await Modal.show({ title: I18n.t('modal.error'), text: I18n.t('modal.saveError') });
    }
};
window.finish = async () => {
    try {
        if(!await Modal.show({ type: 'confirm', title: I18n.t('modal.finish'), text: I18n.t('modal.saveSession') })) return;

        State.activeSession.decompress = DECOMPRESSION.map(d => {
            const valElement = document.getElementById(`val-${d.id}`);
            const doneElement = document.getElementById(`done-${d.id}`);
            const altElement = document.getElementById(`alt-${d.id}`);
            return {
                id: d.id,
                val: valElement?.value || null,
                completed: doneElement ? doneElement.checked : false,
                altUsed: altElement ? altElement.value : ''
            };
        });

        Metrics.mark('session-save-start');
        const savedSession = Storage.saveSession(State.activeSession);

        Logger.info('Session completed', {
            sessionId: savedSession.id,
            sessionNumber: savedSession.sessionNumber,
            totalVolume: savedSession.totalVolume,
            recovery: savedSession.recoveryStatus
        });

        Analytics.track('session_completed', {
            sessionNumber: savedSession.sessionNumber,
            weekNumber: savedSession.weekNumber,
            recovery: savedSession.recoveryStatus,
            exercises: savedSession.exercises.length
        });

        const saveTime = Metrics.measure('session-save', 'session-save-start');
        Logger.debug('Session save performance', { duration: `${saveTime?.toFixed(2)}ms` });

        ScreenReader.announce(`Workout completed successfully. Session ${savedSession.sessionNumber} saved.`, 'assertive');

        // Ensure no intra-set timer keeps running after session completion
        Timer.stop();

        Haptics.success(); // Tactile feedback for completion
        State.view = 'history';
        State.phase = null;
        State.recovery = null;
        render();
    } catch (e) {
        Logger.error('Failed to save session', {
            sessionId: State.activeSession?.id,
            error: e.message
        });
        Logger.error('Error finishing session:', e);

        if (e.message === 'STORAGE_FULL') {
            ScreenReader.announce(I18n.t('errors.storageFull'), 'assertive');
            await Modal.show({ title: I18n.t('modal.error'), text: I18n.t('errors.storageFull') });
            return;
        }

        ScreenReader.announce(I18n.t('errors.saveFailed'), 'assertive');
        await Modal.show({ title: I18n.t('modal.error'), text: I18n.t('errors.saveFailed') });
    }
};
window.skipTimer = () => { Haptics.heavy(); Timer.stop(); };
window.skipRest = () => {
    State.forceRestSkip = true;
    render();
};
window.startCardio = () => Timer.start(CONST.CARDIO_TIMER_SECONDS);
window.loadMoreHistory = () => {
    try {
        const currentLimit = State.historyLimit || CONST.HISTORY_PAGINATION_LIMIT;
        const newLimit = currentLimit + CONST.HISTORY_PAGINATION_LIMIT;
        const sessions = Storage.getSessions();
        const historyList = document.getElementById('history-list');

        if (!historyList) {
            // Fallback if structure is missing
            Logger.warn('History list container not found, falling back to full render');
            State.historyLimit = newLimit;
            render();
            return;
        }

        // Optimization: Generate only new items
        let newHtml = '';
        const startIndex = sessions.length - 1 - currentLimit;

        let count = 0;
        for (let i = startIndex; i >= 0 && count < CONST.HISTORY_PAGINATION_LIMIT; i--) {
            newHtml += _generateSessionCard(sessions[i]);
            count++;
        }

        if (newHtml) {
            historyList.insertAdjacentHTML('beforeend', newHtml);
        }

        State.historyLimit = newLimit;

        // Update Load More Button
        const btn = document.getElementById('load-more-btn');
        if (btn) {
            if (State.historyLimit >= sessions.length) {
                btn.remove();
                // Focus the last summary or something reasonable
                const summaries = document.querySelectorAll('summary');
                if (summaries.length > 0) summaries[summaries.length - 1].focus();
            } else {
                // Update text
                btn.textContent = I18n.t('history.loadMore', { remaining: sessions.length - State.historyLimit });
                btn.focus();
            }
        }
    } catch (e) {
        Logger.error('Error loading more history:', e);
        render();
    }
};
window.viewProtocol = () => {
    State.view = 'protocol';
    render();
};
window.closeProtocol = () => {
    State.view = 'settings';
    render();
};
window.del = async (id) => {
    if(await Modal.show({type:'confirm',title:I18n.t('modal.delete'),danger:true})) {
        try {
            Storage.deleteSession(id);
            render();
        } catch(e) {
            Modal.show({ title: I18n.t('modal.error'), text: e.message });
        }
    }
};
window.wipe = async () => { if(await Modal.show({type:'confirm',title:I18n.t('modal.reset'),danger:true})) Storage.reset(); };
window.imp = (el) => {
    const file = el.files[0];
    if (!file) return;

    // Sentinel: DoS prevention - validate file size before reading
    const maxSizeBytes = CONST.MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        Modal.show({
            type: 'error',
            title: 'File Too Large',
            message: CONST.ERROR_MESSAGES.IMPORT_FILE_TOO_LARGE
        });
        el.value = ''; // Reset input
        return;
    }

    const r = new FileReader();
    r.onload = async e => {
        const result = Storage.validateImport(e.target.result);
        if (!result.valid) {
            Modal.show({ title: I18n.t('modal.invalidFile'), text: result.error || 'Invalid file format.' });
            return;
        }

        if (await Modal.show({
            type: 'confirm',
            title: I18n.t('settings.restoreData'),
            text: I18n.t('modal.importConfirm', { count: result.sessions.length })
        })) {
            Storage.applyImport(result.sessions);
        }
        el.value = ''; // Reset input
    };
    r.readAsText(file);
};

// === SVG CHARTING ===
const ChartCache = {
    // WeakMap<sessionsArray, Map<exerciseId, dataArray>>
    _cache: new WeakMap(),
    _lastSessions: null,
    _lastIndex: null,

    _cloneIndex(oldIndex) {
        const newIndex = new Map();
        for (const [id, val] of oldIndex) {
            newIndex.set(id, {
                data: val.data, // Shared reference (Copy-On-Write)
                minVal: val.minVal,
                maxVal: val.maxVal
            });
        }
        return newIndex;
    },

    _addToIndex(index, session) {
        if (!session.exercises) return;
        for (let j = 0; j < session.exercises.length; j++) {
            const ex = session.exercises[j];

            if (!index.has(ex.id)) {
                index.set(ex.id, { data: [], minVal: Infinity, maxVal: -Infinity });
            }

            if (!ex.usingAlternative) {
                const entry = index.get(ex.id);
                // Copy-On-Write: Clone array before mutation
                entry.data = [...entry.data];

                const v = ex.weight;
                entry.data.push({ d: new Date(session.date), v });
                if (v < entry.minVal) entry.minVal = v;
                if (v > entry.maxVal) entry.maxVal = v;
            }
        }
    },

    _removeFromIndex(index, session) {
        if (!session.exercises) return;
        for (let j = 0; j < session.exercises.length; j++) {
            const ex = session.exercises[j];
            if (ex.usingAlternative) continue;

            const entry = index.get(ex.id);
            if (!entry || entry.data.length === 0) continue;

            const lastPoint = entry.data[entry.data.length - 1];
            // Compare timestamps
            if (new Date(session.date).getTime() === lastPoint.d.getTime()) {
                // Copy-On-Write: Clone array before mutation
                entry.data = [...entry.data];

                const popped = entry.data.pop();

                if (popped.v === entry.minVal || popped.v === entry.maxVal) {
                    let newMin = Infinity;
                    let newMax = -Infinity;
                    for (const p of entry.data) {
                        if (p.v < newMin) newMin = p.v;
                        if (p.v > newMax) newMax = p.v;
                    }
                    entry.minVal = newMin;
                    entry.maxVal = newMax;
                }
            }
        }
    },

    getData(exerciseId) {
        const sessions = Storage.getSessions();
        if (!this._cache.has(sessions)) {
            let index = null;

            // Optimization: Incremental Update
            if (this._lastSessions && this._lastIndex) {
                const oldLen = this._lastSessions.length;
                const newLen = sessions.length;

                // Find divergence index
                let divergenceIndex = 0;
                const minLen = Math.min(oldLen, newLen);
                while (divergenceIndex < minLen && sessions[divergenceIndex] === this._lastSessions[divergenceIndex]) {
                    divergenceIndex++;
                }

                // Case 1: Append (Everything up to oldLen matches)
                if (divergenceIndex === oldLen && newLen === oldLen + 1) {
                    index = this._cloneIndex(this._lastIndex);
                    this._addToIndex(index, sessions[newLen - 1]);
                }
                // Case 2: Replace Last (Everything up to oldLen-1 matches)
                else if (divergenceIndex === oldLen - 1 && newLen === oldLen) {
                    index = this._cloneIndex(this._lastIndex);
                    this._removeFromIndex(index, this._lastSessions[oldLen - 1]);
                    this._addToIndex(index, sessions[newLen - 1]);
                }
                // Case 3: Remove Last (Everything up to newLen matches)
                else if (divergenceIndex === newLen && newLen === oldLen - 1) {
                    index = this._cloneIndex(this._lastIndex);
                    this._removeFromIndex(index, this._lastSessions[oldLen - 1]);
                }
                // Case 4: Remove Last to Empty
                else if (newLen === 0 && oldLen === 1) {
                    index = new Map();
                }
            }

            if (!index) {
                // Full rebuild
                index = new Map();
                for (let i = 0; i < sessions.length; i++) {
                    this._addToIndex(index, sessions[i]);
                }
            }

            this._cache.set(sessions, index);
            this._lastSessions = sessions;
            this._lastIndex = index;
        }

        const sessionCache = this._cache.get(sessions);

        if (!sessionCache.has(exerciseId)) {
            return { data: [], minVal: Infinity, maxVal: -Infinity };
        }

        return sessionCache.get(exerciseId);
    }
};

window.drawChart = (id) => {
    try {
        const div = document.getElementById('chart-area');
        if (!div) {
            Logger.error('Chart area element not found');
            return;
        }

        const { data, minVal, maxVal } = ChartCache.getData(id);

        if (data.length < 2) {
            div.innerHTML = `<p style="padding:1rem;color:var(--text-secondary)">${I18n.t('progress.needLogs')}</p>`;
            return;
        }

        const max = maxVal * 1.1;
        const min = minVal * 0.9;
        const W = div.clientWidth || 300;
        const H = Math.max(200, Math.min(300, W * 0.6));
        const P = 20;

        // Sentinel: Sanitize coordinates to prevent SVG injection
        const safeNum = (n) => {
            const num = Number(n);
            return (isFinite(num) && !isNaN(num)) ? num.toFixed(2) : '0';
        };

        const X = i => safeNum(P + (i/(data.length-1)) * (W-P*2));
        const Y = v => safeNum(H - (P + ((v-min)/(max-min)) * (H-P*2)));

        let path = `M ${X(0)} ${Y(data[0].v)}`;
        data.forEach((p,i) => path += ` L ${X(i)} ${Y(p.v)}`);
        div.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight progression chart for ${EXERCISE_MAP.get(id)?.name || 'exercise'}">
            <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="3"/>
            ${data.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p.v)}" r="4" fill="var(--bg-secondary)" stroke="var(--accent)" stroke-width="2"/>`).join('')}
        </svg><div class="flex-row" style="justify-content:space-between; margin-top:0.25rem; font-size:var(--font-xs); color:var(--text-secondary)"><span>${DateFormatter.format(data[0].d)}</span><span>${DateFormatter.format(data[data.length-1].d)}</span></div>`;
    } catch (e) {
        Logger.error('Error drawing chart:', e);
        const div = document.getElementById('chart-area');
        if (div) {
            div.innerHTML = `<p style="padding:1rem;color:var(--error)">${I18n.t('progress.errorRendering')}</p>`;
        }
    }
};

// === GLOBAL EVENT LISTENERS ===
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.target.closest('.nav-item');
        if (target.dataset.view === 'history' && State.view !== 'history') {
            State.historyLimit = 20;
        }
        State.view = target.dataset.view;
        render();
    });
});

// Fix for listener leak: Global delegation for delete buttons
const mainContent = document.getElementById('main-content');
if (mainContent) {
    mainContent.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-delete-session');
        if (deleteBtn) {
            const sessionId = deleteBtn.getAttribute('data-session-id');
            if (sessionId) window.del(sessionId);
        }
    });
}

// === INITIALIZATION ===
// Initialize all mission-critical systems
(async function initializeSystems() {
    // Mark performance start
    Metrics.mark('app-init-start');

    // 1. Initialize observability first (for logging other initializations)
    Observability.init();
    Logger.info(`🚀 Flexx Files v${CONST.APP_VERSION} - Mission-Critical Mode`);

    // 2. Initialize security system
    Security.init(Logger);
    Logger.info('Security system active');

    // Optimization: Pre-sanitize static URLs to avoid repeated parsing in render loops
    preSanitizeConfig();

    // 3. Initialize accessibility system
    Accessibility.init();
    Logger.info('Accessibility system active (WCAG 2.1 AA)');

    // 4. Initialize internationalization
    I18n.init();
    Logger.info('i18n system active', { locale: I18n.currentLocale });

    // 5. Run database migrations
    Storage.runMigrations();
    Logger.info('Database migrations complete');

    // 6. Check for draft recovery
    const draft = Storage.loadDraft();
    if (draft) {
        const restore = await Modal.show({
            type: 'confirm',
            title: I18n.t('modal.recoverSession'),
            text: I18n.t('modal.recoverDraft', { time: DateFormatter.relative(draft.date) })
        });
        if (restore) {
            State.activeSession = draft;
            State.recovery = draft.recoveryStatus;
            State.phase = 'lifting'; // Resume at lifting phase
            Logger.info('Draft session restored', { id: draft.id });
            ScreenReader.announce('Previous session recovered successfully');
        } else {
            Storage.clearDraft();
            Logger.info('Draft session discarded');
        }
    }

    // 7. Register service worker for offline capability with update detection
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            Logger.info('Service worker registered');

            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker available - notify user
                        showUpdateNotification(newWorker);
                    }
                });
            });

            // Detect controller change (update applied)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!window.__reloading) {
                    window.__reloading = true;
                    window.location.reload();
                }
            });
        } catch (e) {
            Logger.warn('Service worker registration failed', { error: e.message });
        }
    }

    // Update notification handler
    function showUpdateNotification(worker) {
        Modal.show({
            title: I18n.t('modal.updateAvailable'),
            text: I18n.t('modal.updateText'),
            type: 'confirm',
            okText: I18n.t('modal.reloadNow')
        }).then(reload => {
            if (reload) {
                worker.postMessage({ type: 'SKIP_WAITING' });
            }
        });
    }

    // 8. Track app startup
    Analytics.track('app_start', {
        version: CONST.APP_VERSION,
        platform: navigator.platform,
        online: navigator.onLine
    });

    // Measure initialization time
    const initTime = Metrics.measure('app-init', 'app-init-start');
    Logger.info('App initialized', {
        duration: `${initTime?.toFixed(2)}ms`,
        sessions: Storage.getSessions().length
    });

    // 9. Render the app
    render();

    // 10. Auto-save drafts every 30 seconds if session is active
    const draftAutoSaveInterval = setInterval(() => {
        if (State.activeSession) {
            Storage.saveDraft(State.activeSession);
            Logger.debug('Draft auto-saved', { id: State.activeSession.id });
        }
    }, 30000); // 30 seconds

    // 11. Clean up resources on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(draftAutoSaveInterval);
        // Flush any pending session writes
        Storage.flushPersistence();
        // Final draft save before unload
        if (State.activeSession) {
            Storage.saveDraft(State.activeSession);
            Storage.flushDraft();
        }
    });

    // 12. Save draft when user switches tabs or minimizes browser
    // visibilitychange fires when tab becomes hidden (more reliable than beforeunload for tab switches)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && State.activeSession) {
            Storage.saveDraft(State.activeSession);
            Storage.flushDraft();
            Storage.flushPersistence();
            Logger.debug('Draft saved on visibility change', { id: State.activeSession.id });
        }
    });

    // 13. Save draft on pagehide (more reliable than beforeunload on mobile/Safari)
    window.addEventListener('pagehide', () => {
        if (State.activeSession) {
            Storage.saveDraft(State.activeSession);
            Storage.flushDraft();
            Storage.flushPersistence();
            Logger.debug('Draft saved on pagehide', { id: State.activeSession.id });
        }
    });

})().catch(error => {
    Logger.error('Fatal initialization error:', error);
    ScreenReader.announce(I18n.t('modal.initError'), 'assertive');
    Modal.show({ title: I18n.t('modal.fatalError'), text: I18n.t('modal.initError') });
});