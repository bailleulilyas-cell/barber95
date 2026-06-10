import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getResasDuJour, onTableChange } from '../../lib/api'
import { rdvDuJour, revenuEstime } from '../../lib/stats'
import { prixResa } from '../../lib/tarif'
import styles from './Jour.module.css'

// « Ma journée en un swipe » — premier écran d'Adam sur mobile.
// Carte plein écran : prochain RDV en gros, les suivants en petit.
// Swipe ↑ : détails de la journée. Swipe ↓ : retour.

function heure(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const SWIPE_MIN = 56 // px de glissement vertical pour déclencher

export default function Jour() {
  const navigate = useNavigate()
  const { configured } = useAuth()
  const [resas, setResas] = useState([])
  const [loading, setLoading] = useState(configured)
  const [details, setDetails] = useState(false)
  const touche = useRef(null)
  const listeRef = useRef(null)

  const charger = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      return
    }
    try {
      setResas(rdvDuJour(await getResasDuJour()))
    } catch {
      // silencieux : l'écran reste utilisable, le dashboard complet a les erreurs
    } finally {
      setLoading(false)
    }
  }, [configured])

  useEffect(() => {
    charger()
  }, [charger])

  useEffect(() => {
    if (!configured) return
    let t
    const off = onTableChange('reservations', () => {
      clearTimeout(t)
      t = setTimeout(charger, 300)
    })
    return () => {
      clearTimeout(t)
      off()
    }
  }, [charger])

  // ── gestes ──
  const onTouchStart = (e) => {
    touche.current = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    if (touche.current == null) return
    const delta = touche.current - e.changedTouches[0].clientY
    touche.current = null
    if (delta > SWIPE_MIN && !details) setDetails(true) // swipe vers le haut
    if (delta < -SWIPE_MIN && details) {
      // swipe vers le bas : on ne sort pas si l'utilisateur fait juste
      // défiler la liste des détails (sauf si elle est déjà tout en haut)
      const liste = listeRef.current
      if (!liste || liste.scrollTop <= 0 || !liste.contains(e.target)) setDetails(false)
    }
  }

  const maintenant = Date.now()
  // prochain = en cours ou à venir (fin du créneau pas encore passée)
  const prochain = resas.find((r) => {
    const fin = r.creneaux.datetime_fin
      ? new Date(r.creneaux.datetime_fin).getTime()
      : new Date(r.creneaux.datetime_debut).getTime() + 30 * 60000
    return fin > maintenant
  })
  const suivants = prochain ? resas.slice(resas.indexOf(prochain) + 1) : []

  return (
    <div className={styles.ecran} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* ── face 1 : prochain RDV ── */}
      <section className={`${styles.face} ${details ? styles.faceHaut : ''}`}>
        <span className={styles.date}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>

        {loading ? (
          <div className={styles.centre}>
            <span className={styles.attente}>…</span>
          </div>
        ) : prochain ? (
          <div className={styles.centre}>
            <span className={styles.lblProchain}>Prochain RDV</span>
            <span className={styles.grandeHeure}>{heure(prochain.creneaux.datetime_debut)}</span>
            <span className={styles.grandNom}>{prochain.clients?.prenom || 'Client'}</span>
            {prochain.prestations?.nom && (
              <span className={styles.style}>{prochain.prestations.nom}</span>
            )}
          </div>
        ) : (
          <div className={styles.centre}>
            <span className={styles.grandNom}>
              {resas.length === 0 ? 'Aucun RDV aujourd’hui' : 'C’est fini pour aujourd’hui'}
            </span>
            <span className={styles.style}>
              {resas.length === 0 ? 'Journée libre ✂️' : `${resas.length} coupe${resas.length > 1 ? 's' : ''} au compteur`}
            </span>
          </div>
        )}

        {suivants.length > 0 && (
          <div className={styles.suivants}>
            {suivants.slice(0, 3).map((r) => (
              <span key={r.id} className={styles.suivant}>
                {heure(r.creneaux.datetime_debut)} · {r.clients?.prenom || 'Client'}
              </span>
            ))}
            {suivants.length > 3 && (
              <span className={styles.suivant}>+ {suivants.length - 3} autres</span>
            )}
          </div>
        )}

        <button className={styles.indice} onClick={() => setDetails(true)}>
          <span className={styles.chevron}>⌃</span>
          Swipe pour les détails
        </button>
      </section>

      {/* ── face 2 : détails de la journée ── */}
      <section className={`${styles.face} ${styles.faceDetails} ${details ? '' : styles.faceBas}`}>
        <button className={styles.indiceHaut} onClick={() => setDetails(false)}>
          <span className={styles.chevronBas}>⌃</span>
          Retour
        </button>

        <h2 className={styles.detailsTitre}>Ma journée</h2>
        {resas.length === 0 ? (
          <p className={styles.detailsVide}>Rien au planning.</p>
        ) : (
          <div className={styles.detailsListe} ref={listeRef}>
            {resas.map((r) => (
              <div key={r.id} className={styles.dResa}>
                <span className={styles.dHeure}>{heure(r.creneaux.datetime_debut)}</span>
                <div className={styles.dInfo}>
                  <span className={styles.dNom}>{r.clients?.prenom || 'Client'}</span>
                  {r.prestations?.nom && <span className={styles.dStyle}>{r.prestations.nom}</span>}
                </div>
                {r.clients?.tel && (
                  <a className={styles.dTel} href={`tel:${r.clients.tel}`} onTouchStart={(e) => e.stopPropagation()}>
                    📞
                  </a>
                )}
                <span className={styles.dPrix}>{prixResa(r)}€</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.dRevenu}>
          <span>Revenu estimé</span>
          <span className={styles.dRevenuNum}>{revenuEstime(resas)}€</span>
        </div>

        <button className={styles.lienDash} onClick={() => navigate('/admin/dashboard')}>
          Dashboard complet →
        </button>
      </section>
    </div>
  )
}
