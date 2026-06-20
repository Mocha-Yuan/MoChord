import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GUEST_BACKUP_PROGRESS_KEY,
  GLOBAL_PROGRESS_KEY,
  buildLocalProgressSnapshot,
  loadGuestProgress,
  loadProgress,
  mergeProgressPayloads,
  saveGuestProgress,
  saveProgress,
  writeLocalProgressSnapshot,
} from "../services/progressService";
import type { MoChordProgress, SyncStatus } from "../types/progress";
import { useAuth } from "./useAuth";

type UseProgressSyncOptions = {
  progress: MoChordProgress;
  onRemoteProgress: (progress: MoChordProgress) => void;
  debounceMs?: number;
};

type ProgressSyncResult = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  retry: () => void;
};

export function useProgressSync({
  progress,
  onRemoteProgress,
  debounceMs = 1000,
}: UseProgressSyncOptions): ProgressSyncResult {
  const { isAuthenticated, user, loading } = useAuth();
  const [status, setStatus] = useState<SyncStatus>("guest");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const restoredUserId = useRef<string | null>(null);
  const latestProgress = useRef(progress);

  const serializedProgress = useMemo(() => JSON.stringify(progress), [progress]);

  useEffect(() => {
    latestProgress.current = progress;
  }, [progress]);

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (loading) {
      setStatus("loading");
      return;
    }

    if (!isAuthenticated || !user) {
      setStatus("guest");
      saveGuestProgress({ ...latestProgress.current, updatedAt: new Date().toISOString() });
      return;
    }

    if (restoredUserId.current === user.id) return;
    restoredUserId.current = user.id;
    let cancelled = false;

    async function restoreCloudProgress() {
      setStatus("loading");
      setError(null);

      try {
        const localProgress = loadGuestProgress() ?? buildLocalProgressSnapshot();
        const cloudRecord = await loadProgress(GLOBAL_PROGRESS_KEY);
        const cloudProgress = normalizeCloudProgress(cloudRecord?.progress_data);
        const merged = mergeProgressPayloads(localProgress, cloudProgress);

        if (cancelled || !merged.progress) {
          setStatus("synced");
          return;
        }

        if (merged.strategy === "cloud-newer" || merged.strategy === "cloud-only" || merged.strategy === "cloud-with-backup") {
          writeLocalProgressSnapshot(undefined, merged.progress);
          onRemoteProgress(merged.progress);
        }

        if (merged.strategy === "local-newer" || merged.strategy === "local-only") {
          await saveProgress(GLOBAL_PROGRESS_KEY, merged.progress);
        }

        if (merged.backup) {
          await saveProgress(GUEST_BACKUP_PROGRESS_KEY, {
            ...merged.backup,
            backedUpAt: new Date().toISOString(),
          });
        }

        setLastSyncedAt(new Date().toISOString());
        setStatus("synced");
      } catch (caught) {
        setStatus("error");
        setError(caught instanceof Error ? caught.message : "Sync failed. Current progress has been kept locally.");
        saveGuestProgress({ ...latestProgress.current, updatedAt: new Date().toISOString() });
      }
    }

    void restoreCloudProgress();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, onRemoteProgress, user, retryToken]);

  useEffect(() => {
    if (loading) return;

    const snapshot = { ...latestProgress.current, updatedAt: new Date().toISOString() };
    saveGuestProgress(snapshot);

    if (!isAuthenticated || !user) {
      setStatus("guest");
      return;
    }

    setStatus("syncing");
    setError(null);
    const timeoutId = window.setTimeout(() => {
      saveProgress(GLOBAL_PROGRESS_KEY, snapshot)
        .then(() => {
          setLastSyncedAt(new Date().toISOString());
          setStatus("synced");
        })
        .catch((caught) => {
          saveGuestProgress(snapshot);
          setStatus("error");
          setError(caught instanceof Error ? caught.message : "Sync failed. Current progress has been kept locally.");
        });
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [debounceMs, isAuthenticated, loading, serializedProgress, user]);

  useEffect(() => {
    function handleBeforeUnload() {
      saveGuestProgress({ ...latestProgress.current, updatedAt: new Date().toISOString() });
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return { status, lastSyncedAt, error, retry };
}

function normalizeCloudProgress(value: unknown): MoChordProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return { ...(value as Record<string, unknown>), version: 1 } as MoChordProgress;
}
