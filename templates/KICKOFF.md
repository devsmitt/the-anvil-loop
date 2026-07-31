# The kickoff prompt

Hand the block below to the human. They send it back and the run starts.

## Composing it — before you print it

**The most important part of this prompt is what makes it repeat.** Without it the agent
does one round and stops.

Ask which agent they are running in.

**Claude Code** — it has a `/loop` skill that re-fires the prompt on its own pacing. Put it
at the very front: `/loop Build {{PROJECT}}, ...`

Also ask about **ultracode** — a mode for heavy multi-agent orchestration, more parallel
capacity, higher token spend. Recommended here. If yes: `/loop ultracode. Build ...`. If
they don't know what it is, say so in one line and let them choose. Never enable it
silently.

**Anything else** — no loop primitive. Omit the prefix and keep the KEEP GOING section in
the body. Ship one or the other, never both.

**Leave the AMBITION section exactly as written.** "AAA quality, from textures to physics"
is a dense pointer into what the model knows about how shipped work is surfaced and tuned,
and builds prompted that way come out visibly better. Reword it only where AAA would be
nonsense — a text roguelike, a terminal tool — and then name the real equivalent. Never
soften it to "high quality."

---

```
{{LOOP PREFIX — "/loop " or "/loop ultracode. " for Claude Code; nothing otherwise}}Build {{PROJECT}}, {{one-line concept}}, specified in this repo.

AMBITION

Build this at AAA quality. Utterly perfect, from textures to physics to lighting to
animation to audio to input feel to anything else you could think of. Every single part
held to that bar, not just the parts that are interesting to build.

{{The reference}} is the target and nothing about the medium excuses falling short of it.
Do not stop at your first idea of what is possible here.

THE JOB

Make {{PROJECT}} look and feel closer to that target. Every round. That is the whole job.

Round one builds the artifact — and {{definingFeature}} exists in it, however crudely.
Not a greybox, not a harness, not a plan. The thing.

A ROUND IS NOT A PIPELINE

One owner, one pass, one score. A round ends when a number lands on the board.

Do NOT structure a round as phases. No foundation → cluster → integrate → polish. No staged
multi-agent workflow that has to complete before anything is scored. Fan out inside a step
when the work is genuinely disjoint — never make the round itself a structure.

Two previous runs died exactly this way: six hours, 2.4 million tokens, zero scores. Both
times one stage ate the entire budget and nothing downstream was allowed to start. A phase
ladder is a gate system wearing different clothes — it does not block on a measurement, so
it looks compliant, but it blocks on completion, which no instrument here can see.

The round budget is {{budgetMinutes}} minutes. Nothing stops when it passes; doctor.mjs and
board.mjs just start telling you how long you have gone without producing a number. If you
are over it, score what exists right now, however bad, and make the next round smaller.

Keep the round-one instruments crude — capture.mjs and critic.mjs are about fifty lines each
the first time. If you are an hour into building an instrument for a scene that has never
been scored, you are building the wrong thing.

ROUND ONE IS ONE PASS

Build each subsystem once, well, and move on. Do NOT tune inside round one. No parameter
sweeps, no walking an exposure value up and down, no polishing a material until it looks
right before anything has been scored.

Tuning across rounds is the entire point of this loop. Doing it by hand before the first
score is the loop reimplemented badly — no ratchet, no blind critic, no memory, and no
number I can see. A first score of 35 is not a failure; it is the baseline the ratchet
protects, and the findings beside it aim round two better than any guess you make now.

If you are about to change one number and look at the frame again, record the round
instead.

MEASUREMENT HAS TO BE CHEAP

Before you fan out to anything, time ONE capture — serially, alone, nothing else running.
Write the number down.

Captures run one at a time through a lock. Never two at once: on a software rasterizer
every capture saturates every core, so parallel captures are slower than serial ones, and
the timings blame resolution for what is actually contention. Iterate at the working
resolution; full resolution is for frames you keep.

If the renderer is software-emulated, framerate is fiction. Report the flag, not a number,
and tell me — that gauge stays dark and it is my decision, not a defect for you to work
around.

And when a capture is too expensive, make the CAPTURE cheaper — fewer pixels, less settle
time. Never cheapen the build to bring a measurement down. A shadow map that costs a
software rasterizer three minutes costs a real GPU microseconds; trading it away caps the
artifact to suit a machine no player will ever use. If the instrument is the problem, fix
the instrument or tell me.

EVERY ROUND

  1. node tools/doctor.mjs                 where you are, what to build next
  2. node tools/board.mjs                  the target member, and why it is the target
  3. node tools/journal.mjs --begin="..."  claim the work before starting it
  4. Build. Make the target member better.
  5. LOOK AT IT. Open the frame. Not the number — the image.
  6. node tools/board.mjs --record --saw="<what the frame actually shows>"
  7. node tools/journal.mjs --next="..." --end && node tools/status.mjs

Step 5 is not a formality. Every expensive failure this framework has seen was plain in
one image and invisible in every number: frames graded from a build that no longer
existed, a creek that read as an asphalt road, a playing critic staring at a wall.

KEEP GOING
{{KEEP THIS SECTION ONLY IF THERE IS NO /loop PREFIX ABOVE. DELETE IT IF THERE IS.}}

Do not stop after one round. The moment you finish recording, start the next one, without
waiting for me to reply. One round is not the job; reaching the target is.

THE ONE RULE

A member may never score below its own best. board.mjs checks it. If it fires, stop and
tell me what changed and what you think broke it. Do not raise the noise floor and do not
re-run hoping for a better draw.

Everything else this repo measures is a reading, not a rule. Framerate, playability,
determinism, coherence — they inform what you do next. None of them stop you.

INSTRUMENTS ARE BUILT WHEN YOU NEED THE READING

Round one: capture and critic, because you cannot climb what you cannot see or score.
Nothing else. Every other instrument measures something that does not exist yet, and will
need rewriting once it does. doctor.mjs names the next one when its reading becomes
useful.

CORRECTNESS IS DEBT UNTIL FIDELITY CLEARS

Traversal bugs, soft-locks, physics failures: log them and move on.

  node tools/journal.mjs --debt="..." --evidence="..."

Do not fix them in Act I. A previous run spent three hours making a player traverse water
that was, at the time, a flat blue ribbon that read as asphalt. The bug was real. The
priority was insane.

One exception: a defect that stops you MEASURING is not debt, it is a blocker. If the
build will not boot or a member cannot be scored, fix it now.

DEPTH BEFORE BREADTH

Act I climbs exactly one member: {{primaryMember}}. Take it to {{actNotch}} before widening
to anything else. Sweeping the full axis on a build sitting at 20 measures the same
badness N times.

Act II opens automatically when {{primaryMember}} reaches the notch. Then widen, pay the
debt, and turn on the mechanical bars.

{{The coupled cluster}} is one system — work it with one owner at a time. Parallel agents
there break each other's assumptions while all of them report success. Fan out freely on
genuinely disjoint work — but claim the fan-out with journal.mjs --begin BEFORE launching
it, and close it after the last agent returns. An unclaimed fan-out that dies three hours
in leaves nothing on disk saying it ever ran.

WHEN A ROUND DOESN'T MOVE IT

Three rounds with no improvement means the approach is wrong, not that you need another
pass of the same thing. Change the decomposition, the owner, or the critic — and look at
the frame before deciding. board.mjs tells you when this happens and whether it is a weak
member or a global ceiling; those need opposite responses.

TARGET

  {{fidelity id}}   {{target}}   on the worst member, across {{the axis}}

STOPPING

Stop when every member holds at or above the target, and give me the final numbers.
Stop and ask if the ratchet fires, if a gauge suggests the target itself is wrong, or if
the concept needs a decision only I can make.

I may run out of limits or close the session mid-round. Expected — pick up from
doctor.mjs when I say continue.
```

---

## At handoff, tell the human

Five lines. The readiness score and its deductions. The target. Which parts a program
judges and which parts only they can. What round one will produce. The assumption you are
least confident in.

Then: *send the block above back and the run starts. Stop any time; say "continue" and I
pick up where it left off.*

## Surface unprompted, later

- **The first frame.** They should see round one's output, not hear about it.
- **A regression.** The one rule fired — say what changed.
- **A stall or a ceiling.** Three rounds flat means the approach is wrong.
- **A gauge that suggests the target is wrong.** If perf says the target density cannot
  hold the budget, that is a conversation, not a thing to quietly absorb.
