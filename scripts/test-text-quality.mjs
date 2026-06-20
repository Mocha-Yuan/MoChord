import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const files = [
  "src/components/AIProgressionGenerator.tsx",
  "src/i18n.tsx",
  "src/services/deepseekPrompt.ts",
  "src/utils/diatonicChords.ts",
  "src/utils/progressionParser.ts",
];

const mojibakePattern = /璋|澶|灏|鍜|鐗|绾|闊|櫒|鎾|姣|鈥|俙|掳|寮|涓/;

for (const file of files) {
  const source = await readFile(resolve(file), "utf8");
  assert.equal(mojibakePattern.test(source), false, `${file} contains mojibake text`);
}
