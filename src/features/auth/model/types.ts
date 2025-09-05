export interface User {
  id: string
  email: string
  user_metadata?: {
    first_name?: string
    last_name?: string
    avatar_url?: string
  }
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  firstName?: string
  lastName?: string
}