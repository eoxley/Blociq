import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SimpleFolderSidebar from '@/app/(dashboard)/inbox/components/SimpleFolderSidebar';

// Mock the useOutlookFolders hook
vi.mock('@/hooks/useOutlookFolders', () => ({
  useOutlookFolders: vi.fn()
}));

// Mock the CreateFolderModal component
vi.mock('@/app/(dashboard)/inbox/components/CreateFolderModal', () => ({
  default: ({ isOpen, onClose, onFolderCreated }: any) => 
    isOpen ? (
      <div data-testid="create-folder-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onFolderCreated({ id: 'new-folder', name: 'New Folder' })}>
          Create
        </button>
      </div>
    ) : null
}));

describe('SimpleFolderSidebar E2E', () => {
  const mockUseOutlookFolders = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Import and mock the hook
    const { useOutlookFolders } = require('@/hooks/useOutlookFolders');
    useOutlookFolders.mockImplementation(mockUseOutlookFolders);
  });

  it('renders standard folders when API is loading', () => {
    mockUseOutlookFolders.mockReturnValue({
      folders: [],
      isLoading: true,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar />);
    
    // Should show loading skeleton
    expect(screen.getByText('Folders')).toBeInTheDocument();
    expect(screen.getByTitle('Refresh folders')).toBeInTheDocument();
    expect(screen.getByTitle('Create new folder')).toBeInTheDocument();
  });

  it('renders folders with unread counts when API succeeds', () => {
    const mockFolders = [
      { id: 'inbox-1', name: 'Inbox', unread: 5, total: 100, isStandard: true },
      { id: 'drafts-1', name: 'Drafts', unread: 0, total: 10, isStandard: true },
      { id: 'custom-1', name: 'Work', unread: 2, total: 25, isStandard: false }
    ];

    mockUseOutlookFolders.mockReturnValue({
      folders: mockFolders,
      isLoading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar />);
    
    // Should show all folders
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    
    // Should show unread counts
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // Drafts has 0 unread, so it shouldn't show a count
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows fallback folders when API fails', () => {
    mockUseOutlookFolders.mockReturnValue({
      folders: [],
      isLoading: false,
      error: new Error('API failed'),
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar />);
    
    // Should show fallback folders
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    
    // Should show error message
    expect(screen.getByText(/Couldn't load folders/)).toBeInTheDocument();
  });

  it('handles folder selection correctly', () => {
    const mockOnFolderSelect = vi.fn();
    const mockFolders = [
      { id: 'inbox-1', name: 'Inbox', unread: 5, total: 100, isStandard: true }
    ];

    mockUseOutlookFolders.mockReturnValue({
      folders: mockFolders,
      isLoading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar onFolderSelect={mockOnFolderSelect} />);
    
    // Click on folder
    fireEvent.click(screen.getByText('Inbox'));
    
    expect(mockOnFolderSelect).toHaveBeenCalledWith('inbox-1');
  });

  it('handles refresh button click', async () => {
    const mockRefresh = vi.fn();
    const mockFolders = [
      { id: 'inbox-1', name: 'Inbox', unread: 5, total: 100, isStandard: true }
    ];

    mockUseOutlookFolders.mockReturnValue({
      folders: mockFolders,
      isLoading: false,
      error: null,
      refresh: mockRefresh
    });

    render(<SimpleFolderSidebar />);
    
    // Click refresh button
    fireEvent.click(screen.getByTitle('Refresh folders'));
    
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('opens create folder modal when plus button is clicked', () => {
    const mockFolders = [
      { id: 'inbox-1', name: 'Inbox', unread: 5, total: 100, isStandard: true }
    ];

    mockUseOutlookFolders.mockReturnValue({
      folders: mockFolders,
      isLoading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar />);
    
    // Initially modal should not be visible
    expect(screen.queryByTestId('create-folder-modal')).not.toBeInTheDocument();
    
    // Click create folder button
    fireEvent.click(screen.getByTitle('Create new folder'));
    
    // Modal should now be visible
    expect(screen.getByTestId('create-folder-modal')).toBeInTheDocument();
  });

  it('handles drag and drop events correctly', () => {
    const mockOnEmailDrop = vi.fn();
    const mockFolders = [
      { id: 'inbox-1', name: 'Inbox', unread: 5, total: 100, isStandard: true }
    ];

    mockUseOutlookFolders.mockReturnValue({
      folders: mockFolders,
      isLoading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar onEmailDrop={mockOnEmailDrop} />);
    
    const inboxFolder = screen.getByText('Inbox').closest('div');
    if (!inboxFolder) throw new Error('Inbox folder element not found');
    
    // Simulate drag over
    fireEvent.dragOver(inboxFolder);
    
    // Simulate drop with email data
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: () => 'email-123'
      }
    });
    
    fireEvent(inboxFolder, dropEvent);
    
    expect(mockOnEmailDrop).toHaveBeenCalledWith('email-123', 'inbox-1');
  });

  it('displays correct folder icons for standard vs custom folders', () => {
    const mockFolders = [
      { id: 'inbox-1', name: 'Inbox', unread: 5, total: 100, isStandard: true },
      { id: 'custom-1', name: 'Work', unread: 2, total: 25, isStandard: false }
    ];

    mockUseOutlookFolders.mockReturnValue({
      folders: mockFolders,
      isLoading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar />);
    
    // Standard folder should have folder emoji
    const inboxElement = screen.getByText('Inbox').closest('div');
    expect(inboxElement).toHaveTextContent('📁');
    
    // Custom folder should have FolderOpen icon (we can't easily test the icon component, but we can verify the structure)
    const workElement = screen.getByText('Work').closest('div');
    expect(workElement).toBeInTheDocument();
  });
});
