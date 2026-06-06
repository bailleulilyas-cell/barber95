import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../../components/Reveal/Reveal'
import { Footer } from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import {
  getReservationsAdmin,
  getTousAvis,
  marquerTerminee,
  annulerReservation,
  setAvisVisible,
  notifier,
} from '../../lib/api'

// actions composites : action en base + email best-effort
const terminerEtNotifier = async (id) => {
  await marquerTerminee(id)
  notifier('avis', id)
}
const annulerEtNotifier = async (id) => {
  await annulerReservation(id)
  notifier('annulation', id)
}
import { RESERVATIONS_ADMIN } from '../../data/mock'
import CreneauxManager from './CreneauxManager'
import styles from './Admin.module.css'

function dateLisible(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function heure(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
const LABELS = { en_attente: 'en attente', confirmee: 'confirmée', terminee: 'terminée' }

export default function Admin() {
  const { configured } = useAuth()
  const [resas, setResas] = useState([])
  const [avis, setAvis] = useState([])
  const [loading, setLoading] = useState(configured)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)
  const [gestionOuverte, setGestionOuverte] = useState(false)

  const charger = useCallback(async () => {
    if (!configured) return
    try {
      setErr(null)
      const [r, a] = await Promise.all([getReservationsAdmin(), getTousAvis()])
      setResas(r)
      setAvis(a)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [configured])

  useEffect(() => {
    charger()
  }, [charger])

  // ── Mode démo (Supabase non configuré) : aperçu mocké ──
  if (!configured) {
    return <AdminDemo />
  }

  const action = async (fn, id) => {
    setBusy(id)
    try {
      await fn(id)
      await charger()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(null)
    }
  }

  const maintenant = Date.now()
  const aVenir = resas.filter(
    (r) => r.statut !== 'terminee' && new Date(r.creneaux.datetime_debut).getTime() >= maintenant
  )
  const passees = resas.filter(
    (r) => new Date(r.creneaux.datetime_debut).getTime() < maintenant && r.statut !== 'terminee'
  )
  const avisAModerer = avis.filter((a) => a.visible).length

  return (
    <main className="page">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">Espace privé · Adam</span>
          <h1 className={styles.titre}>Dashboard</h1>
        </Reveal>

        {err && <p className={styles.erreur}>{err}</p>}

        {/* stats + gestion créneaux */}
        <Reveal delay={80} className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{aVenir.length}</span>
            <span className={styles.statLbl}>RDV à venir</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{passees.length}</span>
            <span className={styles.statLbl}>À clôturer</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{avis.length}</span>
            <span className={styles.statLbl}>Avis</span>
          </div>
          <button className={styles.gerer} onClick={() => setGestionOuverte(true)}>
            Gérer mes créneaux
          </button>
          <Link className={styles.gererSecond} to="/galerie">
            Gérer la galerie
          </Link>
        </Reveal>

        {loading ? (
          <p className={styles.vide}>Chargement…</p>
        ) : (
          <>
            {/* à clôturer (passés non terminés) */}
            {passees.length > 0 && (
              <>
                <Reveal delay={120}>
                  <h2 className={styles.h2}>À clôturer</h2>
                </Reveal>
                <div className={styles.liste}>
                  {passees.map((r, i) => (
                    <LigneResa
                      key={r.id}
                      r={r}
                      i={i}
                      busy={busy === r.id}
                      onTerminer={() => action(terminerEtNotifier, r.id)}
                      onAnnuler={() => action(annulerEtNotifier, r.id)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* à venir */}
            <Reveal delay={160}>
              <h2 className={styles.h2}>Réservations à venir</h2>
            </Reveal>
            {aVenir.length === 0 ? (
              <p className={styles.vide}>Aucune réservation à venir.</p>
            ) : (
              <div className={styles.liste}>
                {aVenir.map((r, i) => (
                  <LigneResa
                    key={r.id}
                    r={r}
                    i={i}
                    busy={busy === r.id}
                    onAnnuler={() => action(annulerEtNotifier, r.id)}
                  />
                ))}
              </div>
            )}

            {/* modération des avis */}
            <Reveal delay={200}>
              <h2 className={styles.h2}>
                Avis {avisAModerer > 0 && <span className={styles.badge}>{avisAModerer} visibles</span>}
              </h2>
            </Reveal>
            {avis.length === 0 ? (
              <p className={styles.vide}>Aucun avis pour le moment.</p>
            ) : (
              <div className={styles.liste}>
                {avis.map((a, i) => (
                  <Reveal key={a.id} delay={i * 60} className={styles.avisLigne}>
                    <div className={styles.avisInfo}>
                      <span className={styles.avisPrenom}>
                        {a.prenom || '—'} · {'★'.repeat(a.note)}
                        <span className={styles.avisVides}>{'★'.repeat(5 - a.note)}</span>
                      </span>
                      {a.commentaire && <span className={styles.avisCom}>{a.commentaire}</span>}
                    </div>
                    <button
                      className={styles.btnT}
                      disabled={busy === a.id}
                      onClick={() => action(() => setAvisVisible(a.id, !a.visible), a.id)}
                    >
                      {a.visible ? 'Masquer' : 'Afficher'}
                    </button>
                  </Reveal>
                ))}
              </div>
            )}
          </>
        )}

        <Footer />
      </div>

      {gestionOuverte && (
        <CreneauxManager
          onClose={() => {
            setGestionOuverte(false)
            charger()
          }}
        />
      )}
    </main>
  )
}

// ── Une ligne de réservation ──
function LigneResa({ r, i, busy, onTerminer, onAnnuler }) {
  return (
    <Reveal delay={i * 60} className={styles.ligne}>
      <span className={styles.heure}>{heure(r.creneaux.datetime_debut)}</span>
      <div className={styles.client}>
        <span className={styles.prenom}>{r.clients?.prenom || 'Client'}</span>
        <span className={styles.tel}>
          {dateLisible(r.creneaux.datetime_debut)}
          {r.clients?.tel ? ` · ${r.clients.tel}` : ''}
        </span>
      </div>
      <span className={`${styles.statut} ${styles['s_' + r.statut]}`}>{LABELS[r.statut]}</span>
      <div className={styles.actions}>
        {onTerminer && (
          <button className={styles.btnT} disabled={busy} onClick={onTerminer}>
            Marquer terminé
          </button>
        )}
        {onAnnuler && (
          <button className={styles.btnA} disabled={busy} onClick={onAnnuler}>
            Annuler
          </button>
        )}
      </div>
    </Reveal>
  )
}

// ── Aperçu en mode démo (sans Supabase) ──
function AdminDemo() {
  return (
    <main className="page">
      <div className="wrap">
        <span className="eyebrow">Espace privé · Adam</span>
        <h1 className={styles.titre}>Dashboard</h1>
        <p className={styles.erreur}>
          ⚠︎ Mode démo — Supabase non configuré. Voici un aperçu avec des données fictives.
        </p>
        <div className={styles.liste}>
          {RESERVATIONS_ADMIN.map((r) => (
            <div key={r.id} className={styles.ligne}>
              <span className={styles.heure}>{r.heure}</span>
              <div className={styles.client}>
                <span className={styles.prenom}>{r.prenom}</span>
                <span className={styles.tel}>{r.tel}</span>
              </div>
              <span className={styles.statut}>{r.statut}</span>
            </div>
          ))}
        </div>
        <Footer />
      </div>
    </main>
  )
}
