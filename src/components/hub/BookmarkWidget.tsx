import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface Bookmark {
    id: string; // can be local ID or Convex ID
    name: string;
    url: string;
}

interface BookmarkWidgetProps {
    theme: 'dark' | 'light' | 'wallpaper';
}

export const BookmarkWidget: React.FC<BookmarkWidgetProps> = ({ theme }) => {
    // Convex
    const { isAuthenticated } = useConvexAuth();
    const remoteBookmarks = useQuery(api.sync.getBookmarks, isAuthenticated ? {} : "skip");
    const addBookmarkMutation = useMutation(api.sync.addBookmark);
    const removeBookmarkMutation = useMutation(api.sync.removeBookmark);
    const syncBookmarks = useMutation(api.sync.syncBookmarks);

    // Local State
    const [localBookmarks, setLocalBookmarks] = useState<Bookmark[]>(() => {
        const saved = localStorage.getItem('chrct_bookmarks');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return [
            { id: '1', name: 'Perplexity', url: 'https://www.perplexity.ai' },
            { id: '2', name: 'ChatGPT', url: 'https://chat.openai.com' },
            { id: '3', name: 'GitHub', url: 'https://github.com' },
        ];
    });

    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');

    // Sync Logic: Migrate local to remote on first auth
    // Only sync when we have confirmed that remote is empty (not just undefined/loading)
    useEffect(() => {
        if (isAuthenticated && remoteBookmarks !== undefined && remoteBookmarks.length === 0) {
            // Check if we have local bookmarks to sync
            if (localBookmarks.length > 0) {
                // Sync trigger
                syncBookmarks({ bookmarks: localBookmarks });
            }
        }
    }, [isAuthenticated, remoteBookmarks]);

    // Update Local Storage (only if not authenticated, or to keep backup?)
    // If authenticated, we rely on remoteBookmarks for display, but let's keep local updated strictly if we want offline support?
    // For now, simple split: If auth, show remote. If not, show local.
    useEffect(() => {
        if (!isAuthenticated) {
            localStorage.setItem('chrct_bookmarks', JSON.stringify(localBookmarks));
        }
    }, [localBookmarks, isAuthenticated]);

    // Loading state - when authenticated, wait for remote data
    const isLoading = isAuthenticated && remoteBookmarks === undefined;

    // Unified list - when authenticated, ONLY show remote. Never fallback to local.
    const bookmarks = isAuthenticated
        ? (remoteBookmarks || []).map((b: any) => ({
            id: b._id,
            name: b.name,
            url: b.url
        }))
        : localBookmarks;

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newUrl) return;

        let formattedUrl = newUrl;
        if (!/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = 'https://' + formattedUrl;
        }

        if (isAuthenticated) {
            await addBookmarkMutation({ name: newName, url: formattedUrl });
        } else {
            const newBookmark: Bookmark = {
                id: Date.now().toString(),
                name: newName,
                url: formattedUrl,
            };
            setLocalBookmarks([...localBookmarks, newBookmark]);
        }

        setNewName('');
        setNewUrl('');
        setIsAdding(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isAuthenticated) {
            await removeBookmarkMutation({ id: id as Id<"bookmarks"> });
        } else {
            setLocalBookmarks(localBookmarks.filter(b => b.id !== id));
        }
    };

    const getFavicon = (url: string) => {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return '';
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Header with Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginLeft: '0.25rem'
                }}>
                    Launchpad
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                    title="Add Bookmark"
                >
                    {isAdding ? <X size={14} /> : <Plus size={14} />}
                </button>
            </div>

            <div style={{
                padding: '0.5rem',
                backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '16px',
                border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column', // Vertical layout
                gap: '0.25rem',
            }}>
                {/* List */}
                {bookmarks.map((bm: Bookmark) => (
                    <a
                        key={bm.id}
                        href={bm.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bookmark-item"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            textDecoration: 'none',
                            color: theme === 'light' ? '#1f2937' : 'white',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '12px',
                            transition: 'background-color 0.2s',
                            position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
                            const btn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                            if (btn) btn.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            const btn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                            if (btn) btn.style.opacity = '0';
                        }}
                    >
                        <img
                            src={getFavicon(bm.url)}
                            alt=""
                            style={{ width: '20px', height: '20px', borderRadius: '4px' }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.opacity = '0';
                            }}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {bm.name}
                        </span>

                        <button
                            className="delete-btn"
                            onClick={(e) => handleDelete(bm.id, e)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: theme === 'light' ? '#ef4444' : '#f87171',
                                cursor: 'pointer',
                                padding: '4px',
                                opacity: 0, // Hidden by default, shown on hover
                                transition: 'opacity 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </a>
                ))}

                {isLoading && (
                    <div style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        opacity: 0.5,
                        color: theme === 'light' ? 'black' : 'white',
                    }}>
                        Loading...
                    </div>
                )}

                {!isLoading && bookmarks.length === 0 && !isAdding && (
                    <div style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        opacity: 0.5,
                        color: theme === 'light' ? 'black' : 'white',
                    }}>
                        No bookmarks
                    </div>
                )}

                {/* Add Form */}
                {isAdding && (
                    <form onSubmit={handleAdd} style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                                background: theme === 'light' ? 'white' : 'rgba(0,0,0,0.2)',
                                color: theme === 'light' ? 'black' : 'white',
                                fontSize: '0.85rem',
                                outline: 'none'
                            }}
                            autoFocus
                        />
                        <input
                            type="text"
                            placeholder="URL"
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                                background: theme === 'light' ? 'white' : 'rgba(0,0,0,0.2)',
                                color: theme === 'light' ? 'black' : 'white',
                                fontSize: '0.85rem',
                                outline: 'none'
                            }}
                        />
                        <button type="submit" style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#60A5FA', // Accent color
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}>
                            Add Link
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
