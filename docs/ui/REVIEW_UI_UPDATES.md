# Review UI Updates - Dashboard Onboarding

## Overview

The review UI has been enhanced to provide a more intuitive and powerful interface for super admins to review AI-extracted data. The updates focus on better data visualization, inline editing capabilities, and clearer action workflows.

## Updated Features

### 1. Suggested Table Display ✅
**Enhancement**: Clear display of the target table for each extracted record
- **Visual Indicator**: Database icon with table name
- **Purpose**: Helps super admins understand where data will be committed
- **Example**: Shows "leases", "building_compliance_assets", "unit_apportionments", etc.

### 2. Pretty-Printed JSON Data ✅
**Enhancement**: Formatted JSON display with syntax highlighting
- **Readable Format**: Properly indented JSON with monospace font
- **Background**: Light gray background for better readability
- **Scrollable**: Handles large JSON objects gracefully
- **Syntax**: Uses `<pre>` tag with proper whitespace preservation

```json
{
  "unit_number": "Flat 2A",
  "lease_type": "residential",
  "start_date": "2023-01-01",
  "end_date": "2250-01-01",
  "ground_rent": 250,
  "service_charge_percentage": 1.25
}
```

### 3. Inline JSON Editing ✅
**Enhancement**: Direct editing of JSON data without modal popup
- **Click to Edit**: "Click to edit JSON" button transforms display to textarea
- **Live Validation**: Real-time JSON validation with error display
- **Save/Cancel**: Clear save and cancel buttons for edit actions
- **Error Handling**: Invalid JSON shows error message below textarea

#### Edit Mode Features:
- **Textarea**: Full-height textarea with monospace font
- **Validation**: JSON.parse() validation with error feedback
- **API Integration**: Saves changes via `/api/onboarding/review` endpoint
- **State Management**: Local state updates after successful save

### 4. Enhanced Action Buttons ✅
**Enhancement**: Clear action labels with workflow indicators

#### Accept → Commit
- **Action**: Accepts the extraction and commits to production
- **Workflow**: Calls `/api/onboarding/review` with action='accept', then `/api/onboarding/commit`
- **Visual**: Green button with checkmark icon
- **Label**: "Accept → Commit" (shows the complete workflow)

#### Edit → Inline
- **Action**: Opens inline JSON editor
- **Workflow**: Transforms the JSON display into editable textarea
- **Visual**: Blue button with edit icon
- **Label**: "Edit → Inline" (indicates inline editing capability)
- **State**: Disabled when already in edit mode

#### Reject → Delete
- **Action**: Rejects the extraction and removes from staging
- **Workflow**: Confirmation dialog, then calls `/api/onboarding/review` with action='reject'
- **Visual**: Red button with X icon
- **Label**: "Reject → Delete" (indicates record will be deleted)
- **Safety**: Confirmation dialog prevents accidental deletions

## Technical Implementation

### State Management
```typescript
interface InlineEditState {
  [key: string]: {
    isEditing: boolean;
    jsonString: string;
    error: string | null;
  };
}
```

### Inline Edit Functions
- **`startInlineEdit(recordId, data)`**: Initiates edit mode with formatted JSON
- **`cancelInlineEdit(recordId)`**: Cancels edit and resets state
- **`saveInlineEdit(recordId)`**: Validates and saves JSON changes
- **`handleReject(recordId)`**: Handles rejection with confirmation

### JSON Validation
```typescript
try {
  const parsedData = JSON.parse(editState.jsonString);
  // Save via API
} catch (error) {
  setInlineEdit(prev => ({
    ...prev,
    [recordId]: {
      ...prev[recordId],
      error: 'Invalid JSON format'
    }
  }));
}
```

## User Experience Improvements

### 1. Visual Clarity
- **Clear Table Headers**: "Pretty JSON Data" instead of "Extracted Fields"
- **Consistent Styling**: Monospace font for JSON data
- **Color Coding**: Green/yellow/red confidence indicators
- **Proper Spacing**: Adequate padding and margins for readability

### 2. Workflow Efficiency
- **Inline Editing**: No modal popup required for JSON edits
- **Real-time Validation**: Immediate feedback on JSON syntax errors
- **Clear Actions**: Button labels indicate the complete workflow
- **Confirmation Dialogs**: Safety checks for destructive actions

### 3. Error Handling
- **JSON Validation**: Clear error messages for invalid JSON
- **API Errors**: Server error messages displayed to user
- **Network Issues**: Graceful handling of connection problems
- **State Recovery**: Proper cleanup of edit state on errors

## Table Layout

### Column Structure
1. **Source File**: File name and detected type
2. **Suggested Table**: Target database table with icon
3. **Pretty JSON Data**: Formatted JSON with inline editing
4. **Confidence**: Color-coded confidence percentage
5. **Actions**: Accept, Edit, Reject buttons with workflow labels

### Responsive Design
- **Wide Table**: Accommodates large JSON objects
- **Horizontal Scroll**: Handles overflow gracefully
- **Mobile Friendly**: Responsive design for smaller screens
- **Flexible Layout**: Adapts to different screen sizes

## API Integration

### Review Actions
```typescript
// Accept and commit
await fetch('/api/onboarding/review', {
  method: 'POST',
  body: JSON.stringify({ structuredId, action: 'accept' })
});

// Edit JSON data
await fetch('/api/onboarding/review', {
  method: 'POST',
  body: JSON.stringify({ 
    structuredId, 
    action: 'edit',
    editedData: parsedData
  })
});

// Reject and delete
await fetch('/api/onboarding/review', {
  method: 'POST',
  body: JSON.stringify({ structuredId, action: 'reject' })
});
```

### State Updates
- **Local Updates**: Immediate UI updates after successful API calls
- **Error Recovery**: Proper error state management
- **Loading States**: Visual feedback during API operations
- **Data Refresh**: Automatic refresh of data after actions

## Security Considerations

### Input Validation
- **JSON Parsing**: Validates JSON syntax before saving
- **Data Sanitization**: Ensures clean data for production tables
- **Error Boundaries**: Prevents malformed data from breaking UI
- **API Security**: All endpoints require super_admin authentication

### User Safety
- **Confirmation Dialogs**: Prevents accidental deletions
- **Error Messages**: Clear feedback for validation failures
- **State Recovery**: Graceful handling of edit mode errors
- **Data Integrity**: Maintains data consistency across operations

## Future Enhancements

### Planned Features
1. **JSON Schema Validation**: Validate against target table schema
2. **Bulk Operations**: Select multiple records for batch actions
3. **Advanced Editing**: JSON path editing for nested objects
4. **Version History**: Track changes to extracted data
5. **Export Options**: Export reviewed data to various formats

### Technical Improvements
1. **Syntax Highlighting**: Color-coded JSON syntax
2. **Auto-completion**: Smart suggestions for JSON editing
3. **Diff View**: Show changes before saving
4. **Keyboard Shortcuts**: Power user shortcuts for common actions
5. **Performance Optimization**: Lazy loading for large datasets

## Conclusion

The updated review UI provides a much more intuitive and powerful interface for super admins to review AI-extracted data. With pretty-printed JSON, inline editing capabilities, and clear workflow indicators, the interface significantly improves the efficiency and accuracy of the data review process.

Key benefits:
- **Better Data Visualization**: Pretty-printed JSON is easier to read and understand
- **Streamlined Editing**: Inline editing eliminates the need for modal popups
- **Clear Workflows**: Button labels indicate the complete action workflow
- **Enhanced Safety**: Confirmation dialogs prevent accidental data loss
- **Improved UX**: Real-time validation and error handling provide immediate feedback
