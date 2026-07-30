# THE TOOL CONTRACTS

Thirteen tools, fixed names. **Six ship and run on a bare clone** (Node standard library
only). **Seven you generate** — they touch your engine, so only their names, CLI shape,
and JSON output are fixed.

Fixed contracts are what let `verify-harness.mjs` check that your harness is real rather
than decorative.

---

## Ships with the repo — do not edit

Editing one of these to make something pass is the single failure this framework exists
to prevent.

### `tools/doctor.mjs`
Preflight and orientation. Runs on a bare clone: checks Node, checks the framework
arrived intact, checks every `tools/*.mjs` parses (a killed run leaves truncated files),
works out the stage, prints the one command to run next.

Detects **INTERRUPTED** — an open work claim means the last session was killed mid-task,
and doctor names the task so you resume there instead of guessing.

Surfaces the warnings that predict a bad run: bars with no command, an empty denial list,
no coupled cluster, a stalled loop, detected drift.

### `tools/validate-spec.mjs`
Checks the spec — the contract the entire run is judged against.

Catches: invalid JSON, unfilled `{{slots}}`, bars with no command, subjective bars with no
external reference, a missing mechanical bar, `coverage.score` that isn't `worst`, an
empty denial list, an unset handicap, a missing Phase 0, and — the subtle one —
**documents that disagree with each other**, like a threshold in `KICKOFF.md` that no
longer matches `anvil.json`.

Run at the end of definition and again inside `verify-harness.mjs`.

### `tools/journal.mjs`
Structured state in `.anvil/state.json`, written only by tools. The blocks between
`<!-- anvil:auto:* -->` markers in `PROGRESS.md` are regenerated from it every run; edits
inside those markers are overwritten.

**Agents write prose. Programs write numbers.**

Also computes what nothing else notices: **stall** — three or more gate runs with no
improvement on any bar. Writes are atomic and backed up, so a kill mid-write cannot take
the loop's memory with it.

`--begin`/`--end` claim and close work. An open claim is what tells the next session a run
was killed and where.

```
node tools/journal.mjs --note="chose WebGL2, 61fps vs 38 at target density"
node tools/journal.mjs --next="run the spike on both backends"
node tools/journal.mjs --amend=HARNESS.md --change="added creek shot" --reason="ford was untested"
```

`--amend` refuses to run without a `--reason`. An unexplained amendment is how a run
drifts.

### `tools/status.mjs`
Renders the run as a self-contained HTML dashboard — bars, gap to threshold, harness
verification state, gate history, drift, and whether the exit condition was ever changed.

### `tools/gate.mjs`
Reads `anvil.json`, runs every bar's command, compares each result to its threshold,
prints the table, exits non-zero if anything fails.

**The authority on whether the run is finished.** Not your judgement.

It also mechanises Invariant 12: it fingerprints the bars on first run and **refuses to
run if a threshold got easier, a bar disappeared, or the coverage axis narrowed**, until
a human runs `--approve-change`. The loop cannot lower its own bar.

Every full run appends itself to `.anvil/state.json` automatically. The loop is not asked
to record results, so it cannot forget to. (`--bar=<id>` runs are diagnostics and are not
recorded.)

### `tools/verify-harness.mjs`
The meta-gate. Proves the seven generated tools satisfy the contracts below before any score
is trusted, and writes `.anvil/harness-verified.json`, which `gate.mjs` requires.

There is no skip flag.

---

## You generate these — names and I/O are fixed

Each must accept `--json` and print **one JSON object as the last line of stdout**. Human
output above it is fine and encouraged.

### `tools/capture.mjs`
Deterministic capture of one named state.

```
node tools/capture.mjs --shot=<name> [--member=<id>] --out=<path>
```

Pins every source of nondeterminism listed in `anvil.json → determinism.pinned`. Fresh
process or fresh page per capture — state leaks forward otherwise (particle age, exposure
adaptation, temporal accumulation) and two identical runs then differ.

### `tools/diff.mjs`
Exact comparison gate.

```
node tools/diff.mjs <a> <b> --json     → { "differingPixels": 0 }
```

Exits non-zero if anything moved. This is what lets a change **prove** it altered nothing
it wasn't supposed to, instead of asserting it. For non-visual products, diff whatever the
artifact is — audio buffers, state dumps, serialized output — and report a count.

### `tools/sweep.mjs`
**The primary quality instrument.** Runs the capture set across the coverage axis.

```
node tools/sweep.mjs --members=<n> [--shots=a,b,c] --json
→ { "members": 64, "results": [...], "worst": <id>, "worstScore": <n> }
```

Must report `worst`. Invariant 4 is not satisfied by a mean, and `verify-harness.mjs`
fails you if `worst` is absent.

### `tools/player.mjs`
**The tool this project lives or dies by.** The critic that plays instead of looking.

```
node tools/player.mjs --once --json
node tools/player.mjs --sweep --json          → { "successRate": 0.0–1.0, ... }
node tools/player.mjs --report-config --json  → { "frameMemory": n, "reactionDelayMs": n }
```

Every episode report must contain:

| field | meaning |
|---|---|
| `succeeded` | boolean |
| `access` | **array of what it actually received.** Asserted against `anvil.json → player.denied` |
| `stalledAt` | where it got stuck, in terms a human would use |
| `belief` | what it thought was true when it went wrong |
| `attribution` | `"build"` \| `"user"` \| `"none"` — was failure the build's fault or an earned mistake? |

`attribution` is the whole value. A success rate tells you the number; attribution tells
you whether to fix the build or leave it alone.

Two things keep it honest. The `access` field: the likely corruption is handing this tool
the game state "for convenience," after which it solves everything forever and the gate is
permanently green. And the handicap: an agent with unlimited recall solves what no human
could — `frameMemory` and `reactionDelayMs` come from `anvil.json` and are verified to be
applied.

`orient.mjs`, `solve.mjs`, `drive.mjs` are not alternatives. They are what `player.mjs` is
called in a write-up. The file is always `player.mjs`.

### `tools/budget.mjs`
Measures the hard limits under realistic conditions — in motion, under load, at real
resolution. Reports distribution tails, never means. A static or best-case measurement
reports a passing number for a failing build.

```
node tools/budget.mjs --json → { "p50fps": 61, "p99fps": 34, "worstFrameMs": 41, "shaderCompilesDuringPlay": 0 }
```

Fields are yours; they must match the `field` paths your bars read in `anvil.json`.

### `tools/anchor.mjs`
**The drift instrument.** Re-scores the frozen artifacts in `anchors/` with the current
critic and compares to their original scores.

```
node tools/anchor.mjs --json                    → { "driftDetected": false, "drift": 0.1, ... }
node tools/anchor.mjs --simulate-drift=<n>      → must report driftDetected: true
```

The `--simulate-drift` flag exists so `verify-harness.mjs` can plant a drift and confirm
you catch it. A drift detector that never fires is worse than none, because it reads as
reassurance.

If frozen artifacts score **higher** than they originally did, the critic softened. That
delta is the drift. Rising scores against an unchanged anchor set is instrument failure,
not progress.

### `tools/critic.mjs`
Runs the subjective bars — blind comparison against the external reference.

```
node tools/critic.mjs --bar=<id> --json → { "worst": 7.2, "mean": 8.1, "worstMember": "seed-41", "findings": [...] }
```

Spawns a **fresh agent per review** that receives the goal, the rules, and the artifact —
never the builder's reasoning, changelog, or previous scores. Reports the worst member.
Findings carry a severity so the lead can take the single highest one.

---

## Build order

Nothing downstream is trustworthy until the tool above it works.

```
capture → diff → verify determinism → sweep → player → budget → anchor → critic
```

Run `verify-harness.mjs` at the end of Phase 0 and any time a tool changes. `gate.mjs`
refuses to run until it has passed.

## How the system holds itself together

Each of these catches a specific way a long run goes wrong. None of them depends on an
agent choosing to be diligent.

| failure | what catches it |
|---|---|
| Spec is incoherent from the start | `validate-spec.mjs` at define time |
| Documents drift apart from each other | `validate-spec.mjs` cross-check |
| Scores are noise because captures aren't reproducible | `verify-harness.mjs` check 2 |
| The mechanical critic can secretly see everything | `player.access` asserted against the denial list |
| The critic is too capable to be a fair proxy | handicap, verified at runtime |
| The drift detector is decorative | planted drift in `verify-harness.mjs` |
| Critics soften over time | `anchor.mjs` + the drift table |
| Results go unrecorded | `gate.mjs` appends automatically |
| `PROGRESS.md` decays into adjectives | `journal.mjs` owns the numeric blocks |
| The loop circles while reporting progress | stall detection in `journal.mjs` |
| The loop lowers its own bar | fingerprint lock in `gate.mjs` |
| A fresh session doesn't know where to resume | `--next` at close-out, surfaced by `doctor.mjs` |
| A run is killed mid-task and work is lost or repeated | `--begin`/`--end` claims + INTERRUPTED in `doctor.mjs` |
| A kill corrupts the state file | atomic write + `.bak` recovery in `journal.mjs` |

## The two rules about the shipped files

1. **Do not edit any shipped program — `doctor`, `validate-spec`, `verify-harness`, `gate`,
   `journal`, `status` — to make something pass.** That is the single action this entire framework exists to prevent. If
   a gate is wrong, change `anvil.json` and get human sign-off.
2. **Do not rename the generated tools or change their output shape.** The contracts are
   what make the harness checkable. A project with `orient.mjs` instead of `player.mjs` is
   a project whose harness nothing can verify.
