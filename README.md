# THE ANVIL LOOP

A near-empty repo that turns a game concept into a long autonomous build an agent can
actually get better at — because it is measured, not just critiqued.

## Start

Paste this into any coding agent that has a shell — Claude Code, Codex, Cursor, anything:

> Clone `https://github.com/devsmitt/the-anvil-loop` into `./my-game`, cd into it, delete the
> `.git` folder and run `git init`, then follow `AGENTS.md`.

The agent clones it, reads `AGENTS.md`, and starts asking you about your concept. It ends
by handing you a prompt. **Send that prompt back and the run starts.** Stop whenever you
want — say "continue" and it picks up exactly where it left off.

Or hit **Use this template** on GitHub if you want your own repo with clean history.

**Requires** a coding agent with shell and filesystem access, plus Node ≥ 18. Nothing to
install. Open the cloned folder *itself* as the working directory — not its parent, and
not nested inside another repo, or the agent instructions won't load.

---

## What it is

The known technique for long autonomous builds is: give the agent a real-world quality
bar, split the work, and put a blind critic between the builder and "done."

The hole in it is measurement. A critic with no instrument converges on whatever the
critic finds easy to say — scores climb, artifacts stand still, and nobody finds out for
forty rounds because two runs of the same build never produced the same frame in the first
place.

This repo is that technique with an instrument bolted to it, and with the rules enforced
by programs rather than by asking the agent nicely:

- **`gate.mjs`** reads the exit condition from `anvil.json`, runs each bar's command, and
  answers "are we done." It fingerprints the thresholds and refuses to run if any of them
  get easier, until a human approves the change.
- **`verify-harness.mjs`** proves the measurement rig works before any score is trusted —
  captures reproduce bit-identically, the sweep reports the worst member not the mean, the
  playing critic declares what it had access to, and the drift detector fires when a drift
  is planted.
- **`validate-spec.mjs`** checks the spec itself, including whether the documents still
  agree with each other.
- **`journal.mjs`** writes the numbers into `PROGRESS.md` so they cannot blur into
  adjectives, and detects when the loop is circling.
- **`doctor.mjs`** tells any agent, at any point, where it is and what to do next.

No engine, no starter code, no sample game. Those are decisions about your concept, made
by an agent that has talked to you.

## Credit

The blind-critic-against-a-real-bar technique is Matt Shumer's Gauntlet Loop, shown in
[Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty) and written up
[here](https://somethingbig.ai/gauntlet-loop). The disagreement encoded here is narrow: a
critic is not an instrument, and the difference shows up around hour four.
