'use client';

export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Settings, User, FileText, Save, Loader2, Image, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { generateEmailSignature, saveUserSignature } from '@/lib/signature';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  phone_number?: string | null;
  signature_text?: string | null;
  signature_url?: string | null;
  email_signature?: string | null;
  full_name?: string | null;
}

export default function AccountPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'typed' | 'upload'>('typed');
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('No user found');

      // Get user profile from database (use profiles table which has the correct schema)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // If profile doesn't exist, create one with only essential fields
      if (!profileData) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            user_id: user.id,
            email: user.email
          })
          .select()
          .single();

        if (createError) throw createError;
        // Add email from auth user to the profile object for UI
        const profileWithEmail = { ...newProfile, email: user.email };
        setProfile(profileWithEmail);

        // Save signature data to localStorage for use in emails
        saveUserSignature(profileWithEmail);
      } else {
        // Add email from auth user to the profile object for UI
        const profileWithEmail = { ...profileData, email: user.email, id: user.id };
        setProfile(profileWithEmail);

        // Save signature data to localStorage for use in emails
        saveUserSignature(profileWithEmail);
      }

      // Set signature preview if exists
      if (profileData) {
        const completeSignature = generateEmailSignature(profileData);
        setSignaturePreview(completeSignature);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);

      // Only update fields that exist in the profile
      const updateData: Record<string, string> = {};
      if (profile.first_name !== undefined) updateData.first_name = profile.first_name;
      if (profile.last_name !== undefined) updateData.last_name = profile.last_name;
      if (profile.job_title !== undefined) updateData.job_title = profile.job_title;
      if (profile.company_name !== undefined) updateData.company_name = profile.company_name;
      if (profile.phone_number !== undefined) updateData.phone_number = profile.phone_number;
      if (profile.signature_text !== undefined) updateData.signature_text = profile.signature_text;
      if (profile.signature_url !== undefined) updateData.signature_url = profile.signature_url;
      if (profile.email_signature !== undefined) updateData.email_signature = profile.email_signature;

      // Use API endpoint instead of direct Supabase calls
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const result = await response.json();

      // Save signature data to localStorage for use in emails
      saveUserSignature(profile);

      // Update signature preview
      const completeSignature = generateEmailSignature(profile);
      setSignaturePreview(completeSignature);

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureUpload = async (file: File) => {
    try {
      setUploading(true);
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `signatures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      setProfile(prev => prev ? { ...prev, signature_url: publicUrl } : null);
      setSignaturePreview(publicUrl);
      toast.success('Signature uploaded successfully!');
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast.error('Failed to upload signature');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      handleSignatureUpload(file);
    }
  };

  const removeSignature = () => {
    setProfile(prev => prev ? { ...prev, signature_url: null } : null);
    setSignaturePreview(null);
    toast.success('Signature removed');
  };

  // Update signature preview when profile changes
  useEffect(() => {
    if (profile) {
      const completeSignature = generateEmailSignature(profile);
      setSignaturePreview(completeSignature);
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
              <p className="text-gray-600">Manage your account preferences and settings</p>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profile?.first_name || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                  placeholder="Enter your first name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profile?.last_name || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                  placeholder="Enter your last name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={profile?.job_title || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, job_title: e.target.value } : null)}
                  placeholder="Enter your job title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={profile?.company_name || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                  placeholder="Enter your company name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={profile?.phone_number || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, phone_number: e.target.value } : null)}
                  placeholder="Enter your phone number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
            </div>

            <Separator />

            {/* Signature Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Digital Signature</h3>
              <p className="text-sm text-gray-600">
                Your signature will be automatically included in emails and replies
              </p>
              
              <Tabs value={signatureMode} onValueChange={(value) => setSignatureMode(value as 'typed' | 'upload')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="typed">Text Signature</TabsTrigger>
                  <TabsTrigger value="upload">Image Signature</TabsTrigger>
                </TabsList>
                
                <TabsContent value="typed" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signatureText">Signature Text</Label>
                    <Input
                      id="signatureText"
                      value={profile?.signature_text || ''}
                      onChange={(e) => {
                        setProfile(prev => prev ? { ...prev, signature_text: e.target.value } : null);
                      }}
                      placeholder="Enter your signature text (optional)"
                      className="signature-font"
                    />
                    <p className="text-xs text-gray-500">
                      This text will appear above your contact information in emails
                    </p>
                  </div>
                  {signaturePreview && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <Label className="text-sm text-gray-600">Complete Signature Preview:</Label>
                      <div className="signature-preview mt-2 p-3 bg-white rounded border font-mono text-sm whitespace-pre-line">
                        {signaturePreview}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="upload" className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragOver ? 'border-[#6A00F5] bg-purple-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {uploading ? (
                      <div className="space-y-4">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#6A00F5]" />
                        <p className="text-sm text-gray-600">Uploading signature...</p>
                      </div>
                    ) : (
                      <>
                        <Image className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          Upload your signature image
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                          Drag and drop an image here, or{' '}
                          <button
                            type="button"
                            onClick={() => document.getElementById('signatureUpload')?.click()}
                            className="font-medium text-[#6A00F5] hover:text-[#5A00E5] underline"
                          >
                            browse files
                          </button>
                        </p>
                        <p className="text-xs text-gray-500">
                          Supports JPG, PNG, GIF • Max 5MB • Recommended: transparent background
                        </p>
                        <input
                          id="signatureUpload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSignatureUpload(file);
                          }}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>
                  
                  {signaturePreview && profile?.signature_url && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Current Signature:</Label>
                      <div className="relative inline-block p-4 bg-gray-50 rounded-lg">
                        <img
                          src={profile.signature_url}
                          alt="Signature preview"
                          className="max-h-24 max-w-full rounded"
                        />
                        <button
                          onClick={removeSignature}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                          title="Remove signature"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Your signature image will be automatically included in emails
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <Separator />

            {/* Email Signature Template */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Email Signature Template</h3>
              <div className="space-y-2">
                <Label htmlFor="emailSignature" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Email Signature Template
                </Label>
                <Textarea
                  id="emailSignature"
                  value={profile?.email_signature || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, email_signature: e.target.value } : null)}
                  placeholder={`Best regards,

${profile?.first_name || '[Your Name]'} ${profile?.last_name || ''}
${profile?.job_title || '[Your Job Title]'}
${profile?.company_name || '[Company Name]'}
${profile?.phone_number ? `Phone: ${profile.phone_number}` : '[Phone Number]'}
${profile?.email || '[Email]'}
[Website]`}
                  rows={8}
                  className="font-mono text-sm"
                />
                <div className="text-xs text-gray-500 space-y-1">
                  <p>You can use basic HTML tags for formatting:</p>
                  <p>• <code>&lt;b&gt;bold&lt;/b&gt;</code> • <code>&lt;i&gt;italic&lt;/i&gt;</code> • <code>&lt;a href=&quot;...&quot;&gt;link&lt;/a&gt;</code></p>
                  <p>• Your signature image will be automatically included if uploaded</p>
                  <p>• This template will be used for custom email signatures</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] hover:from-[#5A00E5] hover:to-[#7A2BD2] text-white px-8 py-3 rounded-lg font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
