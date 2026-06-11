// ════════════════════════════════════════════════════════════
// Calculs purs du dashboard Adam (testés dans stats.test.js).
// Une « résa enrichie » = ligne reservations avec jointures :
//   { statut, clients: { prenom, is_friend }, creneaux: { datetime_debut },
//     prestations: { prix, prix_ami } }
// Tous les calculs se font en heure locale (le salon est en France).
// ════════════════════════════════════════════════════════════
import { prixResa } from './tarif'

const ACTIFS = new Set(['en_attente', 'confirmee', 'terminee'])

function memeJourLocal(iso, date) {
  const a = new Date(iso)
  return (
    a.getFullYear() === date.getFullYear() &&
    a.getMonth() === date.getMonth() &&
    a.getDate() === date.getDate()
  )
}

// ── RDV du jour, triés chronologiquement (annulées exclues) ──
export function rdvDuJour(resas, date = new Date()) {
  return (resas || [])
    .filter((r) => r?.creneaux && ACTIFS.has(r.statut) && memeJourLocal(r.creneaux.datetime_debut, date))
    .sort((a, b) => a.creneaux.datetime_debut.localeCompare(b.creneaux.datetime_debut))
}

// ── Revenu estimé d'une liste de RDV (tarif ami appliqué) ──
export function revenuEstime(resas) {
  return (resas || []).reduce((somme, r) => somme + prixResa(r), 0)
}

// ── Semaines calendaires (lun → dim) découpées sur un mois ──
export function semainesDuMois(date = new Date()) {
  const annee = date.getFullYear()
  const mois = date.getMonth()
  const dernierJour = new Date(annee, mois + 1, 0).getDate()
  const semaines = []
  let debut = 1
  while (debut <= dernierJour) {
    const d = new Date(annee, mois, debut)
    // jusqu'au dimanche (getDay : 0 = dim) ou fin de mois
    const joursAvantDimanche = d.getDay() === 0 ? 0 : 7 - d.getDay()
    const fin = Math.min(debut + joursAvantDimanche, dernierJour)
    semaines.push({
      debut: new Date(annee, mois, debut),
      fin: new Date(annee, mois, fin, 23, 59, 59, 999),
      label: debut === fin ? `${debut}` : `${debut}–${fin}`,
    })
    debut = fin + 1
  }
  return semaines
}

// ── Stats du mois en cours (coupes terminées uniquement) ──
// `resas` doit couvrir le mois en cours ET le mois précédent.
// Renvoie : { semaines: [{label, coupes, revenu}], clientFidele,
//             semaineChargee, progression }
export function statsMensuelles(resas, maintenant = new Date()) {
  const annee = maintenant.getFullYear()
  const mois = maintenant.getMonth()
  const terminees = (resas || []).filter((r) => r?.creneaux && r.statut === 'terminee')

  const duMois = terminees.filter((r) => {
    const d = new Date(r.creneaux.datetime_debut)
    return d.getFullYear() === annee && d.getMonth() === mois
  })
  const moisPrec = terminees.filter((r) => {
    const d = new Date(r.creneaux.datetime_debut)
    const prev = new Date(annee, mois - 1, 1)
    return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()
  })

  // par semaine
  const semaines = semainesDuMois(maintenant).map((s) => {
    const dedans = duMois.filter((r) => {
      const t = new Date(r.creneaux.datetime_debut).getTime()
      return t >= s.debut.getTime() && t <= s.fin.getTime()
    })
    return { label: s.label, coupes: dedans.length, revenu: revenuEstime(dedans) }
  })

  // client le plus fidèle du mois
  const parClient = new Map()
  duMois.forEach((r) => {
    const prenom = r.clients?.prenom || r.client_nom || 'Client'
    parClient.set(prenom, (parClient.get(prenom) || 0) + 1)
  })
  let clientFidele = null
  parClient.forEach((coupes, prenom) => {
    if (!clientFidele || coupes > clientFidele.coupes) clientFidele = { prenom, coupes }
  })

  // semaine la plus chargée
  const max = semaines.reduce((m, s) => (s.coupes > (m?.coupes || 0) ? s : m), null)
  const semaineChargee = max && max.coupes > 0 ? max : null

  // progression du revenu vs mois dernier (null si pas de base de comparaison)
  const revenuMois = revenuEstime(duMois)
  const revenuPrec = revenuEstime(moisPrec)
  const progression = revenuPrec > 0 ? Math.round(((revenuMois - revenuPrec) / revenuPrec) * 100) : null

  return { semaines, clientFidele, semaineChargee, progression, revenuMois, coupesMois: duMois.length }
}

// ── Fiches clients : agrégat par client à partir de l'historique ──
// `clients` = lignes de la table clients, `resasTerminees` = résas enrichies
// (statut terminee) avec client_id. Renvoie les fiches triées par dernière
// visite décroissante (clients jamais venus en dernier).
export function fichesClients(clients, resasTerminees) {
  const parClient = new Map()
  ;(resasTerminees || []).forEach((r) => {
    if (!r?.creneaux || r.statut !== 'terminee') return
    const liste = parClient.get(r.client_id) || []
    liste.push(r)
    parClient.set(r.client_id, liste)
  })

  const fiches = (clients || [])
    .filter((c) => c.role !== 'admin')
    .map((c) => {
      const historique = (parClient.get(c.id) || []).sort((a, b) =>
        b.creneaux.datetime_debut.localeCompare(a.creneaux.datetime_debut)
      )
      return {
        ...c,
        coupes: historique.length,
        derniereVisite: historique[0]?.creneaux.datetime_debut || null,
        historique,
      }
    })

  return fiches.sort((a, b) => {
    if (!a.derniereVisite && !b.derniereVisite) return 0
    if (!a.derniereVisite) return 1
    if (!b.derniereVisite) return -1
    return b.derniereVisite.localeCompare(a.derniereVisite)
  })
}
