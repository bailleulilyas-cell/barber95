import { Outlet } from 'react-router-dom'
import Nav from './Nav/Nav'
import Footer from './Footer/Footer'
import PageTransition from './PageTransition/PageTransition'

export default function Layout() {
  return (
    <>
      <PageTransition />
      <Nav />
      <Outlet />
    </>
  )
}

// Footer réutilisable dans les pages de contenu (pas sur l'accueil plein écran).
export { Footer }
