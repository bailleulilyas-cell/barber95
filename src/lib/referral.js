// ════════════════════════════════════════════════════════════
// Parrainage & tracking de source — persistance locale.
// Le code /ref/:code et la source /book?source=… sont stockés en
// localStorage jusqu'à la première réservation confirmée.
// ════════════════════════════════════════════════════════════

const REF_KEY = 'b95_ref_code'
const SOURCE_KEY = 'b95_source'

// Code valide : 4 à 32 caractères alphanumériques (tirets tolérés).
export function codeValide(code) {
  return typeof code === 'string' && /^[a-z0-9-]{4,32}$/i.test(code.trim())
}

function store() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null // navigation privée / storage bloqué
  }
}

export function saveRefCode(code) {
  if (!codeValide(code)) return false
  try {
    store()?.setItem(REF_KEY, code.trim().toLowerCase())
    return true
  } catch {
    return false
  }
}

export function getRefCode() {
  try {
    return store()?.getItem(REF_KEY) || null
  } catch {
    return null
  }
}

export function clearRefCode() {
  try {
    store()?.removeItem(REF_KEY)
  } catch {}
}

export function saveSource(source) {
  if (typeof source !== 'string' || !source.trim()) return
  try {
    store()?.setItem(SOURCE_KEY, source.trim().slice(0, 64))
  } catch {}
}

export function getSource() {
  try {
    return store()?.getItem(SOURCE_KEY) || null
  } catch {
    return null
  }
}

export function clearSource() {
  try {
    store()?.removeItem(SOURCE_KEY)
  } catch {}
}

// Lien de parrainage complet d'un client.
export function lienParrainage(origin, refCode) {
  if (!refCode) return null
  return `${origin}/ref/${refCode}`
}
