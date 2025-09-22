# React Hydration Fix Guide

## Overview

This document provides step-by-step instructions to fix React Error #418 (hydration mismatches) identified in the BlocIQ frontend application.

## Root Cause

Hydration errors occur when server-side rendered (SSR) content doesn't match client-side rendered content, causing React to fail during the hydration process.

## Critical Issues Found

### 1. ToastNotifications.tsx - IMMEDIATE FIX REQUIRED

**File**: `components/ToastNotifications.tsx`
**Line**: 92
**Issue**: Hardcoded timestamp causing SSR/client mismatch

**Current Code**:
```typescript
timestamp: new Date('2024-01-01'),  // ❌ Static timestamp
```

**Fix**:
```typescript
timestamp: new Date(),  // ✅ Dynamic timestamp
```

**Impact**: Critical - This affects ALL pages using toast notifications

### 2. TimeBasedGreeting.tsx - HIGH PRIORITY

**File**: `components/TimeBasedGreeting.tsx`
**Issue**: Time-dependent rendering without proper hydration handling

**Current Pattern**:
```typescript
const [greeting, setGreeting] = useState<string>("Hello!");

useEffect(() => {
  setGreeting(getTimeBasedGreeting(userName || undefined));
}, [userName]);
```

**Recommended Fix**: Wrap component usage with ClientOnly:
```typescript
import ClientOnly from '@/components/ClientOnly';

// In parent component:
<ClientOnly>
  <TimeBasedGreeting />
</ClientOnly>
```

## Components Requiring "use client" Directive

The following components use client-side APIs and need the `"use client"` directive at the top:

### High Priority (Browser API Access):
- `components/MobileNavigation.tsx` - Uses window sizing
- `components/DashboardSidebar.tsx` - Uses localStorage
- `components/AgencySwitcher.tsx` - Uses window events
- `hooks/useAgency.tsx` - Uses localStorage/sessionStorage

### Medium Priority (Conditional Rendering):
- `components/buildings/ActionTracker.tsx`
- `components/compliance/EnhancedEditAssetForm.tsx`
- `components/LeaseNotificationBadge.tsx`
- `components/MajorWorksDashboard.tsx`

## Fix Implementation Guide

### Step 1: Add "use client" Directives

For each component that uses browser APIs, add the directive at the top:

```typescript
"use client";

import React, { useState, useEffect } from 'react';
// ... rest of imports
```

### Step 2: Wrap Time-Dependent Components

For components that render different content based on time or browser state:

```typescript
// In parent component
import ClientOnly from '@/components/ClientOnly';

return (
  <div>
    <ClientOnly>
      <TimeBasedGreeting />
    </ClientOnly>
  </div>
);
```

### Step 3: Fix Conditional Rendering Patterns

**Anti-pattern** (causes hydration mismatch):
```typescript
{condition && <Component />}
```

**Better pattern**:
```typescript
{condition ? <Component /> : null}
```

**Best pattern** (for browser-dependent conditions):
```typescript
{typeof window !== 'undefined' && condition && <Component />}
```

### Step 4: Handle Dynamic Timestamps

**Anti-pattern**:
```typescript
const timestamp = new Date('2024-01-01'); // Static
```

**Correct pattern**:
```typescript
const [timestamp, setTimestamp] = useState<Date | null>(null);

useEffect(() => {
  setTimestamp(new Date());
}, []);

if (!timestamp) return <div>Loading...</div>;
```

## Specific Component Fixes

### 1. ToastNotifications.tsx

```typescript
// Line 92 - Change from:
timestamp: new Date('2024-01-01'),

// To:
timestamp: new Date(),
```

### 2. Components using window/document

Add defensive checks:
```typescript
// Before
if (window.innerWidth < 768) {

// After
if (typeof window !== 'undefined' && window.innerWidth < 768) {
```

### 3. LocalStorage usage

```typescript
// Before
const value = localStorage.getItem('key');

// After
const [value, setValue] = useState<string | null>(null);

useEffect(() => {
  setValue(localStorage.getItem('key'));
}, []);
```

## Testing Hydration Fixes

### 1. Enable React Development Mode

Add to your Next.js config:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}
```

### 2. Check Console Warnings

Look for warnings like:
- "Warning: Text content did not match"
- "Warning: Expected server HTML to contain"
- "Hydration failed because the initial UI does not match"

### 3. Test SSR vs Client Rendering

```typescript
// Add temporary debugging
useEffect(() => {
  console.log('Client render:', componentState);
}, []);

// Check if server and client states match
```

## Prevention Strategies

### 1. Use Next.js dynamic() for Client-Only Components

```typescript
import dynamic from 'next/dynamic';

const ClientOnlyComponent = dynamic(
  () => import('./ClientOnlyComponent'),
  { ssr: false }
);
```

### 2. Create Hydration-Safe Utilities

```typescript
// utils/browser.ts
export const isBrowser = typeof window !== 'undefined';

export const safeLocalStorage = {
  getItem: (key: string) => isBrowser ? localStorage.getItem(key) : null,
  setItem: (key: string, value: string) => {
    if (isBrowser) localStorage.setItem(key, value);
  }
};
```

### 3. Use Next.js useRouter Hook Properly

```typescript
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useIsReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  return isReady;
}
```

## Implementation Checklist

- [ ] Fix ToastNotifications.tsx timestamp (CRITICAL)
- [ ] Add "use client" to browser API components
- [ ] Wrap time-dependent components with ClientOnly
- [ ] Fix conditional rendering patterns
- [ ] Test all affected pages
- [ ] Monitor for new hydration warnings
- [ ] Update component patterns in style guide

## Monitoring

After implementing fixes, monitor for:
- Reduction in React Error #418 occurrences
- Console warnings about hydration mismatches
- Page load failures in browser dev tools
- User reports of blank/broken pages

## Success Criteria

- Zero React Error #418 occurrences
- No hydration warnings in browser console
- All pages render correctly on first load
- Client and server content matches

---

*Generated by BlocIQ Deep Scan Tool*
*Last Updated: 2025-01-22*