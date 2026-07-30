#!/usr/bin/env node
/**
 * status.mjs — the human dashboard
 *
 * Ships with the Anvil Loop. Stack-agnostic.
 *
 * Reads .anvil/state.json and anvil.json only. It does NOT scrape PROGRESS.md —
 * that file is a rendered view, and parsing a rendered view is how a dashboard ends
 * up showing drift rows as gate results.
 *
 *   node tools/status.mjs [--out=status.html]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const ROOT = process.cwd()
const out = (process.argv.find((a) => a.startsWith('--out=')) || '--out=status.html').split('=')[1]

if (!existsSync(`${ROOT}/anvil.json`)) {
  console.error('\n  anvil.json not found — see AGENTS.md, SITUATION 1.\n')
  process.exit(2)
}

let spec
try { spec = JSON.parse(readFileSync(`${ROOT}/anvil.json`, 'utf8')) }
catch (e) { console.error(`\n  anvil.json does not parse: ${e.message}\n  Repair it — do not re-run definition.\n`); process.exit(2) }

const readJson = (p) => { try { return JSON.parse(readFileSync(`${ROOT}/${p}`, 'utf8')) } catch { return null } }

const state = readJson('.anvil/state.json') ?? {}
const verified = readJson('.anvil/harness-verified.json')
const lock = readJson('.anvil/gates.lock')

const history = state.history ?? []
const last = history.at(-1) ?? null
const lastDrift = (state.drift ?? []).at(-1) ?? null

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const fmt = (n) => (typeof n === 'number' ? (Number.isInteger(n) ? String(n) : n.toFixed(2)) : '—')

const bars = (spec.bars ?? []).map((b) => {
  const actual = last?.bars?.[b.id] ?? null
  const op = b.compare ?? '>='
  const up = op.startsWith('>')
  const pass = typeof actual === 'number' && typeof b.threshold === 'number'
    ? ({ '>=': actual >= b.threshold, '>': actual > b.threshold, '<=': actual <= b.threshold, '<': actual < b.threshold, '==': actual === b.threshold, '!=': actual !== b.threshold }[op] ?? false)
    : null
  let pct = null
  if (typeof actual === 'number' && typeof b.threshold === 'number' && b.threshold !== 0) {
    pct = Math.max(0, Math.min(100, up ? (actual / b.threshold) * 100 : (b.threshold / actual) * 100))
  }
  return { ...b, compare: op, actual, pass, pct }
})

const passing = bars.filter((b) => b.pass === true).length
const measured = bars.filter((b) => b.pass !== null).length
const barIds = bars.map((b) => b.id)

const html = `<!doctype html>
<meta charset="utf-8"><title>${esc(spec.project ?? 'anvil')} — anvil loop</title>
<style>
  :root{--bg:#0c0d0f;--fg:#e8e6e3;--dim:#7d8590;--line:#1e2126;--pass:#4ade80;--fail:#f87171;--warn:#fbbf24}
  *{box-sizing:border-box}
  body{margin:0;padding:48px 32px;background:var(--bg);color:var(--fg);
       font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}
  .wrap{max-width:880px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px;letter-spacing:-.01em}
  .sub{color:var(--dim);margin-bottom:36px}
  .card{border:1px solid var(--line);border-radius:10px;padding:20px 22px;margin-bottom:18px}
  .lbl{color:var(--dim);font-size:11px;letter-spacing:.09em;text-transform:uppercase;margin-bottom:12px}
  .bar{display:grid;grid-template-columns:150px 1fr 116px;gap:14px;align-items:center;padding:9px 0}
  .bar+.bar{border-top:1px solid var(--line)}
  .track{height:6px;background:var(--line);border-radius:3px;overflow:hidden}
  .fill{height:100%;border-radius:3px}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .pass{color:var(--pass)}.fail{color:var(--fail)}.warn{color:var(--warn)}.dim{color:var(--dim)}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;color:var(--dim);font-weight:400;padding:6px 10px 6px 0;border-bottom:1px solid var(--line)}
  td{padding:6px 10px 6px 0;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
  .banner{padding:13px 16px;border-radius:8px;margin-bottom:18px;border:1px solid}
  .b-ok{border-color:#14532d;background:#052e16;color:var(--pass)}
  .b-no{border-color:#7f1d1d;background:#2a0a0a;color:var(--fail)}
  .b-warn{border-color:#78350f;background:#2a1a05;color:var(--warn)}
  .note{color:var(--dim);font-size:12px;margin-top:14px;white-space:pre-wrap}
</style>
<div class=wrap>
  <h1>${esc(spec.project ?? 'untitled')}</h1>
  <div class=sub>${esc(spec.concept ?? '')}</div>

  ${verified
    ? `<div class="banner b-ok">HARNESS VERIFIED — ${esc(verified.verifiedAt)}. Scores below are trustworthy.</div>`
    : `<div class="banner b-no">HARNESS NOT VERIFIED — run <b>node tools/verify-harness.mjs</b>. Until it passes, every number below is noise.</div>`}

  ${state.inFlight ? `<div class="banner b-warn">IN FLIGHT — "${esc(state.inFlight.task)}" claimed ${esc(String(state.inFlight.startedAt).slice(0, 16).replace('T', ' '))} and not closed. If nothing is running, the last session was interrupted.</div>` : ''}
  ${state.stall?.rounds >= 3 ? `<div class="banner b-warn">STALLED — ${state.stall.rounds} gate runs with no improvement on any bar. The approach needs to change, not the threshold.</div>` : ''}
  ${lastDrift?.detected ? `<div class="banner b-warn">CRITIC DRIFT — frozen anchors are scoring higher than they originally did. Recent gains are not real.</div>` : ''}

  <div class=card>
    <div class=lbl>phase</div>
    <div style="font-size:16px">Phase ${esc(state.phase?.id ?? '?')} — ${esc(state.phase?.name ?? 'unknown')} · iteration ${esc(state.iteration ?? 0)}</div>
    ${state.nextAction ? `<div class=note>NEXT: ${esc(state.nextAction)}</div>` : `<div class=note>No next action recorded.</div>`}
  </div>

  <div class=card>
    <div class=lbl>exit condition — ${passing}/${bars.length} passing${measured < bars.length ? `  ·  ${bars.length - measured} not yet measured` : ''}</div>
    ${bars.map((b) => {
      const cls = b.pass === true ? 'pass' : b.pass === false ? 'fail' : 'dim'
      const color = b.pass === true ? 'var(--pass)' : b.pass === false ? 'var(--fail)' : 'var(--line)'
      return `<div class=bar>
        <div>${esc(b.id)}<div style="color:var(--dim);font-size:11px">${esc(b.kind ?? '')}</div></div>
        <div class=track><div class=fill style="width:${b.pct ?? 0}%;background:${color}"></div></div>
        <div class="num ${cls}">${fmt(b.actual)} <span class=dim>${esc(b.compare)} ${esc(b.threshold)}</span></div>
      </div>`
    }).join('')}
    <div class=note>Scored on the worst member of ${esc(spec.coverage?.members ?? '?')} ${esc(spec.coverage?.axis ?? 'member')}(s), never the mean.</div>
  </div>

  ${history.length ? `<div class=card>
    <div class=lbl>gate history</div>
    <table>
      <tr><th>iteration</th>${barIds.map((id) => `<th>${esc(id)}</th>`).join('')}<th>passing</th><th>worst member</th></tr>
      ${history.slice(-15).map((h) => `<tr><td>${esc(h.iteration)}</td>${barIds.map((id) => `<td>${fmt(h.bars?.[id])}</td>`).join('')}<td>${esc(h.passing)}/${esc(h.total)}</td><td>${esc(h.worstMember ?? '—')}</td></tr>`).join('')}
    </table>
  </div>` : ''}

  ${(state.drift ?? []).length ? `<div class=card>
    <div class=lbl>critic drift</div>
    <table>
      <tr><th>iteration</th><th>anchors, original</th><th>anchors, now</th><th>drift</th><th>flagged</th></tr>
      ${state.drift.slice(-10).map((d) => `<tr><td>${esc(d.iteration)}</td><td>${fmt(d.original)}</td><td>${fmt(d.current)}</td><td>${fmt(d.drift)}</td><td class="${d.detected ? 'fail' : 'dim'}">${d.detected ? 'YES' : 'no'}</td></tr>`).join('')}
    </table>
  </div>` : ''}

  <div class=card>
    <div class=lbl>integrity</div>
    <div>gate fingerprint <span class=dim>${esc(lock?.fingerprint ?? 'unlocked')}</span>${lock?.approvedBy === 'human' ? ' <span class=warn>· exit condition was changed and human-approved</span>' : ''}</div>
    <div class=note>The loop may sharpen its methods. It may never soften its exit numbers.
gate.mjs refuses to run if a threshold gets easier, a bar disappears, or the coverage axis narrows.</div>
  </div>

  <div class=sub style="margin:26px 0 0;font-size:12px">generated by tools/status.mjs · the anvil loop</div>
</div>`

writeFileSync(`${ROOT}/${out}`, html)
console.log(`\n  ${out} written — ${passing}/${bars.length} bars passing, harness ${verified ? 'verified' : 'NOT verified'}\n`)
