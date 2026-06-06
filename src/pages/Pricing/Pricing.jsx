import { useNavigate } from 'react-router-dom'
import Reveal from '../../components/Reveal/Reveal'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import { Footer } from '../../components/Layout'
import { PRESTATIONS, FIDELITE } from '../../config'
import styles from './Pricing.module.css'

export default function Pricing() {
  const navigate = useNavigate()
  return (
    <main className="page">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">Prestations</span>
          <h1 className={styles.titre}>Tarifs</h1>
        </Reveal>

        <div className={styles.liste}>
          {PRESTATIONS.map((p, i) => (
            <Reveal key={p.id} delay={i * 90} className={styles.ligne}>
              <div className={styles.gauche}>
                <span className={styles.nom}>{p.nom}</span>
                {p.description && <span className={styles.desc}>{p.description}</span>}
              </div>
              <span className={styles.duree}>{p.duree_minutes} min</span>
              <span className={styles.prix}>{p.prix}€</span>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className={styles.fidNote}>
          Fidélité : 1 coupe = 1 point. À {FIDELITE.objectif} points, {FIDELITE.recompense.toLowerCase()}.
        </Reveal>

        <Reveal delay={180} className={styles.cta}>
          <MagneticButton onClick={() => navigate('/reserver')}>Réserver</MagneticButton>
        </Reveal>

        <Footer />
      </div>
    </main>
  )
}
