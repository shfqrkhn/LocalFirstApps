# Flexx Files MPES

Version: 0.1.0-draft
Status: working specification
Product: Flexx Files
Scope: adaptive full-body training optimizer for generally healthy adults

## 1. Mission

Flexx Files exists to maximize useful whole-body fitness adaptation per unit of total real-world burden.

The product must optimize the whole system, not gym minutes in isolation. For each user and each day, it should choose the smallest complete training action that is expected to produce the best long-term combination of:

- muscular strength;
- muscle retention or growth;
- cardiorespiratory fitness;
- functional capacity;
- bone-loading stimulus;
- movement competence;
- adherence and sustainability.

It must minimize:

- door-to-door time;
- unnecessary fatigue;
- redundant sets and exercises;
- unnecessary gym trips;
- waiting for equipment;
- setup and station changes;
- cognitive burden;
- data-entry burden;
- monetary cost;
- avoidable injury and recovery risk.

The governing design philosophy is Pareto optimization plus Via Negativa. Remove low-value work and complexity before adding volume, features, data, intensity, or infrastructure.

## 2. Intended users and operating envelope

Initial operating envelope:

- generally healthy adults;
- beginner through intermediate resistance-training experience;
- users who can understand and follow ordinary exercise instructions;
- users with access to a commercial/community gym, a limited home setup, or both;
- users whose primary constraint is time and whose goal is broad health and performance rather than sport-specific peak performance.

Initial exclusions:

- diagnosis, rehabilitation, treatment, or return-to-play;
- pregnancy-specific programming;
- known unstable cardiovascular disease;
- acute illness, acute injury, unexplained exertional symptoms, or other conditions requiring individualized medical clearance;
- competitive powerlifting, bodybuilding, endurance, or sport-specific peaking.

The app may support these populations later only after the requirements, evidence, safety gates, and qualified review are added.

## 3. Evidence and currentness

The prescription engine must remain evidence-bounded and versioned.

Current basis for this draft includes:

- ACSM 2026 resistance-training position stand: consistency, personalization, major-muscle training at least twice weekly, higher loads for strength, higher weekly volume for hypertrophy, and no universal need for failure training, complex periodization, or one equipment type.
- Canadian 24-Hour Movement Guidelines for adults 18-64: at least 150 minutes per week of moderate-to-vigorous aerobic activity, major-muscle strengthening at least twice weekly, sufficient sleep, and reduced prolonged sedentary time.
- WHO 2020 adult physical-activity guidelines: 150-300 minutes moderate or 75-150 minutes vigorous aerobic activity per week, plus major-muscle strengthening on at least two days.
- 2025 systematic review/meta-analysis of supersets: similar chronic strength and hypertrophy outcomes to traditional sets with shorter sessions, while internal load and perceived exertion can be higher.
- 2026 umbrella review of concurrent training: combined aerobic and resistance training can improve aerobic fitness while preserving broadly comparable strength and hypertrophy outcomes; resistance before endurance is a reasonable default when performed in the same session and strength matters.
- 2024 meta-regression on repetitions in reserve: strength gains are relatively insensitive across a broad RIR range, while hypertrophy tends to improve as sets are taken closer to failure; exact optimal RIR remains uncertain.
- 2024 and 2026 reviews comparing failure and non-failure training: routine momentary failure is not required and non-failure training can preserve strength performance.
- 2024/2025 low-volume HIIT evidence: low-volume HIIT can improve cardiorespiratory fitness efficiently, but vigorous exercise should be introduced progressively and is not the default when cardiovascular risk or symptoms are uncertain.
- WCAG 2.2 as the current W3C accessibility recommendation.
- OWASP HTML5 guidance: browser storage must be treated as untrusted and not as a confidentiality boundary; IndexedDB is the standard structured client-side transactional store.

Evidence refresh trigger:

- material new ACSM, CSEP, WHO, AHA, W3C, OWASP, browser-platform, or high-quality systematic-review evidence;
- observed harm, regression, or poor user outcomes;
- material change in target population, data sensitivity, or product scope.

No model-generated recommendation may silently override the validated prescription envelope.

## 4. Product objective function

The engine is multi-objective.

Hard constraints are applied first:

- safety stop conditions;
- user limitations;
- validated population envelope;
- equipment available now;
- total time available now;
- recovery state;
- minimum major-muscle coverage across the rolling week;
- data-integrity and application-state constraints.

Then candidates are Pareto-ranked across:

- expected training effect;
- weekly coverage contribution;
- door-to-door minutes;
- fatigue and recovery cost;
- equipment/setup cost;
- expected station wait;
- exercise skill burden;
- user preference and boredom;
- exercise substitution quality;
- superset compatibility;
- monetary cost.

The engine should not collapse all variables into a single opaque score when the choice can be made by dominance, hard thresholds, or transparent tie-breakers.

Default tie-break order:

1. safety and validity;
2. adequate weekly resistance and aerobic exposure;
3. adherence probability and schedule fit;
4. training benefit per total minute;
5. training benefit per fatigue unit;
6. setup and station efficiency;
7. preference and variety;
8. extra polish.

## 5. Logistics model

Door-to-door gym burden is:

```text
preparation + outbound travel + training + return travel
```

Home-session burden is:

```text
setup + training
```

Personal logistics are runtime user data, not repository configuration.

The source repository must not contain a user's:

- home or gym location;
- city/neighborhood;
- commute duration;
- preparation duration;
- workplace or profession;
- relationship/family details;
- medical or health details;
- personally identifying routine history.

The app stores only the minimum user-specific logistics needed for optimization in local user-controlled storage.

The optimization engine must parameterize:

- preparation time;
- outbound and return travel time;
- parking/wait uncertainty;
- home setup time;
- session duration;
- station-wait uncertainty.

Monte Carlo and sensitivity analysis use either:

- synthetic non-personal test distributions committed to the repository; or
- the user's local runtime values without committing or transmitting them.

Development simulations must never embed production/user PII in fixtures, snapshots, logs, screenshots, or documentation.

Decision rule:

- additional gym visits must earn their fixed logistics cost;
- low-overhead home conditioning may dominate an additional trip when resistance-training coverage is already sufficient;
- exact thresholds are user-specific and derived locally rather than hard-coded from a particular person's schedule.

## 6. Default weekly architecture

Default:

- two full-body gym sessions, A and B;
- two low-overhead home-bike sessions;
- optional third home-bike micro-session when aerobic exposure outside the app is low;
- no fixed calendar days;
- at least one recovery day between demanding resistance sessions by default;
- actual scheduling follows readiness, availability, and rolling coverage rather than weekday names.

The app tracks rolling seven- and fourteen-day exposure rather than resetting physiology on Monday.

## 7. Base-building phase

The app must build competence and tolerance before chasing load.

Minimum entry phase:

- at least six completed resistance sessions;
- extend the phase if technique is inconsistent, readiness is repeatedly low, pain appears, or the user is not completing the planned work.

Base-building prescription:

- two work sets per movement;
- approximately 3-4 RIR;
- no routine failure;
- conservative initial loads;
- stable exercise selection unless a movement is uncomfortable, impractical, unavailable, or strongly disliked;
- steady aerobic work rather than HIIT;
- focus on repeatability, technique, station flow, and accurate RIR calibration.

Exit conditions:

- no red-flag symptoms;
- user can complete both weekly sessions consistently;
- exercise technique is stable enough for ordinary self-directed progression;
- RIR estimates are internally plausible;
- session duration is predictable;
- no persistent pain signal caused by the program.

The engine may then progress intensity, volume, or conditioning one variable at a time.

## 8. Resistance-training routines

### 8.1 Session A - hinge plus horizontal emphasis

Target duration: about 35-45 training minutes.

Warm-up:

- 2-5 minutes easy bike or equivalent only when cold, stiff, or coming from prolonged sitting;
- movement-specific ramp-up sets on the first lower-body and first upper-body lift;
- no mandatory stretching circuit.

Primary movement:

1. Hinge
   - default: trap-bar deadlift;
   - 2 sets x 5-8 reps;
   - base phase: 3-4 RIR;
   - normal phase: 2-3 RIR;
   - alternatives: Romanian deadlift, dumbbell RDL, machine/hip-hinge variant that preserves the intended pattern.

Pair 1:

2A. Horizontal push
   - default: dumbbell bench press or machine chest press, whichever has lower setup/wait cost;
   - 2 sets x 6-10 reps;
   - alternatives: barbell bench press, incline dumbbell press, stable push-up variant.

2B. Horizontal pull
   - default: chest-supported row or seated cable/machine row;
   - 2 sets x 8-12 reps;
   - alternatives: one-arm dumbbell row, other stable row variant.

Pair 2:

3A. Knee-dominant lower body
   - default: leg press or hack squat;
   - 2 sets x 8-12 reps;
   - alternatives: goblet squat, split squat, other stable knee-dominant option.

3B. Vertical pull
   - default: lat pulldown;
   - 2 sets x 8-12 reps;
   - alternatives: assisted pull-up, pull-up if appropriate, another stable pulldown.

Optional only when time and recovery justify it:

4. Carry/trunk
   - farmer carry, suitcase carry, or Pallof press;
   - 1-2 short sets.

### 8.2 Session B - knee plus vertical emphasis

Target duration: about 35-45 training minutes.

Primary movement:

1. Knee-dominant lower body
   - default: leg press, hack squat, or stable squat pattern;
   - 2 sets x 6-10 reps.

Pair 1:

2A. Vertical push
   - default: machine shoulder press or dumbbell overhead press;
   - 2 sets x 6-10 reps.

2B. Horizontal pull
   - default: chest-supported, cable, or machine row;
   - 2 sets x 8-12 reps.

Pair 2:

3A. Hinge
   - default: Romanian deadlift or trap-bar variant;
   - 2 sets x 8-10 reps.

3B. Horizontal push
   - default: machine chest press, dumbbell bench, or incline dumbbell press;
   - 2 sets x 8-12 reps.

Optional only when coverage debt or time justifies it:

4. Vertical pull, carry/trunk, calves, or another targeted deficit.
   - 1-2 sets.

### 8.3 Pairing rule

Use agonist-antagonist or non-competing pairs when they preserve target performance.

Default pair flow:

```text
exercise A set
short transition
exercise B set
60-90 seconds recovery
repeat
```

Each muscle therefore receives a longer effective recovery interval than the visible rest period.

Do not pair:

- two technically demanding heavy lower-body lifts;
- similar-biomechanical exercises that materially reduce useful volume;
- exercises whose combined cardiorespiratory demand causes technique breakdown;
- pairs that require distant stations or create more waiting than they save.

### 8.4 Twenty-minute gym compression

When only about 20 training minutes are available:

- use four movements;
- preserve one knee/hinge lower-body pattern, one complementary lower-body pattern when feasible, one push, and one pull;
- perform two work sets each;
- use two efficient pairs;
- omit accessories, carries, calves, and redundant angles;
- preserve weekly debt by giving the next session the omitted pattern.

Typical example:

- leg press + chest-supported row;
- dumbbell or machine chest press + Romanian deadlift.

This is an emergency/compressed session, not the universal default.

### 8.5 Thirty-minute gym compression

Use approximately five movements:

- primary lower-body movement;
- push/pull pair;
- complementary lower-body movement;
- second upper-body movement chosen from weekly coverage debt.

Use two sets each.

### 8.6 Sixty-minute expansion

Do not automatically add more exercise variety.

Use extra time in this order:

1. restore full standard session if compressed;
2. add a third set to the highest-priority movements where response history supports it;
3. add a missing weekly movement or muscle exposure;
4. add short carry/trunk work;
5. add targeted mobility only for a demonstrated restriction;
6. add aerobic work only if it does not compromise higher-priority resistance quality.

## 9. Exercise substitution and station availability

Every exercise belongs to a movement/effect equivalence class.

The user can tap:

- Busy;
- Swap;
- Bored;
- Uncomfortable.

The engine responds differently:

Busy:
- prefer same-pattern alternatives at the current or nearest station;
- minimize walking, setup, and queueing.

Bored:
- prefer an equivalent movement not used recently;
- do not change the entire program;
- preserve load/progression comparability where possible.

Uncomfortable:
- stop the aggravating movement;
- do not diagnose;
- offer a non-aggravating equivalent only when ordinary safe substitution is reasonable;
- surface stop/escalation guidance when symptoms are concerning.

Swap:
- show 1-3 best-ranked alternatives, not an unrestricted library.

Station-cluster modes:

- dumbbell/bench cluster;
- machine cluster;
- cable cluster;
- mixed cluster.

The optimizer should minimize station transitions subject to preserving training coverage and quality.

## 10. Progression

Default progression is deterministic and explainable.

Record per movement:

- load;
- repetitions;
- sets completed;
- RIR or RPE;
- substitution used;
- discomfort signal;
- optional note.

Progress by double progression:

1. remain inside an exercise-specific rep range;
2. when all work sets reach the top of the range with target RIR and stable technique, increase by the smallest practical load increment;
3. return toward the lower end of the rep range;
4. repeat.

Load increase should normally be the smallest practical increment or approximately 2.5-5 percent, not a universal fixed 5 lb rule.

Do not increase load when:

- technique degraded;
- target RIR was exceeded toward failure;
- recovery is poor;
- the user barely completed the lower bound;
- the last session was a temporary constrained variation that should not redefine baseline.

If progress stalls:

1. verify sleep/readiness, adherence, and equipment comparability;
2. hold load and attempt rep progression;
3. change exercise variant only for a material reason;
4. add one set only when more dose has positive expected value and time/recovery permit;
5. reduce volume or load when fatigue appears to be the limiting factor.

No fixed calendar deload is required. Deload/reduction is triggered by multi-session evidence such as:

- declining performance at similar effort;
- rising RIR error or perceived exertion;
- persistent low readiness;
- incomplete sessions;
- accumulating discomfort;
- user-requested recovery.

## 11. Aerobic training

The bike is the default home aerobic tool because it has almost no travel cost and low skill/setup burden.

### 11.1 Base aerobic session

During base-building:

- 20-30 minutes;
- comfortable moderate effort;
- talk-test compatible;
- approximately RPE 3-5 out of 10;
- no all-out work.

### 11.2 Post-base low-volume interval session

Only when:

- base-building exit criteria are met;
- readiness is green;
- no relevant warning symptoms or contraindication are present;
- the user is accustomed to regular moderate exercise.

Conservative default:

- 4 minutes easy warm-up;
- 5 x 1 minute hard but controlled at approximately RPE 8/10;
- 1 minute easy between hard efforts;
- 3 minutes easy cool-down.

Total: about 17 minutes.

This is not sprint interval training and not all-out.

If the user dislikes HIIT, steady cycling remains valid.

If the user reports concerning symptoms, the session stops and the app routes to appropriate medical guidance rather than optimizing through the symptom.

### 11.3 Weekly aerobic debt

The app should not assume all aerobic activity occurs inside Flexx Files.

Track or optionally import:

- cycling;
- brisk walking;
- running;
- sport;
- other moderate/vigorous aerobic activity.

Then prescribe only the remaining useful gap.

Do not force additional bike time merely to make an app metric green if the user's actual week already contains adequate aerobic activity.

## 12. Mobility, balance, trunk, and holistic coverage

Via Negativa applies.

Do not create separate long blocks for mobility, balance, or core unless a real need exists.

Prefer movements that provide overlapping benefits:

- split squat for unilateral strength and balance;
- loaded carry for trunk, grip, gait, and conditioning;
- full-range controlled resistance exercise for usable range of motion;
- targeted mobility only where a restriction affects movement quality or comfort.

Static stretching is optional, not a mandatory workout tax.

## 13. Adaptation engine

The engine maintains a compact user model.

Stable or slowly changing inputs:

- goals and goal weights;
- experience;
- preferred/avoided exercises;
- known non-clinical limitations;
- available environments;
- equipment;
- typical gym-trip overhead;
- usual session time caps.

Daily inputs:

- available total time;
- location;
- readiness;
- station availability;
- boredom/variety request;
- pain or illness stop signals.

Observed outputs:

- completed sets/reps;
- load;
- RIR/RPE;
- session duration;
- swaps;
- skipped work;
- cardio duration/intensity;
- adherence.

Derived state:

- rolling movement coverage;
- rolling muscle-group coverage;
- aerobic exposure;
- progression trend;
- fatigue trend;
- exercise-specific response;
- station/setup cost estimates;
- user-specific actual session-time estimates.

Prescription loop:

```text
observe
validate
derive coverage and constraints
generate candidates
remove dominated candidates
apply transparent tie-breaks
prescribe
execute
record
update user-specific estimates
```

## 14. User-specific learning

Personalization may learn:

- actual time per exercise;
- actual transition time;
- common busy stations;
- preferred substitutions;
- RIR accuracy trends;
- load-response trends;
- fatigue tolerance;
- whether a third set produces measurable value;
- whether HIIT or steady cycling yields better adherence.

Learning is bounded.

The app must not silently rewrite safety rules, evidence rules, or the product operating envelope from user data.

User-specific adaptation changes prescriptions inside validated limits.

Material algorithm changes require a versioned, tested release.

## 15. GUI and workflow

Design target:

- professional;
- minimalist;
- utilitarian;
- calm;
- joyful without decoration for its own sake;
- one obvious next action.

### 15.1 Today screen

Show:

- recommendation: Gym or Home Bike;
- total expected burden, including travel/prep when applicable;
- training duration;
- readiness;
- one-sentence rationale;
- Start button.

Example:

```text
TODAY

Gym
About 70 min door to door
About 40 min training

Full-body B
Base phase: 2 sets per movement

Why: last full-body session was 3 days ago; aerobic work is current.

START
```

### 15.2 Workout screen

Show one pair or one primary movement at a time.

For each exercise:

- name;
- target reps;
- load;
- target RIR;
- set count;
- previous comparable performance;
- large Complete Set button;
- Busy button;
- Swap button.

Hide detailed analytics during execution.

### 15.3 Pair screen

For paired work:

```text
PAIR 1 OF 2

A. Chest Press
B. Seated Row

Do A, then B, then recover.

SET 1
```

The timer should represent the recovery need of the trained tissue, not blindly restart a fixed 90-second count after every tap.

### 15.4 End-of-session capture

Request only data that can change future decisions.

Default:

- completion;
- reps;
- RIR;
- discomfort yes/no.

Everything else is optional.

### 15.5 History and progress

Prioritize:

- adherence;
- strength trend;
- rep/load trend;
- aerobic exposure;
- total weekly time;
- average door-to-door burden;
- movement coverage;
- session compression achieved.

Avoid vanity dashboards and low-actionability charts.

## 16. Accessibility

Target WCAG 2.2 Level AA; do not claim conformance until tested.

Requirements include:

- semantic controls;
- full keyboard operation;
- screen-reader names/roles/values;
- visible focus;
- no color-only state;
- high contrast;
- reflow and text scaling;
- reduced-motion support;
- touch targets preferably at least 44 CSS px for critical controls;
- no precision dragging requirement;
- timers can be extended, skipped, or made non-blocking;
- errors state what happened and how to recover;
- critical workflow remains usable with touch, pointer, and keyboard.

## 17. Software architecture

The long-term architecture should separate deterministic domain logic from UI and persistence.

Target:

```text
domain/
  protocol.js
  prescription.js
  progression.js
  coverage.js
  conditioning.js
  substitution.js
  logistics.js

data/
  repository.js
  indexeddb.js
  migrations.js
  backup.js

app/
  state-machine.js
  timers.js
  session-controller.js

ui/
  render.js
  events.js
  accessibility.js
  design-system.css

tests/
  domain/
  persistence/
  workflow/
  accessibility/
  simulation/
```

No framework is required unless measured lifecycle value justifies it.

Keep the application static-hostable and offline-first.

## 18. Data model

A saved session must identify at minimum:

- schemaVersion;
- appVersion;
- protocolVersion;
- prescriptionVersion;
- userProfileVersion;
- session id/time;
- environment;
- availableMinutes;
- estimated and actual doorToDoorMinutes when relevant;
- readiness;
- prescribed movements;
- actual movements/substitutions;
- prescribed and completed sets/reps;
- load;
- RIR/RPE;
- conditioning;
- warnings/stop events;
- completion state.

Exports must remain open, documented, and reversible.

## 19. Persistence and recovery

Target persistence: IndexedDB behind a repository interface.

Migration from localStorage must be staged:

1. read existing state;
2. validate;
3. write IndexedDB candidate;
4. verify counts/integrity;
5. preserve rollback snapshot;
6. switch reads only after verification;
7. retain export/restore.

Never destroy the last known-good copy during migration.

Draft session recovery remains mandatory.

Interrupted writes must not be presented as completed sessions.

## 20. Privacy and security

Default:

- no account;
- no backend required;
- no advertising;
- no third-party behavioral analytics;
- no sale of user data;
- no health diagnosis inference.

Treat browser storage as untrusted local data, not a confidentiality boundary.

Requirements:

- strict input validation on imports and reads;
- output encoding;
- restrictive CSP;
- no dynamic code evaluation;
- no credentials in browser storage;
- user-controlled export and deletion;
- dependency minimization;
- versioned service-worker caches;
- stale-cache recovery;
- explicit external links;
- supply-chain review before adding dependencies.

## 21. Reliability and fault tolerance

The app must fail safely and recoverably.

Required cases:

- browser closes mid-workout;
- storage quota failure;
- malformed import;
- stale service worker;
- interrupted migration;
- duplicate save;
- double tap;
- multiple tabs;
- missing exercise config;
- changed protocol version;
- station swap mid-session;
- offline start;
- device sleep;
- timer interruption.

Use idempotent save operations and stable session identifiers.

Reconcile uncertain state before retrying writes.

## 22. Self-correction and self-improvement

"Self-improving" means evidence-triggered bounded adaptation, not autonomous uncontrolled drift.

Allowed automatically:

- user-specific estimates;
- preference learning;
- station-time learning;
- exercise-response learning;
- prescription selection within validated rules;
- safe cache/index repair;
- retry of idempotent local operations.

Not allowed automatically:

- changing safety gates;
- changing medical operating envelope;
- adding new exercise protocols from the internet;
- changing evidence thresholds;
- modifying executable code without a signed/versioned release path;
- weakening tests to obtain a pass.

Product updates require:

- source/evidence refresh when relevant;
- specification change;
- regression tests;
- simulation;
- browser-target verification;
- rollback plan;
- versioned release.

## 23. Verification and validation

TDD and SDD are required for material behavior.

Core deterministic tests:

- coverage calculation;
- time-budget compression;
- exercise equivalence;
- station unavailability;
- boredom substitution;
- double progression;
- base-building exit;
- readiness adjustment;
- aerobic debt;
- HIIT gating;
- door-to-door optimizer;
- migration;
- import/export round trip.

Property tests:

```text
import(export(state)) == normalized(state)
```

```text
adding a constraint cannot produce a prescription that violates that constraint
```

```text
a compressed workout cannot increase total prescribed work
```

```text
a station-unavailable exercise cannot remain the selected implementation
```

```text
re-running a completed idempotent save does not duplicate the session
```

Simulation:

- multi-year training histories;
- missed sessions;
- vacations;
- repeated yellow readiness;
- station outages;
- time-budget changes;
- boredom;
- progression plateaus;
- browser interruptions;
- data corruption.

Monte Carlo is appropriate for:

- total-time uncertainty;
- commute variability;
- queue/station uncertainty;
- adherence under schedule disruption;
- sensitivity to time caps.

It must not be presented as proof of physiological benefit unless its physiological model has independent empirical validation.

## 24. Multivariate decision analysis

The engine should evaluate how the recommendation changes when varying:

- available time;
- trip overhead;
- weekly gym frequency;
- exercise count;
- set count;
- RIR;
- station wait;
- recovery;
- user goal weights;
- external aerobic activity;
- boredom/aversion;
- substitution quality.

Use:

- Pareto frontier analysis;
- sensitivity analysis;
- scenario analysis;
- ablation tests;
- Monte Carlo for uncertain logistics;
- holdout simulation cases.

Do not rely on one arbitrary weighted score.

## 25. Release gates

A release is not accepted because the source looks correct.

Minimum gates:

- deterministic domain tests pass;
- regression suite passes;
- import/export recovery passes;
- migration recovery passes;
- offline PWA behavior passes;
- keyboard/touch/screen-reader critical flows are tested;
- WCAG 2.2 AA audit scope is documented;
- security static analysis passes;
- target browser tests pass;
- no known material data-loss defect;
- exact built/released source identity is recorded.

## 26. Current implementation roadmap

Phase 1 - adaptive foundation:

- time-budgeted prescription;
- base-building;
- two-session A/B architecture;
- home-bike environment;
- variety/substitution;
- readiness;
- open export.

Phase 2 - workflow efficiency:

- station-busy live swaps;
- superset state machine;
- RIR capture;
- exercise clustering;
- door-to-door time estimates;
- rolling coverage debt.

Phase 3 - personalization:

- response-based set progression;
- adaptive aerobic debt;
- individualized time estimates;
- boredom/preference learning;
- gym-vs-home recommendation.

Phase 4 - resilience:

- IndexedDB repository;
- robust migrations;
- cross-tab coordination;
- stronger backup/restore;
- offline/update recovery.

Phase 5 - validated self-improvement:

- bounded personalization metrics;
- holdout simulation;
- evidence refresh workflow;
- versioned algorithm updates.

## 27. Health screening and safety routing

On first use, before vigorous conditioning or progression beyond the base phase, the app should route the user through an established pre-participation screening path appropriate to the jurisdiction.

For the initial Canadian release:

- point users to the current CSEP Get Active Questionnaire and companion reference guidance;
- do not silently copy or fork the questionnaire text into the app unless licensing/permissions and update obligations are explicitly satisfied;
- a positive response does not become an app diagnosis;
- route the user to the CSEP reference guidance and, where indicated, a health care provider or qualified exercise professional;
- record only the minimum state needed to know whether vigorous-intensity features are currently eligible;
- do not store unnecessary medical details.

Immediate stop/escalation signals during exercise include concerning chest discomfort, unexplained fainting or near-fainting, severe unusual shortness of breath, new neurologic symptoms, or other severe/unusual symptoms. The app stops the session and directs the user to appropriate urgent care rather than offering an exercise substitution.

## 28. Source control, CI, build, and release provenance

Source control:

- main is protected from direct release mutation where repository controls permit;
- material changes use reviewable branches/pull requests;
- the exact source revision for each release is recorded;
- tests cannot be weakened merely to make a candidate pass.

CI gates should include:

- deterministic unit/domain tests;
- import/export and migration tests;
- browser behavior tests;
- offline/service-worker tests;
- accessibility checks;
- dependency/security scanning;
- version consistency;
- artifact identity checks.

The app is a static PWA and should not gain a build system unless the lifecycle value is demonstrated.

For distributed releases:

- bind release identity to source revision;
- publish cryptographic hashes/provenance when the hosting/release path supports useful verification;
- isolate untrusted build/test steps from any deployment or signing credentials;
- roll back only to a state that is not knowingly vulnerable or data-incompatible.

## 29. Rights, licensing, and external content

The application source follows the repository license.

Exercise names, factual movement descriptions, and original app content should be authored or permissibly sourced.

External videos are links, not bundled content.

Do not scrape or redistribute copyrighted exercise libraries merely because they are publicly viewable.

For third-party datasets, code, icons, fonts, images, or educational material:

- verify license and provenance;
- record required attribution;
- avoid dependencies that create ongoing legal/maintenance burden without material product value;
- preserve replaceability.

## 30. Observability, incidents, support, and repair

Default observability is local and privacy-minimized.

Track only decision-relevant operational signals such as:

- failed persistence;
- failed migration;
- invalid import;
- service-worker update conflict;
- recovered draft;
- prescription-generation failure;
- impossible state transition.

Do not capture detailed health/training content in telemetry by default.

If remote telemetry is ever introduced:

- make it explicit and minimal;
- document data, purpose, retention, recipients, and opt-out;
- never make analytics required for normal operation.

Incident handling:

1. contain the affected feature;
2. preserve user data and last-known-good state;
3. identify affected versions;
4. provide export/recovery guidance;
5. patch the controlling cause;
6. add a regression test;
7. revalidate affected flows before release.

## 31. Capacity, performance, and sustainability

The app should remain fast on ordinary modern phones without a backend.

Performance targets:

- first useful screen should render without waiting for an update check;
- prescription generation should be effectively instantaneous for normal user histories;
- workout interactions should not depend on network availability;
- history growth must not make normal session start or save visibly slow.

Sustainability principles:

- minimize network requests;
- avoid background work without user value;
- keep dependency count near zero;
- prefer incremental indexed reads over reparsing the entire history;
- keep caches bounded and recoverable;
- do not collect or compute data merely because it is available.

## 32. Deployment, update, rollback, and compatibility

Deployment remains static-host compatible.

Service-worker updates must:

- version caches;
- remove obsolete caches deliberately;
- not interrupt the current workout;
- apply new code at a safe lifecycle boundary;
- preserve the ability to recover an in-progress session after update.

Data compatibility:

- every schema/protocol change declares migration behavior;
- old exports remain importable when materially feasible;
- if backward compatibility is intentionally dropped, provide a conversion/export path first;
- interrupted migration remains incomplete and recoverable.

Rollback:

- application rollback must not silently downgrade user data to an incompatible schema;
- prefer roll-forward repair when code rollback would reintroduce a known data/security defect.

## 33. Maintenance, extension, deprecation, and retirement

Maintenance is evidence- and defect-triggered, not feature-churn driven.

Extension rules:

- new exercise classes must map to explicit movement/outcome roles;
- new optimization variables must demonstrate decision value;
- new integrations must pass privacy, security, replaceability, and lifecycle-value gates;
- no feature may bypass the prescription/safety contract through a secondary UI.

Deprecation:

- mark obsolete protocol/config behavior;
- migrate saved state when necessary;
- remove compatibility code once its supported migration window ends and removal is tested.

Retirement:

- preserve open export;
- document how users recover their data;
- remove service workers/caches cleanly where feasible;
- close any external services, credentials, domains, billing, telemetry, or support obligations introduced later.

## 34. References

Primary/current guidance:

- ACSM 2026 resistance-training position stand: https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/
- ACSM 2026 infographic: https://www.acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf
- Canadian 24-Hour Movement Guidelines for Adults 18-64: https://csepguidelines.ca/wp-content/uploads/2022/05/24HMovementGuidelines-Adults-18-64-ENG.pdf
- WHO physical-activity guidelines: https://www.who.int/publications/i/item/9789240014886
- AHA exercise-related cardiovascular-events statement summary: https://professional.heart.org/en/science-news/exercise-related-acute-cardiovascular-events-and-potential-deleterious-adaptations/top-things-to-know
- W3C WCAG 2.2: https://www.w3.org/TR/wcag/
- OWASP HTML5 Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html

Supporting evidence:

- Superset systematic review/meta-analysis, 2025, PMID 39903375.
- Concurrent-training umbrella review, 2026, PMID 41762427.
- Resistance-training prescription Bayesian network meta-analysis, PMID 37414459.
- Proximity-to-failure meta-regression, 2024, PMID 38970765.
- Low-volume HIIT meta-analysis, 2024, PMID 37939367.
- HIIT cardiorespiratory-fitness umbrella review, 2024, PMID 38760916.
- Full-body versus split routine meta-analysis, 2024, PMID 38595233.

## 35. Draft acceptance

This draft is useful when a fresh competent implementation agent can:

- understand the product objective and non-goals;
- generate the complete default training week;
- adapt it safely to time, readiness, equipment, station availability, and boredom;
- preserve the user's data;
- implement the deterministic prescription engine without depending on chat history;
- test the critical behavior;
- continue the staged migration from the current Flexx Files app.

This draft is not a medical prescription, certification, or final release specification.
