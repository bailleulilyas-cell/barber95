import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { configured } from '../lib/supabase'
import { getContenus, setContenu } from '../lib/api'

const ContentCtx = createContext(null)

export function ContentProvider({ children }) {
  const [content, setContent] = useState({})

  useEffect(() => {
    if (!configured) return
    getContenus()
      .then(setContent)
      .catch(() => {})
  }, [])

  // récupère une valeur éditée, sinon le défaut codé en dur
  const get = useCallback((cle, defaut = '') => content[cle] ?? defaut, [content])

  // sauvegarde (optimiste) une valeur
  const save = useCallback(async (cle, valeur) => {
    setContent((c) => ({ ...c, [cle]: valeur }))
    if (configured) {
      try {
        await setContenu(cle, valeur)
      } catch (e) {
        console.warn('save contenu échoué', e?.message)
      }
    }
  }, [])

  return <ContentCtx.Provider value={{ get, save }}>{children}</ContentCtx.Provider>
}

export function useContent() {
  const ctx = useContext(ContentCtx)
  if (!ctx) throw new Error('useContent hors ContentProvider')
  return ctx
}
