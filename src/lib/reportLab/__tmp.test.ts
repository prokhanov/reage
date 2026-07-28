import { describe, it } from "vitest";
import fs from "fs";
import { parseCategory } from "@/lib/reportLab/parser";
const text = fs.readFileSync("/tmp/imm.md","utf8");
const bios = JSON.parse(fs.readFileSync("/tmp/bios.json","utf8"));
const idx = new Map<string, any>();
for (const b of bios) idx.set(b.code.toLowerCase().replace(/[\s\-_+()]/g,""), b);
describe("x", () => { it("parse", () => {
  const cat = parseCategory({ id:"1", type:"Воспалительная и иммунная система", text } as any, idx as any);
  for (const b of cat.blocks) {
    if (b.kind === "biomarker") console.log("BIO", b.code, "|", (b.commentary||"").slice(0,80).replace(/\n/g," "));
    else console.log("PROSE", b.markdown.slice(0,80).replace(/\n/g," "));
  }
});});
