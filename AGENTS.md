# THE ANVIL LOOP — agent instructions

Framework version 1.1.0

You have been opened in a repo containing this file. Read it fully before acting, then
read `METHOD.md`. Both are binding.

This works in any agent with a shell, a filesystem, and Node ≥ 18. The one
environment-specific thing is how the kickoff prompt repeats itself — Claude Code has a
`/loop` skill; everything else is told to iterate on its own. That choice is made once,
during definition.

## First action, always

```
node tools/doctor.mjs
```

It reports the stage and the next action. It works on a bare clone with nothing
installed. Then read `PROGRESS.md`, state block first.

There are three situations you can be in. Doctor tells you which.

---

# SITUATION 1 — UNDEFINED

No `anvil.json`. Nothing has been built. **Talk to the human.**

Your job here is to turn their concept into a measurable spec, and then hand them a
prompt they send back to you to start the run. Follow `DEFINE.md` in full. In short:

1. Read `METHOD.md`, `TOOLS.md`, `EXAMPLES.md`.
2. Have a short design conversation — a handful of exchanges. Propose concrete answers
   they can react to rather than open questions they must fill. Develop the idea before
   you spec it.
3. Push on the two things they will not volunteer, because the run is worthless without
   them: **what real existing thing is this compared against**, and **what can be checked
   mechanically with no human in the loop**.
4. Show them the exit condition and the readiness score. Get explicit approval.
5. **Ask which agent they are running in, and whether to enable ultracode if it is Claude
   Code.** This decides how `KICKOFF.md` is composed — see `templates/KICKOFF.md`. A
   prompt with no way to repeat itself does one increment and stops.
6. Write `anvil.json`, `ARCHITECTURE.md`, `HARNESS.md`, `KICKOFF.md`, `PROGRESS.md` from
   `templates/`.
7. `node tools/validate-spec.mjs` — fix every ERROR.
8. `node tools/journal.mjs --phase=0 --next="build the Phase 0 harness tools per TOOLS.md"`

**Then hand off.** Print the prompt block from `KICKOFF.md` to the human, in a copyable
form, and tell them plainly: *send this back to me and the loop starts; it will run for a
long time; you can stop any time and say "continue" to resume.*

Also tell them, briefly:

- The readiness score and what it means for what they will get.
- Which bars a program judges, and which parts only they can judge.
- That the loop will stop and ask them if an exit number turns out to be wrong.

**Do not begin building.** Stop after the handoff. The human sends the prompt.

---

# SITUATION 2 — THE HUMAN SENT THE KICKOFF PROMPT

Run it. It is re-entrant — it reads state, works out where it is, does the next increment,
records the result.

**Keep going.** If the prompt carries a `/loop` prefix, your harness re-fires it for you.
If it does not, the prompt's LOOPING section applies: finish closing out and immediately
begin the next iteration without waiting for the human to reply. One increment is not the
job — converging the gate is. Stop only when the gate passes, when you need a decision only
the human can make, or when you run out of room (and then leave the state clean).

### Every iteration

```
1. node tools/doctor.mjs                       where am I
2. read PROGRESS.md                            state block first
3. node tools/journal.mjs --begin="<task>"     claim the work BEFORE starting it
4. ...do the next increment...
5. close out (below)
```

Step 3 is not optional. An open claim is the only thing that lets a killed session know
what it was doing.

### Closing out an iteration

**During Phase 0, skip `gate.mjs`.** It exits 4 with `harness not verified` by design —
there is nothing trustworthy to measure yet. That is not a fault to fix. Everything else
in the close-out still runs.

```
node tools/gate.mjs            # Phase 1 onward only
node tools/journal.mjs --note="<what ran, what it returned — numbers>"
node tools/journal.mjs --next="<the one next action>"
node tools/journal.mjs --end
node tools/status.mjs
```

Add `--amend=FILE --change="..." --reason="..."` if you changed a contract document.

Act on the journal's alerts. **STALLED** means the current approach is wrong — change the
decomposition, the owner, or the critic, never the threshold. **CRITIC DRIFT** means the
recent trend is not real — replace the critic and re-score before believing anything.

### The rules

1. Read `PROGRESS.md` before acting. You are usually not starting fresh. Never restart a
   finished phase or re-derive a recorded decision.
2. No product code until `node tools/verify-harness.mjs` passes. Before captures are
   proven reproducible, every score is noise and you will not find out for forty rounds.
3. `tools/gate.mjs` decides whether you are done. You do not. Never report convergence
   from your own reading of the numbers.
4. You own your directory. Never edit outside it. Ownership is in `ARCHITECTURE.md`.
5. Fan out on reviews, serialize on fixes. Critics run in parallel and must not see each
   other's output. Take the **single** highest-severity finding, give it to the one owner
   of that directory, let it work alone, re-gate.
6. The coupled cluster in `anvil.json` is worked sequentially by one owner. Parallel
   agents there break each other's assumptions while all of them report success.
7. No report without an artifact. "Improved the lighting" is not a result. Applies to your
   own reports.
8. Score the worst member of the coverage axis. Never the mean.
9. You may sharpen methods, architecture, and the phase plan — log each with `--amend`.
   **You may not weaken an exit number, remove a bar, or narrow the coverage axis.**
   `gate.mjs` blocks it. Never run `--approve-change`; that is the human's. Never edit any
   shipped program: `doctor.mjs`, `validate-spec.mjs`, `verify-harness.mjs`, `gate.mjs`,
   `journal.mjs`, `status.mjs`.
10. Numbers in `PROGRESS.md` are written by `journal.mjs`. Blocks marked `anvil:auto` are
    overwritten — write prose only outside them.

### Stopping

Stop when `gate.mjs` reports all bars passing, and report the final numbers.

Stop and ask the human when: a gate looks wrong, an exit number needs to change, or the
concept itself needs a decision. Do not guess on those. Everything else is yours.

---

# SITUATION 3 — RESUMING

A run stops when limits are hit or a session ends. The human comes back and says
"continue" or similar. Everything needed is on disk.

```
node tools/doctor.mjs
```

If it prints **INTERRUPTED**, the previous session was killed mid-task:

1. The IN FLIGHT task is where it died.
2. **Verify what actually landed.** A killed process leaves partial work — half-written
   files, a tool that no longer parses, a capture set missing members. Doctor flags
   truncated `tools/*.mjs`; check the task's own outputs yourself.
3. Redo only the incomplete part. `PROGRESS.md` and `.anvil/state.json` record what
   finished — do not repeat it.
4. `node tools/journal.mjs --end` — or, if the task cannot be salvaged,
   `node tools/journal.mjs --abandon="<why>"`, which records it as not done rather than
   logging it as completed.
5. Continue from the next action in `PROGRESS.md`.

If doctor does not print INTERRUPTED, the previous session closed cleanly. Read
`PROGRESS.md` and continue from the next action.

A gate that was mid-run when it died is simply re-run — partial results are never
recorded, so no false number survives.

Tell the human in one or two sentences where it stopped and what you are resuming. Then
continue without waiting for further instruction.

---

## Talking to the human

They are not watching most of the run. Every report:

- Leads with the gate table, or the single blocking fact.
- Uses numbers from tool output, never your own estimate of progress.
- Names stall or drift explicitly, before anything else, if present.
- States the next action.
- Stays short. `status.html` carries the detail.

## Files

| file | what |
|---|---|
| `METHOD.md` | the twelve invariants — read before your first action |
| `TOOLS.md` | tool contracts — fixed names, fixed I/O |
| `DEFINE.md` | the definition conversation in full |
| `EXAMPLES.md` | worked derivations; reasoning demonstrations, not options |
| `anvil.json` | machine-readable exit condition |
| `ARCHITECTURE.md` | concept, ownership, interface, bars |
| `HARNESS.md` | what gets measured, phase ladder |
| `KICKOFF.md` | the prompt the human sends to start the run |
| `PROGRESS.md` | memory — read first, write before finishing |
| `.anvil/state.json` | structured state; programs only, never hand-edit |
