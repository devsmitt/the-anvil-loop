#!/usr/bin/env node
/**
 * instruments.mjs — how much do you trust each reading.
 *
 * This does NOT block. A score from an unproven instrument is still a score; it just
 * carries a warning label. Withholding it would stop the climb, and the climb is the
 * point.
 *
 * What it checks is deliberately weighted toward the failures that have actually cost
 * time: instruments reporting confidently while measuring nothing.
 *
 *   node tools/instruments.mjs             fast checks
 *   node tools/instruments.mjs --falsify   also plant known errors and confirm they fire
 *   node tools/instruments.mjs --json
 */

import { execSync } from 'node:child_process'
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs'

const ROOT = process.cwd()
const args = process.argv.slice(2)
const JSON_OUT = args.includes('--json')
const FALSIFY = args.includes('--falsify')

if (!existsSync(`${ROOT}/anvil.json`)) {
  console.error('\n  anvil.json not found — see AGENTS.md, SITUATION 1.\n')
  process.exit(2)
}
const spec = JSON.parse(readFileSync(`${ROOT}/anvil.json`, 'utf8'))
if (!existsSync(`${ROOT}/.anvil`)) mkdirSync(`${ROOT}/.anvil`, { recursive: true })

// The live act comes from state, not from the spec's initial value — the spec says where
// the run started, state says where it is.
let ACT = spec.act ?? 1
try { ACT = JSON.parse(readFileSync(`${ROOT}/.anvil/state.json`, 'utf8')).act ?? ACT } catch {}

const rows = []
const add = (tool, trust, detail) => rows.push({ tool, trust, detail })

const built = (t) => {
  if (!existsSync(`${ROOT}/tools/${t}`)) return false
  const src = readFileSync(`${ROOT}/tools/${t}`, 'utf8')
  return !/NOT[ _]IMPLEMENTED/i.test(src) && statSync(`${ROOT}/tools/${t}`).size >= 200
}
const run = (cmd, ms = 1_800_000) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: ms })
const lastJson = (t) => {
  const lines = String(t).trim().split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim()
    if (l.startsWith('{') || l.startsWith('[')) { try { return JSON.parse(l) } catch {} }
  }
  try { return JSON.parse(t) } catch { return null }
}

const member = spec.primaryMember ?? 'primary'

/* --- capture ---------------------------------------------------------------- */

if (!built('capture.mjs')) add('capture', 'absent', 'not built yet')
else if (!built('diff.mjs')) add('capture', 'unproven', 'no diff.mjs, so reproducibility is unmeasured — the ratchet noise floor stays wide')
else {
  try {
    run(`node tools/capture.mjs --member=${member} --out=.anvil/probe-a.png`)
    run(`node tools/capture.mjs --member=${member} --out=.anvil/probe-b.png`)
    const d = lastJson(run(`node tools/diff.mjs .anvil/probe-a.png .anvil/probe-b.png --json`))
    const moved = d?.differingPixels ?? d?.diff ?? d?.pixels
    if (typeof moved !== 'number') add('capture', 'unproven', 'diff.mjs did not report a pixel count')
    else if (moved === 0) add('capture', 'proven', 'two runs bit-identical — tighten the ratchet with --calibrate')
    else add('capture', 'noisy', `${moved} pixels differ between two identical runs — every score carries that much jitter`)
  } catch (e) { add('capture', 'unproven', `probe failed: ${String(e.message).split('\n')[0].slice(0, 80)}`) }
}

/* --- critic ----------------------------------------------------------------- */

if (!built('critic.mjs')) add('critic', 'absent', 'not built yet — nothing can be scored')
else {
  try {
    const c = lastJson(run(`node tools/critic.mjs --member=${member} --json`))
    if (!c) add('critic', 'unproven', 'emitted no JSON')
    else {
      const notes = []
      if (typeof c.score !== 'number') notes.push('no numeric score')
      if (!c.band) notes.push('cites no calibrated band — an uncalibrated number drifts upward every round')
      if (!Array.isArray(c.findings) || !c.findings.length) notes.push('no findings — a score with no attributable cause cannot be acted on')
      // The failure that graded a build which no longer existed.
      if (c.buildFingerprint == null) notes.push('reports no buildFingerprint — stale frames could be graded as current')
      const fs = c.frameStats
      if (!fs) notes.push('reports no frameStats — cannot tell whether the reviewer could see anything')
      else {
        if (typeof fs.meanLuminance === 'number' && fs.meanLuminance < 0.04) notes.push(`frames are near-black (mean luminance ${fs.meanLuminance}) — this score is about darkness, not quality`)
        if (typeof fs.dominantSurfaceFraction === 'number' && fs.dominantSurfaceFraction > 0.85) notes.push(`${Math.round(fs.dominantSurfaceFraction * 100)}% of frame is one flat surface — the reviewer is looking at a wall`)
      }
      add('critic', notes.length ? 'unproven' : 'proven', notes.length ? notes.join('; ') : `scored ${c.score}, band cited, ${c.findings.length} findings`)
    }
  } catch (e) { add('critic', 'unproven', `failed: ${String(e.message).split('\n')[0].slice(0, 80)}`) }
}

/* --- sweep ------------------------------------------------------------------ */

if (!built('sweep.mjs')) add('sweep', 'absent', ACT >= 2 ? 'Act II has widened the axis — this is the next instrument' : 'not needed until Act II')
else {
  try {
    const s = lastJson(run(spec.coverage?.command ?? `node tools/sweep.mjs --json`))
    const notes = []
    if (!s) notes.push('emitted no JSON')
    else {
      if (s.worst == null && s.worstMember == null) notes.push('reports no worst member — the score must be the worst, never the mean')
      // Four of eight members framing the same road is a 5-member axis wearing an 8-member label.
      if (typeof s.duplicateMembers === 'number' && s.duplicateMembers > 0) notes.push(`${s.duplicateMembers} near-duplicate members — the axis is narrower than it claims`)
      if (s.duplicateMembers == null) notes.push('does not report duplicateMembers — near-identical members silently narrow the axis')
    }
    add('sweep', notes.length ? 'unproven' : 'proven', notes.length ? notes.join('; ') : 'covers the axis, reports the worst')
  } catch (e) { add('sweep', 'unproven', `failed: ${String(e.message).split('\n')[0].slice(0, 80)}`) }
}

/* --- player ----------------------------------------------------------------- */

if (!built('player.mjs')) add('player', 'absent', ACT >= 2 ? 'Act II — worth building now' : 'not needed in Act I')
else {
  try {
    const p = lastJson(run(`node tools/player.mjs --once --json`))
    const notes = []
    if (!p) notes.push('emitted no JSON')
    else {
      for (const f of ['succeeded', 'access', 'stalledAt', 'belief', 'attribution']) if (!(f in p)) notes.push(`missing "${f}"`)
      if (Array.isArray(p.access)) {
        const denied = (spec.player?.denied ?? []).map((x) => String(x).toLowerCase())
        const got = p.access.map((x) => String(x).toLowerCase())
        const bad = denied.filter((d) => got.some((g) => g === d || g.includes(d)))
        if (bad.length) notes.push(`had access to denied resources (${bad.join(', ')}) — this gate is permanently green`)
      } else notes.push('access is not an array of what it actually received')
      const h = spec.player?.handicap
      if (h) {
        const c = lastJson(run(`node tools/player.mjs --report-config --json`))
        if (h.frameMemory != null && c?.frameMemory !== h.frameMemory) notes.push(`frameMemory ${c?.frameMemory} != spec ${h.frameMemory}`)
        if (h.reactionDelayMs != null && c?.reactionDelayMs !== h.reactionDelayMs) notes.push(`reactionDelayMs ${c?.reactionDelayMs} != spec ${h.reactionDelayMs} — a zero-latency critic is what the handicap exists to prevent`)
      } else notes.push('no handicap declared — an agent with perfect recall solves what no human could')
      // THE ONE THAT COST FOUR ITERATIONS: a critic that cannot see returns a confident zero.
      const fs = p.frameStats
      if (!fs) notes.push('reports no frameStats — cannot tell whether the player could see anything')
      else {
        if (typeof fs.meanLuminance === 'number' && fs.meanLuminance < 0.04) notes.push(`player frames are near-black (${fs.meanLuminance}) — it is navigating blind and its success rate means nothing`)
        if (typeof fs.dominantSurfaceFraction === 'number' && fs.dominantSurfaceFraction > 0.85) notes.push(`${Math.round(fs.dominantSurfaceFraction * 100)}% of the player's view is one flat surface — it is staring at a wall`)
        if (typeof fs.goalPixels === 'number' && fs.goalPixels === 0 && p.succeeded === false) notes.push('the goal was never visible in any frame of a failed episode — the task may be impossible, not hard (build solvable.mjs)')
      }
    }
    add('player', notes.length ? 'unproven' : 'proven', notes.length ? notes.join('; ') : `access ${p.access.join(', ')}, handicap applied, frames legible`)
  } catch (e) { add('player', 'unproven', `failed: ${String(e.message).split('\n')[0].slice(0, 80)}`) }
}

/* --- solvable --------------------------------------------------------------- */

if (!built('solvable.mjs')) add('solvable', 'absent', built('player.mjs') ? 'without it, a player failure cannot be told apart from an impossible task' : 'not needed until the player exists')
else add('solvable', 'built', 'privileged reachability probe present')

/* --- anchor (drift) --------------------------------------------------------- */

if (!built('anchor.mjs')) add('anchor', 'absent', 'not needed until scores have been climbing for a while')
else if (!FALSIFY) add('anchor', 'unproven', 'run with --falsify to confirm it fires on a planted drift')
else {
  try {
    const maxDrift = spec.anchors?.maxDrift ?? 0.3
    const a = lastJson(run(`node tools/anchor.mjs --simulate-drift=${(maxDrift + 1).toFixed(2)} --json`))
    if (a?.driftDetected === true) add('anchor', 'proven', `planted ${(maxDrift + 1).toFixed(2)}, flagged`)
    else add('anchor', 'broken', 'a planted drift did NOT fire — the detector is decorative, which reads as reassurance')
  } catch (e) { add('anchor', 'unproven', `failed: ${String(e.message).split('\n')[0].slice(0, 80)}`) }
}

/* --- perf ------------------------------------------------------------------- */

if (!built('perf.mjs')) add('perf', 'absent', 'not built yet')
else {
  try {
    const p = lastJson(run(`node tools/perf.mjs --json`))
    const notes = []
    if (!p) notes.push('emitted no JSON')
    else {
      // 18x error in one run, 5.7x in another. Both flattering. Both silent.
      if (p.gpuTimed !== true) notes.push('does not report gpuTimed:true — CPU submission time is not frame time, and the error is flattering by up to 18x')
      if (p.inMotion !== true) notes.push('does not report inMotion:true — a static camera reports a passing number for a build that stutters')
      if (p.runs != null && p.runs < 2) notes.push('single run — tail latency swings enough between identical runs to invert a decision')
    }
    add('perf', notes.length ? 'unproven' : 'proven', notes.length ? notes.join('; ') : `gpu-timed, in motion, ${p.runs} runs`)
  } catch (e) { add('perf', 'unproven', `failed: ${String(e.message).split('\n')[0].slice(0, 80)}`) }
}

/* --- output ----------------------------------------------------------------- */

const RANK = { proven: 0, built: 1, noisy: 2, unproven: 3, broken: 4, absent: 5 }
rows.sort((a, b) => (RANK[a.trust] ?? 9) - (RANK[b.trust] ?? 9))

writeFileSync(`${ROOT}/.anvil/instruments.json`, JSON.stringify({ at: new Date().toISOString(), rows }, null, 2))

if (JSON_OUT) { console.log(JSON.stringify({ ok: true, rows }, null, 2)); process.exit(0) }

console.log(`\n  instrument trust — ${spec.project ?? 'project'}\n`)
const w = Math.max(9, ...rows.map((r) => r.tool.length))
for (const r of rows) console.log(`  ${String(r.trust).toUpperCase().padEnd(9)} ${r.tool.padEnd(w)}  ${r.detail}`)

const broken = rows.filter((r) => r.trust === 'broken')
const unproven = rows.filter((r) => r.trust === 'unproven' || r.trust === 'noisy')

console.log('')
if (broken.length) console.log(`  ${broken.length} instrument(s) BROKEN — they report success while measuring nothing. Fix before believing them.`)
if (unproven.length) console.log(`  ${unproven.length} unproven. Their readings still count; they just carry more uncertainty.`)
if (!broken.length && !unproven.length) console.log(`  Every built instrument is proven. Scores can be trusted to the calibrated noise floor.`)
console.log(`\n  Nothing here blocks the loop. Absent instruments are not a problem —\n  they are built when their reading becomes useful.\n`)
