// `npm run gen:example`: makes the example dataset's evidence files in fixtures/example/evidence/ (server/example.ts adds
// them with "Fill it with example data"). The dataset itself is fixtures/example/example.json, edited by hand.
//
// Everything is invented: Alex Marlowe, both companies, every colleague, channel, repo and number. The pictures are
// the design prototype's (scripts/gen-evidence.mjs there): chat screenshots drawn the way the OCR fixtures draw them
// (test/screenshots.ts, so they're readable by the screenshot rules too), two dashboards and a tablet app, rendered
// to PNG with resvg and the bundled fonts only, so every machine makes the same pixels (which is why the reactions are
// ↑ and + rather than emoji: the bundled fonts have no emoji). The PDFs are one-page notes
// written by hand (no PDF library), the CSV a few rows.
//
// Run it after changing a picture here; commit what it writes. test/example.test.ts checks that every file
// example.json names exists and that this script would write the same bytes.
import fs from 'node:fs';
import path from 'node:path';
import { chat, png } from '../test/screenshots.ts';

const OUT = path.resolve(import.meta.dirname, '..', 'fixtures', 'example', 'evidence');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Every evidence file, by name: its bytes. */
export function evidenceFiles(): Record<string, Buffer> {
  const out: Record<string, Buffer> = {};
  const shot = (name: string, svg: string, zoom = 1.5) => (out[name] = png(svg, zoom));

  shot(
    'slack-preflight.png',
    chat({
      title: '# preflight',
      messages: [
        {
          author: 'Imani Brooks',
          time: '9:14 AM',
          text: 'Huge shoutout to @Alex Marlowe for getting offline checklist sync over the line. Crews at the pilot base ran 140 checklists this weekend on the hangar Wi-Fi and we had zero sync conflicts. Zero!',
          reactions: [
            ['↑', 14],
            ['+', 9],
            ['↑', 6],
          ],
          replies: '7 replies',
        },
      ],
    }).svg,
  );
  shot(
    'slack-billing.png',
    chat({
      title: '# eng-billing',
      messages: [
        {
          author: 'Dana Whitfield',
          time: '4:52 PM',
          text: 'Billing cutover is DONE. 41k subscriptions on the new ledger and not a single customer-facing error. @Alex Marlowe ran the dual-write plan beautifully. Thank you, this was a scary one.',
          reactions: [
            ['+', 21],
            ['↑', 11],
            ['+', 8],
          ],
          replies: '12 replies',
        },
      ],
    }).svg,
  );
  shot(
    'slack-incident.png',
    chat({
      title: '# incidents',
      messages: [
        {
          author: 'Oskar Lindqvist',
          time: '5:38 PM',
          text: 'Kudos to @Alex Marlowe for the new pager-bot timeline export. The postmortem for INC-2291 took 20 minutes instead of half a day.',
          reactions: [
            ['↑', 8],
            ['+', 5],
          ],
        },
      ],
    }).svg,
  );
  shot(
    'slack-design.png',
    chat({
      title: '# design-crit',
      messages: [
        {
          author: 'Sun-hee Lim',
          time: '2:20 PM',
          text: 'Crew test went really well today. Glove mode was the star: every tap target hit first time. @Alex Marlowe thanks for pushing for the bigger hit areas when I was ready to ship the small ones!',
          reactions: [
            ['+', 5],
            ['+', 3],
          ],
        },
      ],
    }).svg,
  );
  shot(
    'search-latency.png',
    chart({
      title: 'search-service · p95 latency',
      subtitle: 'Last 8 weeks · production · all regions',
      color: '#7aa2ff',
      unit: ' ms',
      yMax: 500,
      series: [410, 420, 398, 405, 380, 300, 210, 170, 162, 158, 165, 160, 155, 161],
      annotate: { at: 5, text: 'Batch re-ranker + warm cache' },
      labels: ['Apr 13', 'Apr 27', 'May 11', 'May 25', 'Jun 8'],
    }),
  );
  shot(
    'pages-chart.png',
    chart({
      title: 'Pages per week · ops on-call',
      subtitle: 'Primary rotation · Jul – Sep',
      color: '#ff9f6b',
      unit: '',
      yMax: 60,
      series: [49, 52, 55, 50, 53, 51, 44, 38, 33, 32, 31, 32],
      annotate: { at: 6, text: 'Alert audit (29 deleted, 17 re-tuned)' },
      labels: ['Jul 6', 'Jul 27', 'Aug 17', 'Sep 7', 'Sep 28'],
    }),
  );
  shot('preflight-ui.png', tablet(), 1);

  out['preflight-design-v3.pdf'] = pdf('Pre-flight checklist: design doc v3', [
    'Goal: digital pre-flight checklists crews can trust offline.',
    'Tablet layout with glove-sized tap targets (48 px minimum).',
    'Every sign-off is stored with who, when and the aircraft.',
    'Sync: per-item state merges (no lost sign-offs on reconnect).',
    'Open questions: regulator export format; variant overrides.',
  ]);
  out['INC-2291-postmortem.pdf'] = pdf('INC-2291 postmortem: ops-api brownout', [
    'Duration: 47 minutes. Impact: roster and duty reports slow or failing.',
    'Cause: a connection-pool leak in the roster endpoint after a deploy.',
    'Detection: pager-bot alert on p95 latency, 4 minutes after deploy.',
    'Fix: rollback, then a patch closing connections on the error path.',
    'Follow-ups: pool saturation alert; load test in CI.',
  ]);
  out['billing-handover.pdf'] = pdf('Billing core: handover notes', [
    'Architecture: ledger service, invoicer, webhook ingestion.',
    'Runbooks: retrying a failed invoice run; replaying webhooks.',
    'The three things that will page you, and what to do first.',
    'Reconciliation report: where it lives and how to read it.',
  ]);
  out['billing-migration-plan.pdf'] = pdf('Billing migration: dual-write plan', [
    'Phase 1: write to both ledgers; read from the old one.',
    'Phase 2: nightly reconciliation; drift budget 0.01%.',
    'Phase 3: flip the read path; keep dual-write for a week.',
    'Rollback: flip back; the old ledger stays complete throughout.',
  ]);
  out['search-offline-eval.pdf'] = pdf('Search relevance: offline evaluation', [
    'Metric: nDCG@10 over 4,000 judged queries.',
    'Judgements: three raters per query, majority label.',
    'Runs in CI in about 6 minutes on every ranking change.',
    'Baseline BM25: 0.412. Hybrid ranking: 0.468.',
  ]);
  out['audit-export-sample.csv'] = Buffer.from(
    [
      'signed_at,aircraft,section,item,signed_by,hash',
      '2026-10-06T06:12:40Z,AT-212,Exterior,Exterior walk-around,R. Osei,9c1e…a4',
      '2026-10-06T06:13:05Z,AT-212,Exterior,Fuel quantity and sample,R. Osei,52b0…7f',
      '2026-10-06T06:13:31Z,AT-212,Exterior,Pitot covers removed,R. Osei,e83d…11',
      '2026-10-06T06:14:02Z,AT-212,Exterior,Control surfaces free and correct,R. Osei,07aa…c9',
      '',
    ].join('\n'),
  );
  return out;
}

/** A line chart on a dark dashboard (the prototype's). */
function chart(o: { title: string; subtitle: string; series: number[]; color: string; unit: string; yMax: number; annotate: { at: number; text: string }; labels: string[] }): string {
  const W = 800;
  const H = 420;
  const L = 64;
  const R = 24;
  const T = 92;
  const B = 56;
  const pw = W - L - R;
  const ph = H - T - B;
  const pts = o.series.map((v, i) => [L + (i / (o.series.length - 1)) * pw, T + ph - (v / o.yMax) * ph] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${L + pw},${T + ph} L${L},${T + ph} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = T + ph - f * ph;
      return `<line x1="${L}" x2="${L + pw}" y1="${y}" y2="${y}" stroke="#2a2f3a"/><text x="${L - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#8a93a6">${Math.round(f * o.yMax)}${o.unit}</text>`;
    })
    .join('');
  const xl = o.labels.map((l, i) => `<text x="${L + (i / (o.labels.length - 1)) * pw}" y="${H - 28}" text-anchor="middle" font-size="11" fill="#8a93a6">${esc(l)}</text>`).join('');
  const [ax] = pts[o.annotate.at]!;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter">
<rect width="${W}" height="${H}" fill="#151821"/>
<text x="24" y="38" font-size="17" font-weight="600" fill="#e6e9ef">${esc(o.title)}</text>
<text x="24" y="60" font-size="12" fill="#8a93a6">${esc(o.subtitle)}</text>
${grid}${xl}
<path d="${area}" fill="${o.color}" opacity="0.16"/>
<path d="${line}" fill="none" stroke="${o.color}" stroke-width="2.5"/>
<line x1="${ax}" x2="${ax}" y1="${T}" y2="${T + ph}" stroke="#e6e9ef" stroke-dasharray="4 4" opacity="0.5"/>
<rect x="${ax + 8}" y="${T + 4}" width="${o.annotate.text.length * 6.6 + 16}" height="24" rx="4" fill="#232836"/>
<text x="${ax + 16}" y="${T + 20}" font-size="12" fill="#e6e9ef">${esc(o.annotate.text)}</text>
</svg>`;
}

/** The tablet checklist app (the prototype's). */
function tablet(): string {
  const W = 960;
  const H = 600;
  const items: [string, boolean][] = [
    ['Exterior walk-around', true],
    ['Fuel quantity and sample', true],
    ['Pitot covers removed', true],
    ['Control surfaces free and correct', false],
    ['Tyre pressure and wear', false],
    ['Lights: nav, strobe, landing', false],
  ];
  const rows = items
    .map(([t, done], i) => {
      const y = 150 + i * 70;
      return `<rect x="40" y="${y}" width="560" height="58" rx="12" fill="${done ? '#eaf6f1' : '#ffffff'}" stroke="${done ? '#9fd6c0' : '#dfe3ea'}"/>
<rect x="58" y="${y + 13}" width="32" height="32" rx="8" fill="${done ? '#1f9d74' : '#ffffff'}" stroke="${done ? '#1f9d74' : '#9aa3b2'}" stroke-width="2"/>
${done ? `<path d="M66 ${y + 29} l6 6 l12 -13" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>` : ''}
<text x="108" y="${y + 36}" font-size="20" fill="#1b2230" font-weight="${done ? 400 : 600}">${esc(t)}</text>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter">
<rect width="${W}" height="${H}" fill="#f3f5f8"/>
<rect width="${W}" height="72" fill="#0f2a3d"/>
<text x="40" y="45" font-size="22" font-weight="700" fill="#fff">Pre-flight · AT-212</text>
<text x="${W - 40}" y="45" text-anchor="end" font-size="15" fill="#9cc3dd">Offline · 3 queued</text>
<text x="40" y="118" font-size="15" fill="#5b6576" letter-spacing="1">EXTERIOR · 3 OF 6</text>
<rect x="240" y="106" width="360" height="10" rx="5" fill="#dfe3ea"/><rect x="240" y="106" width="180" height="10" rx="5" fill="#1f9d74"/>
${rows}
<rect x="640" y="150" width="280" height="390" rx="16" fill="#ffffff" stroke="#dfe3ea"/>
<text x="664" y="190" font-size="15" fill="#5b6576" letter-spacing="1">SIGN-OFF</text>
<text x="664" y="228" font-size="19" fill="#1b2230" font-weight="600">Captain R. Osei</text>
<text x="664" y="256" font-size="15" fill="#5b6576">Glove mode on</text>
<rect x="664" y="460" width="232" height="56" rx="12" fill="#0f2a3d"/>
<text x="780" y="495" text-anchor="middle" font-size="18" fill="#fff" font-weight="600">Next section</text>
</svg>`;
}

/** A one-page PDF: a title and a few lines, in Helvetica (built in to every reader, so nothing is embedded). */
function pdf(title: string, lines: string[]): Buffer {
  // PDF strings: escape \ ( ), and keep to Latin-1 (the dataset's text is ASCII)
  const s = (t: string) => `(${t.replace(/[\\()]/g, (c) => '\\' + c)})`;
  const text = [`BT /F1 20 Tf 72 720 Td ${s(title)} Tj ET`, ...lines.map((l, i) => `BT /F1 12 Tf 72 ${680 - i * 22} Td ${s(l)} Tj ET`), 'BT /F1 9 Tf 72 72 Td (Example data: everything in this document is made up.) Tj ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(text, 'latin1')} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title ${s(title)} /Producer (BragDoc example data) >>`,
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, bytes] of Object.entries(evidenceFiles())) {
    fs.writeFileSync(path.join(OUT, name), bytes);
    console.log(`${name}  ${(bytes.length / 1024).toFixed(1)} KB`);
  }
}
