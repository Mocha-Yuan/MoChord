import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = await readFile(resolve("src", "pages", "PracticePage.tsx"), "utf8");

assert.equal(source.includes("library-dashboard"), true);
assert.equal(source.includes("library-continue-card"), true);
assert.equal(source.includes("musicWorkspace"), true);
