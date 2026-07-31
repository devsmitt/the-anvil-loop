#!/usr/bin/env node
/**
 * board.mjs — the readout.
 *
 * This is where the loop finds out where it stands and what to work on next. It runs
 * every measure the project has defined, records the round, and points at the next
 * target.
 *
 * IT DOES NOT BLOCK. Every number here is a gauge. The single exception is the ratchet:
 * a member scoring below its own recorded best stops the loop and asks a human, because
 * that is the one failure an unmeasured loop genuinely cannot see.
 *
 *   node tools/board.mjs                          print the readout (no measuring)
 *   node tools/board.mjs --record --saw="..."     measure, record, check the ratchet
 *   node tools/board.mjs --calibrate              measure the noise floor
 *   node tools/board.mjs --json
 *
 * --saw is required by --record and it is not ceremony. One line describing what the
 * frame ACTUALLY SHOWS. Every expensive failure in this framework's history was plain in
 * a single image and invisible in every number.
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'

const ROOT = process.cwd()
const STATE_DIR = `${ROOT}/.anvil`
const STATE = `${STATE_DIR}/state.json`

const args = process.argv.slice(2)
const has = (n) => args.includes(`--${n}`)
const val = (n) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null }
const JSON_OUT = has('json')

const die = (msg, code = 2) => {
  if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: msg }))
  else console.error(`\n  ${msg}\n`)
  process.exit(code)
}

if (!existsSync(`${ROOT}/anvil.json`)) die('anvil.json not found — see AGENTS.md, SITUATION 1.')

let spec
try { spec = JSON.parse(readFileSync(`${ROOT}/anvil.json`, 'utf8')) }
catch (e) { die(`anvil.json does not parse: ${e.message}\n  Repair it. Do not re-run definition — the spec exists.`) }

if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true })

/* ---------------------------------------------------------------- state ---- */

const blank = {
  version: 2,
  act: spec.act ?? 1,
  round: 0,
  best: {},          // member -> best score ever recorded
  history: [],       // one entry per recorded round
  gaugeHistory: [],
  debt: [],
  inFlight: null,
  nextAction: null,
  noiseFloor: null,
  approvedRegressions: [],
}

let loaded = null
let RECOVERED = false
if (existsSync(STATE)) {
  try { loaded = JSON.parse(readFileSync(STATE, 'utf8')) }
  catch {
    if (existsSync(`${STATE}.bak`)) { try { loaded = JSON.parse(readFileSync(`${STATE}.bak`, 'utf8')); RECOVERED = true } catch {} }
    console.error(`\n  state.json was unreadable${loaded ? ' — recovered from .bak' : ' and no backup existed'}.\n`)
  }
}
const state = { ...blank, ...(loaded ?? {}) }
// Recovery has to land on disk immediately. Recovering in memory and not writing back
// leaves the corrupt file for the next tool, which may not be as careful.
if (RECOVERED) { try { writeFileSync(`${STATE}.tmp`, JSON.stringify(state, null, 2)); renameSync(`${STATE}.tmp`, STATE); console.error('  Recovered state written back to disk.\n') } catch {} }

const save = () => {
  if (existsSync(STATE)) { try { writeFileSync(`${STATE}.bak`, readFileSync(STATE)) } catch {} }
  writeFileSync(`${STATE}.tmp`, JSON.stringify(state, null, 2))
  renameSync(`${STATE}.tmp`, STATE)
}

/* ------------------------------------------------------------- measuring --- */

const lastJson = (text) => {
  const lines = String(text).trim().split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim()
    if (l.startsWith('{') || l.startsWith('[')) { try { return JSON.parse(l) } catch {} }
  }
  try { return JSON.parse(text) } catch { return null }
}

const pick = (o, path) => String(path).split('.').reduce((a, k) => (a == null ? a : a[k]), o)

const run = (cmd, timeoutMs = 3_600_000) =>
  execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: timeoutMs })

/** Active members: Act I climbs exactly one. Act II uses the whole axis. */
const activeMembers = () => {
  if ((state.act ?? 1) < 2) return [spec.primaryMember].filter(Boolean)
  const all = spec.members ?? []
  return all.length ? all : [spec.primaryMember].filter(Boolean)
}

function measureFidelity(member) {
  const f = spec.fidelity
  if (!f?.command) return { member, score: null, note: 'no fidelity command declared' }
  const cmd = f.command.replaceAll('{{member}}', member)
  try {
    const parsed = lastJson(run(cmd, f.timeoutMs ?? 3_600_000))
    if (!parsed) return { member, score: null, note: 'instrument emitted no JSON' }
    const raw = pick(parsed, f.field ?? 'score')
    if (typeof raw !== 'number') return { member, score: null, note: `field "${f.field ?? 'score'}" missing or not a number` }
    return { member, score: raw, band: parsed.band ?? null, findings: parsed.findings ?? [] }
  } catch (e) {
    return { member, score: null, note: `instrument failed: ${String(e.message).split('\n')[0].slice(0, 110)}` }
  }
}

function measureGauges() {
  const out = []
  for (const g of spec.gauges ?? []) {
    const r = { id: g.id, value: null, target: g.target ?? null, compare: g.compare ?? '>=', note: '' }
    if (!g.command) { r.note = 'not built'; out.push(r); continue }
    try {
      const parsed = lastJson(run(g.command, g.timeoutMs ?? 3_600_000))
      if (!parsed) { r.note = 'emitted no JSON'; out.push(r); continue }
      const raw = pick(parsed, g.field ?? 'value')
      if (typeof raw !== 'number') { r.note = `field "${g.field ?? 'value'}" missing`; out.push(r); continue }
      r.value = raw
    } catch (e) {
      const blob = `${e.message ?? ''}\n${e.stderr ?? ''}`
      r.note = /Cannot find module|ENOENT|No such file/i.test(blob)
        ? 'not built'
        : `failed: ${String(e.message).split('\n')[0].slice(0, 70)}`
    }
    out.push(r)
  }
  return out
}

const passes = (v, op, t) => {
  if (typeof v !== 'number' || typeof t !== 'number') return null
  return ({ '>=': v >= t, '>': v > t, '<=': v <= t, '<': v < t, '==': v === t, '!=': v !== t }[op] ?? null)
}

/* ------------------------------------------------------------ calibrate ---- */

if (has('calibrate')) {
  const member = val('member') || spec.primaryMember
  if (!member) die('no member to calibrate against')
  console.log(`\n  Calibrating the ratchet noise floor on "${member}".`)
  console.log(`  Scoring the SAME unchanged build twice — the spread is the floor.\n`)
  const a = measureFidelity(member)
  const b = measureFidelity(member)
  if (typeof a.score !== 'number' || typeof b.score !== 'number') {
    die(`could not score twice — ${a.note || b.note || 'unknown'}`)
  }
  const spread = Math.abs(a.score - b.score)
  const floor = Math.max(2, Math.ceil(spread * 1.5))
  state.noiseFloor = floor
  save()
  console.log(`  run 1: ${a.score}    run 2: ${b.score}    spread: ${spread}`)
  console.log(`  noise floor set to ${floor}.\n`)
  console.log(`  A tighter floor makes the ratchet more sensitive. Deterministic capture`)
  console.log(`  is how you tighten it — that is what determinism buys, and the only`)
  console.log(`  reason to spend a round on it.\n`)
  process.exit(0)
}

/* --------------------------------------------------------------- record ---- */

let regression = null

if (has('record')) {
  const saw = val('saw')
  if (!saw || saw.trim().length < 12) {
    die(
      'RECORD REFUSED — --saw is required.\n\n' +
      '  Open the frame you just changed and describe in one line what it ACTUALLY shows.\n' +
      '  Not what you intended. What is in the image.\n\n' +
      '  node tools/board.mjs --record --saw="trunks read as flat cylinders, no bark relief; ferns clip the ground"\n\n' +
      '  This is not ceremony. Every expensive failure in this framework was plain in one\n' +
      '  image and invisible in every number.',
      4,
    )
  }

  const members = activeMembers()
  if (!members.length) die('no active members — anvil.json declares no primaryMember')

  const results = members.map(measureFidelity)
  const gauges = measureGauges()

  const floor = state.noiseFloor ?? 6
  const drops = []
  for (const r of results) {
    if (typeof r.score !== 'number') continue
    const best = state.best[r.member]
    if (typeof best === 'number' && r.score < best - floor) {
      drops.push({ member: r.member, best, now: r.score, lost: +(best - r.score).toFixed(2) })
    }
  }

  state.round = (state.history.length ?? 0) + 1
  const entry = {
    round: state.round,
    at: new Date().toISOString(),
    act: state.act,
    saw: saw.trim(),
    scores: Object.fromEntries(results.map((r) => [r.member, r.score])),
    notes: Object.fromEntries(results.filter((r) => r.note).map((r) => [r.member, r.note])),
    gauges: Object.fromEntries(gauges.map((g) => [g.id, g.value])),
  }
  state.history.push(entry)
  state.gaugeHistory.push({ round: state.round, gauges })

  // The ratchet records the high-water mark only. A regression never lowers it.
  for (const r of results) {
    if (typeof r.score !== 'number') continue
    const best = state.best[r.member]
    if (typeof best !== 'number' || r.score > best) state.best[r.member] = r.score
  }

  // Act promotion is automatic and announced — it widens the axis, it does not gate.
  const notch = spec.fidelity?.actNotch
  if ((state.act ?? 1) < 2 && typeof notch === 'number') {
    const primary = results.find((r) => r.member === spec.primaryMember)
    if (typeof primary?.score === 'number' && primary.score >= notch) {
      state.act = 2
      entry.actPromoted = true
    }
  }

  // A round ends when a number lands on the board. Restart the clock for the next one.
  state.roundStartedAt = new Date().toISOString()

  save()
  if (drops.length) regression = { drops, floor }
}

/* -------------------------------------------------------------- analysis --- */

const hist = state.history ?? []
const last = hist.at(-1) ?? null
const prev = hist.at(-2) ?? null
const members = activeMembers()

const roundsSince = (member) => {
  let n = 0
  for (let i = hist.length - 1; i > 0; i--) {
    const now = hist[i].scores?.[member]
    const before = hist[i - 1].scores?.[member]
    if (typeof now !== 'number' || typeof before !== 'number') break
    if (now > before) break
    n++
  }
  return n
}

const anyImproved = () => {
  if (hist.length < 2) return true
  const a = hist.at(-2).scores ?? {}
  const b = hist.at(-1).scores ?? {}
  return Object.keys(b).some((k) => typeof b[k] === 'number' && typeof a[k] === 'number' && b[k] > a[k])
}

let globalStall = 0
for (let i = hist.length - 1; i > 0; i--) {
  const a = hist[i - 1].scores ?? {}
  const b = hist[i].scores ?? {}
  const up = Object.keys(b).some((k) => typeof b[k] === 'number' && typeof a[k] === 'number' && b[k] > a[k])
  if (up) break
  globalStall++
}

const scored = members
  .map((m) => ({ m, s: last?.scores?.[m] }))
  .filter((x) => typeof x.s === 'number')

const worst = scored.length ? scored.reduce((a, b) => (b.s < a.s ? b : a)) : null
const bestM = scored.length ? scored.reduce((a, b) => (b.s > a.s ? b : a)) : null
const spread = worst && bestM ? +(bestM.s - worst.s).toFixed(1) : null

const target = spec.fidelity?.target ?? null
const notch = spec.fidelity?.actNotch ?? null

/* --- the target: what to work on next, and why ----------------------------- */

const unmeasured = members.filter((m) => typeof last?.scores?.[m] !== 'number')

let aim = null
if (unmeasured.length && scored.length) {
  aim = {
    member: unmeasured[0], score: null, gap: null, stuck: 0,
    verdict: 'WIDEN',
    say: `The axis just widened. ${unmeasured.length} member(s) have never been scored: ${unmeasured.join(', ')}. Score them before deciding anything — the spread is the diagnosis and you do not have it yet.`,
  }
} else if (worst) {
  const stuck = roundsSince(worst.m)
  const gap = typeof target === 'number' ? +(target - worst.s).toFixed(1) : null
  if (stuck >= 3) {
    aim = {
      member: worst.m, score: worst.s, gap, stuck,
      verdict: 'STUCK',
      say: `"${worst.m}" has not improved in ${stuck} rounds. Repeating the same approach will not move it. Change the decomposition, the owner, or the critic — and look at the frame before deciding.`,
    }
  } else if (spread != null && spread >= 20 && scored.length > 1) {
    aim = {
      member: worst.m, score: worst.s, gap, stuck,
      verdict: 'UNEVEN',
      say: `Spread is ${spread} points ("${bestM.m}" ${bestM.s} vs "${worst.m}" ${worst.s}). That is uneven work, not a ceiling — the technique that got ${bestM.m} there has not been applied here yet.`,
    }
  } else if (scored.length > 1 && spread != null && spread < 8 && typeof gap === 'number' && gap > 15) {
    aim = {
      member: worst.m, score: worst.s, gap, stuck,
      verdict: 'CEILING',
      say: `Every member sits within ${spread} points of the others and all are ${gap} short. That is a global ceiling, not a weak member — the fix is a technique the build does not have yet, not more of the one it does.`,
    }
  } else {
    aim = {
      member: worst.m, score: worst.s, gap, stuck,
      verdict: 'CLIMB',
      say: `"${worst.m}" is the worst member at ${worst.s}${gap != null ? `, ${gap} short of ${target}` : ''}. Take the highest-severity finding on it and go.`,
    }
  }
}

const gaugeRows = (state.gaugeHistory.at(-1)?.gauges) ?? (spec.gauges ?? []).map((g) => ({ id: g.id, value: null, target: g.target ?? null, compare: g.compare ?? '>=', note: 'never measured' }))

const openDebt = (state.debt ?? []).filter((d) => !d.paid)

/* --- the round clock -------------------------------------------------------- */
// A round ends when a number lands on the board. This measures how long it has been since
// one did. It does not block. It exists because two runs burned six hours and 2.4M tokens
// producing zero scores, and no instrument in this repo could see it happening.
const BUDGET_MIN = spec.round?.budgetMinutes ?? 90
const clockFrom = state.roundStartedAt ?? state.startedAt ?? null
const roundMin = clockFrom ? (Date.now() - Date.parse(clockFrom)) / 60_000 : null
const overBudget = roundMin != null && roundMin > BUDGET_MIN
const fmtMin = (m) => (m >= 90 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`)

/* ---------------------------------------------------------------- output --- */

const payload = {
  ok: !regression,
  project: spec.project ?? null,
  act: state.act ?? 1,
  round: state.round ?? 0,
  members: members.map((m) => ({
    member: m,
    score: last?.scores?.[m] ?? null,
    best: state.best[m] ?? null,
    delta: prev && last ? (typeof last.scores?.[m] === 'number' && typeof prev.scores?.[m] === 'number' ? +(last.scores[m] - prev.scores[m]).toFixed(1) : null) : null,
    roundsSinceImprovement: roundsSince(m),
  })),
  target, actNotch: notch, spread,
  aim, gauges: gaugeRows,
  globalStall, noiseFloor: state.noiseFloor,
  debt: openDebt.length,
  regression,
  saw: last?.saw ?? null,
  roundMinutes: roundMin == null ? null : Math.round(roundMin),
  roundBudgetMinutes: BUDGET_MIN,
  overBudget,
}

if (JSON_OUT) {
  console.log(JSON.stringify(payload, null, 2))
  process.exit(regression ? 3 : 0)
}

const pad = (s, n) => String(s).padEnd(n)
const num = (v, n = 6) => String(v ?? '—').padStart(n)

console.log(`\n  ${spec.project ?? 'project'} · Act ${state.act ?? 1} · round ${state.round ?? 0}`)
if (roundMin != null) console.log(`  ${fmtMin(roundMin)} since the last recorded score  ·  round budget ${BUDGET_MIN}m${overBudget ? '   ** OVER **' : ''}`)
console.log('')

if (overBudget && !has('record')) {
  console.log(`  !! ${fmtMin(roundMin)} without a number on the board.`)
  console.log(`     A round is one owner, one pass, one score — not a structure that has to finish`)
  console.log(`     before anything gets measured. If a phase ladder or a staged workflow is`)
  console.log(`     standing between you and a score, that is the bug (Invariant 16).`)
  console.log(`     Score what exists right now, however bad, and make the next round smaller.\n`)
}

if (spec.fidelity) {
  console.log(`  FIDELITY   ${spec.fidelity.id ?? 'fidelity'}   target ${target ?? '—'}${notch && (state.act ?? 1) < 2 ? `   ·   act notch ${notch}` : ''}`)
  const w = Math.max(10, ...members.map((m) => m.length))
  for (const m of members) {
    const s = last?.scores?.[m]
    const b = state.best[m]
    const d = payload.members.find((x) => x.member === m)?.delta
    const below = typeof s === 'number' && typeof b === 'number' && s < b
    const arrow = d == null ? '    ' : d > 0 ? ` +${d}` : d < 0 ? ` ${d}` : '  0'
    const note = last?.notes?.[m]
    console.log(`             ${pad(m, w)} ${num(s)}   best ${num(b, 5)}  ${pad(arrow, 7)}${below ? '  ** BELOW BEST **' : ''}${note ? `  (${note})` : ''}`)
  }
}

if (gaugeRows.length) {
  console.log(`\n  GAUGES     advisory — none of these stop the loop`)
  const w = Math.max(10, ...gaugeRows.map((g) => String(g.id).length))
  for (const g of gaugeRows) {
    const ok = passes(g.value, g.compare, g.target)
    const mark = g.value == null ? '   ' : ok === true ? ' ok' : ok === false ? '  ·' : '   '
    console.log(`             ${pad(g.id, w)} ${num(g.value)}${g.target != null ? `   ${g.compare} ${g.target}` : ''}${mark}${g.note ? `   ${g.note}` : ''}`)
  }
}

if (aim) {
  console.log(`\n  TARGET     ${aim.verdict}`)
  console.log(`             ${aim.say}`)
}

if (globalStall >= 3) {
  console.log(`\n  !! ${globalStall} rounds with no improvement on any member.`)
  console.log(`     The artifact is not moving. That is the only thing this loop exists to do.`)
}

if (openDebt.length) {
  const oldest = Math.min(...openDebt.map((d) => d.round ?? state.round))
  console.log(`\n  DEBT       ${openDebt.length} logged, oldest from round ${oldest}${(state.act ?? 1) < 2 ? '  (paid in Act II — do not pay it now)' : '  (Act II — pay it)'}`)
}

if (last?.actPromoted) {
  console.log(`\n  ** ACT II ** "${spec.primaryMember}" reached the act notch.`)
  console.log(`     Widen the coverage axis, then start paying debt. The ratchet now covers every member.`)
}

if (state.noiseFloor == null) {
  console.log(`\n  note       ratchet noise floor is not calibrated (assuming 6).`)
  console.log(`             node tools/board.mjs --calibrate  scores the same build twice and sets it from the spread.`)
}

if (regression) {
  console.log(`\n${'─'.repeat(72)}`)
  console.log(`  REGRESSION — the one rule in this framework.\n`)
  for (const d of regression.drops) {
    console.log(`    "${d.member}"  best ${d.best}  →  now ${d.now}   (lost ${d.lost}, floor ${regression.floor})`)
  }
  console.log(`\n  Something that worked is now worse. This is the failure an unmeasured loop`)
  console.log(`  cannot see, and the reason this framework exists at all.`)
  console.log(`\n  Stop. Tell the human what changed this round and what you believe broke it.`)
  console.log(`  Do not raise the noise floor. Do not re-run hoping for a better draw.`)
  console.log(`${'─'.repeat(72)}\n`)
  process.exit(3)
}

console.log('')
