import { EXERCISES, WARMUP, DECOMPRESSION, CARDIO_OPTIONS, EXERCISE_MAP } from "../js/config.js";
import { StrengthStorage, StrengthCalculator, StrengthReadiness } from "../strength-adapter.js";
import { Sanitizer } from "../js/security.js";
import { I18n, DateFormatter } from "../js/i18n.js";
import * as CONST from "../js/constants.js";
import { clearOwnedPwaCaches, formatBytes, getPwaHealth } from "../../../shared/pwa-assurance.js";
import { selectTodaySurface } from "./state.js";

export const STRENGTH_VIEWS_VERSION = "1.0.0";

export function createStrengthViews({
  state,
  modal,
  pwaState,
  logger,
  screenReader,
  storage = StrengthStorage,
  calculator = StrengthCalculator,
  readiness = StrengthReadiness,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  setTimeoutFn = globalThis.setTimeout,
  clearCaches = clearOwnedPwaCaches,
  getHealth = getPwaHealth
}) {
  let navCache = null;
  let lastNavView = null;
  const sessionCardCache = new WeakMap();

  function render() {
    try {
      const main = documentRef.getElementById("main-content");
      if (!main) {
        logger.error("Main content element not found");
        return;
      }
      if (lastNavView !== state.view) {
        navCache ||= documentRef.querySelectorAll(".nav-item");
        navCache.forEach(element => {
          const active = element.dataset.view === state.view;
          element.classList.toggle("active", active);
          if (active) element.setAttribute("aria-current", "page");
          else element.removeAttribute("aria-current");
        });
        lastNavView = state.view;
      }
      main.innerHTML = "";
      main.className = "fade-in";
      const views = { today: renderToday, history: renderHistory, progress: renderProgress, settings: renderSettings, protocol: renderProtocol };
      if (!views[state.view]) logger.warn(`Unknown view: ${state.view}`);
      (views[state.view] || renderToday)(main);
      main.focus();
    } catch (error) {
      logger.error("Render error:", error);
      const main = documentRef.getElementById("main-content");
      if (main) main.innerHTML = `<div class="container"><div class="card" style="border-color:var(--error)"><h3>⚠️ Something went wrong</h3><p class="text-xs">Please refresh the page. If the problem persists, try exporting your data and clearing the app cache.</p></div></div>`;
    }
  }

  function renderToday(container) {
    const view = selectTodaySurface(state);
    ({ recovery: renderRecovery, warmup: renderWarmup, lifting: renderLifting, cardio: renderCardio, decompress: renderDecompress })[view](container);
  }

  function renderRecovery(container) {
    const check = readiness.canStartWorkout();
    if (!check.valid && !state.forceRestSkip) {
      const nextDate = check.nextAvailable ? DateFormatter.format(check.nextAvailable) : "";
      container.innerHTML = `<div class="container"><h1>⏸️ ${I18n.t("recovery.restRequired")}</h1><div class="card"><h3>${I18n.t("recovery.restDesc")}</h3><p style="margin-top:1rem; color:var(--text-secondary)"><strong style="color:var(--accent)">${check.hours} hours</strong> remaining</p>${nextDate ? `<p class="text-xs" style="margin-top:0.5rem">${I18n.t("recovery.nextWorkout", { date: nextDate })}</p>` : ""}<p class="text-xs" style="margin-top:1rem; opacity:0.7">${I18n.t("recovery.restTip")}</p></div><button class="btn btn-secondary" onclick="window.skipRest()" aria-label="Override rest requirement and train anyway">${I18n.t("recovery.trainAnyway")}</button></div>`;
      return;
    }
    container.innerHTML = `<div class="container"><h1>${I18n.t("recovery.title")}</h1><p class="text-xs" style="margin-bottom:1rem; text-align:center; opacity:0.8">${I18n.t("recovery.subtitle")}</p>${check.isFirst ? `<div class="card" style="border-color:var(--accent)"><h3>🎯 ${I18n.t("recovery.calibration")}</h3><p class="text-xs">${I18n.t("recovery.calibrationDesc")}</p></div>` : ""}${check.warning ? `<div class="card" style="border-color:var(--warning)"><h3>⚠️ ${I18n.t("recovery.longGap")}</h3><p class="text-xs">${I18n.t("recovery.longGapDesc", { days: check.days })}</p></div>` : ""}<button type="button" class="card" onclick="window.setRec('green')" style="cursor:pointer; width:100%; text-align:left; font-family:inherit; font-size:inherit; color:inherit"><h3 style="color:var(--success)">✓ ${I18n.t("recovery.green")}</h3><p class="text-xs">${I18n.t("recovery.greenDesc")}</p></button><button type="button" class="card" onclick="window.setRec('yellow')" style="cursor:pointer; width:100%; text-align:left; font-family:inherit; font-size:inherit; color:inherit"><h3 style="color:var(--warning)">⚠ ${I18n.t("recovery.yellow")}</h3><p class="text-xs">${I18n.t("recovery.yellowDesc")}</p></button><button type="button" class="card" onclick="window.setRec('red')" style="cursor:pointer; width:100%; text-align:left; font-family:inherit; font-size:inherit; color:inherit"><h3 style="color:var(--error)">✕ ${I18n.t("recovery.red")}</h3><p class="text-xs">${I18n.t("recovery.redDesc")}</p></button></div>`;
  }

  function renderWarmup(container) {
    const active = new Map((state.activeSession?.warmup || []).map(item => [item.id, item]));
    let html = "";
    for (const item of WARMUP) {
      const current = active.get(item.id);
      const alternative = current?.altUsed || "";
      const name = Sanitizer.sanitizeString(alternative || item.name);
      const video = alternative && item.altLinks?.[alternative] ? item.altLinks[alternative] : item.video;
      const options = item.alternatives.map(value => `<option value="${value}" ${alternative === value ? "selected" : ""}>${value}</option>`).join("");
      html += `<div style="margin-bottom:1.5rem; border-bottom:1px solid #333; padding-bottom:1rem;"><div class="flex-row" style="justify-content:space-between; margin-bottom:0.5rem;"><label class="checkbox-wrapper" style="margin:0; padding:0; background:none; border:none; width:auto; cursor:pointer" for="w-${item.id}"><input type="checkbox" class="big-check" id="w-${item.id}" ${current?.completed ? "checked" : ""} onchange="window.updateWarmup('${item.id}')"><div><div id="name-${item.id}">${name}</div><div class="text-xs">${item.reps}</div></div></label><a id="vid-${item.id}" href="${video}" target="_blank" rel="noopener noreferrer" style="font-size:1.5rem; text-decoration:none; padding-left:1rem;" aria-label="Watch video for ${name}">🎥</a></div><details><summary class="text-xs" style="opacity:0.7; cursor:pointer">Alternatives</summary><select id="alt-${item.id}" onchange="window.swapAlt('${item.id}')" style="width:100%; margin-top:0.5rem; padding:0.5rem; background:var(--bg-secondary); color:white; border:none; border-radius:var(--radius-sm);" aria-label="Select alternative for ${item.name}"><option value="">${item.name}</option>${options}</select></details></div>`;
    }
    container.innerHTML = `<div class="container"><div class="flex-row" style="justify-content:space-between; margin-bottom:1rem;"><h1>${I18n.t("workout.warmup")}</h1><span class="text-xs" style="opacity:0.8">${I18n.t("workout.warmupSubtitle")}</span></div><div class="card">${html}</div><button class="btn btn-primary" onclick="window.nextPhase('lifting')" aria-label="${I18n.t("workout.startLifting")}">${I18n.t("workout.startLifting")}</button></div>`;
  }

  function renderLifting(container) {
    const sessions = storage.getSessions();
    const deload = calculator.isDeloadWeek(sessions);
    const active = new Map((state.activeSession?.exercises || []).map(item => [item.id, item]));
    let html = "";
    for (const exercise of EXERCISES) {
      const current = active.get(exercise.id);
      const usingAlternative = current?.usingAlternative;
      const name = Sanitizer.sanitizeString(usingAlternative ? current.altName : exercise.name);
      const video = usingAlternative && exercise.altLinks?.[current.altName] ? exercise.altLinks[current.altName] : exercise.video;
      const weight = current ? current.weight : calculator.getRecommendedWeight(exercise.id, state.recovery, sessions);
      const target = usingAlternative ? current.altName : exercise.id;
      const previous = calculator.getLastCompletedExercise(target, sessions);
      const lastText = previous ? I18n.t("exercise.last", { weight: previous.weight }) : I18n.t("exercise.firstSession");
      let sets = "";
      for (let index = 0; index < exercise.sets; index++) {
        const completed = current && index < current.setsCompleted;
        sets += `<button type="button" class="set-btn${completed ? " completed" : ""}" id="s-${exercise.id}-${index}" onclick="window.togS('${exercise.id}',${index},${exercise.sets})" aria-label="${I18n.t("a11y.set", { number: index + 1 })}" aria-pressed="${completed ? "true" : "false"}">${index + 1}</button>`;
      }
      html += `<div class="card" id="card-${exercise.id}"><div class="flex-row" style="justify-content:space-between; margin-bottom:0.25rem;"><div><div class="text-xs" style="color:var(--accent)">${exercise.category}</div><h2 id="name-${exercise.id}" style="margin-bottom:0">${name}</h2><div class="text-xs" style="opacity:0.8; margin-bottom:0.25rem">${exercise.sets} sets × ${exercise.reps} reps</div><div id="last-${exercise.id}" class="text-xs" style="opacity:0.6; margin-bottom:0.5rem">${lastText}</div></div><a id="vid-${exercise.id}" href="${video}" target="_blank" rel="noopener noreferrer" style="font-size:1.5rem; text-decoration:none" aria-label="Watch video for ${name}">🎥</a></div><div class="stepper-control"><button class="stepper-btn" onclick="window.modW('${exercise.id}', -2.5)" aria-label="${I18n.t("a11y.decreaseWeight")} for ${name}">−</button><input type="number" class="stepper-value" id="w-${exercise.id}" value="${weight}" step="2.5" readonly inputmode="none" aria-label="${I18n.t("a11y.weightPounds")} for ${name}"><button class="stepper-btn" onclick="window.modW('${exercise.id}', 2.5)" aria-label="${I18n.t("a11y.increaseWeight")} for ${name}">+</button></div><div id="pl-${exercise.id}" class="text-xs" style="text-align:center; font-family:monospace; margin:0.5rem 0 1rem 0; color:var(--text-secondary)" aria-live="polite">${calculator.getPlateLoad(weight)} ${I18n.t("exercise.perSide")}</div><div class="set-group" role="group" aria-label="Sets for ${name}">${sets}</div><details class="mt-4" style="margin-top:1rem; padding-top:0.5rem; border-top:1px solid var(--border)"><summary class="text-xs">${I18n.t("exercise.alternatives")}</summary><select id="alt-${exercise.id}" onchange="window.swapAlt('${exercise.id}')" style="width:100%; margin-top:0.5rem; padding:0.5rem; background:var(--bg-secondary); color:white; border:none" aria-label="Select alternative for ${exercise.name}"><option value="">${exercise.name}</option>${exercise.alternatives.map(value => `<option value="${value}" ${usingAlternative && current.altName === value ? "selected" : ""}>${value}</option>`).join("")}</select></details></div>`;
    }
    container.innerHTML = `<div class="container"><div class="flex-row" style="justify-content:space-between; margin-bottom:0.5rem;"><h1>${I18n.t("workout.lifting")}</h1><div class="flex-row" style="gap:0.5rem">${deload ? `<span class="text-xs" style="border:1px solid var(--accent); color:var(--accent); padding:0.25rem 0.5rem; border-radius:0.75rem">${I18n.t("workout.deload")}</span>` : ""}<span class="text-xs" style="border:1px solid var(--border); padding:0.25rem 0.5rem; border-radius:0.75rem">${state.recovery.toUpperCase()}</span></div></div><p class="text-xs" style="margin-bottom:1.5rem; text-align:center; opacity:0.8">${I18n.t("workout.tempo")}</p>${html}<button class="btn btn-primary" onclick="window.nextPhase('cardio')" aria-label="${I18n.t("workout.nextCardio")}">${I18n.t("workout.nextCardio")}</button></div>`;
  }

  function renderCardio(container) {
    const active = state.activeSession?.cardio;
    const selected = active ? active.type : CARDIO_OPTIONS[0].name;
    const config = CARDIO_OPTIONS.find(option => option.name === selected) || CARDIO_OPTIONS[0];
    container.innerHTML = `<div class="container"><h1>${I18n.t("workout.cardio")}</h1><div class="card"><div class="flex-row" style="justify-content:space-between; margin-bottom:0.5rem;"><h3>${I18n.t("exercise.selection")}</h3><a id="cardio-vid" href="${config.video}" target="_blank" rel="noopener noreferrer" style="font-size:1.5rem; text-decoration:none" aria-label="Watch video for ${config.name}">🎥</a></div><div class="text-xs" style="opacity:0.8; margin-bottom:1rem">${I18n.t("workout.cardioSubtitle")}</div><select id="cardio-type" onchange="window.swapCardioLink(); window.updateCardio()" style="width:100%; padding:1rem; background:var(--bg-secondary); color:white; border:none; margin-bottom:1rem;" aria-label="Select cardio type">${CARDIO_OPTIONS.map(option => `<option value="${option.name}" ${option.name === selected ? "selected" : ""}>${option.name}</option>`).join("")}</select><button class="btn btn-secondary" onclick="window.startCardio()" aria-label="${I18n.t("exercise.startTimer")}">${I18n.t("exercise.startTimer")}</button><label class="checkbox-wrapper" style="margin-top:1rem; cursor:pointer" for="cardio-done"><input type="checkbox" class="big-check" id="cardio-done" ${active?.completed ? "checked" : ""} onchange="window.updateCardio()"><span>${I18n.t("exercise.completed")}</span></label></div><button class="btn btn-primary" onclick="window.nextPhase('decompress')" aria-label="${I18n.t("workout.nextDecompress")}">${I18n.t("workout.nextDecompress")}</button></div>`;
  }

  function renderDecompress(container) {
    const active = new Map((state.activeSession?.decompress || []).map(item => [item.id, item]));
    let html = "";
    for (const item of DECOMPRESSION) {
      const current = active.get(item.id);
      const value = Sanitizer.sanitizeString(String(current?.val || ""));
      const alternative = current?.altUsed || "";
      const name = Sanitizer.sanitizeString(alternative || item.name);
      const video = alternative && item.altLinks?.[alternative] ? item.altLinks[alternative] : item.video;
      const options = item.alternatives.map(option => `<option value="${option}" ${alternative === option ? "selected" : ""}>${option}</option>`).join("");
      html += `<div class="card"><div class="flex-row" style="justify-content:space-between; margin-bottom:0.25rem;"><h3 id="name-${item.id}">${name}</h3><a id="vid-${item.id}" href="${video}" target="_blank" rel="noopener noreferrer" style="font-size:1.5rem; text-decoration:none" aria-label="Watch video for ${name}">🎥</a></div><div class="text-xs" style="opacity:0.8; margin-bottom:0.75rem">${item.duration}</div>${item.inputLabel ? `<input type="number" id="val-${item.id}" value="${value}" placeholder="${item.inputLabel}" aria-label="${item.inputLabel} for ${item.name}" style="width:100%; padding:1rem; background:var(--bg-secondary); border:none; color:white; margin-bottom:0.5rem" onchange="window.updateDecompress('${item.id}')">` : ""}<label class="checkbox-wrapper" style="cursor:pointer" for="done-${item.id}"><input type="checkbox" class="big-check" id="done-${item.id}" ${current?.completed ? "checked" : ""} onchange="window.updateDecompress('${item.id}')"><span>${I18n.t("exercise.completed")}</span></label><details style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid var(--border)"><summary class="text-xs" style="opacity:0.7; cursor:pointer">${I18n.t("exercise.alternatives")}</summary><select id="alt-${item.id}" onchange="window.swapAlt('${item.id}')" style="width:100%; margin-top:0.5rem; padding:0.5rem; background:var(--bg-secondary); color:white; border:none; border-radius:var(--radius-sm);" aria-label="Select alternative for ${item.name}"><option value="">Default</option>${options}</select></details></div>`;
    }
    container.innerHTML = `<div class="container"><h1>${I18n.t("workout.decompress")}</h1>${html}<button class="btn btn-primary" onclick="window.finish()" aria-label="${I18n.t("workout.saveFinish")}">${I18n.t("workout.saveFinish")}</button></div>`;
  }

  function generateSessionCard(session) {
    if (sessionCardCache.has(session)) return sessionCardCache.get(session);
    let warmup = I18n.t("history.noData");
    if (session.warmup) warmup = session.warmup.filter(item => item.completed).map(item => `✓ ${Sanitizer.sanitizeString(item.altUsed || item.id)} `).join("");
    const exercises = session.exercises.map(exercise => {
      const name = Sanitizer.sanitizeString(exercise.altName || exercise.name || EXERCISE_MAP.get(exercise.id)?.name || exercise.id);
      return `<div class="flex-row" style="justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem; ${exercise.skipped ? "opacity:0.5; text-decoration:line-through" : ""}"><span>${name}</span><span>${exercise.weight} lbs</span></div>`;
    }).join("");
    const decompress = Array.isArray(session.decompress) ? (session.decompress.every(item => item.completed) ? I18n.t("history.fullSession") : I18n.t("history.partial")) : (session.decompress?.completed ? I18n.t("exercise.completed") : I18n.t("exercise.skip"));
    const date = DateFormatter.format(session.date);
    const html = `<div class="card"><div class="flex-row" style="justify-content:space-between"><div><h3>${date}</h3><span class="text-xs" style="border:1px solid var(--border); padding:0.125rem 0.375rem; border-radius:var(--radius-sm)">${Sanitizer.sanitizeString(session.recoveryStatus).toUpperCase()}</span></div><button class="btn btn-secondary btn-delete-session" style="width:44px; height:44px; padding:0; display:flex; align-items:center; justify-content:center; flex-shrink:0" data-session-id="${session.id}" aria-label="Delete session from ${date}">✕</button></div><details style="margin-top:1rem; border-top:1px solid var(--border); padding-top:0.5rem;"><summary class="text-xs" style="cursor:pointer; padding:0.5rem 0; opacity:0.8">${I18n.t("history.viewDetails")}</summary><div class="text-xs" style="margin-bottom:0.5rem; color:var(--accent)">${I18n.t("history.warmup")}</div><div class="text-xs" style="margin-bottom:1rem; line-height:1.4">${warmup}</div><div class="text-xs" style="margin-bottom:0.5rem; color:var(--accent)">${I18n.t("history.lifting")}</div>${exercises}<div class="text-xs" style="margin:1rem 0 0.5rem 0; color:var(--accent)">${I18n.t("history.finisher")}</div><div class="text-xs">${I18n.t("workout.cardio")}: ${Sanitizer.sanitizeString(session.cardio?.type || "N/A")}<br>${I18n.t("workout.decompress")}: ${decompress}</div></details></div>`;
    sessionCardCache.set(session, html);
    return html;
  }

  function renderHistory(container) {
    const sessions = storage.getSessions();
    const limit = state.historyLimit || CONST.HISTORY_PAGINATION_LIMIT;
    let html = sessions.length ? "" : `<div class="card"><p>${I18n.t("history.noLogs")}</p></div>`;
    for (let index = sessions.length - 1, count = 0; index >= 0 && count < limit; index--, count++) html += generateSessionCard(sessions[index]);
    container.innerHTML = `<div class="container"><h1>${I18n.t("history.title")}</h1><div id="history-list">${html}</div>${limit < sessions.length ? `<button id="load-more-btn" class="btn btn-secondary" style="width:100%; margin-top:1rem; padding:1rem">${I18n.t("history.loadMore", { remaining: sessions.length - limit })}</button>` : ""}</div>`;
    container.querySelector("#load-more-btn")?.addEventListener("click", windowRef.loadMoreHistory);
  }

  function renderProgress(container) {
    container.innerHTML = `<div class="container"><h1>${I18n.t("progress.title")}</h1><div class="card"><select id="chart-ex" onchange="window.drawChart(this.value)" aria-label="Select exercise for progress chart" style="width:100%; padding:0.5rem; background:var(--bg-secondary); color:white; border:none; margin-bottom:1rem; border-radius:var(--radius-sm);">${EXERCISES.map(exercise => `<option value="${exercise.id}">${Sanitizer.sanitizeString(exercise.name)}</option>`).join("")}</select><div id="chart-area" style="min-height:250px"></div></div></div>`;
    setTimeoutFn(() => windowRef.drawChart("hinge"), 100);
  }

  function renderSettings(container) {
    container.innerHTML = `<div class="container"><h1>${I18n.t("settings.title")}</h1><div class="card"><button class="btn btn-secondary" onclick="window.viewProtocol()" aria-label="${I18n.t("settings.protocolGuide")}">${I18n.t("settings.protocolGuide")}</button></div><div class="card" aria-labelledby="flexx-pwa-health-title"><h3 id="flexx-pwa-health-title">Offline and origin storage health</h3><p class="text-xs" id="flexx-pwa-storage-health">Checking read-only browser storage status…</p><p class="text-xs" id="flexx-pwa-shell-health">Checking offline shell status…</p><p class="text-xs" style="opacity:0.7">Quota and eviction are browser-controlled. Flexx Files does not request persistence automatically.</p><div class="flex-row" style="margin-top:0.75rem"><button class="btn btn-secondary" id="refresh-pwa-health">Refresh Health</button><button class="btn btn-secondary" id="clear-pwa-cache">Clear Flexx Cache</button></div></div><div class="card"><button class="btn btn-secondary" id="backup-btn">${I18n.t("settings.backupData")}</button><div style="position:relative; margin-top:0.5rem"><button class="btn btn-secondary" tabindex="-1" aria-hidden="true">${I18n.t("settings.restoreData")}</button><input type="file" onchange="window.imp(this)" aria-label="${I18n.t("settings.restoreData")}" onfocus="this.previousElementSibling.style.outline='2px solid var(--accent)';this.previousElementSibling.style.outlineOffset='2px'" onblur="this.previousElementSibling.style.outline=''" style="position:absolute;top:0;left:0;opacity:0;width:100%;height:100%"></div><button class="btn btn-secondary" style="margin-top:0.5rem; color:var(--error)" onclick="window.wipe()" aria-label="${I18n.t("settings.factoryReset")}">${I18n.t("settings.factoryReset")}</button></div><div class="text-xs" style="text-align:center; margin-top:2rem; opacity:0.5">v${CONST.APP_VERSION} (${CONST.STORAGE_VERSION})</div></div>`;
    const usage = storage.getUsage();
    const holder = documentRef.createElement("div");
    holder.innerHTML = `<div class="card"><h3>${I18n.t("settings.storage")}</h3><p class="text-xs" style="margin-bottom:0.5rem">${I18n.t("settings.storageUsage", { percent: usage.percent.toFixed(1), used: `${(usage.bytes / 1024).toFixed(0)}KB`, total: `${(usage.limit / 1024 / 1024).toFixed(0)}MB` })}</p><div style="width:100%; height:8px; background:var(--bg-secondary); border-radius:4px; overflow:hidden"><div style="width:${usage.percent}%; height:100%; background:${usage.percent > 90 ? "var(--error)" : "var(--accent)"}"></div></div></div>`;
    const root = container.querySelector(".container");
    const cards = root.querySelectorAll(".card");
    if (cards.length > 1) root.insertBefore(holder.firstElementChild, cards[1]);
    else root.appendChild(holder.firstElementChild);
    container.querySelector("#backup-btn")?.addEventListener("click", () => {
      try { storage.exportData(); } catch (error) { modal.show({ title: I18n.t("errors.exportFailed"), text: error.message }); }
    });
    container.querySelector("#refresh-pwa-health")?.addEventListener("click", refreshPwaHealth);
    container.querySelector("#clear-pwa-cache")?.addEventListener("click", async () => {
      if (!await modal.show({ type: "confirm", title: "Clear Flexx offline cache?", text: "Training data is not changed. Reconnect before reloading to install the shell again." })) return;
      const count = await clearCaches("flexx-");
      await refreshPwaHealth();
      screenReader.announce(`Cleared ${count} Flexx cache${count === 1 ? "" : "s"}. Training data was preserved.`);
    });
    refreshPwaHealth();
  }

  async function refreshPwaHealth() {
    pwaState.health = await getHealth({ cachePrefix: "flexx-", registration: pwaState.registration });
    const storageElement = documentRef.getElementById("flexx-pwa-storage-health");
    const shell = documentRef.getElementById("flexx-pwa-shell-health");
    if (storageElement) storageElement.textContent = pwaState.health.estimateAvailable ? `${formatBytes(pwaState.health.usage)} used of ${formatBytes(pwaState.health.quota)} origin quota. Persistence: ${pwaState.health.persisted === true ? "granted" : pwaState.health.persisted === false ? "not granted" : "unknown"}.` : "Browser storage estimate is unavailable; durability and remaining quota are unknown.";
    if (shell) {
      const worker = pwaState.health.worker;
      shell.textContent = worker ? `Shell ${worker.shellVersion}; ${worker.currentComplete ? "current cache complete" : worker.recoveredFromPrevious ? "recovered from last-known-good cache" : "current cache incomplete"}. Data schema ${worker.dataSchemaVersion}.` : "Worker shell status is unavailable.";
    }
  }

  function renderProtocol(container) {
    container.innerHTML = `<div class="container"><div class="flex-row" style="margin-bottom:1rem"><button class="btn btn-secondary" style="width:auto; padding:0.5rem 1rem" onclick="window.closeProtocol()" aria-label="${I18n.t("protocol.back")}">${I18n.t("protocol.back")}</button></div><h1>${I18n.t("protocol.title")}</h1><div class="card"><h3 style="color:var(--accent)">${I18n.t("protocol.hygiene")}</h3><p class="text-xs" style="margin-bottom:1rem">${I18n.t("protocol.hygieneDesc")}</p><h3 style="color:var(--accent)">${I18n.t("protocol.overview")}</h3><ul class="text-xs" style="padding-left:1.2rem; line-height:1.6"><li><strong>Schedule:</strong> 3 days/week (e.g., Mon/Wed/Fri)</li><li><strong>Time:</strong> 58 Minutes</li><li><strong>Spacing:</strong> 48–72 hours rest required</li></ul></div><div class="card"><h3 style="color:var(--warning)">${I18n.t("protocol.faultTolerance")}</h3><div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:0.5rem; font-size:0.8rem; margin-top:0.5rem"><div>Missed 1</div><div>Slide schedule (maintain 48h gap)</div><div>Missed 2+</div><div>Reduce weights 10%</div><div>Sick (Fever)</div><div>FULL REST. Resume 24h after fever. Reduce 20%.</div><div>Injury</div><div>Skip aggravating exercise. Do others.</div></div></div><div class="card" style="border-color:var(--error)"><h3>🚨 ${I18n.t("protocol.gymClosed")}</h3><p class="text-xs" style="margin-bottom:0.5rem">${I18n.t("protocol.emergencyCircuit")}</p><ul class="text-xs" style="padding-left:1.2rem; line-height:1.6"><li><strong>Push:</strong> Incline Push-ups (Hands on furniture)</li><li><strong>Legs:</strong> Bodyweight Squats (Tempo: 3s down)</li><li><strong>Pull:</strong> Inverted Rows (Table) OR Door Rows</li><li><strong>Core:</strong> Hardstyle Plank</li></ul></div></div>`;
  }

  const chartCache = {
    cache: new WeakMap(),
    getData(exerciseId) {
      const sessions = storage.getSessions();
      if (!this.cache.has(sessions)) {
        const index = new Map();
        for (const session of sessions) {
          for (const exercise of session.exercises || []) {
            if (exercise.usingAlternative) continue;
            const entry = index.get(exercise.id) || { data: [], minVal: Infinity, maxVal: -Infinity };
            entry.data.push({ d: new Date(session.date), v: exercise.weight });
            entry.minVal = Math.min(entry.minVal, exercise.weight);
            entry.maxVal = Math.max(entry.maxVal, exercise.weight);
            index.set(exercise.id, entry);
          }
        }
        this.cache.set(sessions, index);
      }
      return this.cache.get(sessions).get(exerciseId) || { data: [], minVal: Infinity, maxVal: -Infinity };
    }
  };

  function drawChart(id) {
    try {
      const target = documentRef.getElementById("chart-area");
      if (!target) {
        logger.error("Chart area element not found");
        return;
      }
      const { data, minVal, maxVal } = chartCache.getData(id);
      if (data.length < 2) {
        target.innerHTML = `<p style="padding:1rem;color:var(--text-secondary)">${I18n.t("progress.needLogs")}</p>`;
        return;
      }
      const max = maxVal * 1.1;
      const min = minVal * 0.9;
      const width = target.clientWidth || 300;
      const height = Math.max(200, Math.min(300, width * 0.6));
      const padding = 20;
      const safe = value => {
        const number = Number(value);
        return Number.isFinite(number) ? number.toFixed(2) : "0";
      };
      const x = index => safe(padding + (index / (data.length - 1)) * (width - padding * 2));
      const y = value => safe(height - (padding + ((value - min) / (max - min)) * (height - padding * 2)));
      let path = `M ${x(0)} ${y(data[0].v)}`;
      data.forEach((point, index) => { path += ` L ${x(index)} ${y(point.v)}`; });
      target.innerHTML = `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Weight progression chart for ${EXERCISE_MAP.get(id)?.name || "exercise"}"><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="3"/>${data.map((point, index) => `<circle cx="${x(index)}" cy="${y(point.v)}" r="4" fill="var(--bg-secondary)" stroke="var(--accent)" stroke-width="2"/>`).join("")}</svg><div class="flex-row" style="justify-content:space-between; margin-top:0.25rem; font-size:var(--font-xs); color:var(--text-secondary)"><span>${DateFormatter.format(data[0].d)}</span><span>${DateFormatter.format(data[data.length - 1].d)}</span></div>`;
    } catch (error) {
      logger.error("Error drawing chart:", error);
      const target = documentRef.getElementById("chart-area");
      if (target) target.innerHTML = `<p style="padding:1rem;color:var(--error)">${I18n.t("progress.errorRendering")}</p>`;
    }
  }

  return Object.freeze({ render, renderToday, renderHistory, renderSettings, generateSessionCard, refreshPwaHealth, drawChart });
}
