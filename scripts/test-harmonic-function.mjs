import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const bundlePath = resolve(tempDir, "harmonicFunction.bundle.mjs");

await build({
  entryPoints: [resolve("src", "utils", "harmonicFunction.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const { getHarmonicFunction } = await import(pathToFileURL(bundlePath).href);

try {
  assert.deepEqual(getHarmonicFunction(1, "zh"), {
    label: "稳定",
    detail: "主和弦像音乐回到家，适合作为开始或落点。",
  });
  assert.equal(getHarmonicFunction(4, "zh").label, "展开");
  assert.equal(getHarmonicFunction(5, "zh").label, "回归");
  assert.equal(getHarmonicFunction(6, "zh").label, "转暗");
  assert.equal(getHarmonicFunction(5, "en").label, "Return");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
