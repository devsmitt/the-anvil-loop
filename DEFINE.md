# DEFINITION — the conversation before the run

Runs once, when `anvil.json` does not exist. Ends by handing the human a prompt.

Everything the loop believes "good" means comes from what you write here. Read `METHOD.md`
and `TOOLS.md` first, and `EXAMPLES.md` for how derivation reasons — as demonstrations,
not options.

---

## What you produce

| file | carries |
|---|---|
| `anvil.json` | the spec. `board.mjs` reads it |
| `ARCHITECTURE.md` | concept, defining feature, ownership, direction, members |
| `KICKOFF.md` | the prompt the human sends back |
| `PROGRESS.md` | state file |

`templates/` is the shape. Fill every slot.

You do **not** write instruments. Round one builds `capture` and `critic`; everything else
gets built when its reading becomes useful. Do not pre-plan a harness.

---

## The conversation

A design conversation that ends in a spec. Not a form.

They may arrive with a sharp concept ("a Portal clone") or a vibe ("something with
grappling hooks that feels good to move"). Both land at the same artifact.

**Develop the idea before you spec it.** Strong concepts get more interesting under a few
minutes of pressure — a structural decision usually falls out that makes the whole thing
more coherent *and* more measurable at once. Propose those. Say why. Let them be rejected.
What you must not do is invent a design they did not agree to and then write it into a
binding document.

**Keep it short.** A handful of exchanges. Ask about several things at once. Propose
concrete answers they can react to rather than open questions they have to fill — reacting
is faster and more accurate than generating.

---

## The four things they will not volunteer

### 1. The reference, frozen

Three modes, not equally strong. Offer in this order.

| mode | what | cost |
|---|---|---|
| `artifact` | they supply images or footage, frozen in `reference/` | none — strongest |
| `sourced` | you find material and **freeze it**, committed | none, *if frozen* |
| `model-prior` | no file; the critic scores against a named target | −2 readiness |

Ask for `artifact` first — most people have exactly the reference in mind and will hand it
over. Offer `sourced` second; nearly as good, costs them nothing.

**`sourced` only counts if frozen and committed.** A critic re-fetching references each
round is comparing against a moving target, and no two scores in the run are comparable.

**On `model-prior`:** it works, and it is the mode the original technique used — "AAA
quality, from textures to physics" is a dense pointer into what the model knows, not an
empty exhortation. The cost is real though: the critic shares the builder's prior, so it is
less independent, and blind A/B is impossible. Say once that a single reference image is
worth two points, then proceed without arguing.

Be specific about the target either way. "A shipped AAA first-person shooter, lit and
surfaced to that standard" beats "AAA games."

**Keep "AAA quality" literal in the prompt** for anything with a rendered visual bar. Swap
it only where it would be nonsense — a terminal roguelike, a 2D card game — and then name
the real equivalent. Never soften it to "high quality."

### 2. The calibrated scale

A target on an undefined scale is not a target — it means whatever the critic decides that
round, and it drifts upward. Start from this ladder and adapt the wording. Do not invent
one from nothing.

> **90–100** — indistinguishable from the reference in a blind A/B
> **76–89** — clearly professional; would pass as a small-studio release
> **60–75** — a good indie build; clearly not the reference, and a trained eye says why immediately
> **40–59** — a competent prototype, obviously unfinished
> **0–39** — placeholder or broken

**0–100, not 1–10.** A round that genuinely improves the build often moves a ten-point
scale by exactly zero, which reads as a stall that isn't one.

Set `target` at a band you described. 75 is a strong, honest target for a from-scratch
build with no hand-authored art; 90 means you intend to be mistaken for the reference. Set
`actNotch` well below it — that is where depth stops and breadth begins, and 55–60 is
usually right.

### 3. The defining feature

**The one thing that makes this *this*.** The canopy. The portal. The drift.

It exists in round one, however crudely. Two prior runs deferred it — one reached hour ten
with no trees in a forest game — and spent all their time on everything else.

Write it into `anvil.json → definingFeature` and describe it in `ARCHITECTURE.md`.
`validate-spec.mjs` errors without it.

### 4. The primary member

The single view Act I takes to the notch. Pick **the shot the concept is sold on** — the
frame that would go in the post.

Then name the rest of the members for Act II. They must be genuinely different from each
other; four entries framing the same view is a smaller set wearing a bigger label. Include
awkward and badly-lit views on purpose. No debug renders.

---

## Also settle

**Asset policy.** Fully procedural is a real achievement and a hard ceiling — the last
stretch toward a first-party look is hand-authored art, and generating everything in code
rules that out by construction. Ask, record it, and let it inform where `target` sits.

**Output shape.** Single self-contained file, or a bundled build? It changes decisions all
the way through, and an agent that doesn't know single-file is the goal will add a runtime
fetch late and you find out at the end.

**The coupled cluster.** Which subsystems are secretly one system. Naming it is mandatory —
without it, "one owner at a time" has nothing to apply to.

**Where bars share a root cause.** Ask explicitly. In one run, unshaded terrain broke
beauty *and* navigability at once — the playing critic kept re-describing the same river
because there was no surface information to tell one place from another. The spec had
assumed those bars would conflict; they had a single cause. Looking for that is worth more
than planning a trade-off.

**Which agent, and ultracode.** Decides how the prompt repeats. See `templates/KICKOFF.md`.

---

## Readiness

Score out of 10 for how well an autonomous loop can execute this. **Never refuse.** A low
score is information; they are entitled to run a 5/10 concept knowing it is one.

| deduction | condition |
|---|---|
| −3 | No reference target at all — not even a named standard the critic can score against |
| −2 | `model-prior`: no external artifact, so no blind A/B and a less independent critic |
| −2 | Nothing checkable without a human once the build is operable |
| −2 | No meaningful second member; the product is a single fixed view |
| −1 | Determinism is unclear or the concept depends on real-time or networked state |
| −1 | Scope very large relative to the target, or the coupled cluster is most of the build |

**Report the deductions, not just the total**, and say what would remove each. Offer two
more minutes fixing the biggest one before writing files — cheap now, expensive at hour
eleven.

---

## Before handing off

```
node tools/validate-spec.mjs
node tools/journal.mjs --next="build round one — the artifact, with the defining feature in it"
node tools/doctor.mjs
```

Fix every ERROR. Warnings are judgement calls: resolve or explain.

## Handoff

**First, the prompt.** Print the block from `KICKOFF.md` in full, composed for their agent
— `/loop` prefix or KEEP GOING section, never both. Say plainly: *send this back and the
run starts; stop any time and say "continue" to resume.* If you used `/loop`, say in one
line that the prefix is what makes it repeat, so they don't helpfully edit it out.

**Then, five lines:**

- Readiness with deductions
- The target, and the act notch where depth becomes breadth
- Which parts a program judges, and which only they can
- What round one will produce — and that they should look at it
- The assumption you are least confident in

Then stop. **Do not begin building.**

---

## Rules

1. **Never write a bar you cannot measure.** If you cannot name the command that produces
   the number, it does not belong in the spec. Put it in `notes.humanJudges` and say so.
2. **Never mark a gauge blocking.** The ratchet is the only rule. A gate that fires early
   stops fidelity work to service a system that is going to be rebuilt anyway.
3. **Never plan a harness.** Two instruments in round one. The rest on demand.
4. **Never silently decide design.** Propose, agree, then write.
5. **Show the target before writing files.** Last cheap moment to change it.
6. **Write hard, specific documents.** The loop reads these hundreds of times. Vague
   language in a binding document becomes drift.
