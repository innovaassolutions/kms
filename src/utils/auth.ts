import { AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase/client'

export function handleAuthError(error: AuthError) {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password'
    case 'Email not confirmed':
      return 'Please check your email and confirm your account'
    case 'User already registered':
      return 'An account with this email already exists'
    case 'Password should be at least 6 characters':
      return 'Password must be at least 6 characters long'
    case 'Unable to validate email address: invalid format':
      return 'Please enter a valid email address'
    default:
      return 'An error occurred during authentication'
  }
}

export async function signOut() {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Error signing out:', error.message)
      // Even if there's an error, we should still redirect to login
    }
    
    // Clear any local storage or session storage
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
      
      // Clear any cached data or state
      // You might want to clear specific keys instead of everything
      // localStorage.removeItem('user-preferences')
      // sessionStorage.removeItem('temp-data')
    }
    
    // Use window.location.href for a complete page reload and cache clear
    // This ensures the browser doesn't cache the protected page
    window.location.href = '/login'
    
  } catch (error) {
    console.error('Sign out failed:', error)
    // Fallback: redirect to login even if logout fails
    window.location.href = '/login'
  }
}

export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession()
  if (error) {
    console.error('Error refreshing session:', error.message)
  }
  return { data, error }
}

// Utility function to check if user is authenticated
export async function isAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

// Utility function to get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
} 
