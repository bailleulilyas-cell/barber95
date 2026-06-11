import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCreneauxOuverts, reserverManuel } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import styles from './ReservationManuelle.module.css'

// Adam pose un RDV pour un client qui appelle ou passe en boutique
// (pas de compte Google). Il choisit un créneau ouvert + saisit le nom.

const JOURS_COURT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function heure(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function ReservationManuelle({ onClose }) {
  const toast = useToast()
  const [creneaux, setCreneaux] = useState([])
  const [loading, setLoading] = useState(true)
  const [nom, setNom] = useState('')
  const [choisi, setChoisi] = useState(null)
  const [busy, setBusy] = useState(false)

  const charger = useCallback(async () => {
    try {
      setCreneaux(await getCreneauxOuverts())
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    charger()
  }, [charger])

  // regroupe les créneaux ouverts par jour
  const jours = useMemo(() => {
    const map = new Map()
    creneaux.forEach((c) => {
      const cle = c.datetime_debut.slice(0, 10)
      if (!map.has(cle)) map.set(cle, [])
      map.get(cle).push(c)
    })
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [creneaux])

  const valider = async () => {
    if (!choisi || !nom.trim()) return
    setBusy(true)
    try {
      await reserverManuel(choisi.id, nom.trim())
      toast(`RDV ajouté pour ${nom.trim()} ✓`)
      onClose()
    } catch (e) {
      toast(/indisponible/i.test(e.message) ? 'Ce créneau vient d’être pris.' : e.message, 'error')
      setBusy(false)
      charger()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <h2 className={styles.titre}>Ajouter un RDV manuel</h2>
          <button className={styles.fermer} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <label className={styles.champ}>
          <span className={styles.lbl}>Nom du client</span>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex. Mehdi"
            autoFocus
          />
        </label>

        <span className={styles.lbl}>Créneau</span>
        {loading ? (
          <p className={styles.aide}>Chargement…</p>
        ) : jours.length === 0 ? (
          <p className={styles.aide}>
            Aucun créneau ouvert. Ouvre des créneaux d’abord (« Gérer mes créneaux »).
          </p>
        ) : (
          <div className={styles.creneaux}>
            {jours.map(([cle, slots]) => {
              const d = new Date(cle + 'T12:00:00')
              return (
                <div key={cle} className={styles.jourBloc}>
                  <span className={styles.jourLbl}>
                    {JOURS_COURT[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}
                  </span>
                  <div className={styles.slots}>
                    {slots.map((s) => (
                      <button
                        key={s.id}
                        className={`${styles.slot} ${choisi?.id === s.id ? styles.slotSel : ''}`}
                        onClick={() => setChoisi(s)}
                      >
                        {heure(s.datetime_debut)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button
          className={styles.valider}
          disabled={busy || !choisi || !nom.trim()}
          onClick={valider}
        >
          {busy ? 'Ajout…' : 'Ajouter le RDV'}
        </button>
      </div>
    </div>
  )
}
