import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoginScreen from './LoginScreen'
import styles from './Auth.module.css'

function Loader() {
  return <div className={styles.loader}>Chargement…</div>
}

// /reserver : connexion + profil complété obligatoires.
// En mode démo (Supabase non configuré), laisse passer.
export function RequireProfile({ children }) {
  const { configured, loading, session, profileComplete } = useAuth()
  const loc = useLocation()
  if (!configured) return children
  if (loading) return <Loader />
  if (!session)
    return (
      <LoginScreen
        titre="Réserver"
        txt="Connecte-toi avec Google pour prendre rendez-vous."
      />
    )
  if (!profileComplete)
    return <Navigate to={`/profil?next=${encodeURIComponent(loc.pathname)}`} replace />
  return children
}

// /admin : rôle admin vérifié (RLS côté serveur en complément).
export function RequireAdmin({ children }) {
  const { configured, loading, session, isAdmin } = useAuth()
  if (!configured) return children // démo locale : bandeau d'avertissement dans la page
  if (loading) return <Loader />
  if (!session || !isAdmin) return <Navigate to="/" replace />
  return children
}
