import { describe, it } from "vitest";
import { parseCategory } from "./parser";
import fs from "node:fs";

describe("debug intro", () => {
  it("prints blocks", () => {
    const text = fs.readFileSync("/tmp/pt/energy.txt", "utf8");
    const parsed = parseCategory("Энергия и восстановление", text);
    console.log("total blocks:", parsed.blocks.length);
    parsed.blocks.slice(0, 4).forEach((b, i) => {
      if (b.kind === "prose") console.log(i, "PROSE", JSON.stringify(b.markdown.slice(0, 300)));
      else console.log(i, "BIO", b.code, JSON.stringify(b.commentary.slice(0, 150)));
    });
  });
});
