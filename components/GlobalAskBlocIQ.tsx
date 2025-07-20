"use client";

import React from 'react';
import AskBlocIQ from './AskBlocIQ';
import { useBlocIQContext } from './BlocIQContext';

export default function GlobalAskBlocIQ() {
  const { buildingId, unitId, buildingName, unitName } = useBlocIQContext();

  return (
    <AskBlocIQ
      buildingId={buildingId}
      unitId={unitId}
      buildingName={buildingName}
      unitName={unitName}
    />
  );
} 