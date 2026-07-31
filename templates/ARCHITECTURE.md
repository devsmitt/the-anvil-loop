# {{PROJECT}} — contract

**Every agent reads this before writing code.**

## The concept

{{What this is. What the person does. What a session looks like. What it is not.}}

## The defining feature

**{{The one thing that makes this THIS.}}**

It exists in round one, however crudely, and nothing is optimized before it does. If this
is missing at hour ten, the run has been building something else.

## Direction

{{The aesthetic and feel target. Name the specific reference. State the non-negotiable
characteristics — the things whose absence makes this generic instead of this.}}

{{End with a disqualifying test. e.g. "If a frame could be any forest, it is wrong."}}

## Stack

- {{Engine / renderer / language / build.}}
- {{Dependency policy.}}
- **Asset policy:** {{fully procedural, or licensed/CC0 permitted with provenance logged.}}
  Fully procedural is a real achievement and a hard ceiling — the last stretch toward a
  first-party look is hand-authored art, and generating everything in code rules that out
  by construction. Decide knowingly; it caps where the target can sit.
- **Output shape:** {{single self-contained file, or bundled build.}} Decide now — it
  changes decisions all the way through. An agent that does not know single-file is the
  goal will add a runtime fetch on line 4,000 and you find out at the end.

## Hard rules

1. **You own your directory. Never edit outside it.**
2. **Never import another subsystem's internals.** Reach it at runtime through the
   interface below.
3. {{Dependency rule.}}
4. **No unseeded randomness.** {{Name the sanctioned source.}}
5. **No wall-clock time in behaviour or visuals.** {{Name the sanctioned time source.}}
6. **Nothing built to measure is thrown away.** The scene you build to take a reading is
   round one of the product. Promote it; never rebuild it.
7. **{{Build command}} must pass and {{capture command}} must produce a frame after your
   change.** If you break the boot, nobody can measure anything.

## Subsystem interface

```
{{The contract every subsystem implements — lifecycle, update hooks, teardown.}}
```

{{What the shared context provides. Call out any field that is the ONLY sanctioned source
of something.}}

## Ownership

| id | directory | owns |
|---|---|---|
| {{id}} | {{dir}} | {{responsibilities — ambiguity here becomes a clobber}} |

**Upstream:** {{which subsystem decides what the others merely express.}}

**Shared, owned by the lead:** {{core, entry point, tools, contract documents}}

## The coupled cluster

{{Which subsystems are mutually dependent and must be worked SEQUENTIALLY by one owner,
and why. Naming this is mandatory. If nothing is coupled, say so and justify it.}}

Everything else fans out freely.

## Members

The things that get scored. In Act I only **{{primaryMember}}** matters; Act II widens to
the rest.

| member | what it frames | why it is in the set |
|---|---|---|
| {{id}} | {{...}} | {{...}} |

**Members must be different from each other.** A set where four entries frame the same
view is a smaller set wearing a bigger label. Include the awkward and badly-lit ones — if
every member is a view somebody chose because it looked good, the worst-member score stops
meaning anything.

No debug views. A top-down heightmap is not a member.

## Quality bars

### The climb — {{fidelity id}}

{{What it measures. What the reference is. How comparison happens.}}

Scored on the calibrated ladder in `anvil.json`. Target {{n}}; Act II opens at {{notch}}.

{{Concrete criteria a reviewer can point at. Not "looks good" — the specific properties.}}

### Gauges

{{Everything else: performance, playability, coherence, integrity. Advisory. They inform
the next move; they never stop the loop.}}

### Where the bars share a root cause

{{Name where two bars would be fixed by the same change. In one prior run, unshaded
terrain broke beauty AND navigability at once — the playing critic kept re-describing the
same river because there was no surface information to tell one place from another. The
framework had assumed those bars would conflict; they had a single cause. Look for that
here before assuming a trade-off.}}

## Budget

{{Hard limits, and the measurement method — a budget measured the wrong way reports a
passing number for a failing build.}}

| | target |
|---|---|
| {{metric}} | {{number}} |
