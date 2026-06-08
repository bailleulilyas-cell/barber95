import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import LoginScreen from '../../components/Auth/LoginScreen'
import Admin from '../Admin/Admin'
import LoyaltyCard from '../../components/Loyalty/LoyaltyCard'
import {
  IconSettings,
  IconBell,
  IconShield,
  IconHelp,
  IconStar,
  IconChevronRight,
} from '../../components/Icons'
import { CLIENT_MOCK } from '../../data/mock'
import { FIDELITE } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  getProchainRdv,
  getHistorique,
  annulerReservation,
  notifier,
  getReservationsAvisLaisses,
} from '../../lib/api'
import styles from './Account.module.css'

function tierFidelite(points) {
  if (points >= FIDELITE.objectif) return 'Membre Or'
  if (points >= 5) return 'Membre Argent'
  return 'Membre'
}

export default function Account() {
  const navigate = useNavigate()
  const { configured, loading, session, user, profile, profileComplete, isAdmin, signOut } =
    useAuth()
  const toast = useToast()
  const [rdv, setRdv] = useState(null)
  const [historique, setHistorique] = useState([])
  const [avisLaisses, setAvisLaisses] = useState(new Set())
  const [chargement, setChargement] = useState(configured)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [annuleDemo, setAnnuleDemo] = useState(false)

  const clientPret = configured && session && profileComplete && !isAdmin

  const charger = useCallback(async () => {
    if (!clientPret) return
    try {
      setErr(null)
      const [r, h, vus] = await Promise.all([
        getProchainRdv(user.id),
        getHistorique(user.id),
        getReservationsAvisLaisses(user.id),
      ])
      setRdv(r ? { id: r.id, datetime_debut: r.creneaux.datetime_debut, prestation: r.prestations?.nom } : null)
      setHistorique(h.map((x) => ({ id: x.id, date: x.creneaux.datetime_debut, prestation: x.prestations?.nom })))
      setAvisLaisses(vus)
    } catch (e) {
      setErr(e.message)
    } finally {
      setChargement(false)
    }
  }, [clientPret, user])

  useEffect(() => {
    charger()
  }, [charger])

  // ── états auth ──
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
            <h1 className="titrePage">Profil incomplet</h1>
            <p className={styles.muted} style={{ margin: '12px 0 24px' }}>
              Complète ton prénom et ton numéro pour activer ton espace.
            </p>
            <Link to="/profil">
              <MagneticButton>Compléter mon profil</MagneticButton>
            </Link>
          </div>
        </main>
      )
  }

  // ── données ──
  const prenom = configured ? profile.prenom : CLIENT_MOCK.prenom
  const email = configured ? user?.email : 'demo@barber95.fr'
  const points = configured ? profile.points_fidelite ?? 0 : CLIENT_MOCK.points_fidelite
  const initiales = (prenom || 'C').slice(0, 2).toUpperCase()

  const rdvAffiche = configured
    ? rdv
    : annuleDemo
      ? null
      : { id: 'demo', datetime_debut: CLIENT_MOCK.prochain_rdv.datetime_debut, prestation: CLIENT_MOCK.prochain_rdv.prestation }
  const histoAffiche = configured
    ? historique
    : CLIENT_MOCK.historique.map((h, i) => ({ id: i, date: h.date, prestation: h.prestation }))

  const ceMois = histoAffiche.filter((h) => {
    const d = new Date(h.date)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  const restant = Math.max(FIDELITE.objectif - points, 0)
  const pct = Math.min((points / FIDELITE.objectif) * 100, 100)

  const heuresAvant = rdvAffiche ? (new Date(rdvAffiche.datetime_debut) - Date.now()) / 3600000 : 0
  const annulable = heuresAvant >= 2

  const annuler = async () => {
    if (!configured) {
      setAnnuleDemo(true)
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const id = rdvAffiche.id
      await annulerReservation(id)
      notifier('annulation', id)
      await charger()
      toast('Rendez-vous annulé')
    } catch (e) {
      setErr(/2h/.test(e.message) ? 'Annulation impossible à moins de 2h.' : e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <div className="wrap">
        <header className={styles.head}>
          <h1 className="titrePage">Mon profil</h1>
          {configured && session && (
            <button className={styles.gear} onClick={signOut} aria-label="Se déconnecter">
              <IconSettings size={20} />
            </button>
          )}
        </header>

        {err && <p className={styles.erreur}>{err}</p>}

        {/* carte profil */}
        <section className={styles.profil}>
          <div className={styles.profTop}>
            <div className={styles.avatar}>{initiales}</div>
            <div className={styles.profInfo}>
              <p className={styles.profNom}>{prenom}</p>
              <p className={styles.profMail}>{email}</p>
              <span className="badge badge-or">{tierFidelite(points)}</span>
            </div>
          </div>
          <div className={styles.stats}>
            <Stat num={histoAffiche.length} label="Coupes" />
            <Stat num={ceMois} label="Ce mois" />
            <Stat num={`${points}/${FIDELITE.objectif}`} label="Fidélité" or />
          </div>
          <LoyaltyCard points={points} objectif={FIDELITE.objectif} />
        </section>

        {/* prochain RDV */}
        <h2 className={styles.section}>Prochain rendez-vous</h2>
        {chargement ? (
          <p className={styles.muted}>Chargement…</p>
        ) : rdvAffiche ? (
          <div className={styles.rdv}>
            <div className={styles.rdvHead}>
              <div>
                <p className={styles.rdvDate}>
                  {new Date(rdvAffiche.datetime_debut).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
                <p className={styles.rdvHeure}>
                  {new Date(rdvAffiche.datetime_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  {rdvAffiche.prestation ? ` · ${rdvAffiche.prestation}` : ''}
                </p>
              </div>
              <span className="badge badge-vert">Confirmé</span>
            </div>
            <button
              className={styles.annuler}
              disabled={!annulable || busy}
              onClick={annuler}
            >
              {busy ? 'Annulation…' : annulable ? 'Annuler' : 'Annulation impossible (<2h)'}
            </button>
          </div>
        ) : (
          <div className={styles.vide}>
            <p className={styles.muted}>Aucun rendez-vous à venir.</p>
            <MagneticButton className={styles.videCta} onClick={() => navigate('/reserver')}>
              Réserver
            </MagneticButton>
          </div>
        )}

        {/* historique */}
        <h2 className={styles.section}>Historique</h2>
        {histoAffiche.length === 0 ? (
          <p className={styles.muted}>Aucune coupe pour le moment.</p>
        ) : (
          <div className={styles.histo}>
            {histoAffiche.map((h) => {
              const avisOk = configured && !avisLaisses.has(h.id)
              return (
                <div key={h.id} className={styles.histoItem}>
                  <div>
                    <p className={styles.histoPresta}>{h.prestation || 'Coupe'}</p>
                    <p className={styles.histoDate}>
                      {new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className={styles.histoActions}>
                    {avisOk && (
                      <Link className={styles.avisLink} to={`/avis/nouveau?r=${h.id}`}>
                        Laisser un avis
                      </Link>
                    )}
                    <button className={styles.rebook} onClick={() => navigate('/reserver')}>
                      Re-book
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* compte */}
        <h2 className={styles.section}>Compte</h2>
        <div className={styles.menu}>
          <Link to="/avis" className={styles.menuItem}>
            <span className={styles.menuIco}><IconStar size={18} /></span>
            <span className={styles.menuLbl}>Mes avis</span>
            <IconChevronRight size={18} />
          </Link>
          <Link to="/confidentialite" className={styles.menuItem}>
            <span className={styles.menuIco}><IconShield size={18} /></span>
            <span className={styles.menuLbl}>Confidentialité</span>
            <IconChevronRight size={18} />
          </Link>
          <Link to="/mentions-legales" className={styles.menuItem}>
            <span className={styles.menuIco}><IconHelp size={18} /></span>
            <span className={styles.menuLbl}>Mentions légales</span>
            <IconChevronRight size={18} />
          </Link>
        </div>

        {configured && session && (
          <button className={styles.signout} onClick={signOut}>
            Se déconnecter
          </button>
        )}
      </div>
    </main>
  )
}

function Stat({ num, label, or }) {
  return (
    <div className={styles.stat}>
      <span className={`${styles.statNum} ${or ? styles.statOr : ''}`}>{num}</span>
      <span className={styles.statLbl}>{label}</span>
    </div>
  )
}
