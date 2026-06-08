import styles from './Skeleton.module.css'

// Bloc de chargement « shimmer ». w/h en CSS (px ou %), radius optionnel.
export default function Skeleton({ w = '100%', h = 16, r = 8, style }) {
  return (
    <span
      className={styles.sk}
      style={{ width: w, height: typeof h === 'number' ? `${h}px` : h, borderRadius: r, ...style }}
    />
  )
}

// Carte squelette générique (pour listes)
export function SkeletonCard({ lines = 2 }) {
  return (
    <div className={styles.card}>
      <Skeleton w="60%" h={18} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} w={i === lines - 1 ? '40%' : '90%'} h={12} />
      ))}
    </div>
  )
}
