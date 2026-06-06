import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Reveal from '../../components/Reveal/Reveal'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import LoginScreen from '../../components/Auth/LoginScreen'
import { Footer } from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import {
  getReservationPourAvis,
  avisExistePour,
  creerAvis,
} from '../../lib/api'
import styles from './ReviewForm.module.css'

export default function ReviewForm() {
  const { configured, loading, session, user, profile } = useAuth()
  const [params] = useSearchParams()
  const reservationId = params.get('r')

  const [etat, setEtat] = useState('chargement') // chargement|prete|deja|introuvable|envoye
  const [resa, setResa] = useState(null)
  const [note, setNote] = useState(0)
  const [hover, setHover] = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const init = useCallback(async () => {
    if (!configured || !session || !reservationId) return
    try {
      const r = await getReservationPourAvis(reservationId)
      if (!r || r.statut !== 'terminee') {
        setEtat('introuvable')
        return
      }
      if (await avisExistePour(reservationId)) {
        setEtat('deja')
        return
      }
      setResa(r)
      setEtat('prete')
    } catch {
      setEtat('introuvable')
    }
  }, [configured, session, reservationId])

  useEffect(() => {
    init()
  }, [init])

  const envoyer = async (e) => {
    e.preventDefault()
    if (note < 1) {
      setErr('Choisis une note.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await creerAvis({
        clientId: user.id,
        reservationId,
        note,
        commentaire: commentaire.trim() || null,
        prenom: profile?.prenom || resa?.clients?.prenom || null,
      })
      setEtat('envoye')
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  // ── démo / non configuré ──
  if (!configured) {
    return (
      <main className="page">
        <div className="wrap">
          <h1 className={styles.titre}>Laisser un avis</h1>
          <p className={styles.txt}>Le dépôt d’avis nécessite la connexion (mode réel uniquement).</p>
          <Footer />
        </div>
      </main>
    )
  }

  if (loading) return <div className={styles.txt} style={{ padding: 80 }}>Chargement…</div>

  // pas connecté → connexion qui revient sur cette page
  if (!session) {
    const retour = `/avis/nouveau${reservationId ? `?r=${reservationId}` : ''}`
    return (
      <LoginScreen
        titre="Laisser un avis"
        txt="Connecte-toi pour confirmer que c’est bien toi, puis laisse ton avis."
        redirect={retour}
      />
    )
  }

  return (
    <main className="page">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">Ton retour</span>
          <h1 className={styles.titre}>
            {etat === 'envoye' ? 'Merci !' : 'Laisser un avis'}
          </h1>
        </Reveal>

        {etat === 'chargement' && <p className={styles.txt}>Chargement…</p>}

        {etat === 'introuvable' && (
          <p className={styles.txt}>
            Ce lien d’avis n’est pas valide ou la coupe n’est pas encore marquée terminée.
          </p>
        )}

        {etat === 'deja' && (
          <p className={styles.txt}>Tu as déjà laissé un avis pour cette coupe. Merci !</p>
        )}

        {etat === 'envoye' && (
          <p className={styles.txt}>
            Ton avis a été publié. Merci beaucoup, ça aide énormément BARBER95 ✂️
          </p>
        )}

        {etat === 'prete' && (
          <form className={styles.form} onSubmit={envoyer}>
            <div className={styles.etoiles}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`${styles.etoile} ${n <= (hover || note) ? styles.pleine : ''}`}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setNote(n)}
                  aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
            <label className={styles.champ}>
              <span>Commentaire (facultatif)</span>
              <textarea
                rows={4}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Dis-en plus si tu veux…"
              />
            </label>
            {err && <p className={styles.err}>{err}</p>}
            <MagneticButton type="submit" disabled={busy}>
              {busy ? 'Envoi…' : 'Publier mon avis'}
            </MagneticButton>
          </form>
        )}

        <Footer />
      </div>
    </main>
  )
}
