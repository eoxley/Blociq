/**
 * Icon Mapping for Navigation and Dashboard
 * 
 * Maps emoji icons to Lucide React outlined stroke icons
 * for consistent, professional appearance across the application.
 */

import {
  Home,
  Brain,
  Microscope,
  Building2,
  Shield,
  Megaphone,
  Wrench,
  PoundSterling,
  HardHat,
  ClipboardList,
  Monitor,
  Inbox,
  Bot,
  FileText,
  BarChart3,
  Settings,
  TrendingUp,
  Edit3,
  Plus,
  Upload,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Bell,
  User,
  HelpCircle,
  LogOut,
  ExternalLink,
  Lock,
  Search,
  Eye,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Paperclip,
  MessageSquare,
  Download,
  Trash2,
  Archive,
  Folder,
  Star,
  Flag,
  MoreVertical,
  Reply,
  ReplyAll,
  Forward,
  Filter,
  RefreshCw,
  Sparkles,
  Zap,
  Wand2,
  Loader2,
  Send,
  File,
  Building,
  AlertCircle,
  CheckCircle2,
  Construction,
  History,
  ArrowRight,
  Save,
  Edit,
  Info,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  Activity,
  Bug,
  Code,
  Image,
  XCircle,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Database,
  Upload as UploadIcon,
  Eye as EyeIcon,
  Edit3 as EditIcon,
  Download as DownloadIcon,
  Trash2 as TrashIcon2,
  Search as SearchIcon,
  Building2 as BuildingIcon2,
  User as UserIcon,
  Home as HomeIcon,
  Mail as MailIcon,
  Phone as PhoneIcon,
  Calendar as CalendarIcon,
  FileText as FileTextIcon,
  MessageSquare as MessageSquareIcon,
  Upload as UploadIcon2,
  Download as DownloadIcon2,
  Trash2 as TrashIcon3,
  Search as SearchIcon2,
  Bell as BellIcon,
  ProjectObservations,
  ProjectDocumentsUploader,
  MajorWorksTimeline,
  MajorWorksDashboard,
  MajorWorksBadge,
  LeaseholdersTable,
  LeaseholderManagement,
  EnhancedAITest,
  EditableBuildingInfo,
  EditBuildingClientModal,
  DocumentsAndObservationsTab,
  DailySummary,
  DailyOverview,
  CreateEventModal,
  CreateEventForm,
  CommunicationModal,
  BuildingSummaryPanel,
  BuildingStructureOverview,
  BuildingStructureCard,
  BuildingAmendments,
  AISummary,
  AISuggestedActionSidebar
} from 'lucide-react';

export const iconMapping = {
  // Navigation Icons
  '🏠': Home,           // Home
  '🧠': Brain,          // Inbox Overview / AI
  '🔬': Microscope,     // Lease Lab
  '🏢': Building2,      // Buildings
  '🛡️': Shield,         // Compliance
  '📣': Megaphone,      // Communications
  '🔧': Wrench,         // Major Works
  '💷': PoundSterling,  // Finances
  '👷': HardHat,        // Contractors
  '📋': ClipboardList,  // Work Orders
  '🧑‍💻': Monitor,        // Client Portal
  
  // Additional Icons
  '📥': Inbox,          // Inbox
  '🤖': Bot,            // AI Assistant
  '📄': FileText,       // Documents
  '📊': BarChart3,      // Analytics/Reports
  '⚙️': Settings,       // Settings
  '📈': TrendingUp,     // Reports
  '📝': Edit3,          // Amendments/Edit
  '➕': Plus,           // Add/New
  '📤': Upload,         // Upload
  
  // UI Icons
  '→': ChevronRight,    // Breadcrumb arrow
  '←': ChevronLeft,     // Back arrow
  '☰': Menu,           // Menu
  '✕': X,              // Close
  '🔔': Bell,          // Notifications
  '👤': User,          // User
  '❓': HelpCircle,    // Help
  '🚪': LogOut,        // Logout
  '🔗': ExternalLink,  // External link
  '🔒': Lock,          // Lock/Security
  '🔍': Search,        // Search
  '👁️': Eye,           // View
  '📧': Mail,          // Email
  '📞': Phone,         // Phone
  '📅': Calendar,      // Calendar
  '📍': MapPin,        // Location
  '👥': Users,         // People
  '💰': DollarSign,    // Money
  '⚠️': AlertTriangle, // Warning
  '✅': CheckCircle,   // Success
  '⏰': Clock,         // Time
  '📎': Paperclip,     // Attachment
  '💬': MessageSquare, // Message
  '⬇️': Download,      // Download
  '🗑️': Trash2,        // Delete
  '📁': Archive,       // Archive
  '📂': Folder,        // Folder
  '⭐': Star,          // Star
  '🚩': Flag,          // Flag
  '⋮': MoreVertical,   // More options
  '↩️': Reply,         // Reply
  '↩️↩️': ReplyAll,     // Reply All
  '↗️': Forward,       // Forward
  '🔽': Filter,        // Filter
  '🔄': RefreshCw,     // Refresh
  '✨': Sparkles,      // AI/Sparkles
  '⚡': Zap,           // Quick action
  '🪄': Wand2,         // Magic/AI
  '⏳': Loader2,       // Loading
  '📤': Send,          // Send
  '📄': File,          // File
  '🏢': Building,      // Building
  '⚠️': AlertCircle,   // Alert
  '✅': CheckCircle2,  // Check
  '🏗️': Construction,  // Construction
  '📜': History,       // History
  '➡️': ArrowRight,    // Arrow right
  '💾': Save,          // Save
  '✏️': Edit,          // Edit
  'ℹ️': Info,          // Info
  '➕': PlusIcon,      // Add
  '🗑️': TrashIcon,     // Delete
  '📊': Activity,      // Activity
  '🐛': Bug,           // Bug
  '💻': Code,          // Code
  '🖼️': Image,         // Image
  '❌': XCircle,       // Error
  '✅': CheckCircleIcon, // Success
  '📈': TrendingUpIcon,  // Trending
  '🗄️': Database,      // Database
  '📤': UploadIcon,    // Upload
  '👁️': EyeIcon,       // View
  '✏️': EditIcon,      // Edit
  '⬇️': DownloadIcon,  // Download
  '🗑️': TrashIcon2,    // Delete
  '🔍': SearchIcon,    // Search
  '🏢': BuildingIcon2, // Building
  '👤': UserIcon,      // User
  '🏠': HomeIcon,      // Home
  '📧': MailIcon,      // Mail
  '📞': PhoneIcon,     // Phone
  '📅': CalendarIcon,  // Calendar
  '📄': FileTextIcon,  // File
  '💬': MessageSquareIcon, // Message
  '📤': UploadIcon2,   // Upload
  '⬇️': DownloadIcon2, // Download
  '🗑️': TrashIcon3,    // Delete
  '🔍': SearchIcon2,   // Search
  '🔔': BellIcon,      // Bell
} as const;

export type IconKey = keyof typeof iconMapping;
export type IconComponent = typeof iconMapping[IconKey];

/**
 * Get the appropriate Lucide icon component for an emoji icon
 */
export function getIconComponent(emojiIcon: string): IconComponent | null {
  return iconMapping[emojiIcon as IconKey] || null;
}

/**
 * Check if an emoji has a corresponding Lucide icon
 */
export function hasIconMapping(emojiIcon: string): boolean {
  return emojiIcon in iconMapping;
}
