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
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|Line\//i.test(ua)
  const samsung = /SamsungBrowser/i.test(ua)
  const ios = /iPhone|iPad|iPod/i.test(ua)
  const android = /Android/i.test(ua)
  return { inApp, samsung, ios, android, desktop: !ios && !android }
}

export default function InstallGate() {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false
    if (estStandalone()) return false
    if (sessionStorage.getItem('b95_install_skip')) return false
    return true
  })
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

  const passer = () => {
    sessionStorage.setItem('b95_install_skip', '1')
    setShow(false)
  }

  const installer = async () => {
    if (!promptEvt) return
    promptEvt.prompt()
    const { outcome } = await promptEvt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPromptEvt(null)
  }

  // ── Écran de succès après installation ──
  if (installed) {
    return (
      <div className={styles.overlay}>
        <div className={styles.inner}>
          <div className={styles.check}>✓</div>
          <h1 className={styles.titre}>C’est installé !</h1>
          <p className={styles.sous}>
            Ferme cet onglet et ouvre <strong className={styles.gold}>BARBER95</strong> depuis l’icône
            sur ton écran d’accueil. Tu auras l’appli en plein écran.
          </p>
          <button className={styles.skip} onClick={passer}>
            Continuer ici en attendant
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          BARBER<span className={styles.neuf}>95</span>
        </div>
        <h1 className={styles.titre}>Installe l’appli</h1>
        <p className={styles.sous}>
          Ajoute BARBER95 à ton écran d’accueil — ça s’ouvre comme une vraie appli, en plein écran.
        </p>

        {/* bouton d'installation direct si le navigateur le permet (Chrome, Samsung, Edge…) */}
        {promptEvt && !plat.inApp && (
          <div className={styles.bloc}>
            <button className={styles.installBtn} onClick={installer}>
              📲 Installer l’application
            </button>
          </div>
        )}

        {/* in-app (Instagram, TikTok…) */}
        {plat.inApp && (
          <div className={styles.bloc}>
            <p className={styles.warn}>
              Tu es dans le navigateur d’une autre appli. Pour installer, ouvre d’abord ce lien dans{' '}
              <strong>Safari</strong> (iPhone) ou <strong>Chrome</strong> (Android).
            </p>
            <ol className={styles.steps}>
              <li>Touche le menu <strong>•••</strong> en haut</li>
              <li>Choisis <strong>« Ouvrir dans le navigateur »</strong></li>
            </ol>
          </div>
        )}

        {/* iPhone (Safari) */}
        {!plat.inApp && plat.ios && (
          <div className={styles.bloc}>
            <ol className={styles.steps}>
              <li>
                Touche <strong>Partager</strong>{' '}
                <span className={styles.share} aria-hidden="true">⎙</span> en bas de Safari
              </li>
              <li>Choisis <strong>« Sur l’écran d’accueil »</strong></li>
              <li>Touche <strong>Ajouter</strong> 🎉</li>
            </ol>
          </div>
        )}

        {/* Samsung Internet (menu différent de Chrome) */}
        {!plat.inApp && plat.samsung && !promptEvt && (
          <div className={styles.bloc}>
            <ol className={styles.steps}>
              <li>Touche le menu <strong>☰</strong> en bas à droite</li>
              <li>Choisis <strong>« Ajouter la page à »</strong></li>
              <li>Puis <strong>« Écran d’accueil »</strong> 🎉</li>
            </ol>
          </div>
        )}

        {/* Android Chrome (sans bouton auto) */}
        {!plat.inApp && plat.android && !plat.samsung && !promptEvt && (
          <div className={styles.bloc}>
            <ol className={styles.steps}>
              <li>Touche le menu <strong>⋮</strong> en haut de Chrome</li>
              <li>Choisis <strong>« Installer l’application »</strong> ou <strong>« Ajouter à l’écran d’accueil »</strong></li>
              <li>Confirme 🎉</li>
            </ol>
          </div>
        )}

        {/* Desktop sans prompt */}
        {!plat.inApp && plat.desktop && !promptEvt && (
          <div className={styles.bloc}>
            <p className={styles.warn}>
              Sur ordinateur, clique l’icône d’installation dans la barre d’adresse — ou ouvre le
              site sur ton téléphone.
            </p>
          </div>
        )}

        <button className={styles.skip} onClick={passer}>
          Continuer sans installer
        </button>
      </div>
    </div>
  )
}
