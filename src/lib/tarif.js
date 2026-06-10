// ════════════════════════════════════════════════════════════
// Tarif ami : prix applicable à un client pour une prestation.
// `prix_ami` null/absent = pas de réduction. Le tarif ami est discret :
// le client voit juste « son » prix, sans mention particulière.
// ════════════════════════════════════════════════════════════

export function prixPour(profile, prestation) {
  if (!prestation) return 0
  const normal = Number(prestation.prix) || 0
  const ami = prestation.prix_ami == null ? null : Number(prestation.prix_ami)
  if (profile?.is_friend && ami != null && !Number.isNaN(ami)) return ami
  return normal
}

// Variante pour une réservation enrichie (jointures clients + prestations).
export function prixResa(resa) {
  return prixPour(resa?.clients, resa?.prestations)
}
