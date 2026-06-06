import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../../components/Reveal/Reveal'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import LoginScreen from '../../components/Auth/LoginScreen'
import Admin from '../Admin/Admin'
import { Footer } from '../../components/Layout'
import { CLIENT_MOCK } from '../../data/mock'
import { FIDELITE } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { getProchainRdv, getHistorique, annulerReservation, notifier } from '../../lib/api'
import styles from './Account.module.css'

export default function Account() {
  const { configured, loading, session, user, profile, profileComplete, isAdmin, signOut } =
    useAuth()
  const [rdv, setRdv] = useState(null)
  const [historique, setHistorique] = useState([])
  const [chargement, setChargement] = useState(configured)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [annuleDemo, setAnnuleDemo] = useState(false)

  const clientPret = configured && session && profileComplete && !isAdmin

  const charger = useCallback(async () => {
    if (!clientPret) return
    try {
      setErr(null)
      const [r, h] = await Promise.all([getProchainRdv(user.id), getHistorique(user.id)])
      setRdv(
        r
          ? { id: r.id, datetime_debut: r.creneaux.datetime_debut, prestation: r.prestations?.nom }
          : null
      )
      setHistorique(
        h.map((x) => ({ id: x.id, date: x.creneaux.datetime_debut, prestation: x.prestations?.nom }))
      )
    } catch (e) {
      setErr(e.message)
    } finally {
      setChargement(false)
    }
  }, [clientPret, user])

  useEffect(() => {
    charger()
  }, [charger])

  // ── États auth ──
  if (configured) {
    if (loading) return <div className={styles.loader}>Chargement…</div>
    if (!session)
      return (
        <LoginScreen
          titre="Mon espace"
          txt="Connecte-toi avec Google pour retrouver tes points et tes rendez-vous."
        />
      )
    if (isAdmin) return <Admin />
    if (!profileComplete)
      return (
        <main className="page">
          <div className="wrap">
            <span className="eyebrow">Dernière étape</span>
            <h1 className={styles.titre}>Profil incomplet</h1>
            <p className={styles.vide}>Complète ton prénom et ton numéro pour activer ton espace.</p>
            <p style={{ marginTop: 24 }}>
              <Link to="/profil">
                <MagneticButton>Compléter mon profil</MagneticButton>
              </Link>
            </p>
          </div>
        </main>
      )
  }

  // ── Données (réelles si connecté, mock sinon) ──
  const prenom = configured ? profile.prenom : CLIENT_MOCK.prenom
  const points = configured ? profile.points_fidelite ?? 0 : CLIENT_MOCK.points_fidelite
  const rdvAffiche = configured
    ? rdv
    : annuleDemo
      ? null
      : {
          id: 'demo',
          datetime_debut: CLIENT_MOCK.prochain_rdv.datetime_debut,
          prestation: CLIENT_MOCK.prochain_rdv.prestation,
        }
  const histoAffiche = configured
    ? historique
    : CLIENT_MOCK.historique.map((h, i) => ({ id: i, date: h.date, prestation: h.prestation }))

  const restant = Math.max(FIDELITE.objectif - points, 0)
  const pct = Math.min((points / FIDELITE.objectif) * 100, 100)

  const heuresAvant = rdvAffiche
    ? (new Date(rdvAffiche.datetime_debut) - Date.now()) / 3600000
    : 0
  const annulable = heuresAvant >= 2

  const annuler = async () => {
    if (!configured) {
      setAnnuleDemo(true)
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const idAnnule = rdvAffiche.id
      await annulerReservation(idAnnule)
      notifier('annulation', idAnnule) // email best-effort
      await charger()
    } catch (e) {
      setErr(/2h/.test(e.message) ? 'Annulation impossible à moins de 2h.' : e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">Connecté · {prenom}</span>
          <div className={styles.entete}>
            <h1 className={styles.titre}>Mon espace</h1>
            {configured && session && (
              <button className={styles.deco} onClick={signOut}>
                Se déconnecter
              </button>
            )}
          </div>
        </Reveal>

        {err && <p className={styles.erreur}>{err}</p>}

        {/* fidélité */}
        <Reveal delay={70} className={styles.bloc}>
          <div className={styles.blocHead}>
            <h2 className={styles.h2}>Fidélité</h2>
            <span className={styles.fidScore}>
              {points}/{FIDELITE.objectif}
            </span>
          </div>
          <div className={styles.barre}>
            <div className={styles.barreFill} style={{ width: `${pct}%` }} />
          </div>
          <p className={styles.fidTxt}>
            {restant > 0
              ? `Encore ${restant} coupe${restant > 1 ? 's' : ''} avant une offerte.`
              : '🎉 Une coupe offerte t’attend !'}
          </p>
        </Reveal>

        {/* prochain RDV */}
        <Reveal delay={140} className={styles.bloc}>
          <h2 className={styles.h2}>Prochain rendez-vous</h2>
          {chargement ? (
            <p className={styles.vide}>Chargement…</p>
          ) : rdvAffiche ? (
            <div className={styles.rdv}>
              <div>
                <p className={styles.rdvDate}>
                  {new Date(rdvAffiche.datetime_debut).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
                <p className={styles.rdvHeure}>
                  {new Date(rdvAffiche.datetime_debut).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {rdvAffiche.prestation ? ` · ${rdvAffiche.prestation}` : ''}
                </p>
              </div>
              <div className={styles.rdvAction}>
                <MagneticButton variant="ghost" disabled={!annulable || busy} onClick={annuler}>
                  {busy ? 'Annulation…' : 'Annuler'}
                </MagneticButton>
                {!annulable && (
                  <span className={styles.bloque}>
                    Moins de 2h avant — contacte Adam directement.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className={styles.vide}>Aucun rendez-vous à venir.</p>
          )}
        </Reveal>

        {/* historique */}
        <Reveal delay={210} className={styles.bloc}>
          <h2 className={styles.h2}>Historique</h2>
          {histoAffiche.length === 0 ? (
            <p className={styles.vide}>Aucune coupe pour le moment.</p>
          ) : (
            <ul className={styles.histo}>
              {histoAffiche.map((h) => (
                <li key={h.id}>
                  <span>
                    {new Date(h.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className={styles.histoPresta}>{h.prestation || 'Coupe'}</span>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        <Footer />
      </div>
    </main>
  )
}
