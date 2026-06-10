import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Quand Adam ouvre l'app, il atterrit sur son dashboard :
// mobile → /admin/jour (carte plein écran), desktop → /admin/dashboard.
// Une seule fois par session, pour ne pas l'empêcher de naviguer sur le site
// (l'onglet « Site » de sa barre admin doit rester utilisable).
export default function AdminLanding() {
  const { configured, loading, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!configured || loading || !isAdmin) return
    if (pathname !== '/' && pathname !== '/mon-espace') return
    let deja = false
    try {
      deja = sessionStorage.getItem('b95_admin_landed') === '1'
    } catch {}
    if (deja) return
    try {
      sessionStorage.setItem('b95_admin_landed', '1')
    } catch {}
    const mobile = window.matchMedia('(max-width: 768px)').matches
    navigate(mobile ? '/admin/jour' : '/admin/dashboard', { replace: true })
  }, [configured, loading, isAdmin, pathname, navigate])

  return null
}
