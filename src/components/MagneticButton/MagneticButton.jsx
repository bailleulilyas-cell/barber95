import { useMagnetic } from '../../hooks/useMagnetic'
import styles from './MagneticButton.module.css'

// Bouton magnétique réutilisable.
// variant: 'solid' (kaki plein) | 'ghost' (contour)
// as: 'button' (défaut) — on passe onClick ; pour navigation, utiliser
// le prop `as={Link}` via render-prop n'est pas nécessaire ici, on garde
// un <button> et on laisse le parent gérer la navigation.
export default function MagneticButton({
  children,
  variant = 'solid',
  className = '',
  force,
  ...rest
}) {
  const ref = useMagnetic(force ? { force } : undefined)
  return (
    <button
      ref={ref}
      className={`${styles.btn} ${styles[variant]} ${className}`}
      {...rest}
    >
      <span className={styles.label}>{children}</span>
    </button>
  )
}
