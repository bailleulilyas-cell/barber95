import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import { IconBell, IconStar, IconClock, IconChevronRight } from '../../components/Icons'
import { SITE, PRESTATIONS } from '../../config'
import { configured } from '../../lib/supabase'
import { getCreneauxOuverts, getAvisVisibles, getGalerie, getPrestation } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AVIS, GALERIE } from '../../data/mock'
import styles from './Home.module.css'

function salutation() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function libelleSlot(iso) {
  const d = new Date(iso)
  const auj = new Date()
  const memeJour = d.toDateString() === auj.toDateString()
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (memeJour) return `Aujourd’hui à ${heure}`
  return (
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) +
    ` · ${heure}`
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { configured: conf, profile } = useAuth()
  const [presta, setPresta] = useState(PRESTATIONS[0])
  const [slot, setSlot] = useState(null)
  const [note, setNote] = useState({ moyenne: 0, total: 0 })
  const [medias, setMedias] = useState([])

  useEffect(() => {
    if (!configured) {
      const vis = AVIS.filter((a) => a.visible)
      setNote({ moyenne: vis.reduce((s, a) => s + a.note, 0) / (vis.length || 1), total: vis.length })
      setMedias(GALERIE.slice(0, 6))
      return
    }
    getCreneauxOuverts().then((c) => setSlot(c[0] || null)).catch(() => {})
    getPrestation().then((p) => p && setPresta(p)).catch(() => {})
    getAvisVisibles()
      .then((a) =>
        setNote({ moyenne: a.reduce((s, x) => s + x.note, 0) / (a.length || 1), total: a.length })
      )
      .catch(() => {})
    getGalerie().then((g) => setMedias(g.slice(0, 6))).catch(() => {})
  }, [])

  const prenom = conf && profile?.prenom ? profile.prenom : null

  return (
    <main className="page">
      <div className="wrap">
        {/* en-tête */}
        <header className={styles.head}>
          <div>
            <p className={styles.salut}>{salutation()}</p>
            <h1 className={styles.nom}>{prenom || SITE.nom}</h1>
          </div>
          <Link to="/mon-espace" className={styles.bell} aria-label="Mon espace">
            <IconBell size={20} />
          </Link>
        </header>

        {/* carte Quick Book */}
        <section className={styles.quick}>
          <span className={styles.dispoTag}>
            <i className={styles.pulse} /> Prochain créneau dispo
          </span>
          <p className={styles.quickWhen}>
            {configured ? (slot ? libelleSlot(slot.datetime_debut) : 'Bientôt disponible') : 'Aujourd’hui à 14:30'}
          </p>
          <p className={styles.quickSub}>
            {presta.nom} · {presta.duree_minutes} min · {presta.prix}€
          </p>
          <div className={styles.quickBtns}>
            <MagneticButton onClick={() => navigate('/reserver')}>Réserver</MagneticButton>
            <MagneticButton variant="ghost" onClick={() => navigate('/tarifs')}>
              Voir les tarifs
            </MagneticButton>
          </div>
        </section>

        {/* note moyenne */}
        <Link to="/avis" className={styles.rowCard}>
          <div className={styles.noteBloc}>
            <span className={styles.noteNum}>{note.total ? note.moyenne.toFixed(1) : '—'}</span>
            <span className={styles.noteEtoile}>
              <IconStar size={18} fill />
            </span>
          </div>
          <div className={styles.rowInfo}>
            <span className={styles.rowTitre}>Avis clients</span>
            <span className={styles.rowSub}>
              {note.total ? `${note.total} avis` : 'Sois le premier à laisser un avis'}
            </span>
          </div>
          <IconChevronRight size={20} />
        </Link>

        {/* prestation */}
        <h2 className={styles.section}>La prestation</h2>
        <div className={styles.prestaCard} onClick={() => navigate('/reserver')}>
          <div>
            <p className={styles.prestaNom}>{presta.nom}</p>
            <p className={styles.prestaDesc}>{presta.description || 'Coupe homme, finitions soignées.'}</p>
            <p className={styles.prestaMeta}>
              <IconClock size={15} /> {presta.duree_minutes} min
            </p>
          </div>
          <span className={styles.prestaPrix}>{presta.prix}€</span>
        </div>

        {/* galerie */}
        {medias.length > 0 && (
          <>
            <div className={styles.sectionRow}>
              <h2 className={styles.section}>Réalisations</h2>
              <Link to="/galerie" className={styles.voirTout}>
                Voir tout
              </Link>
            </div>
            <div className={styles.galerie}>
              {medias.map((m, i) => (
                <Link to="/galerie" key={m.id || i} className={styles.gMedia}>
                  {m.url ? (
                    m.type === 'video' ? (
                      <video src={m.url} muted playsInline />
                    ) : (
                      <img src={m.url} alt={m.legende || 'Coupe'} />
                    )
                  ) : (
                    <div className={styles.gPlaceholder}>{String(i + 1).padStart(2, '0')}</div>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
