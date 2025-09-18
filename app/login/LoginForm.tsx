'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginForm({
  searchParams,
}: {
  searchParams: { message: string; error: string }
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        // Successfully signed in, redirect to home
        setMessage('Successfully signed in! Redirecting...')
        window.location.href = '/home'
      } else {
        setError('Authentication failed. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    }

    setIsLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      // Direct signup without email confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        // Check if user is immediately confirmed (no email confirmation required)
        if (data.user.email_confirmed_at || !data.user.confirmation_sent_at) {
          setMessage('Account created successfully! Signing you in...')
          // Attempt to sign in immediately
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (!signInError) {
            window.location.href = '/home'
          }
        } else {
          setMessage('Account created! Please contact admin to activate your account.')
        }
      } else {
        setError('Account creation failed. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    }

    setIsLoading(false)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email and password to sign in to your account. No email confirmation required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-600">Don't have an account? </span>
          <button
            onClick={handleSignUp}
            className="text-blue-600 hover:text-blue-500"
            disabled={isLoading}
          >
            Sign up
          </button>
        </div>

        {message && (
          <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
            {message}
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {searchParams?.error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {searchParams.error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
