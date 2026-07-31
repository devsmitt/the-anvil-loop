# METHOD

Binding on every project built in this repo.

---

## The claim

A build loop gets better at the thing it measures itself against, and it gets better at
nothing else. So the loop climbs on **the artifact**, every round, from the first round —
and the instruments watch the climb without ever standing in front of it.

That second half is what this repo adds. The first half is not optional and not negotiable:
if a round did not make the artifact better, the round was overhead.

## The one rule

**A member may never score below its own best.**

That is the entire blocking surface of this framework. Everything else is a reading.

It costs nothing while you are climbing — you only meet it going backwards — and it closes
the one real hole in an unmeasured loop: round 30 quietly breaking something round 25 had
right, with nobody noticing for six hours.

## Gauges, not gates

Every other measurement in this repo reports and does not block. Determinism, framerate,
playability, coherence, integrity, drift: all of them produce numbers on a board. None of
them can stop the loop.

*Why:* a gate that fires early stops fidelity work to service a system that is going to be
rebuilt anyway. Runs have lost entire nights to a traversal bug in water that was, at the
time, a flat blue ribbon. The bug was real. The priority was insane. A gauge would have
logged it and let the climb continue.

A gauge earns its keep by changing what you do next. A gate earns its keep by stopping you
from shipping. You are not shipping in round three.

## The invariants

### 1 — The artifact improves every round

If a round produced verification, refactoring, or infrastructure and the artifact looks or
plays exactly the same, that round did not advance the build. Sometimes that is correct.
Three in a row is not.

The board tracks it. `roundsSinceImprovement` is the number to watch.

### 2 — Build the instrument when you need the reading

Not before. Instruments in the order their readings become useful:

| build it when | instrument |
|---|---|
| round one — you cannot climb what you cannot see or score | `capture`, `critic` |
| scores get noisy, or the ratchet fires on work you didn't do | `diff` (determinism) |
| one member reaches the act notch | `sweep` (coverage) |
| you approach the frame budget | `perf` |
| the artifact is operable | `player` |
| the player starts failing | `solvable` |
| scores climb three rounds running | `anchor` (drift) |

*Why:* seven tools before the first frame is six tools built to measure a thing that does
not exist yet. Every one of them will need rewriting once it does.

### 3 — The bar is external, frozen, and calibrated

Judge against something that exists and a human can look at. Freeze it so it cannot move
between rounds. And **say what the numbers mean before scoring anything** — a threshold on
an undefined scale means whatever the critic decides that round, and it drifts upward.

A named target the model knows well ("a shipped AAA first-person shooter") is a permitted
weaker form. It works. It costs the ability to do blind A/B and it makes absolute
calibration unverifiable. Offered third, never first.

"AAA quality, from textures to physics" is not vague — it is a dense pointer into what the
model knows about how shipped work is surfaced and tuned, and it measurably improves
output. Keep that phrasing. Just don't mistake it for a gate.

### 4 — Depth before breadth

Take **one** member to the target before widening. A sweep across 64 members of a build
sitting at 20/100 measures the same badness sixty-four times and tells you nothing you did
not already know from looking at one.

Coverage width tracks quality: 1 member, then a handful, then the full axis. The distribution
question — *is it good everywhere, or good here* — is only worth asking once something is
good somewhere.

### 5 — The defining feature exists in round one

The thing that makes this *that* game — the canopy, the portal, the drift — exists, however
crudely, before anything is optimized. A forest game with no trees at hour ten has been
building something else.

### 6 — Nothing built to measure is thrown away

The scene you build to measure performance is the most complete thing that will exist for
hours. It is not scaffolding. It is round one of the product, and it gets promoted, not
rebuilt.

*This is the single most expensive mistake available in this repo.* A previous version of
this document called the measurement scene "not product code, nothing here is meant to
survive." An agent built a genuinely beautiful forest to measure foliage density, wrote
down a millisecond figure, and deleted it.

### 7 — Look at it

Before recording a score, open the frame and say in one line what it actually shows.
`board.mjs --record` will not accept a round without it.

*Why:* every failure mode that has cost real time in this framework was visible in a
single image and invisible in every number — frames graded from a build that no longer
existed, a creek that read as an asphalt road, a playing critic staring at a wall from 30cm,
a camera embedded inside geometry. Ten hours of instrumentation could not surface any of
them. Opening two PNGs surfaced all of them in a minute.

### 8 — The builder never grades itself

Critics get the goal, the rules, the scale, and the artifact. Never the builder's reasoning,
changelog, or previous scores. Fresh agent, fresh context, every review.

### 9 — Score the worst member, and know the spread

Once there is more than one member, the score is the worst one. But the **spread** is the
diagnosis: one member at 68 and one at 20 is uneven work; everything at 40 is a ceiling.
Those need opposite responses.

### 10 — Correctness is debt until fidelity clears

Traversal bugs, soft-locks, wedges, physics failures: log them with evidence, do not fix
them, until the fidelity target is met. They are recorded in the debt ledger and paid in
Act II.

**One exception.** A defect that *prevents measurement* is not debt, it is a blocker — if
the build will not boot, or a member cannot be scored, fix it now. You cannot climb a hill
you cannot see.

### 11 — Distrust the instrument before the build

Three times across two full runs, a confident number was wrong and the build was fine: a
framerate timer reading 1000fps for a 174fps scene, a capture racing the compositor, a
"nothing changed" claim from a shell command that had silently errored.

When a measurement contradicts something you can see, suspect the measurement. And a
claim of *absence* — nothing running, nothing changed, no differences — requires a positive
result, never an empty one.

### 12 — State lives on disk

`PROGRESS.md` and `.anvil/` are the memory. Claim work before starting it; close the claim
after. An open claim is how the next session knows a run was killed and where.

**Claim before you fan out, not before you type.** A parallel launch — a workflow, a squad
of sub-agents — is one claimed task, opened before the first agent starts and closed after
the last one returns. A fan-out with no claim is invisible to the resume path: the run dies
three hours in and `doctor.mjs` reports a clean slate.

### 13 — Round one is one pass

Build each subsystem once, at real quality, and move on. **Do not tune inside round one.**
No parameter sweeps, no A/B on exposure values, no walking a material back and forth until
it looks right before anything has been scored.

*Why:* tuning across rounds is what this repo *is*. An agent that spends ninety minutes in
round one moving `exposure` from 0.86 to 0.95 one value at a time — rebuild, capture, look,
repeat — has reimplemented this loop by hand: without the ratchet, without a blind critic,
without memory, and without a number anyone else can see. It is the loop's own job, done
worse, before the loop has started.

A first score of 35 is not a failure. It is the baseline the ratchet then protects, and the
findings that come back beside it aim the next round better than any guess made before the
first review. **The fastest route to a beautiful build is a mediocre one, scored early.**

The tell: repeated small edits to the same constants, each followed by a rebuild and a
capture, with no `--record` between them. If you are about to change one number and look
again, record the round instead.

### 14 — A reading you cannot afford is not a reading

An instrument that costs minutes per sample changes the loop's behaviour whether or not
anyone decided it should. Measure what your measurement costs before you build anything on
top of it — and measure it **serially, once, with nothing else running.**

*Why:* one run clocked a capture at 11 minutes and an identical capture at 12 seconds, and
concluded the difference was resolution. It was contention. Under a software rasterizer
every capture saturates every core, so two captures in parallel are slower than the same
two run back to back — and an agent that fans out across eight members is not measuring
eight times, it is thrashing. Three hours went to that before anyone timed a single frame.

Three consequences, all cheap:

- **Captures serialize.** One at a time, through a lock. Never concurrently.
- **Iterate at the small resolution.** Full resolution is for the frame you keep, not the
  hundreds you throw away. A critic does not score more accurately at 1080p.
- **Know your renderer.** If the GPU is software-emulated, framerate is fiction. Report the
  flag, not the number.

### 15 — Never tune the artifact to suit the instrument

When a measurement becomes expensive or awkward, make the **measurement** cheaper. Never
make the build worse.

*Why:* a run measuring on a software rasterizer found captures costing minutes and concluded
it should cut shader cost to bring them down. But a shadow map that costs a CPU rasterizer
three minutes costs a real GPU a fraction of a millisecond. The expense was a property of the
measuring rig, not of the build — and the "fix" would have permanently capped the artifact to
suit a machine no player will ever use. This is the previous invariant arrived at from the
wrong end, and it is the more dangerous mistake of the two: an unaffordable reading costs
hours, a cheapened build costs the ceiling.

Every legitimate move is on the instrument's side: fewer pixels, less settle time, fewer
frames, a faster machine. If none of them are enough, that is a conversation with the human
about where this run should live. It is not a licence to cheapen the thing being built.

The obvious cases are the same rule: never edit a shipped program to pass, never raise the
noise floor to dodge the ratchet, never narrow the coverage axis because the sweep is slow.
If the instrument is the problem, fix the instrument or say so out loud.

### 16 — A round is not a pipeline

**One owner, one pass, one score.** A round ends when a number lands on the board. Nothing
may sit between the start of a round and that number.

You may fan out *inside* a step — two agents on genuinely disjoint work, a sub-agent to
review — and you should. What you may not do is make the round itself a structure that has
to complete before anything is scored: no phase ladder, no staged pipeline, no
foundation-then-cluster-then-integrate-then-polish. The moment a round has named phases, the
score moved to the end, and the loop stopped being a loop.

*Why:* this is the most expensive failure this framework has recorded, and it has happened
twice. Two runs, six hours, 2.4 million tokens, **zero scores.** Both times an agent wrapped
round one in a five-phase multi-agent workflow. Both times a single stage — materials —
consumed the entire budget tuning constants nobody could see, because nothing downstream was
allowed to start and nothing upstream was allowed to finish. The second run re-ran that stage
from scratch and paid for it again.

Read that against Invariant 2 and the shape is clear: a phase ladder is the gate system in
different clothes. It does not block on a *measurement*, so it looks compliant. It blocks on
*completion*, which is worse, because no instrument in this repo can see it.

**The round budget makes it visible.** `round.budgetMinutes` (default 90) is not a deadline
and nothing stops when it passes — `doctor.mjs` and `board.mjs` simply start saying how long
you have gone without producing a number, and at 1.5× they say only that. A round that cannot
produce a score in ninety minutes is not a long round. It is a pipeline, and the fix is to
score what exists right now, however bad, and make the next round smaller.

**Round-one instruments are crude on purpose.** `capture.mjs` and `critic.mjs` are perhaps
fifty lines each the first time. One run spent an hour and five minutes building a capture
tool for a scene it had not scored once. If you are an hour into an instrument, you are
building the wrong thing — get a number, then earn the right to improve the thing that
produced it.

---

## Two acts, not phases

**Act I — Climb.** One member. Everything is fidelity. Gauges advisory. Debt logged, not
paid. Ends when the primary member reaches the act notch.

**Act II — Spread and harden.** Widen the coverage axis. Pay the debt. Turn on the
mechanical bars. The ratchet now protects every member.

There is no Act 0. Round one builds the artifact.

---

## Not prescribed here

The design, the architecture, the stack, the decomposition, the numbers. All yours.
`EXAMPLES.md` demonstrates how derivation reasons; it is not a menu.
