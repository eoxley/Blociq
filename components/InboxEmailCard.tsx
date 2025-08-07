import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlocIQButton } from '@/components/ui/blociq-button';
import { toast } from 'sonner';
import { 
  FolderOpen, 
  Check, 
  MapPin, 
  Building, 
  Clock,
  Eye,
  EyeOff,
  Reply,
  Archive,
  Flag,
  MoreHorizontal,
  Star,
  StarOff,
  ExternalLink
} from 'lucide-react';

interface Email {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string | null;
  received_at: string | null;
  body_preview: string | null;
  unread: boolean | null;
  handled: boolean | null;
  filed: boolean | null;
  outlook_id: string | null;
  buildings?: { name: string } | null;
  priority?: 'high' | 'medium' | 'low' | null;
  flagged?: boolean | null;
  starred?: boolean | null;
  tags?: string[] | null;
}

interface InboxEmailCardProps {
  email: Email;
  onEmailUpdated?: () => void;
  showBuildingInfo?: boolean;
  onSelect?: (email: Email) => void;
  isSelected?: boolean;
  showActions?: boolean;
  compact?: boolean;
}

export default function InboxEmailCard({ 
  email, 
  onEmailUpdated,
  showBuildingInfo = true,
  onSelect,
  isSelected = false,
  showActions = true,
  compact = false
}: InboxEmailCardProps) {
  const [isFiling, setIsFiling] = useState(false);
  const [filed, setFiled] = useState(email.filed);
  const [isStarred, setIsStarred] = useState(email.starred || false);
  const [isFlagged, setIsFlagged] = useState(email.flagged || false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === cardRef.current) {
        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            onSelect?.(email);
            break;
          case 'f':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              handleFileEmail();
            }
            break;
          case 's':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              handleToggleStar();
            }
            break;
        }
      }
    };

    const card = cardRef.current;
    if (card) {
      card.addEventListener('keydown', handleKeyDown);
      return () => card.removeEventListener('keydown', handleKeyDown);
    }
  }, [email, onSelect]);

  const handleFileEmail = async () => {
    if (isFiling) return;
    
    setIsFiling(true);
    try {
      const res = await fetch('/api/email/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: email.id,
          outlook_id: email.outlook_id,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Unknown error');

      setFiled(true);
      toast.success('Email filed successfully');
      
      if (onEmailUpdated) {
        onEmailUpdated();
      }
    } catch (err) {
      console.error('Error filing email:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to file email');
    } finally {
      setIsFiling(false);
    }
  };

  const handleToggleStar = async () => {
    setIsStarred(!isStarred);
    toast.success(isStarred ? 'Email unstarred' : 'Email starred');
    // TODO: Implement API call to update star status
  };

  const handleToggleFlag = async () => {
    setIsFlagged(!isFlagged);
    toast.success(isFlagged ? 'Email unflagged' : 'Email flagged');
    // TODO: Implement API call to update flag status
  };

  const handleReply = () => {
    // TODO: Implement reply functionality
    toast.info('Reply functionality coming soon');
  };

  const handleArchive = () => {
    // TODO: Implement archive functionality
    toast.info('Archive functionality coming soon');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
  };

  const getSenderInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.split('@')[0].slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string | null) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return null;
    }
  };

  return (
    <div 
      ref={cardRef}
      tabIndex={onSelect ? 0 : -1}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('emailId', email.id);
      }}
      className={`
        p-4 border rounded-lg shadow-sm bg-white mb-3 transition-all duration-200
        ${email.unread ? 'border-l-4 border-l-blue-500' : 'border-gray-200'}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        hover:shadow-md hover:border-gray-300
        ${onSelect ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : ''}
        ${compact ? 'p-3' : ''}
      `}
      onClick={() => onSelect?.(email)}
      role={onSelect ? 'button' : undefined}
      aria-label={`Email from ${email.from_name || email.from_email}: ${email.subject}`}
    >
      {/* Header with sender info and date */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Priority Indicator */}
          {email.priority && (
            <div className="flex-shrink-0">
              <span className="text-sm" title={`Priority: ${email.priority}`}>
                {getPriorityIcon(email.priority)}
              </span>
            </div>
          )}

          {/* Sender Avatar */}
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
            ${email.unread 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-600'
            }
          `}>
            {getSenderInitials(email.from_name, email.from_email)}
          </div>
          
          {/* Sender Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`
                text-sm font-medium truncate
                ${email.unread ? 'text-gray-900' : 'text-gray-700'}
              `}>
                {email.from_name || email.from_email || 'Unknown Sender'}
              </span>
              {email.unread && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              )}
              {isStarred && (
                <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
              )}
              {isFlagged && (
                <Flag className="h-3 w-3 text-red-500 flex-shrink-0" />
              )}
            </div>
            
            {/* Building Info */}
            {showBuildingInfo && email.buildings?.name && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Building className="h-3 w-3" />
                {email.buildings.name}
              </div>
            )}
          </div>
        </div>
        
        {/* Date and Read Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500">
            {formatDate(email.received_at)}
          </span>
          {email.unread ? (
            <EyeOff className="h-3 w-3 text-gray-400" />
          ) : (
            <Eye className="h-3 w-3 text-gray-400" />
          )}
        </div>
      </div>

      {/* Email Content */}
      <div className="mb-4">
        <h3 className={`
          text-base font-semibold mb-2 truncate
          ${email.unread ? 'text-gray-900' : 'text-gray-700'}
        `}>
          {email.subject || 'No Subject'}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {truncateText(email.body_preview, compact ? 100 : 150)}
        </p>
      </div>

      {/* Tags */}
      {email.tags && email.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {email.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {email.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{email.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Status Badges and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          {email.priority && (
            <Badge variant="outline" className={`text-xs ${getPriorityColor(email.priority)}`}>
              {email.priority.charAt(0).toUpperCase() + email.priority.slice(1)} Priority
            </Badge>
          )}
          
          {/* Status Badges */}
          {email.handled && (
            <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
              Handled
            </Badge>
          )}
          
          {filed && (
            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
              <Check className="h-3 w-3 mr-1" />
              Filed
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center gap-1">
            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStar();
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title={isStarred ? 'Unstar email' : 'Star email'}
              >
                {isStarred ? (
                  <Star className="h-4 w-4 text-yellow-500" />
                ) : (
                  <StarOff className="h-4 w-4 text-gray-400" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFlag();
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title={isFlagged ? 'Unflag email' : 'Flag email'}
              >
                <Flag className={`h-4 w-4 ${isFlagged ? 'text-red-500' : 'text-gray-400'}`} />
              </Button>

              {!filed && (
                <BlocIQButton
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileEmail();
                  }}
                  disabled={isFiling}
                  className="text-xs px-2 py-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                  title="File email"
                >
                  <FolderOpen className="h-3 w-3 mr-1" />
                  {isFiling ? 'Filing...' : 'File'}
                </BlocIQButton>
              )}
            </div>

            {/* More Actions Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreActions(!showMoreActions);
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title="More actions"
              >
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </Button>

              {showMoreActions && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                  <div className="py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReply();
                        setShowMoreActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive();
                        setShowMoreActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      {onSelect && (
        <div className="mt-2 text-xs text-gray-400">
          <span>Press Enter to open • Ctrl+F to file • Ctrl+S to star</span>
        </div>
      )}
    </div>
  );
} 