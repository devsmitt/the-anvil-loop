#!/usr/bin/env node
/**
 * status.mjs — the dashboard.
 *
 * Reads .anvil/*.json only. It never scrapes PROGRESS.md — that file is a rendered view,
 * and parsing a rendered view is how a dashboard ends up showing drift rows as scores.
 *
 *   node tools/status.mjs [--out=status.html]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'

const ROOT = process.cwd()
const out = (process.argv.find((a) => a.startsWith('--out=')) || '--out=status.html').split('=')[1]

if (!existsSync(`${ROOT}/anvil.json`)) { console.error('\n  anvil.json not found — see AGENTS.md, SITUATION 1.\n'); process.exit(2) }
let spec
try { spec = JSON.parse(readFileSync(`${ROOT}/anvil.json`, 'utf8')) }
catch (e) { console.error(`\n  anvil.json does not parse: ${e.message}\n`); process.exit(2) }

const rj = (p) => { try { return JSON.parse(readFileSync(`${ROOT}/${p}`, 'utf8')) } catch { return null } }
const state = rj('.anvil/state.json') ?? {}
const instruments = rj('.anvil/instruments.json')

const hist = state.history ?? []
const last = hist.at(-1) ?? null
const memberIds = [...new Set(hist.flatMap((h) => Object.keys(h.scores ?? {})))]
const target = spec.fidelity?.target ?? 100
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const fmt = (n) => (typeof n === 'number' ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : '—')

// Contact sheet — the frames, next to the reference. This is the part a human reads.
const shots = (dir) => { try { return readdirSync(`${ROOT}/${dir}`).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).slice(0, 24) } catch { return [] } }
const latest = shots('shots').length ? 'shots' : (shots('.anvil/latest').length ? '.anvil/latest' : null)
const refDir = spec.reference?.path?.replace(/\/$/, '') ?? 'reference'
const refs = shots(refDir)

const spark = (member) => {
  const pts = hist.map((h) => h.scores?.[member]).filter((v) => typeof v === 'number')
  if (pts.length < 2) return ''
  const W = 150, H = 34, min = 0, max = Math.max(target, ...pts)
  const d = pts.map((v, i) => `${(i / (pts.length - 1)) * W},${H - ((v - min) / (max - min || 1)) * H}`).join(' ')
  const ty = H - ((target - min) / (max - min || 1)) * H
  return `<svg width="${W}" height="${H}" style="overflow:visible">
    <line x1="0" y1="${ty}" x2="${W}" y2="${ty}" stroke="#3d4450" stroke-dasharray="2 3"/>
    <polyline points="${d}" fill="none" stroke="#4ade80" stroke-width="2"/></svg>`
}

const rows = memberIds.map((m) => {
  const s = last?.scores?.[m]
  const b = state.best?.[m]
  const below = typeof s === 'number' && typeof b === 'number' && s < b
  return { m, s, b, below, pct: typeof s === 'number' ? Math.max(0, Math.min(100, (s / target) * 100)) : 0 }
})

const openDebt = (state.debt ?? []).filter((d) => !d.paid)
const worst = rows.filter((r) => typeof r.s === 'number').sort((a, b) => a.s - b.s)[0]

const html = `<!doctype html>
<meta charset="utf-8"><title>${esc(spec.project ?? 'anvil')}</title>
<style>
 :root{--bg:#0c0d0f;--fg:#e8e6e3;--dim:#7d8590;--line:#1e2126;--ok:#4ade80;--no:#f87171;--warn:#fbbf24}
 *{box-sizing:border-box}
 body{margin:0;padding:44px 30px;background:var(--bg);color:var(--fg);font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}
 .wrap{max-width:1040px;margin:0 auto}
 h1{font-size:22px;margin:0 0 2px}.sub{color:var(--dim);margin-bottom:30px}
 .card{border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin-bottom:16px}
 .lbl{color:var(--dim);font-size:11px;letter-spacing:.09em;text-transform:uppercase;margin-bottom:12px}
 .row{display:grid;grid-template-columns:130px 1fr 160px 110px;gap:14px;align-items:center;padding:8px 0}
 .row+.row{border-top:1px solid var(--line)}
 .track{height:6px;background:var(--line);border-radius:3px;overflow:hidden}
 .fill{height:100%;border-radius:3px;background:var(--ok)}
 .num{text-align:right;font-variant-numeric:tabular-nums}
 .dim{color:var(--dim)}.ok{color:var(--ok)}.no{color:var(--no)}.warn{color:var(--warn)}
 .ban{padding:12px 15px;border-radius:8px;margin-bottom:16px;border:1px solid}
 .b-no{border-color:#7f1d1d;background:#2a0a0a;color:var(--no)}
 .b-w{border-color:#78350f;background:#2a1a05;color:var(--warn)}
 .b-ok{border-color:#14532d;background:#052e16;color:var(--ok)}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:9px}
 .grid img{width:100%;border-radius:6px;border:1px solid var(--line);display:block}
 .cap{color:var(--dim);font-size:11px;margin-top:3px}
 table{width:100%;border-collapse:collapse;font-size:12px}
 th{text-align:left;color:var(--dim);font-weight:400;padding:5px 9px 5px 0;border-bottom:1px solid var(--line)}
 td{padding:5px 9px 5px 0;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
 .note{color:var(--dim);font-size:12px;margin-top:12px;white-space:pre-wrap}
</style>
<div class=wrap>
 <h1>${esc(spec.project ?? 'untitled')}</h1>
 <div class=sub>${esc(spec.concept ?? '')} &nbsp;·&nbsp; Act ${esc(state.act ?? 1)} &nbsp;·&nbsp; round ${esc(state.round ?? 0)}</div>

 ${rows.some((r) => r.below) ? `<div class="ban b-no"><b>REGRESSION</b> — ${rows.filter((r) => r.below).map((r) => `${esc(r.m)} ${fmt(r.s)} (best ${fmt(r.b)})`).join(', ')}. Something that worked is now worse.</div>` : ''}
 ${state.inFlight ? `<div class="ban b-w"><b>IN FLIGHT</b> — "${esc(state.inFlight.task)}" claimed and not closed. If nothing is running, the last session was killed here.</div>` : ''}
 ${last?.actPromoted ? `<div class="ban b-ok"><b>ACT II</b> — the primary member reached the notch. Widen the axis, start paying debt.</div>` : ''}

 ${last?.saw ? `<div class=card><div class=lbl>last round, what it actually showed</div><div style="font-size:15px">${esc(last.saw)}</div></div>` : ''}

 <div class=card>
  <div class=lbl>fidelity — target ${esc(target)}${spec.fidelity?.actNotch && (state.act ?? 1) < 2 ? ` · act notch ${esc(spec.fidelity.actNotch)}` : ''}</div>
  ${rows.length ? rows.map((r) => `<div class=row>
    <div>${esc(r.m)}${r.below ? '<div class="no" style="font-size:11px">below best</div>' : ''}</div>
    <div class=track><div class=fill style="width:${r.pct}%;background:${r.below ? 'var(--no)' : 'var(--ok)'}"></div></div>
    <div>${spark(r.m)}</div>
    <div class="num ${r.below ? 'no' : ''}">${fmt(r.s)} <span class=dim>/ ${esc(target)}</span></div>
   </div>`).join('') : '<div class=dim>No rounds recorded yet.</div>'}
  ${worst ? `<div class=note>Worst member is <b>${esc(worst.m)}</b> at ${fmt(worst.s)}. The score is the worst one, never the mean.</div>` : ''}
 </div>

 ${latest ? `<div class=card><div class=lbl>the build — look at it</div>
  <div class=grid>${shots(latest).map((f) => `<div><img src="${latest}/${esc(f)}"><div class=cap>${esc(f)}</div></div>`).join('')}</div></div>` : ''}

 ${refs.length ? `<div class=card><div class=lbl>the bar — ${esc(spec.reference?.mode ?? 'reference')}</div>
  <div class=grid>${refs.map((f) => `<div><img src="${refDir}/${esc(f)}"><div class=cap>${esc(f)}</div></div>`).join('')}</div></div>` : ''}

 ${instruments?.rows?.length ? `<div class=card><div class=lbl>instrument trust — advisory, nothing here blocks</div>
  <table><tr><th>trust</th><th>instrument</th><th>detail</th></tr>
  ${instruments.rows.map((r) => `<tr><td class="${r.trust === 'proven' ? 'ok' : r.trust === 'broken' ? 'no' : r.trust === 'absent' ? 'dim' : 'warn'}">${esc(r.trust)}</td><td>${esc(r.tool)}</td><td class=dim>${esc(r.detail)}</td></tr>`).join('')}
  </table></div>` : ''}

 ${openDebt.length ? `<div class=card><div class=lbl>debt — ${openDebt.length} open${(state.act ?? 1) < 2 ? ', paid in Act II' : ', pay it now'}</div>
  <table><tr><th>#</th><th>round</th><th>defect</th><th>evidence</th></tr>
  ${openDebt.slice(-12).map((d) => `<tr><td>${esc(d.n)}</td><td>${esc(d.round)}</td><td>${esc(d.defect)}</td><td class=dim>${esc(d.evidence)}</td></tr>`).join('')}
  </table></div>` : ''}

 ${hist.length ? `<div class=card><div class=lbl>rounds</div>
  <table><tr><th>r</th>${memberIds.map((m) => `<th>${esc(m)}</th>`).join('')}<th>saw</th></tr>
  ${hist.slice(-14).map((h) => `<tr><td>${esc(h.round)}</td>${memberIds.map((m) => `<td>${fmt(h.scores?.[m])}</td>`).join('')}<td class=dim>${esc(String(h.saw ?? '').slice(0, 90))}</td></tr>`).join('')}
  </table></div>` : ''}

 <div class=sub style="margin:22px 0 0;font-size:12px">tools/status.mjs · the anvil loop · the only rule is the ratchet</div>
</div>`

writeFileSync(`${ROOT}/${out}`, html)
console.log(`\n  ${out} written — act ${state.act ?? 1}, round ${state.round ?? 0}${rows.some((r) => r.below) ? ', REGRESSION' : ''}\n`)
