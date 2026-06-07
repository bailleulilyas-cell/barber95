import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Nav from './Nav/Nav'
import Footer from './Footer/Footer'

// remonte en haut à chaque changement de page
function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function Layout() {
  return (
    <>
      <ScrollTop />
      <Outlet />
      <Nav />
    </>
  )
}

export { Footer }
