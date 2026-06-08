import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './CutTransition.module.css'

// Transition « coup de ciseaux » : à chaque changement de page, deux panneaux
// se referment au centre (la coupe), puis se rouvrent en révélant la page.
export default function CutTransition() {
  const { pathname } = useLocation()
  const [coupe, setCoupe] = useState(false)
  const premier = useRef(true)

  useEffect(() => {
    if (premier.current) {
      premier.current = false
      return
    }
    setCoupe(true)
    const t1 = setTimeout(() => {
      window.scrollTo(0, 0) // pendant que l'écran est couvert
      setCoupe(false)
    }, 240)
    return () => clearTimeout(t1)
  }, [pathname])

  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={`${styles.panneau} ${styles.haut} ${coupe ? styles.ferme : ''}`} />
      <div className={`${styles.panneau} ${styles.bas} ${coupe ? styles.ferme : ''}`} />
    </div>
  )
}
