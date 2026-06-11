import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  getClientsAdmin,
  getHistoriqueTermine,
  setTarifAmi,
  setClientNotes,
  onTableChange,
} from '../../lib/api'
import { fichesClients } from '../../lib/stats'
import Skeleton from '../../components/Skeleton/Skeleton'
import styles from './Clients.module.css'

// Fiches clients générées automatiquement depuis l'historique des résas :
// avatar Google, prénom, nb de coupes, dernière visite, mini historique.
// Toggle discret « Tarif ami » (le client n'en sait rien).

function dateLisible(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Clients() {
  const { configured } = useAuth()
  const toast = useToast()
  const [fiches, setFiches] = useState([])
  const [loading, setLoading] = useState(configured)
  const [err, setErr] = useState(null)
  const [ouvert, setOuvert] = useState(null) // id de la fiche dépliée
  const [busy, setBusy] = useState(null)

  const charger = useCallback(async () => {
    if (!configured) return
    try {
      setErr(null)
      const [clients, historique] = await Promise.all([getClientsAdmin(), getHistoriqueTermine()])
      setFiches(fichesClients(clients, historique))
    } catch (e) {
      setErr(e.message)
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

  const toggleAmi = async (fiche) => {
    setBusy(fiche.id)
    const valeur = !fiche.is_friend
    try {
      await setTarifAmi(fiche.id, valeur)
      setFiches((fs) => fs.map((f) => (f.id === fiche.id ? { ...f, is_friend: valeur } : f)))
      toast(valeur ? `Tarif ami activé pour ${fiche.prenom || 'ce client'} ✓` : 'Tarif ami désactivé')
    } catch (e) {
      toast(e.message || 'Erreur', 'error')
    } finally {
      setBusy(null)
    }
  }

  const majNotes = (id, notes) =>
    setFiches((fs) => fs.map((f) => (f.id === id ? { ...f, notes } : f)))

  if (!configured) {
    return (
      <main className="page">
        <div className="wrap">
          <span className={styles.eyebrow}>Espace Adam</span>
          <h1 className={styles.titre}>Clients</h1>
          <p className={styles.erreur}>Mode démo — Supabase non configuré.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="wrap">
        <header className={styles.head}>
          <span className={styles.eyebrow}>Espace Adam</span>
          <h1 className={styles.titre}>Clients</h1>
          {!loading && (
            <p className={styles.sub}>
              {fiches.length} client{fiches.length > 1 ? 's' : ''}
            </p>
          )}
        </header>

        {err && <p className={styles.erreur}>{err}</p>}

        {loading ? (
          <div className={styles.liste}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} h={76} r={16} />
            ))}
          </div>
        ) : fiches.length === 0 ? (
          <p className={styles.vide}>Aucun client pour le moment.</p>
        ) : (
          <div className={styles.liste}>
            {fiches.map((f) => {
              const deplie = ouvert === f.id
              return (
                <article key={f.id} className={styles.fiche}>
                  <button
                    className={styles.ficheHead}
                    onClick={() => setOuvert(deplie ? null : f.id)}
                    aria-expanded={deplie}
                  >
                    {f.avatar_url ? (
                      <img className={styles.avatar} src={f.avatar_url} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span className={styles.avatarVide}>
                        {(f.prenom || f.email || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className={styles.ident}>
                      <span className={styles.prenom}>
                        {f.prenom || f.email || 'Client'}
                        {f.is_friend && <span className={styles.badgeAmi}>ami</span>}
                      </span>
                      <span className={styles.meta}>
                        {f.coupes} coupe{f.coupes > 1 ? 's' : ''}
                        {f.derniereVisite && ` · vu le ${dateLisible(f.derniereVisite)}`}
                      </span>
                    </div>
                    <span className={`${styles.fleche} ${deplie ? styles.flecheHaut : ''}`}>⌄</span>
                  </button>

                  {deplie && (
                    <div className={styles.detail}>
                      {/* toggle tarif ami */}
                      <label className={styles.amiRow}>
                        <span className={styles.amiTxt}>
                          Tarif ami
                          <span className={styles.amiSub}>Prix réduit appliqué automatiquement</span>
                        </span>
                        <button
                          role="switch"
                          aria-checked={f.is_friend}
                          disabled={busy === f.id}
                          className={`${styles.toggle} ${f.is_friend ? styles.toggleOn : ''}`}
                          onClick={() => toggleAmi(f)}
                        >
                          <span className={styles.toggleDot} />
                        </button>
                      </label>

                      {/* notes privées d'Adam */}
                      <NotesField fiche={f} onSaved={(notes) => majNotes(f.id, notes)} />


                      {/* mini historique scrollable */}
                      {f.historique.length > 0 ? (
                        <div className={styles.histo}>
                          {f.historique.map((h) => (
                            <div key={h.id} className={styles.histoLigne}>
                              <span>{dateLisible(h.creneaux.datetime_debut)}</span>
                              <span className={styles.histoStyle}>{h.prestations?.nom || '—'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.histoVide}>Jamais venu pour l’instant.</p>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

// Notes privées d'Adam sur un client (style, préférences…). Sauvegarde au blur.
function NotesField({ fiche, onSaved }) {
  const toast = useToast()
  const [valeur, setValeur] = useState(fiche.notes || '')
  const [saving, setSaving] = useState(false)

  const sauver = async () => {
    const v = valeur.trim()
    if (v === (fiche.notes || '')) return // rien changé
    setSaving(true)
    try {
      await setClientNotes(fiche.id, v)
      onSaved(v || null)
      toast('Note enregistrée ✓')
    } catch (e) {
      toast(e.message || 'Erreur', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <label className={styles.notes}>
      <span className={styles.notesLbl}>Notes {saving && <span className={styles.notesSave}>· …</span>}</span>
      <textarea
        rows={2}
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        onBlur={sauver}
        placeholder="Style, préférences, remarques…"
      />
    </label>
  )
}
