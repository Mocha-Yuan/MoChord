import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");

const tauriConfigSource = readFileSync(resolve(rootDir, "src-tauri", "tauri.conf.json"), "utf8");
const appSource = readFileSync(resolve(rootDir, "src", "App.tsx"), "utf8");
const cssSource = readFileSync(resolve(rootDir, "src", "styles", "global.css"), "utf8");
const androidGradleSource = readFileSync(resolve(rootDir, "src-tauri", "gen", "android", "app", "build.gradle.kts"), "utf8");
const mainActivityPath = [
  resolve(rootDir, "src-tauri", "gen", "android", "app", "src", "main", "java", "com", "chordflow", "client", "MainActivity.kt"),
  resolve(rootDir, "src-tauri", "gen", "android", "app", "src", "main", "java", "com", "chordflow", "app", "MainActivity.kt"),
].find((path) => existsSync(path));
assert.ok(mainActivityPath, "MainActivity.kt should exist in the generated Android source tree.");
const mainActivitySource = readFileSync(mainActivityPath, "utf8");
const tunerControlsSource = readFileSync(resolve(rootDir, "src", "components", "TunerControls.tsx"), "utf8");
const androidManifestSource = readFileSync(
  resolve(rootDir, "src-tauri", "gen", "android", "app", "src", "main", "AndroidManifest.xml"),
  "utf8",
);

function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function mediaBlock(source, query) {
  const start = source.indexOf(`@media (${query})`);
  assert.notEqual(start, -1, `Missing media query: ${query}`);
  const next = source.indexOf("@media (", start + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

const phoneLayoutSource = mediaBlock(cssSource, "max-width: 1080px");

assert.match(tauriConfigSource, /"identifier": "com\.chordflow\.client"/);
assert.match(androidGradleSource, /namespace = "com\.chordflow\.client"/);
assert.match(androidGradleSource, /applicationId = "com\.chordflow\.client"/);
assert.match(androidGradleSource, /MOCHORD_ANDROID_SIGNING_PROPERTIES/);
assert.match(androidGradleSource, /\.android\/mochord-release\.properties/);
assert.match(androidGradleSource, /\.android\/chordflow-release\.properties/);
assert.match(androidGradleSource, /signingConfigs/);
assert.match(androidGradleSource, /create\("release"\)/);
assert.match(androidGradleSource, /storeFile = file/);
assert.match(androidGradleSource, /storePassword =/);
assert.match(androidGradleSource, /keyAlias =/);
assert.match(androidGradleSource, /keyPassword =/);
assert.match(androidGradleSource, /signingConfig = signingConfigs\.getByName\("release"\)/);
assert.match(mainActivitySource, /package com\.chordflow\.client/);
assert.match(mainActivitySource, /class MainActivity : WryActivity\(\)/);
assert.doesNotMatch(tauriConfigSource, /com\.chordflow\.app/);
assert.doesNotMatch(androidGradleSource, /com\.chordflow\.app/);

const sourceAndroidIcon = resolve(rootDir, "src-tauri", "icons", "android", "mipmap-xxxhdpi", "ic_launcher.png");
const generatedAndroidIcon = resolve(rootDir, "src-tauri", "gen", "android", "app", "src", "main", "res", "mipmap-xxxhdpi", "ic_launcher.png");
assert.equal(fileHash(generatedAndroidIcon), fileHash(sourceAndroidIcon));
assert.equal(
  existsSync(resolve(rootDir, "src-tauri", "gen", "android", "app", "src", "main", "java", "com", "chordflow", "app")),
  false,
);

assert.match(appSource, /className="app-utility-menu"/);
assert.match(appSource, /<LanguageToggle \/>[\s\S]*<UserMenu/);
assert.match(cssSource, /\.app-utility-menu/);
assert.match(cssSource, /\.app-utility-panel\s+\.language-toggle/);
assert.match(cssSource, /\.app-utility-panel\s+\.auth-toolbar/);

assert.match(mainActivitySource, /WebChromeClient/);
assert.match(mainActivitySource, /onPermissionRequest/);
assert.match(mainActivitySource, /PermissionRequest\.RESOURCE_AUDIO_CAPTURE/);
assert.match(mainActivitySource, /Manifest\.permission\.RECORD_AUDIO/);
assert.match(mainActivitySource, /request\.grant/);
assert.match(androidManifestSource, /android\.permission\.RECORD_AUDIO/);
assert.match(androidManifestSource, /android\.permission\.MODIFY_AUDIO_SETTINGS/);

assert.match(tunerControlsSource, /tunerControlDockClassName/);
assert.match(tunerControlsSource, /tunerCardClassName/);
assert.match(tunerControlsSource, /tuner-card-has-fixed-dock/);
assert.match(tunerControlsSource, /tuner-control-dock-fixed/);
assert.match(tunerControlsSource, /createPortal/);
assert.match(tunerControlsSource, /document\.body/);
assert.match(tunerControlsSource, /useState\(true\)/);
assert.match(tunerControlsSource, /navigator\.maxTouchPoints/);
assert.match(tunerControlsSource, /navigator\.userAgent/);
assert.match(tunerControlsSource, /ontouchstart/);
assert.match(tunerControlsSource, /matchMedia\("\(max-width: 1080px\)"\)/);
assert.match(tunerControlsSource, /className={tunerControlDockClassName}[\s\S]*className="tuner-input-meter"/);
assert.match(tunerControlsSource, /className="tuner-status-hint"/);
assert.match(tunerControlsSource, /getTunerStatusHint/);
assert.match(tunerControlsSource, /hintIdle/);
assert.match(tunerControlsSource, /hintListening/);
assert.match(tunerControlsSource, /hintNoSignal/);
assert.match(tunerControlsSource, /hintInTune/);
assert.match(tunerControlsSource, /hintAdjust/);
assert.match(tunerControlsSource, /hintError/);
assert.match(tunerControlsSource, /inputLevel < 6/);
assert.match(tunerControlsSource, /className={tunerControlDockClassName}[\s\S]*className="tuner-actions"/);
assert.match(tunerControlsSource, /className={tunerControlDockClassName}[\s\S]*className="audio-error"/);
assert.match(cssSource, /\.tuner-control-dock/);
assert.match(cssSource, /\.tuner-status-hint/);
assert.match(cssSource, /\.tuner-control-dock-fixed\s*\{[\s\S]*position: fixed/);
assert.match(cssSource, /\.tuner-control-dock-fixed\s*\{[\s\S]*bottom: max\(132px/);
assert.match(phoneLayoutSource, /\.tuner-control-dock\s*\{[\s\S]*position: fixed/);
assert.match(phoneLayoutSource, /\.tuner-control-dock\s*\{[\s\S]*bottom: max\(132px/);
assert.match(phoneLayoutSource, /\.tuner-card\s*\{[\s\S]*padding-bottom/);
