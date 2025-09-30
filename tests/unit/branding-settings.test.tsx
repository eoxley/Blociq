import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrandingSettingsClient } from '@/app/(dashboard)/settings/branding/BrandingSettingsClient';
import { BrandingProvider } from '@/components/BrandingProvider';

// Mock fetch
global.fetch = jest.fn();

describe('Branding Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save settings and apply colour', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/settings/agency')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            settings: { primary_colour: '#6366f1', logo_url: null }
          })
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<BrandingSettingsClient agencyId="test-agency" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('#6366f1')).toBeInTheDocument();
    });

    const colorInput = screen.getByDisplayValue('#6366f1');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/agency', expect.any(Object));
    });
  });

  it('should upload logo and update navbar', async () => {
    const mockFile = new File(['logo'], 'logo.png', { type: 'image/png' });
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/settings/agency/logo')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            logo_url: 'https://example.com/logo.png'
          })
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<BrandingSettingsClient agencyId="test-agency" />);

    const fileInput = screen.getByLabelText('Upload Logo');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/agency/logo', expect.any(Object));
    });
  });
});
