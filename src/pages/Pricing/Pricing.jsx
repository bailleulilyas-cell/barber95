import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import { IconClock } from '../../components/Icons'
import { PRESTATIONS, FIDELITE } from '../../config'
import { configured } from '../../lib/supabase'
import { getPrestation } from '../../lib/api'
import styles from './Pricing.module.css'

export default function Pricing() {
  const navigate = useNavigate()
  const [presta, setPresta] = useState(PRESTATIONS[0])

  useEffect(() => {
    if (configured) getPrestation().then((p) => p && setPresta(p)).catch(() => {})
  }, [])

  return (
    <main className="page">
      <div className="wrap">
        <header className={styles.head}>
          <h1 className="titrePage">Tarifs</h1>
          <p className={styles.sub}>La prestation BARBER95</p>
        </header>

        <article className={styles.card} onClick={() => navigate('/reserver')}>
          <div className={styles.cardTop}>
            <h2 className={styles.nom}>{presta.nom}</h2>
            <span className="badge badge-or">Populaire</span>
          </div>
          <p className={styles.desc}>
            {presta.description || 'Coupe homme, finitions soignées au millimètre.'}
          </p>
          <div className={styles.cardBas}>
            <span className={styles.prix}>{presta.prix}€</span>
            <span className={styles.duree}>
              <IconClock size={16} /> {presta.duree_minutes} min
            </span>
          </div>
        </article>

        <div className={styles.fid}>
          <span className={styles.fidTitre}>Fidélité</span>
          <p className={styles.fidTxt}>
            1 coupe = 1 point. À {FIDELITE.objectif} points,{' '}
            {FIDELITE.recompense.toLowerCase()}.
          </p>
        </div>

        <MagneticButton className={styles.cta} onClick={() => navigate('/reserver')}>
          Réserver maintenant
        </MagneticButton>
      </div>
    </main>
  )
}
