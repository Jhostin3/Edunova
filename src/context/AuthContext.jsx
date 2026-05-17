import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './authContext'
import { supabase, isSupabaseConfigured } from '../services/supabaseClient'
import {
  fetchProfileWithRole,
  signOut as authServiceSignOut,
} from '../services/authService'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const applySession = useCallback(async (nextSession) => {
    try {
      const u = nextSession?.user ?? null
      setSession(nextSession ?? null)
      setUser(u)

      if (!u) {
        setProfile(null)
        setRole(null)
        return { profile: null, role: null, error: null }
      }

      const { profile: p, error } = await fetchProfileWithRole(u.id)
      if (error) {
        console.error('[auth] applySession:profile_error', error)
        setProfile(null)
        setRole(null)
        return { profile: null, role: null, error }
      }

      const r = p?.rol ?? null
      setProfile(p)
      setRole(r)
      return { profile: p, role: r, error: null }
    } catch (error) {
      console.error('[auth] applySession:unexpected_error', error)
      setSession(nextSession ?? null)
      setUser(nextSession?.user ?? null)
      setProfile(null)
      setRole(null)
      return {
        profile: null,
        role: null,
        error:
          error instanceof Error ? error : new Error('Error al cargar sesion'),
      }
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!supabase) {
      return { profile: null, role: null, error: null }
    }
    const {
      data: { session: s },
    } = await supabase.auth.getSession()
    return applySession(s)
  }, [applySession])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let cancelled = false

    const init = async () => {
      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession()
        if (cancelled) return
        await applySession(s)
      } catch (error) {
        console.error('[auth] init:error', error)
        if (!cancelled) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setRole(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        try {
          if (!cancelled) setLoading(true)
          await applySession(nextSession)
        } catch (error) {
          console.error('[auth] onAuthStateChange:error', error)
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [applySession])

  const signOut = useCallback(async () => {
    await authServiceSignOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setRole(null)
  }, [])

  const value = {
    user,
    session,
    profile,
    role,
    loading,
    signOut,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
