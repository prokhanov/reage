import { parseAnchors } from './src/lib/anchorParser.ts';
import * as fs from 'fs';
const text = fs.readFileSync('/tmp/report.txt', 'utf-8');
const bmsRaw = fs.readFileSync('/tmp/bms.tsv', 'utf-8').trim().split('\n');
const nameToCode: Record<string, string> = {};
const codes: string[] = [];
for (const line of bmsRaw) {
  const [code, name] = line.split('\t');
  if (code && name) { nameToCode[name] = code;