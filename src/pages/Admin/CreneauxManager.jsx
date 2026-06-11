import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCreneauxEntre,
  ouvrirCreneau,
  fermerCreneau,
  ajouterCreneauxBulk,
} from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import styles from './CreneauxManager.module.css'

const HEURES = []
for (let h = 9; h < 20; h++) {
  HEURES.push([h, 0])
  HEURES.push([h, 30])
}

// options de créneau horaire pour les selects (9:00 → 20:00)
const OPTIONS_H = []
for (let m = 9 * 60; m <= 20 * 60; m += 30) {
  OPTIONS_H.push(m)
}
const fmtMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const JOURS = [
  { i: 1, l: 'Lun' },
  { i: 2, l: 'Mar' },
  { i: 3, l: 'Mer' },
  { i: 4, l: 'Jeu' },
  { i: 5, l: 'Ven' },
  { i: 6, l: 'Sam' },
  { i: 0, l: 'Dim' },
]

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
  const toast = useToast()
  const [mode, setMode] = useState('jour') // 'jour' | 'semaine'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <h2 className={styles.titre}>Gérer mes créneaux</h2>
          <button className={styles.fermer} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'jour' ? styles.tabOn : ''}`}
            onClick={() => setMode('jour')}
          >
            Jour par jour
          </button>
          <button
            className={`${styles.tab} ${mode === 'semaine' ? styles.tabOn : ''}`}
            onClick={() => setMode('semaine')}
          >
            Semaine-type
          </button>
        </div>

        {mode === 'jour' ? <ModeJour toast={toast} /> : <ModeSemaine toast={toast} />}
      </div>
    </div>
  )
}

// ════════════ Mode jour par jour ════════════
function ModeJour({ toast }) {
  const jours = useMemo(() => joursAvenir(14), [])
  const [jourSel, setJourSel] = useState(jours[0])
  const [creneaux, setCreneaux] = useState([])
  const [busy, setBusy] = useState(null)

  const charger = useCallback(async () => {
    const debut = new Date(jourSel)
    const fin = new Date(jourSel)
    fin.setDate(fin.getDate() + 1)
    try {
      setCreneaux(await getCreneauxEntre(debut.toISOString(), fin.toISOString()))
    } catch (e) {
      toast(e.message, 'error')
    }
  }, [jourSel, toast])

  useEffect(() => {
    charger()
  }, [charger])

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
    setBusy(cle)
    try {
      if (existant) {
        if (existant.statut !== 'ouvert') {
          toast('Créneau réservé, impossible de le fermer ici.', 'error')
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
      toast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  // congé : ferme tous les créneaux ouverts du jour (les réservés sont gardés)
  const ouverts = creneaux.filter((c) => c.statut === 'ouvert')
  const reserves = creneaux.length - ouverts.length
  const fermerJournee = async () => {
    if (!ouverts.length) return
    setBusy('jour')
    try {
      for (const c of ouverts) await fermerCreneau(c.id)
      await charger()
      toast(
        reserves > 0
          ? `Journée fermée (${reserves} RDV déjà pris conservés)`
          : 'Journée fermée — bon congé ✂️'
      )
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <p className={styles.aide}>Touche un horaire pour l’ouvrir (or) ou le refermer.</p>
      <div className={styles.jours}>
        {jours.map((j) => {
          const actif = j.toDateString() === jourSel.toDateString()
          return (
            <button
              key={j.toISOString()}
              className={`${styles.jour} ${actif ? styles.jourActif : ''}`}
              onClick={() => setJourSel(j)}
            >
              <span className={styles.jourNom}>{j.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
              <span className={styles.jourNum}>{j.getDate()}</span>
            </button>
          )
        })}
      </div>
      <div className={styles.grille}>
        {HEURES.map(([h, m]) => {
          const cle = `${h}:${m}`
          const c = parHeure.get(cle)
          const ouvert = c?.statut === 'ouvert'
          const reserve = c && c.statut !== 'ouvert'
          return (
            <button
              key={cle}
              disabled={busy === cle || reserve}
              onClick={() => toggle(h, m)}
              className={`${styles.slot} ${ouvert ? styles.slotOuvert : ''} ${reserve ? styles.slotReserve : ''}`}
            >
              {fmtMin(h * 60 + m)}
              {reserve && <span className={styles.cadenas}>pris</span>}
            </button>
          )
        })}
      </div>

      {ouverts.length > 0 && (
        <button className={styles.conge} disabled={busy === 'jour'} onClick={fermerJournee}>
          {busy === 'jour' ? 'Fermeture…' : `Fermer toute la journée (congé) · ${ouverts.length}`}
        </button>
      )}
    </>
  )
}

// ════════════ Mode semaine-type ════════════
function ModeSemaine({ toast }) {
  const [sel, setSel] = useState([2, 4]) // mardi, jeudi par défaut
  const [from, setFrom] = useState(10 * 60)
  const [to, setTo] = useState(19 * 60)
  const [semaines, setSemaines] = useState(4)
  const [busy, setBusy] = useState(false)

  const toggleJour = (i) =>
    setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))

  const appliquer = async () => {
    if (!sel.length) return toast('Choisis au moins un jour.', 'error')
    if (to <= from) return toast('L’heure de fin doit être après le début.', 'error')
    setBusy(true)
    try {
      const base = new Date()
      base.setHours(0, 0, 0, 0)
      const now = Date.now()
      const fin = new Date(base)
      fin.setDate(base.getDate() + semaines * 7)

      // créneaux existants pour ne pas créer de doublons
      const existants = await getCreneauxEntre(base.toISOString(), fin.toISOString())
      const dejaLa = new Set(
        existants.map((c) => new Date(c.datetime_debut).toISOString().slice(0, 16))
      )

      const debuts = []
      for (let i = 0; i < semaines * 7; i++) {
        const d = new Date(base)
        d.setDate(base.getDate() + i)
        if (!sel.includes(d.getDay())) continue
        for (let m = from; m < to; m += 30) {
          const slot = new Date(d)
          slot.setHours(0, m, 0, 0)
          if (slot.getTime() <= now) continue
          if (dejaLa.has(slot.toISOString().slice(0, 16))) continue
          debuts.push(slot)
        }
      }

      const n = await ajouterCreneauxBulk(debuts)
      toast(n > 0 ? `${n} créneaux ouverts ✓` : 'Aucun nouveau créneau à ouvrir')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const nbApercu = sel.length * Math.max(0, Math.round((to - from) / 30)) * semaines

  return (
    <>
      <p className={styles.aide}>
        Ouvre une semaine-type en un clic : choisis les jours, l’horaire, et le nombre de semaines.
      </p>

      <span className={styles.lbl}>Jours</span>
      <div className={styles.joursSemaine}>
        {JOURS.map((j) => (
          <button
            key={j.i}
            className={`${styles.jourChip} ${sel.includes(j.i) ? styles.jourChipOn : ''}`}
            onClick={() => toggleJour(j.i)}
          >
            {j.l}
          </button>
        ))}
      </div>

      <div className={styles.plage}>
        <label className={styles.champ}>
          <span className={styles.lbl}>De</span>
          <select value={from} onChange={(e) => setFrom(Number(e.target.value))}>
            {OPTIONS_H.map((m) => (
              <option key={m} value={m}>{fmtMin(m)}</option>
            ))}
          </select>
        </label>
        <label className={styles.champ}>
          <span className={styles.lbl}>À</span>
          <select value={to} onChange={(e) => setTo(Number(e.target.value))}>
            {OPTIONS_H.map((m) => (
              <option key={m} value={m}>{fmtMin(m)}</option>
            ))}
          </select>
        </label>
        <label className={styles.champ}>
          <span className={styles.lbl}>Semaines</span>
          <select value={semaines} onChange={(e) => setSemaines(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
      </div>

      <p className={styles.apercu}>≈ {nbApercu} créneaux de 30 min seront proposés.</p>

      <button className={styles.appliquer} disabled={busy} onClick={appliquer}>
        {busy ? 'Ouverture…' : 'Ouvrir ces créneaux'}
      </button>
    </>
  )
}
