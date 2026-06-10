import { useCallback, useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { getResasDuJour, getResasTermineesDepuis, onTableChange } from '../../lib/api'
import { rdvDuJour, revenuEstime, statsMensuelles } from '../../lib/stats'
import { prixResa } from '../../lib/tarif'
import Skeleton from '../../components/Skeleton/Skeleton'
import styles from './Dashboard.module.css'

function heure(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function meteoJournee(n) {
  if (n === 0) return 'Aucun RDV aujourd’hui — journée tranquille'
  if (n === 1) return '1 RDV aujourd’hui'
  return `${n} RDV aujourd’hui`
}

const TOOLTIP_STYLE = {
  background: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 13,
}

export default function Dashboard() {
  const { configured } = useAuth()
  const [jour, setJour] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(configured)
  const [err, setErr] = useState(null)

  const charger = useCallback(async () => {
    if (!configured) return
    try {
      setErr(null)
      const debutMoisPrec = new Date()
      debutMoisPrec.setMonth(debutMoisPrec.getMonth() - 1, 1)
      debutMoisPrec.setHours(0, 0, 0, 0)
      const [duJour, terminees] = await Promise.all([
        getResasDuJour(),
        getResasTermineesDepuis(debutMoisPrec.toISOString()),
      ])
      setJour(rdvDuJour(duJour))
      setStats(statsMensuelles(terminees))
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [configured])

  useEffect(() => {
    charger()
  }, [charger])

  // temps réel : une résa bouge → dashboard à jour
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

  const aujourdHui = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (!configured) {
    return (
      <main className="page">
        <div className="wrap">
          <span className={styles.eyebrow}>Espace Adam</span>
          <h1 className={styles.titre}>Aujourd’hui</h1>
          <p className={styles.erreur}>Mode démo — Supabase non configuré.</p>
        </div>
      </main>
    )
  }

  const revenuJour = revenuEstime(jour)

  return (
    <main className="page">
      <div className="wrap">
        <header className={styles.head}>
          <span className={styles.eyebrow}>{aujourdHui}</span>
          <h1 className={styles.titre}>Aujourd’hui</h1>
          {loading ? (
            <Skeleton w="45%" h={16} style={{ marginTop: 6 }} />
          ) : (
            <p className={styles.meteo}>{meteoJournee(jour.length)}</p>
          )}
        </header>

        {err && <p className={styles.erreur}>{err}</p>}

        {/* ── RDV du jour ── */}
        {loading ? (
          <div className={styles.liste}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} h={64} r={16} />
            ))}
          </div>
        ) : jour.length === 0 ? (
          <p className={styles.vide}>Rien au planning aujourd’hui.</p>
        ) : (
          <div className={styles.liste}>
            {jour.map((r) => (
              <div key={r.id} className={styles.resa}>
                <span className={styles.resaH}>{heure(r.creneaux.datetime_debut)}</span>
                <div className={styles.resaInfo}>
                  <span className={styles.resaNom}>
                    {r.clients?.prenom || 'Client'}
                    {r.clients?.is_friend && <span className={styles.ami}>ami</span>}
                  </span>
                  {r.prestations?.nom && <span className={styles.resaStyle}>{r.prestations.nom}</span>}
                </div>
                <span className={styles.resaPrix}>{prixResa(r)}€</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Revenu estimé du jour ── */}
        <div className={styles.revenu}>
          <span>Revenu estimé aujourd’hui</span>
          {loading ? <Skeleton w={64} h={26} /> : <span className={styles.revenuNum}>{revenuJour}€</span>}
        </div>

        {/* ── Stats du mois ── */}
        <h2 className={styles.section}>Ce mois-ci</h2>
        {loading || !stats ? (
          <Skeleton h={180} r={16} />
        ) : (
          <>
            <div className={styles.graphe}>
              <span className={styles.grapheTitre}>Coupes par semaine</span>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.semaines} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="#8b8b8b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8b8b8b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(201,168,76,0.08)' }} />
                  <Bar dataKey="coupes" name="Coupes" fill="#c9a84c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.graphe}>
              <span className={styles.grapheTitre}>Revenu par semaine (€)</span>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={stats.semaines} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="#8b8b8b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8b8b8b" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="revenu"
                    name="Revenu"
                    stroke="#e8c766"
                    strokeWidth={2.5}
                    dot={{ fill: '#e8c766', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.chiffres}>
              <div className={styles.chiffre}>
                <span className={styles.chiffreNum}>
                  {stats.clientFidele ? stats.clientFidele.prenom : '—'}
                </span>
                <span className={styles.chiffreLbl}>
                  {stats.clientFidele
                    ? `Client du mois (${stats.clientFidele.coupes} coupes)`
                    : 'Client du mois'}
                </span>
              </div>
              <div className={styles.chiffre}>
                <span className={styles.chiffreNum}>
                  {stats.semaineChargee ? stats.semaineChargee.label : '—'}
                </span>
                <span className={styles.chiffreLbl}>Semaine la + chargée</span>
              </div>
              <div className={styles.chiffre}>
                <span className={styles.chiffreNum}>
                  {stats.progression == null
                    ? '—'
                    : `${stats.progression > 0 ? '+' : ''}${stats.progression}%`}
                </span>
                <span className={styles.chiffreLbl}>vs mois dernier</span>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
