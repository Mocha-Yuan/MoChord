import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const fretboardSource = await readFile(resolve(rootDir, "src", "components", "FretboardDiagram.tsx"), "utf8");
const gallerySource = await readFile(resolve(rootDir, "src", "components", "ChordVoicingGallery.tsx"), "utf8");

assert.equal(fretboardSource.includes("shape-code"), false);
assert.equal(gallerySource.includes("getVoicingShapeCode"), false);
