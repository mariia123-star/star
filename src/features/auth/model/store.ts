import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, AuthState } from './types'

interface AuthStore extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    set({
      user: data.user as User,
      isAuthenticated: true,
      isLoading: false,
    })
  },

  signUp: async (email: string, password: string, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    if (error) throw error

    set({
      user: data.user as User,
      isAuthenticated: !!data.user,
      isLoading: false,
    })
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    
    if (error) throw error

    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      set({
        user: session?.user as User || null,
        isAuthenticated: !!session?.user,
        isLoading: false,
      })

      supabase.auth.onAuthStateChange((event, session) => {
        set({
          user: session?.user as User || null,
          isAuthenticated: !!session?.user,
          isLoading: false,
        })
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },
}))