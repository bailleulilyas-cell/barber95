import { IconScissors } from '../Icons'
import styles from './LoyaltyCard.module.css'

// Carte de fidélité « à tampons » : chaque coupe = une case tamponnée (or).
// La dernière case est la récompense (coupe offerte).
export default function LoyaltyCard({ points = 0, objectif = 10 }) {
  const cases = Array.from({ length: objectif }, (_, i) => i)
  const restant = Math.max(objectif - points, 0)

  return (
    <div className={styles.carte}>
      <div className={styles.head}>
        <span className={styles.titre}>Carte de fidélité</span>
        <span className={styles.compteur}>
          {Math.min(points, objectif)}/{objectif}
        </span>
      </div>

      <div className={styles.grille}>
        {cases.map((i) => {
          const tamponne = i < points
          const cadeau = i === objectif - 1
          return (
            <div
              key={i}
              className={`${styles.case} ${tamponne ? styles.tamponne : ''} ${
                cadeau ? styles.cadeau : ''
              }`}
              style={tamponne ? { animationDelay: `${i * 60}ms` } : undefined}
            >
              {tamponne ? (
                cadeau ? (
                  <span className={styles.gift}>★</span>
                ) : (
                  <IconScissors size={18} />
                )
              ) : cadeau ? (
                <span className={styles.giftVide}>🎁</span>
              ) : (
                <span className={styles.num}>{i + 1}</span>
              )}
            </div>
          )
        })}
      </div>

      <p className={styles.txt}>
        {restant > 0
          ? `Encore ${restant} coupe${restant > 1 ? 's' : ''} avant une offerte 🎁`
          : '🎉 Une coupe offerte t’attend !'}
      </p>
    </div>
  )
}
