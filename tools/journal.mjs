#!/usr/bin/env node
/**
 * journal.mjs — structured state, written only by programs.
 *
 * Agents write prose. Programs write numbers. Free-form status decays into adjectives;
 * this does not.
 *
 *   node tools/journal.mjs                     refresh + re-score anchors for drift
 *   node tools/journal.mjs --no-anchor         refresh without re-scoring anchors
 *   node tools/journal.mjs --begin="<task>"    claim work BEFORE starting it
 *   node tools/journal.mjs --end               close the claim after finishing
 *   node tools/journal.mjs --abandon="<why>"   close it as not done
 *   node tools/journal.mjs --phase=2 --phase-name="visual cluster"
 *   node tools/journal.mjs --next="<the one next action>"
 *   node tools/journal.mjs --note="<what ran, what it returned>"
 *   node tools/journal.mjs --amend=FILE --change="..." --reason="..."
 *   node tools/journal.mjs --json
 *
 * --begin/--end is what makes an interrupted run resumable. A claim left open means
 * the process died mid-task; doctor.mjs reports it as INTERRUPTED and the next session
 * resumes there instead of guessing.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'

const ROOT = process.cwd()
const STATE_DIR = `${ROOT}/.anvil`
const STATE = `${STATE_DIR}/state.json`
const PROGRESS = `${ROOT}/PROGRESS.md`

const args = process.argv.slice(2)
const val = (n) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null }
const JSON_OUT = args.includes('--json')

if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true })

const spec = existsSync(`${ROOT}/anvil.json`) ? JSON.parse(readFileSync(`${ROOT}/anvil.json`, 'utf8')) : null

const blank = {
  version: 1,
  project: spec?.project ?? null,
  phase: { id: 0, name: spec?.phases?.[0]?.name ?? 'harness' },
  iteration: 0,
  nextAction: null,
  inFlight: null,   // open work claim; non-null on resume means the last run was killed
  interrupted: [],  // claims that were found open by a later session
  history: [],      // written by gate.mjs
  drift: [],        // ingested from anchor.mjs below
  amendments: [],   // written here, by agents, with a reason
  log: [],
  stall: { rounds: 0, since: null },
}

// A truncated state file is worse than none — it takes the loop's memory with it.
let loaded = null
if (existsSync(STATE)) {
  try { loaded = JSON.parse(readFileSync(STATE, 'utf8')) }
  catch {
    if (existsSync(`${STATE}.bak`)) { try { loaded = JSON.parse(readFileSync(`${STATE}.bak`, 'utf8')) } catch {} }
    console.error(`\n  state.json was unreadable${loaded ? ' — recovered from .bak' : ' and no backup existed'}.\n`)
  }
}
const state = { ...blank, ...(loaded ?? {}) }
const stamp = new Date().toISOString()

// Atomic: write a temp file then rename. A kill mid-write cannot corrupt state.
const saveState = () => {
  if (existsSync(STATE)) { try { writeFileSync(`${STATE}.bak`, readFileSync(STATE)) } catch {} }
  writeFileSync(`${STATE}.tmp`, JSON.stringify(state, null, 2))
  renameSync(`${STATE}.tmp`, STATE)
}

/* --- mutations ---------------------------------------------------------- */

let touched = false

// Derive the current iteration up front — notes and claims are stamped with it.
state.iteration = (state.history?.length ?? 0) || state.iteration

/* --- work claims: the resume mechanism ---------------------------------- */

if (val('begin') != null) {
  if (state.inFlight) {
    state.interrupted.push({ ...state.inFlight, foundAt: stamp })
    console.log(`\n  Previous claim was never closed: "${state.inFlight.task}" (started ${state.inFlight.startedAt}).\n  Recorded as interrupted.\n`)
  }
  state.inFlight = { task: val('begin'), startedAt: stamp, phase: state.phase.id }
  touched = true
}
if (args.includes('--end')) {
  if (state.inFlight) state.log.push({ iteration: state.iteration, at: stamp, phase: state.phase.id, note: `completed: ${state.inFlight.task}` })
  state.inFlight = null
  touched = true
}
if (val('abandon') != null) {
  if (state.inFlight) state.interrupted.push({ ...state.inFlight, abandonedAt: stamp, reason: val('abandon') })
  state.inFlight = null
  touched = true
}

if (val('phase') != null) {
  const id = Number(val('phase'))
  const name = val('phase-name') ?? spec?.phases?.find((p) => p.id === id)?.name ?? state.phase.name
  state.phase = { id, name, enteredAt: stamp }
  touched = true
}
if (val('next') != null) { state.nextAction = val('next'); touched = true }
if (val('note') != null) {
  state.log.push({ iteration: state.iteration, at: stamp, phase: state.phase.id, note: val('note') })
  touched = true
}
if (val('amend') != null) {
  const change = val('change'), reason = val('reason')
  if (!change || !reason) {
    console.error('\n  --amend requires --change= and --reason=. An unexplained amendment is how a run drifts.\n')
    process.exit(2)
  }
  state.amendments.push({ iteration: state.iteration, at: stamp, document: val('amend'), change, reason })
  touched = true
}

/* --- ingest anchor drift ------------------------------------------------ *
 * anchor.mjs reports drift; nothing was recording it, so the drift table
 * would have stayed empty forever and critic softening would go unnoticed.
 * The journal runs it and records the answer itself — the loop is not asked
 * to remember, so it cannot forget.
 * ----------------------------------------------------------------------- */

// Only on a plain refresh. The iteration close-out calls this four times; re-scoring the
// frozen set on each would quadruple the cost of every iteration for one useful answer.
const mutating = ['begin', 'end', 'abandon', 'phase', 'next', 'note', 'amend']
  .some((f) => args.includes(`--${f}`) || args.some((a) => a.startsWith(`--${f}=`)))
if (!mutating && !args.includes('--no-anchor') && existsSync(`${ROOT}/tools/anchor.mjs`)) {
  try {
    const { execSync } = await import('node:child_process')
    const out = execSync('node tools/anchor.mjs --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 900_000 })
    const line = out.trim().split('\n').reverse().find((l) => l.trim().startsWith('{'))
    const a = line ? JSON.parse(line) : null
    if (a && 'driftDetected' in a) {
      const prev = state.drift.at(-1)
      const entry = {
        iteration: (state.history?.length ?? 0) || state.iteration,
        at: stamp,
        original: a.original ?? a.originalMean ?? null,
        current: a.current ?? a.currentMean ?? null,
        drift: a.drift ?? null,
        detected: a.driftDetected === true,
      }
      if (!prev || prev.iteration !== entry.iteration) { state.drift.push(entry); touched = true }
      else state.drift[state.drift.length - 1] = entry
    }
  } catch { /* anchor not built yet, or failed — never block the journal */ }
}

/* --- derived: stall detection ------------------------------------------- *
 * Three gate runs with no improvement on ANY bar means the loop is circling.
 * Nothing else in the system notices this, and a human watching a long run
 * will not spot it either.
 * ----------------------------------------------------------------------- */

const hist = state.history ?? []

const improved = (a, b) => {
  if (!a || !b) return true
  const bars = Object.keys(b.bars ?? {})
  return bars.some((k) => {
    const prev = a.bars?.[k], now = b.bars?.[k]
    if (typeof prev !== 'number' || typeof now !== 'number') return false
    const dir = (spec?.bars?.find((x) => x.id === k)?.compare ?? '>=').startsWith('>')
    return dir ? now > prev : now < prev
  })
}

let stallRounds = 0
for (let i = hist.length - 1; i > 0; i--) {
  if (improved(hist[i - 1], hist[i])) break
  stallRounds++
}
state.stall = { rounds: stallRounds, since: stallRounds ? hist[hist.length - stallRounds]?.at ?? null : null }

const lastDrift = state.drift?.at(-1) ?? null

/* --- write state -------------------------------------------------------- */

state.project = spec?.project ?? state.project
state.updatedAt = stamp
saveState()

/* --- regenerate the machine-owned blocks of PROGRESS.md ----------------- */

const fmt = (n) => (typeof n === 'number' ? (Number.isInteger(n) ? String(n) : n.toFixed(2)) : '—')

const barIds = spec?.bars?.map((b) => b.id) ?? []
const last = hist.at(-1)

const stateBlock = `
**Phase ${state.phase.id} — ${state.phase.name}**  ·  iteration ${state.iteration}${
  state.stall.rounds >= 3 ? `  ·  **STALLED (${state.stall.rounds} rounds, no bar improved)**` : ''
}${lastDrift?.detected ? `  ·  **CRITIC DRIFT DETECTED**` : ''}

${state.inFlight ? `**IN FLIGHT:** ${state.inFlight.task} — claimed ${state.inFlight.startedAt.slice(0, 16).replace('T', ' ')}. If no session is running, this was interrupted: verify what exists on disk, then finish it.` : ''}

${state.nextAction ? `**Next action:** ${state.nextAction}` : '_No next action recorded. Set one with `node tools/journal.mjs --next="..."` before you finish._'}

${last ? `Last gate: ${last.passing}/${last.total} bars passing (${last.at.slice(0, 16).replace('T', ' ')})` : 'No gate has been run yet.'}
`.trim()

const gateBlock = hist.length
  ? [
      `| iteration | ${barIds.join(' | ')} | passing | worst member |`,
      `|---|${barIds.map(() => '---|').join('')}---|---|`,
      ...hist.slice(-20).map((h) =>
        `| ${h.iteration} | ${barIds.map((id) => fmt(h.bars?.[id])).join(' | ')} | ${h.passing}/${h.total} | ${h.worstMember ?? '—'} |`
      ),
    ].join('\n')
  : '_No gate runs recorded. `gate.mjs` records each run; this table renders them._'

const driftBlock = state.drift?.length
  ? [
      `| iteration | anchor mean, original | anchor mean, now | drift | flagged |`,
      `|---|---|---|---|---|`,
      ...state.drift.slice(-10).map((d) => `| ${d.iteration} | ${fmt(d.original)} | ${fmt(d.current)} | ${fmt(d.drift)} | ${d.detected ? '**YES**' : 'no'} |`),
    ].join('\n')
  : '_No anchor runs recorded. Run `node tools/anchor.mjs` before believing a rising score._'

const amendBlock = state.amendments?.length
  ? [
      `| iteration | document | change | reason |`,
      `|---|---|---|---|`,
      ...state.amendments.slice(-20).map((a) => `| ${a.iteration} | \`${a.document}\` | ${a.change} | ${a.reason} |`),
    ].join('\n')
  : '_No amendments. Methods may be sharpened; exit numbers may not._'

const logBlock = state.log?.length
  ? state.log.slice(-25).map((l) => `- **it. ${l.iteration}** (phase ${l.phase}) — ${l.note}`).join('\n')
  : '_No entries._'

const BLOCKS = { state: stateBlock, gate: gateBlock, drift: driftBlock, amendments: amendBlock, log: logBlock }

let md = existsSync(PROGRESS) ? readFileSync(PROGRESS, 'utf8') : null
if (md == null) {
  md = `# ${state.project ?? 'project'} — progress\n\n` +
    `The loop's memory. Blocks marked \`anvil:auto\` are written by \`tools/journal.mjs\` — do not\n` +
    `edit inside them, your edits are overwritten. Everything outside them is yours.\n\n` +
    Object.keys(BLOCKS).map((k) => `## ${k}\n\n<!-- anvil:auto:${k} -->\n<!-- /anvil:auto:${k} -->\n`).join('\n')
}

const rewritten = []
for (const [key, body] of Object.entries(BLOCKS)) {
  const re = new RegExp(`(<!--\\s*anvil:auto:${key}\\s*-->)([\\s\\S]*?)(<!--\\s*/anvil:auto:${key}\\s*-->)`)
  if (re.test(md)) { md = md.replace(re, `$1\n${body}\n$3`); rewritten.push(key) }
  else { md += `\n\n## ${key}\n\n<!-- anvil:auto:${key} -->\n${body}\n<!-- /anvil:auto:${key} -->\n`; rewritten.push(`${key} (added)`) }
}

writeFileSync(PROGRESS, md)

/* --- output ------------------------------------------------------------- */

const alerts = []
if (state.inFlight) alerts.push(`IN FLIGHT — "${state.inFlight.task}" is claimed and not closed. If no session is running, it was interrupted. Verify what is on disk before continuing it.`)
if (state.stall.rounds >= 3) alerts.push(`STALLED — ${state.stall.rounds} gate runs with no improvement on any bar. Change the approach, not the threshold.`)
if (lastDrift?.detected) alerts.push('CRITIC DRIFT — frozen anchors are scoring higher than they originally did. Recent gains are not real. Replace the critic and re-score.')
if (!state.nextAction) alerts.push('No next action recorded. A fresh session will not know where to resume.')

if (JSON_OUT) {
  console.log(JSON.stringify({ ok: true, phase: state.phase, iteration: state.iteration, inFlight: state.inFlight, stall: state.stall, alerts, rewritten }, null, 2))
  process.exit(0)
}

console.log(`\n  journal — phase ${state.phase.id} (${state.phase.name}), iteration ${state.iteration}`)
console.log(`  PROGRESS.md blocks rewritten: ${rewritten.join(', ')}`)
if (touched) console.log(`  state updated`)
for (const a of alerts) console.log(`\n  !! ${a}`)
console.log('')
