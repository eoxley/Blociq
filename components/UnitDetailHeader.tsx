'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function UnitDetailHeader({ unitName, buildingName }: { unitName: string, buildingName: string }) {
  const params = useParams();
  const buildingId = params?.buildingId as string || '';

  return (
    <div className="mb-6">
      {/* 🔙 Back Link */}
      <Link href={`/buildings/${buildingId}`} className="text-sm text-blue-600 hover:underline block mb-2">
        ← Back to {buildingName}
      </Link>

      {/* 🧭 Breadcrumb Trail */}
      <div className="text-sm text-gray-500">
        <Link href={`/buildings/${buildingId}`} className="hover:underline">{buildingName}</Link>
        {' / '}
        <span className="text-gray-700 font-medium">{unitName}</span>
      </div>
    </div>
  );
} 