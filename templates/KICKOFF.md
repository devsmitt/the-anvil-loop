# The kickoff prompt

Hand the block below to the human. They send it back to start the run.

It is written to re-fire, so it cannot say "start at Phase 0" — it reads state, works out
where it is, does the next increment, records the result. Iteration 1 and iteration 40 run
the same text and do different work.

## Composing it — do this before you print it

**The single most important part of this prompt is what makes it repeat.** Without it the
agent does one increment and stops, and every re-entrant mechanism in this repo — state,
resume, stall detection — has nothing to re-enter.

Ask the human which agent they are running in, then compose accordingly.

**Claude Code** — it has a `/loop` skill that re-fires the prompt on its own pacing. Put it
at the very front of the block:

```
/loop Build {{PROJECT}}, ...
```

Also ask whether they want **ultracode** on. It is a Claude Code mode for heavy multi-agent
orchestration — more parallel capacity, higher token spend. Recommended for this, because
the loop fans out critics every round. If yes:

```
/loop ultracode. Build {{PROJECT}}, ...
```

If they do not know what ultracode is, say that in one line and let them choose. Do not
enable it silently.

**Codex, Cursor, or anything else** — there is no loop primitive. Omit the prefix entirely
and keep the LOOPING section in the body, which instructs the agent to iterate on its own
without waiting between rounds.

Delete whichever of the two you did not use. Never ship both.

---

```
{{LOOP PREFIX — "/loop " or "/loop ultracode. " for Claude Code; nothing for other agents}}Build {{PROJECT}}, the {{one-line concept}} specified in this repo. Fan out sub-agents.
Run until the gate passes.

STATE — first, every iteration.

  1. node tools/doctor.mjs
     If it says INTERRUPTED, follow SITUATION 3 in AGENTS.md before anything else.
  2. Read AGENTS.md, METHOD.md, ARCHITECTURE.md, HARNESS.md. Binding, not advisory.
  3. Read PROGRESS.md. It records the phase, what is finished, what the last gate
     returned, and the next action.
  4. node tools/journal.mjs --begin="<the task you are about to do>"
  5. Do the next increment.
  6. Close out: gate, --note, --next, --end, status. Act on any alert.
     During Phase 0 skip the gate — it refuses until verify-harness passes, by design.

Never restart a finished phase. Never re-derive a decision PROGRESS.md already records.

LOOPING
{{KEEP THIS SECTION ONLY IF THERE IS NO /loop PREFIX ABOVE. DELETE IT IF THERE IS.}}

Do not stop after one iteration. The moment you finish closing out, begin the next one —
doctor, PROGRESS.md, claim, increment, close out — and keep going without waiting for me
to reply. One increment is not the job; converging the gate is the job.

Stop only when the gate passes, when you need a decision only I can make, or when you run
out of room. If you run out of room, leave the state clean: --next set, claim closed or
left open honestly.

ROLE

You are the lead. You own {{shared dirs}}, tools/, and the contract documents. Every other
directory belongs to a subsystem agent. Ownership is in ARCHITECTURE.md and it is absolute.

PHASES — in order. No reordering. No skipping.

  0  {{harness + spike}}                    NO PRODUCT CODE
  1  {{...}}
  {{n}}  {{coupled cluster}}                SEQUENTIAL, ONE OWNER
  {{n}}  {{independent work}}               PARALLEL IS SAFE
  {{n}}  the critic loop                    UNTIL THE GATE PASSES

Phase 0 is not a formality. Before any product code exists, node tools/verify-harness.mjs
must pass — which requires two consecutive capture runs to be bit-identical. If captures
are not reproducible, every review after this point is noise and the run is wasted. Prove
it, then move on.

{{Let the spike settle {{the provisional decision}}. Decide it from a measured number, not
from reasoning, and record the number in PROGRESS.md.}}

HOW TO RUN

Fan out on REVIEWS. Serialize on FIXES.

Spawn the critics in parallel — they are independent and must not see each other's output.
Take the single highest-severity finding, hand it to the one agent that owns that
directory, let it work alone. When it reports, re-gate with tools/diff.mjs on everything
that was not supposed to change, and go again.

Do not assign six findings to six agents. {{The coupled cluster}} is one system; parallel
agents each break the others' assumptions while all six report success.

Fan out freely on genuinely independent work — {{list}}.

EVERY GATE RUNS ACROSS {{THE COVERAGE AXIS}}. NEVER ONE {{MEMBER}}.

{{Why one member proves nothing here.}} Judge the worst member, never the median.

ALL BARS MUST PASS

{{What passing one bar and failing another is called, and why it is a failure rather than
progress. Restate any rule that is not tunable.}}

{{When bars conflict, which wins.}}

NO REPORT WITHOUT AN ARTIFACT

{{What counts as one here.}} "Improved the {{X}}" is not. Reject subsystem reports that
carry no evidence, including your own.

THE CRITICS DRIFT

Before believing a rising score, check the anchor set. If frozen artifacts now score
higher than they originally did, the critic softened — replace it and re-run the round.

AMENDING THIS PLAN

You may sharpen the architecture, the harness, and the phase plan. Log every amendment
with node tools/journal.mjs --amend.

You may not weaken an exit number, remove a bar, or narrow the coverage axis. gate.mjs
blocks it. If you believe one is wrong, stop and tell me.

EXIT CONDITION

node tools/gate.mjs decides. It reads anvil.json:

  {{bar}}    {{number}}
  {{bar}}    {{number}}
  {{bar}}    {{number}}

STOPPING

Stop when gate.mjs reports all bars passing, and give me the final numbers.

Do not stop because most are green. Do not stop because a round produced a small gain —
record it and keep going. If you are blocked on something only I can decide, stop and ask.

I may run out of limits or close the session mid-run. That is expected — pick up from
doctor.mjs when I say continue.

On your first iteration, tell me {{the Phase 0 decision}} and the measured evidence behind
it before starting Phase 1.
```

---

## What to tell the human at handoff

Five lines, not an essay. The readiness score and what it means. The exit condition. Which
bars a program judges and which parts only they can judge. What Phase 0 settles before any
product code exists. The assumption you are least confident in.

Then: *send the block above back to me and the run starts. Stop any time; say "continue"
and I pick up where it left off.*

## What to surface to them later, unprompted

- **A phase boundary.** The exit criteria are objective so they can check your work rather
  than trust it. A bad decision at Phase 0 or at the coupled cluster poisons everything
  downstream.
- **Critic drift.** If scores climb three rounds while artifacts look unchanged, say so.
- **A mechanical critic that suddenly succeeds at everything.** It is probably too capable
  to be a fair proxy for a human, which means the bar it guards is no longer real.
- **A stall.** Three gate runs with no movement means the approach is wrong.
