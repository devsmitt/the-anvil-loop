#!/usr/bin/env node
/**
 * validate-spec.mjs — checks the definition agent's own output
 *
 * The definition step writes the spec the entire run is judged against. Nothing checked it.
 * A bar with no command, a threshold with no method, an unfilled {{slot}}, or an
 * ownership map that disagrees with anvil.json all fail silently at define time and
 * surface as confusion at hour nine.
 *
 * Runs at the end of definition and again inside verify-harness.mjs.
 *
 *   node tools/validate-spec.mjs [--json]
 */

import { readFileSync, existsSync } from 'node:fs'

const ROOT = process.cwd()
const JSON_OUT = process.argv.includes('--json')
const read = (p) => (existsSync(`${ROOT}/${p}`) ? readFileSync(`${ROOT}/${p}`, 'utf8') : null)

const errors = []
const warns = []
const err = (m) => errors.push(m)
const warn = (m) => warns.push(m)

/* --- the five files exist ---------------------------------------------- */

let spec = null   // declared before any report() call — report() reads spec?.project

const DOCS = ['anvil.json', 'ARCHITECTURE.md', 'HARNESS.md', 'KICKOFF.md', 'PROGRESS.md']
for (const d of DOCS) if (!read(d)) err(`${d} is missing — the definition step did not finish`)
if (errors.length) { report(); process.exit(1) }

try { spec = JSON.parse(read('anvil.json')) }
catch (e) { err(`anvil.json is not valid JSON: ${e.message}`); report(); process.exit(1) }

/* --- no unfilled template slots ---------------------------------------- */

for (const d of DOCS) {
  const text = read(d)
  const slots = [...new Set((text.match(/\{\{[^}]{1,60}\}\}/g) ?? []))]
  if (slots.length) err(`${d} still has ${slots.length} unfilled slot(s): ${slots.slice(0, 6).join(' ')}${slots.length > 6 ? ' …' : ''}`)
}
if (JSON.stringify(spec).includes('$comment')) warn('anvil.json still carries $comment keys from the template — harmless, but clean them out')

/* --- the spec is complete ----------------------------------------------- */

if (!spec.project) err('anvil.json has no project name')
if (!spec.concept) warn('anvil.json has no concept line — status.mjs will render blank')

if (!Array.isArray(spec.bars) || !spec.bars.length) err('anvil.json declares no bars — there is no exit condition')
const ids = new Set()
for (const b of spec.bars ?? []) {
  const at = `bar "${b.id ?? '(unnamed)'}"`
  if (!b.id) err('a bar has no id')
  else if (ids.has(b.id)) err(`duplicate bar id "${b.id}"`)
  else ids.add(b.id)
  if (typeof b.threshold !== 'number') err(`${at} has no numeric threshold`)
  if (!b.command) err(`${at} has no command — it cannot be gated and must move to notes.humanJudges`)
  if (!b.field) warn(`${at} has no field; gate.mjs will look for "value"`)
  if (b.compare && !['>=', '>', '<=', '<', '==', '!='].includes(b.compare)) err(`${at} has invalid compare "${b.compare}"`)
  if (b.kind === 'subjective' && !b.reference) err(`${at} is subjective but names no external reference — INVARIANT 1`)
}

/* --- INVARIANT 5: at least one bar is mechanical ------------------------ */

const mechanical = (spec.bars ?? []).filter((b) => b.kind === 'mechanical' || /player\.mjs/.test(b.command ?? ''))
if (!mechanical.length) err('no mechanical bar — every bar is judged by looking. INVARIANT 5 requires a critic that PLAYS. If this concept genuinely has none, say so in notes.humanJudges and lower the readiness score.')

/* --- INVARIANT 4: coverage ---------------------------------------------- */

if (!spec.coverage?.axis) err('no coverage axis declared — INVARIANT 4')
if (!(spec.coverage?.members > 0)) err('coverage.members must be a positive number')
else if (spec.coverage.members < 4) warn(`coverage axis is only ${spec.coverage.members} member(s) — one bad member will dominate, but a small axis proves little`)
if (spec.coverage && spec.coverage.score !== 'worst') err('coverage.score must be "worst". INVARIANT 4 is not satisfied by a mean.')
if (!spec.coverage?.command) err('coverage has no command — sweep cannot be run')

/* --- INVARIANT 3: determinism ------------------------------------------ */

if (!spec.determinism?.pinned?.length) err('determinism.pinned is empty — name every source of nondeterminism and how it is pinned. INVARIANT 3')

/* --- INVARIANT 5: the player is denied things and handicapped ----------- */

if (!spec.player?.denied?.length) err('player.denied is empty — a critic that can see internal state solves everything and its gate is permanently green')
if (!spec.player?.success) err('player.success is not defined — there is no predicate for "the user succeeded"')
const h = spec.player?.handicap
if (!h || (h.frameMemory == null && h.reactionDelayMs == null)) err('player.handicap is unset — an agent with perfect recall solves what no human could. INVARIANT 5.')

/* --- INVARIANT 10: anchors ---------------------------------------------- */

if (!(spec.anchors?.count > 0)) err('anchors.count must be positive — without a frozen set, critic drift is undetectable')
if (spec.anchors && spec.anchors.maxDrift == null) err('anchors.maxDrift is unset')

/* --- INVARIANT 7: the coupled cluster is named -------------------------- */

if (!spec.coupledCluster?.subsystems?.length) err('coupledCluster.subsystems is empty — INVARIANT 7 has no meaning until this is named. If nothing is coupled, state that in coupledCluster.why and list ["none"].')
else if (!spec.coupledCluster.why) err('coupledCluster names subsystems but no reason — an unexplained cluster gets ignored under time pressure')

/* --- phases ------------------------------------------------------------- */

const phases = spec.phases ?? []
if (!phases.length) err('no phases declared')
else {
  const p0 = phases.find((p) => p.id === 0)
  if (!p0) err('there is no Phase 0 — the harness phase is mandatory')
  else if (p0.productCode !== false) err('Phase 0 must set "productCode": false. No product code before the harness is proven.')
  for (const p of phases) if (!p.exit?.length) err(`phase ${p.id} "${p.name ?? ''}" has no exit criteria`)
}

/* --- the documents agree with each other -------------------------------- */

const arch = read('ARCHITECTURE.md') ?? ''
const harness = read('HARNESS.md') ?? ''
const kickoff = read('KICKOFF.md') ?? ''

for (const b of spec.bars ?? []) {
  if (b.id && !new RegExp(b.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(arch + harness))
    warn(`bar "${b.id}" is in anvil.json but never mentioned in ARCHITECTURE.md or HARNESS.md — the documents disagree`)
  if (b.id && typeof b.threshold === 'number' && !kickoff.includes(String(b.threshold)))
    warn(`threshold ${b.threshold} for "${b.id}" does not appear in KICKOFF.md — the loop prompt and the gate disagree on the target`)
}
for (const s of spec.coupledCluster?.subsystems ?? []) {
  if (s !== 'none' && !arch.toLowerCase().includes(String(s).toLowerCase()))
    warn(`coupled subsystem "${s}" is not in ARCHITECTURE.md's ownership map`)
}
if (!/anvil:auto:state/.test(read('PROGRESS.md') ?? ''))
  err('PROGRESS.md has no <!-- anvil:auto:state --> block — journal.mjs cannot write the machine-owned sections and the loop will lose its memory')

/* --- honesty check ------------------------------------------------------ */

if (!spec.notes?.humanJudges)
  warn('notes.humanJudges is unset. Almost every concept has something the instrument cannot see — say what it is rather than implying full coverage.')

/* ------------------------------------------------------------------------ */

function report() {
  if (JSON_OUT) { console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings: warns }, null, 2)); return }
  console.log(`\n  spec validation${spec?.project ? ` — ${spec.project}` : ''}\n`)
  for (const e of errors) console.log(`  ERROR  ${e}`)
  for (const w of warns) console.log(`  warn   ${w}`)
  if (!errors.length && !warns.length) console.log('  clean')
  console.log(
    errors.length
      ? `\n  ${errors.length} error(s). The spec is not runnable — fix these before starting the run.\n`
      : `\n  Spec is valid${warns.length ? ` (${warns.length} warning(s))` : ''}. Ready to run.\n`
  )
}

report()
process.exit(errors.length ? 1 : 0)
