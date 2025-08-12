'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';

type GraphFolder = { id: string; displayName: string; childFolderCount?: number };

interface FolderData {
  ok: boolean;
  folders: GraphFolder[];
  diagnostic?: string;
}

const DEFAULT_FOLDERS = [
  { id: 'inbox', displayName: 'Inbox' },
  { id: 'drafts', displayName: 'Drafts' },
  { id: 'sent', displayName: 'Sent Items' },
  { id: 'deleted', displayName: 'Deleted Items' },
  { id: 'archive', displayName: 'Archive' },
  { id: 'junk', displayName: 'Junk Email' },
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

  // Fetch folders using SWR
  const { data, error, mutate } = useSWR<FolderData>('/api/outlook/folders', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    errorRetryCount: 3
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
      ...DEFAULT_FOLDERS,
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
    const fallbackFolders = data?.ok === false ? DEFAULT_FOLDERS : [];
    const customFolderObjects = customFolders.map(name => ({
      id: `custom::${name}`,
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
