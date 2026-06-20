import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-profile-display-"));
const bundlePath = resolve(tempDir, "profileDisplay.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "profileDisplay.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const { getProfileDisplay } = await import(pathToFileURL(bundlePath).href);

try {
  assert.deepEqual(
    getProfileDisplay({
      profile: { display_name: "  Lin  ", avatar_url: "https://example.com/lin.jpg" },
      user: { email: "lin@example.com", user_metadata: { display_name: "Fallback" } },
    }),
    {
      name: "Lin",
      avatarUrl: "https://example.com/lin.jpg",
      initials: "L",
    },
  );

  assert.deepEqual(
    getProfileDisplay({
      profile: null,
      user: { email: "ada.lovelace@example.com", user_metadata: {} },
    }),
    {
      name: "ada.lovelace",
      avatarUrl: "",
      initials: "AL",
    },
  );

  assert.deepEqual(
    getProfileDisplay({
      profile: { display_name: "", avatar_url: "" },
      user: { email: "", user_metadata: { full_name: "Grace Hopper" } },
    }),
    {
      name: "Grace Hopper",
      avatarUrl: "",
      initials: "GH",
    },
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
