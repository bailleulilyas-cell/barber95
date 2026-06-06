import { Link } from 'react-router-dom'
import { SITE } from '../../config'
import styles from './Footer.module.css'

export default function Footer() {
  const { instagram, tel, adresse } = SITE.contact
  const aContact = instagram || tel || adresse

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.mark}>{SITE.nom}</div>
        <div className={styles.base}>{SITE.baseline}</div>
      </div>

      {aContact ? (
        <div className={styles.contact}>
          {instagram && (
            <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer">
              Instagram @{instagram}
            </a>
          )}
          {tel && <a href={`tel:${tel.replace(/\s/g, '')}`}>{tel}</a>}
          {adresse && <span>{adresse}</span>}
        </div>
      ) : (
        <div className={styles.contactVide}>Contact à venir</div>
      )}

      <div className={styles.bas}>
        <span>© {new Date().getFullYear()} {SITE.nom}</span>
        <span className={styles.sep}>·</span>
        <Link to="/mentions-legales">Mentions légales</Link>
        <span className={styles.sep}>·</span>
        <Link to="/confidentialite">Confidentialité</Link>
      </div>
    </footer>
  )
}
