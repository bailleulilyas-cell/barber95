import { useCallback, useEffect, useRef, useState } from 'react'
import { GALERIE } from '../../data/mock'
import { configured } from '../../lib/supabase'
import { cloudinaryConfigured, uploadCloudinary } from '../../lib/cloudinary'
import { getGalerie, ajouterMedia, supprimerMedia } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import styles from './Gallery.module.css'

// Vidéo en autoplay fiable (force muted + play via ref).
function VideoTile({ src }) {
  const ref = useRef(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true
    v.defaultMuted = true
    const go = () => v.play().catch(() => {})
    if (v.readyState >= 2) go()
    else v.addEventListener('loadeddata', go, { once: true })
  }, [src])
  return <video ref={ref} src={src} autoPlay loop muted playsInline preload="auto" tabIndex={-1} />
}

export default function Gallery() {
  const { isAdmin } = useAuth()
  const fileRef = useRef(null)
  const zoneRef = useRef(null)
  const [items, setItems] = useState(configured ? [] : GALERIE)
  const [chargement, setChargement] = useState(configured)
  const [upload, setUpload] = useState(false)
  const [err, setErr] = useState(null)
  const [plein, setPlein] = useState(null)

  // ── carrousel contrôlé ──
  const [index, setIndex] = useState(0)
  const [cw, setCw] = useState(360)
  const [drag, setDrag] = useState(0)
  const dragRef = useRef({ active: false, startX: 0, moved: false })

  const charger = useCallback(async () => {
    if (!configured) return
    try {
      const data = await getGalerie()
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  // largeur du conteneur
  useEffect(() => {
    const maj = () => zoneRef.current && setCw(zoneRef.current.clientWidth)
    maj()
    window.addEventListener('resize', maj)
    return () => window.removeEventListener('resize', maj)
  }, [items.length])

  const W = Math.min(264, cw - 76)
  const H = Math.round(W * 1.34)
  const STEP = W + 16
  const maxIndex = Math.max(items.length - 1, 0)
  const offset = cw / 2 - (index * STEP + W / 2) + drag

  const onDown = (e) => {
    dragRef.current = { active: true, startX: e.clientX, moved: false }
  }
  const onMove = (e) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    if (Math.abs(dx) > 6) dragRef.current.moved = true
    setDrag(dx)
  }
  const onUp = () => {
    if (!dragRef.current.active) return
    const dx = drag
    dragRef.current.active = false
    setDrag(0)
    if (dx < -45 && index < maxIndex) setIndex((i) => i + 1)
    else if (dx > 45 && index > 0) setIndex((i) => i - 1)
  }

  const cliquer = (i) => {
    if (dragRef.current.moved) return
    if (i !== index) {
      setIndex(i)
      return
    }
    if (items[i]?.type !== 'video') setPlein(i)
  }

  // fermeture lightbox
  useEffect(() => {
    if (plein === null) return
    const onKey = (e) => e.key === 'Escape' && setPlein(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [plein])

  // ── admin upload ──
  const onFichiers = async (e) => {
    const files = [...e.target.files]
    if (!files.length) return
    if (!cloudinaryConfigured) {
      setErr('Cloudinary non configuré.')
      return
    }
    setUpload(true)
    setErr(null)
    try {
      for (const f of files) {
        const media = await uploadCloudinary(f)
        await ajouterMedia({ ...media, legende: '' })
      }
      await charger()
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setUpload(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const supprimer = async (id) => {
    try {
      await supprimerMedia(id)
      if (index > 0) setIndex((i) => Math.min(i, items.length - 2))
      await charger()
    } catch (e) {
      setErr(e.message)
    }
  }

  const adminActif = configured && isAdmin
  const vide = !chargement && items.length === 0
  const actuel = items[index]

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>Réalisations</span>
        {adminActif && (
          <>
            <button className={styles.ajouter} onClick={() => fileRef.current?.click()} disabled={upload}>
              {upload ? 'Envoi…' : '+ Ajouter'}
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={onFichiers} />
          </>
        )}
      </div>

      {err && <p className={styles.err}>{err}</p>}

      {chargement ? (
        <p className={styles.etat}>Chargement…</p>
      ) : vide ? (
        <p className={styles.etat}>
          {adminActif ? 'Aucun média — clique « + Ajouter ».' : 'Galerie bientôt disponible.'}
        </p>
      ) : (
        <>
          <div
            className={styles.zone}
            ref={zoneRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            onPointerCancel={onUp}
          >
            <div
              className={styles.track}
              style={{
                transform: `translateX(${offset}px)`,
                transition: dragRef.current.active ? 'none' : 'transform 0.45s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              {items.map((g, i) => (
                <figure
                  key={g.id || i}
                  className={`${styles.item} ${i === index ? styles.focus : ''}`}
                  style={{ width: W }}
                  onClick={() => cliquer(i)}
                >
                  <div className={styles.media} style={{ height: H }}>
                    {g.url ? (
                      g.type === 'video' ? (
                        <VideoTile src={g.url} />
                      ) : (
                        <img src={g.url} alt={g.legende || 'Coupe'} draggable="false" />
                      )
                    ) : (
                      <div className={styles.placeholder}>{String(i + 1).padStart(2, '0')}</div>
                    )}
                    {adminActif && (
                      <button
                        className={styles.suppr}
                        onClick={(e) => {
                          e.stopPropagation()
                          supprimer(g.id)
                        }}
                        aria-label="Supprimer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {g.legende ? <figcaption className={styles.legende}>{g.legende}</figcaption> : null}
                </figure>
              ))}
            </div>
          </div>

          <div className={styles.dots}>
            {items.map((g, i) => (
              <button
                key={g.id || i}
                className={`${styles.dot} ${i === index ? styles.dotOn : ''}`}
                aria-label={`Média ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>

          <p className={styles.hint}>
            {actuel?.type === 'video' ? 'Glisse pour la suite' : 'Glisse · touche pour agrandir'}
          </p>
        </>
      )}

      {plein !== null && items[plein] && (
        <div className={styles.lightbox} onClick={() => setPlein(null)}>
          <button className={styles.fermer} aria-label="Fermer">✕</button>
          <div className={styles.lbMedia} onClick={(e) => e.stopPropagation()}>
            {items[plein].url ? (
              items[plein].type === 'video' ? (
                <video src={items[plein].url} controls autoPlay playsInline />
              ) : (
                <img src={items[plein].url} alt={items[plein].legende || 'Coupe'} />
              )
            ) : (
              <div className={styles.lbPlaceholder}>{String(plein + 1).padStart(2, '0')}</div>
            )}
            {items[plein].legende ? <span className={styles.lbLegende}>{items[plein].legende}</span> : null}
          </div>
        </div>
      )}
    </main>
  )
}
