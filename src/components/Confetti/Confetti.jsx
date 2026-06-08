import { useMemo } from 'react'
import styles from './Confetti.module.css'

// Pluie de confettis dorés, jouée une fois (le parent contrôle l'affichage).
const COULEURS = ['#e8c766', '#c9a84c', '#fff0c0', '#ffffff', '#d8b85a']

export default function Confetti({ n = 40 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        dur: 1.2 + Math.random() * 1.1,
        bg: COULEURS[i % COULEURS.length],
        rot: Math.random() * 360,
        size: 6 + Math.random() * 6,
        rond: Math.random() > 0.6,
      })),
    [n]
  )

  return (
    <div className={styles.zone} aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={styles.piece}
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.bg,
            borderRadius: p.rond ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}
