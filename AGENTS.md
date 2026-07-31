# THE ANVIL LOOP — agent instructions

Framework version 2.2.0

You have been opened in a repo containing this file. Read it fully, then read `METHOD.md`.
Both are binding.

Works in any agent with a shell, a filesystem, and Node ≥ 18. The one environment-specific
thing is how the kickoff prompt repeats itself; that is decided once, during definition.

## What this is

A loop that climbs on the artifact, every round, plus instruments that watch the climb and
aim it — and never stand in front of it.

**One rule blocks: a member may never score below its own best.** Everything else this
repo measures is a reading.

## First action, always

```
node tools/doctor.mjs
```

It reports the stage, the next action, and which instrument is worth building now. Then
read `PROGRESS.md`, state block first.

Three situations. Doctor tells you which.

---

# SITUATION 1 — UNDEFINED

No `anvil.json`. **Talk to the human.**

Turn their concept into a spec, then hand them a prompt they send back. Follow `DEFINE.md`
in full. In short:

1. Read `METHOD.md`, `TOOLS.md`, `EXAMPLES.md`.
2. Short design conversation — a handful of exchanges. Propose concrete answers they can
   react to. Develop the idea before you spec it.
3. Push on the four things they will not volunteer:
   - **what real thing is this compared against**, frozen so it cannot move
   - **what each number on the scale means**, before anything is scored
   - **the defining feature** — the one thing that makes this *this*, which exists in
     round one
   - **the primary member** — the single view Act I takes to the notch
4. Show them the target and the readiness score. Get explicit approval.
5. Ask which agent they run in, and whether to enable ultracode. See
   `templates/KICKOFF.md` — a prompt with no way to repeat does one round and stops.
6. Write `anvil.json`, `ARCHITECTURE.md`, `KICKOFF.md`, `PROGRESS.md` from `templates/`.
7. `node tools/validate-spec.mjs` — fix every ERROR.
8. `node tools/journal.mjs --next="build round one — the artifact, with the defining feature in it"`

**Then hand off.** Print the prompt block, tell them plainly: *send this back and the run
starts; stop any time and say "continue" to resume.*

**Do not begin building.** The human sends the prompt.

---

# SITUATION 2 — THE RUN

## Round one

Build the artifact. Not a greybox, not a harness, not a plan — **the thing, with the
defining feature in it**, as beautiful as you can make it in one pass at real density.

Then build exactly two instruments: `capture.mjs` and `critic.mjs`. You cannot climb what
you cannot see or score. **Nothing else.** Every other instrument measures something that
does not exist yet and will need rewriting once it does.

That scene is round one of the product. It is not scaffolding, and it never gets rebuilt.

**One pass means one pass.** Build each subsystem once and move on — do not tune inside
round one. No parameter sweeps, no walking an exposure value back and forth, no polishing a
material until it looks right before anything has been scored. Tuning across rounds is what
this repo is; doing it by hand before the first `--record` is the loop reimplemented badly,
without the ratchet, the critic, or a number anyone can see. See Invariant 13.

Score it early and low. A first score of 35 is the baseline the ratchet protects, and the
critic's findings will aim round two better than any guess you make now.

**Before you fan out, time one capture.** Serially, alone, nothing else running. If a frame
costs minutes, every decision after this one is built on an instrument you cannot afford —
fix that first. Iterate at the small resolution; full resolution is for frames you keep.
See Invariant 14.

**Round one is not a pipeline.** Do not structure it as phases — no foundation → cluster →
integrate → polish, no staged multi-agent workflow that has to complete before anything is
scored. Two runs died exactly this way: six hours, 2.4M tokens, zero scores, both times
because one stage consumed the whole budget and nothing downstream was allowed to start.
Fan out *inside* a step if the work is genuinely disjoint. Never make the round itself a
structure. See Invariant 16.

**And keep the instruments crude.** `capture.mjs` and `critic.mjs` are about fifty lines
each the first time. One run spent an hour and five minutes building a capture tool for a
scene it had never scored. If you are an hour into an instrument, you are building the
wrong thing — get a number, then earn the right to improve what produced it.

## Every round after

```
1. node tools/doctor.mjs                 stage, next instrument
2. node tools/board.mjs                  the target member, and why
3. node tools/journal.mjs --begin="..."  claim BEFORE starting
4. ...build. make the target member better...
5. LOOK AT THE FRAME
6. node tools/board.mjs --record --saw="<what the image actually shows>"
7. node tools/journal.mjs --next="..." --end
   node tools/status.mjs
```

Step 3 is what makes an interrupted run resumable. Step 5 is not a formality — see
Invariant 7 in `METHOD.md`; `--record` will refuse without it.

## The rules

1. **Every round moves the artifact, and ends with a number.** A round is one owner, one
   pass, one score — never a phase ladder or a staged workflow that has to finish before
   anything is measured. `round.budgetMinutes` (default 90) is not a deadline and nothing
   stops when it passes; `doctor.mjs` and `board.mjs` simply start reporting how long you
   have gone without producing a number. A round that cannot score in ninety minutes is not
   a long round, it is a pipeline. Score what exists and make the next round smaller.
   Verification, refactoring and infrastructure that leave the build looking and playing
   identically did not advance it. Sometimes correct. Three in a row is not.
2. **Instruments when you need the reading.** `doctor.mjs` names the next one and why.
3. **Depth before breadth.** Act I climbs one member. Widen at the notch, not before.
4. **Correctness is debt.** `journal.mjs --debt --evidence`, then move on. Exception: a
   defect that stops you *measuring* is a blocker, not debt — fix it now.
5. **Read the board's verdict.** STUCK, UNEVEN and CEILING call for different responses.
   Uneven means a technique has not been applied here yet. A ceiling means the build needs
   a technique it does not have.
6. **The coupled cluster gets one owner at a time.** Parallel agents there break each
   other's assumptions while all of them report success. Fan out freely elsewhere — but
   **claim the fan-out before you launch it.** A workflow or squad is one claimed task,
   opened before the first agent starts and closed after the last returns. An unclaimed
   fan-out that dies three hours in leaves `doctor.mjs` reporting a clean slate.
   And edits to source inside a claimed task must survive a kill: write through a temp file
   or keep a backup. A process killed mid-`replace` leaves a build that will not parse.
7. **Critics never see your reasoning.** Goal, rules, scale, artifact. Nothing else.
8. **No report without an artifact.** A score, a frame, a trace, a log. "Improved the
   lighting" is not one. Applies to your own reports.
9. **Suspect the instrument before the build.** When a measurement contradicts something
   you can see, the measurement is usually wrong. And a claim of absence — nothing
   running, nothing changed — needs a positive result, never an empty one.
10. **You may sharpen methods.** Log amendments with `--amend`. You may not loosen the
    ratchet, raise the noise floor to dodge it, or edit a shipped program to pass. If a
    target is wrong, stop and say so.
11. **Never tune the artifact to suit the instrument.** When a reading is too expensive,
    make the *reading* cheaper — fewer pixels, less settle time, a faster machine. Never
    cheapen the build. A shadow map costing a software rasterizer three minutes costs a
    real GPU microseconds; trading it away caps the artifact to suit a machine no player
    will use. If the instrument is the problem, fix the instrument or say so.
12. **Measure what measuring costs.** Captures run one at a time through a lock, never
    concurrently — on a software rasterizer, parallel captures are slower than serial ones
    and the difference reads as "resolution is expensive" when it is contention. Iterate at
    the working resolution; save full resolution for frames you keep. If the renderer is
    software-emulated, framerate is fiction: report the flag, not the number.

## Stopping

Stop when every member holds at or above the target.

Stop and ask when: the ratchet fires, a gauge suggests the target itself is unreachable,
or the concept needs a decision only the human can make. Everything else is yours.

---

# SITUATION 3 — RESUMING

A run stops when limits are hit or a session ends. Everything needed is on disk.

```
node tools/doctor.mjs
```

If it prints **INTERRUPTED**, the previous session was killed mid-task:

1. The IN FLIGHT task is where it died.
2. **Verify the build still builds, before measuring anything.** Run `build.command` from
   the spec and load the artifact. A process killed mid-edit leaves source that no longer
   parses — and an hour spent benchmarking a broken page is indistinguishable from an hour
   of real work until you look. Doctor runs this for you when the spec declares it.
3. **Verify what else actually landed.** Half-written files, a tool that no longer parses,
   a capture set missing members. Doctor flags truncated `tools/*.mjs`; check the task's own
   outputs yourself.
4. Redo only the incomplete part. State records what finished.
5. `node tools/journal.mjs --end` — or `--abandon="<why>"` if it cannot be salvaged.
6. Continue from the next action.

If it prints **REGRESSION**, do not continue. See the one rule.

Tell the human in one or two sentences where it stopped and what you are resuming, then
continue without waiting.

---

## Talking to the human

They are not watching most of the run. Every report:

- Leads with the score and what the frame actually shows.
- Uses numbers from tool output, never your own sense of progress.
- Names a regression, stall or ceiling first if there is one.
- States the next action. Stays short — `status.html` carries the detail.

Show them the first frame. Not a description of it.

## Files

| file | what |
|---|---|
| `METHOD.md` | the invariants — read before your first action |
| `TOOLS.md` | instrument contracts, and when to build each |
| `DEFINE.md` | the definition conversation |
| `EXAMPLES.md` | worked derivations; reasoning, not options |
| `anvil.json` | the spec — `board.mjs` reads it |
| `ARCHITECTURE.md` | concept, ownership, direction, members |
| `KICKOFF.md` | the prompt the human sends |
| `PROGRESS.md` | memory — read first, write last |
| `.anvil/` | structured state; programs only, never hand-edit |
