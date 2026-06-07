import { NavLink } from 'react-router-dom'
import { IconHome, IconScissors, IconCalendar, IconUser } from '../Icons'
import styles from './Nav.module.css'

const TABS = [
  { to: '/', label: 'Accueil', Icon: IconHome, end: true },
  { to: '/tarifs', label: 'Tarifs', Icon: IconScissors },
  { to: '/reserver', label: 'Réserver', Icon: IconCalendar },
  { to: '/mon-espace', label: 'Profil', Icon: IconUser },
]

export default function Nav() {
  return (
    <nav className={styles.bar} aria-label="Navigation principale">
      <div className={styles.inner}>
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.actif : ''}`}
          >
            <span className={styles.ico}>
              <Icon size={23} />
            </span>
            <span className={styles.label}>{label}</span>
            <span className={styles.dot} aria-hidden="true" />
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
