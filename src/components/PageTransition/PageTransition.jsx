import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './PageTransition.module.css'

// Transition sèche (interaction C) : à chaque changement de route, un overlay
// kaki couvre l'écran (scaleX 0→1, 0.2s depuis la droite) puis se retire
// (0.2s vers la gauche). Sensation nette, pas de fondu.
export default function PageTransition() {
  const { pathname } = useLocation()
  const [phase, setPhase] = useState('idle') // 'idle' | 'cover' | 'reveal'
  const premier = useRef(true)

  useEffect(() => {
    // pas d'animation au tout premier rendu
    if (premier.current) {
      premier.current = false
      return
    }
    setPhase('cover')
    const t1 = setTimeout(() => setPhase('reveal'), 200)
    const t2 = setTimeout(() => setPhase('idle'), 400)
    // ramène le scroll en haut quand l'écran est couvert
    const t3 = setTimeout(() => window.scrollTo(0, 0), 190)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [pathname])

  return (
    <div
      className={`${styles.overlay} ${
        phase === 'cover' ? styles.cover : phase === 'reveal' ? styles.reveal : ''
      }`}
      aria-hidden="true"
    />
  )
}
