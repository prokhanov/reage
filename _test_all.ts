import { parseAnchors } from './src/lib/anchorParser.ts';
import * as fs from 'fs';

const bmsRaw = fs.readFileSync('/tmp/bms.tsv', 'utf-8').trim().split('\n');
const nameToCode: Record<string, string> = {};
const codes: string[] = [];
for (const line of bmsRaw) {
  const [code, name] = line.split('\t');
  if (code && name) { nameToCode[name] = code; codes.push(code); }
}

const categories = [
  { id: 'c874b415-b4fe-43d2-9a90-fa97c2277392', name: 'Энергия и восстановление' },
  { id: 'd9e308e7-d030-49d7-8f5b-ed230495b196', name: 'Метаболизм и Детоксикация' },
  { id: '08162a60-ed41-426b-9cb1-969f22bb3be3', name: 'Сердечно-сосудистая система' },
  { id: '50dbe2ef-115e-44bc-9a39-f78eec4617d7', name: 'Воспалительная и иммунная система' },
  { id: 'a49c8604-0cbd-4852-9a19-f074ab04f40e', name: 'Эндокринная и стрессовая система' },
];

let totalIssues = 0;

for (const cat of categories) {
  const text = fs.readFileSync(`/tmp/report_${cat.id}.txt`, 'utf-8');
  const blocks = parseAnchors(text, codes, nameToCode);
  const bms = blocks.filter(b => b.type === 'biomarker') as any[];
  const texts = blocks.filter(b => b.type === 'text') as any[];
  const emptyBms = bms.filter(b => !b.content?.trim());
  const summaryKeywords = ['Общая оценка', 'Сильные стороны', 'Дефициты и дисфункции'];

  console.log(`\n═══ ${cat.name} ═══`);
  console.log(`  Блоков: ${blocks.length} | Биомаркеров: ${bms.length} | Текст: ${texts.length}`);

  // Test 1: No empty biomarkers
  if (emptyBms.length > 0) {
    console.log(`  ❌ ПУСТЫЕ: ${emptyBms.map(b => b.code).join(', ')}`);
    totalIssues++;
  } else {
    console.log(`  ✅ Нет пустых биомаркеров`);
  }

  // Test 2: Last BM doesn't contain summary
  const lastBm = bms[bms.length - 1];
  if (lastBm) {
    const leaked = summaryKeywords.filter(kw => lastBm.content?.includes(kw));
    if (leaked.length > 0) {
      console.log(`  ❌ ПРОТЕКАНИЕ [${lastBm.code}]: ${leaked.join(', ')}`);
      totalIssues++;
    } else {
      console.log(`  ✅ Нет протекания`);
    }
  }

  // Test 3: Summary in separate block
  const hasSummary = texts.some(t => summaryKeywords.some(kw => t.content.includes(kw)));
  const summaryInText = summaryKeywords.some(kw => text.includes(kw));
  if (hasSummary) console.log(`  ✅ Summary отдельным блоком`);
  else if (summaryInText) { console.log(`  ❌ Summary не выделена`); totalIssues++; }
  else console.log(`  ⚠️  Summary отсутствует в тексте AI`);

  // Test 4: Biomarker count > 0
  if (bms.length === 0) { console.log(`  ❌ Нет распознанных биомаркеров!`); totalIssues++; }
  else console.log(`  ✅ ${bms.length} биомаркеров распознано`);

  // Show first/last 3
  if (bms.length > 0) {
    const show = bms.length <= 6 ? bms : [...bms.slice(0, 3), '...', ...bms.slice(-3)];
    for (const b of show) {
      if (typeof b === 'string') { console.log(`    ...`); continue; }
      console.log(`    ${b.code.padEnd(12)} len=${String(b.content.length).padStart(4)} :: ${b.content.slice(0, 60).replace(/\n/g, ' ')}`);
    }
  }
}

console.log(`\n${'═'.repeat(50)}`);
console.log(totalIssues === 0 ? '✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ' : `❌ ${totalIssues} проблем(а)`);
