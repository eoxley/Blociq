# BlocIQ UI Customization Guide

## Overview
BlocIQ now supports agency-specific branding with custom primary colors and logos. This system allows each agency to customize their interface while maintaining a consistent user experience.

## Features

### 🎨 Primary Color Customization
- Custom hex color picker for agency branding
- Real-time preview of color changes
- Automatic application across the platform
- Fallback to BlocIQ purple (#6366f1) if unset

### 🖼️ Logo Upload & Management
- Upload agency logos to Supabase Storage
- Automatic resizing and optimization
- Display in navbar and throughout the platform
- Support for PNG, JPG, SVG formats

### ⚡ Dynamic Application
- CSS custom properties for real-time updates
- Tailwind CSS integration with `bg-brand-primary`
- Automatic color application on page load
- No page refresh required for changes

## Database Schema

### `agency_settings` Table
```sql
CREATE TABLE agency_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    primary_colour TEXT DEFAULT '#6366f1',
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### GET `/api/settings/agency?agency_id={id}`
Fetch current agency branding settings.

**Response:**
```json
{
  "success": true,
  "settings": {
    "primary_colour": "#ff0000",
    "logo_url": "https://example.com/logo.png"
  }
}
```

### POST `/api/settings/agency`
Update agency branding settings.

**Request Body:**
```json
{
  "primary_colour": "#ff0000",
  "logo_url": "https://example.com/logo.png"
}
```

### POST `/api/settings/agency/logo`
Upload agency logo.

**Request:** FormData with `file` and `agency_id`

**Response:**
```json
{
  "success": true,
  "logo_url": "https://example.com/logo.png"
}
```

## Frontend Implementation

### Branding Settings Page
Located at `/settings/branding`, provides:
- Color picker with hex input
- Logo upload with drag-and-drop
- Real-time preview of changes
- Save functionality with success feedback

### CSS Integration
The system uses CSS custom properties for dynamic theming:

```css
:root {
  --brand-primary: #6366f1; /* Default BlocIQ purple */
}
```

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'brand-primary': 'var(--brand-primary)',
      }
    }
  }
}
```

## Usage Examples

### Using Brand Colors in Components

#### BrandedButton Component
```tsx
import { BrandedButton } from '@/components/ui/BrandedButton';

export function MyComponent() {
  return (
    <BrandedButton variant="primary">
      Click Me
    </BrandedButton>
  );
}
```

#### BrandedTile Component
```tsx
import { BrandedTile } from '@/components/ui/BrandedTile';

export function Dashboard() {
  return (
    <BrandedTile
      title="Total Revenue"
      value="$12,345"
      subtitle="This month"
      icon={<ChartIcon />}
    />
  );
}
```

#### Direct Tailwind Usage
```tsx
export function MyComponent() {
  return (
    <div className="bg-brand-primary text-white p-4 rounded-lg">
      This uses the agency's brand color
    </div>
  );
}
```

### Logo Integration

#### BrandedNavbar Component
```tsx
import { BrandedNavbar } from '@/components/ui/BrandedNavbar';

export function Layout() {
  return (
    <div>
      <BrandedNavbar agencyId="agency-123" />
      {/* Rest of layout */}
    </div>
  );
}
```

## Security & Access Control

### Row Level Security (RLS)
- Users can only access their own agency's settings
- Logo uploads are restricted to authenticated users
- Agency membership verification on all operations

### File Upload Security
- File type validation (images only)
- File size limits
- Secure storage in Supabase Storage
- Public URL generation for display

## Testing

### Unit Tests
Comprehensive test coverage includes:
- Settings save and reload functionality
- Logo upload and display
- Color application and persistence
- Error handling and edge cases

### Test Commands
```bash
npm test tests/unit/branding-settings.test.ts
```

## Implementation Checklist

### ✅ Database
- [x] Create `agency_settings` table
- [x] Add RLS policies
- [x] Create indexes for performance

### ✅ Backend APIs
- [x] GET `/api/settings/agency` - Fetch settings
- [x] POST `/api/settings/agency` - Update settings
- [x] POST `/api/settings/agency/logo` - Upload logo

### ✅ Frontend
- [x] Branding settings page (`/settings/branding`)
- [x] Color picker with hex input
- [x] Logo upload functionality
- [x] Real-time preview
- [x] Save functionality

### ✅ CSS Integration
- [x] CSS custom properties setup
- [x] Tailwind configuration update
- [x] Default color fallback

### ✅ Components
- [x] BrandedButton component
- [x] BrandedTile component
- [x] BrandedNavbar component
- [x] BrandingProvider context

### ✅ Testing
- [x] Unit tests for settings save/reload
- [x] Logo upload tests
- [x] Color application tests

## Best Practices

### Color Selection
- Use high contrast colors for accessibility
- Test colors on different backgrounds
- Consider color blindness compatibility
- Maintain readability across all UI elements

### Logo Guidelines
- Use high-resolution images (SVG preferred)
- Maintain aspect ratio
- Keep file sizes under 500KB
- Test on both light and dark backgrounds

### Performance
- Lazy load logo images
- Cache settings in localStorage
- Use CSS custom properties for efficiency
- Minimize API calls with proper caching

## Troubleshooting

### Common Issues

#### Color Not Applying
1. Check if `--brand-primary` CSS variable is set
2. Verify Tailwind configuration includes `brand-primary`
3. Ensure BrandingProvider is wrapping the app

#### Logo Not Displaying
1. Verify file upload was successful
2. Check Supabase Storage bucket permissions
3. Confirm public URL is accessible

#### Settings Not Saving
1. Check user authentication status
2. Verify agency membership
3. Review RLS policy permissions

### Debug Mode
Enable debug logging by adding to your environment:
```bash
NEXT_PUBLIC_DEBUG_BRANDING=true
```

## Migration Guide

### Existing Agencies
1. Run the database migration
2. Set default colors for existing agencies
3. Upload default logos if needed
4. Test branding functionality

### Custom CSS Overrides
If you have existing custom CSS, update to use the new system:
```css
/* Old */
.my-button { background-color: #ff0000; }

/* New */
.my-button { background-color: var(--brand-primary); }
```

## Future Enhancements

### Planned Features
- Secondary color support
- Dark mode theming
- Font customization
- Advanced logo positioning
- Theme presets
- Bulk agency settings management

### API Extensions
- Batch settings updates
- Theme export/import
- Advanced logo processing
- Color palette generation

This customization system provides a solid foundation for agency branding while maintaining the professional look and feel of BlocIQ.
