# METHOD — the twelve invariants

Binding on every project built in this repo, regardless of genre or engine.

**Open-ended about what to build. Prescriptive about how it is judged.** You decide the
design, the architecture, the stack, the decomposition. You do not decide the verification
— left free there, an agent skips the expensive parts, because skipping them makes
everything easier and nothing visibly breaks until it is far too late.

Each invariant below is fixed. Your implementation of it is derived per project.

---

### 1 — The bar is external and inspectable

Judge against something that already exists and a human can look at: photographs, a
shipped product, recorded footage, a benchmark.

*Without it:* the critic scores against its own notion of good, which is a description of
training data. The build converges to generic.

**Derive:** what real thing does output get compared against, blind?

### 2 — The builder never grades itself

Critics get the goal, the rules, and the artifact. Never the builder's reasoning, intent,
changelog, or previous scores. Different agent, fresh context, every time.

*Without it:* the critic grades the effort, and a well-argued commit passes on the
strength of the argument.

### 3 — Reproducibility before construction

Before any product code exists, prove two consecutive capture runs are bit-identical.

Minimum: no wall-clock time in behaviour or visuals, no unseeded randomness, fixed
simulation step, fixed frame budget, fresh process per capture (state leaks forward
otherwise), explicit ready signal.

*Without it:* every later score is noise. 7.2 against 6.8 means nothing if the same build
produces both. You will not find out for forty rounds.

**Derive:** what specifically makes two runs identical?

### 4 — Review the distribution, not the instance

Whatever varies — levels, seeds, routes, loadouts, resolutions — gates run across a set,
and you judge the **worst** member. Never the average.

*Without it:* one good instance reviews perfectly, and it is the one you keep looking at.

**Derive:** what is the coverage axis, and how many members per gate? Seeds are one
answer, not the answer.

### 5 — At least one critic plays

Looking is not enough for anything interactive. One critic operates the thing with exactly
the affordances a real user has — rendered frames, real input, no internal state, no
coordinates, no debug console.

It reports success, where it stalled, what it believed when it went wrong, and whether
failure was **earned by the user or caused by the build**.

*Without it:* you optimize a screenshot. The result is beautiful and unplayable and
nothing in the loop can tell you.

**Derive:** what does playing mean here, and what is the success predicate?

### 6 — Ownership is absolute

One owner per directory. Never edit another's. Cross-subsystem access happens at runtime
through a declared interface, never by importing internals.

*Without it:* parallel agents clobber each other and all of them report success.

### 7 — Fan out on reviews, serialize on coupled fixes

Critics run in parallel and must not see each other's output. Then take the single
highest-severity finding, give it to the one directory owner, let it work alone, re-gate.

Some subsystems are one system. In 3D rendering: tonemapping, exposure, atmosphere,
indirect light, material response. Parallel agents there each break the others'
assumptions while all report success. Identify the cluster at define time.

Genuinely disjoint work fans out freely.

### 8 — No report without an artifact

A contact sheet, a score, a trace, a player log is a result. "Improved the lighting" is
not. Reject reports that carry none, including your own.

### 9 — The exit condition is numeric and simultaneous

Every bar has a number and a command that produces it. The loop stops when all pass at
once across the coverage axis — not when most are green, not when gains get small.

*Without it:* stopping becomes a mood.

### 10 — A critic that stops finding faults is broken

Critics drift toward the builder. Scores climb while artifacts stand still.

**Mechanism — the anchor set:** freeze early artifacts, re-score them whenever a critic is
replaced. If historical artifacts score *higher*, the critic softened and that delta is the
drift. Replace it, re-score the round.

Inverse case: a mechanical critic that suddenly succeeds at everything may be too capable
to be a fair proxy. Hobble it; do not celebrate.

### 11 — State lives on disk

`PROGRESS.md` and `.anvil/state.json` are the memory. Read first, write before finishing,
hard numbers only.

The kickoff prompt re-fires unchanged. It cannot say "start at phase 0" — it reads state,
works out where it is, acts. Iteration 1 and iteration 40 run identical text and do
different work.

Claim work before starting it and close the claim after. An open claim is how the next
session knows a run was killed mid-task and where.

*Without it:* a session dies and the next re-litigates settled decisions, or silently
restarts finished work.

### 12 — Sharpen methods, never soften exit numbers

Amend architecture, harness, and phase plan as you learn; log every amendment with a
reason. Weakening an exit number, removing a gate, or narrowing the coverage axis requires
human sign-off — stop and ask. `gate.mjs` enforces this mechanically.

A system that can lower its own bar will, with an excellent justification ready.

---

## Not prescribed here

Do not go looking for these. They are yours to decide:

- **The design** — what it is, what it feels like, what makes it interesting.
- **The architecture** — subsystems, ownership, boundaries, data flow.
- **The stack** — engine, language, dependencies. Decide from measurement where possible;
  record which decisions were measured and which were judged.
- **The phases** — only two constraints: Phase 0 is harness and reproducibility with no
  product code, and coupled work is serialized.
- **The tool implementations** — names and I/O are fixed in `TOOLS.md`; how they work is
  derived from the concept.
- **The numbers** — every threshold comes from the concept and the human.

Examples in `EXAMPLES.md` demonstrate how derivation reasons. They are not options. If you
find yourself matching a project onto one of them, stop and reason from the concept.
