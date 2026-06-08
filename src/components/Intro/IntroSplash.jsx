import { useEffect, useState } from 'react'
import styles from './IntroSplash.module.css'

// Écran d'intro « coup de rasoir » — joué une seule fois par session.
export default function IntroSplash() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    const dejaVu = sessionStorage.getItem('b95_intro')
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return !dejaVu && !reduit
  })

  useEffect(() => {
    if (!visible) return
    sessionStorage.setItem('b95_intro', '1')
    const t = setTimeout(() => setVisible(false), 2050)
    return () => clearTimeout(t)
  }, [visible])

  if (!visible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.mark}>
        BARBER<span className={styles.neuf}>95</span>
      </div>
      <span className={styles.blade} />
      <span className={styles.sous}>Coiffeur · Val-d’Oise</span>
    </div>
  )
}
