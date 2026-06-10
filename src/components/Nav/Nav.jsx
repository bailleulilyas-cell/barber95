import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  IconHome,
  IconScissors,
  IconCalendar,
  IconUser,
} from '../Icons'
import styles from './Nav.module.css'

const TABS_CLIENT = [
  { to: '/', label: 'Accueil', Icon: IconHome, end: true },
  { to: '/tarifs', label: 'Tarifs', Icon: IconScissors },
  { to: '/reserver', label: 'Réserver', Icon: IconCalendar },
  { to: '/mon-espace', label: 'Profil', Icon: IconUser },
]

const TABS_ADMIN = [
  { to: '/admin/dashboard', label: 'Dashboard', Icon: IconCalendar },
  { to: '/admin', label: 'Gestion', Icon: IconScissors, end: true },
  { to: '/admin/clients', label: 'Clients', Icon: IconUser },
  { to: '/', label: 'Site', Icon: IconHome, end: true },
]

export default function Nav() {
  const { configured, isAdmin } = useAuth()
  const admin = configured && isAdmin
  const tabs = admin ? TABS_ADMIN : TABS_CLIENT

  return (
    <nav className={`${styles.bar} ${admin ? styles.barAdmin : ''}`} aria-label="Navigation">
      <div className={styles.inner}>
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to + label}
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
      {admin && <span className={styles.adminTag}>ADMIN</span>}
    </nav>
  )
}
