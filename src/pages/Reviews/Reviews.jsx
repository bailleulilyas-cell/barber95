import { useEffect, useState } from 'react'
import { IconStar } from '../../components/Icons'
import { AVIS } from '../../data/mock'
import { configured } from '../../lib/supabase'
import { getAvisVisibles } from '../../lib/api'
import { SkeletonCard } from '../../components/Skeleton/Skeleton'
import styles from './Reviews.module.css'

function Etoiles({ note, size = 14 }) {
  return (
    <span className={styles.etoiles} aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= note ? styles.pleine : styles.vide}>
          <IconStar size={size} fill={n <= note} />
        </span>
      ))}
    </span>
  )
}

export default function Reviews() {
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
        <header className={styles.head}>
          <h1 className="titrePage">Avis</h1>
          <p className={styles.sub}>Ils sont passés chez BARBER95</p>
        </header>

        {chargement ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={1} />
          </div>
        ) : avis.length === 0 ? (
          <p className={styles.etat}>
            Pas encore d’avis. Les premiers retours apparaîtront ici après les premières coupes.
          </p>
        ) : (
          <>
            <section className={styles.moyenne}>
              <span className={styles.note}>{moyenne.toFixed(1)}</span>
              <div className={styles.moyenneInfo}>
                <Etoiles note={Math.round(moyenne)} size={18} />
                <span className={styles.compte}>{avis.length} avis</span>
              </div>
            </section>

            <div className={styles.grille}>
              {avis.map((a) => (
                <article key={a.id} className={styles.carte}>
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
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
