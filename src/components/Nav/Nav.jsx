import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { SITE } from '../../config'
import styles from './Nav.module.css'

const ITEMS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/galerie', label: 'Galerie' },
  { to: '/tarifs', label: 'Tarifs' },
  { to: '/reserver', label: 'Réserver' },
  { to: '/avis', label: 'Avis' },
  { to: '/mon-espace', label: 'Mon espace' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // referme le drawer mobile à chaque changement de page
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // bloque le scroll body quand le drawer est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const liste = (
    <ul className={styles.items}>
      {ITEMS.map((it, i) => (
        <li key={it.to}>
          <NavLink
            to={it.to}
            end={it.end}
            className={({ isActive }) => `${styles.item} ${isActive ? styles.actif : ''}`}
          >
            <span className={styles.bar} aria-hidden="true" />
            <span className={styles.index} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className={styles.label}>{it.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      {/* ── Burger mobile / tablette ── */}
      <button
        className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      {/* ── Rail vertical desktop ── */}
      <nav className={styles.rail} aria-label="Navigation principale">
        <NavLink to="/" end className={styles.wordmark}>
          {SITE.nom}
        </NavLink>
        {liste}
      </nav>

      {/* ── Drawer mobile / tablette ── */}
      <div
        className={`${styles.scrim} ${open ? styles.scrimOn : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside className={`${styles.drawer} ${open ? styles.drawerOn : ''}`} aria-hidden={!open}>
        <div className={styles.drawerWordmark}>{SITE.nom}</div>
        {liste}
        <div className={styles.drawerFoot}>{SITE.baseline}</div>
      </aside>
    </>
  )
}
