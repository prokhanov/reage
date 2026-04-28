import { parseAnchors, autoInjectAnchors } from '@/lib/anchorParser';
import fs from 'fs';
import path from 'path';

const dir = '/tmp/rep';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

// Load biomarker codes from a static fallback (anchorParser uses runtime DB list).
// We'll just call parseAnchors and inspect counts.

let totalIssues = 0;
for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const injected = autoInjectAnchors(raw, []);
  const blocks = parseAnchors(injected);
  const bio = blocks.filter((b: any) => b.type === 'biomarker');
  const empty = bio.filter((b: any) => !b.content || b.content.trim().length < 50);
  const summary = blocks.find((b: any) => b.type === 'summary');
  
  // Detect leakage: "Общая оценка" inside biomarker content
  const leaks = bio.filter((b: any) => /Общая оценка|Сильные стороны/i.test(b.content || ''));
  
  console.log(`\n=== ${f} ===`);
  console.log(`  blocks: ${blocks.length}, biomarkers: ${bio.length}, empty: ${empty.length}, leaks: ${leaks.length}, hasSummary: ${!!summary}`);
  if (empty.length) console.log(`  EMPTY codes: ${empty.map((b:any)=>b.code).join(', ')}`);
  if (leaks.length) console.log(`  LEAK codes: ${leaks.map((b:any)=>b.code).join(', ')}`);
  totalIssues += empty.length + leaks.length;
}
console.log(`\nTOTAL ISSUES: ${totalIssues}`);
