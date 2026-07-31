# THE ANVIL LOOP

> **If you are an AI agent reading this repo: your instructions are in [`AGENTS.md`](AGENTS.md).
> Start there, not here.**

Give a coding agent a game idea. It interviews you for a few minutes, hands you a prompt,
and then builds — every round making the thing look and play closer to a real reference,
while a board tracks the climb and tells it what to fix next.

---

## Start

Paste this into any coding agent with a shell — Claude Code, Codex, Cursor:

```
Clone https://github.com/devsmitt/the-anvil-loop into ./my-game, cd into it,
delete the .git folder and run git init, then follow AGENTS.md.
```

Or hit **Use this template** at the top of this page.

**Requires** a coding agent with shell and filesystem access and Node ≥ 18. Nothing to
install. Open the cloned folder *itself* as the working directory.

## What happens

**Round one builds the game.** Not a greybox. Not a test harness. Not a plan. The thing —
with whatever makes it *that* game already in it, as good as one pass can make it.

**Every round after makes it better**, aimed by a board that says which part is worst and
*why* it's worst: is one area behind because a technique hasn't been applied there yet, or
is everything stuck against the same ceiling? Those need opposite responses, and knowing
which is the difference between a productive round and a wasted one.

**You watch it in `status.html`** — the frames, next to the reference, with the score
trend. You should never have to ask what it looks like.

**Stop whenever.** Say "continue" and it picks up mid-task from where it died.

## The one rule

**A member may never score below its own best.**

That's the entire blocking surface. Everything else this repo measures — framerate,
playability, determinism, coherence — is a reading on a dashboard. Readings change what
the loop does next. They never stop it.

That distinction is the whole design. A gate that fires in round three stops the work that
matters to service a system that's going to be rebuilt anyway. One run lost three hours
making a player traverse water that was, at the time, a flat blue ribbon that read as
asphalt. The bug was real. The priority was insane.

But a loop with *no* memory can't see the one thing that actually needs catching: round 30
quietly breaking what round 25 had right. So that — and only that — stops everything.

## Why this exists

There's a known technique for getting long autonomous builds out of a coding agent: give
it a real quality bar, split the work, put a blind critic between the builder and "done."
It works, and it produces results that look impossible.

What it can't do is tell you where you are, whether you regressed, whether the critic went
soft, or which of ten things to fix next. This repo adds exactly that — and nothing else,
because everything else turns out to be a brake.

- **The ratchet** catches the regression a critic-only loop can't see.
- **A calibrated ladder** means a score is a real number instead of a mood. `62` against
  described bands says something; `8/10` against nothing does not.
- **Targeting** reads the score history per area and names what to work on, and whether
  the problem is uneven work or a global ceiling.
- **`--saw`** won't record a round until you've opened the frame and said what's in it.
  Every expensive failure this framework has seen was plain in one image and invisible in
  every number.
- **Instruments get built when their reading becomes useful** — two in round one, the rest
  on demand. Building a harness up front means building six tools to measure something
  that doesn't exist yet.
- **Correctness is debt** until the look clears the bar. Logged with evidence, paid later,
  never lost.

## What it won't do

- **Judge whether your game is fun.** It measures what can be measured and names what it
  can't.
- **Work without a reference.** No real thing to converge toward, nothing to climb.
- **Finish in one sitting.** Real runs span sessions. That's what resume is for.
- **Ship you an engine.** No starter code on purpose — the architecture comes from *your*
  concept, decided by an agent that talked to you.

## What's in here

| | |
|---|---|
| `AGENTS.md` | the operating manual every agent reads |
| `METHOD.md` | twelve invariants, and the one rule |
| `TOOLS.md` | instrument contracts, and when to build each |
| `DEFINE.md` | the opening conversation |
| `EXAMPLES.md` | worked derivations across seven genres |
| `tools/` | doctor · board · instruments · journal · status · validate-spec |
| `templates/` | the shape of what gets written for your project |

Six programs, Node standard library only, no install. The generated instruments come later
and they're yours.

## Credit

The core idea — hand an agent a real-world bar, split the work, put a blind critic between
the builder and "done" — is Matt Shumer's Gauntlet Loop, shown in
[Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty) and written up
[here](https://somethingbig.ai/gauntlet-loop). He proved the technique works.

This repo is an attempt at the next step: keep the climb exactly as fast, and give it
memory, calibration, and aim.
