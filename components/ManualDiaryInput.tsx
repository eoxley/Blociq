"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin, Building, FileText, Plus, X, Loader2 } from "lucide-react";
import { BlocIQButton } from "@/components/ui/blociq-button";
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from "@/components/ui/blociq-card";
import { BlocIQBadge } from "@/components/ui/blociq-badge";
import { toast } from "sonner";

interface ManualDiaryInputProps {
  onEventCreated?: () => void;
  buildings?: Array<{ id: string; name: string; address?: string }>;
}

export default function ManualDiaryInput({ onEventCreated, buildings = [] }: ManualDiaryInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    building_id: "",
    category: "Manual Entry",
    is_all_day: false,
    priority: "medium",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Event added successfully!");
        setFormData({
          title: "",
          description: "",
          start_time: "",
          end_time: "",
          location: "",
          building_id: "",
          category: "Manual Entry",
          is_all_day: false,
          priority: "medium",
          notes: ""
        });
        setIsOpen(false);
        onEventCreated?.();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create event");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (!isOpen) {
    return (
      <BlocIQButton
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
        size="sm"
      >
        <Plus className="h-4 w-4" />
        Add Manual Event
      </BlocIQButton>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <BlocIQCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <BlocIQCardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#333333] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#2BBEB4]" />
              Add Manual Event
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#64748B] hover:text-[#333333] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </BlocIQCardHeader>

        <BlocIQCardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter event title"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-[#008C8F] focus:ring-2 focus:ring-[#008C8F]/20 outline-none transition-colors"
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">
                  Start Date & Time *
                </label>
                                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => handleInputChange("start_time", e.target.value)}
                    min={getMinDateTime()}
                    className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-[#008C8F] focus:ring-2 focus:ring-[#008C8F]/20 outline-none transition-colors"
                    required
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">
                  End Date & Time
                </label>
                                        <input
                          type="datetime-local"
                          value={formData.end_time}
                          onChange={(e) => handleInputChange("end_time", e.target.value)}
                          min={formData.start_time || getMinDateTime()}
                          className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-[#008C8F] focus:ring-2 focus:ring-[#008C8F]/20 outline-none transition-colors"
                        />
              </div>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_all_day"
                checked={formData.is_all_day}
                onChange={(e) => handleInputChange("is_all_day", e.target.checked)}
                className="rounded border-[#E2E8F0] text-[#2BBEB4] focus:ring-[#2BBEB4]"
              />
              <label htmlFor="is_all_day" className="text-sm font-medium text-[#333333]">
                All day event
              </label>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="Enter location"
                  className="w-full border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3 text-sm focus:border-[#008C8F] focus:ring-2 focus:ring-[#008C8F]/20 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Building Selection */}
            {buildings.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">
                  Related Building
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                  <select
                    value={formData.building_id}
                    onChange={(e) => handleInputChange("building_id", e.target.value)}
                    className="w-full border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3 text-sm focus:border-[#008C8F] focus:ring-2 focus:ring-[#008C8F]/20 outline-none transition-colors"
                  >
                    <option value="">Select a building (optional)</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-[#008C8F] focus:ring-2 focus:ring-[#008C8F]/20 outline-none transition-colors"
              >
                <option value="Manual Entry">Manual Entry</option>
                <option value="Meeting">Meeting</option>
                <option value="Inspection">Inspection</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Compliance">Compliance</option>
                <option value="Site Visit">Site Visit</option>
                <option value="Contractor">Contractor</option>
                <option value="Emergency">Emergency</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2">
                Priority
              </label>
              <div className="flex gap-2">
                {["low", "medium", "high"].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => handleInputChange("priority", priority)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.priority === priority
                        ? "bg-[#008C8F] text-white"
                        : "bg-[#F3F4F6] text-[#64748B] hover:bg-[#E2E8F0]"
                    }`}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2">
                Description
              </label>
                              <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Enter event description"
                  rows={3}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-[#008C8F] focus:ring-2 focus:ring-[#008C8F]/20 outline-none transition-colors resize-none"
                />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2">
                Notes
              </label>
                              <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Additional notes"
                  rows={2}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-[#008C8F] focus:ring-2 focus:ring-[#008C8F]/20 outline-none transition-colors resize-none"
                />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
              <BlocIQButton
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Cancel
              </BlocIQButton>
              <BlocIQButton
                type="submit"
                disabled={loading || !formData.title || !formData.start_time}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {loading ? "Creating..." : "Create Event"}
              </BlocIQButton>
            </div>
          </form>
        </BlocIQCardContent>
      </BlocIQCard>
    </div>
  );
} 