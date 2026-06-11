import { describe, it, expect } from 'vitest'
import { rdvDuJour, revenuEstime, semainesDuMois, statsMensuelles, fichesClients } from './stats'

// Fabrique une résa enrichie. `quand` = Date locale du créneau.
function resa({ quand, statut = 'confirmee', prenom = 'Karim', isFriend = false, clientId = 'c1' }) {
  return {
    id: Math.random().toString(36).slice(2),
    client_id: clientId,
    statut,
    clients: { prenom, is_friend: isFriend },
    creneaux: { datetime_debut: quand.toISOString() },
    prestations: { nom: 'Coupe', prix: 10, prix_ami: 8 },
  }
}

// Mercredi 10 juin 2026, 9h locale
const AUJOURDHUI = new Date(2026, 5, 10, 9, 0)

describe('rdvDuJour', () => {
  it('garde les RDV du jour, triés par heure, annulées exclues', () => {
    const r14 = resa({ quand: new Date(2026, 5, 10, 14, 0) })
    const r10 = resa({ quand: new Date(2026, 5, 10, 10, 0) })
    const annulee = resa({ quand: new Date(2026, 5, 10, 11, 0), statut: 'annulee' })
    const demain = resa({ quand: new Date(2026, 5, 11, 10, 0) })
    const hier = resa({ quand: new Date(2026, 5, 9, 10, 0) })

    const jour = rdvDuJour([r14, annulee, demain, r10, hier], AUJOURDHUI)
    expect(jour.map((r) => r.id)).toEqual([r10.id, r14.id])
  })

  it('liste vide / jointure absente → tolérant', () => {
    expect(rdvDuJour([], AUJOURDHUI)).toEqual([])
    expect(rdvDuJour([{ statut: 'confirmee', creneaux: null }], AUJOURDHUI)).toEqual([])
    expect(rdvDuJour(null, AUJOURDHUI)).toEqual([])
  })
})

describe('revenuEstime', () => {
  it('additionne en appliquant le tarif ami', () => {
    const normal = resa({ quand: AUJOURDHUI })
    const ami = resa({ quand: AUJOURDHUI, isFriend: true })
    expect(revenuEstime([normal, ami])).toBe(18) // 10 + 8
  })
})

describe('semainesDuMois', () => {
  it('découpe juin 2026 (commence un lundi) en semaines lun→dim', () => {
    const sem = semainesDuMois(new Date(2026, 5, 15))
    expect(sem.map((s) => s.label)).toEqual(['1–7', '8–14', '15–21', '22–28', '29–30'])
  })

  it('couvre tout le mois sans trou', () => {
    const sem = semainesDuMois(new Date(2026, 6, 15)) // juillet 2026 (commence un mercredi)
    expect(sem[0].debut.getDate()).toBe(1)
    expect(sem[sem.length - 1].fin.getDate()).toBe(31)
  })
})

describe('statsMensuelles', () => {
  it('coupes/revenu par semaine, client fidèle, semaine chargée, progression', () => {
    const resas = [
      // mois précédent (mai) : 2 coupes terminées = 20 €
      resa({ quand: new Date(2026, 4, 5, 10, 0), statut: 'terminee' }),
      resa({ quand: new Date(2026, 4, 12, 10, 0), statut: 'terminee' }),
      // juin, semaine 1–7 : 3 coupes dont 1 ami (10+10+8 = 28 €)
      resa({ quand: new Date(2026, 5, 2, 10, 0), statut: 'terminee', prenom: 'Karim' }),
      resa({ quand: new Date(2026, 5, 3, 10, 0), statut: 'terminee', prenom: 'Karim' }),
      resa({ quand: new Date(2026, 5, 4, 10, 0), statut: 'terminee', prenom: 'Yanis', isFriend: true }),
      // juin, semaine 8–14 : 1 coupe (10 €)
      resa({ quand: new Date(2026, 5, 9, 10, 0), statut: 'terminee', prenom: 'Karim' }),
      // confirmée non terminée → ignorée des stats
      resa({ quand: new Date(2026, 5, 9, 15, 0), statut: 'confirmee' }),
    ]

    const s = statsMensuelles(resas, AUJOURDHUI)
    expect(s.semaines[0]).toEqual({ label: '1–7', coupes: 3, revenu: 28 })
    expect(s.semaines[1]).toEqual({ label: '8–14', coupes: 1, revenu: 10 })
    expect(s.coupesMois).toBe(4)
    expect(s.revenuMois).toBe(38)
    expect(s.clientFidele).toEqual({ prenom: 'Karim', coupes: 3 })
    expect(s.semaineChargee.label).toBe('1–7')
    expect(s.progression).toBe(90) // (38-20)/20
  })

  it('RDV manuel (client_nom, sans compte) compté dans le client du mois', () => {
    const manuel = {
      id: 'm1',
      client_id: null,
      client_nom: 'Walk-in Sofiane',
      statut: 'terminee',
      clients: null,
      creneaux: { datetime_debut: new Date(2026, 5, 5, 10, 0).toISOString() },
      prestations: { nom: 'Coupe', prix: 10, prix_ami: 8 },
    }
    const s = statsMensuelles([manuel, manuel], AUJOURDHUI)
    expect(s.coupesMois).toBe(2)
    expect(s.revenuMois).toBe(20) // pas de tarif ami pour un walk-in
    expect(s.clientFidele).toEqual({ prenom: 'Walk-in Sofiane', coupes: 2 })
  })

  it('mois précédent vide → progression null (pas de division par zéro)', () => {
    const s = statsMensuelles([resa({ quand: new Date(2026, 5, 2), statut: 'terminee' })], AUJOURDHUI)
    expect(s.progression).toBe(null)
  })

  it('aucune coupe → tout à zéro/null', () => {
    const s = statsMensuelles([], AUJOURDHUI)
    expect(s.clientFidele).toBe(null)
    expect(s.semaineChargee).toBe(null)
    expect(s.revenuMois).toBe(0)
  })
})

describe('fichesClients', () => {
  const clients = [
    { id: 'c1', prenom: 'Karim', role: 'client' },
    { id: 'c2', prenom: 'Yanis', role: 'client' },
    { id: 'c3', prenom: 'Jamais-Venu', role: 'client' },
    { id: 'adam', prenom: 'Adam', role: 'admin' },
  ]
  const histo = [
    resa({ quand: new Date(2026, 5, 1, 10, 0), statut: 'terminee', clientId: 'c1' }),
    resa({ quand: new Date(2026, 5, 8, 10, 0), statut: 'terminee', clientId: 'c1' }),
    resa({ quand: new Date(2026, 5, 9, 10, 0), statut: 'terminee', clientId: 'c2' }),
  ]

  it('agrège coupes + dernière visite + historique trié récent → ancien', () => {
    const fiches = fichesClients(clients, histo)
    const karim = fiches.find((f) => f.id === 'c1')
    expect(karim.coupes).toBe(2)
    expect(new Date(karim.derniereVisite).getDate()).toBe(8)
    expect(karim.historique).toHaveLength(2)
    expect(karim.historique[0].creneaux.datetime_debut > karim.historique[1].creneaux.datetime_debut).toBe(true)
  })

  it("trie par dernière visite décroissante, jamais-venus en fin, admin exclu", () => {
    const fiches = fichesClients(clients, histo)
    expect(fiches.map((f) => f.id)).toEqual(['c2', 'c1', 'c3'])
    expect(fiches.find((f) => f.id === 'adam')).toBeUndefined()
  })

  it('client sans historique → 0 coupe, pas de dernière visite', () => {
    const fiches = fichesClients(clients, histo)
    const neuf = fiches.find((f) => f.id === 'c3')
    expect(neuf.coupes).toBe(0)
    expect(neuf.derniereVisite).toBe(null)
  })
})
