import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCreneauxEntre, ouvrirCreneau, fermerCreneau } from '../../lib/api'
import styles from './CreneauxManager.module.css'

// Horaires proposés à l'ouverture (créneaux de 30 min).
const HEURES = []
for (let h = 9; h < 20; h++) {
  HEURES.push([h, 0])
  HEURES.push([h, 30])
}

function joursAvenir(n) {
  const out = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    out.push(d)
  }
  return out
}

export default function CreneauxManager({ onClose }) {
  const jours = useMemo(() => joursAvenir(14), [])
  const [jourSel, setJourSel] = useState(jours[0])
  const [creneaux, setCreneaux] = useState([])
  const [busy, setBusy] = useState(null) // clé du slot en cours
  const [err, setErr] = useState(null)

  const charger = useCallback(async () => {
    const debut = new Date(jourSel)
    const fin = new Date(jourSel)
    fin.setDate(fin.getDate() + 1)
    try {
      const data = await getCreneauxEntre(debut.toISOString(), fin.toISOString())
      setCreneaux(data)
    } catch (e) {
      setErr(e.message)
    }
  }, [jourSel])

  useEffect(() => {
    charger()
  }, [charger])

  // map heure -> créneau existant
  const parHeure = useMemo(() => {
    const m = new Map()
    creneaux.forEach((c) => {
      const d = new Date(c.datetime_debut)
      m.set(`${d.getHours()}:${d.getMinutes()}`, c)
    })
    return m
  }, [creneaux])

  const toggle = async (h, m) => {
    const cle = `${h}:${m}`
    const existant = parHeure.get(cle)
    setErr(null)
    setBusy(cle)
    try {
      if (existant) {
        if (existant.statut !== 'ouvert') {
          setErr('Ce créneau est réservé, impossible de le fermer ici.')
        } else {
          await fermerCreneau(existant.id)
        }
      } else {
        const d = new Date(jourSel)
        d.setHours(h, m, 0, 0)
        await ouvrirCreneau(d)
      }
      await charger()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <h2 className={styles.titre}>Gérer mes créneaux</h2>
          <button className={styles.fermer} onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <p className={styles.aide}>
          Touche un horaire pour l’ouvrir (kaki) ou le refermer. Les créneaux réservés sont
          verrouillés.
        </p>

        {/* sélecteur de jour */}
        <div className={styles.jours}>
          {jours.map((j) => {
            const actif = j.toDateString() === jourSel.toDateString()
            return (
              <button
                key={j.toISOString()}
                className={`${styles.jour} ${actif ? styles.jourActif : ''}`}
                onClick={() => setJourSel(j)}
              >
                <span className={styles.jourNom}>
                  {j.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </span>
                <span className={styles.jourNum}>{j.getDate()}</span>
              </button>
            )
          })}
        </div>

        {err && <p className={styles.err}>{err}</p>}

        {/* grille d'horaires */}
        <div className={styles.grille}>
          {HEURES.map(([h, m]) => {
            const cle = `${h}:${m}`
            const c = parHeure.get(cle)
            const ouvert = c?.statut === 'ouvert'
            const reserve = c && c.statut !== 'ouvert'
            const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
            return (
              <button
                key={cle}
                disabled={busy === cle || reserve}
                onClick={() => toggle(h, m)}
                className={`${styles.slot} ${ouvert ? styles.slotOuvert : ''} ${
                  reserve ? styles.slotReserve : ''
                }`}
              >
                {label}
                {reserve && <span className={styles.cadenas}>réservé</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
