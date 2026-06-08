import { useEffect, useState } from 'react'
import styles from './InstallGate.module.css'

function estStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}
function detecter() {
  const ua = navigator.userAgent || ''
  return {
    inApp: /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|Line\//i.test(ua),
    samsung: /SamsungBrowser/i.test(ua),
    ios: /iPhone|iPad|iPod/i.test(ua),
    android: /Android/i.test(ua),
    desktop: !/iPhone|iPad|iPod|Android/i.test(ua),
  }
}

export default function InstallGate() {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false
    if (estStandalone()) return false
    if (localStorage.getItem('b95_install_off')) return false
    return true
  })
  const [open, setOpen] = useState(false)
  const [promptEvt, setPromptEvt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const plat = typeof navigator !== 'undefined' ? detecter() : {}

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setPromptEvt(e)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!show) return null

  const fermer = () => {
    localStorage.setItem('b95_install_off', '1')
    setShow(false)
  }

  const cliquerInstaller = async () => {
    if (promptEvt) {
      promptEvt.prompt()
      const { outcome } = await promptEvt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setPromptEvt(null)
    } else {
      setOpen(true)
    }
  }

  if (installed) {
    return (
      <div className={styles.scrim} onClick={fermer}>
        <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
          <div className={styles.check}>✓</div>
          <h2 className={styles.titre}>C’est installé !</h2>
          <p className={styles.txt}>
            Ouvre <strong className={styles.gold}>BARBER95</strong> depuis l’icône sur ton écran
            d’accueil pour l’avoir en plein écran.
          </p>
          <button className={styles.cta} onClick={fermer}>Compris</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* bannière discrète */}
      <div className={styles.banner}>
        <div className={styles.bIcon}>📲</div>
        <div className={styles.bText}>
          <span className={styles.bT}>Installer l’appli</span>
          <span className={styles.bS}>Accès rapide, plein écran</span>
        </div>
        <button className={styles.bBtn} onClick={cliquerInstaller}>
          {promptEvt ? 'Installer' : 'Voir'}
        </button>
        <button className={styles.bClose} onClick={fermer} aria-label="Fermer">✕</button>
      </div>

      {/* instructions (si pas de bouton natif) */}
      {open && (
        <div className={styles.scrim} onClick={() => setOpen(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHead}>
              <h2 className={styles.titre}>Ajouter à l’écran d’accueil</h2>
              <button className={styles.x} onClick={() => setOpen(false)}>✕</button>
            </div>

            {plat.inApp && (
              <ol className={styles.steps}>
                <li>Touche le menu <strong>•••</strong> en haut</li>
                <li>Choisis <strong>« Ouvrir dans le navigateur »</strong> (Safari/Chrome)</li>
                <li>Reviens ici et touche « Voir »</li>
              </ol>
            )}
            {!plat.inApp && plat.ios && (
              <ol className={styles.steps}>
                <li>Touche <strong>Partager</strong> <span className={styles.share}>⎙</span> en bas de Safari</li>
                <li>Choisis <strong>« Sur l’écran d’accueil »</strong></li>
                <li>Touche <strong>Ajouter</strong> 🎉</li>
              </ol>
            )}
            {!plat.inApp && plat.samsung && (
              <ol className={styles.steps}>
                <li>Touche le menu <strong>☰</strong> en bas à droite</li>
                <li><strong>« Ajouter la page à »</strong> → <strong>« Écran d’accueil »</strong></li>
              </ol>
            )}
            {!plat.inApp && plat.android && !plat.samsung && (
              <>
                <ol className={styles.steps}>
                  <li>Menu <strong>⋮</strong> en haut de Chrome</li>
                  <li><strong>« Installer l’application »</strong></li>
                </ol>
                <p className={styles.note}>
                  Android peut afficher un avertissement générique : c’est normal pour les applis web,
                  touche <strong>« Installer quand même »</strong>.
                </p>
              </>
            )}
            {!plat.inApp && plat.desktop && (
              <p className={styles.txt}>
                Clique l’icône d’installation dans la barre d’adresse de ton navigateur, ou ouvre le
                site sur ton téléphone.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
