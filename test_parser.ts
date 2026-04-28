import { parseAnchors } from './src/lib/anchorParser';
import fs from 'fs';
import path from 'path';

const dir = '/tmp/rep';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

let totalIssues = 0;
for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const blocks = parseAnchors(raw, fs.readFileSync('/tmp/codes.txt','utf8').split('\n').filter(Boolean));
  const bio = blocks.filter((b: any) => b.type === 'biomarker');
  const empty = bio.filter((b: any) => !b.content || b.content.trim().length < 50);
  const summary = blocks.find((b: any) => b.type === 'summary');
  const leaks = bio.filter((b: any) => /Общая оценка|Сильные стороны/i.test(b.content || ''));

  console.log(`\n=== ${f} ===`);
  console.log(`  blocks: ${blocks.length}, biomarkers: ${bio.length}, empty: ${empty.length}, leaks: ${leaks.length}, hasSummary: ${!!summary}`);
  if (empty.length) console.log(`  EMPTY codes: ${empty.map((b:any)=>b.code).join(', ')}`);
  if (leaks.length) console.log(`  LEAK codes: ${leaks.map((b:any)=>b.code).join(', ')}`);
  totalIssues += empty.length + leaks.length;
}
console.log(`\nTOTAL ISSUES: ${totalIssues}`);
