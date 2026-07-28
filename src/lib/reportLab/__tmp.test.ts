import { describe, it } from "vitest";
import fs from "fs";
import { parseCategory } from "@/lib/reportLab/parser";
const cats = JSON.parse(fs.readFileSync("/tmp/cats.json","utf8"));
const bios = JSON.parse(fs.readFileSync("/tmp/bios.json","utf8"));
const idx = new Map<string, any>();
for (const b of bios) idx.set(b.code.toLowerCase().replace(/[\s\-_+()]/g,""), b);
describe("x", () => { it("parse", () => {
  for (const c of cats) {
    const cat = parseCategory(c.type, c.text, idx as any);
    const bio = cat.blocks.filter(b=>b.kind==="biomarker");
    console.log("=== " + c.type + " cards=" + bio.length);
    for (const b of cat.blocks) {
      if (b.kind === "biomarker") console.log("  BIO", (b as any).code, "|", ((b as any).commentary||"").slice(0,60).replace(/\n/g," "));
      else console.log("  PROSE", (b as any).markdown.slice(0,60).replace(/\n/g," "));
    }
  }
});});
