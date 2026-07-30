# DEFINITION — the conversation that precedes the run

You run this once, when `anvil.json` does not exist. It ends by handing the human a
prompt; they send it back and the loop begins.

Your output is a spec that an autonomous loop will run against for many hours without
supervision. Everything that loop believes about what "good" means comes from what you
write. If you write a bar that cannot be measured, the loop will spend its entire run
optimizing a number that means nothing, and nobody will find out until the end.

**Read `METHOD.md` and `TOOLS.md` in full before you begin.** You are deriving a concrete
instance of those twelve invariants against the tool contracts in TOOLS.md. Read `EXAMPLES.md`
for worked derivations — as demonstrations of reasoning, not as options to select from.

---

## What you produce

Five files in the repo root, plus a readiness score reported to the user:

| file | what it carries |
|---|---|
| `anvil.json` | **The machine-readable exit condition.** `tools/gate.mjs` reads this and it is the authority on whether the run is finished |
| `ARCHITECTURE.md` | The concept, the ownership map, the interface contract, the hard rules, the quality bars |
| `HARNESS.md` | What must be measured, what tools measure it, the critics, the phase ladder |
| `KICKOFF.md` | The re-entrant loop prompt, with this project's phases and exit numbers |
| `PROGRESS.md` | Empty state file, seeded at Phase 0 |

Use `templates/` as the shape. Fill every slot. Delete nothing structural.

**`anvil.json` is the one that matters most.** The prose documents explain the run to a
reader; that file decides it. Every bar in it needs a `command` that prints JSON and a
`field` to read from it. **If you cannot name the command that produces a number, that bar
does not belong in the exit condition** — move it to `notes.humanJudges` and tell the user
plainly that they will have to judge it themselves.

You do **not** write the seven generated tools. You specify them — what each measures, what
its success predicate is, what the player is denied — and the loop builds them in Phase 0
against the fixed contracts in `TOOLS.md`. Do not invent new tool names; a project with
`orient.mjs` instead of `player.mjs` has a harness that `verify-harness.mjs` cannot check.

---

## The conversation

This is a design conversation that ends in a spec. It is not a form.

The user may arrive with a sharp concept ("a Portal clone") or a vibe ("something with
grappling hooks, feels good to move"). Both must land at the same artifact. Adapt.

**Develop the idea before you spec it.** The strongest concepts get more interesting under
a few minutes of pressure — a structural decision usually falls out that makes the whole
thing more coherent and more measurable at the same time. Propose those. Say why. Let the
user reject them. What you must not do is invent a design the user did not agree to and
then write it into a binding document.

**Keep it short.** A handful of exchanges, not an interrogation. Ask about several things
at once. Propose concrete answers the user can react to rather than open questions they
have to fill in — reacting is faster and more accurate than generating.

**Pressure-test where it matters.** Two questions decide whether this works at all, and
users almost never volunteer answers to them:

- What real, existing thing is this compared against?
- What about it can be checked mechanically, by a program or a playing agent, with no
  human in the loop?

If you get vague answers, dig once, propose candidates, and then record what you actually
got. Do not paper over a weak answer with a confident-sounding document.

**Ask which agent they are running in, before you write `KICKOFF.md`.** This decides
whether the prompt can repeat itself, and a prompt that cannot repeat produces one
increment and stops — with every re-entrant mechanism in this repo left unused.

- **Claude Code** — the prompt gets a `/loop` prefix. Also ask whether they want
  **ultracode**: a mode for heavy multi-agent orchestration, more parallel capacity and
  higher token spend. Recommended here, since the loop fans out critics every round. If
  they do not know what it is, say so in one line and let them decide. Never enable it
  silently.
- **Anything else** — no loop primitive exists, so the prompt keeps its LOOPING section
  instead, which tells the agent to iterate on its own without pausing between rounds.

`templates/KICKOFF.md` carries both forms. Compose one, delete the other.

---

## Derivation order

**Derive the gates first, then everything else from them.** This is the reverse of the
intuitive order and it is deliberate. The architecture that makes something measurable is
not always the architecture you would design otherwise, and it is much cheaper to find
that out now.

Work through all twelve invariants in `METHOD.md`. These seven carry the most weight:

**1. External bar.** What existing artifact is output compared against, blind? Name it
specifically enough that an agent can obtain it. "AAA games" is not a bar. "Portal 2
chamber screenshots and any speedrun VOD" is.

**2. Coverage axis.** What varies such that reviewing one instance proves nothing? Levels,
seeds, routes, loadouts, input devices, difficulty tiers. How many members does a gate
sample, and what is the *worst-case* threshold?

**3. Mechanical critic.** What does "playing it" mean, what does the playing agent
receive, and what is its success condition? Be concrete: this tool is the one the project
lives or dies by, and it is the one most likely to get quietly scoped down.

**4. Determinism method.** What makes two capture runs bit-identical for this specific
concept? Name the sources of nondeterminism and how each is pinned.

**5. Coupled cluster.** Which subsystems are mutually dependent and must be worked
sequentially by a single owner? Name them explicitly, because Invariant 7 has no meaning
until this is filled in.

**6. Ownership map.** The genuinely disjoint directories, one owner each, and which one is
upstream of the others.

**7. Exit condition.** One number per bar, all of which must hold simultaneously across
the coverage axis. Every number must be something the user can verify without trusting an
agent's word — which in practice means every bar has a `command` in `anvil.json` that
prints it.

Note that `gate.mjs` fingerprints these thresholds the first time it runs and will refuse
to run again if any of them get easier. Set them where you believe they should be, not
where you think they will be comfortable to hit. The loop cannot renegotiate them and
neither can you.

Then: the phase ladder. Phase 0 is always harness and reproducibility with no product
code. Order the rest so that coupled work is serialized and each phase has an objective
exit. Beyond those constraints, the ladder is yours to design.

---

## The readiness score

Report a score out of 10 for how well you believe an autonomous loop can execute this
concept given what you have. **Never refuse to proceed.** A low score is information, not
a verdict — the user is entitled to run a 5/10 concept knowing it is a 5/10 concept.

Start at 10 and deduct:

| deduction | condition |
|---|---|
| −3 | No external reference bar that an agent can actually obtain and compare against |
| −3 | Nothing checkable without a human — no solve condition, no measurable success state |
| −2 | No coverage axis; the product is a single fixed artifact with nothing that varies |
| −2 | Determinism is unclear or the concept depends on real-time or networked state |
| −1 | Quality is entirely subjective (aesthetics, feel, humor) with no objective floor |
| −1 | Scope is very large relative to the phases, or the coupled cluster is most of the build |

**Always report the deductions, not just the total**, and for each one state exactly what
input would remove it. "5/10 — no mechanical solve condition (−3, would be 8/10 if we
define what 'the player succeeded' means as something a program can check). No coverage
axis (−2, this is a fixed authored artifact)."

Offer to spend two more minutes fixing the biggest deduction before writing the files.
Most of them are cheap to fix at this stage and expensive to fix at hour eleven.

---

## Rules

1. **Never write a bar you cannot measure.** If you cannot describe the tool that produces
   the number, the number does not go in the exit condition. Move it to a non-blocking
   note.
2. **Never invent a number the user cannot verify.** Every threshold gets a stated method.
3. **Never silently decide design.** Propose, get agreement, then write.
4. **Do not decide the stack from reasoning if a measurement could decide it.** If there
   is a real performance question at the heart of this concept, make Phase 0 answer it
   with a spike and record the measured number.
5. **Show the user the exit condition before writing files, and get explicit approval.**
   That block is the contract the whole run is judged by, and it is the last cheap moment
   to change it.
6. **Write hard, specific documents.** The loop reads these hundreds of times. Vague
   language in a binding document becomes drift.

---

## Before you hand off — validate your own output

```
node tools/validate-spec.mjs
```

**Fix every ERROR before reporting to the user.** You are writing the contract an
autonomous loop will run against for hours without supervision; a bar with no command or
a threshold that contradicts `KICKOFF.md` will not surface until it has wasted most of a
run. Warnings are judgement calls — resolve them or explain why you left them.

Then seed the state file so any later session can orient:

```
node tools/journal.mjs --phase=0 --next="build the Phase 0 harness tools per TOOLS.md"
node tools/doctor.mjs
```

## Handoff

This is the moment the whole conversation exists for. Two parts, in this order.

**First, the prompt.** Print the prompt block from `KICKOFF.md` in full, in a copyable
form, composed for their agent — `/loop` prefix or LOOPING section, never both. Say
plainly: *send this back to me and the run starts. It runs for a long time. Stop whenever
you want and say "continue" to pick up where it left off.*

If you used `/loop`, tell them in one line that the prefix is what makes it repeat, so
they do not helpfully edit it out.

**Then, briefly — five lines, not an essay:**

- The readiness score and its deductions, and what that means for what they will get
- The exit condition as it appears in `anvil.json`
- Which bars a program judges, and which parts only they can judge
- What Phase 0 decides before any product code exists
- The single assumption you are least confident in

Then stop. **Do not begin building.** The human sends the prompt.
