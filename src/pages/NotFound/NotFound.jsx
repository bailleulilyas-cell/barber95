import { useNavigate } from 'react-router-dom'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import styles from './NotFound.module.css'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <main className={styles.nf}>
      <div className={styles.inner}>
        <span className="eyebrow">Erreur 404</span>
        <h1 className={styles.titre}>Page introuvable</h1>
        <p className={styles.txt}>Ce créneau n’existe pas. Reviens à l’accueil.</p>
        <MagneticButton onClick={() => navigate('/')}>Accueil</MagneticButton>
      </div>
    </main>
  )
}
