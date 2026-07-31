#!/usr/bin/env node
/**
 * journal.mjs — memory, and the debt ledger.
 *
 * Agents write prose. Programs write numbers. Scores are `board.mjs`'s business; this
 * file owns claims, notes, amendments, debt, and the rendering of PROGRESS.md.
 *
 *   node tools/journal.mjs                       refresh PROGRESS.md from state
 *   node tools/journal.mjs --begin="<task>"      claim work BEFORE starting it
 *   node tools/journal.mjs --end                 close the claim
 *   node tools/journal.mjs --abandon="<why>"     close it as not done
 *   node tools/journal.mjs --next="<action>"     the one next action
 *   node tools/journal.mjs --note="<what ran, what it returned>"
 *   node tools/journal.mjs --debt="<defect>" --evidence="<how you know>"
 *   node tools/journal.mjs --paid=<n>            mark debt item n paid (Act II)
 *   node tools/journal.mjs --amend=FILE --change="..." --reason="..."
 *
 * --begin/--end is what makes an interrupted run resumable. An open claim tells the next
 * session the process was killed, and where.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'

const ROOT = process.cwd()
const DIR = `${ROOT}/.anvil`
const STATE = `${DIR}/state.json`
const PROGRESS = `${ROOT}/PROGRESS.md`

const args = process.argv.slice(2)
const val = (n) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null }
const JSON_OUT = args.includes('--json')

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })

const spec = existsSync(`${ROOT}/anvil.json`)
  ? (() => { try { return JSON.parse(readFileSync(`${ROOT}/anvil.json`, 'utf8')) } catch { return null } })()
  : null

const blank = {
  version: 2, act: 1, round: 0, best: {}, history: [], gaugeHistory: [],
  debt: [], log: [], amendments: [], interrupted: [], inFlight: null, nextAction: null, noiseFloor: null,
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
// The first-light clock. doctor.mjs uses this to notice round one has been open for hours
// with nothing scored — the most common way to lose a day here (Invariant 13).
if (!state.startedAt) state.startedAt = new Date().toISOString()
// The round clock. board.mjs restarts it on every --record; a round ends when a number
// lands on the board (Invariant 16).
if (!state.roundStartedAt) state.roundStartedAt = state.startedAt
// Recovery has to land on disk immediately. Recovering in memory and not writing back
// leaves the corrupt file for the next tool, which may not be as careful.
if (RECOVERED) { try { writeFileSync(`${STATE}.tmp`, JSON.stringify(state, null, 2)); renameSync(`${STATE}.tmp`, STATE); console.error('  Recovered state written back to disk.\n') } catch {} }
const stamp = new Date().toISOString()

const save = () => {
  if (existsSync(STATE)) { try { writeFileSync(`${STATE}.bak`, readFileSync(STATE)) } catch {} }
  writeFileSync(`${STATE}.tmp`, JSON.stringify(state, null, 2))
  renameSync(`${STATE}.tmp`, STATE)
}

/* --- claims: the resume mechanism ------------------------------------------ */

if (val('begin') != null) {
  if (state.inFlight) {
    state.interrupted.push({ ...state.inFlight, foundAt: stamp })
    console.log(`\n  Previous claim never closed: "${state.inFlight.task}" (${state.inFlight.startedAt}). Recorded as interrupted.\n`)
  }
  state.inFlight = { task: val('begin'), startedAt: stamp, round: state.round }
}
if (args.includes('--end')) {
  if (state.inFlight) state.log.push({ round: state.round, at: stamp, note: `done: ${state.inFlight.task}` })
  state.inFlight = null
}
if (val('abandon') != null) {
  if (state.inFlight) state.interrupted.push({ ...state.inFlight, abandonedAt: stamp, reason: val('abandon') })
  state.inFlight = null
}

if (val('next') != null) state.nextAction = val('next')
if (val('note') != null) state.log.push({ round: state.round, at: stamp, note: val('note') })

/* --- debt: correctness deferred, never lost -------------------------------- */

if (val('debt') != null) {
  const evidence = val('evidence')
  if (!evidence) {
    console.error(
      '\n  --debt requires --evidence. A defect with no evidence cannot be reproduced\n' +
      '  when you come back to pay it, which makes logging it the same as forgetting it.\n',
    )
    process.exit(2)
  }
  state.debt.push({ n: state.debt.length + 1, round: state.round, at: stamp, defect: val('debt'), evidence, paid: false })
  console.log(`\n  Logged as debt #${state.debt.length}. Do not fix it now — Act II pays this.\n`)
}
if (val('paid') != null) {
  const n = Number(val('paid'))
  const item = state.debt.find((d) => d.n === n)
  if (!item) { console.error(`\n  no debt item #${n}\n`); process.exit(2) }
  if ((state.act ?? 1) < 2) console.log(`\n  Note: paying debt in Act I. Fidelity is the climb; be sure this one blocks measurement.\n`)
  item.paid = true
  item.paidAt = stamp
}

if (val('amend') != null) {
  const change = val('change'); const reason = val('reason')
  if (!change || !reason) {
    console.error('\n  --amend requires --change= and --reason=. An unexplained amendment is how a run drifts.\n')
    process.exit(2)
  }
  state.amendments.push({ round: state.round, at: stamp, document: val('amend'), change, reason })
}

state.updatedAt = stamp
save()

/* --- render the machine-owned blocks of PROGRESS.md ------------------------ */

const hist = state.history ?? []
const last = hist.at(-1)
const openDebt = state.debt.filter((d) => !d.paid)
const memberIds = [...new Set(hist.flatMap((h) => Object.keys(h.scores ?? {})))]
const fmt = (n) => (typeof n === 'number' ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : '—')

const BLOCKS = {
  state: `
**Act ${state.act ?? 1} · round ${state.round ?? 0}**${state.inFlight ? `  ·  **IN FLIGHT: ${state.inFlight.task}** (claimed ${String(state.inFlight.startedAt).slice(0, 16).replace('T', ' ')} — if nothing is running, this was interrupted)` : ''}

${state.nextAction ? `**Next action:** ${state.nextAction}` : '_No next action recorded. Set one with `node tools/journal.mjs --next="..."` before you finish._'}

${last ? `Last round saw: _${last.saw}_` : '_No round recorded yet._'}
`.trim(),

  scores: hist.length
    ? [`| round | ${memberIds.join(' | ')} | saw |`, `|---|${memberIds.map(() => '---|').join('')}---|`,
       ...hist.slice(-15).map((h) => `| ${h.round} | ${memberIds.map((m) => fmt(h.scores?.[m])).join(' | ')} | ${String(h.saw ?? '').slice(0, 70)} |`)].join('\n')
    : '_No rounds recorded. `board.mjs --record` appends here._',

  debt: state.debt.length
    ? [`| # | round | defect | evidence | paid |`, `|---|---|---|---|---|`,
       ...state.debt.slice(-20).map((d) => `| ${d.n} | ${d.round} | ${d.defect} | ${d.evidence} | ${d.paid ? 'yes' : '**no**'} |`)].join('\n')
    : '_None logged._',

  amendments: state.amendments.length
    ? [`| round | document | change | reason |`, `|---|---|---|---|`,
       ...state.amendments.slice(-20).map((a) => `| ${a.round} | \`${a.document}\` | ${a.change} | ${a.reason} |`)].join('\n')
    : '_None._',

  log: state.log.length
    ? state.log.slice(-25).map((l) => `- **r${l.round}** — ${l.note}`).join('\n')
    : '_No entries._',
}

let md = existsSync(PROGRESS) ? readFileSync(PROGRESS, 'utf8') : null
if (md == null) {
  md = `# ${spec?.project ?? 'project'} — progress\n\n` +
    `Blocks marked \`anvil:auto\` are written by \`tools/journal.mjs\`. Do not edit inside them.\n` +
    `Everything outside them is yours.\n\n` +
    Object.keys(BLOCKS).map((k) => `## ${k}\n\n<!-- anvil:auto:${k} -->\n<!-- /anvil:auto:${k} -->\n`).join('\n')
}

const rewritten = []
for (const [key, body] of Object.entries(BLOCKS)) {
  const re = new RegExp(`(<!--\\s*anvil:auto:${key}\\s*-->)([\\s\\S]*?)(<!--\\s*/anvil:auto:${key}\\s*-->)`)
  if (re.test(md)) { md = md.replace(re, `$1\n${body}\n$3`); rewritten.push(key) }
  else { md += `\n\n## ${key}\n\n<!-- anvil:auto:${key} -->\n${body}\n<!-- /anvil:auto:${key} -->\n`; rewritten.push(`${key}+`) }
}
writeFileSync(PROGRESS, md)

const alerts = []
if (state.inFlight) alerts.push(`IN FLIGHT — "${state.inFlight.task}" claimed and not closed. If nothing is running, it was interrupted.`)
if (!state.nextAction) alerts.push('No next action recorded. A fresh session will not know where to resume.')

if (JSON_OUT) {
  console.log(JSON.stringify({ ok: true, act: state.act, round: state.round, debt: openDebt.length, alerts, rewritten }, null, 2))
  process.exit(0)
}
console.log(`\n  journal — act ${state.act ?? 1}, round ${state.round ?? 0}${openDebt.length ? `, ${openDebt.length} open debt` : ''}`)
console.log(`  PROGRESS.md: ${rewritten.join(', ')}`)
for (const a of alerts) console.log(`\n  !! ${a}`)
console.log('')
