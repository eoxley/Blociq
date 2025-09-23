'use client';

import React, { useState } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Check, 
  X, 
  Edit2, 
  Trash2, 
  Calendar,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Users,
  Phone,
  Mail,
  Edit,
  ChevronDown,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useActionTracker, TrackerItem, CreateTrackerItem, UpdateTrackerItem } from '@/hooks/use-action-tracker';
import SectionCard from '@/components/ui/SectionCard';

interface ActionTrackerProps {
  buildingId: string;
}

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: CreateTrackerItem) => void;
  isCreating: boolean;
}

interface TrackerItemRowProps {
  item: TrackerItem;
  onToggleCompleted: (id: string, completed: boolean) => void;
  onUpdate: (id: string, updates: UpdateTrackerItem) => void;
  onDelete: (id: string) => void;
  isOverdue: boolean;
  isDueSoon: boolean;
  getPriorityColor: (priority: string) => string;
  getSourceIcon: (source: string) => string;
}

// Priority badge component
const PriorityBadge: React.FC<{ priority: string; getPriorityColor: (p: string) => string }> = ({ 
  priority, 
  getPriorityColor 
}) => {
  const colorClass = getPriorityColor(priority);
  const colorClasses = {
    red: 'bg-red-100 text-red-800 border-red-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200', 
    green: 'bg-green-100 text-green-800 border-green-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClasses[colorClass as keyof typeof colorClasses] || colorClasses.gray}`}>
      {priority}
    </span>
  );
};

// Source icon component
const SourceIcon: React.FC<{ source: string; getSourceIcon: (s: string) => string }> = ({ 
  source, 
  getSourceIcon 
}) => {
  const iconType = getSourceIcon(source);
  const IconComponent = {
    users: Users,
    phone: Phone,
    mail: Mail,
    edit: Edit
  }[iconType] || Edit;
  
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <IconComponent className="h-3 w-3" />
      <span>{source}</span>
    </div>
  );
};

// Add Item Dialog Component
const AddItemDialog: React.FC<AddItemDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isCreating 
}) => {
  const [formData, setFormData] = useState<CreateTrackerItem>({
    item_text: '',
    due_date: null,
    notes: '',
    priority: 'medium',
    source: 'Manual'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_text.trim()) return;
    
    onSubmit({
      ...formData,
      item_text: formData.item_text.trim(),
      notes: formData.notes?.trim() || undefined,
      due_date: formData.due_date || null
    });
    
    // Reset form
    setFormData({
      item_text: '',
      due_date: null,
      notes: '',
      priority: 'medium',
      source: 'Manual'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add New Action Item</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Item *
            </label>
            <textarea
              value={formData.item_text}
              onChange={(e) => setFormData(prev => ({ ...prev, item_text: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent resize-none"
              rows={3}
              placeholder="Describe the action item..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value as 'Manual' | 'Meeting' | 'Call' | 'Email' }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              >
                <option value="Manual">Manual</option>
                <option value="Meeting">Meeting</option>
                <option value="Call">Call</option>
                <option value="Email">Email</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value || null }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent resize-none"
              rows={2}
              placeholder="Additional notes or details..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isCreating || !formData.item_text.trim()}
              className="flex-1 bg-[#4f46e5] text-white py-2 px-4 rounded-lg hover:bg-[#4338ca] disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Item'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Tracker Item Row Component
const TrackerItemRow: React.FC<TrackerItemRowProps> = ({
  item,
  onToggleCompleted,
  onUpdate,
  onDelete,
  isOverdue,
  isDueSoon,
  getPriorityColor,
  getSourceIcon
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    item_text: item.item_text,
    due_date: item.due_date || '',
    notes: item.notes || ''
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    onUpdate(item.id, {
      item_text: editData.item_text.trim(),
      due_date: editData.due_date || null,
      notes: editData.notes.trim() || null
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      item_text: item.item_text,
      due_date: item.due_date || '',
      notes: item.notes || ''
    });
    setIsEditing(false);
  };

  // Row background based on status
  const getRowClasses = () => {
    if (item.completed) {
      return 'bg-gray-50/70 backdrop-blur-sm border-gray-200/50';
    }
    if (isOverdue) {
      return 'bg-red-50/70 backdrop-blur-sm border-red-200/50';
    }
    if (isDueSoon) {
      return 'bg-amber-50/70 backdrop-blur-sm border-amber-200/50';
    }
    return 'bg-white/70 backdrop-blur-sm border-gray-200/50 hover:bg-gray-50/80';
  };

  return (
    <div className={`border rounded-lg p-4 transition-colors ${getRowClasses()}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggleCompleted(item.id, !item.completed)}
          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            item.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-[#4f46e5]'
          }`}
        >
          {item.completed && <Check className="h-3 w-3" />}
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            // Editing mode
            <div className="space-y-3">
              <textarea
                value={editData.item_text}
                onChange={(e) => setEditData(prev => ({ ...prev, item_text: e.target.value }))}
                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent resize-none"
                rows={2}
              />
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={editData.due_date}
                  onChange={(e) => setEditData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                />
                <input
                  type="text"
                  value={editData.notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes..."
                  className="p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Display mode
            <div>
              <div className="flex items-start justify-between">
                <p className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {item.item_text}
                </p>
                
                <div className="flex items-center gap-2 ml-2">
                  {/* Status indicators */}
                  {isOverdue && !item.completed && (
                    <AlertTriangle className="h-4 w-4 text-red-500" title="Overdue" />
                  )}
                  {isDueSoon && !item.completed && (
                    <Clock className="h-4 w-4 text-amber-500" title="Due soon" />
                  )}

                  {/* Action buttons */}
                  {!item.completed && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-gray-400 hover:text-[#4f46e5] p-1 rounded"
                        title="Edit item"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded"
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* Expand button if has additional info */}
                  {(item.due_date || item.notes) && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Metadata row */}
              <div className="flex items-center gap-4 mt-2">
                <PriorityBadge priority={item.priority} getPriorityColor={getPriorityColor} />
                <SourceIcon source={item.source} getSourceIcon={getSourceIcon} />
                
                {item.due_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(item.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && item.notes && (
                <div className="mt-2 p-2 bg-gray-100/70 backdrop-blur-sm rounded text-xs text-gray-600 border border-gray-200/50">
                  {item.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main ActionTracker Component
export default function ActionTracker({ buildingId }: ActionTrackerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const {
    items,
    stats,
    showCompleted,
    isLoading,
    error,
    isCreating,
    createItem,
    updateItem,
    deleteItem,
    toggleItemCompleted,
    toggleShowCompleted,
    isItemOverdue,
    isItemDueSoon,
    getPriorityColor,
    getSourceIcon,
  } = useActionTracker(buildingId);

  const handleCreateItem = (newItem: CreateTrackerItem) => {
    createItem(newItem, {
      onSuccess: () => {
        setShowAddDialog(false);
      }
    });
  };

  if (error) {
    return (
      <SectionCard className="group">
        <div className="relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Action Tracker - Error</h3>
          </div>
        </div>
        <div className="p-4">
          <p className="text-red-600">Failed to load action tracker: {error.message}</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard className="group backdrop-blur-sm bg-white/80">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] px-4 py-3 rounded-t-2xl backdrop-blur-md bg-opacity-90">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <h3 className="font-semibold">Action Tracker</h3>
              {!isLoading && (
                <span className="text-sm text-white/80">
                  {stats.active} active, {stats.completed} completed
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleShowCompleted}
                className="flex items-center gap-1 text-white/90 hover:text-white text-sm font-medium transition-colors"
              >
                {showCompleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showCompleted ? 'Hide' : 'Show'} Completed
              </button>
              <button
                onClick={() => setShowAddDialog(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-4 w-8 h-8 bg-white/5 rounded-full blur-lg"></div>
        </div>

        <div className="p-4 backdrop-blur-sm bg-white/50">
          {/* Stats overview */}
          {!isLoading && stats.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50/70 backdrop-blur-sm rounded-lg p-3 text-center border border-blue-100/50">
                <div className="text-lg font-bold text-blue-600">{stats.active}</div>
                <div className="text-xs text-blue-600">Active</div>
              </div>
              <div className="bg-red-50/70 backdrop-blur-sm rounded-lg p-3 text-center border border-red-100/50">
                <div className="text-lg font-bold text-red-600">{stats.overdue}</div>
                <div className="text-xs text-red-600">Overdue</div>
              </div>
              <div className="bg-amber-50/70 backdrop-blur-sm rounded-lg p-3 text-center border border-amber-100/50">
                <div className="text-lg font-bold text-amber-600">{stats.dueSoon}</div>
                <div className="text-xs text-amber-600">Due Soon</div>
              </div>
              <div className="bg-green-50/70 backdrop-blur-sm rounded-lg p-3 text-center border border-green-100/50">
                <div className="text-lg font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-green-600">Completed</div>
              </div>
            </div>
          )}

          {/* Items list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#4f46e5]" />
              <span className="ml-2 text-gray-600">Loading action items...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No action items yet</h4>
              <p className="text-gray-600 mb-4">
                Start tracking tasks, follow-ups, and action items from meetings, calls, or emails.
              </p>
              <button
                onClick={() => setShowAddDialog(true)}
                className="bg-[#4f46e5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                Add Your First Item
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <TrackerItemRow
                  key={item.id}
                  item={item}
                  onToggleCompleted={toggleItemCompleted}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  isOverdue={isItemOverdue(item)}
                  isDueSoon={isItemDueSoon(item)}
                  getPriorityColor={getPriorityColor}
                  getSourceIcon={getSourceIcon}
                />
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Add Item Dialog */}
      <AddItemDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleCreateItem}
        isCreating={isCreating}
      />
    </>
  );
}