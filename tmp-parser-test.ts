import { parseCategory } from "./src/lib/reportLab/parser";
import fs from "node:fs";
const text = fs.readFileSync("/tmp/pt/energy.txt", "utf8");
const parsed = parseCategory("Энергия и восстановление", text);
console.log("blocks count:", parsed.blocks.length);
for (const b of parsed.blocks.slice(0, 5)) {
  if (b.kind === "prose") console.log("--PROSE--", b.markdown.slice(0, 200));
  else console.log("--BIO--", b.code, b.commentary.slice(0, 100));
}
