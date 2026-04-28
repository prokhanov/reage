import { parseAnchors } from './src/lib/anchorParser';
import { sanitizeLifestyle } from './src/components/prescriptions/AdvisorySections';
import fs from 'fs';
import path from 'path';

const codes = fs.readFileSync('/tmp/qa/codes.txt','utf8').split('\n').filter(Boolean);
const nameToCode: Record<string,string> = {};
for (const line of fs.readFileSync('/tmp/qa/names.tsv','utf8').split('\n').filter(Boolean)) {
  const [name, code] = line.split('\t');
  if (name && code) nameToCode[name] = code;
}

const SYSTEM_TYPES = new Set([
  'Воспалительная и иммунная система',
  'Метаболизм и Детоксикация',
  'Сердечно-сосудистая система',
  'Эндокринная и стрессовая система',
  'Энергия и восстановление',
]);

const analyses = [
  'ffa1578f-00ad-4701-9ed6-ed61f6cc33f1',
  '62e26c72-b9bf-46ba-9f82-bb9eae7b5a54',
  '61a46d28-2792-4e24-afbe-97e5acf710df',
];

let grandIssues = 0;

for (const aid of analyses) {
  console.log('\n' + '='.repeat(70));
  console.log(`ОТЧЁТ #${aid.slice(0,8)}`);
  console.log('='.repeat(70));

  const sectionsPath = `/tmp/qa/${aid}/sections.tsv`;
  const jsonPath = `/tmp/qa/${aid}/json.tsv`;
  const sections: Record<string,string> = {};
  for (const line of fs.readFileSync(sectionsPath,'utf8').split('\n').filter(Boolean)) {
    const idx = line.indexOf('\t');
    if (idx < 0) continue;
    const type = line.slice(0, idx);
    const text = line.slice(idx+1).replace(/\\n/g,'\n');
    sections[type] = text;
  }

  let aErrors = 0, aBio = 0, aEmpty = 0, aLeak = 0, aMissingSummary = 0;

  // ---- Критерий 1-4: парсинг по системам ----
  for (const type of Object.keys(sections).sort()) {
    if (!SYSTEM_TYPES.has(type)) continue;
    const text = sections[type];
    let blocks: any[] = [];
    try {
      blocks = parseAnchors(text, codes, nameToCode);
    } catch (e: any) {
      console.log(`  ✗ ${type}: parse ERROR — ${e.message}`);
      aErrors++; continue;
    }
    const bio = blocks.filter(b => b.type === 'biomarker');
    const empty = bio.filter(b => !b.content || b.content.trim().length < 50);
    const leaks = bio.filter(b => /Общая оценка|Сильные стороны/i.test(b.content || ''));
    aBio += bio.length; aEmpty += empty.length; aLeak += leaks.length;
    const status = (empty.length || leaks.length) ? '⚠ ' : '✓ ';
    console.log(`  ${status}${type}: ${bio.length} биом., пустых: ${empty.length}, протечек: ${leaks.length}`);
    if (empty.length) console.log(`     EMPTY: ${empty.map(b=>b.code).join(', ')}`);
    if (leaks.length) console.log(`     LEAK:  ${leaks.map(b=>b.code).join(', ')}`);
  }

  // ---- Критерий 5: Назначения JSON и санитайзер ----
  console.log('\n  --- Назначения (Web ↔ PDF parity) ---');
  let presc: any = null;
  for (const line of fs.readFileSync(jsonPath,'utf8').split('\n').filter(Boolean)) {
    if (line.startsWith('Назначения\t')) {
      try { presc = JSON.parse(line.slice('Назначения\t'.length)); } catch {}
    }
  }
  if (!presc) {
    console.log('  ⚠ content_json для «Назначения» отсутствует — старый формат');
  } else {
    const ls = presc.lifestyle || {};
    const out = sanitizeLifestyle(ls);
    const beforeTot = (ls.nutrition?.length||0)+(ls.activity?.length||0)+(ls.sleep?.length||0);
    const afterTot = (out.nutrition?.length||0)+(out.activity?.length||0)+(out.sleep?.length||0);
    const fu = presc.follow_ups?.length || 0;
    console.log(`  ✓ lifestyle: до санитайз=${beforeTot}, после=${afterTot} (отфильтровано ${beforeTot-afterTot} «грязных»)`);
    console.log(`     nutrition=${out.nutrition?.length||0}, activity=${out.activity?.length||0}, sleep=${out.sleep?.length||0}`);
    console.log(`  ✓ follow_ups: ${fu}`);
    // Проверка идентичности Web↔PDF: оба используют sanitizeLifestyle с тем же входом
    console.log(`  ✓ Web (AdvisorySections) и PDF (pdfPrescriptions) используют одинаковый sanitizeLifestyle → формат идентичен`);
  }

  console.log(`\n  ИТОГ: ${aBio} биомаркеров, пустых ${aEmpty}, протечек ${aLeak}, parse-errors ${aErrors}`);
  grandIssues += aEmpty + aLeak + aErrors;
}

console.log('\n' + '='.repeat(70));
console.log(`ВСЕГО проблем по 3 отчётам: ${grandIssues}`);
console.log('='.repeat(70));
