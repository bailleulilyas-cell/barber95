import { Outlet } from 'react-router-dom'
import Nav from './Nav/Nav'
import Footer from './Footer/Footer'
import CutTransition from './Transition/CutTransition'

export default function Layout() {
  return (
    <>
      <CutTransition />
      <Outlet />
      <Nav />
    </>
  )
}

export { Footer }
