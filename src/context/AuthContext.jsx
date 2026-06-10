import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, configured } from '../lib/supabase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // ligne `clients`
  const [loading, setLoading] = useState(configured)

  const chargerProfil = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    if (!configured) return
    let actif = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!actif) return
      setSession(data.session)
      await chargerProfil(data.session?.user?.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      chargerProfil(s?.user?.id)
    })

    return () => {
      actif = false
      sub.subscription.unsubscribe()
    }
  }, [chargerProfil])

  // garde l'avatar Google à jour dans `clients` (affiché sur les fiches admin)
  useEffect(() => {
    if (!configured) return
    const meta = session?.user?.user_metadata
    const avatar = meta?.avatar_url || meta?.picture || null
    if (!avatar || !profile || profile.avatar_url === avatar) return
    supabase
      .from('clients')
      .update({ avatar_url: avatar })
      .eq('id', session.user.id)
      .then(({ error }) => {
        // colonne absente (migration 0009 pas lancée) → on ignore
        if (!error) setProfile((p) => (p ? { ...p, avatar_url: avatar } : p))
      })
  }, [session, profile])

  const signInWithGoogle = useCallback(async (redirectPath = '/mon-espace') => {
    if (!configured) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + redirectPath },
    })
  }, [])

  const signOut = useCallback(async () => {
    if (!configured) return
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(
    () => chargerProfil(session?.user?.id),
    [chargerProfil, session]
  )

  const profileComplete = Boolean(profile?.prenom && profile?.tel)
  const isAdmin = profile?.role === 'admin'

  const value = {
    configured,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    profileComplete,
    isAdmin,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
