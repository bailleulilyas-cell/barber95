import { useCallback, useEffect, useState } from 'react'
import {
  getReservationsAdmin,
  getTousAvis,
  marquerTerminee,
  annulerReservation,
  setAvisVisible,
  notifier,
  onTableChange,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { IconCalendar, IconPlus } from '../../components/Icons'
import { RESERVATIONS_ADMIN } from '../../data/mock'
import CreneauxManager from './CreneauxManager'
import ReservationManuelle from './ReservationManuelle'
import styles from './Admin.module.css'

const terminerEtNotifier = async (id) => {
  await marquerTerminee(id)
  notifier('avis', id)
  notifier('parrainage', id) // « Recommande un pote » avec son lien unique
}
const annulerEtNotifier = async (id) => {
  await annulerReservation(id)
  notifier('annulation', id)
}

function dateLisible(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}
function heure(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
const LABELS = { en_attente: 'en attente', confirmee: 'confirmée', terminee: 'terminée' }

export default function Admin() {
  const { configured } = useAuth()
  const toast = useToast()
  const [resas, setResas] = useState([])
  const [avis, setAvis] = useState([])
  const [loading, setLoading] = useState(configured)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)
  const [gestion, setGestion] = useState(false)
  const [manuel, setManuel] = useState(false)

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

  // temps réel : nouvelle réservation / nouvel avis → dashboard à jour en direct
  useEffect(() => {
    if (!configured) return
    let t
    const deb = () => {
      clearTimeout(t)
      t = setTimeout(charger, 300)
    }
    const o1 = onTableChange('reservations', deb)
    const o2 = onTableChange('avis', deb)
    return () => {
      clearTimeout(t)
      o1()
      o2()
    }
  }, [charger])

  if (!configured) return <AdminDemo />

  const action = async (fn, id, msg) => {
    setBusy(id)
    try {
      await fn(id)
      await charger()
      if (msg) toast(msg)
    } catch (e) {
      setErr(e.message)
      toast(e.message || 'Erreur', 'error')
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
  const avisVisibles = avis.filter((a) => a.visible).length

  return (
    <main className="page">
      <div className="wrap">
        <header className={styles.head}>
          <div>
            <span className={styles.eyebrow}>Espace Adam</span>
            <h1 className={styles.titre}>Planning</h1>
          </div>
        </header>

        {err && <p className={styles.erreur}>{err}</p>}

        {/* actions : créneaux + RDV manuel */}
        <div className={styles.quick}>
          <button className={styles.quickBtn} onClick={() => setGestion(true)}>
            <IconCalendar size={20} />
            Gérer mes créneaux
          </button>
          <button className={styles.quickGhost} onClick={() => setManuel(true)}>
            <IconPlus size={20} />
            RDV manuel
          </button>
        </div>

        {loading ? (
          <p className={styles.muted}>Chargement…</p>
        ) : (
          <>
            {passees.length > 0 && (
              <>
                <h2 className={styles.section}>À clôturer</h2>
                <div className={styles.liste}>
                  {passees.map((r) => (
                    <Resa
                      key={r.id}
                      r={r}
                      busy={busy === r.id}
                      onTerminer={() => action(terminerEtNotifier, r.id, 'Marqué terminé · avis demandé')}
                      onAnnuler={() => action(annulerEtNotifier, r.id, 'Réservation annulée')}
                    />
                  ))}
                </div>
              </>
            )}

            <h2 className={styles.section}>Réservations à venir</h2>
            {aVenir.length === 0 ? (
              <p className={styles.muted}>Aucune réservation à venir.</p>
            ) : (
              <div className={styles.liste}>
                {aVenir.map((r) => (
                  <Resa
                    key={r.id}
                    r={r}
                    busy={busy === r.id}
                    onAnnuler={() => action(annulerEtNotifier, r.id, 'Réservation annulée')}
                  />
                ))}
              </div>
            )}

            <h2 className={styles.section}>
              Avis {avisVisibles > 0 && <span className="badge badge-or">{avisVisibles} visibles</span>}
            </h2>
            {avis.length === 0 ? (
              <p className={styles.muted}>Aucun avis.</p>
            ) : (
              <div className={styles.liste}>
                {avis.map((a) => (
                  <div key={a.id} className={styles.avis}>
                    <div className={styles.avisInfo}>
                      <span className={styles.avisPrenom}>
                        {a.prenom || '—'}
                        <span className={styles.avisStars}>
                          {'★'.repeat(a.note)}
                          <span className={styles.avisVides}>{'★'.repeat(5 - a.note)}</span>
                        </span>
                      </span>
                      {a.commentaire && <span className={styles.avisCom}>{a.commentaire}</span>}
                    </div>
                    <button
                      className={styles.avisBtn}
                      disabled={busy === a.id}
                      onClick={() =>
                        action(() => setAvisVisible(a.id, !a.visible), a.id, a.visible ? 'Avis masqué' : 'Avis affiché')
                      }
                    >
                      {a.visible ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {gestion && (
        <CreneauxManager
          onClose={() => {
            setGestion(false)
            charger()
          }}
        />
      )}

      {manuel && (
        <ReservationManuelle
          onClose={() => {
            setManuel(false)
            charger()
          }}
        />
      )}
    </main>
  )
}

function Resa({ r, busy, onTerminer, onAnnuler }) {
  return (
    <div className={styles.resa}>
      <div className={styles.resaHeure}>
        <span className={styles.resaH}>{heure(r.creneaux.datetime_debut)}</span>
        <span className={styles.resaJ}>{dateLisible(r.creneaux.datetime_debut)}</span>
      </div>
      <div className={styles.resaInfo}>
        <span className={styles.resaNom}>
          {r.clients?.prenom || r.client_nom || 'Client'}
          {!r.clients && r.client_nom && <span className={styles.manuelTag}>sur place</span>}
        </span>
        {r.clients?.tel && <a className={styles.resaTel} href={`tel:${r.clients.tel}`}>{r.clients.tel}</a>}
      </div>
      <div className={styles.resaActions}>
        {onTerminer && (
          <button className={styles.btnOk} disabled={busy} onClick={onTerminer}>Terminé</button>
        )}
        {onAnnuler && (
          <button className={styles.btnNo} disabled={busy} onClick={onAnnuler}>Annuler</button>
        )}
      </div>
    </div>
  )
}

function AdminDemo() {
  return (
    <main className="page">
      <div className="wrap">
        <span className={styles.eyebrow}>Espace Adam</span>
        <h1 className={styles.titre}>Tableau de bord</h1>
        <p className={styles.erreur} style={{ marginTop: 16 }}>
          Mode démo — Supabase non configuré, données fictives.
        </p>
        <div className={styles.liste}>
          {RESERVATIONS_ADMIN.map((r) => (
            <div key={r.id} className={styles.resa}>
              <div className={styles.resaHeure}>
                <span className={styles.resaH}>{r.heure}</span>
              </div>
              <div className={styles.resaInfo}>
                <span className={styles.resaNom}>{r.prenom}</span>
                <span className={styles.resaTel}>{r.tel}</span>
              </div>
              <span className="badge badge-or">{r.statut}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
