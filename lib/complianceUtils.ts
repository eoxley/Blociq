export interface ComplianceAsset {
  id: string
  name: string
  description: string
  required_if: 'always' | 'if present' | 'if HRB'
  default_frequency: string
  applies: boolean
  last_checked: string
  next_due: string
}

export type ComplianceStatus = 'Compliant' | 'Due Soon' | 'Overdue' | 'In Progress' | 'Not Started' | 'Not Applicable'

export const getComplianceStatus = (asset: ComplianceAsset): ComplianceStatus => {
  if (!asset.applies) return 'Not Applicable'
  if (!asset.last_checked) return 'Not Started'
  if (!asset.next_due) return 'In Progress'
  
  const nextDue = new Date(asset.next_due)
  const today = new Date()
  
  if (nextDue < today) return 'Overdue'
  if (nextDue.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) return 'Due Soon'
  return 'Compliant'
}

export const calculateNextDueDate = (lastChecked: string, frequency: string): string => {
  const lastCheckedDate = new Date(lastChecked)
  const nextDue = new Date(lastCheckedDate)
  
  if (frequency.includes('6 months')) {
    nextDue.setMonth(nextDue.getMonth() + 6)
  } else if (frequency.includes('1 year')) {
    nextDue.setFullYear(nextDue.getFullYear() + 1)
  } else if (frequency.includes('3 years')) {
    nextDue.setFullYear(nextDue.getFullYear() + 3)
  } else if (frequency.includes('5 years')) {
    nextDue.setFullYear(nextDue.getFullYear() + 5)
  } else if (frequency.includes('monthly')) {
    nextDue.setMonth(nextDue.getMonth() + 1)
  } else if (frequency.includes('quarterly')) {
    nextDue.setMonth(nextDue.getMonth() + 3)
  }
  
  return nextDue.toISOString().split('T')[0]
}

export const getDaysUntilDue = (nextDue: string): number => {
  const dueDate = new Date(nextDue)
  const today = new Date()
  return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export const getStatusColor = (status: ComplianceStatus): string => {
  switch (status) {
    case 'Compliant':
      return 'text-green-600'
    case 'Due Soon':
      return 'text-yellow-600'
    case 'Overdue':
      return 'text-red-600'
    case 'In Progress':
      return 'text-blue-600'
    case 'Not Started':
      return 'text-gray-600'
    default:
      return 'text-gray-400'
  }
}

export const getStatusBadgeColor = (status: ComplianceStatus): string => {
  switch (status) {
    case 'Compliant':
      return 'bg-green-100 text-green-800'
    case 'Due Soon':
      return 'bg-yellow-100 text-yellow-800'
    case 'Overdue':
      return 'bg-red-100 text-red-800'
    case 'In Progress':
      return 'bg-blue-100 text-blue-800'
    case 'Not Started':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const calculateComplianceStats = (assets: ComplianceAsset[]) => {
  const total = assets.length
  const applicable = assets.filter(asset => asset.applies).length
  const compliant = assets.filter(asset => getComplianceStatus(asset) === 'Compliant').length
  const overdue = assets.filter(asset => getComplianceStatus(asset) === 'Overdue').length
  const dueSoon = assets.filter(asset => getComplianceStatus(asset) === 'Due Soon').length
  const notStarted = assets.filter(asset => getComplianceStatus(asset) === 'Not Started').length
  const inProgress = assets.filter(asset => getComplianceStatus(asset) === 'In Progress').length

  return {
    total,
    applicable,
    compliant,
    overdue,
    dueSoon,
    notStarted,
    inProgress,
    complianceRate: applicable > 0 ? Math.round((compliant / applicable) * 100) : 0
  }
}

export const getUpcomingDueAssets = (assets: ComplianceAsset[], limit: number = 5) => {
  return assets
    .filter(asset => asset.applies && asset.next_due)
    .sort((a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())
    .slice(0, limit)
}

export const getOverdueAssets = (assets: ComplianceAsset[]) => {
  return assets.filter(asset => getComplianceStatus(asset) === 'Overdue')
}

export const getDueSoonAssets = (assets: ComplianceAsset[]) => {
  return assets.filter(asset => getComplianceStatus(asset) === 'Due Soon')
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`
  } else if (diffDays === 0) {
    return 'Due today'
  } else if (diffDays === 1) {
    return 'Due tomorrow'
  } else {
    return `Due in ${diffDays} days`
  }
} 