"use client";

import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Calendar, Building, Shield, CheckCircle } from "lucide-react";

export default function LoginPageInner() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Dynamically import Supabase *only on the client*
    const loadSupabase = async () => {
      const { supabase } = await import("@/utils/supabase");

      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
    };

    loadSupabase();
  }, []);

  // Check for error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(getErrorMessage(errorParam));
    }
  }, []);

  const getErrorMessage = (error: string): string => {
    switch (error) {
      case 'microsoft_oauth':
        return 'Microsoft authentication failed. Please try again.';
      case 'state_mismatch':
        return 'Security verification failed. Please try again.';
      case 'token_exchange':
        return 'Failed to complete authentication. Please try again.';
      case 'supabase_auth':
        return 'Account creation failed. Please try again.';
      default:
        return 'An error occurred during login. Please try again.';
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Redirect to Microsoft OAuth
      window.location.href = '/auth/sign-in';
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to start login process. Please try again.');
      setIsLoading(false);
    }
  };

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">You're already signed in!</h2>
            <p className="text-gray-600 mb-4">Welcome back to BlocIQ</p>
            <Button 
              onClick={() => window.location.href = '/home'}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Building className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Welcome to BlocIQ</CardTitle>
          <p className="text-gray-600 mt-2">Property Management Made Simple</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Secure Microsoft Login
              </h3>
              <p className="text-blue-700 text-sm">
                Sign in with your Microsoft account to automatically connect Outlook and Calendar
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-blue-500" />
                <span>Access to Outlook emails</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-green-500" />
                <span>Calendar integration</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Building className="h-4 w-4 text-purple-500" />
                <span>Property management tools</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold py-3"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing in...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                </svg>
                Sign in with Microsoft
              </div>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
