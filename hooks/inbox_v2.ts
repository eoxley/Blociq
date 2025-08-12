import useSWR from 'swr'

// Default folders fallback when Graph API is unavailable
const DEFAULT_FOLDERS = [
  { id: 'inbox', displayName: 'Inbox', wellKnownName: 'inbox' },
  { id: 'drafts', displayName: 'Drafts', wellKnownName: 'drafts' },
  { id: 'sent', displayName: 'Sent Items', wellKnownName: 'sentitems' },
  { id: 'deleted', displayName: 'Deleted Items', wellKnownName: 'deleteditems' },
  { id: 'archive', displayName: 'Archive', wellKnownName: 'archive' },
  { id: 'junk', displayName: 'Junk Email', wellKnownName: 'junkemail' }
]

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useFolders() {
  const { data, error, isLoading, mutate } = useSWR('/api/outlook/v2/folders', fetcher)
  
  const folders = data?.ok && data?.items?.length > 0 ? data.items : DEFAULT_FOLDERS
  const isFallback = !data?.ok || data?.items?.length === 0
  
  return {
    folders,
    isFallback,
    isLoading,
    refresh: mutate
  }
}

export function useMessages(folderId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    folderId ? `/api/outlook/v2/messages/list?folderId=${folderId}` : null,
    fetcher
  )
  
  const messages = data?.ok ? data.items : []
  
  return {
    messages,
    isLoading,
    refresh: mutate
  }
}
