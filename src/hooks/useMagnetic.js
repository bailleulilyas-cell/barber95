import { useEffect, useRef } from 'react'

// Effet « bouton magnétique » : au survol souris, l'élément est légèrement
// attiré vers le curseur (translate) + scale subtil, via requestAnimationFrame.
// Désactivé sur les pointeurs grossiers (tactile) — sur mobile le feedback
// se fait au :active en CSS (scale + flash kaki).
export function useMagnetic({ force = 0.35, scale = 1.04 } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // pas d'effet magnétique sur tactile
    const fin = window.matchMedia('(pointer: fine)')
    if (!fin.matches) return

    let raf = null
    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let active = false

    const render = () => {
      cx += (tx - cx) * 0.18
      cy += (ty - cy) * 0.18
      const s = active ? scale : 1
      el.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px) scale(${s})`
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1 || active) {
        raf = requestAnimationFrame(render)
      } else {
        el.style.transform = ''
        raf = null
      }
    }

    const start = () => {
      if (!raf) raf = requestAnimationFrame(render)
    }

    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const mx = e.clientX - (r.left + r.width / 2)
      const my = e.clientY - (r.top + r.height / 2)
      tx = mx * force
      ty = my * force
      active = true
      start()
    }

    const onLeave = () => {
      tx = 0
      ty = 0
      active = false
      start()
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [force, scale])

  return ref
}
