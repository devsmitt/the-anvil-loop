#!/usr/bin/env node
/**
 * validate-spec.mjs — check the definition's own output.
 *
 * The spec is the contract a long autonomous run is judged by. Nothing else checks it.
 *
 *   node tools/validate-spec.mjs [--json]
 */

import { readFileSync, existsSync } from 'node:fs'

const ROOT = process.cwd()
const JSON_OUT = process.argv.includes('--json')
const read = (p) => (existsSync(`${ROOT}/${p}`) ? readFileSync(`${ROOT}/${p}`, 'utf8') : null)

const errors = []; const warns = []
const err = (m) => errors.push(m); const warn = (m) => warns.push(m)

let spec = null   // declared before any report() call — report() reads spec?.project

const DOCS = ['anvil.json', 'ARCHITECTURE.md', 'KICKOFF.md', 'PROGRESS.md']
for (const d of DOCS) if (!read(d)) err(`${d} is missing — the definition step did not finish`)
if (errors.length) { report(); process.exit(1) }

try { spec = JSON.parse(read('anvil.json')) }
catch (e) { err(`anvil.json is not valid JSON: ${e.message}`); report(); process.exit(1) }

for (const d of DOCS) {
  const slots = [...new Set((read(d).match(/\{\{[^}]{1,60}\}\}/g) ?? []))].filter((s) => s !== '{{member}}')
  if (slots.length) err(`${d} still has ${slots.length} unfilled slot(s): ${slots.slice(0, 6).join(' ')}${slots.length > 6 ? ' …' : ''}`)
}
if (JSON.stringify(spec).includes('$comment')) warn('anvil.json still carries $comment keys from the template')

if (!spec.project) err('no project name')
if (!spec.concept) warn('no concept line — the dashboard renders blank')

/* --- the defining feature must exist in round one -------------------------- */
if (!spec.definingFeature)
  err('no definingFeature — nothing forces the thing that makes this *this* into round one. Runs have reached hour ten with the defining feature untouched.')

/* --- a round has to be able to end ------------------------------------------- */
const budget = spec.round?.budgetMinutes
if (budget == null)
  warn('no round.budgetMinutes — nothing reports how long the loop has gone without producing a score, and that is how two runs reached six hours with zero scores (Invariant 16)')
else if (typeof budget !== 'number')
  err('round.budgetMinutes must be a number of minutes')
else if (budget > 180)
  warn(`round.budgetMinutes is ${budget} — that is long enough to hide a pipeline. A round is one owner, one pass, one score; if a round genuinely needs three hours, the round is too big.`)

/* --- the product must be buildable, checkably -------------------------------- */
if (!spec.build?.command)
  warn('no build.command — nothing verifies the product still builds after an interrupted run. A process killed mid-edit leaves source that will not parse, and an hour spent measuring a broken build is indistinguishable from an hour of work.')
else if (/\{\{/.test(spec.build.command))
  err('build.command still holds a template slot')

/* --- measurement has to be affordable ---------------------------------------- */
const wr = spec.capture?.workingResolution
if (!wr) warn('no capture.workingResolution — nothing declares the cheap resolution to iterate at, and full-res iteration multiplies the only cost that matters')
else if (Array.isArray(wr) && wr[0] > 1280)
  warn(`capture.workingResolution is ${wr[0]}×${wr[1]} — that is a keep-the-frame resolution, not an iterate-at resolution. A critic does not score more accurately at 1080p.`)

/* --- the climb -------------------------------------------------------------- */
const f = spec.fidelity
if (!f) err('no fidelity bar — the loop has nothing to climb')
else {
  if (!f.command) err('fidelity has no command — nothing can be scored')
  else if (!/\{\{member\}\}/.test(f.command)) warn('fidelity.command has no {{member}} placeholder — every member will score the same thing')
  if (typeof f.target !== 'number') err('fidelity.target must be a number')
  if (typeof f.actNotch !== 'number') warn('no fidelity.actNotch — nothing promotes the run from Act I to Act II')
  else if (typeof f.target === 'number' && f.actNotch >= f.target) err('actNotch must be below target — it is the point where you stop going deep and start going wide')

  const bands = Object.keys(f.scale ?? {}).filter((k) => /^-?\d+(\.\d+)?$/.test(k))
  if (!bands.length) err('fidelity has no "scale" — the numbers are uncalibrated, so the target means whatever the critic decides each round, and it drifts upward')
  else if (bands.length < 3) warn(`only ${bands.length} calibrated band(s); describe at least three so a build can be placed between them`)
  else if (typeof f.target === 'number') {
    const floors = bands.map(Number).sort((a, b) => a - b)
    if (f.target < floors[0]) warn(`target ${f.target} sits below every described band (lowest ${floors[0]})`)
  }
}

/* --- the bar ---------------------------------------------------------------- */
const MODES = ['artifact', 'sourced', 'model-prior']
const r = spec.reference
if (!r?.mode) err('no reference.mode — declare one of ' + MODES.join(' | '))
else if (!MODES.includes(r.mode)) err(`invalid reference.mode "${r.mode}"`)
else {
  if (!r.target && !r.path) err('reference names neither a target nor a path — there is nothing external to converge toward')
  if (r.mode === 'model-prior') warn('reference.mode "model-prior" — no external artifact, so blind A/B is impossible and the critic shares the builder\'s prior. Allowed, it works, and the readiness score must carry the -2.')
  if (r.mode !== 'model-prior' && r.path && !existsSync(`${ROOT}/${r.path}`)) err(`reference.path "${r.path}" does not exist — the bar must be frozen on disk before the first score`)
}

/* --- depth before breadth --------------------------------------------------- */
if (!spec.primaryMember) err('no primaryMember — Act I takes exactly one member to the notch, and this names it')
else if (Array.isArray(spec.members) && spec.members.length && !spec.members.includes(spec.primaryMember))
  err(`primaryMember "${spec.primaryMember}" is not in members`)
if (Array.isArray(spec.members) && spec.members.length === 1) warn('only one member declared — Act II has nothing to widen to')

/* --- gauges must be gauges -------------------------------------------------- */
for (const g of spec.gauges ?? []) {
  if (!g.id) err('a gauge has no id')
  if (g.blocking === true) err(`gauge "${g.id}" is marked blocking — gauges report, they do not stop the loop. The ratchet is the only blocking rule.`)
  if (g.command && !g.field) warn(`gauge "${g.id}" has no field; "value" will be assumed`)
}
if (!(spec.gauges ?? []).length) warn('no gauges declared — nothing but fidelity will ever be measured')

/* --- the player, if there is one -------------------------------------------- */
if (spec.player) {
  if (!spec.player.denied?.length) err('player.denied is empty — a critic that can see internal state solves everything and its reading is meaningless')
  if (!spec.player.success) err('player.success is not defined — there is no predicate for "the user succeeded"')
  const h = spec.player.handicap
  if (!h || (h.frameMemory == null && h.reactionDelayMs == null)) err('player.handicap is unset — an agent with perfect recall succeeds where no human could')
}

/* --- documents agree with each other ---------------------------------------- */
const arch = read('ARCHITECTURE.md') ?? ''
const kick = read('KICKOFF.md') ?? ''
if (spec.definingFeature && !arch.toLowerCase().includes(String(spec.definingFeature).toLowerCase().slice(0, 14)))
  warn(`definingFeature "${spec.definingFeature}" is not described in ARCHITECTURE.md`)
if (spec.primaryMember && !kick.includes(spec.primaryMember))
  warn(`primaryMember "${spec.primaryMember}" never appears in KICKOFF.md — the prompt and the spec disagree about what Act I climbs`)
if (typeof f?.target === 'number' && !kick.includes(String(f.target)))
  warn(`target ${f.target} does not appear in KICKOFF.md`)
if (!/anvil:auto:state/.test(read('PROGRESS.md') ?? ''))
  err('PROGRESS.md has no <!-- anvil:auto:state --> block — journal.mjs cannot write it and the loop loses its memory')

/* --- the prompt must be able to repeat -------------------------------------- */
const loopPrefix = /^\s*\/loop\b/m.test(kick)
const loopSection = /^\s*KEEP GOING\s*$/m.test(kick)
if (!loopPrefix && !loopSection)
  err('KICKOFF.md has no repeat mechanism — no `/loop` prefix and no KEEP GOING section. It would run one round and stop.')
if (loopPrefix && loopSection)
  err('KICKOFF.md has BOTH a `/loop` prefix and a KEEP GOING section. Ship one.')

/* --- honesty ----------------------------------------------------------------- */
if (!spec.notes?.humanJudges)
  warn('notes.humanJudges is unset. Almost every concept has something the instrument cannot see — name it rather than implying full coverage.')

function report() {
  if (JSON_OUT) { console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings: warns }, null, 2)); return }
  console.log(`\n  spec validation${spec?.project ? ` — ${spec.project}` : ''}\n`)
  for (const e of errors) console.log(`  ERROR  ${e}`)
  for (const w of warns) console.log(`  warn   ${w}`)
  if (!errors.length && !warns.length) console.log('  clean')
  console.log(errors.length
    ? `\n  ${errors.length} error(s). Fix these before the run starts.\n`
    : `\n  Spec is valid${warns.length ? ` (${warns.length} warning(s))` : ''}. Ready.\n`)
}

report()
process.exit(errors.length ? 1 : 0)
