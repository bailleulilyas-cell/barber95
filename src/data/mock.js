// Données mockées pour la Phase 1 (frontend local, sans backend).
// Seront remplacées par des requêtes Supabase en Phase 2+.

// ── Galerie (film strip). En prod : Cloudinary. Ici : placeholders. ──
export const GALERIE = [
  { id: 'g1', type: 'image', src: null, legende: 'Dégradé net' },
  { id: 'g2', type: 'image', src: null, legende: 'Coupe ciseaux' },
  { id: 'g3', type: 'image', src: null, legende: 'Contours précis' },
  { id: 'g4', type: 'image', src: null, legende: 'Texturé' },
  { id: 'g5', type: 'image', src: null, legende: 'Classique' },
]

// ── Avis clients ──
export const AVIS = [
  {
    id: 'a1',
    prenom: 'Yanis',
    note: 5,
    commentaire: "Le meilleur dégradé du 95, sans exagérer. Je reviens chaque semaine.",
    date: '2026-05-20',
    visible: true,
  },
  {
    id: 'a2',
    prenom: 'Mehdi',
    note: 5,
    commentaire: 'Ponctuel, propre, à l’écoute. Rien à dire.',
    date: '2026-05-14',
    visible: true,
  },
  {
    id: 'a3',
    prenom: 'Lucas',
    note: 4,
    commentaire: 'Très bonne coupe, ambiance au top.',
    date: '2026-05-02',
    visible: true,
  },
  {
    id: 'a4',
    prenom: 'Sofiane',
    note: 5,
    commentaire: 'Il a compris exactement ce que je voulais.',
    date: '2026-04-28',
    visible: true,
  },
]

// ── Créneaux ouverts (mock). En prod : table `creneaux` Supabase. ──
// Générés sur les prochains jours pour la démo.
function genererCreneaux() {
  const out = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let j = 1; j <= 6; j++) {
    const jour = new Date(base)
    jour.setDate(base.getDate() + j)
    // créneaux de 30 min entre 10h et 19h, certains ouverts
    const heures = [10, 10.5, 11, 14, 14.5, 15, 15.5, 16, 17, 18]
    heures.forEach((h, i) => {
      const d = new Date(jour)
      d.setHours(Math.floor(h), (h % 1) * 60, 0, 0)
      out.push({
        id: `c-${j}-${i}`,
        datetime_debut: d.toISOString(),
        statut: Math.random() > 0.45 ? 'ouvert' : 'confirmé', // mock dispo
      })
    })
  }
  return out
}

export const CRENEAUX = genererCreneaux()

// ── Client connecté (mock pour Mon espace) ──
export const CLIENT_MOCK = {
  prenom: 'Ilyas',
  tel: '06 00 00 00 00',
  points_fidelite: 7,
  prochain_rdv: {
    // dans ~26h pour que l'annulation soit active (>2h)
    datetime_debut: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
    prestation: 'Coupe',
  },
  historique: [
    { date: '2026-05-18', prestation: 'Coupe' },
    { date: '2026-05-04', prestation: 'Coupe' },
    { date: '2026-04-20', prestation: 'Coupe' },
  ],
}

// ── Réservations du jour (mock dashboard Adam) ──
export const RESERVATIONS_ADMIN = [
  { id: 'r1', prenom: 'Yanis', tel: '06 11 22 33 44', heure: '14:00', statut: 'confirmée' },
  { id: 'r2', prenom: 'Mehdi', tel: '06 55 66 77 88', heure: '15:30', statut: 'confirmée' },
  { id: 'r3', prenom: 'Lucas', tel: '06 99 88 77 66', heure: '17:00', statut: 'en_attente' },
]
