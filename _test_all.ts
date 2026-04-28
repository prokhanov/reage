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

let allPassed = true;

for (const cat of categories) {
  const text = fs.readFileSync(`/tmp/report_${cat.id}.txt`, 'utf-8');
  const blocks = parseAnchors(text, codes, nameToCode);
  const bms = blocks.filter(b => b.type === 'biomarker') as any[];
  const texts = blocks.filter(b => b.type === 'text') as any[];
  const emptyBms = bms.filter(b => !b.content?.trim());

  console.log(`\n═══ ${cat.name} ═══`);
  console.log(`  Блоков: ${blocks.length} | Биомаркеров: ${bms.length} | Текст: ${texts.length}`);
  
  // Test 1: No empty biomarkers
  if (emptyBms.length > 0) {
    console.log(`  ❌ ПУСТЫЕ БИОМАРКЕРЫ: ${emptyBms.map(b => b.code).join(', ')}`);
    allPassed = false;
  } else {
    console.log(`  ✅ Нет пустых биомаркеров`);
  }

  // Test 2: Last biomarker doesn't contain summary keywords ("Общая оценка", "Сильные стороны")
  const lastBm = bms[bms.length - 1];
  const summaryKeywords = ['Общая оценка', 'Сильные стороны', 'Дефициты и дисфункции'];
  const leakedKeywords = summaryKeywords.filter(kw => lastBm?.content?.includes(kw));
  if (leakedKeywords.length > 0) {
    console.log(`  ❌ ПРОТЕКАНИЕ: последний BM [${lastBm.code}] содержит: ${leakedKeywords.join(', ')}`);
    allPassed = false;
  } else {
    console.log(`  ✅ Нет протекания последнего маркера`);
  }

  // Test 3: Summary text exists as separate block
  const hasSummary = texts.some(t => t.content.includes('Общая оценка') || t.content.includes('Сильные стороны'));
  if (hasSummary) {
    console.log(`  ✅ Summary вынесена в отдельный текстовый блок`);
  } else {
    // Check if summary exists in raw text at all
    if (text.includes('Общая оценка') || text.includes('Сильные стороны')) {
      console.log(`  ❌ Summary есть в тексте, но не вынесена в отдельный блок`);
      allPassed = false;
    } else {
      console.log(`  ⚠️  Summary отсутствует в исходном тексте AI`);
    }
  }

  // Test 4: All biomarker content has meaningful length (>50 chars)
  const shortBms = bms.filter(b => b.content && b.content.length < 50);
  if (shortBms.length > 0) {
    console.log(`  ⚠️  Короткие описания (<50 символов): ${shortBms.map(b => `${b.code}(${b.content.length})`).join(', ')}`);
  } else {
    console.log(`  ✅ Все описания достаточной длины`);
  }

  // Test 5: Structure order — text intro first, then biomarkers, then text summary
  const firstBmIdx = blocks.findIndex(b => b.type === 'biomarker');
  const lastBmIdx = blocks.length - 1 - [...blocks].reverse().findIndex(b => b.type === 'biomarker');
  const introExists = firstBmIdx > 0 && blocks[0].type === 'text';
  if (introExists) {
    console.log(`  ✅ Вступительный текст присутствует`);
  } else {
    console.log(`  ⚠️  Нет вступительного текста перед маркерами`);
  }

  // Detail: list all BMs
  console.log(`  --- Биомаркеры ---`);
  for (const b of bms) {
    const preview = b.content.slice(0, 60).replace(/\n/g, ' ');
    console.log(`    ${b.code.padEnd(12)} len=${String(b.content.length).padStart(4)} :: ${preview}`);
  }
}

console.log(`\n${'═'.repeat(60)}`);
console.log(allPassed ? '✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ' : '❌ ЕСТЬ ПРОБЛЕМЫ');
