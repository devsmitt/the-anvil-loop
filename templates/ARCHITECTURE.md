# {{PROJECT}} — engine contract

**Every agent must read this before writing code. It is the only coordination mechanism.**

## The concept

{{What this is, in a few paragraphs. What the user does. What the session looks like.
What it is not. Be specific enough that an agent reading only this document builds the
right thing — and short enough that it gets read every time.}}

## Direction

{{The aesthetic, tonal, and feel target. Name the specific real-world reference from the
external bar. State the non-negotiable characteristics — the things that, if missing,
mean this is generic instead of this specific thing.}}

{{End with a disqualifying test. e.g. "If a frame could be any forest, it is wrong."}}

## Stack

- {{Engine / renderer / language / build tool.}}
- {{Dependency policy — what may be added, by whom, under what condition.}}
- {{Asset policy — what may be sourced, licences, where provenance is logged.}}

{{Mark any decision that Phase 0 will settle by measurement as PROVISIONAL, and say which
spike settles it. Do not let agents assume a provisional decision.}}

## Hard rules

{{Rules that make parallel work safe and capture reproducible. Every project needs
determinism rules; the rest are derived. Typical shape:}}

1. **You own your directory. Never edit files outside it.**
2. **Never import another subsystem's internals.** Reach it at runtime through the
   interface below.
3. {{Dependency rule.}}
4. **No unseeded randomness. Anywhere.** {{Name the sanctioned source.}}
5. **No wall-clock time in behaviour or visuals.** {{Name the sanctioned time source.}}
6. {{Per-frame allocation / resource lifetime rules if relevant.}}
7. **{{Build command}} must pass and {{capture command}} must produce output after your
   change.** If you break the boot, nobody else can work.

## Subsystem interface

```
{{The contract every subsystem implements — lifecycle, update hooks, teardown.}}
```

{{What the shared context provides, and the meaning of each field. Call out any field
that is the *only* sanctioned source of something.}}

## Ownership map

| id | directory | owns |
|---|---|---|
| {{id}} | {{dir}} | {{responsibilities — be exhaustive, ambiguity here becomes a clobber}} |

**Upstream:** {{which subsystem decides things the others merely express, if any. State it
explicitly — downstream subsystems must not invent what upstream decides.}}

**Shared, owned by the lead (do not edit):** {{core, entry point, tools, config}}

## Coupled cluster

{{The subsystems that are mutually dependent and must be worked SEQUENTIALLY by a single
owner, and why. Naming this is mandatory — Invariant 7 has no meaning until it is filled
in. If you genuinely have no coupled cluster, say so and justify it.}}

## Cross-subsystem events

| event | payload | emitted by |
|---|---|---|
| {{name}} | {{shape}} | {{owner}} |

If you need an event that is not listed, add a row here in the same commit.

## Shared vocabulary

{{Any enum or taxonomy that multiple subsystems must agree on.}}

## Quality bars

This project is reviewed against **{{N}}** independent bars. Passing one and failing
another is a failure.

### Bar 1 — {{name}}

{{What it measures. What the external reference is. How comparison happens.}}

{{Concrete, checkable criteria. Not "looks good" — the specific properties a reviewer
looks for and can point at.}}

### Bar 2 — {{name}}

{{As above. At least one bar must be mechanical — measured by a program or a playing
agent, not by looking.}}

### Precedence

{{When bars conflict, which wins, and why. State it now, not during the loop.}}

## Budget

{{Hard, measurable limits — performance, size, load time, whatever this concept has. State
the measurement method, because a budget measured the wrong way reports a passing number
for a failing build.}}

| | target |
|---|---|
| {{metric}} | {{number}} |
