import { supabase } from './supabase'

// ════════════════════════════════════════════════════════════
// Couche d'accès aux données Supabase pour BARBER95.
// Toutes les fonctions supposent `supabase` configuré (sinon throw).
// ════════════════════════════════════════════════════════════

function client() {
  if (!supabase) throw new Error('Supabase non configuré')
  return supabase
}

// ── Temps réel ──
// S'abonne aux changements d'une table. Renvoie une fonction de désabonnement.
export function onTableChange(table, cb) {
  if (!supabase) return () => {}
  const ch = supabase
    .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, cb)
    .subscribe()
  return () => {
    try {
      supabase.removeChannel(ch)
    } catch {}
  }
}

// ── Prestation unique ──
export async function getPrestation() {
  const { data, error } = await client()
    .from('prestations')
    .select('*')
    .order('prix', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// Admin : modifier la prestation (nom, prix, durée, description).
export async function updatePrestation(id, fields) {
  const { error } = await client().from('prestations').update(fields).eq('id', id)
  if (error) throw error
}

// ── Contenu éditable du site ──
export async function getContenus() {
  const { data, error } = await client().from('site_contenu').select('cle, valeur')
  if (error) throw error
  const map = {}
  ;(data || []).forEach((r) => (map[r.cle] = r.valeur))
  return map
}

export async function setContenu(cle, valeur) {
  const { error } = await client()
    .from('site_contenu')
    .upsert({ cle, valeur, updated_at: new Date().toISOString() }, { onConflict: 'cle' })
  if (error) throw error
}

// Réservations terminées du client ayant déjà un avis (pour masquer le bouton).
export async function getReservationsAvisLaisses(clientId) {
  const { data, error } = await client()
    .from('avis')
    .select('reservation_id')
    .eq('client_id', clientId)
  if (error) throw error
  return new Set((data || []).map((a) => a.reservation_id))
}

// ════════════════════ CRÉNEAUX ════════════════════

// Créneaux ouverts à venir (côté client, page Réserver).
export async function getCreneauxOuverts() {
  const { data, error } = await client()
    .from('creneaux')
    .select('*')
    .eq('statut', 'ouvert')
    .gte('datetime_debut', new Date().toISOString())
    .order('datetime_debut', { ascending: true })
  if (error) throw error
  return data
}

// Tous les créneaux d'une plage (côté admin, gestion).
export async function getCreneauxEntre(debutISO, finISO) {
  const { data, error } = await client()
    .from('creneaux')
    .select('*')
    .gte('datetime_debut', debutISO)
    .lt('datetime_debut', finISO)
    .order('datetime_debut', { ascending: true })
  if (error) throw error
  return data
}

// Admin : ouvrir un créneau (30 min).
export async function ouvrirCreneau(debut) {
  const debutD = new Date(debut)
  const fin = new Date(debutD.getTime() + 30 * 60000)
  const { data, error } = await client()
    .from('creneaux')
    .insert({
      datetime_debut: debutD.toISOString(),
      datetime_fin: fin.toISOString(),
      statut: 'ouvert',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin : fermer (supprimer) un créneau ouvert non réservé.
export async function fermerCreneau(id) {
  const { error } = await client().from('creneaux').delete().eq('id', id).eq('statut', 'ouvert')
  if (error) throw error
}

// Admin : ouvrir plusieurs créneaux d'un coup (semaine-type). Renvoie le nb inséré.
export async function ajouterCreneauxBulk(debuts) {
  if (!debuts.length) return 0
  const rows = debuts.map((d) => {
    const D = new Date(d)
    const fin = new Date(D.getTime() + 30 * 60000)
    return {
      datetime_debut: D.toISOString(),
      datetime_fin: fin.toISOString(),
      statut: 'ouvert',
    }
  })
  const { error } = await client().from('creneaux').insert(rows)
  if (error) throw error
  return rows.length
}

// ════════════════════ RÉSERVATION (client) ════════════════════

// Verrou temporaire atomique (RPC). Renvoie l'id de réservation.
export async function reserverCreneau(creneauId, prestationId) {
  const { data, error } = await client().rpc('reserver_creneau', {
    p_creneau: creneauId,
    p_prestation: prestationId,
  })
  if (error) throw error
  return data
}

// Confirmation finale (RPC).
export async function confirmerReservation(reservationId) {
  const { error } = await client().rpc('confirmer_reservation', { p_reservation: reservationId })
  if (error) throw error
}

// Annulation (RPC : règle des 2h appliquée côté serveur, admin exempté).
export async function annulerReservation(reservationId) {
  const { error } = await client().rpc('annuler_reservation', { p_reservation: reservationId })
  if (error) throw error
}

// ════════════════════ MON ESPACE (client) ════════════════════

const RESA_SELECT =
  'id, statut, created_at, creneaux(datetime_debut, datetime_fin), prestations(nom)'

// Prochain RDV confirmé à venir.
export async function getProchainRdv(clientId) {
  const { data, error } = await client()
    .from('reservations')
    .select(RESA_SELECT)
    .eq('client_id', clientId)
    .eq('statut', 'confirmee')
    .gte('creneaux.datetime_debut', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  // on filtre les jointures nulles (créneau passé filtré par la condition)
  const futurs = (data || []).filter((r) => r.creneaux)
  futurs.sort((a, b) => a.creneaux.datetime_debut.localeCompare(b.creneaux.datetime_debut))
  return futurs[0] || null
}

// Historique des coupes terminées.
export async function getHistorique(clientId) {
  const { data, error } = await client()
    .from('reservations')
    .select(RESA_SELECT)
    .eq('client_id', clientId)
    .eq('statut', 'terminee')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).filter((r) => r.creneaux)
}

// ════════════════════ AVIS ════════════════════

// Avis publics visibles.
export async function getAvisVisibles() {
  const { data, error } = await client()
    .from('avis')
    .select('*')
    .eq('visible', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function creerAvis({ clientId, reservationId, note, commentaire, prenom }) {
  const { error } = await client().from('avis').insert({
    client_id: clientId,
    reservation_id: reservationId,
    note,
    commentaire,
    prenom,
  })
  if (error) throw error
}

// ════════════════════ ADMIN ════════════════════

const ADMIN_RESA_SELECT =
  'id, statut, created_at, clients(prenom, tel), creneaux(datetime_debut), prestations(nom)'

// Toutes les réservations actives (en_attente/confirmée/terminée), triées par créneau.
export async function getReservationsAdmin() {
  const { data, error } = await client()
    .from('reservations')
    .select(ADMIN_RESA_SELECT)
    .neq('statut', 'annulee')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).filter((r) => r.creneaux)
}

// Marquer une réservation terminée (déclenche le +1 fidélité via trigger).
export async function marquerTerminee(reservationId) {
  const { error } = await client()
    .from('reservations')
    .update({ statut: 'terminee' })
    .eq('id', reservationId)
  if (error) throw error
}

// Avis à modérer (tous, pour le dashboard).
export async function getTousAvis() {
  const { data, error } = await client()
    .from('avis')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function setAvisVisible(avisId, visible) {
  const { error } = await client().from('avis').update({ visible }).eq('id', avisId)
  if (error) throw error
}

// ════════════════════ GALERIE ════════════════════
export async function getGalerie() {
  const { data, error } = await client()
    .from('galerie')
    .select('*')
    .order('ordre', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function ajouterMedia({ url, public_id, type, legende }) {
  const { error } = await client()
    .from('galerie')
    .insert({ url, public_id, type, legende })
  if (error) throw error
}

export async function supprimerMedia(id) {
  const { error } = await client().from('galerie').delete().eq('id', id)
  if (error) throw error
}

// ════════════════════ EMAILS (Edge Function `notify`) ════════════════════
// Best-effort : on n'interrompt jamais l'action utilisateur si l'email échoue.
export async function notifier(type, reservationId) {
  try {
    await client().functions.invoke('notify', {
      body: { type, reservationId, siteUrl: window.location.origin },
    })
  } catch (e) {
    console.warn('notify échoué (non bloquant) :', e?.message)
  }
}

// ════════════════════ AVIS via lien email (token = reservationId) ════════════
// Récupère le contexte d'une réservation terminée pour le formulaire d'avis.
export async function getReservationPourAvis(reservationId) {
  const { data, error } = await client()
    .from('reservations')
    .select('id, statut, client_id, clients(prenom)')
    .eq('id', reservationId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Vérifie si un avis existe déjà pour cette réservation.
export async function avisExistePour(reservationId) {
  const { count, error } = await client()
    .from('avis')
    .select('id', { count: 'exact', head: true })
    .eq('reservation_id', reservationId)
  if (error) throw error
  return (count || 0) > 0
}
