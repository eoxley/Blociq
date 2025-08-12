'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';

type FolderItem = { id: string; displayName: string; wellKnownName?: string };

interface FolderData {
  ok: boolean;
  folders: FolderItem[];
  diagnostic?: string | null;
}

const DEFAULTS: FolderItem[] = [
  { id: "default:inbox",         displayName: "Inbox",        wellKnownName: "inbox" },
  { id: "default:drafts",        displayName: "Drafts",       wellKnownName: "drafts" },
  { id: "default:sentitems",     displayName: "Sent Items",   wellKnownName: "sentitems" },
  { id: "default:deleteditems",  displayName: "Deleted Items",wellKnownName: "deleteditems" },
  { id: "default:archive",       displayName: "Archive",      wellKnownName: "archive" },
  { id: "default:junkemail",     displayName: "Junk Email",   wellKnownName: "junkemail" },
];

const CUSTOM_FOLDERS_KEY = 'blociq.customFolders';

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useOutlookFolders() {
  const [customFolders, setCustomFolders] = useState<string[]>([]);

  // Load custom folders from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_FOLDERS_KEY);
      if (stored) {
        setCustomFolders(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading custom folders from localStorage:', error);
    }
  }, []);

  // Fetch folders using SWR with fallback to /api/folders
  const { data, error, mutate } = useSWR<FolderData>('/api/outlook/folders', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    onError: (err, key) => {
      // If /api/outlook/folders fails, try /api/folders as fallback
      if (key === '/api/outlook/folders' && err?.status === 404) {
        mutate(undefined, { revalidate: false });
        // Note: SWR will automatically retry with the same key, but we could implement
        // a more sophisticated fallback here if needed
      }
    }
  });

  // Save custom folders to localStorage
  const saveCustomFolders = useCallback((folders: string[]) => {
    try {
      localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(folders));
    } catch (error) {
      console.error('Error saving custom folders to localStorage:', error);
    }
  }, []);

  // Add custom folder
  const addCustomFolder = useCallback((folderName: string) => {
    const trimmedName = folderName.trim();
    if (!trimmedName || trimmedName.length > 40) return false;

    // Check if name already exists (case-insensitive)
    const allFolders = [
      ...(data?.folders || []),
      ...DEFAULTS,
      ...customFolders
    ];
    
    const exists = allFolders.some(folder => 
      (typeof folder === 'string' ? folder : folder.displayName).toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (exists) return false;

    const newCustomFolders = [...customFolders, trimmedName];
    setCustomFolders(newCustomFolders);
    saveCustomFolders(newCustomFolders);
    return true;
  }, [data?.folders, customFolders, saveCustomFolders]);

  // Remove custom folder
  const removeCustomFolder = useCallback((folderName: string) => {
    const newCustomFolders = customFolders.filter(name => name !== folderName);
    setCustomFolders(newCustomFolders);
    saveCustomFolders(newCustomFolders);
  }, [customFolders, saveCustomFolders]);

  // Merge folders for rendering
  const folders = (() => {
    const graphFolders = data?.folders || [];
    const fallbackFolders = data?.ok === false ? DEFAULTS : [];
    const customFolderObjects = customFolders.map(name => ({
      id: `custom:${name}`,
      displayName: name
    }));

    // Dedupe custom folders by displayName
    const uniqueCustomFolders = customFolderObjects.filter(custom => 
      !graphFolders.some(graph => graph.displayName.toLowerCase() === custom.displayName.toLowerCase()) &&
      !fallbackFolders.some(fallback => fallback.displayName.toLowerCase() === custom.displayName.toLowerCase())
    );

    return [
      ...graphFolders,
      ...fallbackFolders,
      ...uniqueCustomFolders
    ];
  })();

  const isLoading = !data && !error;
  const isFallback = data?.ok === false;
  const diagnostic = data?.diagnostic;

  return {
    folders,
    isLoading,
    diagnostic,
    isFallback,
    customFolders,
    addCustomFolder,
    removeCustomFolder
  };
}
