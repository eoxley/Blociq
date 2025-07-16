"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BlocIQContextType {
  buildingId?: number;
  unitId?: number;
  buildingName?: string;
  unitName?: string;
  setContext: (context: {
    buildingId?: number;
    unitId?: number;
    buildingName?: string;
    unitName?: string;
  }) => void;
  clearContext: () => void;
}

const BlocIQContext = createContext<BlocIQContextType | undefined>(undefined);

export function useBlocIQContext() {
  const context = useContext(BlocIQContext);
  if (context === undefined) {
    throw new Error('useBlocIQContext must be used within a BlocIQProvider');
  }
  return context;
}

interface BlocIQProviderProps {
  children: ReactNode;
}

export function BlocIQProvider({ children }: BlocIQProviderProps) {
  const [context, setContextState] = useState<{
    buildingId?: number;
    unitId?: number;
    buildingName?: string;
    unitName?: string;
  }>({});

  const setContext = (newContext: {
    buildingId?: number;
    unitId?: number;
    buildingName?: string;
    unitName?: string;
  }) => {
    setContextState(newContext);
  };

  const clearContext = () => {
    setContextState({});
  };

  return (
    <BlocIQContext.Provider
      value={{
        ...context,
        setContext,
        clearContext,
      }}
    >
      {children}
    </BlocIQContext.Provider>
  );
} 