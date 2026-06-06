import { useAuth } from '../../context/AuthContext'
import MagneticButton from '../MagneticButton/MagneticButton'
import styles from './Auth.module.css'

// Écran de connexion (Google OAuth). `titre`/`txt` personnalisables.
export default function LoginScreen({
  titre = 'Connexion',
  txt = 'Connecte-toi pour accéder à ton espace.',
  redirect = '/mon-espace',
}) {
  const { signInWithGoogle } = useAuth()
  return (
    <main className="page">
      <div className="wrap">
        <span className="eyebrow">Espace client</span>
        <h1 className={styles.titre}>{titre}</h1>
        <p className={styles.txt}>{txt}</p>
        <MagneticButton onClick={() => signInWithGoogle(redirect)}>
          <span className={styles.g}>G</span> Continuer avec Google
        </MagneticButton>
      </div>
    </main>
  )
}
