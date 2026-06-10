import { describe, it, expect, beforeEach } from 'vitest'
import {
  codeValide,
  saveRefCode,
  getRefCode,
  clearRefCode,
  saveSource,
  getSource,
  clearSource,
  lienParrainage,
} from './referral'

// localStorage minimal pour Node
beforeEach(() => {
  const mem = new Map()
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  }
})

describe('codeValide', () => {
  it('accepte les codes hexadécimaux générés (8 caractères)', () => {
    expect(codeValide('a1b2c3d4')).toBe(true)
  })

  it('refuse les codes trop courts, trop longs ou exotiques', () => {
    expect(codeValide('abc')).toBe(false)
    expect(codeValide('x'.repeat(33))).toBe(false)
    expect(codeValide('héllo!!!')).toBe(false)
    expect(codeValide('<script>')).toBe(false)
    expect(codeValide(null)).toBe(false)
    expect(codeValide(undefined)).toBe(false)
  })
})

describe('stockage du code de parrainage', () => {
  it('sauvegarde en minuscules puis relit', () => {
    expect(saveRefCode('A1B2C3D4')).toBe(true)
    expect(getRefCode()).toBe('a1b2c3d4')
  })

  it("refuse un code invalide sans rien stocker", () => {
    expect(saveRefCode('no')).toBe(false)
    expect(getRefCode()).toBe(null)
  })

  it('clearRefCode efface', () => {
    saveRefCode('a1b2c3d4')
    clearRefCode()
    expect(getRefCode()).toBe(null)
  })
})

describe('stockage de la source', () => {
  it('sauvegarde et relit la source', () => {
    saveSource('whatsapp')
    expect(getSource()).toBe('whatsapp')
    clearSource()
    expect(getSource()).toBe(null)
  })

  it('ignore les valeurs vides et tronque les très longues', () => {
    saveSource('   ')
    expect(getSource()).toBe(null)
    saveSource('x'.repeat(200))
    expect(getSource()).toHaveLength(64)
  })
})

describe('lienParrainage', () => {
  it('construit le lien complet', () => {
    expect(lienParrainage('https://barber95.vercel.app', 'abc12345')).toBe(
      'https://barber95.vercel.app/ref/abc12345'
    )
  })

  it('null sans code', () => {
    expect(lienParrainage('https://x.fr', null)).toBe(null)
  })
})
