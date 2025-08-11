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
        <button onClick={() => onFolderCreated({ id: 'new-folder', name: 'New Folder' })}>
          Create Folder
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

describe('Outlook Folders Sidebar E2E', () => {
  const mockUseOutlookFolders = vi.mocked(await import('@/hooks/useOutlookFolders')).useOutlookFolders;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard folders when API is working', () => {
    mockUseOutlookFolders.mockReturnValue({
      folders: [
        { id: 'inbox', name: 'Inbox', unread: 5, total: 25, isStandard: true },
        { id: 'drafts', name: 'Drafts', unread: 2, total: 8, isStandard: true },
        { id: 'sent', name: 'Sent', unread: 0, total: 15, isStandard: true }
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar />);

    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    
    // Check unread counts
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('')).toBeInTheDocument(); // Sent has 0 unread
  });

  it('shows loading state while fetching folders', () => {
    mockUseOutlookFolders.mockReturnValue({
      folders: [],
      isLoading: true,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar />);

    // Should show loading skeleton
    const loadingElements = screen.getAllByTestId('loading-skeleton');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows fallback folders when API fails', () => {
    mockUseOutlookFolders.mockReturnValue({
      folders: [],
      isLoading: false,
      error: new Error('API Error'),
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar />);

    // Should show error message
    expect(screen.getByText(/Couldn't load folders/)).toBeInTheDocument();
    
    // Should show fallback folders
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('handles folder selection correctly', () => {
    const mockOnFolderSelect = vi.fn();
    
    mockUseOutlookFolders.mockReturnValue({
      folders: [
        { id: 'inbox', name: 'Inbox', unread: 5, total: 25, isStandard: true },
        { id: 'drafts', name: 'Drafts', unread: 2, total: 8, isStandard: true }
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar onFolderSelect={mockOnFolderSelect} />);

    // Click on Drafts folder
    fireEvent.click(screen.getByText('Drafts'));
    
    expect(mockOnFolderSelect).toHaveBeenCalledWith('drafts');
  });

  it('shows refresh button and calls refresh function', async () => {
    const mockRefresh = vi.fn();
    
    mockUseOutlookFolders.mockReturnValue({
      folders: [
        { id: 'inbox', name: 'Inbox', unread: 5, total: 25, isStandard: true }
      ],
      isLoading: false,
      error: null,
      refresh: mockRefresh
    });

    render(<SimpleFolderSidebar />);

    // Find and click refresh button
    const refreshButton = screen.getByTitle('Refresh folders');
    fireEvent.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('opens create folder modal and handles folder creation', async () => {
    const mockRefresh = vi.fn();
    
    mockUseOutlookFolders.mockReturnValue({
      folders: [
        { id: 'inbox', name: 'Inbox', unread: 5, total: 25, isStandard: true }
      ],
      isLoading: false,
      error: null,
      refresh: mockRefresh
    });

    render(<SimpleFolderSidebar />);

    // Click create folder button
    const createButton = screen.getByTitle('Create new folder');
    fireEvent.click(createButton);

    // Modal should open
    expect(screen.getByTestId('create-folder-modal')).toBeInTheDocument();

    // Create a folder
    const createFolderButton = screen.getByText('Create Folder');
    fireEvent.click(createFolderButton);

    // Should call refresh to update folders
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('handles drag and drop functionality', () => {
    const mockOnEmailDrop = vi.fn();
    
    mockUseOutlookFolders.mockReturnValue({
      folders: [
        { id: 'inbox', name: 'Inbox', unread: 5, total: 25, isStandard: true },
        { id: 'archive', name: 'Archive', unread: 0, total: 10, isStandard: false }
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar onEmailDrop={mockOnEmailDrop} />);

    const archiveFolder = screen.getByText('Archive');
    
    // Simulate drag over
    fireEvent.dragOver(archiveFolder);
    
    // Simulate drop
    fireEvent.drop(archiveFolder, {
      dataTransfer: {
        getData: () => 'email-123'
      }
    });

    expect(mockOnEmailDrop).toHaveBeenCalledWith('email-123', 'archive');
  });

  it('displays correct folder icons for standard vs custom folders', () => {
    mockUseOutlookFolders.mockReturnValue({
      folders: [
        { id: 'inbox', name: 'Inbox', unread: 5, total: 25, isStandard: true },
        { id: 'custom-folder', name: 'Custom Folder', unread: 2, total: 8, isStandard: false }
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<SimpleFolderSidebar />);

    // Standard folder should show folder emoji
    const inboxFolder = screen.getByText('Inbox').closest('div');
    expect(inboxFolder).toHaveTextContent('📁');

    // Custom folder should show FolderOpen icon (this would need more complex testing)
    // For now, just verify both folders render
    expect(screen.getByText('Custom Folder')).toBeInTheDocument();
  });
});
