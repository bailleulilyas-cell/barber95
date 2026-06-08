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
  const ios = /iPhone|iPad|iPod/i.test(ua)
  const android = /Android/i.test(ua)
  return { inApp, ios, android, desktop: !ios && !android }
}

export default function InstallGate() {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false
    if (estStandalone()) return false
    if (sessionStorage.getItem('b95_install_skip')) return false
    return true
  })
  const [promptEvt, setPromptEvt] = useState(null)
  const plat = typeof navigator !== 'undefined' ? detecter() : {}

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setPromptEvt(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!show) return null

  const passer = () => {
    sessionStorage.setItem('b95_install_skip', '1')
    setShow(false)
  }

  const installerAndroid = async () => {
    if (!promptEvt) return
    promptEvt.prompt()
    const { outcome } = await promptEvt.userChoice
    if (outcome === 'accepted') setShow(false)
    setPromptEvt(null)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          BARBER<span className={styles.neuf}>95</span>
        </div>
        <h1 className={styles.titre}>Installe l’appli</h1>
        <p className={styles.sous}>
          Pour la meilleure expérience, ajoute BARBER95 à ton écran d’accueil — ça s’ouvre comme une
          vraie appli, en un tap.
        </p>

        {/* ── Navigateur in-app (Instagram, TikTok…) ── */}
        {plat.inApp && (
          <div className={styles.bloc}>
            <p className={styles.warn}>
              Tu es dans le navigateur d’une appli (Instagram/TikTok). Pour installer, ouvre d’abord
              ce lien dans <strong>Safari</strong> (iPhone) ou <strong>Chrome</strong> (Android).
            </p>
            <ol className={styles.steps}>
              <li>Touche le menu <strong>•••</strong> en haut</li>
              <li>Choisis <strong>« Ouvrir dans le navigateur »</strong></li>
            </ol>
          </div>
        )}

        {/* ── iPhone (Safari) ── */}
        {!plat.inApp && plat.ios && (
          <div className={styles.bloc}>
            <ol className={styles.steps}>
              <li>
                Touche <strong>Partager</strong>{' '}
                <span className={styles.share} aria-hidden="true">⎙</span> en bas de Safari
              </li>
              <li>
                Fais défiler et choisis <strong>« Sur l’écran d’accueil »</strong>
              </li>
              <li>
                Touche <strong>Ajouter</strong> — l’icône BARBER95 apparaît 🎉
              </li>
            </ol>
          </div>
        )}

        {/* ── Android ── */}
        {!plat.inApp && plat.android && (
          <div className={styles.bloc}>
            {promptEvt ? (
              <button className={styles.installBtn} onClick={installerAndroid}>
                📲 Installer l’application
              </button>
            ) : (
              <ol className={styles.steps}>
                <li>Touche le menu <strong>⋮</strong> en haut de Chrome</li>
                <li>Choisis <strong>« Ajouter à l’écran d’accueil »</strong></li>
                <li>Confirme — c’est installé 🎉</li>
              </ol>
            )}
          </div>
        )}

        {/* ── Desktop ── */}
        {!plat.inApp && plat.desktop && (
          <div className={styles.bloc}>
            {promptEvt ? (
              <button className={styles.installBtn} onClick={installerAndroid}>
                📲 Installer l’application
              </button>
            ) : (
              <p className={styles.warn}>
                Sur ordinateur, clique l’icône d’installation dans la barre d’adresse du navigateur —
                ou ouvre simplement le site sur ton téléphone.
              </p>
            )}
          </div>
        )}

        <button className={styles.skip} onClick={passer}>
          Continuer sans installer
        </button>
      </div>
    </div>
  )
}
