#!/usr/bin/env node
/**
 * verify-harness.mjs — THE META-GATE
 *
 * Ships with the Anvil Loop. Stack-agnostic.
 *
 * Before the loop is allowed to trust a single score, the instrument itself has to be
 * proven. This runs the seven tools your project generated and checks that each one
 * actually satisfies its contract in TOOLS.md:
 *
 *   1  all seven tools exist
 *   2  capture is deterministic — two runs, diff reports zero
 *   3  sweep covers the declared axis, and reports the WORST member, not the mean
 *   4  player declares what it had access to, and that matches anvil.json's denial list
 *   5  player is handicapped — it does not have unlimited recall
 *   6  anchor detects a planted drift (we inject one; if it passes, the drift detector
 *      is decorative and critic softening will go unnoticed for the whole run)
 *
 * On success it writes .anvil/harness-verified.json, which tools/gate.mjs requires.
 * There is no flag to skip this. That is the point.
 *
 *   node tools/verify-harness.mjs
 *   node tools/verify-harness.mjs --json
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'

const ROOT = process.cwd()
const SPEC = `${ROOT}/anvil.json`
const STATE = `${ROOT}/.anvil`
const JSON_OUT = process.argv.includes('--json')

const REQUIRED_TOOLS = ['capture.mjs', 'sweep.mjs', 'diff.mjs', 'player.mjs', 'budget.mjs', 'anchor.mjs', 'critic.mjs']

if (!existsSync(SPEC)) {
  console.error('\n  anvil.json not found — see AGENTS.md, SITUATION 1.\n')
  process.exit(2)
}
const spec = JSON.parse(readFileSync(SPEC, 'utf8'))
if (!existsSync(STATE)) mkdirSync(STATE, { recursive: true })

const checks = []
const check = (name, fn, { fatal = true } = {}) => {
  const r = { name, pass: false, detail: '' }
  try {
    const d = fn()
    r.pass = true
    r.detail = d ?? ''
  } catch (e) {
    r.pass = false
    r.detail = String(e.message).split('\n')[0].slice(0, 200)
    r.fatal = fatal
  }
  checks.push(r)
  return r.pass
}

const run = (cmd, timeoutMs = 1_800_000) =>
  execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: timeoutMs })

const lastJson = (text) => {
  const lines = text.trim().split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim()
    if (l.startsWith('{') || l.startsWith('[')) { try { return JSON.parse(l) } catch {} }
  }
  try { return JSON.parse(text) } catch { return null }
}

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

/* 0 — the spec itself is coherent ---------------------------------------- */

check('spec is valid', () => {
  try {
    run('node tools/validate-spec.mjs --json', 120_000)
  } catch (e) {
    const parsed = lastJson(e.stdout ?? '')
    const n = parsed?.errors?.length ?? '?'
    throw new Error(`${n} spec error(s) — run \`node tools/validate-spec.mjs\` for detail`)
  }
  return 'anvil.json and the documents agree'
})

/* 1 — the seven tools exist ------------------------------------------------ */

check('tools present', () => {
  const missing = REQUIRED_TOOLS.filter((t) => !existsSync(`${ROOT}/tools/${t}`))
  if (missing.length) throw new Error(`missing: ${missing.join(', ')}`)
  const stubs = REQUIRED_TOOLS.filter((t) => {
    const src = readFileSync(`${ROOT}/tools/${t}`, 'utf8')
    return /NOT[ _]IMPLEMENTED/i.test(src) || statSync(`${ROOT}/tools/${t}`).size < 200
  })
  if (stubs.length) throw new Error(`still stubs: ${stubs.join(', ')}`)
  return `${REQUIRED_TOOLS.length}/${REQUIRED_TOOLS.length} implemented`
})

/* 2 — determinism -------------------------------------------------------- */

check('capture is deterministic', () => {
  const shot = spec.determinism?.probeShot
  if (!shot) throw new Error('anvil.json has no determinism.probeShot — name a shot capture.mjs can render, so this check has something to capture twice')
  run(`node tools/capture.mjs --shot=${shot} --out=.anvil/probe-a.png`)
  run(`node tools/capture.mjs --shot=${shot} --out=.anvil/probe-b.png`)
  const out = run(`node tools/diff.mjs .anvil/probe-a.png .anvil/probe-b.png --json`)
  const d = lastJson(out)
  if (!d) throw new Error('diff.mjs emitted no JSON')
  const moved = d.differingPixels ?? d.diff ?? d.pixels
  if (typeof moved !== 'number') throw new Error('diff.mjs did not report a pixel count')
  if (moved !== 0) throw new Error(`${moved} pixels differ between two identical runs — captures are NOT reproducible`)
  if (sha(`${ROOT}/.anvil/probe-a.png`) !== sha(`${ROOT}/.anvil/probe-b.png`)) throw new Error('files differ byte-for-byte though diff reported 0 — diff.mjs is lying')
  return 'two runs bit-identical'
})

/* 3 — sweep covers the axis and scores the worst ------------------------- */

check('sweep covers the axis and reports the worst member', () => {
  const declared = spec.coverage?.members
  if (!declared) throw new Error('anvil.json declares no coverage.members')
  const cmd = spec.coverage.command ?? `node tools/sweep.mjs --members=${declared} --json`
  if (!/--json\b/.test(cmd)) throw new Error(`coverage.command does not pass --json ("${cmd}") — the tool contract only guarantees JSON under --json`)
  const out = run(cmd)
  const s = lastJson(out)
  if (!s) throw new Error('sweep.mjs emitted no JSON')
  const n = s.members ?? s.count ?? (Array.isArray(s.results) ? s.results.length : undefined)
  if (n == null) throw new Error('sweep.mjs did not report how many members it covered')
  if (n < declared) throw new Error(`covered ${n} of ${declared} declared members`)
  if (s.worst == null && s.worstMember == null) throw new Error('sweep.mjs reports no worst member — INVARIANT 4 requires the worst, never the mean')
  return `${n} members, worst reported`
})

/* 4 + 5 — the player is honest about access, and handicapped -------------- */

check('player declares its access and matches the denial list', () => {
  const out = run(`node tools/player.mjs --once --json`)
  const p = lastJson(out)
  if (!p) throw new Error('player.mjs emitted no JSON')
  for (const f of ['succeeded', 'access', 'stalledAt', 'belief', 'attribution']) {
    if (!(f in p)) throw new Error(`player report missing required field "${f}"`)
  }
  if (!Array.isArray(p.access)) throw new Error('player.access must be an array of what it actually received')
  const denied = (spec.player?.denied ?? []).map((s) => String(s).toLowerCase())
  const got = p.access.map((s) => String(s).toLowerCase())
  // Substring one way only. Reverse matching made denial "internal state" collide with granted "state".
  const violations = denied.filter((d) => got.some((g) => g === d || g.includes(d)))
  if (violations.length) throw new Error(`player had access to denied resources: ${violations.join(', ')} — this gate is permanently green and meaningless`)
  if (!['build', 'user', 'none'].includes(String(p.attribution))) throw new Error('player.attribution must be "build" | "user" | "none"')
  return `access: ${p.access.join(', ') || 'frames only'}`
})

check('player is handicapped', () => {
  const h = spec.player?.handicap
  if (!h || (h.frameMemory == null && h.reactionDelayMs == null)) throw new Error('anvil.json declares no handicap — an agent with perfect recall solves what no human could')
  const out = run(`node tools/player.mjs --report-config --json`)
  const c = lastJson(out)
  if (!c) throw new Error('player.mjs --report-config emitted no JSON')
  if (h.frameMemory != null && c.frameMemory !== h.frameMemory) throw new Error(`player frameMemory is ${c.frameMemory}, spec says ${h.frameMemory}`)
  if (h.reactionDelayMs != null && c.reactionDelayMs !== h.reactionDelayMs) throw new Error(`player reactionDelayMs is ${c.reactionDelayMs}, spec says ${h.reactionDelayMs} — a zero-latency critic is exactly what the handicap exists to prevent`)
  return `frameMemory ${c.frameMemory ?? 'n/a'}, delay ${c.reactionDelayMs ?? 'n/a'}ms`
})

/* 6 — the drift detector actually detects drift -------------------------- */

check('anchor detects a planted drift', () => {
  const maxDrift = spec.anchors?.maxDrift ?? 0.3
  const plant = (maxDrift + 1).toFixed(2)
  const out = run(`node tools/anchor.mjs --simulate-drift=${plant} --json`)
  const a = lastJson(out)
  if (!a) throw new Error('anchor.mjs emitted no JSON')
  if (!('driftDetected' in a)) throw new Error('anchor.mjs does not report driftDetected')
  if (a.driftDetected !== true) throw new Error(`planted a drift of ${plant} (limit ${maxDrift}) and anchor.mjs did not flag it — the drift detector is decorative and critic softening will go unnoticed for the entire run`)
  return `planted ${plant}, flagged`
})

/* ------------------------------------------------------------------------ */

const passed = checks.filter((c) => c.pass).length
const ok = passed === checks.length

if (ok) {
  writeFileSync(`${STATE}/harness-verified.json`, JSON.stringify({
    verifiedAt: new Date().toISOString(),
    checks: checks.map(({ name, detail }) => ({ name, detail })),
    toolHashes: Object.fromEntries(REQUIRED_TOOLS.map((t) => [t, sha(`${ROOT}/tools/${t}`).slice(0, 16)])),
  }, null, 2))
}

if (JSON_OUT) {
  console.log(JSON.stringify({ ok, checks }, null, 2))
  process.exit(ok ? 0 : 1)
}

console.log(`\n  harness verification — ${spec.project ?? 'project'}\n`)
for (const c of checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `\n        ${c.detail}` : ''}`)
console.log(
  ok
    ? `\n  Harness verified. Scores from this point are trustworthy. gate.mjs is unlocked.\n`
    : `\n  ${checks.length - passed} check(s) failed. Fix the harness before writing product code.\n` +
      `  Every review run against an unverified harness is noise, and you will not\n` +
      `  find out for forty rounds.\n`
)
process.exit(ok ? 0 : 1)
