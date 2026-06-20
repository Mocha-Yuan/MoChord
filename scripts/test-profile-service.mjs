import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-profile-service-"));
const bundlePath = resolve(tempDir, "profileService.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "services", "profileService.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const { buildAvatarUploadPath, normalizeProfileInput, validateAvatarImageFile } = await import(pathToFileURL(bundlePath).href);

try {
  const normalized = normalizeProfileInput({
    displayName: "  Ada  ",
    avatarUrl: " https://example.com/avatar.png ",
    age: "28",
    gender: "female",
    guitarYears: "3.5",
  });

  assert.equal(normalized.error, null);
  assert.deepEqual(normalized.data, {
    display_name: "Ada",
    avatar_url: "https://example.com/avatar.png",
    age: 28,
    gender: "female",
    guitar_years: 3.5,
  });

  assert.deepEqual(
    normalizeProfileInput({
      displayName: "",
      avatarUrl: "",
      age: "",
      gender: "",
      guitarYears: "",
    }).data,
    {
      display_name: null,
      avatar_url: null,
      age: null,
      gender: null,
      guitar_years: null,
    },
  );

  assert.equal(normalizeProfileInput({ displayName: "", avatarUrl: "", age: "-1", gender: "", guitarYears: "" }).error, "age");
  assert.equal(normalizeProfileInput({ displayName: "", avatarUrl: "", age: "12", gender: "bad", guitarYears: "" }).error, "gender");
  assert.equal(normalizeProfileInput({ displayName: "", avatarUrl: "not-a-url", age: "", gender: "", guitarYears: "" }).error, "avatar");
  assert.equal(normalizeProfileInput({ displayName: "", avatarUrl: "", age: "", gender: "", guitarYears: "101" }).error, "guitarYears");

  assert.equal(validateAvatarImageFile({ name: "avatar.jpg", type: "image/jpeg", size: 1024 }).error, null);
  assert.equal(validateAvatarImageFile({ name: "avatar.webp", type: "image/webp", size: 1024 }).error, null);
  assert.equal(validateAvatarImageFile({ name: "avatar.gif", type: "image/gif", size: 1024 }).error, "type");
  assert.equal(validateAvatarImageFile({ name: "avatar.jpg", type: "image/jpeg", size: 3 * 1024 * 1024 }).error, "size");

  const uploadPath = buildAvatarUploadPath("user-123", { name: "My Avatar.JPG", type: "image/jpeg", size: 1024 }, "fixed-id");
  assert.equal(uploadPath, "user-123/fixed-id-my-avatar.jpg");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
