# INSTRUMENT CONTRACTS

Six programs ship and run on a bare clone. Eight you generate — and **you build each one
when its reading becomes useful, never in a batch up front.**

A previous version of this framework required seven instruments before the first frame
existed. Six of them measured things that did not exist yet, and all six needed rewriting
once they did. That cost more hours than any other single decision here.

---

## Ships with the repo

Never edit these to make something pass. That is the one action this repo exists to
prevent.

### `tools/doctor.mjs`
Orientation. Runs on a bare clone: environment, framework integrity, truncated files (a
killed run leaves them), the stage, and **which instrument is worth building now**.

Detects **INTERRUPTED** — an open claim means the last session died mid-task, and doctor
names the task so you resume there instead of guessing. When the spec declares
`build.command`, doctor runs it on an interrupted resume and refuses to hand you a next
action until the product builds: a process killed mid-edit leaves source that no longer
parses, and an hour spent measuring a broken build looks exactly like an hour of work.

Also keeps **the round clock**. A round ends when a number lands on the board; the clock
measures how long it has been since one did. Past `round.budgetMinutes` it warns. Past 1.5×
it reports stage **OVERDUE** and names exactly one next action — produce a number — because
at that point there is only one useful thing to do. Nothing is blocked; the clock exists
because two runs burned six hours and 2.4M tokens producing zero scores and no instrument
here could see it happening (Invariant 16).

### `tools/board.mjs`
The readout, and the heart of the loop.

```
node tools/board.mjs                          print the readout
node tools/board.mjs --record --saw="..."     measure, record, check the ratchet
node tools/board.mjs --calibrate              set the noise floor
```

Runs the fidelity measure on every active member and every gauge, records the round, and
names the **target** — the member to work on next, with a verdict:

| verdict | meaning | response |
|---|---|---|
| `CLIMB` | worst member, moving | take the highest-severity finding |
| `STUCK` | no improvement in 3+ rounds | change the approach, not the effort |
| `UNEVEN` | 20+ point spread | a technique that worked elsewhere hasn't been applied here |
| `CEILING` | all members close together and all short | the build needs a technique it doesn't have |

**`--saw` is required and it is not ceremony.** One line describing what the frame actually
shows. Every expensive failure in this framework's history was plain in one image and
invisible in every number.

**`--calibrate` scores the same unchanged build twice** and sets the ratchet noise floor
from the observed spread. This is the honest reason to spend a round on determinism: a
reproducible capture narrows the floor, which makes the ratchet sensitive enough to catch
small regressions. Not a moral rule — a sensitivity dial.

The ratchet is the only thing in this repo that blocks.

### `tools/instruments.mjs`
Trust, not permission. Reports how much each built instrument can be believed and **does
not withhold scores** — an unproven reading still counts, it just carries a label.

Weighted toward the failure that has actually cost time: instruments reporting confidently
while measuring nothing. It checks that the critic cites a calibrated band and a build
fingerprint, that `perf` is GPU-timed and in motion, that the player is genuinely denied
and handicapped, and — the one that cost four iterations elsewhere — that the player and
critic **could see anything at all**.

`--falsify` plants known errors and confirms the detectors fire.

### `tools/journal.mjs`
Memory, claims, and the debt ledger.

```
node tools/journal.mjs --begin="<task>"   claim work BEFORE starting it
node tools/journal.mjs --end
node tools/journal.mjs --next="<the one next action>"
node tools/journal.mjs --debt="<defect>" --evidence="<how you know>"
```

`--debt` refuses without `--evidence`: a defect you cannot reproduce when you come back to
pay it was the same as forgetting it. Writes are atomic with a backup, so a kill mid-write
cannot take the loop's memory.

### `tools/status.mjs`
The dashboard. Scores, sparklines, the ratchet, debt — and **the frames, next to the
reference**. That last part is the point. A human should never have to ask what it looks
like.

### `tools/validate-spec.mjs`
Checks the spec: unfilled slots, an uncalibrated scale, a missing defining feature, no
primary member, a reference that isn't frozen on disk, a gauge marked blocking, a prompt
with no way to repeat, documents that disagree with each other.

---

## You generate these — names and I/O are fixed

Fixed contracts are what let `instruments.mjs` tell a real harness from a decorative one.

Each accepts `--json` and prints **one JSON object as the last line of stdout**. Human
output above it is fine.

### Round one — you cannot climb without these

#### `tools/capture.mjs`
```
node tools/capture.mjs --member=<id> --out=<path> [--full] [--json]
→ { "ms": 11840, "width": 960, "height": 540,
    "renderer": "ANGLE (SwiftShader Device)", "softwareRasterizer": true }
```
Renders one member. Pins whatever sources of nondeterminism you have pinned so far — total
determinism is not required yet, it is a dial you tighten when you want a sharper ratchet.

**Four requirements, and every one of them is a bill someone already paid:**

- **It serializes.** Take a lock; if another capture holds it, wait. Never render two at
  once. On a software rasterizer each capture saturates every core, so concurrent captures
  are *slower* than the same captures run back to back — and the resulting timings blame
  resolution for what is contention. One run lost three hours to this, and the number it
  was reasoning from (11 minutes a frame) was an artifact of the measurement.
- **It defaults to a working resolution**, something like 960×540. `--full` is for the
  frames you keep — the hero shot, the final scored frame. A critic does not review more
  accurately at 1080p, and full-res iteration multiplies the only cost that matters.
- **It has a hard timeout and fails loudly.** A capture that hangs looks exactly like a
  capture that is working, and the loop will wait on it indefinitely.
- **It reports the renderer.** `softwareRasterizer: true` is the flag that tells `perf.mjs`
  its framerate is fiction and tells the lead why every frame is expensive.

`ms` is not decoration. Invariant 14: an instrument you cannot afford changes the loop's
behaviour whether or not anyone decided it should. Time one capture, serially, alone,
before building anything on top of it.

#### `tools/critic.mjs`
Scores one member against the frozen reference, blind.

```
node tools/critic.mjs --member=<id> --json
→ { "score": 64, "band": "60 — good indie build, and here is why not 76",
    "findings": [ { "severity": 1, "where": "...", "what": "...", "why": "...", "owner": "..." } ],
    "buildFingerprint": "<hash of src/ at capture time>",
    "frameStats": { "meanLuminance": 0.31, "dominantSurfaceFraction": 0.42 } }
```

Four fields carry weight beyond the score:

- **`band`** — which calibrated band, and why not the one above. A number with no band is
  an opinion wearing a score's clothes, and it drifts upward every round.
- **`findings`** — a score with no attributable cause cannot be acted on. Severity-ranked;
  the lead takes the highest one.
- **`buildFingerprint`** — a hash of `src/` at capture time. In one run a full sweep was
  graded from frames belonging to a build that no longer existed; reviewers described a
  scene that had been deleted hours earlier. Nothing caught it but a human reading the
  descriptions.
- **`frameStats`** — so `instruments.mjs` can tell whether the reviewer could see anything.
  A near-black frame or one flat surface filling the view produces a confident score about
  nothing.

**Transport:** spawning a nested CLI to read an image fails from inside an agent session
(`tool_use ids must be unique`, then hangs). Two paths that work:

1. **`--prepare` / collect.** `critic.mjs --prepare` writes one self-contained review
   request per member; the lead spawns a fresh sub-agent per request — which runs on the
   human's subscription — and writes verdicts back; `--json` reads them. Bind the verdicts
   to a fingerprint of the frames reviewed so stale ones cannot be reported.
2. **Inline base64 over `--input-format stream-json`.** No Read tool, one turn, no
   filesystem access for the reviewer, and **no filename in the prompt** — a path like
   `shots/seed_20260805_s012.png` leaks the seed and index into a context that works hard
   to stay free of world truth.

Never pass the builder's reasoning, changelog, previous scores, or round number.

### Later — each when its reading becomes useful

#### `tools/diff.mjs` — when the ratchet needs to be sharper
```
node tools/diff.mjs <a> <b> --json  → { "differingPixels": 0 }
```
Exact comparison. Also what lets a change prove it altered nothing it wasn't supposed to.
For non-visual products, diff whatever the artifact is and report a count.

#### `tools/sweep.mjs` — at the Act II notch
```
node tools/sweep.mjs --members=<n> --json
→ { "members": 12, "results": [...], "worst": "<id>", "duplicateMembers": 0 }
```
Must report `worst` — the score is the worst member, never the mean. Must report
`duplicateMembers`: in one run four of eight members framed the same road, which is a
five-member axis wearing an eight-member label, silently narrowing the coverage the sweep
exists to provide.

#### `tools/perf.mjs` — as you approach the budget
```
node tools/perf.mjs --json
→ { "p50fps": 61, "p99fps": 34, "gpuTimed": true, "inMotion": true, "runs": 2,
    "softwareRasterizer": false }
```
Four flags, each standing for a measured disaster:

- **`gpuTimed`** — CPU submission time is not frame time. One run reported 1000fps for a
  174fps scene; another read 0.9ms where the GPU took 16.1ms. Both flattering, both silent,
  both nearly decided a renderer backwards.
- **`inMotion`** — a static camera reports a passing number for a build that stutters.
- **`runs ≥ 2`, fresh processes** — tail latency swung 2.5× between identical runs on the
  same machine.
- **`softwareRasterizer`** — headless environments routinely fall back to SwiftShader or
  llvmpipe, where the CPU draws every pixel. **When this is true, do not report a
  framerate.** Set `p50fps: null`, set the flag, and say so. A number from a software
  rasterizer bears no relationship to the machine a human will play on, and it is worse
  than no number because it looks like one. Tell the human the framerate gauge is dark
  until the run has a real GPU — that is a decision they own, not a defect you work around.

#### `tools/player.mjs` — when the artifact is operable
An **agent**, not a heuristic. One run spent four iterations hand-tuning a pixel navigator
that plateaued, before concluding what the contract implies: `belief` requires reasoning,
and a heuristic cannot produce one.

```
node tools/player.mjs --once --json
node tools/player.mjs --sweep --json          → { "successRate": 0.0–1.0, ... }
node tools/player.mjs --report-config --json  → { "frameMemory": n, "reactionDelayMs": n }
```

| field | meaning |
|---|---|
| `succeeded` | boolean |
| `access` | **what it actually received.** Asserted against `player.denied` |
| `stalledAt` | where it got stuck, in terms a human would use |
| `belief` | what it thought was true when it went wrong |
| `attribution` | `"build"` \| `"user"` \| `"none"` |
| `frameStats` | including `goalPixels` — was the goal ever visible? |

`attribution` is the whole value: a success rate gives you a number, attribution tells you
whether to fix the build or leave it alone. And `frameStats` exists because a properly
denied, properly handicapped critic **staring at a wall** returns a confident `0.0` that
is indistinguishable from a real failure.

Same transport as the critic.

#### `tools/solvable.mjs` — when the player starts failing
A **privileged** probe: flood fill, solver, reachability — whatever answers *is the success
condition achievable at all?* with full access to internal state.

The player is denied world data on purpose, which means it **cannot tell "impossible" from
"I failed."** In one run, four iterations went into tuning a navigator against a level
where two entire zones were unreachable. A twenty-line flood fill answered it immediately.

#### `tools/anchor.mjs` — once scores have been climbing a while
```
node tools/anchor.mjs --json                 → { "driftDetected": false, "drift": 0.1 }
node tools/anchor.mjs --simulate-drift=<n>   → must report driftDetected: true
```
Re-scores frozen artifacts with the current critic. If they score **higher** than they
originally did, the critic softened and the recent trend is not real. `--simulate-drift`
exists so `instruments.mjs --falsify` can confirm it fires — a drift detector that never
fires reads as reassurance.

---

## What catches what

Each of these traces to a specific failure that cost real hours.

| failure | caught by |
|---|---|
| Rounds pass, artifact unchanged | `roundsSinceImprovement` on the board |
| Something that worked is now worse | the ratchet |
| Scores are noise because capture jitters | `--calibrate`, then `diff.mjs` |
| Frames graded from a build that no longer exists | `buildFingerprint` |
| The critic or player cannot see anything | `frameStats` |
| The playing critic can secretly peek | `access` asserted against the denial list |
| "Impossible" mistaken for "the navigator is weak" | `solvable.mjs` |
| Framerate off by 18× in the flattering direction | `gpuTimed`, `inMotion`, `runs` |
| The coverage axis is narrower than it claims | `duplicateMembers` |
| The critic softens over time | `anchor.mjs` + `--falsify` |
| A round is recorded without anyone looking | `--saw` |
| A run killed mid-task loses or repeats work | `--begin` / `--end` |
| A parallel fan-out dying with no resume anchor | claim before you launch, not before you type |
| Correctness work derailing the climb | the debt ledger |
| Round one tuning by hand for hours instead of scoring | Invariant 13; doctor's round clock |
| A round wrapped in a phase pipeline, so nothing ever scores | the round clock, on `doctor` and `board` |
| An hour spent building an instrument for an unscored scene | Invariant 16 — crude instruments first |
| Captures thrashing each other and blaming resolution | the capture lock, and `ms` in the capture contract |
| A framerate reported off a software rasterizer | `softwareRasterizer` |
| An hour spent benchmarking a build that no longer parses | `build.command`, run by doctor after an interruption |
