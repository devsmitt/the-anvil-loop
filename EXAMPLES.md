# WORKED DERIVATIONS

**Not options. Do not select one.** These show how the questions in `DEFINE.md` get
answered differently depending on the concept — the primary member changes shape, the
defining feature moves from renderer to simulation, the gauges swap places entirely.

Two are honest low scores. That is a normal outcome and it ships that way on purpose.

Thresholds are on the 0–100 ladder in `DEFINE.md`. 75 is strong for a from-scratch build
with no hand-authored art; 90 means you intend to be mistaken for the reference.

---

## A — Old-growth forest, daily generated, first-person

| | |
|---|---|
| **Defining feature** | the closed canopy. Trunks, ferns, dappled light. Round one has trees or it isn't this game |
| **Primary member** | `grove` — eye height under old growth, looking down a lane of trunks. The frame the game is sold on |
| **Members (Act II)** | grove · understory · canopy · creek · ridge · dusk |
| **Reference** | `artifact` — Hoh rainforest photography, frozen in `reference/` |
| **Target / notch** | 80 / 58 |
| **Gauges** | p50 fps ≥ 60 · solve rate ≥ 0.9 · hydrology coherence |
| **Coupled** | renderer + sky + water + terrain materials |
| **Debt likely logged in Act I** | shallow-water traversal, footing pops, spawn orientation |
| **Human judges** | whether being lost feels earned or arbitrary |
| **Readiness** | 9/10 — −1 the coupled cluster is most of the visual build |

**The trap this one sets.** The generator is the product, so seeds feel like the obvious
axis from round one. They aren't. Sixty-four seeds of a build sitting at 20 measures the
same badness sixty-four times. One grove, to 58, then widen.

## B — Spatial puzzle game, portal mechanics

| | |
|---|---|
| **Defining feature** | a portal you can see through and walk through, correctly |
| **Primary member** | `chamber-01` — the first room, with a portal pair in frame |
| **Members** | 12 chambers × portal configurations, including the awkward views |
| **Reference** | `artifact` — Portal 2 stills for material and light |
| **Target / notch** | 75 / 55 |
| **Gauges** | portal fidelity (pixel disagreement vs an independently-derived truth render) · solver clears by an intended path · zero unintended solutions · p50 ≥ 60 |
| **Coupled** | portal recursion + lighting + momentum transfer. Recursion depth bounds the lighting budget; momentum carry changes what geometry is reachable |
| **Readiness** | 9/10 — −1 aesthetic bar is subjective; the solver gauge carries a lot |

**Note the shape of portal fidelity.** Ground truth comes from a *different code path*
than the through-view, so agreement tests the transform rather than confirming itself. And
it needs a visible aperture at every member — a bar scoring an empty set cannot fail, which
reads as a pass.

## C — Roguelike deckbuilder

| | |
|---|---|
| **Defining feature** | the card economy. A run you can complete, with choices that matter |
| **Primary member** | `combat-mid` — a mid-run encounter with a built deck on screen |
| **Members** | 4 archetypes × 3 run stages |
| **Reference** | `artifact` — a shipped deckbuilder for card readability, plus its published win-rate-by-archetype data |
| **Target / notch** | 80 / 60 (UI legibility) |
| **Gauges** | win rate 35–55% per archetype over 200 runs · no card in >70% of winning decks · no dominant loop found adversarially |
| **Coupled** | card pool + enemy design + economy. **This is the simulation, not the renderer** — here the renderer fans out freely |
| **Readiness** | 9/10 — −1 large content surface |

**The visual bar is nearly irrelevant here and the systems gauges carry the run.** Do not
default to a beauty-shaped fidelity bar because the examples above had one. For this
concept, "fidelity" is UI legibility and the interesting measurement is balance.

## D — Arcade racer

| | |
|---|---|
| **Defining feature** | drift that pays out. Hold it through a corner and you gain |
| **Primary member** | `corner-approach` — the hero corner, mid-drift |
| **Members** | 6 tracks × dry/wet |
| **Reference** | `artifact` — footage from a named shipped racer for camera and speed sensation |
| **Target / notch** | 75 / 55 |
| **Gauges** | clean lap achievable everywhere · **sloppy-vs-clean lap delta ≥ 8%** · p50 ≥ 60 |
| **Coupled** | vehicle physics + camera + speed post. Camera tuning changes perceived handling, which changes what the physics must do |
| **Readiness** | 8/10 — −1 no external bar for feel, −1 the feel proxy is a proxy |

**That delta gauge is the whole trick.** "Does it feel good" is unmeasurable; "is sloppy
driving measurably slower" is not. If the answer is no, the handling model has no depth
whatever it looks like. An independent build of this genre landed on the same proxy and
measured 5.35%.

## E — Rhythm game

| | |
|---|---|
| **Defining feature** | a chart you can play, in sync |
| **Primary member** | `highway-mid` — the note highway at target density |
| **Members** | 20 charts × 3 difficulties |
| **Reference** | `artifact` — a shipped rhythm game for highway readability |
| **Target / notch** | 80 / 60 |
| **Gauges** | A/V sync within 5 ms sample-level · input-to-feedback under one frame · agent accuracy ≥ 95% |
| **Coupled** | audio scheduling + input timing + visual feedback. Cannot be split at all — nearly the whole build |
| **Readiness** | 8/10 — −1 the coupled cluster is most of the build, −1 "does it feel good" stays outside the instrument |

**Timing is exactly measurable**, which makes this genre far more tractable than it looks.
The gauges here are sharper than the fidelity bar.

## F — Short narrative walking simulator

| | |
|---|---|
| **Defining feature** | the place, and moving through it |
| **Primary member** | `opening-vista` |
| **Members** | 5 scenes × 4 camera positions — a fixed authored artifact, weak as a distribution |
| **Reference** | `artifact` — a shipped narrative exploration game |
| **Target / notch** | 70 / 50 |
| **Gauges** | thin. Sequence completes, every trigger fires, nothing unreachable |
| **Human judges** | whether the writing lands. Which is the whole game |
| **Readiness** | **5/10** — −2 nothing meaningfully checkable once operable, −2 no real distribution, −1 subjective |

**Handle this one honestly.** The loop will genuinely improve the environment art and
genuinely verify nothing is broken. It will not tell anyone whether the story works. Say
which parts the instrument covers and which parts they judge — before they spend eleven
hours, not after.

## G — Terminal roguelike, ASCII

| | |
|---|---|
| **Defining feature** | the dungeon and the turn loop |
| **Primary member** | `depth-3` — a mid-depth floor, fully lit |
| **Reference** | `model-prior` — "a shipped commercial roguelike's screen clarity." No images exist worth freezing |
| **Target / notch** | 70 / 50 (screen legibility) |
| **Gauges** | agent completes depth 5 from the rendered screen only · no unwinnable floors in 500 generations · turn resolution under 16 ms |
| **Readiness** | **6/10** — −2 model-prior, −2 legibility is the only visual bar and it is subjective |

**Here is why this one is in the set.** "AAA quality" would be nonsense; the equivalent is
"shipped commercial roguelike clarity," and that is what goes in the prompt. The fidelity
bar is thin and the *mechanical* gauges carry everything — which is fine, and worth saying
out loud, because a 6/10 with strong gauges often produces a better artifact than an 8/10
riding on a subjective bar.
