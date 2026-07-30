# WORKED DERIVATIONS

**Not options. Do not select one.** These show how the derivation questions in `DEFINE.md`
get answered differently depending on the concept — the coverage axis changes shape, the
mechanical critic becomes a solver or a timing analyzer, the coupled cluster moves from
renderer to simulation. Reason from the concept in front of you.

Readiness scores vary. One of these is an honest 6, and it ships that way on purpose.

---

## A — Spatial puzzle game, portal mechanics

| | |
|---|---|
| **Bar** | Portal 2 stills for lighting and material; speedrun VOD for movement feel |
| **Coverage** | 12 authored chambers × every intended solution path, plus known unintended-solution attempts. Authored game — the distribution is chambers and approaches, not seeds |
| **Player** | Frames and mouse/key input only, no scene graph, no console. Success: chamber cleared. Also runs adversarially, attempting to break sequence and clip geometry — in this genre an *unintended* solution is a defect and no screenshot shows one |
| **Determinism** | Fixed physics timestep, scripted input tape replacing live input, seeded particles, fresh page per shot |
| **Coupled** | Recursive portal rendering + lighting + momentum transfer through a portal. Recursion depth bounds the lighting budget; momentum carry changes what geometry is reachable |
| **Owners** | `chambers` (upstream), `portals`, `physics`, `render`, `player`, `ui`, `audio` |
| **Exit** | beauty ≥ 8 blind A/B across 12 chambers · solver clears 12/12 by an intended path · zero unintended solutions in 200 adversarial attempts · p50 ≥ 60fps, p99 ≥ 30 · zero mid-play shader compiles |
| **Readiness** | 9/10 — −1 aesthetic bar is subjective; the solver gate carries the run |

## B — Arcade racer

| | |
|---|---|
| **Bar** | A named shipped arcade racer for camera, speed sensation, drift; track photography for environment |
| **Coverage** | 6 tracks × 3 vehicle classes × dry/wet = 36. Gate all, score the worst |
| **Player** | Fixed input tape per track. Reports lap time distribution, wall contacts, off-track excursions, whether a clean lap is achievable |
| **Feel proxy** | Input-to-visible-response time, drift angle sustained through corner arcs, and clean-vs-sloppy lap delta. If sloppy driving is not measurably slower, the handling model has no depth whatever it looks like |
| **Determinism** | Fixed physics timestep, input tape, seeded particles and debris, no wall clock in vehicle sim |
| **Coupled** | Vehicle physics + camera + speed-sensation post. Camera tuning changes perceived handling, which changes what the physics must do. Track art and audio fan out |
| **Exit** | beauty ≥ 8 across all 36 · clean lap achievable on every combination · sloppy-vs-clean delta ≥ 8% per track · p50 ≥ 60fps · zero physics instabilities across 500 laps |
| **Readiness** | 8/10 — −1 no external bar for feel, −1 the proxy is a proxy |

## C — Roguelike deckbuilder

| | |
|---|---|
| **Bar** | A shipped deckbuilder for UI clarity and card readability — and its published win-rate-by-archetype data as the reference for the systems bar |
| **Coverage** | 200 generated runs × 4 archetypes. Has a seed, but the axis is **runs** — the failure mode is a degenerate strategy, not an ugly frame |
| **Player** | Completes full runs from the rendered UI only, no direct card or intent data. Reports win rate per archetype, turn counts, picks and reasons, where runs became unwinnable. A second adversarial agent hunts for a dominant loop; finding one that wins 90% fails the build regardless of appearance |
| **Determinism** | Seeded shuffle and generation, no wall clock, fixed animation budget during capture |
| **Coupled** | Card pool + enemy design + economy. Adding a card changes what every encounter is worth. **This is the simulation, not the renderer** — here the renderer is the easy part and fans out |
| **Exit** | win rate 35–55% per archetype across 200 runs · no card in >70% of winning decks · no dominant loop in 500 adversarial runs · UI legibility ≥ 8 blind A/B · every card readable at target resolution |
| **Readiness** | 9/10 — −1 large content surface. Note the visual bar is nearly irrelevant here. Do not default to beauty gates because earlier examples had them |

## D — Daily generated first-person navigation game

| | |
|---|---|
| **Bar** | Real photography of the specific biome, blind A/B: which is the photograph? |
| **Coverage** | 64 daily seeds. The product is a *generator* — one beautiful world proves nothing; a generator making one gorgeous forest and 63 green mazes reviews perfectly on whichever seed you looked at |
| **Player** | Dropped at the trailhead with frames, a compass, a clock. No coordinates, no world data. Success: reached camp before dark. Reports where it backtracked and what it believed when it went wrong — and whether the world was illegible or the agent misread a legible world |
| **Determinism** | Lockstep rendering with the animation loop off during capture, seeded everything, in-world clock only, fresh page per shot |
| **Coupled** | Renderer + sky + water + terrain materials |
| **Exit** | beauty ≥ 8 blind A/B · ≥ 90% of seeds solved · p50 ≥ 60fps, p99 ≥ 30, zero mid-play shader compiles · no unexplained hydrology or trail placement |
| **Readiness** | 10/10 — two independent objective bars, strong coverage axis, and a mechanical critic measuring what the game is actually about |

## E — Rhythm game

| | |
|---|---|
| **Bar** | A shipped rhythm game for note-highway readability and hit feedback |
| **Coverage** | 20 charts × 3 difficulties. Worst chart scores |
| **Player** | Plays from rendered frames with simulated input latency, reporting achievable accuracy per chart |
| **Real instrument** | Offline timing audit: audio-to-visual sync at sample level across the full chart, input-to-feedback latency end to end. Both exactly measurable, which makes this genre far more tractable than it first appears |
| **Determinism** | Sample-accurate audio scheduling, fixed frame budget, no wall clock |
| **Coupled** | Audio scheduling + input timing + visual feedback cannot be split at all. This is nearly the whole game — treat it as one sequential phase |
| **Exit** | A/V sync within 5ms on every chart · input-to-feedback under one frame · agent ≥ 95% accuracy at target difficulty · readability ≥ 8 blind A/B · zero audio dropouts across 100 plays |
| **Readiness** | 8/10 — −1 the coupled cluster is most of the build, −1 "does it feel good" stays outside the instrument |

## F — Short narrative walking simulator

| | |
|---|---|
| **Bar** | A shipped narrative exploration game for environment art and pacing |
| **Coverage** | Weak. 5 scenes × 4 camera positions. No meaningful distribution — a fixed authored artifact |
| **Player** | Thin. Verifies the sequence completes, every trigger fires, nothing is reachable out of order or unreachable. Cannot evaluate whether the story lands |
| **Coupled** | Render + lighting + audio atmosphere |
| **Exit** | beauty ≥ 8 across 20 shots · zero soft-locks in 100 traversals · zero missed triggers · budget met |
| **Readiness** | **5/10** — −3 no mechanical success condition beyond "it doesn't break", −2 no coverage axis |

**F is the case to handle honestly.** A 5/10 is a real answer, not a failure to score it. The loop will genuinely improve the environment art
and genuinely verify nothing is broken. It will not tell anyone whether the writing is
good. Say which parts of the concept the instrument covers and which parts the human
judges, before they spend eleven hours.
