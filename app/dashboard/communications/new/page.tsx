'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import MergeTagHelper from '@/components/MergeTagHelper';

export default function NewTemplatePage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'email',
    subject: '',
    content: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const insertMergeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + tag
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('communication_templates')
        .insert({
          name: formData.name,
          type: formData.type,
          subject: formData.subject || null,
          content: formData.content,
          created_by: user.id,
        });

      if (error) {
        throw error;
      }

      router.push('/dashboard/communications');
    } catch (err: any) {
      console.error('Error creating template:', err);
      setError(err.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/communications">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Create New Template</h1>
          <p className="text-muted-foreground">Create a reusable email or letter template</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Service Charge Reminder"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              {/* Template Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Template Type *</Label>
                <Select 
                  value={formData.type} 
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  <option value="email">Email</option>
                  <option value="letter">Letter</option>
                </Select>
              </div>

              {/* Subject (for emails) */}
              {formData.type === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Service Charge Reminder - {{building_name}}"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                  />
                </div>
              )}

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Enter your template content here. Use merge tags to personalize the message..."
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  rows={12}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Use the merge tags panel to insert dynamic content like names, addresses, and dates.
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Creating...' : 'Create Template'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/communications">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Merge Tags Sidebar */}
        <div className="lg:col-span-1">
          <MergeTagHelper onInsertTag={insertMergeTag} />
        </div>
      </form>
    </div>
  );
} 