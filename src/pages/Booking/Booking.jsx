import { useCallback, useEffect, useMemo, useState } from 'react'
import Reveal from '../../components/Reveal/Reveal'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import { Footer } from '../../components/Layout'
import { CRENEAUX } from '../../data/mock'
import { PRESTATIONS } from '../../config'
import { useAuth } from '../../context/AuthContext'
import {
  getCreneauxOuverts,
  getPrestation,
  reserverCreneau,
  confirmerReservation,
  notifier,
} from '../../lib/api'
import { googleCalUrl, icsDataUri } from '../../lib/calendar'
import styles from './Booking.module.css'

function libelleJour(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
function heure(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function Booking() {
  const { configured, profile } = useAuth()
  const [choisi, setChoisi] = useState(null)
  const [form, setForm] = useState({ prenom: '', tel: '' })
  const [confirme, setConfirme] = useState(false)

  // données
  const [creneaux, setCreneaux] = useState(configured ? [] : CRENEAUX)
  const [presta, setPresta] = useState(PRESTATIONS[0])
  const [loading, setLoading] = useState(configured)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const connecte = configured && profile

  // pré-remplit depuis le profil connecté
  useEffect(() => {
    if (profile) setForm({ prenom: profile.prenom || '', tel: profile.tel || '' })
  }, [profile])

  const charger = useCallback(async () => {
    if (!configured) return
    try {
      setErr(null)
      const [c, p] = await Promise.all([getCreneauxOuverts(), getPrestation()])
      setCreneaux(c)
      if (p) setPresta(p)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [configured])

  useEffect(() => {
    charger()
  }, [charger])

  // regroupe les créneaux par jour
  const jours = useMemo(() => {
    const map = new Map()
    creneaux.forEach((c) => {
      const cle = c.datetime_debut.slice(0, 10)
      if (!map.has(cle)) map.set(cle, [])
      map.get(cle).push(c)
    })
    return [...map.entries()].map(([cle, slots]) => ({
      cle,
      titre: libelleJour(slots[0].datetime_debut),
      slots: slots.sort((a, b) => a.datetime_debut.localeCompare(b.datetime_debut)),
    }))
  }, [creneaux])

  const valider = async (e) => {
    e.preventDefault()
    setErr(null)
    if (!configured) {
      // mode démo : confirmation simulée
      setConfirme(true)
      return
    }
    setBusy(true)
    try {
      const resaId = await reserverCreneau(choisi.id, presta.id)
      await confirmerReservation(resaId)
      notifier('confirmation', resaId) // email best-effort (client + Adam)
      setConfirme(true)
    } catch (e2) {
      // message lisible pour les cas courants
      const msg = /indisponible/i.test(e2.message)
        ? 'Ce créneau vient d’être pris. Choisis-en un autre.'
        : /profil incomplet/i.test(e2.message)
          ? 'Complète ton profil avant de réserver.'
          : e2.message
      setErr(msg)
      setChoisi(null)
      await charger() // rafraîchit les dispos
    } finally {
      setBusy(false)
    }
  }

  if (confirme) {
    return (
      <main className="page">
        <div className="wrap">
          <Reveal className={styles.success}>
            <span className="eyebrow">C’est noté</span>
            <h1 className={styles.titre}>Rendez-vous confirmé</h1>
            <p className={styles.successTxt}>
              {form.prenom || 'À très vite'}, ta <strong>{presta.nom.toLowerCase()}</strong> est
              réservée le <strong>{libelleJour(choisi.datetime_debut)}</strong> à{' '}
              <strong>{heure(choisi.datetime_debut)}</strong>.
            </p>
            <p className={styles.note}>
              Retrouve ce rendez-vous dans « Mon espace », où tu pourras l’annuler jusqu’à 2h avant.
            </p>
            <div className={styles.calLinks}>
              <a
                href={googleCalUrl(
                  choisi.datetime_debut,
                  choisi.datetime_fin || new Date(new Date(choisi.datetime_debut).getTime() + 30 * 60000)
                )}
                target="_blank"
                rel="noreferrer"
                className={styles.calLink}
              >
                + Google Agenda
              </a>
              <a
                href={icsDataUri(
                  choisi.datetime_debut,
                  choisi.datetime_fin || new Date(new Date(choisi.datetime_debut).getTime() + 30 * 60000)
                )}
                download="rdv-barber95.ics"
                className={styles.calLink}
              >
                + Apple / .ics
              </a>
            </div>
            <div className={styles.actions}>
              <MagneticButton
                variant="ghost"
                onClick={() => {
                  setConfirme(false)
                  setChoisi(null)
                  charger()
                }}
              >
                Nouveau créneau
              </MagneticButton>
            </div>
          </Reveal>
          <Footer />
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">Prendre rendez-vous</span>
          <h1 className={styles.titre}>Réserver</h1>
          <p className={styles.intro}>
            {presta.nom} · {presta.duree_minutes} min ·{' '}
            <span className={styles.prix}>{presta.prix}€</span>
          </p>
        </Reveal>

        {err && <p className={styles.erreur}>{err}</p>}

        {loading ? (
          <p className={styles.etat}>Chargement des créneaux…</p>
        ) : jours.length === 0 ? (
          <p className={styles.etat}>
            Aucun créneau ouvert pour le moment. Adam ouvre ses disponibilités chaque semaine —
            reviens bientôt.
          </p>
        ) : (
          <>
            <Reveal delay={80}>
              <div className={styles.legendeDispo}>
                <span>
                  <i className={styles.pastilleOk} /> disponible
                </span>
                <span>
                  <i className={styles.pastilleOff} /> pris
                </span>
              </div>
            </Reveal>

            <div className={styles.calendrier}>
              {jours.map((j, ji) => (
                <Reveal key={j.cle} delay={ji * 70} className={styles.jour}>
                  <h2 className={styles.jourTitre}>{j.titre}</h2>
                  <div className={styles.slots}>
                    {j.slots.map((c) => {
                      const dispo = c.statut === 'ouvert'
                      const sel = choisi?.id === c.id
                      return (
                        <button
                          key={c.id}
                          className={`${styles.slot} ${dispo ? styles.slotOk : styles.slotOff} ${
                            sel ? styles.slotSel : ''
                          }`}
                          disabled={!dispo}
                          onClick={() => setChoisi(c)}
                        >
                          {heure(c.datetime_debut)}
                        </button>
                      )
                    })}
                  </div>
                </Reveal>
              ))}
            </div>
          </>
        )}

        {/* formulaire sous le calendrier */}
        {choisi && (
          <form className={styles.form} onSubmit={valider}>
            <div className={styles.formHead}>
              <span className="eyebrow">Créneau choisi</span>
              <p className={styles.choisiTxt}>
                {libelleJour(choisi.datetime_debut)} · {heure(choisi.datetime_debut)}
              </p>
            </div>
            {connecte ? (
              <div className={styles.recap}>
                <span className={styles.recapLabel}>Au nom de</span>
                <p className={styles.recapInfo}>
                  {form.prenom}
                  {form.tel ? <span className={styles.recapTel}> · {form.tel}</span> : null}
                </p>
              </div>
            ) : (
              <div className={styles.champs}>
                <label className={styles.champ}>
                  <span>Prénom</span>
                  <input
                    type="text"
                    required
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    placeholder="Ton prénom"
                  />
                </label>
                <label className={styles.champ}>
                  <span>Téléphone</span>
                  <input
                    type="tel"
                    required
                    value={form.tel}
                    onChange={(e) => setForm({ ...form, tel: e.target.value })}
                    placeholder="06 ..."
                  />
                </label>
              </div>
            )}
            <MagneticButton type="submit" disabled={busy}>
              {busy ? 'Réservation…' : 'Confirmer le rendez-vous'}
            </MagneticButton>
          </form>
        )}

        <Footer />
      </div>
    </main>
  )
}
