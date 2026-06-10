import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getRelanceSemaines, setRelanceSemaines } from '../../lib/api'
import { IconScissors, IconImage, IconHome, IconChevronRight } from '../../components/Icons'
import styles from './Reglages.module.css'

// Hub de configuration : tout ce qui n'est pas « la journée » ou « les
// réservations » se règle ici (tarifs, galerie, lien partageable, relance,
// accès au site public).
export default function Reglages() {
  const { configured } = useAuth()
  const toast = useToast()
  const [semaines, setSemaines] = useState(3)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!configured) return
    getRelanceSemaines()
      .then(setSemaines)
      .catch(() => {})
  }, [configured])

  const copierLien = async () => {
    const lien = `${window.location.origin}/book`
    try {
      await navigator.clipboard.writeText(lien)
      toast('Lien copié ✓ Colle-le sur WhatsApp ou Insta')
    } catch {
      toast(lien, 'error')
    }
  }

  const sauverSemaines = async () => {
    const n = Math.min(12, Math.max(1, parseInt(semaines, 10) || 3))
    setBusy(true)
    try {
      await setRelanceSemaines(n)
      setSemaines(n)
      toast(`Relance après ${n} semaine${n > 1 ? 's' : ''} ✓`)
    } catch (e) {
      toast(e.message || 'Erreur', 'error')
    } finally {
      setBusy(false)
    }
  }

  // empêche AdminLanding de rerediriger quand on va voir le site public
  const marquerVu = () => {
    try {
      sessionStorage.setItem('b95_admin_landed', '1')
    } catch {}
  }

  return (
    <main className="page">
      <div className="wrap">
        <header className={styles.head}>
          <span className={styles.eyebrow}>Espace Adam</span>
          <h1 className={styles.titre}>Réglages</h1>
        </header>

        {/* Prestation & tarifs */}
        <h2 className={styles.section}>Prestation & tarifs</h2>
        <Link to="/tarifs" className={styles.lien}>
          <span className={styles.lienIco}><IconScissors size={20} /></span>
          <span className={styles.lienTxt}>
            <span className={styles.lienTitre}>Modifier la prestation & les prix</span>
            <span className={styles.lienSub}>Prix normal et prix ami</span>
          </span>
          <IconChevronRight size={18} />
        </Link>

        {/* Galerie */}
        <h2 className={styles.section}>Galerie</h2>
        <Link to="/galerie" className={styles.lien}>
          <span className={styles.lienIco}><IconImage size={20} /></span>
          <span className={styles.lienTxt}>
            <span className={styles.lienTitre}>Gérer la galerie</span>
            <span className={styles.lienSub}>Ajouter / supprimer des photos & vidéos</span>
          </span>
          <IconChevronRight size={18} />
        </Link>

        {/* Lien de résa partageable */}
        <h2 className={styles.section}>Mon lien de résa</h2>
        <div className={styles.carte}>
          <p className={styles.carteSub}>À coller sur WhatsApp, en bio Instagram, partout.</p>
          <button className={styles.btnOr} onClick={copierLien}>Copier mon lien</button>
        </div>

        {/* Relance automatique */}
        <h2 className={styles.section}>Relance automatique</h2>
        <div className={styles.carte}>
          <label className={styles.relanceTxt} htmlFor="relance-semaines">
            Relancer par email les clients sans RDV depuis :
          </label>
          <div className={styles.relanceCtrl}>
            <input
              id="relance-semaines"
              type="number"
              min="1"
              max="12"
              value={semaines}
              onChange={(e) => setSemaines(e.target.value)}
              disabled={!configured}
            />
            <span>sem.</span>
            <button onClick={sauverSemaines} disabled={busy || !configured}>
              {busy ? '…' : 'OK'}
            </button>
          </div>
        </div>

        {/* Site public */}
        <h2 className={styles.section}>Site public</h2>
        <Link to="/" onClick={marquerVu} className={styles.lien}>
          <span className={styles.lienIco}><IconHome size={20} /></span>
          <span className={styles.lienTxt}>
            <span className={styles.lienTitre}>Voir le site public</span>
            <span className={styles.lienSub}>Comme le voient tes clients</span>
          </span>
          <IconChevronRight size={18} />
        </Link>
      </div>
    </main>
  )
}
