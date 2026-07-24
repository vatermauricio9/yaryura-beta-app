import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type UserRole = 'tenant' | 'staff'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const profileRef = useRef<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        (async () => {
          await fetchProfile(data.session!.user.id)
        })()
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        (async () => {
          await fetchProfile(newSession.user.id)
        })()
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
    } else {
      const p = data as Profile | null
      profileRef.current = p
      setProfile(p)
    }
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    profileRef.current = null
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = typeof error.message === 'string' && error.message
        ? error.message
        : 'Credenciales incorrectas. Verificá tu email y contraseña.'
      return { error: msg }
    }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    profileRef.current = null
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
