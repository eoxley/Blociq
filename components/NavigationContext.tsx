"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  pageNavOpen: boolean;
  setPageNavOpen: (open: boolean) => void;
  getZIndex: (component: 'mobileMenu' | 'pageNav' | 'mobileButton') => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
}

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pageNavOpen, setPageNavOpen] = useState(false);

  const getZIndex = (component: 'mobileMenu' | 'pageNav' | 'mobileButton') => {
    // Define z-index hierarchy to prevent conflicts
    const zIndexMap = {
      mobileButton: 'z-[60]',    // Highest - always on top
      mobileMenu: 'z-[50]',      // High - mobile menu overlay
      pageNav: 'z-[45]',         // Medium - page navigation
    };
    
    return zIndexMap[component];
  };

  return (
    <NavigationContext.Provider value={{
      mobileMenuOpen,
      setMobileMenuOpen,
      pageNavOpen,
      setPageNavOpen,
      getZIndex
    }}>
      {children}
    </NavigationContext.Provider>
  );
}
