import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MagneticButton from '../../components/MagneticButton/MagneticButton'
import Editable from '../../components/Editable/Editable'
import { IconClock } from '../../components/Icons'
import { PRESTATIONS, FIDELITE } from '../../config'
import { configured } from '../../lib/supabase'
import { getPrestation, updatePrestation } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import styles from './Pricing.module.css'

export default function Pricing() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [presta, setPresta] = useState(PRESTATIONS[0])
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (configured) getPrestation().then((p) => p && setPresta(p)).catch(() => {})
  }, [])

  const ouvrirEdit = () => {
    setForm({
      nom: presta.nom,
      prix: presta.prix,
      duree_minutes: presta.duree_minutes,
      description: presta.description || '',
    })
    setEdit(true)
  }

  const sauver = async () => {
    setBusy(true)
    try {
      const fields = {
        nom: form.nom.trim(),
        prix: Number(form.prix),
        duree_minutes: Number(form.duree_minutes),
        description: form.description.trim(),
      }
      if (configured) await updatePrestation(presta.id, fields)
      setPresta({ ...presta, ...fields })
      setEdit(false)
    } finally {
      setBusy(false)
    }
  }

  const adminActif = configured && isAdmin

  return (
    <main className="page">
      <div className="wrap">
        <header className={styles.head}>
          <h1 className="titrePage">Tarifs</h1>
          <Editable cle="tarifs.sub" as="p" className={styles.sub}>
            La prestation BARBER95
          </Editable>
        </header>

        {edit ? (
          <div className={styles.editCard}>
            <label className={styles.champ}>
              <span>Nom</span>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </label>
            <label className={styles.champ}>
              <span>Description</span>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className={styles.champRow}>
              <label className={styles.champ}>
                <span>Prix (€)</span>
                <input
                  type="number"
                  value={form.prix}
                  onChange={(e) => setForm({ ...form, prix: e.target.value })}
                />
              </label>
              <label className={styles.champ}>
                <span>Durée (min)</span>
                <input
                  type="number"
                  value={form.duree_minutes}
                  onChange={(e) => setForm({ ...form, duree_minutes: e.target.value })}
                />
              </label>
            </div>
            <div className={styles.editBtns}>
              <MagneticButton variant="ghost" onClick={() => setEdit(false)}>Annuler</MagneticButton>
              <MagneticButton onClick={sauver} disabled={busy}>{busy ? '…' : 'Enregistrer'}</MagneticButton>
            </div>
          </div>
        ) : (
          <article className={styles.card} onClick={() => !adminActif && navigate('/reserver')}>
            <div className={styles.cardTop}>
              <h2 className={styles.nom}>{presta.nom}</h2>
              <span className="badge badge-or">Populaire</span>
            </div>
            <p className={styles.desc}>
              {presta.description || 'Coupe homme, finitions soignées au millimètre.'}
            </p>
            <div className={styles.cardBas}>
              <span className={styles.prix}>{presta.prix}€</span>
              <span className={styles.duree}>
                <IconClock size={16} /> {presta.duree_minutes} min
              </span>
            </div>
            {adminActif && (
              <button className={styles.modif} onClick={ouvrirEdit}>
                ✎ Modifier la prestation
              </button>
            )}
          </article>
        )}

        <div className={styles.fid}>
          <span className={styles.fidTitre}>Fidélité</span>
          <Editable cle="tarifs.fid" as="p" className={styles.fidTxt} multiline>
            {`1 coupe = 1 point. À ${FIDELITE.objectif} points, ${FIDELITE.recompense.toLowerCase()}.`}
          </Editable>
        </div>

        <MagneticButton className={styles.cta} onClick={() => navigate('/reserver')}>
          Réserver maintenant
        </MagneticButton>
      </div>
    </main>
  )
}
