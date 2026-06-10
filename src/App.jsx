import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home/Home'
import Gallery from './pages/Gallery/Gallery'
import Pricing from './pages/Pricing/Pricing'
import Booking from './pages/Booking/Booking'
import Reviews from './pages/Reviews/Reviews'
import ReviewForm from './pages/Reviews/ReviewForm'
import Account from './pages/Account/Account'
import Admin from './pages/Admin/Admin'
import Jour from './pages/Admin/Jour'
import Clients from './pages/Admin/Clients'
import Reglages from './pages/Admin/Reglages'

// chargé à la demande : Recharts (graphes) ne doit peser que pour Adam
const Dashboard = lazy(() => import('./pages/Admin/Dashboard'))
import Legal from './pages/Legal/Legal'
import NotFound from './pages/NotFound/NotFound'
import CompleteProfile from './pages/Profile/CompleteProfile'
import { BookLien, RefLien } from './pages/Liens/Liens'
import { RequireProfile, RequireAdmin } from './components/Auth/Guards'
import AdminLanding from './components/Auth/AdminLanding'
import IntroSplash from './components/Intro/IntroSplash'
import InstallGate from './components/Install/InstallGate'

export default function App() {
  return (
    <>
      <IntroSplash />
      <InstallGate />
      <AdminLanding />
      <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/galerie" element={<Gallery />} />
        <Route path="/tarifs" element={<Pricing />} />
        <Route
          path="/reserver"
          element={
            <RequireProfile>
              <Booking />
            </RequireProfile>
          }
        />
        <Route path="/avis" element={<Reviews />} />
        <Route path="/avis/nouveau" element={<ReviewForm />} />
        <Route path="/mon-espace" element={<Account />} />
        <Route path="/profil" element={<CompleteProfile />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <RequireAdmin>
              <Suspense fallback={<main className="page" />}>
                <Dashboard />
              </Suspense>
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/clients"
          element={
            <RequireAdmin>
              <Clients />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/reglages"
          element={
            <RequireAdmin>
              <Reglages />
            </RequireAdmin>
          }
        />
        <Route path="/book" element={<BookLien />} />
        <Route path="/ref/:code" element={<RefLien />} />
        <Route path="/mentions-legales" element={<Legal type="mentions" />} />
        <Route path="/confidentialite" element={<Legal type="confidentialite" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      {/* plein écran, sans barre de nav : « Ma journée en un swipe » */}
      <Route
        path="/admin/jour"
        element={
          <RequireAdmin>
            <Jour />
          </RequireAdmin>
        }
      />
      </Routes>
    </>
  )
}
