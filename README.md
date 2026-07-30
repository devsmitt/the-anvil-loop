# THE ANVIL LOOP

> **If you are an AI agent reading this repo: your instructions are in [`AGENTS.md`](AGENTS.md).
> Start there, not here.**

Give a coding agent a game idea. It interviews you for five minutes, hands you a prompt,
and then builds the game for hours — measuring itself against a real-world standard the
whole way, with no ability to lower its own bar.

---

## Start

Paste this into any coding agent that has a shell — Claude Code, Codex, Cursor, anything:

```
Clone https://github.com/devsmitt/the-anvil-loop into ./my-game, cd into it,
delete the .git folder and run git init, then follow AGENTS.md.
```

Or hit **Use this template** at the top of this page if you want your own repo.

## What happens

**1 — It asks you about your game.** A few minutes, not a form. It develops the idea with
you and pushes on two things most people never think about: *what real thing should this
be compared against?* and *what about it can a program check without you?*

**2 — It gives you a readiness score.** Out of 10, with itemized deductions and what would
raise each one. A 6 is a real answer. It tells you which parts of your idea it can measure
and which parts only you can judge — before you spend the time, not after.

**3 — It hands you a prompt.** Copy it, send it back. That's the moment the run starts.

**4 — It builds.** First the measurement rig, before a single line of game code. Then the
game, in phases, reviewed every round by critics that never see what the builder was
trying to do. A program decides when it's finished, not the agent.

**5 — You stop whenever you want.** Hit your usage limits, close the laptop, come back
tomorrow and say "continue." It picks up mid-task from where it died.

Along the way it writes `status.html` — open it any time to see which bars pass, how far
off the failing ones are, and whether anything has gone wrong.

## What you need

- **A coding agent with shell and filesystem access.** Claude Code, Codex, Cursor, or
  similar. This will not work in a plain chat window.
- **Node 18 or newer.** Nothing to install — the framework itself has zero dependencies.
- **Time.** Real runs span hours and usually multiple sessions. That's the point; that's
  also why resume exists.

Open the cloned folder *itself* as your working directory — not its parent, and not nested
inside another repo, or the agent instructions won't load.

## Why not just prompt an agent directly

You can, and it works better than most people expect. The known technique is: give the
agent a real-world quality bar, split the work up, and put a blind critic between the
builder and "done."

The hole in it is measurement. A critic with no instrument drifts toward whatever it finds
easy to say. Scores climb, the work stands still, and nobody notices for hours — because
two runs of the same build never produced the same screenshot in the first place, so every
score was noise from the beginning.

This repo is that technique with an instrument bolted on, and with the rules enforced by
programs instead of by asking the agent nicely:

- The exit condition lives in a file a program reads. The agent doesn't get a vote on
  whether it's done.
- Change a threshold to something easier and the gate **refuses to run** until you
  personally approve it. The loop cannot lower its own bar.
- Before any score is trusted, the measurement rig has to prove two identical runs produce
  identical output — and the drift detector has to catch a fake drift planted to test it.
- One critic has to actually *play* the game with only what a human gets, and declare what
  it had access to. A critic that can peek solves everything forever.
- Progress numbers are written by programs, so "improved the lighting" can't stand in for
  a result.

## What it won't do

- **Judge whether your game is fun.** It measures what can be measured and tells you
  plainly what it can't. Some concepts score a 5 for this reason.
- **Work without a reference.** If there's no real thing to compare against, the loop has
  nothing to converge toward, and it will say so.
- **Finish in one sitting.** Ambitious builds take multiple sessions.
- **Ship you an engine.** There's no starter code here on purpose — the architecture comes
  from *your* concept, decided by an agent that talked to you.

## What's actually in here

Doctrine, contracts, and six small programs. No engine, no sample game.

| | |
|---|---|
| `AGENTS.md` | the operating manual every agent reads |
| `METHOD.md` | the twelve invariants the loop is bound by |
| `TOOLS.md` | contracts for the thirteen tools — six ship, seven get generated |
| `DEFINE.md` | how the opening conversation works |
| `EXAMPLES.md` | worked derivations across six genres |
| `tools/` | doctor · validate-spec · verify-harness · gate · journal · status |
| `templates/` | the shape of what gets written for your project |

## Credit

The blind-critic-against-a-real-bar technique is Matt Shumer's Gauntlet Loop, shown in
[Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty) and written up
[here](https://somethingbig.ai/gauntlet-loop). The disagreement encoded here is narrow: a
critic is not an instrument, and the difference shows up around hour four.
