# AskBlocIQ Synchronization Rule

## Overview
This document defines the rule that ensures any changes to the main AskBlocIQ component are automatically propagated to the mini AskBlocIQ brain widget, preventing divergence between the two interfaces.

## Rule: Single Source of Truth
**Any changes to the main AskBlocIQ component MUST be implemented through the shared `useAskBlocIQ` hook, ensuring both the main component and brain widget stay synchronized.**

## Architecture

### 1. Shared Hook: `hooks/useAskBlocIQ.ts`
- **Purpose**: Centralized logic for all AskBlocIQ functionality
- **Features**: 
  - File upload and processing
  - AI conversation handling
  - Document analysis
  - Suggested actions
  - Building context integration

### 2. Main Component: `components/AskBlocIQ.tsx`
- **Usage**: `const aiLogic = useAskBlocIQ({ buildingId, buildingName, isPublic: false });`
- **Mode**: Full functionality with Supabase data access and comprehensive document analysis

### 3. Brain Widget: `components/inbox_v2/AskBlocIQButton.tsx`
- **Usage**: `const aiLogic = useAskBlocIQ({ buildingId, buildingName, isPublic: false });`
- **Mode**: Full functionality with Supabase data access and comprehensive document analysis

### 4. Public Component: `components/assistant/PublicAskBlocIQ.tsx`
- **Usage**: `const aiLogic = useAskBlocIQ({ isPublic: true });`
- **Mode**: Restricted functionality - no Supabase data, Google Vision OCR fallback

## Implementation Guidelines

### ✅ DO:
1. **Implement new features in the shared hook first**
2. **Use the hook in all AskBlocIQ components**
3. **Test both main and brain widget after changes**
4. **Update the hook's interface when adding new functionality**

### ❌ DON'T:
1. **Implement features directly in individual components**
2. **Duplicate logic between components**
3. **Bypass the shared hook for new functionality**
4. **Create component-specific implementations**

## Feature Development Workflow

1. **Identify the feature** that needs to be added to AskBlocIQ
2. **Implement in the shared hook** (`useAskBlocIQ.ts`)
3. **Update the hook's interface** if new state/functions are needed
4. **Test the main component** to ensure functionality works
5. **Test the brain widget** to ensure synchronization
6. **Test the public component** if the feature applies to public users
7. **Commit changes** with clear documentation

## Mode-Specific Behavior

### Full Mode (`isPublic: false`)
- ✅ Supabase data access
- ✅ Building context integration
- ✅ Comprehensive document analysis
- ✅ AI logging and analytics
- ✅ Suggested actions and todo integration
- ✅ Major works context

### Public Mode (`isPublic: true`)
- ❌ Supabase data access (blocked)
- ❌ Building context integration (blocked)
- ❌ Comprehensive document analysis (blocked)
- ❌ AI logging and analytics (blocked)
- ❌ Suggested actions and todo integration (blocked)
- ❌ Major works context (blocked)
- ✅ Google Vision OCR fallback
- ✅ Generic property management prompts
- ✅ Basic document processing

## Example: Adding a New Feature

### Before (Wrong Way):
```typescript
// ❌ DON'T: Implement directly in component
export default function AskBlocIQ() {
  const [newFeature, setNewFeature] = useState(false);
  
  const handleNewFeature = () => {
    // Component-specific logic
  };
  
  // ... rest of component
}
```

### After (Correct Way):
```typescript
// ✅ DO: Implement in shared hook
export function useAskBlocIQ({ buildingId, buildingName, selectedMessage, isPublic = false }: UseAskBlocIQProps): UseAskBlocIQReturn {
  const [newFeature, setNewFeature] = useState(false);
  
  const handleNewFeature = () => {
    // Shared logic available to all components
  };
  
  return {
    // ... existing returns
    newFeature,
    setNewFeature,
    handleNewFeature,
  };
}

// ✅ DO: Use in all components
export default function AskBlocIQ() {
  const aiLogic = useAskBlocIQ({ buildingId, buildingName, isPublic: false });
  
  return (
    <div>
      <button onClick={aiLogic.handleNewFeature}>
        New Feature
      </button>
    </div>
  );
}
```

## Testing Checklist

After implementing changes to the shared hook:

- [ ] Main AskBlocIQ component works correctly
- [ ] Brain widget (AskBlocIQButton) works correctly
- [ ] Public AskBlocIQ works correctly (if applicable)
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All existing functionality preserved
- [ ] New functionality works in all components

## Benefits of This Rule

1. **Consistency**: Both interfaces always have the same features
2. **Maintainability**: Single place to update functionality
3. **Quality**: Shared logic is tested across all use cases
4. **Efficiency**: No duplicate code or divergent implementations
5. **User Experience**: Consistent behavior regardless of which interface is used

## Enforcement

This rule is enforced through:
- Code review processes
- Automated testing
- Documentation requirements
- Architecture validation

**Remember**: The brain widget should be a true mirror of the main AskBlocIQ functionality, just in a minimized form. Any deviation from this principle indicates a violation of the synchronization rule.
