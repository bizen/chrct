import { useState, useEffect, useRef } from 'react';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const LAST_SYNCED_KEY = 'chrct_last_synced_text';

export type SyncStatus = 'synced' | 'saving' | 'offline';

export function useCloudSync(
    text: string,
    setText: (text: string) => void
) {
    const { isAuthenticated } = useConvexAuth();
    // Use "skip" if not authenticated to avoid cached query issues or errors
    const remoteDoc = useQuery(api.sync.getDocument, isAuthenticated ? {} : "skip");
    const saveDocument = useMutation(api.sync.saveDocument);
    const syncDocument = useMutation(api.sync.syncDocument);

    const [hasInitialized, setHasInitialized] = useState(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [saveStatus, setSaveStatus] = useState<SyncStatus>('synced');

    // Initial Sync Logic with Offline Support
    useEffect(() => {
        if (!isAuthenticated) return;
        if (remoteDoc === undefined) return; // Loading from Convex
        if (hasInitialized) return; // Already handled initial sync

        const lastSyncedText = localStorage.getItem(LAST_SYNCED_KEY);
        const cloudText = remoteDoc?.text || '';
        const localText = text || '';

        // Determine Action
        let action: 'PUSH' | 'PULL' | 'NONE' = 'NONE';

        if (remoteDoc === null) {
            // Cloud is empty. If we have local text, push it.
            if (localText.length > 0) action = 'PUSH';
        } else {
            // Cloud has data.
            if (lastSyncedText === null) {
                // No sync history. Is this a new device or cleared cache?
                // If local is strictly empty (and not just deleted), Pull.
                // If local has text, we have a conflict/uncertainty.
                if (localText.length === 0) {
                    action = 'PULL';
                } else if (localText !== cloudText) {
                    // Conflict on fresh device.
                    // Prioritize pushing local if it exists (assuming offline work on fresh session)
                    action = 'PUSH';
                }
            } else {
                // We have history. 3-way merge logic.
                const hasLocalChanges = localText !== lastSyncedText;
                const hasCloudChanges = cloudText !== lastSyncedText;

                if (hasLocalChanges && !hasCloudChanges) {
                    // User worked offline. Cloud is stale.
                    action = 'PUSH';
                } else if (!hasLocalChanges && hasCloudChanges) {
                    // Cloud updated elsewhere. Local is stale.
                    action = 'PULL';
                } else if (hasLocalChanges && hasCloudChanges) {
                    // Both changed. Conflict.
                    // Priority: Local (Offline work wins).
                    action = 'PUSH';
                } else {
                    // No changes on either side, or both match (re-sync).
                    if (localText !== cloudText) {
                        action = 'PUSH'; // bias local
                    }
                }
            }
        }

        // Execute Action
        if (action === 'PULL') {
            setText(cloudText);
            localStorage.setItem(LAST_SYNCED_KEY, cloudText);
            setSaveStatus('synced');
        } else if (action === 'PUSH') {
            setSaveStatus('saving');
            // Immediate sync for initial state
            syncDocument({ text: localText })
                .then(() => {
                    localStorage.setItem(LAST_SYNCED_KEY, localText);
                    setSaveStatus('synced');
                })
                .catch(e => {
                    console.error("Initial Push Failed", e);
                    setSaveStatus('offline');
                });
        } else {
            // In sync
            localStorage.setItem(LAST_SYNCED_KEY, localText);
            setSaveStatus('synced');
        }

        setHasInitialized(true);
    }, [isAuthenticated, remoteDoc, hasInitialized, text, setText, syncDocument]);

    // Save to Cloud on Change (Debounced)
    useEffect(() => {
        if (!isAuthenticated || !hasInitialized) return;

        // Don't save if hasn't changed from last acknowledged sync (optimization)
        const lastSyncedText = localStorage.getItem(LAST_SYNCED_KEY);
        if (text === lastSyncedText) return;

        setSaveStatus('saving');
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveDocument({ text })
                .then(() => {
                    localStorage.setItem(LAST_SYNCED_KEY, text);
                    setSaveStatus('synced');
                })
                .catch((err) => {
                    console.error("Failed to save (Offline?):", err);
                    setSaveStatus('offline');
                });
            saveTimeoutRef.current = null;
        }, 1000); // Auto-save after 1 second of inactivity

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [text, isAuthenticated, hasInitialized, saveDocument]);

    return { saveStatus };
}
