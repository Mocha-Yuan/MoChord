import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = await readFile(resolve("src", "components", "AIProgressionGenerator.tsx"), "utf8");
const practiceSource = await readFile(resolve("src", "pages", "PracticePage.tsx"), "utf8");
const i18nSource = await readFile(resolve("src", "i18n.tsx"), "utf8");

assert.match(source, /EXAMPLES_BY_LANGUAGE/, "AI generator examples should be language-aware");
assert.match(source, /zh:\s*\[/, "AI generator should define Chinese examples");
assert.match(source, /C大调 1-5-6-4/, "Chinese examples should avoid English major/minor wording");
assert.doesNotMatch(source, /const EXAMPLES = \[/, "AI generator should not use a single hard-coded example list");
assert.doesNotMatch(
  source,
  /generateLocalFallbackProgression\(nextInput,\s*keyMissing\s*\?/,
  "local demo generation should not surface missing API key as a generation warning",
);
assert.doesNotMatch(
  source,
  /setError\(keyMissing\s*\?\s*t\("missingKey"\)\s*:\s*null\)/,
  "local demo generation should clear the missing-key error state",
);
assert.match(practiceSource, /PRACTICE_EXAMPLES_BY_LANGUAGE/, "Practice page examples should be language-aware");
assert.match(practiceSource, /C大调 1-5-6-4/, "Chinese practice examples should avoid English major/minor wording");
assert.doesNotMatch(i18nSource, /无需 API Key/, "Chinese copy should use API 密钥 instead of API Key");
assert.doesNotMatch(i18nSource, /本地 fallback/, "Chinese copy should use 本地生成 instead of fallback");
