# {{PROJECT}} — progress

The loop's memory. Every iteration reads this first and updates it before finishing.

**The blocks between `<!-- anvil:auto:* -->` markers are written by `tools/journal.mjs`.
Do not edit inside them — your edits are overwritten on the next run.** Everything
outside them is yours to write.

That split is deliberate. Agents write prose; programs write numbers. Hand an agent a
free-form status file and by iteration thirty the numbers have turned into adjectives.

---

## State

<!-- anvil:auto:state -->
_Run `node tools/journal.mjs` to populate._
<!-- /anvil:auto:state -->

---

## Decisions on record

Settled. Do not re-litigate. Anything not listed here is still open.
**This section is yours — the loop writes it by hand, because a decision needs a reason
and a reason is prose.**

| decision | value | basis |
|---|---|---|
| {{decision}} | **UNDECIDED** | {{what will settle it}} |

---

## Gate history

`tools/gate.mjs` records every run into `.anvil/state.json`; `tools/journal.mjs` renders
it here. Every run, every number, no exceptions.

<!-- anvil:auto:gate -->
_No gate runs recorded yet._
<!-- /anvil:auto:gate -->

---

## Critic drift

A rising score on frozen anchors is instrument failure, not progress.

<!-- anvil:auto:drift -->
_No anchor runs recorded yet._
<!-- /anvil:auto:drift -->

---

## Amendments to the plan

Methods may be sharpened. Exit numbers may not — `gate.mjs` enforces that mechanically.
Recorded via `node tools/journal.mjs --amend=FILE --change="..." --reason="..."`.

<!-- anvil:auto:amendments -->
_None._
<!-- /anvil:auto:amendments -->

---

## Log

One short note per iteration, via `node tools/journal.mjs --note="..."`.
Hard numbers, not adjectives. What you ran, what it returned.

<!-- anvil:auto:log -->
_No entries._
<!-- /anvil:auto:log -->

---

## Working notes

Free space. Anything that helps the next session pick up without re-deriving what this
one already worked out — dead ends, things that looked promising and weren't, the reason
behind a non-obvious choice.
