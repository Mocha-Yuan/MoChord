import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-runtime-"));
const bundlePath = resolve(tempDir, "runtime.bundle.mjs");

try {
  const sourcePath = resolve(rootDir, "src", "utils", "runtime.ts");
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(sourcePath, "utf8"));
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  await import("node:fs/promises").then(({ writeFile }) => writeFile(bundlePath, output.outputText));

  const { hasTauriRuntime, getRuntimeKind, getRuntimeLabel } = await import(pathToFileURL(bundlePath).href);

  assert.equal(hasTauriRuntime({}), false);
  assert.equal(hasTauriRuntime({ __TAURI_INTERNALS__: {} }), true);

  assert.equal(getRuntimeKind({}), "browser");
  assert.equal(getRuntimeKind({ __TAURI_INTERNALS__: {} }), "tauri");
  assert.equal(getRuntimeKind({ __TAURI_INTERNALS__: {}, navigator: { userAgent: "Mozilla/5.0 Android" } }), "tauri-android");

  assert.equal(getRuntimeLabel("browser"), "browser");
  assert.equal(getRuntimeLabel("tauri"), "Tauri app");
  assert.equal(getRuntimeLabel("tauri-android"), "Tauri Android app");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
