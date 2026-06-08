import { useEffect, useRef, useState } from 'react'
import { useContent } from '../../context/ContentContext'
import { useAuth } from '../../context/AuthContext'
import styles from './Editable.module.css'

// Texte éditable en place. Pour un admin : clic → édition → sauvegarde (blur/Entrée).
// Pour tout le monde : affiche la valeur enregistrée, sinon `children` (défaut).
//   <Editable cle="home.sub" as="p">Texte par défaut</Editable>
export default function Editable({ cle, as: Tag = 'span', children, className = '', multiline = false }) {
  const { get, save } = useContent()
  const { isAdmin, configured } = useAuth()
  const defaut = typeof children === 'string' ? children : ''
  const valeur = get(cle, defaut)
  const [edit, setEdit] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (edit && ref.current) {
      ref.current.textContent = valeur
      ref.current.focus()
      // place le curseur à la fin
      const r = document.createRange()
      r.selectNodeContents(ref.current)
      r.collapse(false)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(r)
    }
  }, [edit]) // eslint-disable-line

  const editable = configured && isAdmin

  if (!editable) {
    return <Tag className={className}>{valeur}</Tag>
  }

  const valider = () => {
    const nv = ref.current?.textContent?.trim() ?? ''
    setEdit(false)
    if (nv && nv !== valeur) save(cle, nv)
  }

  if (edit) {
    return (
      <Tag
        ref={ref}
        className={`${className} ${styles.edition}`}
        contentEditable
        suppressContentEditableWarning
        onBlur={valider}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !multiline) {
            e.preventDefault()
            ref.current.blur()
          }
          if (e.key === 'Escape') {
            ref.current.textContent = valeur
            ref.current.blur()
          }
        }}
      />
    )
  }

  return (
    <Tag
      className={`${className} ${styles.editable}`}
      onClick={() => setEdit(true)}
      title="Cliquer pour modifier"
    >
      {valeur}
      <span className={styles.pen} aria-hidden="true">✎</span>
    </Tag>
  )
}
