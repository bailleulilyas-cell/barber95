import { describe, it, expect } from 'vitest'
import { prixPour, prixResa, coupeOfferte } from './tarif'

const COUPE = { nom: 'Coupe', prix: 10, prix_ami: 8 }
const COUPE_SANS_AMI = { nom: 'Coupe', prix: 10, prix_ami: null }

describe('prixPour', () => {
  it('client normal → prix normal', () => {
    expect(prixPour({ is_friend: false }, COUPE)).toBe(10)
  })

  it('client ami → prix ami', () => {
    expect(prixPour({ is_friend: true }, COUPE)).toBe(8)
  })

  it('client ami sans prix_ami défini → prix normal', () => {
    expect(prixPour({ is_friend: true }, COUPE_SANS_AMI)).toBe(10)
  })

  it('pas de profil (déconnecté) → prix normal', () => {
    expect(prixPour(null, COUPE)).toBe(10)
    expect(prixPour(undefined, COUPE)).toBe(10)
  })

  it('prestation absente → 0', () => {
    expect(prixPour({ is_friend: true }, null)).toBe(0)
  })

  it('prix_ami à 0 (coupe offerte) → 0 pour un ami', () => {
    expect(prixPour({ is_friend: true }, { prix: 10, prix_ami: 0 })).toBe(0)
  })

  it('prix en chaîne (numeric Postgres) → converti', () => {
    expect(prixPour({ is_friend: true }, { prix: '10.00', prix_ami: '8.00' })).toBe(8)
    expect(prixPour({ is_friend: false }, { prix: '10.00', prix_ami: '8.00' })).toBe(10)
  })
})

describe('prixResa', () => {
  it('utilise les jointures clients + prestations', () => {
    expect(prixResa({ clients: { is_friend: true }, prestations: COUPE })).toBe(8)
    expect(prixResa({ clients: { is_friend: false }, prestations: COUPE })).toBe(10)
  })

  it('résa incomplète → tolérant', () => {
    expect(prixResa(null)).toBe(0)
    expect(prixResa({})).toBe(0)
  })

  it('coupe offerte (fidélité) → 0, même pour un client normal', () => {
    expect(prixResa({ offerte: true, clients: { is_friend: false }, prestations: COUPE })).toBe(0)
    expect(prixResa({ offerte: true, clients: { is_friend: true }, prestations: COUPE })).toBe(0)
  })
})

describe('coupeOfferte', () => {
  it('vrai au palier ou au-dessus', () => {
    expect(coupeOfferte({ points_fidelite: 10 }, 10)).toBe(true)
    expect(coupeOfferte({ points_fidelite: 13 }, 10)).toBe(true)
  })
  it('faux en dessous du palier', () => {
    expect(coupeOfferte({ points_fidelite: 9 }, 10)).toBe(false)
    expect(coupeOfferte({ points_fidelite: 0 }, 10)).toBe(false)
  })
  it('profil absent → faux', () => {
    expect(coupeOfferte(null, 10)).toBe(false)
    expect(coupeOfferte(undefined, 10)).toBe(false)
  })
})
