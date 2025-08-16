export interface BuildingQueryLog {
  buildingId?: string;
  unitId?: string;
  leaseholderId?: string;
  query: string;
  response?: string;
  contextType?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export async function logBuildingQuery(logData: BuildingQueryLog): Promise<void> {
  try {
    const response = await fetch('/api/ask-ai/log-building-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    });

    if (!response.ok) {
      console.warn('Failed to log building query:', response.status);
    }
  } catch (error) {
    console.warn('Error logging building query:', error);
  }
}

export function detectQueryContextType(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('unit') || lowerQuery.includes('flat') || lowerQuery.includes('apartment')) {
    return 'unit_info';
  }
  
  if (lowerQuery.includes('leaseholder') || lowerQuery.includes('resident') || lowerQuery.includes('owner')) {
    return 'leaseholder_info';
  }
  
  if (lowerQuery.includes('compliance') || lowerQuery.includes('certificate') || lowerQuery.includes('assessment')) {
    return 'compliance';
  }
  
  if (lowerQuery.includes('financial') || lowerQuery.includes('payment') || lowerQuery.includes('arrears') || lowerQuery.includes('service charge')) {
    return 'financial';
  }
  
  if (lowerQuery.includes('maintenance') || lowerQuery.includes('repair') || lowerQuery.includes('works')) {
    return 'maintenance';
  }
  
  if (lowerQuery.includes('contact') || lowerQuery.includes('phone') || lowerQuery.includes('email')) {
    return 'contact_info';
  }
  
  if (lowerQuery.includes('access') || lowerQuery.includes('key') || lowerQuery.includes('code')) {
    return 'access_info';
  }
  
  return 'building_info';
}
