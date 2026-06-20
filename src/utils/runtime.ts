type RuntimeWindow = {
  __TAURI_INTERNALS__?: unknown;
  navigator?: {
    userAgent?: string;
  };
};

export type RuntimeKind = "browser" | "tauri" | "tauri-android";

export function hasTauriRuntime(target: RuntimeWindow = getWindow()): boolean {
  return Boolean(target.__TAURI_INTERNALS__);
}

export function getRuntimeKind(target: RuntimeWindow = getWindow()): RuntimeKind {
  if (!hasTauriRuntime(target)) return "browser";
  const userAgent = target.navigator?.userAgent?.toLowerCase() ?? "";
  return userAgent.includes("android") ? "tauri-android" : "tauri";
}

export function getRuntimeLabel(kind: RuntimeKind = getRuntimeKind()): string {
  if (kind === "tauri-android") return "Tauri Android app";
  if (kind === "tauri") return "Tauri app";
  return "browser";
}

function getWindow(): RuntimeWindow {
  return typeof window === "undefined" ? {} : window;
}
