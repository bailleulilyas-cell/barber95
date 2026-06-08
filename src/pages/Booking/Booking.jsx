import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import { IconClock, IconCheck } from '../../components/Icons'
import { CRENEAUX } from '../../data/mock'
import { PRESTATIONS } from '../../config'
import { configured } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  getCreneauxEntre,
  getPrestation,
  reserverCreneau,
  confirmerReservation,
  notifier,
  onTableChange,
} from '../../lib/api'
import { googleCalUrl, icsDataUri } from '../../lib/calendar'
import Confetti from '../../components/Confetti/Confetti'
import Skeleton from '../../components/Skeleton/Skeleton'
import styles from './Booking.module.css'

function celebrer() {
  try {
    navigator.vibrate?.([18, 40, 28])
  } catch {}
}

const JOURS_COURT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function heure(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function jourLong(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function Booking() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [presta, setPresta] = useState(PRESTATIONS[0])
  const [creneaux, setCreneaux] = useState([])
  const [jourSel, setJourSel] = useState(null)
  const [choisi, setChoisi] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [confirme, setConfirme] = useState(false)

  const charger = useCallback(async () => {
    setErr(null)
    if (!configured) {
      setCreneaux(CRENEAUX)
      setLoading(false)
      return
    }
    try {
      const debut = new Date()
      const fin = new Date()
      fin.setDate(fin.getDate() + 21)
      const [c, p] = await Promise.all([
        getCreneauxEntre(debut.toISOString(), fin.toISOString()),
        getPrestation(),
      ])
      setCreneaux(c)
      if (p) setPresta(p)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  // temps réel : un créneau pris/ouvert ailleurs se reflète ici en direct
  useEffect(() => {
    if (!configured) return
    let t
    const off = onTableChange('creneaux', () => {
      clearTimeout(t)
      t = setTimeout(charger, 300)
    })
    return () => {
      clearTimeout(t)
      off()
    }
  }, [charger])

  // jours ayant au moins un créneau, triés
  const jours = useMemo(() => {
    const map = new Map()
    creneaux.forEach((c) => {
      const cle = c.datetime_debut.slice(0, 10)
      if (!map.has(cle)) map.set(cle, [])
      map.get(cle).push(c)
    })
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cle, slots]) => ({ cle, slots: slots.sort((a, b) => a.datetime_debut.localeCompare(b.datetime_debut)) }))
  }, [creneaux])

  // sélectionne le 1er jour par défaut
  useEffect(() => {
    if (!jourSel && jours.length) setJourSel(jours[0].cle)
  }, [jours, jourSel])

  const slotsDuJour = useMemo(() => {
    const j = jours.find((x) => x.cle === jourSel)
    if (!j) return { matin: [], aprem: [] }
    const matin = j.slots.filter((s) => new Date(s.datetime_debut).getHours() < 13)
    const aprem = j.slots.filter((s) => new Date(s.datetime_debut).getHours() >= 13)
    return { matin, aprem }
  }, [jours, jourSel])

  const confirmer = async () => {
    setErr(null)
    if (!configured) {
      setConfirme(true)
      celebrer()
      return
    }
    setBusy(true)
    try {
      const resaId = await reserverCreneau(choisi.id, presta.id)
      await confirmerReservation(resaId)
      notifier('confirmation', resaId)
      setConfirme(true)
      celebrer()
    } catch (e) {
      setErr(/indisponible/i.test(e.message) ? 'Ce créneau vient d’être pris.' : e.message)
      setChoisi(null)
      await charger()
    } finally {
      setBusy(false)
    }
  }

  const fermerSheet = () => {
    setChoisi(null)
    setConfirme(false)
  }

  const finSlot = choisi
    ? choisi.datetime_fin || new Date(new Date(choisi.datetime_debut).getTime() + 30 * 60000)
    : null

  return (
    <main className="page">
      <div className="wrap">
        <header className={styles.head}>
          <h1 className="titrePage">Réserver</h1>
          <p className={styles.sub}>Choisis ta date et ton créneau</p>
        </header>

        {err && <p className={styles.erreur}>{err}</p>}

        {loading ? (
          <div>
            <div className={styles.dates}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} w={60} h={64} r={16} />
              ))}
            </div>
            <Skeleton w="35%" h={14} style={{ margin: '6px 0 14px' }} />
            <div className={styles.grilleSlots}>
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} h={46} r={12} />
              ))}
            </div>
          </div>
        ) : jours.length === 0 ? (
          <p className={styles.etat}>
            Aucun créneau ouvert pour le moment. Adam ouvre ses disponibilités chaque semaine —
            reviens bientôt.
          </p>
        ) : (
          <>
            {/* sélecteur de jour horizontal */}
            <div className={styles.dates}>
              {jours.map(({ cle }) => {
                const d = new Date(cle + 'T12:00:00')
                const actif = cle === jourSel
                return (
                  <button
                    key={cle}
                    className={`${styles.dateChip} ${actif ? styles.dateActif : ''}`}
                    onClick={() => {
                      setJourSel(cle)
                      setChoisi(null)
                    }}
                  >
                    <span className={styles.dateJ}>{JOURS_COURT[d.getDay()]}</span>
                    <span className={styles.dateN}>{d.getDate()}</span>
                  </button>
                )
              })}
            </div>

            {/* créneaux */}
            <Section titre="Matin" slots={slotsDuJour.matin} choisi={choisi} onPick={setChoisi} />
            <Section
              titre="Après-midi"
              slots={slotsDuJour.aprem}
              choisi={choisi}
              onPick={setChoisi}
            />
          </>
        )}
      </div>

      {/* bottom sheet glassmorphism */}
      {choisi && (
        <>
          {confirme && <Confetti />}
          <div className={styles.scrim} onClick={fermerSheet} />
          <div className={styles.sheet}>
            <div className={styles.sheetHead}>
              <h2 className={styles.sheetTitre}>{confirme ? 'C’est réservé !' : 'Récapitulatif'}</h2>
              <button className={styles.sheetClose} onClick={fermerSheet} aria-label="Fermer">
                ✕
              </button>
            </div>

            <div className={styles.recap}>
              <Ligne label="Date" valeur={jourLong(choisi.datetime_debut)} />
              <Ligne label="Heure" valeur={heure(choisi.datetime_debut)} or />
              <Ligne label="Prestation" valeur={presta.nom} />
              <Ligne label="Durée" valeur={`${presta.duree_minutes} min`} />
              {profile?.prenom && <Ligne label="Au nom de" valeur={profile.prenom} />}
              <div className={styles.total}>
                <span>Total</span>
                <span className={styles.totalPrix}>{presta.prix}€</span>
              </div>
            </div>

            {err && <p className={styles.erreur}>{err}</p>}

            {confirme ? (
              <>
                <div className={styles.okBtn}>
                  <IconCheck size={20} /> Rendez-vous confirmé
                </div>
                <div className={styles.calLinks}>
                  <a href={googleCalUrl(choisi.datetime_debut, finSlot)} target="_blank" rel="noreferrer">
                    + Google Agenda
                  </a>
                  <a href={icsDataUri(choisi.datetime_debut, finSlot)} download="rdv-barber95.ics">
                    + Apple / .ics
                  </a>
                </div>
                <MagneticButton className={styles.confirmBtn} variant="ghost" onClick={() => navigate('/mon-espace')}>
                  Voir mon rendez-vous
                </MagneticButton>
              </>
            ) : (
              <MagneticButton className={styles.confirmBtn} disabled={busy} onClick={confirmer}>
                {busy ? 'Réservation…' : 'Confirmer la réservation'}
              </MagneticButton>
            )}
          </div>
        </>
      )}
    </main>
  )
}

function Section({ titre, slots, choisi, onPick }) {
  if (!slots.length) return null
  return (
    <section className={styles.sectionSlots}>
      <h2 className={styles.sectionTitre}>
        <IconClock size={16} /> {titre}
      </h2>
      <div className={styles.grilleSlots}>
        {slots.map((s) => {
          const dispo = s.statut === 'ouvert'
          const sel = choisi?.id === s.id
          return (
            <button
              key={s.id}
              disabled={!dispo}
              onClick={() => onPick(s)}
              className={`${styles.slot} ${sel ? styles.slotSel : ''} ${
                !dispo ? styles.slotPris : ''
              }`}
            >
              {heure(s.datetime_debut)}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Ligne({ label, valeur, or }) {
  return (
    <div className={styles.ligne}>
      <span className={styles.ligneLabel}>{label}</span>
      <span className={`${styles.ligneVal} ${or ? styles.ligneOr : ''}`}>{valeur}</span>
    </div>
  )
}
