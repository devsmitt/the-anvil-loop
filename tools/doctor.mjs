#!/usr/bin/env node
/**
 * doctor.mjs — where am I, what next.
 *
 * First thing anyone runs. Works on a bare clone with nothing installed.
 * Also decides which instrument is worth building NEXT — instruments are built when
 * their reading becomes useful, never in a batch up front.
 *
 *   node tools/doctor.mjs [--json]
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const JSON_OUT = process.argv.includes('--json')
const has = (p) => existsSync(`${ROOT}/${p}`)
const badJson = []
const readJson = (p) => {
  if (!has(p)) return null
  try { return JSON.parse(readFileSync(`${ROOT}/${p}`, 'utf8')) }
  catch (e) { badJson.push(`${p}: ${String(e.message).slice(0, 80)}`); return null }
}
const which = (c) => { try { return execSync(`command -v ${c}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null } }

const checks = []
const add = (name, ok, detail, fatal = false) => checks.push({ name, ok, detail, fatal })

add('node >= 18', Number(process.versions.node.split('.')[0]) >= 18, `v${process.versions.node}`, true)
add('git', !!which('git'), which('git') ?? 'not found — history and frozen references are safer with it')

const CORE = [
  'AGENTS.md', 'METHOD.md', 'TOOLS.md', 'DEFINE.md', 'EXAMPLES.md',
  'templates/anvil.json', 'templates/ARCHITECTURE.md', 'templates/KICKOFF.md', 'templates/PROGRESS.md',
  'tools/board.mjs', 'tools/journal.mjs', 'tools/status.mjs',
  'tools/validate-spec.mjs', 'tools/instruments.mjs', '.claude/agents/critic.md',
]
const missing = CORE.filter((f) => !has(f))
add('framework intact', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${CORE.length}/${CORE.length}`, true)

// A run killed mid-write leaves a truncated source file that fails much later with a
// confusing error. Cheap to catch here.
const truncated = []
try {
  for (const f of execSync('ls tools/*.mjs 2>/dev/null || true', { encoding: 'utf8' }).trim().split('\n').filter(Boolean)) {
    try { execSync(`node --check ${f}`, { stdio: 'ignore' }) } catch { truncated.push(f) }
  }
} catch {}
if (truncated.length) add('no truncated files', false, `${truncated.join(', ')} — killed mid-write, rewrite before continuing`)

const spec = readJson('anvil.json')
const state = readJson('.anvil/state.json')
if (badJson.length) add('spec files parse', false, `${badJson.join(' | ')} — repair it; do NOT re-run definition, the spec exists`, true)

/* --- which instrument is worth building next ------------------------------- */

const built = (t) => {
  if (!has(`tools/${t}`)) return false
  const src = readFileSync(`${ROOT}/tools/${t}`, 'utf8')
  return !/NOT[ _]IMPLEMENTED/i.test(src) && statSync(`${ROOT}/tools/${t}`).size >= 200
}

const LADDER = [
  { tool: 'capture.mjs', when: () => true,
    why: 'you cannot climb what you cannot see' },
  { tool: 'critic.mjs', when: () => true,
    why: 'you cannot climb what you cannot score' },
  { tool: 'diff.mjs', when: (s) => (s?.history?.length ?? 0) >= 3 && (s?.noiseFloor == null || s.noiseFloor > 5),
    why: 'the ratchet is only as sensitive as your noise floor, and determinism is how you tighten it' },
  { tool: 'sweep.mjs', when: (s) => (s?.act ?? 1) >= 2,
    why: 'Act II widens the coverage axis' },
  { tool: 'perf.mjs', when: (s) => (s?.history?.length ?? 0) >= 4,
    why: 'fidelity work costs frame time and you are far enough in to want the number' },
  { tool: 'player.mjs', when: (s) => (s?.act ?? 1) >= 2,
    why: 'the artifact is good enough that whether it can be operated now matters' },
  { tool: 'solvable.mjs', when: (s) => (s?.act ?? 1) >= 2 && built('player.mjs'),
    why: 'without it, a player failure cannot be told apart from an impossible task' },
  { tool: 'anchor.mjs', when: (s) => (s?.history?.length ?? 0) >= 6,
    why: 'scores have been moving long enough that critic drift is now a live risk' },
]

const nextInstrument = spec ? LADDER.find((l) => !built(l.tool) && l.when(state)) : null
const pending = spec ? LADDER.filter((l) => !built(l.tool)).map((l) => l.tool) : []

/* --- stage ----------------------------------------------------------------- */

let stage, next
// How long the run has been open with nothing scored. The most expensive habit this
// framework has seen is improving round one for hours instead of recording it.
const hoursOpen = state?.startedAt && !(state?.history?.length)
  ? (Date.now() - Date.parse(state.startedAt)) / 3_600_000
  : null
const lastRound = state?.history?.at(-1)
const floor = state?.noiseFloor ?? 6
const regressed = lastRound && state
  ? Object.entries(lastRound.scores ?? {}).filter(([m, s]) =>
      typeof s === 'number' && typeof state.best?.[m] === 'number' && s < state.best[m] - floor)
  : []

// After a kill, the first question is not "where was I" but "does the product still
// build". A process killed mid-edit leaves source that no longer parses, and an hour spent
// measuring a broken build is indistinguishable from an hour of work until you look.
let buildCheck = null
if (state?.inFlight && spec?.build?.command) {
  try {
    execSync(spec.build.command, { encoding: 'utf8', stdio: 'ignore', timeout: spec.build.timeoutMs ?? 300_000 })
    buildCheck = { ok: true }
  } catch (e) {
    buildCheck = { ok: false, detail: String(e.message).split('\n')[0].slice(0, 120) }
  }
  add('product builds', buildCheck.ok, buildCheck.ok ? spec.build.command : `${buildCheck.detail} — killed mid-edit; repair before measuring anything`)
}

if (state?.inFlight) {
  stage = 'INTERRUPTED'
  next = buildCheck && !buildCheck.ok
    ? `The product does not build. Repair it before anything else — a killed process leaves\n` +
      `  source that no longer parses, and every measurement taken from here is about the break.\n` +
      `    ${spec.build.command}\n` +
      `  Then resume "${state.inFlight.task}" (claimed ${state.inFlight.startedAt}).`
    : `Resume "${state.inFlight.task}" (claimed ${state.inFlight.startedAt}).\n` +
      (spec?.build?.command
        ? `  Build verified.`
        : `  No build.command in the spec — verify by hand that the product still builds and loads\n` +
          `  before you measure anything, then add build.command so this is checked for you.`) + `\n` +
      `  Verify what else actually landed on disk — a killed process leaves partial work.\n` +
      `  Then close it:  node tools/journal.mjs --end`
} else if (badJson.some((b) => b.startsWith('anvil.json'))) {
  stage = 'SPEC CORRUPT'
  next = 'anvil.json exists but does not parse. Repair it from git history.\n  Do NOT re-run the definition conversation — that rewrites the contract this run is judged by.'
} else if (!spec) {
  stage = 'UNDEFINED'
  next = 'No spec yet. Read AGENTS.md and run SITUATION 1 — the definition conversation.'
} else if (regressed.length) {
  stage = 'REGRESSION'
  next = `${regressed.map(([m]) => `"${m}"`).join(', ')} scored below its own best.\n` +
    `  This is the one rule. Stop and tell the human what changed and what you think broke it.`
} else if (!built('capture.mjs') || !built('critic.mjs')) {
  stage = `ROUND ${(state?.round ?? 0) + 1} — first light`
  next = `Build the artifact. ${spec.definingFeature ? `"${spec.definingFeature}" must exist in this round, however crudely.` : ''}\n` +
    `  Then build capture.mjs and critic.mjs — the two you cannot climb without — and score it.\n` +
    `  NO other instruments. They measure things that do not exist yet.\n` +
    `  ONE PASS. Do not tune before the first score — that is the loop's job, and doing it\n` +
    `  by hand costs hours and produces no number anyone can see. See Invariant 13.` +
    (hoursOpen != null && hoursOpen >= 2
      ? `\n\n  !! Round one has been open ${hoursOpen.toFixed(1)}h with nothing recorded.\n` +
        `     Capture what exists, score it, record it — even at 30. A low first score is the\n` +
        `     baseline the ratchet protects, and its findings aim the next round better than\n` +
        `     anything you can decide from here.`
      : '')
} else {
  stage = `Act ${state?.act ?? 1} · round ${(state?.round ?? 0) + 1}`
  next = state?.nextAction ||
    `node tools/board.mjs  —  it names the target member and why.` +
    (nextInstrument ? `\n  Worth building now: tools/${nextInstrument.tool} — ${nextInstrument.why}.` : '')
}

/* --- warnings that predict a bad run --------------------------------------- */

const warnings = []
if (spec) {
  if (!spec.fidelity?.command) warnings.push('no fidelity command — the loop has nothing to climb')
  if (!spec.fidelity?.scale) warnings.push('fidelity scale is uncalibrated — the number means whatever the critic decides that round')
  if (!spec.primaryMember) warnings.push('no primaryMember — Act I has no single thing to take to the target')
  if (!spec.definingFeature) warnings.push('no definingFeature declared — nothing forces the thing that makes this *this* into round one')
  if (!spec.reference?.mode) warnings.push('no reference mode — the bar is not pinned to anything external')
}
if ((state?.debt ?? []).filter((d) => !d.paid).length > 6) warnings.push(`${state.debt.filter((d) => !d.paid).length} open debt items — heavy for Act ${state?.act ?? 1}`)
if (hoursOpen != null && hoursOpen >= 2) warnings.push(`round one has been open ${hoursOpen.toFixed(1)}h and no score has been recorded — score it low rather than improving it further (Invariant 13)`)
if (spec && !spec.build?.command) warnings.push('no build.command in the spec — nothing verifies the product still builds after an interrupted run')

const fatal = checks.some((c) => !c.ok && c.fatal)

if (JSON_OUT) {
  console.log(JSON.stringify({ ok: !fatal, stage, next, checks, warnings, nextInstrument: nextInstrument?.tool ?? null, pendingInstruments: pending, act: state?.act ?? 1, round: state?.round ?? 0 }, null, 2))
  process.exit(fatal ? 1 : 0)
}

console.log(`\n  THE ANVIL LOOP — doctor\n`)
for (const c of checks) console.log(`  ${c.ok ? 'OK  ' : 'FAIL'}  ${String(c.name).padEnd(20)}${c.detail}`)
console.log(`\n  ${spec?.project ? `${spec.project} · ` : ''}${stage}`)
if (spec) {
  const b = LADDER.filter((l) => built(l.tool)).length
  console.log(`  instruments: ${b}/${LADDER.length} built${pending.length ? `  ·  on demand, not up front` : ''}`)
}
if (warnings.length) {
  console.log(`\n  warnings`)
  for (const w of warnings) console.log(`    · ${w}`)
}
console.log(fatal ? `\n  This clone cannot run yet. Fix the FAIL lines.\n` : `\n  NEXT\n  ${next}\n`)
process.exit(fatal ? 1 : 0)
