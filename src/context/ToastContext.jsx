import { createContext, useCallback, useContext, useRef, useState } from 'react'
import styles from './Toast.module.css'

const ToastCtx = createContext(null)

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = ++_id
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 2800)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={styles.zone} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.type] || ''}`}>
            <span className={styles.ico}>{t.type === 'error' ? '✕' : '✓'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  // tolérant : si pas de provider, no-op
  return ctx || (() => {})
}
