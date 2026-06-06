import { useCallback, useEffect, useRef, useState } from 'react'
import { GALERIE } from '../../data/mock'
import { configured } from '../../lib/supabase'
import { cloudinaryConfigured, uploadCloudinary } from '../../lib/cloudinary'
import { getGalerie, ajouterMedia, supprimerMedia } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import styles from './Gallery.module.css'

// Vidéo en lecture auto fiable : React n'applique pas toujours `muted` sur le DOM,
// ce qui fait bloquer l'autoplay par le navigateur. On force muted + play() via ref.
function VideoTile({ src }) {
  const ref = useRef(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true
    v.defaultMuted = true
    const lancer = () => v.play().catch(() => {})
    if (v.readyState >= 2) lancer()
    else v.addEventListener('loadeddata', lancer, { once: true })
  }, [src])
  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      tabIndex={-1}
    />
  )
}

export default function Gallery() {
  const { isAdmin } = useAuth()
  const trackRef = useRef(null)
  const itemRefs = useRef([])
  const fileRef = useRef(null)
  const [actif, setActif] = useState(0)
  const [plein, setPlein] = useState(null)
  const [items, setItems] = useState(configured ? [] : GALERIE)
  const [chargement, setChargement] = useState(configured)
  const [upload, setUpload] = useState(false)
  const [err, setErr] = useState(null)

  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false })

  const charger = useCallback(async () => {
    if (!configured) return
    try {
      const data = await getGalerie()
      setItems(data)
    } catch {
      // table pas encore créée ou indisponible → galerie vide (pas d'erreur publique)
      setItems([])
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  // focus central + dots
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = null
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        const centre = track.scrollLeft + track.clientWidth / 2
        let best = 0
        let bestD = Infinity
        itemRefs.current.forEach((el, i) => {
          if (!el) return
          const c = el.offsetLeft + el.offsetWidth / 2
          const d = Math.abs(c - centre)
          if (d < bestD) {
            bestD = d
            best = i
          }
        })
        setActif(best)
      })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => track.removeEventListener('scroll', onScroll)
  }, [items])

  const onDown = (e) => {
    if (e.pointerType === 'touch') return
    const track = trackRef.current
    drag.current = { down: true, startX: e.clientX, startScroll: track.scrollLeft, moved: false }
    track.setPointerCapture(e.pointerId)
  }
  const onMove = (e) => {
    if (!drag.current.down) return
    const dx = e.clientX - drag.current.startX
    if (Math.abs(dx) > 4) drag.current.moved = true
    trackRef.current.scrollLeft = drag.current.startScroll - dx
  }
  const onUp = (e) => {
    if (!drag.current.down) return
    drag.current.down = false
    try {
      trackRef.current.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const ouvrir = (i) => {
    if (drag.current.moved) return
    setPlein(i)
  }
  const allerA = (i) => {
    const el = itemRefs.current[i]
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  useEffect(() => {
    if (plein === null) return
    const onKey = (e) => e.key === 'Escape' && setPlein(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [plein])

  // ── admin : upload ──
  const onFichiers = async (e) => {
    const files = [...e.target.files]
    if (!files.length) return
    if (!cloudinaryConfigured) {
      setErr('Cloudinary non configuré (clés manquantes).')
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
      await charger()
    } catch (e) {
      setErr(e.message)
    }
  }

  const adminActif = configured && isAdmin
  const vide = !chargement && items.length === 0

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>Réalisations</span>
        {adminActif && (
          <>
            <button
              className={styles.ajouter}
              onClick={() => fileRef.current?.click()}
              disabled={upload}
            >
              {upload ? 'Envoi…' : '+ Ajouter'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={onFichiers}
            />
          </>
        )}
      </div>

      {err && <p className={styles.err}>{err}</p>}

      {chargement ? (
        <p className={styles.etat}>Chargement…</p>
      ) : vide ? (
        <p className={styles.etat}>
          {adminActif
            ? 'Aucun média pour l’instant — clique « + Ajouter » pour publier tes premières coupes.'
            : 'Galerie bientôt disponible.'}
        </p>
      ) : (
        <>
          <div
            className={styles.track}
            ref={trackRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <div className={styles.spacer} aria-hidden="true" />
            {items.map((g, i) => (
              <figure
                key={g.id}
                ref={(el) => (itemRefs.current[i] = el)}
                className={`${styles.item} ${i === actif ? styles.focus : ''}`}
                onClick={() => g.type !== 'video' && ouvrir(i)}
              >
                <div className={styles.media}>
                  {g.url ? (
                    g.type === 'video' ? (
                      // vidéo : lecture continue en boucle, sans son, non cliquable
                      <VideoTile src={g.url} />
                    ) : (
                      <img src={g.url} alt={g.legende || 'Coupe BARBER95'} draggable="false" />
                    )
                  ) : (
                    <div className={styles.placeholder}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                    </div>
                  )}
                </div>
                {g.legende ? <figcaption className={styles.legende}>{g.legende}</figcaption> : null}
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
              </figure>
            ))}
            <div className={styles.spacer} aria-hidden="true" />
          </div>

          <div className={styles.dots}>
            {items.map((g, i) => (
              <button
                key={g.id}
                className={`${styles.dot} ${i === actif ? styles.dotOn : ''}`}
                aria-label={`Voir le média ${i + 1}`}
                onClick={() => allerA(i)}
              />
            ))}
          </div>

          <p className={styles.hint}>Glisse pour explorer · touche une photo pour l’agrandir</p>
        </>
      )}

      {plein !== null && items[plein] && (
        <div className={styles.lightbox} onClick={() => setPlein(null)}>
          <button className={styles.fermer} aria-label="Fermer">
            ✕
          </button>
          <div className={styles.lbMedia} onClick={(e) => e.stopPropagation()}>
            {items[plein].url ? (
              items[plein].type === 'video' ? (
                <video src={items[plein].url} controls autoPlay playsInline />
              ) : (
                <img src={items[plein].url} alt={items[plein].legende || 'Coupe BARBER95'} />
              )
            ) : (
              <div className={styles.lbPlaceholder}>
                <span>{String(plein + 1).padStart(2, '0')}</span>
              </div>
            )}
            {items[plein].legende ? (
              <span className={styles.lbLegende}>{items[plein].legende}</span>
            ) : null}
          </div>
        </div>
      )}
    </main>
  )
}
