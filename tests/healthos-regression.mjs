import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  HEALTH_RECORD_TYPES,
  createDailyStateRecord,
  createFocusSessionRecord,
  createHealthPackage,
  healthRecordsToTsDashCsv,
  healthStateGuidance,
  parseHealthPackageText,
  validateHealthRecord
} from "../shared/healthos.js";
import {
  FOCUS_MODES,
  applyFocusTimerAction,
  createBreakTimer,
  createFocusTimer,
  reconcileFocusTimer,
  validateFocusTimer
} from "../shared/focus-timer.js";

const fixture = JSON.parse(await readFile(new URL("./fixtures/healthos-focus-v1.json", import.meta.url), "utf8"));
const expectedCsv = await readFile(new URL("./fixtures/healthos-tsdash.csv", import.meta.url), "utf8");
const fixed = { recordTimezone: "America/Toronto", revision: 0 };
const daily = await createDailyStateRecord(fixture.daily, {
  ...fixed,
  id: "healthos-daily-fixture",
  createdAt: "2024-02-29T12:00:00.000Z",
  updatedAt: "2024-02-29T12:00:00.000Z",
  extensions: { futureExtension: { preserved: true } }
});
const focus = await createFocusSessionRecord(fixture.focus, {
  ...fixed,
  id: "healthos-focus-fixture",
  createdAt: fixture.focus.started_at,
  updatedAt: fixture.focus.ended_at
});

assert.equal(daily.type, HEALTH_RECORD_TYPES.DAILY_STATE);
assert.deepEqual(Object.keys(daily.payload), ["date", "life_state", "mood", "energy", "sleep_quality", "stress", "soreness", "pain_flags", "intended_focus", "recovery_need", "notes"]);
assert.equal(daily.futureExtension.preserved, true);
assert.equal(focus.type, HEALTH_RECORD_TYPES.FOCUS_SESSION);
assert.equal(healthRecordsToTsDashCsv([daily, focus]), expectedCsv);
assert.match(expectedCsv, /correlation does not establish causation/);
assert.match(expectedCsv, /duration derived from persisted timestamps/);

const portable = await createHealthPackage([daily, focus], { packageTimezone: "America/Toronto", selection: { fixture: true } });
const roundTrip = await parseHealthPackageText(JSON.stringify(portable));
assert.equal(roundTrip.records.length, 2);
assert.equal(roundTrip.records[0].futureExtension.preserved, true);
await assert.rejects(() => parseHealthPackageText("not-json"), /valid JSON/i);
assert.throws(() => validateHealthRecord({ ...daily, schemaVersion: "2.0.0" }), /only 1\.x/i);
assert.throws(() => validateHealthRecord({ ...daily, schemaVersion: 2 }), /only 1\.x/i);
assert.throws(() => validateHealthRecord({ ...daily, type: "healthos/meditation_session" }), /unsupported/i);
assert.throws(() => validateHealthRecord({ ...daily, payload: { ...daily.payload, mood: 9 } }), /mood/i);
assert.throws(() => validateHealthRecord({ ...daily, payload: { ...daily.payload, date: "2024-02-31" } }), /valid calendar date/i);

const start = Date.parse("2024-03-10T06:55:00.000Z");
assert.deepEqual(Object.keys(FOCUS_MODES), ["25-5", "50-10", "minimum-5", "minimum-10", "custom", "open"]);
assert.throws(() => createFocusTimer({ mode: "custom", customFocusMinutes: 0, customBreakMinutes: 5, now: start }), /Focus duration/i);
let timer = createFocusTimer({ id: "timer-fixture", mode: "25-5", intention: "DST-safe focus", timezone: "America/Toronto", now: start });
assert.equal(validateFocusTimer(timer), timer);
assert.throws(() => validateFocusTimer({ ...timer, segmentStartedAt: "not-an-instant" }), /valid timer instant/i);
assert.equal(reconcileFocusTimer(timer, start + 10 * 60000).elapsedMs, 10 * 60000);
assert.equal(reconcileFocusTimer(timer, start + 60 * 60000).complete, true, "sleep/suspension must reconcile from timestamps");
timer = applyFocusTimerAction(timer, { type: "pause" }, start + 5 * 60000);
assert.equal(reconcileFocusTimer(timer, start + 15 * 60000).elapsedMs, 5 * 60000, "paused time must not accrue");
timer = applyFocusTimerAction(timer, { type: "resume" }, start + 15 * 60000);
assert.equal(reconcileFocusTimer(timer, start + 20 * 60000).elapsedMs, 10 * 60000);
timer = applyFocusTimerAction(timer, { type: "correct", minutes: 7.5 }, start + 20 * 60000);
assert.equal(reconcileFocusTimer(timer, start + 20 * 60000).elapsedMs, 7.5 * 60000);
assert.equal(reconcileFocusTimer(timer, start - 60000).clockAnomaly, true, "clock rollback must be visible and fail safe");
timer = applyFocusTimerAction(timer, { type: "interrupt" }, start + 21 * 60000);
timer = applyFocusTimerAction(timer, { type: "distraction", note: "Later" }, start + 21 * 60000);
assert.equal(timer.interruptions, 1);
assert.deepEqual(timer.distractionNotes, ["Later"]);
timer = applyFocusTimerAction(timer, { type: "restart" }, start + 22 * 60000);
assert.equal(timer.status, "running");
assert.equal(reconcileFocusTimer(timer, start + 22 * 60000).elapsedMs, 0);
assert.equal(applyFocusTimerAction(timer, { type: "finish" }, start + 23 * 60000).status, "review");
assert.equal(applyFocusTimerAction(timer, { type: "skip" }, start + 23 * 60000).status, "review");
assert.equal(applyFocusTimerAction(timer, { type: "cancel" }, start + 23 * 60000).status, "cancelled");
const breakTimer = createBreakTimer(timer, Date.parse("2024-02-29T23:59:00.000Z"));
assert.equal(breakTimer.segment, "break");
assert.equal(reconcileFocusTimer(breakTimer, Date.parse("2024-03-01T00:04:00.000Z")).complete, true, "leap-date boundary must use instants");
const open = createFocusTimer({ id: "open-fixture", mode: "open", now: start });
assert.equal(reconcileFocusTimer(open, start + 90 * 60000).remainingMs, null);
assert.equal(reconcileFocusTimer(open, start + 90 * 60000).elapsedMs, 90 * 60000);
const travelled = createFocusTimer({ id: "travel-fixture", mode: "minimum-5", timezone: "Pacific/Auckland", now: start });
const travelledView = reconcileFocusTimer(travelled, start + 5 * 60000);
assert.equal(travelledView.elapsedMs, 5 * 60000, "timezone travel must not change instant-derived duration");
assert.equal(travelledView.timezoneChanged, true, "timezone changes must stay visible");
assert.match(healthStateGuidance("CRISIS"), /Remove productivity pressure/);
assert.match(healthStateGuidance("DEGRADED"), /5- or 10-minute minimum/);

console.log("HealthOS schema, interchange, TS-Dash, and trustworthy timer regression passed.");
