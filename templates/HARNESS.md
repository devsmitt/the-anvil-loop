# {{PROJECT}} — verification harness and loop

**Build this before you build the product.** The harness is not tooling around the
project; it is the mechanism the project is built by. An unverified loop is an agent
convincing itself, and it produces confident slop.

Everything in `tools/` is owned by the lead. Subsystem agents *run* these tools. They do
not edit them.

Seven tools are generated here. Their names and JSON output are fixed by `TOOLS.md` —
`verify-harness.mjs` checks them by name and cannot verify a harness that renames them.

## Why this harness is shaped the way it is

{{The one or two properties of THIS concept that break the usual screenshot-and-eyeball
approach. Derived from the coverage axis and the mechanical critic. If you cannot name
any, the harness is probably underspecified — go back and look harder at how this thing
fails.}}

## Tools

Build in this order. Nothing downstream is trustworthy until the tool above it works.

### `tools/capture.mjs`
{{Deterministic capture of a single named state. What it waits for, what it pins, what it
writes. Name every source of nondeterminism it controls.}}

```
{{invocation}}
```

### `tools/diff.mjs`
{{Exact comparison gate. Exits non-zero if anything moved. This is what lets a change
prove it altered nothing it wasn't supposed to, instead of asserting it.}}

### `tools/sweep.mjs`
**The primary quality instrument.** {{Runs the capture set across the coverage axis and
emits a reviewable summary plus per-member statistics.}}

```
{{invocation}}
```

Nothing is "done" on one member of the axis. Every review reads a full sweep.

### `tools/budget.mjs`
{{Measures the hard budget under realistic conditions, not idealized ones. State the
distribution reported — tails, not means. A static or best-case measurement will report a
passing number for a failing build.}}

### `tools/player.mjs` — the tool this project lives or dies by
{{The agent that operates the product with only the affordances a real user gets. State
exactly what it receives and, more importantly, what it is denied.}}

It reports:

- {{Did it succeed?}}
- {{Where did it get stuck, and what did it believe when it went wrong?}}
- {{At each failure: was the build at fault, or did the user make an earned mistake?}}

{{That last distinction is the value. It finds the specific point where the build failed
the user, which is the thing a human playtester takes an hour to articulate.}}

### `tools/anchor.mjs`
{{How the frozen set is re-scored and what counts as drift for this concept.}}

### `tools/critic.mjs`
{{How the subjective bars are scored — what the blind comparison looks like here, and what
a finding must contain to be actionable.}}

## The critics

{{N}} independent reviewers. They do not talk to each other. Each has one job and is
instructed to be harsh. None of them sees the builder's reasoning.

| critic | reads | asks |
|---|---|---|
| {{name}} | {{artifact}} | {{the question, phrased as a blind comparison where possible}} |

**{{Which bars must both pass, and what a build that passes one and fails another is
called.}}**

## The anchor set

{{Which artifacts get frozen for drift detection, how many, and when they are re-scored.}}

Every time a critic is replaced, re-score the anchor set before scoring current work. If
frozen artifacts score higher than they did originally, the critic softened — that delta
is the drift, and the current round's scores must be adjusted or re-run. Rising scores
against an unchanged anchor set is instrument failure, not progress.

## The loop

### Phase 0 — Harness and {{spike}}. No product code.
Build {{the tools}}. Then {{the spike that settles the provisional stack decision by
measurement}}.

**Exit:** {{Reproducibility proven — two consecutive runs bit-identical. Provisional
decisions settled on measured evidence, with the numbers recorded.}}

### Phase 1 — {{name}}
{{Scope. What is deliberately ugly or absent at this stage.}}

**Exit:** {{objective, checkable}}

### Phase {{n}} — {{name}}{{ — SEQUENTIAL, ONE OWNER if coupled}}
{{Scope. If this is the coupled cluster, say so and say why parallel work fails here.}}

**Exit:** {{objective, checkable}}

### Phase {{n}} — {{name}} — parallel is safe here
{{Which subsystems, and why they are genuinely independent: disjoint directories, no
shared model.}}

**Exit:** {{objective, checkable}}

### Phase {{n}} — The loop proper

```
until ({{full exit condition}}) across {{the coverage axis}}:
    run {{coverage tool}}
    run all critics in parallel
    take the single highest-severity finding
    assign it to the one agent that owns that directory
    fix
    re-gate with {{diff tool}} on everything that was NOT supposed to change
```

**One finding at a time. One owner at a time.** The temptation is to fan out on every
finding simultaneously. That is the failure mode. Fan out on *reviews*; serialize on
*fixes*.

## Rules for the loop

1. **Never accept a report without an artifact.** {{Name what counts as one here.}}
2. **Every fix carries a diff on what it did not touch.** Regression is the default
   outcome of unverified work.
3. **A critic that keeps passing is broken.** Re-score the anchor set before believing a
   rising trend.
4. **Do not average across the coverage axis. Look at the worst member.**
5. **{{When bars conflict, which wins.}}**
6. **The loop may sharpen its methods and may never soften its exit numbers.** Log
   amendments in `PROGRESS.md`. Weakening a gate requires human sign-off — stop and ask.
