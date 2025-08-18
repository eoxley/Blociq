"use client";
import { useState } from "react";
import { toast } from "sonner";
import { 
  Users, 
  X, 
  Sparkles, 
  Building2, 
  User, 
  Tag,
  Loader2,
  Plus,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface BatchGroupModalProps {
  open: boolean;
  onClose: () => void;
  onGroupCreated: (groupName: string, recipients: any[]) => void;
  buildings: any[];
}

interface GroupMember {
  id: string;
  name: string;
  email: string;
  building_name: string;
  unit_number: string;
  tags: string[];
}

export default function BatchGroupModal({
  open,
  onClose,
  onGroupCreated,
  buildings
}: BatchGroupModalProps) {
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGroup, setGeneratedGroup] = useState<{
    name: string;
    members: GroupMember[];
    criteria: string;
  } | null>(null);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    
    console.log('[BatchGroupModal] Starting group generation with description:', description);
    setIsGenerating(true);
    try {
      // Call the actual API to generate the group
      const response = await fetch('/api/communications/batch-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      console.log('[BatchGroupModal] API response status:', response.status);
      const result = await response.json();
      console.log('[BatchGroupModal] API response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate group');
      }

      if (result.success && result.group) {
        const { group } = result;
        
        console.log('[BatchGroupModal] Group generated successfully:', group);
        setGeneratedGroup({
          name: group.name,
          members: group.members,
          criteria: group.criteria
        });
        setGroupName(group.name);
        setSelectedMembers(group.members.map((m: any) => m.id));
        
        toast.success(`Found ${group.members.length} members matching your criteria!`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('[BatchGroupModal] Error generating group:', error);
      toast.error('Failed to generate group. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateGroup = () => {
    if (!generatedGroup || selectedMembers.length === 0) return;
    
    const selectedGroupMembers = generatedGroup.members.filter(m => 
      selectedMembers.includes(m.id)
    );
    
    onGroupCreated(groupName, selectedGroupMembers);
    onClose();
    
    // Reset form
    setDescription("");
    setGeneratedGroup(null);
    setGroupName("");
    setSelectedMembers([]);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAll = () => {
    if (generatedGroup) {
      setSelectedMembers(generatedGroup.members.map(m => m.id));
    }
  };

  const deselectAll = () => {
    setSelectedMembers([]);
  };

  if (!open) return null;

  console.log('[BatchGroupModal] Rendering modal, open:', open);

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          
          {/* Hero Banner Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Create Batch Group</h2>
                    <p className="text-pink-100">Use AI to automatically create groups based on your criteria</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Describe the group you want to create:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., all directors at Ashwood House, leaseholders in Building A, residents with overdue payments..."
                rows={3}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!description.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Group
                </>
              )}
            </button>

            {/* Generated Group */}
            {generatedGroup && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Generated Group
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {/* Group Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Group Name:</label>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Criteria:</label>
                      <div className="p-2 bg-white border border-gray-300 rounded-lg text-sm">
                        {generatedGroup.criteria}
                      </div>
                    </div>
                  </div>
                  
                  {/* Member Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-medium text-gray-600">
                        Members ({selectedMembers.length} of {generatedGroup.members.length} selected):
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={selectAll}
                          className="text-xs text-pink-600 hover:text-pink-800"
                        >
                          Select All
                        </button>
                        <button
                          onClick={deselectAll}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {generatedGroup.members.map((member) => (
                        <div
                          key={member.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedMembers.includes(member.id)
                              ? 'border-pink-500 bg-pink-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleMember(member.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={() => toggleMember(member.id)}
                            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-sm">{member.name}</span>
                              {member.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {member.tags.map((tag, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs"
                                    >
                                      <Tag className="h-3 w-3" />
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {member.email} • {member.building_name} • {member.unit_number}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={selectedMembers.length === 0}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Create Group ({selectedMembers.length} members)
                  </button>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-pink-800 mb-2">💡 Tips for better results:</h4>
              <ul className="text-xs text-pink-700 space-y-1">
                <li>• Be specific about the building name</li>
                <li>• Mention roles like "directors", "leaseholders", "residents"</li>
                <li>• Include criteria like "with overdue payments", "new tenants"</li>
                <li>• Specify unit types like "1-bedroom apartments"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
