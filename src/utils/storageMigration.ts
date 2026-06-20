export type MigratableStorage = Pick<Storage, "getItem" | "setItem">;
export type PrefixMigratableStorage = MigratableStorage & Partial<Pick<Storage, "key" | "length">>;

export const MOCHORD_STORAGE_PREFIX = "mochord:";
export const LEGACY_STORAGE_PREFIX = "chordflow:";

export function getMigratedStorageItem(
  storage: MigratableStorage | undefined,
  key: string,
  legacyKeys: string[] = [],
): string | null {
  if (!storage) return null;

  const current = storage.getItem(key);
  if (current !== null) return current;

  for (const legacyKey of legacyKeys) {
    const legacy = storage.getItem(legacyKey);
    if (legacy === null) continue;
    safeSetItem(storage, key, legacy);
    return legacy;
  }

  return null;
}

export function migrateStoragePrefix(
  storage: PrefixMigratableStorage | undefined,
  keyPrefix: string,
  legacyKeyPrefix: string,
): void {
  if (!storage?.key || typeof storage.length !== "number") return;

  const legacyKeys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(legacyKeyPrefix)) legacyKeys.push(key);
  }

  legacyKeys.forEach((legacyKey) => {
    const key = toCurrentStorageKey(legacyKey, keyPrefix, legacyKeyPrefix);
    if (storage.getItem(key) !== null) return;

    const legacy = storage.getItem(legacyKey);
    if (legacy !== null) safeSetItem(storage, key, legacy);
  });
}

export function toCurrentStorageKey(
  key: string,
  keyPrefix = MOCHORD_STORAGE_PREFIX,
  legacyKeyPrefix = LEGACY_STORAGE_PREFIX,
): string {
  return key.startsWith(legacyKeyPrefix) ? `${keyPrefix}${key.slice(legacyKeyPrefix.length)}` : key;
}

function safeSetItem(storage: MigratableStorage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // If storage is full or unavailable, still return the migrated value to the caller.
  }
}
