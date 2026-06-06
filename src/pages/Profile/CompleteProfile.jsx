import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './CompleteProfile.module.css'

export default function CompleteProfile() {
  const { user, profile, profileComplete, refreshProfile, loading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const suite = params.get('next') || '/mon-espace'

  const [form, setForm] = useState({ prenom: '', tel: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  // pré-remplit si des valeurs existent déjà
  useEffect(() => {
    if (profile) setForm({ prenom: profile.prenom || '', tel: profile.tel || '' })
  }, [profile])

  // déjà complété → on file vers la suite
  useEffect(() => {
    if (!loading && profileComplete) navigate(suite, { replace: true })
  }, [loading, profileComplete, navigate, suite])

  const enregistrer = async (e) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const { error } = await supabase
      .from('clients')
      .update({ prenom: form.prenom.trim(), tel: form.tel.trim() })
      .eq('id', user.id)
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    await refreshProfile()
    navigate(suite, { replace: true })
  }

  return (
    <main className="page">
      <div className="wrap">
        <span className="eyebrow">Bienvenue</span>
        <h1 className={styles.titre}>Complète ton profil</h1>
        <p className={styles.intro}>
          Deux infos avant de pouvoir réserver. On ne vérifie pas le numéro, il sert juste à
          te recontacter si besoin.
        </p>

        <form className={styles.form} onSubmit={enregistrer}>
          <label className={styles.champ}>
            <span>Prénom</span>
            <input
              type="text"
              required
              value={form.prenom}
              onChange={(e) => setForm({ ...form, prenom: e.target.value })}
              placeholder="Ton prénom"
            />
          </label>
          <label className={styles.champ}>
            <span>Téléphone</span>
            <input
              type="tel"
              required
              value={form.tel}
              onChange={(e) => setForm({ ...form, tel: e.target.value })}
              placeholder="06 ..."
            />
          </label>
          {err && <p className={styles.err}>{err}</p>}
          <MagneticButton type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Valider'}
          </MagneticButton>
        </form>
      </div>
    </main>
  )
}
