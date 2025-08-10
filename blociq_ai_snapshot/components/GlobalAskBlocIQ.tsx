"use client";

import React from 'react';
import AskBlocIQ from './AskBlocIQ';
import { useBlocIQContext } from './BlocIQContext';

export default function GlobalAskBlocIQ() {
  const { buildingId, buildingName } = useBlocIQContext();

  return (
    <AskBlocIQ
      buildingId={buildingId?.toString()}
      buildingName={buildingName}
    />
  );
} 