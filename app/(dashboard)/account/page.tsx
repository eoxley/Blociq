'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import PageHero from '@/components/PageHero';
import { Settings, User, Briefcase, Mail, FileText, Upload, X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  signature_text: string | null;
  signature_url: string | null;
  email_signature: string | null;
}

export default function AccountPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'typed' | 'upload'>('typed');
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

      // Get user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // If profile doesn't exist, create one
      if (!profileData) {
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            email: user.email,
            first_name: null,
            last_name: null,
            job_title: null,
            signature_text: null,
            signature_url: null,
            email_signature: null
          })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(profileData);
      }

      // Set signature preview if exists
      if (profileData?.signature_text) {
        setSignaturePreview(profileData.signature_text);
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
      
      const { error } = await supabase
        .from('users')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          job_title: profile.job_title,
          signature_text: profile.signature_text,
          signature_url: profile.signature_url,
          email_signature: profile.email_signature,
          updated_at: new Date().toISOString()
        })
        .eq('email', profile.email);

      if (error) throw error;
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureUpload = async (file: File) => {
    try {
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
      if (file.type.startsWith('image/')) {
        handleSignatureUpload(file);
      } else {
        toast.error('Please upload an image file');
      }
    }
  };

  const removeSignature = () => {
    setProfile(prev => prev ? { ...prev, signature_url: null } : null);
    setSignaturePreview(null);
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="space-y-8">
          <PageHero
            title="Account Settings"
            subtitle="Manage your account preferences and settings"
            icon={<Settings className="h-8 w-8 text-white" />}
          />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-8">
        {/* Hero Banner */}
        <PageHero
          title="Account Settings"
          subtitle="Manage your account preferences and settings"
          icon={<Settings className="h-8 w-8 text-white" />}
        />

        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <User className="h-6 w-6 text-[#6A00F5]" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={profile?.first_name || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                      placeholder="Enter your first name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={profile?.last_name || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                      placeholder="Enter your last name"
                    />
                  </div>
                  
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="jobTitle" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Job Title
                    </Label>
                    <Input
                      id="jobTitle"
                      value={profile?.job_title || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, job_title: e.target.value } : null)}
                      placeholder="e.g., Property Manager, Building Manager"
                    />
                  </div>
                  
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      value={profile?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-sm text-gray-500">Email address is managed by your authentication provider</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Signature Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Signature</h3>
                <Tabs value={signatureMode} onValueChange={(value) => setSignatureMode(value as 'typed' | 'upload')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="typed">Typed Signature</TabsTrigger>
                    <TabsTrigger value="upload">Upload Image</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="typed" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signatureText">Signature Text</Label>
                      <Input
                        id="signatureText"
                        value={profile?.signature_text || ''}
                        onChange={(e) => {
                          setProfile(prev => prev ? { ...prev, signature_text: e.target.value } : null);
                          setSignaturePreview(e.target.value);
                        }}
                        placeholder="Enter your signature"
                        className="font-[cursive] text-xl"
                      />
                    </div>
                    {signaturePreview && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <Label className="text-sm text-gray-600">Preview:</Label>
                        <div className="font-[cursive] text-xl text-gray-900 mt-1">
                          {signaturePreview}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="upload" className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragOver ? 'border-[#6A00F5] bg-purple-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Drag and drop an image here, or{' '}
                        <button
                          type="button"
                          onClick={() => document.getElementById('signatureUpload')?.click()}
                          className="font-medium text-[#6A00F5] hover:text-[#5A00E5]"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports JPG, PNG, GIF (max 5MB)
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
                    </div>
                    
                    {signaturePreview && profile?.signature_url && (
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">Preview:</Label>
                        <div className="relative inline-block">
                          <img
                            src={profile.signature_url}
                            alt="Signature preview"
                            className="max-h-20 max-w-full rounded border"
                          />
                          <button
                            onClick={removeSignature}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <Separator />

              {/* Email Signature */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Email Signature</h3>
                <div className="space-y-2">
                  <Label htmlFor="emailSignature" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Email Signature
                  </Label>
                  <Textarea
                    id="emailSignature"
                    value={profile?.email_signature || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, email_signature: e.target.value } : null)}
                    placeholder="Enter your email signature (supports basic HTML like <b>bold</b>, <i>italic</i>, <a href='...'>links</a>)"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    You can use basic HTML tags for formatting: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;a href="..."&gt;link&lt;/a&gt;
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] hover:from-[#5A00E5] hover:to-[#7A2BD2] text-white px-6 py-2"
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
    </LayoutWithSidebar>
  );
}
