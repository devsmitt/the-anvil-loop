#!/usr/bin/env node
/**
 * doctor.mjs — clone-time preflight
 *
 * The first thing anyone runs. Works on a bare clone with zero configuration and no
 * dependencies installed. Tells you whether this machine can run an Anvil Loop, what
 * state this repo is in, and exactly what to do next.
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
  if (!existsSync(`${ROOT}/${p}`)) return null
  try { return JSON.parse(readFileSync(`${ROOT}/${p}`, 'utf8')) }
  catch (e) { badJson.push(`${p}: ${String(e.message).slice(0, 90)}`); return null }
}
const which = (c) => { try { return execSync(`command -v ${c}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null } }

const checks = []
const add = (name, ok, detail, fatal = false) => checks.push({ name, ok, detail, fatal })

/* --- environment ------------------------------------------------------- */

const major = Number(process.versions.node.split('.')[0])
add('node >= 18', major >= 18, `v${process.versions.node}`, true)
add('git available', !!which('git'), which('git') ?? 'not found — you can still run, but history and anchors are safer with it')

/* --- the repo shipped intact ------------------------------------------- */

const CORE = [
  'AGENTS.md', 'METHOD.md', 'TOOLS.md', 'DEFINE.md', 'EXAMPLES.md',
  'templates/anvil.json', 'templates/ARCHITECTURE.md', 'templates/HARNESS.md',
  'templates/KICKOFF.md', 'templates/PROGRESS.md',
  'tools/gate.mjs', 'tools/verify-harness.mjs', 'tools/validate-spec.mjs',
  'tools/journal.mjs', 'tools/status.mjs', '.claude/agents/critic.md',
]
const missing = CORE.filter((f) => !has(f))
add('framework files intact', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${CORE.length}/${CORE.length} present`, true)

/* --- the shipped programs actually parse -------------------------------- */

const SHIPPED = ['gate.mjs', 'verify-harness.mjs', 'validate-spec.mjs', 'journal.mjs', 'status.mjs', 'doctor.mjs']
let parseErr = null
for (const t of SHIPPED) {
  if (!has(`tools/${t}`)) continue
  try { execSync(`node --check tools/${t}`, { stdio: 'ignore' }) } catch { parseErr = t; break }
}
add('shipped programs parse', !parseErr, parseErr ? `tools/${parseErr} failed node --check` : `${SHIPPED.filter((t) => has(`tools/${t}`)).length} programs OK`, true)

// A run killed mid-write leaves a truncated source file. Nothing else notices until
// something fails much later with a confusing error.
let truncated = []
try {
  for (const f of execSync('ls tools/*.mjs 2>/dev/null || true', { encoding: 'utf8' }).trim().split('\n').filter(Boolean)) {
    try { execSync(`node --check ${f}`, { stdio: 'ignore' }) } catch { truncated.push(f) }
  }
} catch {}
if (truncated.length) add('no truncated files', false, `${truncated.join(', ')} — likely killed mid-write, rewrite before continuing`)

/* --- where this project is --------------------------------------------- */

const spec = readJson('anvil.json')
const verified = has('.anvil/harness-verified.json')
const state = readJson('.anvil/state.json')

const GENERATED = ['capture.mjs', 'sweep.mjs', 'diff.mjs', 'player.mjs', 'budget.mjs', 'anchor.mjs', 'critic.mjs']
const built = GENERATED.filter((t) => {
  if (!has(`tools/${t}`)) return false
  const src = readFileSync(`${ROOT}/tools/${t}`, 'utf8')
  return !/NOT[ _]IMPLEMENTED/i.test(src) && statSync(`${ROOT}/tools/${t}`).size >= 200
})

// A malformed anvil.json must never read as "no spec" — that sends the agent back into
// the definition conversation and rewrites the contract the run is judged against.
if (badJson.length) {
  add('spec files parse', false, `${badJson.join(' | ')} — repair the file; do NOT re-run definition, the spec exists`, true)
}

let stage, next, resuming = false

// An open claim means the previous session was killed mid-task. Resuming there beats
// anything else the state file says.
if (state?.inFlight) {
  resuming = true
  stage = `INTERRUPTED — phase ${state.phase?.id ?? '?'}`
  next = `Resume the interrupted task: "${state.inFlight.task}" (claimed ${state.inFlight.startedAt}).\n` +
    `  First verify what actually landed on disk — a killed process leaves partial work.\n` +
    `  Then finish it and close the claim:  node tools/journal.mjs --end`
} else if (badJson.some((b) => b.startsWith('anvil.json'))) {
  stage = 'SPEC CORRUPT'
  next = 'anvil.json exists but does not parse. Repair it — check git history for the last good copy.\n' +
    '  Do NOT re-run the definition conversation; that would rewrite the contract this run is judged against.'
} else if (!spec) {
  stage = 'UNDEFINED'
  next = 'No spec yet. Read AGENTS.md and run SITUATION 1 — the definition conversation.'
} else if (built.length < GENERATED.length) {
  stage = 'PHASE 0 — harness'
  next = `Build the harness — ${GENERATED.length - built.length} of ${GENERATED.length} tools missing. NO PRODUCT CODE until they exist. See TOOLS.md.`
} else if (!verified) {
  stage = 'PHASE 0 — verification'
  next = 'Run  node tools/verify-harness.mjs  — the harness exists but is unproven. Until it passes, every score is noise.'
} else {
  stage = state?.phase?.name ? `PHASE ${state.phase.id} — ${state.phase.name}` : 'RUNNING'
  next = state?.nextAction || 'No next action was recorded. Run  node tools/gate.mjs  to establish where the bars stand, then continue the phase.'
}

/* --- warnings that predict a bad run ------------------------------------ */

const warnings = []
if (spec) {
  const unmeasurable = (spec.bars ?? []).filter((b) => !b.command)
  if (unmeasurable.length) warnings.push(`${unmeasurable.length} bar(s) have no command and cannot be gated: ${unmeasurable.map((b) => b.id).join(', ')}`)
  if (!spec.coverage?.members) warnings.push('no coverage axis declared — reviews will judge a single instance')
  if (!spec.player?.denied?.length) warnings.push('player denial list is empty — the mechanical critic can see everything and its gate is meaningless')
  if (!spec.coupledCluster?.subsystems?.length) warnings.push('no coupled cluster named — parallel fixes will clobber each other')
}
if (state?.stall?.rounds >= 3) warnings.push(`STALLED — ${state.stall.rounds} gate runs with no improvement on any bar`)
if (state?.drift?.at(-1)?.detected) warnings.push('CRITIC DRIFT DETECTED on the last anchor run — recent score gains are not real')

/* --- output ------------------------------------------------------------- */

const fatalFail = checks.some((c) => !c.ok && c.fatal)

if (JSON_OUT) {
  console.log(JSON.stringify({ ok: !fatalFail, stage, next, resuming, inFlight: state?.inFlight ?? null, checks, warnings, built: built.length, generated: GENERATED.length }, null, 2))
  process.exit(fatalFail ? 1 : 0)
}

console.log(`\n  THE ANVIL LOOP — doctor\n`)
for (const c of checks) console.log(`  ${c.ok ? 'OK  ' : 'FAIL'}  ${c.name.padEnd(26)}${c.detail}`)
console.log(`\n  ${spec?.project ? `${spec.project} · ` : ''}${stage}`)
if (spec) console.log(`  harness: ${built.length}/${GENERATED.length} tools built, ${verified ? 'verified' : 'NOT verified'}`)
if (state?.interrupted?.length) console.log(`  ${state.interrupted.length} previously interrupted task(s) on record`)
if (warnings.length) {
  console.log(`\n  warnings`)
  for (const w of warnings) console.log(`    · ${w}`)
}
console.log(
  fatalFail
    ? `\n  This machine or this clone cannot run the loop yet. Fix the FAIL lines above.\n`
    : `\n  NEXT\n  ${next}\n`
)
process.exit(fatalFail ? 1 : 0)
