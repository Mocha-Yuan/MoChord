import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const bundlePath = resolve(tempDir, "styleTemplates.bundle.mjs");

await build({
  entryPoints: [resolve("src", "data", "styleTemplates.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const { STYLE_TEMPLATES } = await import(pathToFileURL(bundlePath).href);

try {
  assert.deepEqual(
    STYLE_TEMPLATES.map((template) => template.id),
    ["mandopop", "city-pop", "folk", "rnb", "rock-chorus", "cinematic"],
  );
  assert.equal(STYLE_TEMPLATES.every((template) => template.prompt.includes("吉他")), true);
  assert.equal(STYLE_TEMPLATES.every((template) => template.prompt.length >= 24), true);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
