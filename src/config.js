// ─────────────────────────────────────────────────────────────
// Configuration éditable du site BARBER95
// Toutes les valeurs « business » modifiables sont centralisées ici.
// (En Phase 2 backend, le prix viendra de Supabase ; ici c'est la
//  source de vérité côté front pour la démo locale.)
// ─────────────────────────────────────────────────────────────

export const SITE = {
  nom: 'BARBER95',
  baseline: "Coiffeur • Val-d'Oise • 95",
  zone: "Val-d'Oise (95)",

  // Contact — null tant qu'Adam n'a rien fourni.
  // Renseigne instagram / tel / adresse plus tard ; le footer s'adapte.
  contact: {
    instagram: null, // ex: 'barber95'
    tel: null, // ex: '06 12 34 56 78'
    adresse: null, // ex: 'Cergy, 95'
  },
}

// Prestation unique. Modifiable. Durée en minutes, prix en euros.
export const PRESTATIONS = [
  {
    id: 'coupe',
    nom: 'Coupe',
    duree_minutes: 30,
    prix: 10,
    description: 'Coupe homme, finitions soignées.',
  },
]

// Programme de fidélité.
export const FIDELITE = {
  objectif: 10, // nombre de coupes pour une offerte
  recompense: 'Une coupe offerte',
}
