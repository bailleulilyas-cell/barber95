// ════════════════════════════════════════════════════════════
// Helpers email partagés (Resend) + gabarits HTML aux couleurs BARBER95.
// ════════════════════════════════════════════════════════════

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
// Adresse expéditrice : doit appartenir à un domaine vérifié dans Resend.
export const FROM = Deno.env.get('EMAIL_FROM') ?? 'BARBER95 <onboarding@resend.dev>'
export const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? ''

export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY manquant — email non envoyé')
    return { skipped: true }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Resend ${res.status}: ${txt}`)
  }
  return await res.json()
}

// ── Gabarit générique ──
export function layout(titre: string, contenu: string) {
  return `
  <div style="background:#111111;padding:40px 0;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:4px;overflow:hidden;">
      <div style="padding:28px 32px;border-bottom:1px solid #2a2a2a;">
        <span style="font-size:22px;font-weight:800;letter-spacing:3px;color:#e8e6e0;">BARBER<span style="color:#b5a76a;">95</span></span>
      </div>
      <div style="padding:32px;color:#e8e6e0;">
        <h1 style="font-size:22px;margin:0 0 16px;color:#e8e6e0;">${titre}</h1>
        ${contenu}
      </div>
      <div style="padding:20px 32px;border-top:1px solid #2a2a2a;color:#6b6862;font-size:12px;">
        BARBER95 · Coiffeur · Val-d'Oise (95)
      </div>
    </div>
  </div>`
}

export function bouton(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#b5a76a;color:#1a1a1a;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:2px;letter-spacing:1px;margin-top:8px;">${label}</a>`
}

export function formatDateFr(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}

// Lien "Ajouter à Google Agenda"
export function googleCalLink(debutISO: string, finISO: string, titre = 'Coupe — BARBER95') {
  const fmt = (s: string) => s.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const dates = `${fmt(new Date(debutISO).toISOString())}/${fmt(new Date(finISO).toISOString())}`
  const u = new URL('https://calendar.google.com/calendar/render')
  u.searchParams.set('action', 'TEMPLATE')
  u.searchParams.set('text', titre)
  u.searchParams.set('dates', dates)
  return u.toString()
}
