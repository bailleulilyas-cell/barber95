import { useEffect, useState } from 'react'
import Reveal from '../../components/Reveal/Reveal'
import { Footer } from '../../components/Layout'
import { AVIS } from '../../data/mock'
import { configured } from '../../lib/supabase'
import { getAvisVisibles } from '../../lib/api'
import styles from './Reviews.module.css'

function Etoiles({ note }) {
  return (
    <span className={styles.etoiles} aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= note ? styles.pleine : styles.vide}>
          ★
        </span>
      ))}
    </span>
  )
}

export default function Reviews() {
  // En démo (sans Supabase) on montre les avis mockés ; sinon, la vraie base.
  const [avis, setAvis] = useState(configured ? [] : AVIS.filter((a) => a.visible))
  const [chargement, setChargement] = useState(configured)

  useEffect(() => {
    if (!configured) return
    getAvisVisibles()
      .then(setAvis)
      .catch(() => setAvis([]))
      .finally(() => setChargement(false))
  }, [])

  const moyenne = avis.reduce((s, a) => s + a.note, 0) / (avis.length || 1)

  return (
    <main className="page">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">Ils sont passés</span>
          <h1 className={styles.titre}>Avis</h1>
        </Reveal>

        {chargement ? (
          <p className={styles.etat}>Chargement…</p>
        ) : avis.length === 0 ? (
          <p className={styles.etat}>
            Pas encore d’avis. Les premiers retours apparaîtront ici après les premières coupes.
          </p>
        ) : (
          <>
            <Reveal delay={80} className={styles.moyenne}>
              <span className={styles.note}>{moyenne.toFixed(1)}</span>
              <div className={styles.moyenneInfo}>
                <Etoiles note={Math.round(moyenne)} />
                <span className={styles.compte}>
                  {avis.length} avis
                </span>
              </div>
            </Reveal>

            <div className={styles.grille}>
              {avis.map((a, i) => (
                <Reveal key={a.id} delay={i * 80} className={styles.carte}>
                  <div className={styles.carteTop}>
                    <span className={styles.prenom}>{a.prenom || 'Client'}</span>
                    <Etoiles note={a.note} />
                  </div>
                  {a.commentaire && <p className={styles.com}>{a.commentaire}</p>}
                  <span className={styles.date}>
                    {new Date(a.created_at || a.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </Reveal>
              ))}
            </div>
          </>
        )}

        <Footer />
      </div>
    </main>
  )
}
