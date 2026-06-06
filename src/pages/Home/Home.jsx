import { useNavigate } from 'react-router-dom'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import { SITE } from '../../config'
import styles from './Home.module.css'

export default function Home() {
  const navigate = useNavigate()
  return (
    <main className={styles.home}>
      <div className={styles.inner}>
        <span className={styles.eyebrow}>{SITE.baseline}</span>
        <h1 className={styles.titre} aria-label={SITE.nom}>
          <span>BARBER</span>
          <span className={styles.neuf}>95</span>
        </h1>
        <p className={styles.sous}>
          Coupe sur rendez-vous. Précision, contours nets, sans chichi.
        </p>
        <div className={styles.cta}>
          <MagneticButton onClick={() => navigate('/reserver')}>Réserver</MagneticButton>
        </div>
      </div>

      <div className={styles.coin} aria-hidden="true">
        <span>EST. 95</span>
      </div>
    </main>
  )
}
