import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, AuthState } from './types'

interface AuthStore extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, _get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  signIn: async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

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
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

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
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

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
      const {
        data: { session },
      } = (await supabase?.auth.getSession()) || { data: { session: null } }

      set({
        user: (session?.user as User) || null,
        isAuthenticated: !!session?.user,
        isLoading: false,
      })

      supabase?.auth.onAuthStateChange((_event, session) => {
        set({
          user: (session?.user as User) || null,
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
