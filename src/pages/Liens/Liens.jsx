import { useEffect } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { codeValide, saveRefCode, saveSource } from '../../lib/referral'

// ── /book?source=… ──
// Lien de résa partageable d'Adam (WhatsApp, bio Insta…).
// Mémorise la source puis file vers la page Réserver.
export function BookLien() {
  const [params] = useSearchParams()
  const source = params.get('source')

  useEffect(() => {
    if (source) saveSource(source)
  }, [source])

  return <Navigate to="/reserver" replace />
}

// ── /ref/:code ──
// Lien de parrainage d'un client. Mémorise le code : il sera appliqué
// (+1 point au parrain) à la première réservation confirmée du filleul.
export function RefLien() {
  const { code } = useParams()
  const toast = useToast()
  const ok = codeValide(code)

  useEffect(() => {
    if (!ok) return
    saveRefCode(code)
    saveSource('parrainage')
    toast('Bienvenue ! Réserve ta première coupe ✂️')
  }, [ok, code, toast])

  return <Navigate to="/" replace />
}
